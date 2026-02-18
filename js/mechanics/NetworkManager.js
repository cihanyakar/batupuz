import { EventBus, Events } from './EventBus.js';

class _NetworkManager {
    constructor() {
        this.ws = null;
        this.localPlayerId = null;
        this.roomCode = null;
        this.connected = false;
        this.isHost = false;
    }

    connect(url) {
        return new Promise((resolve, reject) => {
            this.ws = new WebSocket(url);

            this.ws.onopen = () => {
                this.connected = true;
                resolve();
            };

            this.ws.onerror = () => {
                reject(new Error('WebSocket connection failed'));
            };

            this.ws.onclose = () => {
                this.connected = false;
                EventBus.emit(Events.NET_DISCONNECTED);
            };

            this.ws.onmessage = (event) => {
                let msg;
                try { msg = JSON.parse(event.data); } catch { return; }
                this._handleMessage(msg);
            };
        });
    }

    send(msg) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(msg));
        }
    }

    createRoom() {
        this.send({ type: 'create' });
    }

    joinRoom(code) {
        this.send({ type: 'join', code });
    }

    sendDrop(x) {
        this.send({ type: 'drop', x });
    }

    sendCursor(x) {
        this.send({ type: 'cursor', x });
    }

    sendGameOver(score) {
        this.send({ type: 'gameOver', score });
    }

    sendRestart() {
        this.send({ type: 'restart' });
    }

    // HOST-only send methods

    sendWorldState(data) {
        if (!this.isHost) return;
        this.send({ type: 'worldState', b: data.b, score: data.score });
    }

    sendMerge(data) {
        if (!this.isHost) return;
        this.send({ type: 'merge', ...data });
    }

    sendDestroy(data) {
        if (!this.isHost) return;
        this.send({ type: 'destroy', ...data });
    }

    _handleMessage(msg) {
        switch (msg.type) {
            case 'joined':
                this.localPlayerId = msg.playerId;
                this.roomCode = msg.code;
                this.isHost = (msg.playerId === 0);
                EventBus.emit(Events.NET_JOINED, msg);
                break;

            case 'start':
                EventBus.emit(Events.NET_GAME_START, msg);
                break;

            case 'drop':
                EventBus.emit(Events.NET_DROP, msg);
                break;

            case 'autoDrop':
                EventBus.emit(Events.NET_AUTO_DROP, msg);
                break;

            case 'newFruit':
                EventBus.emit(Events.NET_NEW_FRUIT, msg);
                break;

            case 'timer':
                EventBus.emit(Events.NET_TIMER, msg);
                break;

            case 'cursor':
                EventBus.emit(Events.NET_CURSOR, msg);
                break;

            case 'gameOver':
                EventBus.emit(Events.NET_GAME_OVER, msg);
                break;

            case 'restart':
                EventBus.emit(Events.NET_RESTART, msg);
                break;

            case 'playerLeft':
                EventBus.emit(Events.NET_PLAYER_LEFT, msg);
                break;

            case 'error':
                EventBus.emit(Events.NET_ERROR, msg);
                break;

            case 'worldState':
                EventBus.emit(Events.NET_WORLD_STATE, msg);
                break;

            case 'merge':
                EventBus.emit(Events.NET_MERGE, msg);
                break;

            case 'destroy':
                EventBus.emit(Events.NET_DESTROY, msg);
                break;
        }
    }
}

export const NetworkManager = new _NetworkManager();
