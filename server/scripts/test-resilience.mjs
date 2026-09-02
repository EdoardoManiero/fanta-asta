// Resilience / edge-case / usability suite.
//
// Goes beyond the raw throughput of load-test-bidding.mjs: it targets the
// nasty cases - flaky connections, buffered/stale events, mid-auction
// disconnects, admin races, boundary rules, and invalid input - and asserts
// that nothing breaks, nothing double-assigns, and the server stays alive.
//
// Usage: node server/scripts/test-resilience.mjs
import { fork } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import { io } from 'socket.io-client';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER_ENTRY = path.join(__dirname, '..', 'index.js');
const STATE_FILE = path.join(__dirname, '..', 'data', 'auction-state.json');
const PORT = 4900 + Math.floor(Math.random() * 90);
const PASSCODE = 'restest';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? '  PASS' : '  FAIL'}  ${name}${detail && !ok ? ` -> ${detail}` : ''}`);
}

let server;
function startServer() {
  if (fs.existsSync(STATE_FILE)) fs.rmSync(STATE_FILE);
  server = fork(SERVER_ENTRY, {
    env: { ...process.env, PORT: String(PORT), ADMIN_PASSCODE: PASSCODE },
    stdio: 'pipe',
  });
  server.stdout.on('data', () => {});
  server.stderr.on('data', (d) => console.error('[server stderr]', d.toString()));
}

function connect() {
  return io(`http://localhost:${PORT}`, { transports: ['websocket'] });
}

// A tracked client keeps the latest state it received + collects errors.
function track(socket) {
  const box = { state: null, errors: [] };
  socket.on('state', (s) => { box.state = s; });
  socket.on('error', (e) => box.errors.push(e));
  return box;
}

async function waitFor(box, predicate, timeoutMs = 8000, label = 'condition') {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (box.state && predicate(box.state)) return box.state;
    await sleep(40);
  }
  throw new Error(`timeout waiting for ${label}`);
}

function ledgerOk(state) {
  const spent = Object.values(state.teams).reduce((sum, t) => sum + (state.config.budget - t.budget), 0);
  const hist = state.history.reduce((sum, h) => sum + h.price, 0);
  return spent === hist;
}

function rosterCount(state, teamId) {
  return ['P', 'D', 'C', 'A'].reduce((n, r) => n + state.teams[teamId].roster[r].length, 0);
}

async function main() {
  console.log(`\nStarting server on :${PORT}\n`);
  startServer();
  await sleep(1300);

  const admin = connect();
  const adminBox = track(admin);
  const clients = [];
  const boxes = [];
  for (let i = 0; i < 10; i++) {
    const c = connect();
    clients.push(c);
    boxes.push(track(c));
  }
  await sleep(600);

  admin.emit('hello', { clientId: 'admin' });
  admin.emit('admin:auth', { passcode: PASSCODE });
  clients.forEach((c, i) => c.emit('hello', { clientId: `bidder-${i}` }));
  await sleep(300);
  clients.forEach((c, i) => c.emit('team:claim', { teamId: `team-${i + 1}`, label: `Bot ${i + 1}` }));
  await sleep(400);

  admin.emit('admin:setConfig', { timerSeconds: 3, softCloseSeconds: 1 });
  await sleep(200);
  admin.emit('admin:start');
  await waitFor(adminBox, (s) => s.phase === 'live', 5000, 'phase live');

  // ---------------------------------------------------------------
  console.log('\n[A] Validazione e usabilità (input sbagliati non devono rompere nulla)');
  // ---------------------------------------------------------------

  const badAdmin = connect();
  const badAdminBox = track(badAdmin);
  badAdmin.emit('hello', { clientId: 'intruder' });
  badAdmin.emit('admin:auth', { passcode: 'sbagliata' });
  await sleep(400);
  check('Codice admin errato viene rifiutato',
    badAdminBox.errors.some((e) => /admin/i.test(e.message)));

  badAdminBox.errors.length = 0;
  badAdmin.emit('admin:start');
  badAdmin.emit('admin:reset');
  badAdmin.emit('admin:nominateRandom', {});
  await sleep(400);
  check('Non-admin non può eseguire azioni admin',
    badAdminBox.errors.length >= 1 && adminBox.state.phase === 'live');

  boxes[1].errors.length = 0;
  clients[1].emit('team:claim', { teamId: 'team-3', label: 'Ladro' });
  await sleep(300);
  check('Non si può occupare la squadra di un altro',
    boxes[1].errors.some((e) => /occupata/i.test(e.message)) &&
    adminBox.state.teams['team-3'].ownerClientId === 'bidder-2');

  boxes[0].errors.length = 0;
  clients[0].emit('bid', { teamId: 'team-1', amount: 10 });
  await sleep(300);
  check('Offerta senza giocatore sul tavolo viene rifiutata',
    boxes[0].errors.some((e) => /nessun giocatore/i.test(e.message)));

  boxes[0].errors.length = 0;
  clients[0].emit('team:rename', { teamId: 'team-5', name: 'Hackerato' });
  await sleep(300);
  check('Non si può rinominare la squadra di un altro',
    boxes[0].errors.length >= 1 && adminBox.state.teams['team-5'].name !== 'Hackerato');

  // ---------------------------------------------------------------
  console.log('\n[B] Regole di offerta ai limiti');
  // ---------------------------------------------------------------

  const freeA = adminBox.state.players.find((p) => p.status === 'available' && p.ruolo === 'A');
  admin.emit('admin:nominate', { playerId: freeA.id });
  await waitFor(adminBox, (s) => s.currentAuction?.playerId === freeA.id, 5000, 'nomination');
  admin.emit('admin:pauseTimer');
  await sleep(200);

  clients[0].emit('bid', { teamId: 'team-1', amount: 20 });
  await waitFor(adminBox, (s) => s.currentAuction?.currentBid === 20, 4000, 'first bid');

  boxes[1].errors.length = 0;
  clients[1].emit('bid', { teamId: 'team-2', amount: 20 });
  clients[1].emit('bid', { teamId: 'team-2', amount: 5 });
  await sleep(400);
  check('Offerta pari/inferiore alla corrente viene rifiutata',
    boxes[1].errors.filter((e) => /minima/i.test(e.message)).length >= 2 &&
    adminBox.state.currentAuction.currentBid === 20);

  boxes[1].errors.length = 0;
  clients[1].emit('bid', { teamId: 'team-2', amount: 5000 });
  await sleep(400);
  check('Offerta oltre il budget viene rifiutata',
    boxes[1].errors.length >= 1 && adminBox.state.currentAuction.currentBid === 20);

  boxes[1].errors.length = 0;
  clients[1].emit('bid', { teamId: 'team-2', amount: 480 });
  await sleep(400);
  check('Regola della riserva (1 credito per slot rimanente) applicata',
    boxes[1].errors.some((e) => /slot|riserva|credito/i.test(e.message)));

  // duplicate identical bid, as a flaky network might resend
  boxes[0].errors.length = 0;
  const bidBefore = adminBox.state.currentAuction.currentBid;
  clients[0].emit('bid', { teamId: 'team-1', amount: bidBefore });
  await sleep(300);
  check('Rinvio duplicato della stessa offerta non altera lo stato',
    adminBox.state.currentAuction.currentBid === bidBefore);

  admin.emit('admin:skip');
  await waitFor(adminBox, (s) => s.currentAuction == null, 4000, 'skip');

  // ---------------------------------------------------------------
  console.log('\n[C] Connessione instabile');
  // ---------------------------------------------------------------

  // C1: highest bidder loses connection before the timer ends
  const freeC = adminBox.state.players.find((p) => p.status === 'available' && p.ruolo === 'C');
  admin.emit('admin:nominate', { playerId: freeC.id });
  await waitFor(adminBox, (s) => s.currentAuction?.playerId === freeC.id, 5000, 'nominate C');
  const budgetBefore = adminBox.state.teams['team-4'].budget;
  clients[3].emit('bid', { teamId: 'team-4', amount: 33 });
  await waitFor(adminBox, (s) => s.currentAuction?.currentBidderTeamId === 'team-4', 4000, 'team-4 leads');
  clients[3].disconnect(); // connection drops while winning
  admin.emit('admin:startTimer', { seconds: 2 });
  const afterDrop = await waitFor(adminBox, (s) => s.currentAuction == null, 8000, 'resolve after drop');
  check('Chi perde la connessione mentre è in testa vince comunque il giocatore',
    afterDrop.players.find((p) => p.id === freeC.id)?.soldTo === 'team-4' &&
    afterDrop.teams['team-4'].budget === budgetBefore - 33,
    `soldTo=${afterDrop.players.find((p) => p.id === freeC.id)?.soldTo}`);

  // C2: reconnect with the same clientId recovers the team
  const back = connect();
  const backBox = track(back);
  await sleep(400);
  back.emit('hello', { clientId: 'bidder-3' });
  await sleep(500);
  const afterReconnect = backBox.state;
  check('Dopo la riconnessione la squadra resta assegnata allo stesso utente',
    afterReconnect.teams['team-4'].ownerClientId === 'bidder-3');
  check('Dopo la riconnessione l\'utente risulta di nuovo online',
    afterReconnect.teams['team-4'].connected === true,
    `connected=${afterReconnect.teams['team-4'].connected}`);

  // C3: nobody can hijack a disconnected player's team
  boxes[5].errors.length = 0;
  clients[5].emit('team:claim', { teamId: 'team-4', label: 'Rubata' });
  await sleep(400);
  check('La squadra di un disconnesso non può essere rubata',
    adminBox.state.teams['team-4'].ownerClientId === 'bidder-3');

  // C4: a stale bid, buffered while offline, must NOT land on the next player
  const freeD1 = adminBox.state.players.find((p) => p.status === 'available' && p.ruolo === 'D');
  admin.emit('admin:nominate', { playerId: freeD1.id });
  await waitFor(adminBox, (s) => s.currentAuction?.playerId === freeD1.id, 5000, 'nominate D1');
  admin.emit('admin:pauseTimer');
  await sleep(200);
  const staleAuctionId = adminBox.state.currentAuction.auctionId;

  clients[6].disconnect();               // goes offline...
  await sleep(200);
  clients[6].emit('bid', { teamId: 'team-7', amount: 45, playerId: freeD1.id, auctionId: staleAuctionId });
  await sleep(200);
  admin.emit('admin:skip');              // ...meanwhile that player leaves the table
  await waitFor(adminBox, (s) => s.currentAuction == null, 4000, 'skip D1');

  const freeD2 = adminBox.state.players.find((p) => p.status === 'available' && p.ruolo === 'D' && p.id !== freeD1.id);
  admin.emit('admin:nominate', { playerId: freeD2.id });
  await waitFor(adminBox, (s) => s.currentAuction?.playerId === freeD2.id, 5000, 'nominate D2');
  admin.emit('admin:pauseTimer');
  await sleep(200);

  clients[6].connect();                  // reconnects -> buffered bid flushes
  await sleep(1200);

  // C4b: the same thing a laggy phone really does - the packet was sent for
  // the previous round and simply arrives late, while the client is online.
  boxes[7].errors.length = 0;
  clients[7].emit('bid', { teamId: 'team-8', amount: 60, playerId: freeD1.id, auctionId: staleAuctionId });
  await sleep(500);
  check('Offerta in ritardo (round precedente) rifiutata, non applicata al giocatore corrente',
    boxes[7].errors.some((e) => /scaduta/i.test(e.message)) &&
    (adminBox.state.currentAuction?.currentBidderTeamId ?? null) !== 'team-8',
    `bidder=${adminBox.state.currentAuction?.currentBidderTeamId}`);

  const afterFlush = adminBox.state;
  check('Un\'offerta vecchia (bufferata offline) NON si applica al giocatore successivo',
    afterFlush.currentAuction?.playerId === freeD2.id &&
    (afterFlush.currentAuction?.currentBid ?? 0) === 0 &&
    afterFlush.currentAuction?.currentBidderTeamId == null,
    `bid=${afterFlush.currentAuction?.currentBid} bidder=${afterFlush.currentAuction?.currentBidderTeamId}`);

  // C5: the auction must resolve even if the ADMIN drops mid-round
  clients[0].emit('bid', { teamId: 'team-1', amount: 12, playerId: freeD2.id, auctionId: afterFlush.currentAuction.auctionId });
  await waitFor(adminBox, (s) => s.currentAuction?.currentBidderTeamId === 'team-1', 4000, 'team-1 leads D2');
  admin.emit('admin:startTimer', { seconds: 2 });
  await sleep(150);
  admin.disconnect();                    // admin's connection dies
  const resolvedNoAdmin = await waitFor(boxes[0], (s) => s.currentAuction == null, 8000, 'resolve without admin');
  check('L\'asta si chiude correttamente anche se cade la connessione dell\'admin',
    resolvedNoAdmin.players.find((p) => p.id === freeD2.id)?.soldTo === 'team-1');

  admin.connect();
  await sleep(800);
  admin.emit('hello', { clientId: 'admin' });
  admin.emit('admin:auth', { passcode: PASSCODE });
  await sleep(500);

  // ---------------------------------------------------------------
  console.log('\n[D] Gare di concorrenza');
  // ---------------------------------------------------------------

  // D1: two admin sessions nominate at the same instant
  const admin2 = connect();
  const admin2Box = track(admin2);
  await sleep(300);
  admin2.emit('hello', { clientId: 'admin2' });
  admin2.emit('admin:auth', { passcode: PASSCODE });
  await sleep(400);

  const twoFree = adminBox.state.players.filter((p) => p.status === 'available' && p.ruolo === 'A').slice(0, 2);
  admin.emit('admin:nominate', { playerId: twoFree[0].id });
  admin2.emit('admin:nominate', { playerId: twoFree[1].id });
  await sleep(700);
  const onlyOne = adminBox.state;
  check('Due admin che chiamano insieme: un solo giocatore finisce sul tavolo',
    onlyOne.currentAuction != null &&
    [twoFree[0].id, twoFree[1].id].includes(onlyOne.currentAuction.playerId) &&
    onlyOne.players.filter((p) => p.status === 'onBlock').length === 0);

  // D2: everyone bids right as the timer expires
  const liveAuctionId = onlyOne.currentAuction.auctionId;
  const livePlayerId = onlyOne.currentAuction.playerId;
  admin.emit('admin:startTimer', { seconds: 2 });
  const raceEnd = Date.now() + 2600;
  let n = 1;
  while (Date.now() < raceEnd) {
    for (let i = 0; i < clients.length; i++) {
      if (!clients[i].connected) continue;
      clients[i].emit('bid', { teamId: `team-${i + 1}`, amount: n + i, playerId: livePlayerId, auctionId: liveAuctionId });
    }
    n += 4;
    await sleep(10);
  }
  const settled = await waitFor(adminBox, (s) => s.currentAuction == null, 8000, 'settle race');
  const soldRace = settled.players.find((p) => p.id === livePlayerId);
  const winners = Object.values(settled.teams).filter((t) =>
    t.roster[soldRace.ruolo].some((e) => e.playerId === livePlayerId)
  );
  check('Raffica di offerte a cavallo della scadenza: un solo vincitore',
    winners.length === 1, `winners=${winners.length}`);
  check('Nessuna offerta accettata dopo la chiusura (prezzo = ultima valida)',
    soldRace.soldPrice === settled.history[settled.history.length - 1].price);
  check('Contabilità globale coerente dopo la gara', ledgerOk(settled));

  // D3: reset while bids are still flying
  const freeAny = adminBox.state.players.find((p) => p.status === 'available');
  admin.emit('admin:nominate', { playerId: freeAny.id });
  await waitFor(adminBox, (s) => s.currentAuction?.playerId === freeAny.id, 5000, 'nominate for reset');
  const resetAuctionId = adminBox.state.currentAuction.auctionId;
  for (let k = 0; k < 40; k++) {
    clients[k % clients.length].emit('bid', {
      teamId: `team-${(k % clients.length) + 1}`, amount: 3 + k, playerId: freeAny.id, auctionId: resetAuctionId,
    });
  }
  admin.emit('admin:reset');
  await sleep(1200);
  const afterReset = adminBox.state;
  check('Reset durante offerte concorrenti: stato pulito e coerente',
    afterReset.phase === 'lobby' &&
    afterReset.currentAuction == null &&
    afterReset.history.length === 0 &&
    Object.values(afterReset.teams).every((t) => t.budget === afterReset.config.budget && rosterCount(afterReset, t.id) === 0));

  // ---------------------------------------------------------------
  console.log('\n[E] Integrità finale');
  // ---------------------------------------------------------------

  check('Il server è ancora vivo dopo tutti gli stress test', server.exitCode === null && !server.killed);

  const probe = connect();
  const probeBox = track(probe);
  await sleep(700);
  check('Un nuovo client riceve regolarmente lo stato aggiornato',
    probeBox.state != null && probeBox.state.phase === 'lobby');
  probe.disconnect();

  // ---------------------------------------------------------------
  const failed = results.filter((r) => !r.ok);
  console.log('\n=== RISULTATO ===');
  console.log(`${results.length - failed.length}/${results.length} test superati.`);
  if (failed.length) {
    console.log('\nFalliti:');
    failed.forEach((f) => console.log(` - ${f.name}${f.detail ? ` (${f.detail})` : ''}`));
  }

  admin.disconnect();
  admin2.disconnect();
  badAdmin.disconnect();
  back.disconnect();
  clients.forEach((c) => c.disconnect());
  server.kill();
  if (fs.existsSync(STATE_FILE)) fs.rmSync(STATE_FILE);
  process.exit(failed.length === 0 ? 0 : 1);
}

main().catch(async (err) => {
  console.error('\nSuite crashed:', err.message);
  if (server) server.kill();
  if (fs.existsSync(STATE_FILE)) fs.rmSync(STATE_FILE);
  process.exit(2);
});
