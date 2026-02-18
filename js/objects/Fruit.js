import { FRUIT_TIERS } from '../mechanics/FruitConfig.js';

const PLAYER_TINTS = [0xffeeee, 0xeeeeff]; // P1: subtle warm, P2: subtle cool

export class Fruit {
    constructor(scene, x, y, tier, playerId) {
        this.scene = scene;
        this.tier = tier;
        this.playerId = playerId;
        this.config = FRUIT_TIERS[tier];
        this.uid = null; // assigned externally after construction
        this._interpTarget = null;
        this._isStaticSync = false;

        // Shadow ellipse underneath the fruit
        this.shadow = scene.add.ellipse(x, y + this.config.radius * 0.6, this.config.radius * 1.4, this.config.radius * 0.4, 0x000000, 0.2);
        this.shadow.setDepth(0);

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

        // Tint for player distinction (subtle tints)
        if (playerId !== undefined && playerId !== null) {
            this.body.setTint(PLAYER_TINTS[playerId] || 0xffffff);
        }

        // Bounce-in animation: fade in + slight scale pop
        this.body.setAlpha(0);
        scene.tweens.add({
            targets: this.body,
            alpha: 1,
            duration: 150,
            ease: 'Power2',
        });

        this.spawnTime = Date.now();
    }

    // Switch to static sensor so local physics doesn't fight HOST interpolation
    makeStaticForSync() {
        if (!this._isStaticSync && this.body && this.body.body) {
            this.body.setStatic(true);
            // Sensor = no physical collision response, prevents weird bouncing
            this.body.body.isSensor = true;
            this._isStaticSync = true;
        }
    }

    setInterpolationTarget(x, y, angle) {
        if (!isFinite(x) || !isFinite(y) || !isFinite(angle)) return;

        if (Date.now() - this.spawnTime > 800) {
            this.makeStaticForSync();
        }

        // Store previous position for smooth interpolation between targets
        this._interpPrev = this._interpTarget
            ? { x: this._interpTarget.x, y: this._interpTarget.y, angle: this._interpTarget.angle }
            : { x, y, angle };
        this._interpTarget = { x, y, angle };
        this._interpTime = 0;
    }

    applyInterpolation(delta) {
        if (!this._interpTarget || !this.body || !this.body.body) return;

        // During grace period, let physics run naturally (fruit falls with gravity)
        if (!this._isStaticSync) {
            if (Date.now() - this.spawnTime > 800) {
                this.makeStaticForSync();
            } else {
                return;
            }
        }

        // Smoothly interpolate between previous and current target over 200ms
        this._interpTime = (this._interpTime || 0) + delta;
        const t = Math.min(1, this._interpTime / 200);

        const prev = this._interpPrev || this._interpTarget;
        const nx = prev.x + (this._interpTarget.x - prev.x) * t;
        const ny = prev.y + (this._interpTarget.y - prev.y) * t;
        const na = prev.angle + (this._interpTarget.angle - prev.angle) * t;

        if (isFinite(nx) && isFinite(ny)) {
            this.body.setPosition(nx, ny);
        }
        if (isFinite(na)) {
            this.body.setAngle(na);
        }
    }

    updateShadow() {
        if (this.body && this.body.body && this.shadow) {
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
