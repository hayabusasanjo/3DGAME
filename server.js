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

  // API Endpoint: Check Hero Name Uniqueness in Real-Time
  if (safeUrl === '/api/check-name') {
    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const nameToCheck = (parsedUrl.searchParams.get('name') || '').trim().toLowerCase();
    let isTaken = false;
    for (const [activeWs, p] of activePlayers.entries()) {
      if (activeWs.readyState === WebSocket.OPEN && p.name && p.name.toLowerCase() === nameToCheck) {
        isTaken = true;
        break;
      }
    }
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(JSON.stringify({ available: !isTaken, name: nameToCheck }));
    return;
  }

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

// 3. Shared Monster & Boss World State (Synchronized Cooperative Multiplayer)
const globalMonsters = {
  'slime_azure_0': { maxHp: 45, hp: 45, isDead: false, isBoss: false },
  'slime_azure_1': { maxHp: 45, hp: 45, isDead: false, isBoss: false },
  'rabbit_0': { maxHp: 65, hp: 65, isDead: false, isBoss: false },
  'rabbit_1': { maxHp: 65, hp: 65, isDead: false, isBoss: false },
  'slime_emerald_0': { maxHp: 65, hp: 65, isDead: false, isBoss: false },
  'slime_emerald_1': { maxHp: 65, hp: 65, isDead: false, isBoss: false },
  'boss_king_slime': { maxHp: 420, hp: 420, isDead: false, isBoss: true },
  'goblin_0': { maxHp: 120, hp: 120, isDead: false, isBoss: false },
  'goblin_1': { maxHp: 120, hp: 120, isDead: false, isBoss: false },
  'spider_0': { maxHp: 140, hp: 140, isDead: false, isBoss: false },
  'spider_1': { maxHp: 140, hp: 140, isDead: false, isBoss: false },
  'goblin_cave': { maxHp: 175, hp: 175, isDead: false, isBoss: false },
  'boss_golem': { maxHp: 1400, hp: 1400, isDead: false, isBoss: true }
};

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

        // 1. Unique Hero Name & Duplicate Prevention:
        let isTaken = false;
        for (const [existingWs, existingP] of activePlayers.entries()) {
          if (existingWs !== ws && existingP.name.toLowerCase() === name.toLowerCase()) {
            if (existingWs.readyState === WebSocket.OPEN) {
              isTaken = true;
              break;
            } else {
              // Stale/closed session, prune cleanly
              activePlayers.delete(existingWs);
              broadcast({
                type: 'player_left',
                id: existingP.id
              });
              try { existingWs.terminate(); } catch (e) {}
            }
          }
        }

        if (isTaken) {
          console.log(`[Reject Duplicate] Adventurer name "${name}" is currently in-use.`);
          ws.send(JSON.stringify({
            type: 'name_taken',
            name: name,
            message: `Hero name "${name}" is currently online in the world! Please choose a unique name.`
          }));
          return;
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
          existingPlayers: others,
          monsters: globalMonsters
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
            action: data.action, // 'attack', 'skill', 'cheer', etc.
            data: data.data || {}
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

      else if (data.type === 'monster_damage') {
        const m = globalMonsters[data.monsterId];
        if (m) {
          m.hp = Math.max(0, m.hp - data.amount);
          const isKilled = (m.hp <= 0 && !m.isDead);
          if (isKilled) {
            m.isDead = true;
            const respawnTime = m.isBoss ? 35000 : 16000;
            setTimeout(() => {
              m.hp = m.maxHp;
              m.isDead = false;
              broadcast({
                type: 'monster_respawn',
                monsterId: data.monsterId
              });
            }, respawnTime);
          }

          broadcast({
            type: 'monster_damaged',
            monsterId: data.monsterId,
            damage: data.amount,
            hp: m.hp,
            maxHp: m.maxHp,
            isCrit: !!data.isCrit,
            isKilled: isKilled,
            attackerName: data.attackerName || 'Hero',
            attackerPos: data.attackerPos
          }, ws);
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
