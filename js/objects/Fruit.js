import { FRUIT_TIERS } from '../mechanics/FruitConfig.js';

const PLAYER_TINTS = [0xffeeee, 0xeeeeff]; // P1: subtle warm, P2: subtle cool

export class Fruit {
    /**
     * @param {Phaser.Scene} scene
     * @param {number} x
     * @param {number} y
     * @param {number} tier
     * @param {number} [playerId]
     * @param {boolean} [visualOnly=false] - true for GUEST: no physics body, just a sprite
     */
    constructor(scene, x, y, tier, playerId, visualOnly = false) {
        this.scene = scene;
        this.tier = tier;
        this.playerId = playerId;
        this.config = FRUIT_TIERS[tier];
        this.uid = null; // assigned externally after construction
        this.visualOnly = visualOnly;

        // Double-buffer snapshot interpolation (GUEST only)
        this._snapPrev = null;  // {x, y, angle}
        this._snapCurr = null;  // {x, y, angle}
        this._snapElapsed = 0;

        // Shadow ellipse underneath the fruit
        this.shadow = scene.add.ellipse(x, y + this.config.radius * 0.6, this.config.radius * 1.4, this.config.radius * 0.4, 0x000000, 0.2);
        this.shadow.setDepth(0);

        if (visualOnly) {
            // GUEST: plain image sprite, no physics
            this.body = scene.add.image(x, y, `fruit_${tier}`);
            this.body.setDisplaySize(this.config.radius * 2, this.config.radius * 2);
            this.body.setDepth(1);
        } else {
            // HOST: full Matter.js physics body
            this.body = scene.matter.add.image(x, y, `fruit_${tier}`, null, {
                shape: { type: 'circle', radius: this.config.radius },
                restitution: 0.2,
                friction: 0.5,
                frictionAir: 0.01,
                density: 0.001 * (tier + 1),
                label: `fruit_${tier}`,
            });
            this.body.setDisplaySize(this.config.radius * 2, this.config.radius * 2);
            this.body.setData('fruitInstance', this);
            this.body.setDepth(1);
        }

        // Tint for player distinction (subtle tints)
        if (playerId !== undefined && playerId !== null) {
            this.body.setTint(PLAYER_TINTS[playerId] || 0xffffff);
        }

        // Bounce-in animation: fade in
        this.body.setAlpha(0);
        scene.tweens.add({
            targets: this.body,
            alpha: 1,
            duration: 150,
            ease: 'Power2',
        });

        this.spawnTime = Date.now();
    }

    /**
     * GUEST: receive a new snapshot from HOST.
     * Shifts current → prev, stores new as current, resets elapsed timer.
     */
    receiveSnapshot(x, y, angle) {
        if (!isFinite(x) || !isFinite(y) || !isFinite(angle)) return;

        this._snapPrev = this._snapCurr
            ? { x: this._snapCurr.x, y: this._snapCurr.y, angle: this._snapCurr.angle }
            : { x, y, angle };
        this._snapCurr = { x, y, angle };
        this._snapElapsed = 0;
    }

    /**
     * GUEST: interpolate between prev and curr snapshot.
     * @param {number} snapshotInterval - expected ms between snapshots (e.g. 33)
     */
    interpolate(snapshotInterval) {
        if (!this._snapCurr || !this.body) return;

        this._snapElapsed += this.scene.game.loop.delta;
        const t = Math.min(1, this._snapElapsed / snapshotInterval);

        const prev = this._snapPrev || this._snapCurr;

        const nx = prev.x + (this._snapCurr.x - prev.x) * t;
        const ny = prev.y + (this._snapCurr.y - prev.y) * t;

        // Angle wraparound: pick shortest path
        let da = this._snapCurr.angle - prev.angle;
        if (da > Math.PI) da -= Math.PI * 2;
        if (da < -Math.PI) da += Math.PI * 2;
        const na = prev.angle + da * t;

        if (this.visualOnly) {
            // Plain image: set position and rotation directly
            this.body.setPosition(nx, ny);
            this.body.setRotation(na);
        } else {
            // Physics body (shouldn't normally reach here, but safety)
            this.body.setPosition(nx, ny);
            this.body.setAngle(na);
        }
    }

    updateShadow() {
        if (this.body && this.shadow) {
            this.shadow.setPosition(this.body.x, this.body.y + this.config.radius * 0.6);
        }
    }

    destroy() {
        if (this.shadow) {
            this.shadow.destroy();
            this.shadow = null;
        }
        if (this.body) {
            this.body.destroy();
            this.body = null;
        }
    }
}
