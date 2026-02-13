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

    setInterpolationTarget(x, y, angle) {
        // Guard against NaN/Infinity
        if (!isFinite(x) || !isFinite(y) || !isFinite(angle)) return;
        this._interpTarget = { x, y, angle };
    }

    applyInterpolation(delta) {
        if (!this._interpTarget || !this.body || !this.body.body) return;
        const t = this._interpTarget;
        // Lerp factor: smoothly reach target in ~100ms
        // 10x per second means at 60fps (~16.67ms per frame), factor = 0.167
        const lerpSpeed = Math.min(1, (delta / 1000) * 10);
        const bx = this.body.x;
        const by = this.body.y;
        const nx = bx + (t.x - bx) * lerpSpeed;
        const ny = by + (t.y - by) * lerpSpeed;
        // Guard against NaN from the lerp calculation
        if (!isFinite(nx) || !isFinite(ny)) return;
        this.body.setPosition(nx, ny);
        const currentAngle = this.body.angle;
        const newAngle = currentAngle + (t.angle - currentAngle) * lerpSpeed;
        if (isFinite(newAngle)) {
            this.body.setAngle(newAngle);
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
