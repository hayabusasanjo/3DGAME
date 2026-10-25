const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer, WebSocket } = require('ws');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = __dirname;
const DB_PATH = path.join(__dirname, 'players_db.json');

// 1. Persistent Local JSON Database for Player Saves & Inventories
function loadDB() {
  try {
    if (fs.existsSync(DB_PATH)) {
      return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    }
  } catch (e) {
    console.warn('Could not read player database, initializing fresh DB:', e.message);
  }
  return {};
}

function saveDB(db) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
  } catch (e) {
    console.error('Failed to write player database:', e);
  }
}

let playerDB = loadDB();

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json'
};

const server = http.createServer((req, res) => {
  // Normalize URL and remove query strings
  const safeUrl = req.url.split('?')[0];
  let filePath = path.join(PUBLIC_DIR, safeUrl === '/' ? 'index.html' : safeUrl);

  const ext = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
      } else {
        res.writeHead(500);
        res.end('500 Server Error: ' + err.code);
      }
    } else {
      res.writeHead(200, {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*'
      });
      res.end(content);
    }
  });
});

// 2. High-Performance WebSocket Multiplayer Engine
const wss = new WebSocketServer({ server });
let nextId = 1001;
const activePlayers = new Map(); // ws -> playerData

function broadcast(msg, excludeWs = null) {
  const str = typeof msg === 'string' ? msg : JSON.stringify(msg);
  wss.clients.forEach(client => {
    if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
      client.send(str);
    }
  });
}

// Heartbeat Ping-Pong to automatically prune Ghost / Stale Mobile connections
function heartbeat() {
  this.isAlive = true;
}

const pingInterval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      const p = activePlayers.get(ws);
      if (p) {
        console.log(`[Ghost Prune] Disconnecting inactive connection for ${p.name} (${p.id})`);
        activePlayers.delete(ws);
        broadcast({
          type: 'player_left',
          id: p.id
        });
        broadcast({
          type: 'chat',
          sender: 'SYSTEM',
          classId: 'system',
          text: `🚪 ${p.name} disconnected.`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
      }
      return ws.terminate();
    }
    ws.isAlive = false;
    try {
      ws.ping();
    } catch (e) {
      ws.terminate();
    }
  });
}, 8000); // Check every 8 seconds

wss.on('close', () => {
  clearInterval(pingInterval);
});

wss.on('connection', (ws) => {
  ws.isAlive = true;
  ws.on('pong', heartbeat);

  const playerId = 'hero_' + (nextId++);

  ws.on('message', (raw) => {
    try {
      const data = JSON.parse(raw);

      if (data.type === 'join') {
        const name = (data.name || 'Hero').slice(0, 15).trim() || 'Hero';
        const classId = data.classId || 'human';

        // 1. Ghost Player Prevention: Prune any previous stale connection sharing the SAME name
        for (const [existingWs, existingP] of activePlayers.entries()) {
          if (existingWs !== ws && existingP.name.toLowerCase() === name.toLowerCase()) {
            console.log(`[Ghost Prune] Evicting older session for hero: ${name} (${existingP.id})`);
            activePlayers.delete(existingWs);
            broadcast({
              type: 'player_left',
              id: existingP.id
            });
            try {
              existingWs.terminate();
            } catch (e) {}
          }
        }

        // Retrieve existing save or create new entry in local DB
        let profile = playerDB[name];
        if (!profile) {
          profile = {
            name,
            classId,
            level: 1,
            gold: 0,
            exp: 0,
            rank: 'RANK F',
            inventory: []
          };
          playerDB[name] = profile;
          saveDB(playerDB);
        }

        const playerData = {
          id: playerId,
          name,
          classId,
          x: data.x !== undefined ? data.x : 0,
          y: data.y !== undefined ? data.y : 0.05,
          z: data.z !== undefined ? data.z : 7.5,
          rotY: data.rotY !== undefined ? data.rotY : Math.PI,
          anim: 'idle',
          isRiding: !!data.isRiding,
          level: profile.level || 1,
          hp: 100,
          maxHp: 100
        };

        activePlayers.set(ws, playerData);

        // Send initialization packet with existing active players & user's profile
        const others = [];
        activePlayers.forEach((p, otherWs) => {
          if (otherWs !== ws && otherWs.readyState === WebSocket.OPEN) others.push(p);
        });

        ws.send(JSON.stringify({
          type: 'init',
          id: playerId,
          profile,
          existingPlayers: others
        }));

        // Broadcast new player arrival to everyone else
        broadcast({
          type: 'player_joined',
          player: playerData
        }, ws);

        // System server announcement in chat
        broadcast({
          type: 'chat',
          sender: 'SYSTEM',
          classId: 'system',
          text: `✨ ${name} has joined the world!`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
      }

      else if (data.type === 'update') {
        const p = activePlayers.get(ws);
        if (p) {
          p.x = data.x;
          p.y = data.y;
          p.z = data.z;
          p.rotY = data.rotY;
          p.anim = data.anim;
          p.isRiding = !!data.isRiding;
          if (data.level) p.level = data.level;

          broadcast({
            type: 'player_moved',
            id: p.id,
            x: p.x,
            y: p.y,
            z: p.z,
            rotY: p.rotY,
            anim: p.anim,
            isRiding: p.isRiding,
            level: p.level
          }, ws);
        }
      }

      else if (data.type === 'action') {
        const p = activePlayers.get(ws);
        if (p) {
          broadcast({
            type: 'player_action',
            id: p.id,
            action: data.action // 'attack', 'skill', 'cheer', etc.
          }, ws);
        }
      }

      else if (data.type === 'chat') {
        const p = activePlayers.get(ws);
        const text = (data.text || '').slice(0, 120).trim();
        if (p && text) {
          broadcast({
            type: 'chat',
            id: p.id,
            sender: p.name,
            classId: p.classId,
            text: text,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          });
        }
      }

      else if (data.type === 'save_profile') {
        const p = activePlayers.get(ws);
        if (p && data.profile) {
          playerDB[p.name] = { ...playerDB[p.name], ...data.profile };
          saveDB(playerDB);
        }
      }
    } catch (err) {
      console.error('WebSocket Error:', err);
    }
  });

  ws.on('close', () => {
    const p = activePlayers.get(ws);
    if (p) {
      activePlayers.delete(ws);
      broadcast({
        type: 'player_left',
        id: p.id
      });
      broadcast({
        type: 'chat',
        sender: 'SYSTEM',
        classId: 'system',
        text: `🚪 ${p.name} has left the world.`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
    }
  });
});

server.listen(PORT, () => {
  console.log(`Isekai 3D Multiplayer Server running at http://localhost:${PORT}/`);
});
