// Concurrency stress test: spins up a fresh server instance, connects 10
// bidder clients + 1 admin, and hammers several nomination rounds with a
// burst of near-simultaneous rapid-fire bids from all 10 clients at once,
// then checks the resulting state for any consistency violation (double
// assignment, wrong winner, budget drift, negative budget, stale locks...).
//
// Usage: node server/scripts/load-test-bidding.mjs [rounds] [bidsPerClientPerRound]
import { fork } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import { io } from 'socket.io-client';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER_ENTRY = path.join(__dirname, '..', 'index.js');
const STATE_FILE = path.join(__dirname, '..', 'data', 'auction-state.json');
const PORT = 4500 + Math.floor(Math.random() * 400);
const PASSCODE = 'loadtest';
const ROUNDS = Number(process.argv[2]) || 8;
const BIDS_PER_CLIENT = Number(process.argv[3]) || 15;
const N_TEAMS = 10;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Poll until the server is actually accepting connections. A fixed sleep is a
// race: startup time grows with the player data file.
async function waitForServer(timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://localhost:${PORT}/`);
      if (res.ok) return;
    } catch { /* not up yet */ }
    await sleep(150);
  }
  throw new Error(`server did not start on :${PORT}`);
}

function startServer() {
  if (fs.existsSync(STATE_FILE)) fs.rmSync(STATE_FILE);
  const child = fork(SERVER_ENTRY, {
    env: { ...process.env, PORT: String(PORT), ADMIN_PASSCODE: PASSCODE },
    stdio: 'pipe',
  });
  child.stdout.on('data', () => {}); // keep quiet unless debugging
  child.stderr.on('data', (d) => console.error('[server]', d.toString()));
  return child;
}

function connect() {
  return io(`http://localhost:${PORT}`, { transports: ['websocket'] });
}

async function waitForState(socket, predicate, timeoutMs = 8000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const check = (s) => {
      if (predicate(s)) {
        socket.off('state', check);
        resolve(s);
      } else if (Date.now() - start > timeoutMs) {
        socket.off('state', check);
        reject(new Error('timeout waiting for state condition'));
      }
    };
    socket.on('state', check);
  });
}

async function main() {
  console.log(`Starting server on :${PORT}...`);
  const server = startServer();
  await waitForServer();

  const admin = connect();
  const clients = Array.from({ length: N_TEAMS }, () => connect());

  let latestState = null;
  admin.on('state', (s) => { latestState = s; });
  await sleep(500);

  admin.emit('hello', { clientId: 'admin' });
  admin.emit('admin:auth', { passcode: PASSCODE });
  clients.forEach((c, i) => c.emit('hello', { clientId: `bidder-${i}` }));
  await sleep(300);

  clients.forEach((c, i) => c.emit('team:claim', { teamId: `team-${i + 1}`, label: `Bot ${i + 1}` }));
  await sleep(500);

  admin.emit('admin:setConfig', { timerSeconds: 4, softCloseSeconds: 1 });
  await sleep(200);
  admin.emit('admin:start');
  await sleep(300);

  const anomalies = [];

  for (let round = 1; round <= ROUNDS; round++) {
    if (!latestState.currentAuction) {
      admin.emit('admin:nominateRandom', {});
    }
    let s;
    try {
      s = await waitForState(admin, (st) => st.currentAuction != null);
    } catch {
      console.log(`Round ${round}: no player could be nominated (roles likely full) - stopping.`);
      break;
    }
    const player = s.players.find((p) => p.id === s.currentAuction.playerId);
    const preRosterCounts = Object.fromEntries(
      Object.values(s.teams).map((t) => [t.id, t.roster[player.ruolo].length])
    );
    const preBudgets = Object.fromEntries(Object.values(s.teams).map((t) => [t.id, t.budget]));

    admin.emit('admin:startTimer', { seconds: 4 });

    // Chaotic waves: on every wave ALL 10 clients fire at once (no stagger)
    // aiming at roughly the same target amount - many literally collide on
    // the identical value in the same instant, so the server has to resolve
    // real ties/races, not just a predictable increasing sequence.
    let target = 1;
    for (let wave = 0; wave < BIDS_PER_CLIENT; wave++) {
      target += 1 + Math.floor(Math.random() * 6);
      const fires = clients.map((c, i) => {
        const jitter = Math.random() < 0.6 ? 0 : Math.floor(Math.random() * 3) - 1; // often identical, sometimes off by 1
        const amount = Math.max(1, target + jitter);
        return () => c.emit('bid', {
          teamId: `team-${i + 1}`, amount, playerId: player.id, auctionId: s.currentAuction.auctionId,
        });
      });
      // shuffle fire order each wave so it's not always client 0..9 sequence
      for (let i = fires.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [fires[i], fires[j]] = [fires[j], fires[i]];
      }
      fires.forEach((fire) => fire());
      await sleep(Math.random() < 0.5 ? 0 : 5);
    }

    // wait for the round to resolve (currentAuction clears once timer expires)
    let resolved;
    try {
      resolved = await waitForState(admin, (st) => st.currentAuction == null, 10000);
    } catch {
      anomalies.push(`Round ${round}: auction never resolved (stuck?) for ${player.nome}`);
      continue;
    }

    // --- invariant checks ---
    const soldPlayer = resolved.players.find((p) => p.id === player.id);
    if (soldPlayer.status !== 'sold' && soldPlayer.status !== 'available') {
      anomalies.push(`Round ${round}: ${player.nome} left in inconsistent status "${soldPlayer.status}"`);
    }

    let winnersFound = 0;
    for (const t of Object.values(resolved.teams)) {
      const postCount = t.roster[player.ruolo].length;
      const preCount = preRosterCounts[t.id];
      const delta = postCount - preCount;
      if (delta > 1) anomalies.push(`Round ${round}: ${t.name} gained ${delta} players of role ${player.ruolo} in one round!`);
      if (delta === 1) {
        winnersFound++;
        const entry = t.roster[player.ruolo][t.roster[player.ruolo].length - 1];
        const expectedBudget = preBudgets[t.id] - entry.price;
        if (t.budget !== expectedBudget) {
          anomalies.push(
            `Round ${round}: ${t.name} budget mismatch - expected ${expectedBudget}, got ${t.budget} (paid ${entry.price})`
          );
        }
        if (t.budget < 0) anomalies.push(`Round ${round}: ${t.name} budget went NEGATIVE (${t.budget})`);
      } else if (delta === 0 && t.budget !== preBudgets[t.id]) {
        anomalies.push(`Round ${round}: ${t.name} budget changed (${preBudgets[t.id]} -> ${t.budget}) without winning the player`);
      }
    }
    if (soldPlayer.status === 'sold' && winnersFound !== 1) {
      anomalies.push(`Round ${round}: expected exactly 1 winner, found ${winnersFound} for ${player.nome}`);
    }
    if (soldPlayer.status === 'sold' && soldPlayer.soldTo && !resolved.teams[soldPlayer.soldTo]) {
      anomalies.push(`Round ${round}: ${player.nome} sold to unknown team id ${soldPlayer.soldTo}`);
    }

    // global sanity: total spent across all teams must equal sum of all sale prices in history
    const totalSpent = Object.values(resolved.teams).reduce((sum, t) => sum + (resolved.config.budget - t.budget), 0);
    const totalHistory = resolved.history.reduce((sum, h) => sum + h.price, 0);
    if (totalSpent !== totalHistory) {
      anomalies.push(`Round ${round}: global ledger mismatch - teams spent ${totalSpent} total but history sums to ${totalHistory}`);
    }

    console.log(
      `Round ${round}: ${player.nome} (${player.ruolo}) -> ${soldPlayer.status === 'sold' ? `sold to ${resolved.teams[soldPlayer.soldTo].name} for ${soldPlayer.soldPrice}` : 'unsold'} | anomalies so far: ${anomalies.length}`
    );
    latestState = resolved;
  }

  console.log('\n=== RESULT ===');
  if (anomalies.length === 0) {
    console.log(`PASS: ${ROUNDS} rounds, ${N_TEAMS} concurrent bidders, no consistency violations detected.`);
  } else {
    console.log(`FAIL: ${anomalies.length} anomaly(ies) detected:`);
    anomalies.forEach((a) => console.log(' - ' + a));
  }

  admin.disconnect();
  clients.forEach((c) => c.disconnect());
  server.kill();
  if (fs.existsSync(STATE_FILE)) fs.rmSync(STATE_FILE);
  process.exit(anomalies.length === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('Load test crashed:', err);
  process.exit(2);
});
