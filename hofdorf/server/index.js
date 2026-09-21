import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { randomUUID } from 'crypto';
import { createWorld } from './world.js';
import { Game, TICK_MS } from './game.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3847;

const app = express();
app.use(express.static(join(__dirname, '../public')));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, name: 'Hofdorf', players: game.players.size });
});

const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

const world = createWorld();
const game = new Game(world);

const sockets = new Map(); // id -> ws

function broadcast(obj, exceptId = null) {
  const raw = JSON.stringify(obj);
  for (const [id, ws] of sockets) {
    if (id === exceptId) continue;
    if (ws.readyState === 1) ws.send(raw);
  }
}

function send(ws, obj) {
  if (ws.readyState === 1) ws.send(JSON.stringify(obj));
}

wss.on('connection', (ws) => {
  const id = randomUUID();
  sockets.set(id, ws);
  let joined = false;

  ws.on('message', (buf) => {
    let msg;
    try {
      msg = JSON.parse(String(buf));
    } catch {
      return;
    }

    if (msg.type === 'join' && !joined) {
      joined = true;
      const player = game.addPlayer(id, msg.name);
      send(ws, game.fullJoinPayload(id));
      broadcast({ type: 'player_join', player: { id, name: player.name, color: player.color, farmId: player.farmId } }, id);
      return;
    }

    if (!joined) return;

    if (msg.type === 'input') {
      game.setInput(id, msg);
    } else if (msg.type === 'action') {
      const result = game.tryAction(id, msg);
      if (result) send(ws, { type: 'action_result', ...result });
    } else if (msg.type === 'ping') {
      send(ws, { type: 'pong', t: msg.t });
    }
  });

  ws.on('close', () => {
    sockets.delete(id);
    if (joined) {
      game.removePlayer(id);
      broadcast({ type: 'player_leave', id });
    }
  });
});

setInterval(() => {
  game.tick();
  // Lightweight state broadcast
  for (const [id, ws] of sockets) {
    if (!game.players.has(id)) continue;
    send(ws, game.snapshotFor(id));
  }
}, TICK_MS);

// Rare full tile sync (in case of desync) — tiles mostly change via overlays + occasional setTile
setInterval(() => {
  if (sockets.size === 0) return;
  const tiles = Buffer.from(world.tiles).toString('base64');
  broadcast({ type: 'tiles', tiles });
}, 5000);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Hofdorf läuft auf http://0.0.0.0:${PORT}`);
});
