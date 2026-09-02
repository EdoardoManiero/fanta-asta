import express from 'express';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Server } from 'socket.io';
import cors from 'cors';
import { AuctionEngine } from './engine.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 4000;
const ADMIN_PASSCODE = process.env.ADMIN_PASSCODE || 'carmy2627';

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const adminClientIds = new Set();
const engine = new AuctionEngine((publicState) => {
  io.emit('state', publicState);
});

function respond(socket, event, result) {
  if (!result.ok) socket.emit('error', { message: result.error, context: event });
  return result;
}

io.on('connection', (socket) => {
  let clientId = null;
  socket.emit('state', engine.getPublicState());

  socket.on('hello', ({ clientId: cid }) => {
    clientId = cid;
    if (adminClientIds.has(clientId)) socket.emit('admin:ok');
  });

  socket.on('admin:auth', ({ passcode }) => {
    if (passcode === ADMIN_PASSCODE) {
      adminClientIds.add(clientId);
      socket.emit('admin:ok');
    } else {
      socket.emit('error', { message: 'Codice admin errato.', context: 'admin:auth' });
    }
  });

  const requireAdmin = (fn) => (payload) => {
    if (!clientId || !adminClientIds.has(clientId)) {
      socket.emit('error', { message: 'Azione riservata all\'amministratore.', context: 'admin' });
      return;
    }
    fn(payload);
  };

  socket.on('team:claim', ({ teamId, label }) => {
    if (!clientId) return;
    respond(socket, 'team:claim', engine.claimTeam(clientId, teamId, label));
  });

  socket.on('team:rename', ({ teamId, name }) => {
    if (!clientId) return;
    respond(socket, 'team:rename', engine.renameTeam(clientId, teamId, name));
  });

  socket.on('bid', ({ teamId, amount }) => {
    if (!clientId) return;
    respond(socket, 'bid', engine.bid(teamId, Number(amount)));
  });

  socket.on('admin:setConfig', requireAdmin((cfg) => respond(socket, 'admin:setConfig', engine.adminSetConfig(cfg))));
  socket.on('admin:start', requireAdmin(() => respond(socket, 'admin:start', engine.adminStart())));
  socket.on('admin:nominate', requireAdmin(({ playerId }) => respond(socket, 'admin:nominate', engine.nominate(playerId))));
  socket.on('admin:nominateRandom', requireAdmin(({ role }) => respond(socket, 'admin:nominateRandom', engine.nominateRandom(role))));
  socket.on('admin:startTimer', requireAdmin(({ seconds }) => respond(socket, 'admin:startTimer', engine.adminStartTimer(seconds))));
  socket.on('admin:pauseTimer', requireAdmin(() => respond(socket, 'admin:pauseTimer', engine.adminPauseTimer())));
  socket.on('admin:skip', requireAdmin(() => respond(socket, 'admin:skip', engine.adminSkip())));
  socket.on('admin:undoLast', requireAdmin(() => respond(socket, 'admin:undoLast', engine.adminUndoLast())));
  socket.on('admin:forceAssign', requireAdmin(({ teamId, price }) => respond(socket, 'admin:forceAssign', engine.adminForceAssign(teamId, Number(price)))));
  socket.on('admin:reset', requireAdmin(() => respond(socket, 'admin:reset', engine.adminReset())));

  socket.on('disconnect', () => {
    if (clientId) engine.setConnected(clientId, false);
  });
});

const webDist = path.join(__dirname, '..', 'web', 'dist');
app.use(express.static(webDist));
app.get('*', (req, res) => {
  res.sendFile(path.join(webDist, 'index.html'));
});

server.listen(PORT, () => {
  console.log(`Asta server listening on :${PORT}`);
  console.log(`Admin passcode: ${ADMIN_PASSCODE}`);
});
