const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

const SPAWNABLE_TIERS = [0, 1, 2, 3];
const GAME_WIDTH = 600;
const PLAY_AREA_TOP = 98;
const DROP_TIMER_SEC = 5;

function randomTier() {
    return SPAWNABLE_TIERS[Math.floor(Math.random() * SPAWNABLE_TIERS.length)];
}

function randomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    let code = '';
    for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
}

function randomX() {
    return 70 + Math.floor(Math.random() * (GAME_WIDTH - 140));
}

class Room {
    constructor(code) {
        this.code = code;
        this.players = []; // [{ws, id, tier, nextTier, timerSec, timerInterval, lastDropTime}]
        this.started = false;
        this.gameOver = false;
        this.nextFruitId = 0;
        this.hostId = 0;
    }

    addPlayer(ws) {
        const id = this.players.length;
        const player = {
            ws,
            id,
            tier: randomTier(),
            nextTier: randomTier(),
            timerSec: DROP_TIMER_SEC,
            timerInterval: null,
            lastDropTime: 0,
        };
        this.players.push(player);
        ws._player = player;
        ws._room = this;

        this.send(ws, { type: 'joined', playerId: id, code: this.code });

        if (this.players.length === 2) {
            this.startGame();
        }
    }

    startGame() {
        this.started = true;
        const playersData = this.players.map(p => ({
            id: p.id,
            tier: p.tier,
            nextTier: p.nextTier,
        }));
        this.broadcast({ type: 'start', players: playersData });

        // Start timers for both players
        for (const p of this.players) {
            this.startTimer(p);
        }
    }

    startTimer(player) {
        this.clearTimer(player);
        player.timerSec = DROP_TIMER_SEC;

        // Immediately broadcast the reset so clients see "5" right away
        this.broadcast({ type: 'timer', playerId: player.id, timeLeft: player.timerSec });

        player.timerInterval = setInterval(() => {
            if (this.gameOver) {
                this.clearTimer(player);
                return;
            }

            player.timerSec--;
            this.broadcast({ type: 'timer', playerId: player.id, timeLeft: player.timerSec });

            if (player.timerSec <= 0) {
                this.clearTimer(player);
                this.autoDrop(player);
            }
        }, 1000);
    }

    clearTimer(player) {
        if (player.timerInterval) {
            clearInterval(player.timerInterval);
            player.timerInterval = null;
        }
    }

    handleDrop(player, x) {
        if (this.gameOver || !this.started) return;

        // Rate limit: 200ms cooldown per player
        const now = Date.now();
        if (now - player.lastDropTime < 200) return;
        player.lastDropTime = now;

        const tier = player.tier;
        const radius = [20, 30, 42, 55, 70, 82, 95, 108][tier];
        const clampedX = Math.max(radius, Math.min(GAME_WIDTH - radius, x));

        // Assign a unique uid
        const uid = 'f_' + this.nextFruitId++;

        // Broadcast the drop to all players
        this.broadcast({ type: 'drop', playerId: player.id, tier, x: clampedX, uid });

        // Assign new fruit
        this.assignNewFruit(player);
    }

    autoDrop(player) {
        if (this.gameOver) return;

        const x = randomX();
        const tier = player.tier;

        // Assign a unique uid
        const uid = 'f_' + this.nextFruitId++;

        this.broadcast({ type: 'autoDrop', playerId: player.id, tier, x, uid });

        this.assignNewFruit(player);
    }

    assignNewFruit(player) {
        player.tier = player.nextTier;
        player.nextTier = randomTier();

        this.broadcast({
            type: 'newFruit',
            playerId: player.id,
            tier: player.tier,
            nextTier: player.nextTier,
        });

        // Reset timer
        this.startTimer(player);
    }

    handleCursor(player, x) {
        // Server-side throttle: max 1 cursor update per 100ms per player
        const now = Date.now();
        if (now - (player.lastCursorTime || 0) < 100) return;
        player.lastCursorTime = now;

        // Relay cursor to the OTHER player only
        for (const p of this.players) {
            if (p !== player && p.ws.readyState === 1) {
                this.send(p.ws, { type: 'cursor', playerId: player.id, x });
            }
        }
    }

    handleGameOver(player, score) {
        // Only HOST (player 0) can declare game over
        if (player.id !== this.hostId) return;
        if (this.gameOver) return;
        this.gameOver = true;

        for (const p of this.players) {
            this.clearTimer(p);
        }

        this.broadcast({ type: 'gameOver', score });
    }

    handleRestart(player) {
        if (!this.gameOver) return;

        this.gameOver = false;
        this.nextFruitId = 0;

        for (const p of this.players) {
            p.tier = randomTier();
            p.nextTier = randomTier();
            p.lastDropTime = 0;
        }

        const playersData = this.players.map(p => ({
            id: p.id,
            tier: p.tier,
            nextTier: p.nextTier,
        }));
        this.broadcast({ type: 'restart', players: playersData });

        for (const p of this.players) {
            this.startTimer(p);
        }
    }

    handleWorldState(player, msg) {
        // Only HOST (player 0) can send world state
        if (player.id !== this.hostId) return;

        // Relay to all OTHER players (not back to HOST)
        // Pass through the optimized format as-is
        const data = { type: 'worldState', b: msg.b || msg.bodies };
        for (const p of this.players) {
            if (p !== player && p.ws.readyState === 1) {
                this.send(p.ws, data);
            }
        }
    }

    handleMerge(player, msg) {
        // Only HOST (player 0) can send merge events
        if (player.id !== this.hostId) return;

        // Relay to all OTHER players (not back to HOST)
        const data = {
            type: 'merge',
            uidA: msg.uidA,
            uidB: msg.uidB,
            resultUid: msg.resultUid,
            resultTier: msg.resultTier,
            x: msg.x,
            y: msg.y,
            score: msg.score,
        };
        for (const p of this.players) {
            if (p !== player && p.ws.readyState === 1) {
                this.send(p.ws, data);
            }
        }
    }

    handleDestroy(player, msg) {
        // Only HOST (player 0) can send destroy events
        if (player.id !== this.hostId) return;

        // Relay to all OTHER players (not back to HOST)
        const data = {
            type: 'destroy',
            uidA: msg.uidA,
            uidB: msg.uidB,
            x: msg.x,
            y: msg.y,
            score: msg.score,
        };
        for (const p of this.players) {
            if (p !== player && p.ws.readyState === 1) {
                this.send(p.ws, data);
            }
        }
    }

    removePlayer(player) {
        this.clearTimer(player);

        const wasHost = (player.id === this.hostId);

        this.players = this.players.filter(p => p !== player);

        if (this.players.length > 0) {
            for (const p of this.players) {
                this.clearTimer(p);
            }

            if (wasHost) {
                this.broadcast({ type: 'playerLeft', hostDisconnected: true });
            } else {
                this.broadcast({ type: 'playerLeft' });
            }
        }

        this.started = false;
        this.gameOver = true;
    }

    send(ws, msg) {
        if (ws.readyState === 1) {
            ws.send(JSON.stringify(msg));
        }
    }

    broadcast(msg) {
        const str = JSON.stringify(msg);
        for (const p of this.players) {
            if (p.ws.readyState === 1) {
                p.ws.send(str);
            }
        }
    }
}

// --- Server setup ---

const rooms = new Map();
const PORT = process.env.PORT || 8082;
const STATIC_ROOT = path.join(__dirname, '..');

const MIME_TYPES = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
};

const httpServer = http.createServer((req, res) => {
    const urlPath = req.url.split('?')[0];
    let filePath = path.join(STATIC_ROOT, urlPath === '/' ? 'index.html' : urlPath);
    filePath = path.normalize(filePath);

    // Security: prevent directory traversal
    if (!filePath.startsWith(STATIC_ROOT)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    const ext = path.extname(filePath);
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, data) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.writeHead(404);
                res.end('Not found');
            } else {
                res.writeHead(500);
                res.end('Server error');
            }
            return;
        }
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
    });
});

const wss = new WebSocketServer({ server: httpServer });

wss.on('connection', (ws) => {
    ws.on('message', (raw) => {
        let msg;
        try {
            msg = JSON.parse(raw);
        } catch {
            return;
        }

        // Validate type is a string
        if (typeof msg.type !== 'string') return;

        switch (msg.type) {
            case 'create': {
                let code;
                do { code = randomCode(); } while (rooms.has(code));
                const room = new Room(code);
                rooms.set(code, room);
                room.addPlayer(ws);
                break;
            }

            case 'join': {
                const code = (msg.code || '').toUpperCase();
                const room = rooms.get(code);
                if (!room) {
                    ws.send(JSON.stringify({ type: 'error', message: 'Room not found' }));
                    return;
                }
                if (room.players.length >= 2) {
                    ws.send(JSON.stringify({ type: 'error', message: 'Room is full' }));
                    return;
                }
                room.addPlayer(ws);
                break;
            }

            case 'drop': {
                const room = ws._room;
                const player = ws._player;
                if (room && player) {
                    room.handleDrop(player, msg.x);
                }
                break;
            }

            case 'cursor': {
                const room = ws._room;
                const player = ws._player;
                if (room && player) {
                    room.handleCursor(player, msg.x);
                }
                break;
            }

            case 'gameOver': {
                const room = ws._room;
                const player = ws._player;
                if (room && player) {
                    room.handleGameOver(player, msg.score);
                }
                break;
            }

            case 'restart': {
                const room = ws._room;
                const player = ws._player;
                if (room && player) {
                    room.handleRestart(player);
                }
                break;
            }

            case 'worldState': {
                const room = ws._room;
                const player = ws._player;
                if (room && player) {
                    room.handleWorldState(player, msg);
                }
                break;
            }

            case 'merge': {
                const room = ws._room;
                const player = ws._player;
                if (room && player) {
                    room.handleMerge(player, msg);
                }
                break;
            }

            case 'destroy': {
                const room = ws._room;
                const player = ws._player;
                if (room && player) {
                    room.handleDestroy(player, msg);
                }
                break;
            }
        }
    });

    ws.on('close', () => {
        const room = ws._room;
        const player = ws._player;
        if (room && player) {
            room.removePlayer(player);
            if (room.players.length === 0) {
                rooms.delete(room.code);
            }
        }
    });
});

httpServer.listen(PORT, () => {
    console.log(`Batupuz server running on http://localhost:${PORT}`);
});
