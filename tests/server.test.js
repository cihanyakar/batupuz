import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { spawn } from 'child_process';
import WebSocket from 'ws';
import path from 'path';

const SERVER_PORT = 3000;
const SERVER_URL = `ws://localhost:${SERVER_PORT}`;
const SERVER_PATH = path.resolve(import.meta.dirname, '..', 'server', 'index.js');

let serverProcess;

// Helper: create a WebSocket client and wait for it to connect
function createClient() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(SERVER_URL);
    ws.on('open', () => resolve(ws));
    ws.on('error', reject);
  });
}

// Helper: send a JSON message
function send(ws, msg) {
  ws.send(JSON.stringify(msg));
}

// Helper: wait for the next JSON message matching an optional type filter
function waitForMessage(ws, type, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      ws.removeListener('message', handler);
      reject(new Error(`Timed out waiting for message type "${type}"`));
    }, timeoutMs);

    function handler(raw) {
      const msg = JSON.parse(raw.toString());
      if (!type || msg.type === type) {
        clearTimeout(timer);
        ws.removeListener('message', handler);
        resolve(msg);
      }
    }
    ws.on('message', handler);
  });
}

// Helper: collect all JSON messages for a duration
function collectMessages(ws, durationMs) {
  return new Promise((resolve) => {
    const msgs = [];
    function handler(raw) {
      msgs.push(JSON.parse(raw.toString()));
    }
    ws.on('message', handler);
    setTimeout(() => {
      ws.removeListener('message', handler);
      resolve(msgs);
    }, durationMs);
  });
}

// Keep track of open clients so we can clean up
let openClients = [];

function trackClient(ws) {
  openClients.push(ws);
  return ws;
}

function closeClient(ws) {
  return new Promise((resolve) => {
    if (ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING) {
      resolve();
      return;
    }
    ws.on('close', resolve);
    ws.close();
  });
}

beforeAll(async () => {
  // Start the server in a child process
  serverProcess = spawn('node', [SERVER_PATH], {
    stdio: 'pipe',
    env: { ...process.env },
  });

  // Wait for the server to be ready by polling
  await new Promise((resolve, reject) => {
    const maxRetries = 30;
    let retries = 0;

    function tryConnect() {
      const ws = new WebSocket(SERVER_URL);
      ws.on('open', () => {
        ws.close();
        resolve();
      });
      ws.on('error', () => {
        retries++;
        if (retries >= maxRetries) {
          reject(new Error('Server did not start in time'));
        } else {
          setTimeout(tryConnect, 100);
        }
      });
    }
    tryConnect();
  });
});

afterEach(async () => {
  // Close all tracked clients after each test
  const closing = openClients.map(ws => closeClient(ws));
  await Promise.all(closing);
  openClients = [];
  // Brief pause to let the server clean up rooms
  await new Promise(r => setTimeout(r, 100));
});

afterAll(async () => {
  if (serverProcess) {
    serverProcess.kill('SIGKILL');
    await new Promise(resolve => {
      serverProcess.on('close', resolve);
      // Fallback: if the process still doesn't close, resolve after 2s
      setTimeout(resolve, 2000);
    });
  }
});

describe('Server - Room management', () => {
  it('room creation returns a 4-letter code', async () => {
    const ws = trackClient(await createClient());

    const joinedPromise = waitForMessage(ws, 'joined');
    send(ws, { type: 'create' });
    const msg = await joinedPromise;

    expect(msg.type).toBe('joined');
    expect(msg.playerId).toBe(0);
    expect(msg.code).toMatch(/^[A-Z]{4}$/);
  });

  it('two players can join a room and game starts', async () => {
    const ws1 = trackClient(await createClient());
    const ws2 = trackClient(await createClient());

    // Player 1 creates
    const joined1Promise = waitForMessage(ws1, 'joined');
    send(ws1, { type: 'create' });
    const joined1 = await joined1Promise;
    expect(joined1.playerId).toBe(0);

    const code = joined1.code;

    // Player 2 joins - both should get 'start'
    const start1Promise = waitForMessage(ws1, 'start');
    const joined2Promise = waitForMessage(ws2, 'joined');
    send(ws2, { type: 'join', code });
    const joined2 = await joined2Promise;
    expect(joined2.playerId).toBe(1);
    expect(joined2.code).toBe(code);

    const start1 = await start1Promise;
    expect(start1.type).toBe('start');
    expect(start1.players).toHaveLength(2);
    expect(start1.players[0].id).toBe(0);
    expect(start1.players[1].id).toBe(1);
  });

  it('room code is case insensitive', async () => {
    const ws1 = trackClient(await createClient());
    const ws2 = trackClient(await createClient());

    const joined1Promise = waitForMessage(ws1, 'joined');
    send(ws1, { type: 'create' });
    const joined1 = await joined1Promise;
    const code = joined1.code;

    // Join with lowercase code
    const joined2Promise = waitForMessage(ws2, 'joined');
    send(ws2, { type: 'join', code: code.toLowerCase() });
    const joined2 = await joined2Promise;
    expect(joined2.type).toBe('joined');
    expect(joined2.playerId).toBe(1);
  });

  it('full room rejects third player', async () => {
    const ws1 = trackClient(await createClient());
    const ws2 = trackClient(await createClient());
    const ws3 = trackClient(await createClient());

    // Create room
    const joined1Promise = waitForMessage(ws1, 'joined');
    send(ws1, { type: 'create' });
    const joined1 = await joined1Promise;
    const code = joined1.code;

    // Second player joins
    const joined2Promise = waitForMessage(ws2, 'joined');
    send(ws2, { type: 'join', code });
    await joined2Promise;

    // Third player tries to join
    const errorPromise = waitForMessage(ws3, 'error');
    send(ws3, { type: 'join', code });
    const errorMsg = await errorPromise;
    expect(errorMsg.type).toBe('error');
    expect(errorMsg.message).toBe('Room is full');
  });

  it('invalid room code returns error', async () => {
    const ws = trackClient(await createClient());

    const errorPromise = waitForMessage(ws, 'error');
    send(ws, { type: 'join', code: 'ZZZZ' });
    const errorMsg = await errorPromise;
    expect(errorMsg.type).toBe('error');
    expect(errorMsg.message).toBe('Room not found');
  });
});

describe('Server - Game actions', () => {
  // Helper to set up a started game with two connected players
  async function setupGame() {
    const ws1 = trackClient(await createClient());
    const ws2 = trackClient(await createClient());

    const joined1Promise = waitForMessage(ws1, 'joined');
    send(ws1, { type: 'create' });
    const joined1 = await joined1Promise;
    const code = joined1.code;

    const start1Promise = waitForMessage(ws1, 'start');
    const start2Promise = waitForMessage(ws2, 'start');
    const joined2Promise = waitForMessage(ws2, 'joined');
    send(ws2, { type: 'join', code });
    await joined2Promise;
    const startMsg = await start1Promise;
    await start2Promise;

    return { ws1, ws2, code, startMsg };
  }

  it('drop message broadcasts to both players', async () => {
    const { ws1, ws2 } = await setupGame();

    // Drain any queued timer messages briefly
    await new Promise(r => setTimeout(r, 200));

    const drop1Promise = waitForMessage(ws1, 'drop');
    const drop2Promise = waitForMessage(ws2, 'drop');

    send(ws1, { type: 'drop', x: 300 });

    const drop1 = await drop1Promise;
    const drop2 = await drop2Promise;

    expect(drop1.type).toBe('drop');
    expect(drop1.playerId).toBe(0);
    expect(typeof drop1.x).toBe('number');
    expect(typeof drop1.tier).toBe('number');
    expect(typeof drop1.uid).toBe('string');

    // Both players receive the same drop info
    expect(drop2.type).toBe('drop');
    expect(drop2.playerId).toBe(0);
    expect(drop2.x).toBe(drop1.x);
    expect(drop2.tier).toBe(drop1.tier);
    expect(drop2.uid).toBe(drop1.uid);
  });

  it('timer counts down and broadcasts timer messages', async () => {
    const { ws1 } = await setupGame();

    // Collect messages for ~1.5 seconds to capture at least 1 timer tick
    const msgs = await collectMessages(ws1, 1500);
    const timerMsgs = msgs.filter(m => m.type === 'timer');

    expect(timerMsgs.length).toBeGreaterThan(0);
    // Timer messages should have playerId and timeLeft
    for (const tm of timerMsgs) {
      expect(typeof tm.playerId).toBe('number');
      expect(typeof tm.timeLeft).toBe('number');
    }
  });

  it('game over from host works', async () => {
    const { ws1, ws2 } = await setupGame();

    const gameOver1Promise = waitForMessage(ws1, 'gameOver');
    const gameOver2Promise = waitForMessage(ws2, 'gameOver');

    send(ws1, { type: 'gameOver', score: 42 });

    const go1 = await gameOver1Promise;
    const go2 = await gameOver2Promise;

    expect(go1.type).toBe('gameOver');
    expect(go1.score).toBe(42);
    expect(go2.type).toBe('gameOver');
    expect(go2.score).toBe(42);
  });

  it('game over from non-host is ignored', async () => {
    const { ws1, ws2 } = await setupGame();

    // Player 2 (non-host) tries to end game
    send(ws2, { type: 'gameOver', score: 99 });

    // Wait a bit and ensure no gameOver message arrives for player 1
    const msgs = await collectMessages(ws1, 500);
    const gameOverMsgs = msgs.filter(m => m.type === 'gameOver');
    expect(gameOverMsgs).toHaveLength(0);
  });

  it('restart resets state and starts a new game', async () => {
    const { ws1, ws2 } = await setupGame();

    // First, end the game
    const gameOver1Promise = waitForMessage(ws1, 'gameOver');
    const gameOver2Promise = waitForMessage(ws2, 'gameOver');
    send(ws1, { type: 'gameOver', score: 50 });
    await gameOver1Promise;
    await gameOver2Promise;

    // Now restart
    const restart1Promise = waitForMessage(ws1, 'restart');
    const restart2Promise = waitForMessage(ws2, 'restart');
    send(ws1, { type: 'restart' });
    const r1 = await restart1Promise;
    const r2 = await restart2Promise;

    expect(r1.type).toBe('restart');
    expect(r1.players).toHaveLength(2);
    expect(r1.players[0].id).toBe(0);
    expect(r1.players[1].id).toBe(1);
    // Each player has a tier and nextTier
    for (const p of r1.players) {
      expect(typeof p.tier).toBe('number');
      expect(typeof p.nextTier).toBe('number');
    }

    expect(r2.type).toBe('restart');
    expect(r2.players).toEqual(r1.players);
  });

  it('drop assigns new fruit and broadcasts newFruit message', async () => {
    const { ws1, ws2 } = await setupGame();

    await new Promise(r => setTimeout(r, 200));

    const newFruit1Promise = waitForMessage(ws1, 'newFruit');
    const newFruit2Promise = waitForMessage(ws2, 'newFruit');

    send(ws1, { type: 'drop', x: 300 });

    const nf1 = await newFruit1Promise;
    const nf2 = await newFruit2Promise;

    expect(nf1.type).toBe('newFruit');
    expect(nf1.playerId).toBe(0);
    expect(typeof nf1.tier).toBe('number');
    expect(typeof nf1.nextTier).toBe('number');

    expect(nf2).toEqual(nf1);
  });

  it('drop clamps x within game bounds', async () => {
    const { ws1 } = await setupGame();

    await new Promise(r => setTimeout(r, 200));

    const dropPromise = waitForMessage(ws1, 'drop');
    // Send x = -100, which should be clamped to at least the fruit radius
    send(ws1, { type: 'drop', x: -100 });
    const dropMsg = await dropPromise;

    expect(dropMsg.x).toBeGreaterThanOrEqual(0);
  });

  it('player disconnect sends playerLeft to remaining player', async () => {
    const { ws1, ws2 } = await setupGame();

    const leftPromise = waitForMessage(ws1, 'playerLeft');
    // Close player 2's connection
    ws2.close();
    const leftMsg = await leftPromise;
    expect(leftMsg.type).toBe('playerLeft');
  });
});
