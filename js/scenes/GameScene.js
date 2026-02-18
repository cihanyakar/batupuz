import { FRUIT_TIERS, MAX_TIER, GAME_WIDTH, GAME_HEIGHT, PLAY_AREA_TOP } from '../mechanics/FruitConfig.js';
import { EventBus, Events } from '../mechanics/EventBus.js';
import { GameMechanics } from '../mechanics/GameMechanics.js';
import { NetworkManager } from '../mechanics/NetworkManager.js';
import { Fruit } from '../objects/Fruit.js';
import { createWalls } from '../objects/Wall.js';
import { SoundManager } from '../mechanics/SoundManager.js';

const PLAYER_COLORS = [0xff4d94, 0x3dffd4]; // P1: pink, P2: cyan

export class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    create() {
        this.mechanics = new GameMechanics();
        this.fruits = [];
        this.fruitMap = new Map(); // Map<uid, Fruit> for quick lookup
        this.mergeInProgress = new Set();
        this.lastGameOverCheck = 0;
        this._worldStateTimer = 0;
        this._nextMergeUid = 0;
        this._pendingDrop = null; // uid of locally predicted drop
        this._pendingDropTimeout = null;

        // Initialize sound
        SoundManager.init();

        // Multiplayer data from lobby
        this.localPlayerId = this.registry.get('localPlayerId');
        this.isHost = NetworkManager.isHost;
        const startData = this.registry.get('gameStartData');
        this.mechanics.initFromServer(startData.players);

        // Generate particle texture (small 4x4 white square)
        if (!this.textures.exists('particle_square')) {
            const pGfx = this.add.graphics();
            pGfx.fillStyle(0xffffff, 1);
            pGfx.fillRect(0, 0, 4, 4);
            pGfx.generateTexture('particle_square', 4, 4);
            pGfx.destroy();
        }

        // Add dungeon background
        if (this.textures.exists('bg_parchment')) {
            this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'bg_parchment').setDepth(-1);
        }

        createWalls(this);
        this._setupInput();
        this._setupCollisionHandler();
        this._setupNetworkListeners();

        // Remote player cursor
        this.remoteCursor = this.add.graphics();

        this.scene.launch('UIScene');

        // Emit initial fruit info for both players
        for (const p of startData.players) {
            EventBus.emit(Events.NEXT_FRUIT_CHOSEN, {
                playerId: p.id,
                tier: p.tier,
                nextTier: p.nextTier,
            });
        }

        // Play game start sound
        SoundManager.play('gameStart');
    }

    update(time) {
        for (let i = 0; i < this.fruits.length; i++) {
            this.fruits[i].updateShadow();
        }
        this._checkGameOver(time);

        const delta = this.game.loop.delta;

        if (this.isHost) {
            // HOST: broadcast world state periodically
            this._sendWorldStateIfNeeded(delta);
        } else {
            // GUEST: interpolate fruit positions toward HOST targets
            this._applyInterpolations(delta);
        }
    }

    _setupInput() {
        // Send cursor position (throttled - 150ms)
        let lastCursorSend = 0;
        this.input.on('pointermove', (pointer) => {
            const now = Date.now();
            if (now - lastCursorSend > 150) {
                lastCursorSend = now;
                NetworkManager.sendCursor(pointer.x);
            }
        });

        // Drop on click inside canvas
        this.input.on('pointerdown', (pointer) => {
            this._doDrop(pointer.x);
        });

        // Drop on click OUTSIDE canvas - clamp to nearest edge
        this._windowClickHandler = (e) => {
            const canvas = this.game.canvas;
            if (e.target === canvas) return; // already handled by Phaser
            const rect = canvas.getBoundingClientRect();
            // Only handle clicks that are vertically within game area
            if (e.clientY < rect.top || e.clientY > rect.bottom) return;
            const gameX = e.clientX < rect.left + rect.width / 2 ? 0 : GAME_WIDTH;
            this._doDrop(gameX);
        };
        window.addEventListener('pointerdown', this._windowClickHandler);
    }

    _doDrop(x) {
        if (this.mechanics.isGameOver) return;
        if (this._pendingDrop) return; // already waiting for confirm

        NetworkManager.sendDrop(x);

        // Client prediction: spawn gem immediately for local player
        const player = this.mechanics.getPlayer(this.localPlayerId);
        if (player) {
            const tier = player.currentTier;
            const pendingUid = '_p_' + Date.now();
            this._spawnFruit(this.localPlayerId, tier, x, pendingUid);
            this._pendingDrop = pendingUid;

            // Timeout: if server doesn't confirm within 600ms, remove predicted fruit
            if (this._pendingDropTimeout) this._pendingDropTimeout.remove();
            this._pendingDropTimeout = this.time.delayedCall(600, () => {
                if (this._pendingDrop) {
                    const fruit = this.fruitMap.get(this._pendingDrop);
                    if (fruit) {
                        this.fruits = this.fruits.filter(f => f !== fruit);
                        fruit.destroy();
                        this.fruitMap.delete(this._pendingDrop);
                    }
                    this._pendingDrop = null;
                }
            });
        }
    }

    _setupCollisionHandler() {
        this.matter.world.on('collisionstart', (event) => {
            // GUEST skips collision handling entirely - HOST is authoritative
            if (!this.isHost) return;

            for (let i = 0; i < event.pairs.length; i++) {
                const { bodyA, bodyB } = event.pairs[i];
                this._handleCollision(bodyA, bodyB);
            }
        });
    }

    _handleCollision(bodyA, bodyB) {
        if (!bodyA.gameObject || !bodyB.gameObject) return;

        const fruitA = bodyA.gameObject.getData('fruitInstance');
        const fruitB = bodyB.gameObject.getData('fruitInstance');
        if (!fruitA || !fruitB) return;

        if (this.mergeInProgress.has(bodyA.id) || this.mergeInProgress.has(bodyB.id)) return;

        if (fruitA.tier !== fruitB.tier) return;

        // Two max-tier fruits (Dragon Egg): destroy both
        if (fruitA.tier === MAX_TIER) {
            this.mergeInProgress.add(bodyA.id);
            this.mergeInProgress.add(bodyB.id);

            const mx = (fruitA.body.x + fruitB.body.x) / 2;
            const my = (fruitA.body.y + fruitB.body.y) / 2;

            // Remove both fruits
            this.fruitMap.delete(fruitA.uid);
            this.fruitMap.delete(fruitB.uid);
            fruitA.destroy();
            fruitB.destroy();
            this.fruits = this.fruits.filter(f => f !== fruitA && f !== fruitB);
            this.mechanics.addScore(MAX_TIER);

            // Max merge effects
            this._emitMergeParticles(mx, my, FRUIT_TIERS[MAX_TIER].color, FRUIT_TIERS[MAX_TIER].radius);
            this._showFloatingScore(mx, my, FRUIT_TIERS[MAX_TIER].points);
            this._shakeCamera();
            SoundManager.play('maxMerge');

            // HOST sends destroy to GUEST
            NetworkManager.sendDestroy({
                uidA: fruitA.uid,
                uidB: fruitB.uid,
                x: mx,
                y: my,
                score: this.mechanics.score,
            });

            setTimeout(() => {
                this.mergeInProgress.delete(bodyA.id);
                this.mergeInProgress.delete(bodyB.id);
            }, 0);
            return;
        }

        const resultUid = 'm_' + this._nextMergeUid++;
        this._executeMerge(fruitA, fruitB, bodyA.id, bodyB.id, fruitA.tier + 1, resultUid);
    }

    _executeMerge(fruitA, fruitB, idA, idB, resultTier, resultUid) {
        this.mergeInProgress.add(idA);
        this.mergeInProgress.add(idB);

        const mx = (fruitA.body.x + fruitB.body.x) / 2;
        const my = (fruitA.body.y + fruitB.body.y) / 2;

        // Remove from fruitMap before destroying
        this.fruitMap.delete(fruitA.uid);
        this.fruitMap.delete(fruitB.uid);

        this.fruits = this.fruits.filter(f => f !== fruitA && f !== fruitB);
        fruitA.destroy();
        fruitB.destroy();

        const newFruit = new Fruit(this, mx, my, resultTier);
        newFruit.uid = resultUid;
        newFruit.body.setVelocity(0, -2);
        this.fruits.push(newFruit);
        this.fruitMap.set(resultUid, newFruit);

        this.mechanics.addScore(resultTier);

        // HOST sends merge to GUEST
        NetworkManager.sendMerge({
            uidA: fruitA.uid,
            uidB: fruitB.uid,
            resultUid,
            resultTier,
            x: mx,
            y: my,
            score: this.mechanics.score,
        });

        // Merge visual effects
        this._emitMergeParticles(mx, my, FRUIT_TIERS[resultTier].color, FRUIT_TIERS[resultTier].radius);
        this._showFloatingScore(mx, my, FRUIT_TIERS[resultTier].points);
        this._shakeCamera();
        SoundManager.play('merge');

        EventBus.emit(Events.FRUIT_MERGED, {
            fromTier: fruitA.tier,
            toTier: resultTier,
            x: mx,
            y: my,
        });

        setTimeout(() => {
            this.mergeInProgress.delete(idA);
            this.mergeInProgress.delete(idB);
        }, 0);
    }

    _spawnFruit(playerId, tier, x, uid) {
        const dropData = this.mechanics.applyDrop(playerId, tier, x);
        const fruit = new Fruit(this, dropData.x, dropData.y, dropData.tier, playerId);
        fruit.uid = uid;
        this.fruits.push(fruit);
        if (uid) {
            this.fruitMap.set(uid, fruit);
        }
        EventBus.emit(Events.FRUIT_DROPPED, dropData);

        // Drop sound
        SoundManager.play('drop');

        // Drop trail effect: brief falling line from spawn point
        this._showDropTrail(dropData.x, dropData.y, FRUIT_TIERS[tier].color);
    }

    _checkGameOver(time) {
        // Only HOST checks game over
        if (!this.isHost) return;

        if (time - this.lastGameOverCheck < 500) return;
        this.lastGameOverCheck = time;
        if (this.mechanics.isGameOver) return;

        const now = Date.now();
        const GRACE_MS = 2000;
        const SETTLE_SPEED = 0.5;

        for (const fruit of this.fruits) {
            if (!fruit.body || !fruit.body.body) continue;
            if (now - fruit.spawnTime < GRACE_MS) continue;

            const vel = fruit.body.body.velocity;
            const speed = Math.sqrt(vel.x * vel.x + vel.y * vel.y);
            if (speed > SETTLE_SPEED) continue;

            const topY = fruit.body.y - fruit.config.radius;
            if (topY < PLAY_AREA_TOP) {
                this.mechanics.isGameOver = true;
                NetworkManager.sendGameOver(this.mechanics.score);
                EventBus.emit(Events.GAME_OVER, { finalScore: this.mechanics.score });
                return;
            }
        }
    }

    // ---- HOST: World State Broadcasting ----

    _sendWorldStateIfNeeded(delta) {
        this._worldStateTimer += delta;
        if (this._worldStateTimer < 200) return; // every 200ms (was 100ms)
        this._worldStateTimer = 0;

        const bodies = [];
        for (const [uid, fruit] of this.fruitMap) {
            if (!fruit.body || !fruit.body.body) continue;
            // Use shorter keys and round values to reduce payload
            bodies.push({
                u: uid,
                t: fruit.tier,
                x: Math.round(fruit.body.x * 10) / 10,
                y: Math.round(fruit.body.y * 10) / 10,
                a: Math.round(fruit.body.angle * 100) / 100,
            });
        }
        if (bodies.length > 0) {
            NetworkManager.sendWorldState({ b: bodies });
        }
    }

    // ---- GUEST: Interpolation ----

    _applyInterpolations(delta) {
        for (const fruit of this.fruits) {
            fruit.applyInterpolation(delta);
        }
    }

    // ---- GUEST: Apply HOST-authoritative state ----

    _applyWorldState(data) {
        // Support both formats: {b:[...]} (optimized) and {bodies:[...]} (legacy)
        const bodies = data.b || data.bodies;
        if (!bodies || !Array.isArray(bodies)) return;

        const receivedUids = new Set();

        for (const b of bodies) {
            const uid = b.u || b.uid;
            receivedUids.add(uid);
            const fruit = this.fruitMap.get(uid);
            if (fruit) {
                fruit.setInterpolationTarget(b.x, b.y, b.a !== undefined ? b.a : b.angle);
            } else {
                // Fruit exists on HOST but not locally - create it (missed drop event)
                const tier = b.t;
                if (tier !== undefined) {
                    const newFruit = new Fruit(this, b.x, b.y, tier);
                    newFruit.uid = uid;
                    newFruit.makeStaticForSync(); // no local physics, HOST drives position
                    this.fruits.push(newFruit);
                    this.fruitMap.set(uid, newFruit);
                }
            }
        }

        // Remove fruits that HOST no longer has (batch to avoid repeated filter)
        const now = Date.now();
        const toRemove = new Set();
        for (const [uid, fruit] of this.fruitMap) {
            if (!receivedUids.has(uid)) {
                if (uid.startsWith('_p_')) continue;
                if (now - fruit.spawnTime < 500) continue;
                toRemove.add(fruit);
                fruit.destroy();
                this.fruitMap.delete(uid);
            }
        }
        if (toRemove.size > 0) {
            this.fruits = this.fruits.filter(f => !toRemove.has(f));
        }
    }

    _applyMerge(data) {
        const { uidA, uidB, resultUid, resultTier, x, y, score } = data;

        // Remove the two source fruits (single filter pass)
        const fruitA = this.fruitMap.get(uidA);
        const fruitB = this.fruitMap.get(uidB);

        if (fruitA || fruitB) {
            this.fruits = this.fruits.filter(f => f !== fruitA && f !== fruitB);
            if (fruitA) { fruitA.destroy(); this.fruitMap.delete(uidA); }
            if (fruitB) { fruitB.destroy(); this.fruitMap.delete(uidB); }
        }

        // Create the result fruit
        const newFruit = new Fruit(this, x, y, resultTier);
        newFruit.uid = resultUid;
        newFruit.body.setVelocity(0, -2);
        this.fruits.push(newFruit);
        this.fruitMap.set(resultUid, newFruit);

        // Update score from HOST
        this.mechanics.setScore(score);

        // Visual effects
        this._emitMergeParticles(x, y, FRUIT_TIERS[resultTier].color, FRUIT_TIERS[resultTier].radius);
        this._showFloatingScore(x, y, FRUIT_TIERS[resultTier].points);
        this._shakeCamera();
        SoundManager.play('merge');

        EventBus.emit(Events.FRUIT_MERGED, { fromTier: resultTier - 1, toTier: resultTier, x, y });
    }

    _applyDestroy(data) {
        const { uidA, uidB, x, y, score } = data;

        const fruitA = this.fruitMap.get(uidA);
        const fruitB = this.fruitMap.get(uidB);

        if (fruitA || fruitB) {
            this.fruits = this.fruits.filter(f => f !== fruitA && f !== fruitB);
            if (fruitA) { fruitA.destroy(); this.fruitMap.delete(uidA); }
            if (fruitB) { fruitB.destroy(); this.fruitMap.delete(uidB); }
        }

        // Update score from HOST
        this.mechanics.setScore(score);

        // Visual effects
        this._emitMergeParticles(x, y, FRUIT_TIERS[MAX_TIER].color, FRUIT_TIERS[MAX_TIER].radius);
        this._showFloatingScore(x, y, FRUIT_TIERS[MAX_TIER].points);
        this._shakeCamera();
        SoundManager.play('maxMerge');
    }

    // ---- Visual Effect Methods ----

    _emitMergeParticles(x, y, color, radius) {
        const particleCount = 8 + Math.floor(radius / 10);
        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 * i) / particleCount + (Math.random() * 0.5);
            const speed = 60 + Math.random() * 80;
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;
            const size = 3 + Math.random() * 4;

            const particle = this.add.rectangle(x, y, size, size, color, 1);
            particle.setDepth(5);

            this.tweens.add({
                targets: particle,
                x: x + vx,
                y: y + vy,
                alpha: 0,
                scaleX: 0.2,
                scaleY: 0.2,
                duration: 300 + Math.random() * 200,
                ease: 'Power2',
                onComplete: () => {
                    particle.destroy();
                },
            });
        }

        // Central flash
        const flash = this.add.circle(x, y, radius * 0.6, 0xffffff, 0.6);
        flash.setDepth(4);
        this.tweens.add({
            targets: flash,
            alpha: 0,
            scaleX: 2,
            scaleY: 2,
            duration: 200,
            ease: 'Power2',
            onComplete: () => {
                flash.destroy();
            },
        });
    }

    _showFloatingScore(x, y, points) {
        const scoreText = this.add.text(x, y, `+${points}`, {
            fontSize: '18px',
            fontFamily: '"Zen Maru Gothic", "Hiragino Sans", sans-serif',
            color: '#ffee66',
            stroke: '#000000',
            strokeThickness: 3,
            fontStyle: 'bold',
        }).setOrigin(0.5).setDepth(10);

        this.tweens.add({
            targets: scoreText,
            y: y - 50,
            alpha: 0,
            duration: 800,
            ease: 'Power2',
            onComplete: () => {
                scoreText.destroy();
            },
        });
    }

    _shakeCamera() {
        this.cameras.main.shake(50, 0.005);
        // Haptic feedback on mobile
        if (navigator.vibrate) navigator.vibrate(30);
    }

    _showDropTrail(x, startY, color) {
        const trailLength = 40;
        const trail = this.add.graphics();
        trail.setDepth(0);

        // Draw a fading vertical line above the spawn point
        const steps = 8;
        for (let i = 0; i < steps; i++) {
            const alpha = 0.3 * (1 - i / steps);
            const segY = startY - (trailLength * i / steps);
            const segH = trailLength / steps;
            trail.fillStyle(color, alpha);
            trail.fillRect(x - 2, segY - segH, 4, segH);
        }

        // Fade out the trail
        this.tweens.add({
            targets: trail,
            alpha: 0,
            duration: 300,
            ease: 'Power2',
            onComplete: () => {
                trail.destroy();
            },
        });
    }

    // ---- Network Listeners ----

    _setupNetworkListeners() {
        // Fruit dropped by any player (including self)
        EventBus.on(Events.NET_DROP, ({ playerId, tier, x, uid }) => {
            if (playerId === this.localPlayerId && this._pendingDrop) {
                // Server confirmed our predicted drop - update uid
                const predicted = this.fruitMap.get(this._pendingDrop);
                if (predicted) {
                    this.fruitMap.delete(this._pendingDrop);
                    predicted.uid = uid;
                    this.fruitMap.set(uid, predicted);
                } else {
                    // Predicted fruit was lost (e.g. world state cleanup) - respawn
                    this._spawnFruit(playerId, tier, x, uid);
                }
                this._pendingDrop = null;
                if (this._pendingDropTimeout) {
                    this._pendingDropTimeout.remove();
                    this._pendingDropTimeout = null;
                }
            } else if (playerId !== this.localPlayerId) {
                // Other player's drop - spawn normally
                this._spawnFruit(playerId, tier, x, uid);
            }
        });

        // Auto-drop (timer expired)
        EventBus.on(Events.NET_AUTO_DROP, ({ playerId, tier, x, uid }) => {
            // If local player was auto-dropped while having a pending prediction, clean up
            if (playerId === this.localPlayerId && this._pendingDrop) {
                const predicted = this.fruitMap.get(this._pendingDrop);
                if (predicted) {
                    this.fruits = this.fruits.filter(f => f !== predicted);
                    predicted.destroy();
                    this.fruitMap.delete(this._pendingDrop);
                }
                this._pendingDrop = null;
                if (this._pendingDropTimeout) {
                    this._pendingDropTimeout.remove();
                    this._pendingDropTimeout = null;
                }
            }
            this._spawnFruit(playerId, tier, x, uid);
        });

        // New fruit assigned after drop
        EventBus.on(Events.NET_NEW_FRUIT, ({ playerId, tier, nextTier }) => {
            this.mechanics.assignFruit(playerId, tier, nextTier);
            EventBus.emit(Events.NEXT_FRUIT_CHOSEN, { playerId, tier, nextTier });
        });

        // Remote cursor
        EventBus.on(Events.NET_CURSOR, ({ playerId, x }) => {
            this.remoteCursor.clear();
            if (this.mechanics.isGameOver) return;
            const color = PLAYER_COLORS[playerId] || 0x999999;
            this.remoteCursor.lineStyle(2, color, 0.4);
            this.remoteCursor.lineBetween(x, PLAY_AREA_TOP - 50, x, PLAY_AREA_TOP);
        });

        // Game over from server
        EventBus.on(Events.NET_GAME_OVER, ({ score }) => {
            this.mechanics.isGameOver = true;
            EventBus.emit(Events.GAME_OVER, { finalScore: score });
        });

        // Restart
        EventBus.on(Events.NET_RESTART, ({ players }) => {
            for (const fruit of this.fruits) {
                fruit.destroy();
            }
            this.fruits = [];
            this.fruitMap.clear();
            this.mergeInProgress.clear();
            this.remoteCursor.clear();
            this._nextMergeUid = 0;
            this._worldStateTimer = 0;
            this.mechanics.reset(players);

            for (const p of players) {
                EventBus.emit(Events.NEXT_FRUIT_CHOSEN, {
                    playerId: p.id,
                    tier: p.tier,
                    nextTier: p.nextTier,
                });
            }
            EventBus.emit(Events.SCORE_CHANGED, { score: 0, delta: 0 });
        });

        // Player left
        EventBus.on(Events.NET_PLAYER_LEFT, () => {
            this.mechanics.isGameOver = true;
            EventBus.emit(Events.GAME_OVER, { finalScore: this.mechanics.score, playerLeft: true });
        });

        // World state from HOST (GUEST only)
        EventBus.on(Events.NET_WORLD_STATE, (data) => {
            if (this.isHost) return; // HOST ignores
            this._applyWorldState(data);
        });

        // Merge from HOST (GUEST only)
        EventBus.on(Events.NET_MERGE, (data) => {
            if (this.isHost) return;
            this._applyMerge(data);
        });

        // Destroy from HOST (GUEST only)
        EventBus.on(Events.NET_DESTROY, (data) => {
            if (this.isHost) return;
            this._applyDestroy(data);
        });
    }
}
