import { FRUIT_TIERS, GAME_WIDTH, GAME_HEIGHT, PLAY_AREA_TOP } from '../mechanics/FruitConfig.js';
import { EventBus, Events } from '../mechanics/EventBus.js';
import { NetworkManager } from '../mechanics/NetworkManager.js';
import { SoundManager } from '../mechanics/SoundManager.js';

// Anime color palette - light
const COLORS = {
    darkIndigo: 0x584898,
    midPurple: 0x7858b8,
    neonPink: 0xff4d94,
    neonCyan: 0x3dffd4,
    softPink: 0xff70b0,
    softPurple: 0xcc7aff,
    darkOverlay: 0x08030f,
    skinLight: 0xffe4cc,
    skinShadow: 0xeeccaa,
    textPink: '#ff4d94',
    textCyan: '#3dffd4',
    textWhite: '#ffffff',
    textPurple: '#cc7aff',
    textYellow: '#ffdd33',
    textDimPurple: '#9966cc',
};

const PLAYER_HAIR_COLORS = [0xff4d94, 0x3dddcc]; // P1: pink hair, P2: cyan hair
const PLAYER_ACCENT_COLORS = [0xff4d94, 0x3dffd4]; // P1: pink, P2: cyan
const PLAYER_NAMES = ['P1', 'P2'];

export class UIScene extends Phaser.Scene {
    constructor() {
        super({ key: 'UIScene' });
    }

    create() {
        this.cameras.main.setBackgroundColor('rgba(0,0,0,0)');
        this.localPlayerId = this.registry.get('localPlayerId');
        this._isGameOver = false;
        this._timerWarningPlayed = {};

        // ===== Top bar background (68px height, gradient) =====
        const topBarG = this.add.graphics();
        const gradientSteps = 8;
        for (let i = 0; i < gradientSteps; i++) {
            const yStart = (68 / gradientSteps) * i;
            const h = 68 / gradientSteps;
            const alpha = 0.80 - (0.55 * i / (gradientSteps - 1));
            topBarG.fillStyle(COLORS.darkIndigo, alpha);
            topBarG.fillRect(0, yStart, GAME_WIDTH, h);
        }
        // Neon pink line at y=66
        topBarG.fillStyle(COLORS.neonPink, 0.4);
        topBarG.fillRect(0, 66, GAME_WIDTH, 2);

        // Subtle separator dots between HUD and play area
        for (let x = 10; x < GAME_WIDTH; x += 12) {
            topBarG.fillStyle(COLORS.neonPink, 0.15);
            topBarG.fillRect(x, 70, 4, 1);
        }

        // ===== Score display (center, y=34) =====
        this.scoreText = this.add.text(GAME_WIDTH / 2, 34, 'Score: 0', {
            fontSize: '24px',
            fontFamily: '"Zen Maru Gothic", "Hiragino Sans", sans-serif',
            color: COLORS.textPink,
            fontStyle: 'bold',
            stroke: '#4838a0',
            strokeThickness: 2,
        }).setOrigin(0.5);

        // ===== Player panels (single row) =====
        this.playerPanels = [];
        this._createPlayerPanel(0); // P1 left side
        this._createPlayerPanel(1); // P2 right side

        // ===== Drop guide line (local player) =====
        this.guideLine = this.add.graphics();

        // ===== Current fruit preview (follows cursor, local player only) =====
        this._currentTier = null;
        this._previewSprite = null;
        this._previewLocked = false;
        this._previewY = Math.round((68 + PLAY_AREA_TOP) / 2);

        this._setupListeners();
    }

    update() {
        const pointer = this.input.activePointer;
        if (!pointer || this._isGameOver) return;

        // Update guide line
        this.guideLine.clear();
        if (!this._previewLocked) {
            const localColor = PLAYER_ACCENT_COLORS[this.localPlayerId];
            this.guideLine.lineStyle(2, localColor, 0.35);
            this.guideLine.lineBetween(pointer.x, PLAY_AREA_TOP, pointer.x, GAME_HEIGHT);
            this.guideLine.fillStyle(localColor, 0.35);
            this.guideLine.fillTriangle(
                pointer.x - 4, PLAY_AREA_TOP,
                pointer.x + 4, PLAY_AREA_TOP,
                pointer.x, PLAY_AREA_TOP + 5
            );
        }

        // Update preview sprite position
        if (this._previewSprite && !this._previewLocked) {
            const cfg = FRUIT_TIERS[this._currentTier];
            if (cfg) {
                const clampedX = Phaser.Math.Clamp(pointer.x, cfg.radius, GAME_WIDTH - cfg.radius);
                this._previewSprite.setPosition(clampedX, this._previewY);
            }
        }
    }

    // ===== Player panel (single-row compact layout) =====
    _createPlayerPanel(playerId) {
        const isLeft = playerId === 0;
        const isLocal = playerId === this.localPlayerId;
        const hairColor = PLAYER_HAIR_COLORS[playerId];
        const accentColor = PLAYER_ACCENT_COLORS[playerId];
        const rowY = 34;

        if (isLeft) {
            // --- LEFT SIDE (P1) ---
            const avatarX = 26;
            const avatarG = this.add.graphics();
            this._drawAnimeGirl(avatarG, avatarX, rowY, 14, hairColor, accentColor);

            // Player name
            this.add.text(46, 16, PLAYER_NAMES[playerId], {
                fontSize: '13px',
                fontFamily: '"Zen Maru Gothic", "Hiragino Sans", sans-serif',
                color: COLORS.textWhite,
                fontStyle: 'bold',
                stroke: '#4838a0',
                strokeThickness: 2,
            }).setOrigin(0, 0);

            if (isLocal) {
                this.add.text(46, 34, '(Sen)', {
                    fontSize: '10px',
                    fontFamily: '"Zen Maru Gothic", "Hiragino Sans", sans-serif',
                    color: COLORS.textPink,
                    fontStyle: 'italic',
                }).setOrigin(0, 0);
            }

            // Timer circle
            const timerX = 92;
            const timerY = rowY;
            const timerBgG = this.add.graphics();
            timerBgG.lineStyle(3, COLORS.midPurple, 0.8);
            timerBgG.beginPath();
            timerBgG.arc(timerX, timerY, 15, 0, Math.PI * 2, false);
            timerBgG.strokePath();
            timerBgG.fillStyle(COLORS.darkIndigo, 0.6);
            timerBgG.fillCircle(timerX, timerY, 13);

            const timerArc = this.add.graphics();

            const timerText = this.add.text(timerX, timerY, '5', {
                fontSize: '16px',
                fontFamily: '"Zen Maru Gothic", "Hiragino Sans", sans-serif',
                color: COLORS.textPink,
                fontStyle: 'bold',
            }).setOrigin(0.5);

            // Next gem preview
            const previewX = 130;
            const previewY = rowY;
            const previewFrameG = this.add.graphics();
            this._drawPreviewFrame(previewFrameG, previewX, previewY, 14);

            const previewCircle = this.add.circle(previewX, previewY, 10, 0x4a4a5a);
            const previewLabel = this.add.text(previewX, previewY + 20, '', {
                fontSize: '8px',
                fontFamily: '"Zen Maru Gothic", "Hiragino Sans", sans-serif',
                color: '#fff',
                stroke: '#000',
                strokeThickness: 1,
            }).setOrigin(0.5);

            this.playerPanels[playerId] = {
                avatarG, timerText, timerArc, timerX, timerY,
                previewCircle, previewLabel,
            };
        } else {
            // --- RIGHT SIDE (P2) - mirror of left ---
            const previewX = 470;
            const previewY = rowY;
            const previewFrameG = this.add.graphics();
            this._drawPreviewFrame(previewFrameG, previewX, previewY, 14);

            const previewCircle = this.add.circle(previewX, previewY, 10, 0x4a4a5a);
            const previewLabel = this.add.text(previewX, previewY + 20, '', {
                fontSize: '8px',
                fontFamily: '"Zen Maru Gothic", "Hiragino Sans", sans-serif',
                color: '#fff',
                stroke: '#000',
                strokeThickness: 1,
            }).setOrigin(0.5);

            // Timer circle
            const timerX = 508;
            const timerY = rowY;
            const timerBgG = this.add.graphics();
            timerBgG.lineStyle(3, COLORS.midPurple, 0.8);
            timerBgG.beginPath();
            timerBgG.arc(timerX, timerY, 15, 0, Math.PI * 2, false);
            timerBgG.strokePath();
            timerBgG.fillStyle(COLORS.darkIndigo, 0.6);
            timerBgG.fillCircle(timerX, timerY, 13);

            const timerArc = this.add.graphics();

            const timerText = this.add.text(timerX, timerY, '5', {
                fontSize: '16px',
                fontFamily: '"Zen Maru Gothic", "Hiragino Sans", sans-serif',
                color: COLORS.textPink,
                fontStyle: 'bold',
            }).setOrigin(0.5);

            // Player name
            this.add.text(554, 16, PLAYER_NAMES[playerId], {
                fontSize: '13px',
                fontFamily: '"Zen Maru Gothic", "Hiragino Sans", sans-serif',
                color: COLORS.textWhite,
                fontStyle: 'bold',
                stroke: '#4838a0',
                strokeThickness: 2,
            }).setOrigin(1, 0);

            if (isLocal) {
                this.add.text(554, 34, '(Sen)', {
                    fontSize: '10px',
                    fontFamily: '"Zen Maru Gothic", "Hiragino Sans", sans-serif',
                    color: COLORS.textPink,
                    fontStyle: 'italic',
                }).setOrigin(1, 0);
            }

            const avatarX = 576;
            const avatarG = this.add.graphics();
            this._drawAnimeGirl(avatarG, avatarX, rowY, 14, hairColor, accentColor);

            this.playerPanels[playerId] = {
                avatarG, timerText, timerArc, timerX, timerY,
                previewCircle, previewLabel,
            };
        }
    }

    // ===== Preview frame =====
    _drawPreviewFrame(g, x, y, size) {
        const s = size + 3;
        g.fillStyle(COLORS.midPurple, 0.7);
        g.fillRoundedRect(x - s, y - s, s * 2, s * 2, 5);
        g.fillStyle(COLORS.darkIndigo, 0.5);
        g.fillRoundedRect(x - size, y - size, size * 2, size * 2, 3);
        g.lineStyle(1, COLORS.softPurple, 0.5);
        g.strokeRoundedRect(x - s, y - s, s * 2, s * 2, 5);
    }

    // ===== Chibi Anime Girl Avatar =====
    _drawAnimeGirl(g, x, y, size, hairColor, accentColor) {
        const s = size; // base size

        // --- Hair back (behind face) ---
        g.fillStyle(hairColor, 0.9);
        // Main hair volume behind head
        g.fillCircle(x, y - s * 0.1, s + 2);
        // Side hair strands (long hair)
        g.fillRoundedRect(x - s - 3, y - s * 0.3, 7, s * 1.4, 3);
        g.fillRoundedRect(x + s - 4, y - s * 0.3, 7, s * 1.4, 3);
        // Hair bottom (longer in back)
        g.fillEllipse(x, y + s * 0.6, s * 1.6, s * 0.7);

        // --- Face (oval, skin colored) ---
        g.fillStyle(COLORS.skinLight, 1);
        g.fillCircle(x, y, s * 0.82);

        // Slight face shadow at bottom
        g.fillStyle(COLORS.skinShadow, 0.3);
        g.beginPath();
        g.arc(x, y + s * 0.1, s * 0.78, 0.3, Math.PI - 0.3, false);
        g.fillPath();

        // --- Hair bangs (fringe over forehead) ---
        g.fillStyle(hairColor, 1);
        // Center bangs
        g.fillEllipse(x, y - s * 0.65, s * 1.1, s * 0.55);
        // Side bangs
        g.fillEllipse(x - s * 0.5, y - s * 0.4, s * 0.45, s * 0.5);
        g.fillEllipse(x + s * 0.5, y - s * 0.4, s * 0.45, s * 0.5);
        // Top hair volume
        g.fillCircle(x, y - s * 0.7, s * 0.5);

        // --- Hair accessory ---
        // P1: bow, P2: star
        g.fillStyle(accentColor, 0.9);
        if (hairColor === PLAYER_HAIR_COLORS[0]) {
            // Ribbon bow on the right side
            const bx = x + s * 0.6;
            const by = y - s * 0.65;
            g.fillTriangle(bx, by, bx + s * 0.35, by - s * 0.2, bx + s * 0.1, by + s * 0.2);
            g.fillTriangle(bx, by, bx - s * 0.25, by - s * 0.25, bx - s * 0.05, by + s * 0.15);
            g.fillStyle(0xffffff, 0.5);
            g.fillCircle(bx, by, s * 0.08);
        } else {
            // Star clip on the left side
            const sx = x - s * 0.6;
            const sy = y - s * 0.65;
            const ss = s * 0.2;
            g.fillTriangle(sx, sy - ss, sx - ss * 0.3, sy, sx + ss * 0.3, sy);
            g.fillTriangle(sx, sy + ss, sx - ss * 0.3, sy, sx + ss * 0.3, sy);
            g.fillTriangle(sx - ss, sy, sx, sy - ss * 0.3, sx, sy + ss * 0.3);
            g.fillTriangle(sx + ss, sy, sx, sy - ss * 0.3, sx, sy + ss * 0.3);
            g.fillStyle(0xffffff, 0.6);
            g.fillCircle(sx, sy, ss * 0.2);
        }

        // --- Eyes (big anime eyes) ---
        const eyeY = y - s * 0.05;
        const eyeSpacing = s * 0.28;

        // Left eye
        this._drawAnimeEye(g, x - eyeSpacing, eyeY, s * 0.22, hairColor);
        // Right eye
        this._drawAnimeEye(g, x + eyeSpacing, eyeY, s * 0.22, hairColor);

        // --- Blush marks ---
        g.fillStyle(0xff8899, 0.3);
        g.fillEllipse(x - s * 0.45, y + s * 0.15, s * 0.22, s * 0.12);
        g.fillEllipse(x + s * 0.45, y + s * 0.15, s * 0.22, s * 0.12);

        // --- Mouth (small cat-like :3) ---
        g.lineStyle(1, 0x885566, 0.7);
        g.beginPath();
        g.arc(x - s * 0.08, y + s * 0.25, s * 0.1, 0, Math.PI * 0.8, false);
        g.strokePath();
        g.beginPath();
        g.arc(x + s * 0.08, y + s * 0.25, s * 0.1, Math.PI * 0.2, Math.PI, false);
        g.strokePath();

        // --- Outer glow ---
        g.lineStyle(1.5, accentColor, 0.25);
        g.strokeCircle(x, y, s + 4);
    }

    // ===== Single anime eye =====
    _drawAnimeEye(g, x, y, radius, irisColor) {
        const r = radius;

        // Eye white
        g.fillStyle(0xffffff, 1);
        g.fillEllipse(x, y, r * 2, r * 2.2);

        // Iris (colored)
        g.fillStyle(irisColor, 0.8);
        g.fillCircle(x, y + r * 0.1, r * 0.7);

        // Pupil (dark)
        g.fillStyle(0x111122, 0.9);
        g.fillCircle(x, y + r * 0.15, r * 0.4);

        // Large highlight (top-left)
        g.fillStyle(0xffffff, 0.95);
        g.fillCircle(x - r * 0.25, y - r * 0.2, r * 0.25);

        // Small highlight (bottom-right)
        g.fillStyle(0xffffff, 0.7);
        g.fillCircle(x + r * 0.2, y + r * 0.25, r * 0.12);

        // Upper eyelid line
        g.lineStyle(1.5, 0x332244, 0.8);
        g.beginPath();
        g.arc(x, y - r * 0.1, r, Math.PI + 0.3, -0.3, false);
        g.strokePath();

        // Lower eyelash hint
        g.lineStyle(0.8, 0x553355, 0.4);
        g.beginPath();
        g.arc(x, y + r * 0.1, r, 0.3, Math.PI - 0.3, false);
        g.strokePath();
    }

    // ===== Fruit preview (cursor-following drop indicator) =====
    _updateFruitPreview(tier) {
        if (this._previewSprite) {
            this._previewSprite.destroy();
            this._previewSprite = null;
        }
        this._currentTier = tier;
        const cfg = FRUIT_TIERS[tier];
        if (!cfg) return;

        // Initialize at current pointer position (not center)
        const pointer = this.input.activePointer;
        const startX = (pointer && pointer.x > 0)
            ? Phaser.Math.Clamp(pointer.x, cfg.radius, GAME_WIDTH - cfg.radius)
            : GAME_WIDTH / 2;

        this._previewSprite = this.add.image(startX, this._previewY, `fruit_${tier}`);
        this._previewSprite.setDisplaySize(cfg.radius * 2, cfg.radius * 2);
        this._previewSprite.setAlpha(0.6);
        this._previewSprite.setDepth(20);

        // Brief lock so player sees the new gem appear
        this._previewLocked = true;
        this.guideLine.clear();
        this.time.delayedCall(150, () => { this._previewLocked = false; });
    }

    // ===== EventBus listeners =====
    _setupListeners() {
        EventBus.on(Events.SCORE_CHANGED, ({ score }) => {
            this.scoreText.setText(`Score: ${score}`);
        });

        EventBus.on(Events.NEXT_FRUIT_CHOSEN, ({ playerId, tier, nextTier }) => {
            const panel = this.playerPanels[playerId];
            if (!panel) return;

            const nextCfg = FRUIT_TIERS[nextTier];
            panel.previewCircle.setFillStyle(nextCfg.color);
            panel.previewCircle.setRadius(Math.min(nextCfg.radius * 0.35, 14));
            panel.previewLabel.setText(nextCfg.name);

            // Update cursor preview for local player
            if (playerId === this.localPlayerId) {
                this._updateFruitPreview(tier);
            }
        });

        EventBus.on(Events.NET_TIMER, ({ playerId, timeLeft }) => {
            const panel = this.playerPanels[playerId];
            if (!panel) return;

            panel.timerText.setText(String(timeLeft));

            if (timeLeft <= 2) {
                panel.timerText.setColor(COLORS.textPink);
                if (!this._timerWarningPlayed[playerId] || this._timerWarningPlayed[playerId] !== timeLeft) {
                    SoundManager.play('timerWarning');
                    this._timerWarningPlayed[playerId] = timeLeft;
                }
            } else if (timeLeft <= 4) {
                panel.timerText.setColor(COLORS.textYellow);
                this._timerWarningPlayed[playerId] = null;
            } else {
                panel.timerText.setColor(COLORS.textCyan);
                this._timerWarningPlayed[playerId] = null;
            }

            panel.timerArc.clear();
            const progress = timeLeft / 5;
            const startAngle = -Math.PI / 2;
            const endAngle = startAngle + (Math.PI * 2 * progress);

            let arcColor;
            if (timeLeft <= 2) {
                arcColor = COLORS.neonPink;
            } else if (timeLeft <= 4) {
                arcColor = 0xffee66;
            } else {
                arcColor = COLORS.neonCyan;
            }

            panel.timerArc.lineStyle(3, arcColor, 0.8);
            panel.timerArc.beginPath();
            panel.timerArc.arc(panel.timerX, panel.timerY, 15, startAngle, endAngle, false);
            panel.timerArc.strokePath();
        });

        EventBus.on(Events.GAME_OVER, ({ finalScore, playerLeft }) => {
            this._isGameOver = true;
            this.guideLine.clear();
            if (this._previewSprite) this._previewSprite.setVisible(false);
            SoundManager.play('gameOver');
            this._showGameOver(finalScore, playerLeft);
        });

        EventBus.on(Events.GAME_RESTART, () => {
            this._isGameOver = false;
            this._timerWarningPlayed = {};
            this._hideGameOver();
        });

        EventBus.on(Events.NET_RESTART, () => {
            this._isGameOver = false;
            this._timerWarningPlayed = {};
            this._hideGameOver();
        });
    }

    // ===== Game Over screen =====
    _showGameOver(finalScore, playerLeft) {
        this.overlay = this.add.rectangle(
            GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT,
            COLORS.darkOverlay, 0.75
        ).setInteractive();

        this.goDecoG = this.add.graphics();
        this.goDecoG.lineStyle(2, COLORS.neonPink, 0.4);
        this.goDecoG.lineBetween(GAME_WIDTH / 2 - 120, 240, GAME_WIDTH / 2 + 120, 240);
        this.goDecoG.lineBetween(GAME_WIDTH / 2 - 120, 470, GAME_WIDTH / 2 + 120, 470);

        this.goDecoG.fillStyle(COLORS.neonPink, 0.5);
        const scx = GAME_WIDTH / 2;
        this.goDecoG.fillTriangle(scx, 230, scx - 6, 240, scx + 6, 240);
        this.goDecoG.fillTriangle(scx, 250, scx - 6, 240, scx + 6, 240);
        this.goDecoG.fillTriangle(scx - 10, 240, scx, 236, scx, 244);
        this.goDecoG.fillTriangle(scx + 10, 240, scx, 236, scx, 244);

        const title = playerLeft ? 'PLAYER LEFT' : 'GAME OVER!';

        this.gameOverTextShadow = this.add.text(GAME_WIDTH / 2 + 2, 278, title, {
            fontSize: '38px',
            fontFamily: '"Zen Maru Gothic", "Hiragino Sans", sans-serif',
            color: '#ff4d94',
            fontStyle: 'bold',
        }).setOrigin(0.5).setAlpha(0.3);

        this.gameOverText = this.add.text(GAME_WIDTH / 2, 275, title, {
            fontSize: '38px',
            fontFamily: '"Zen Maru Gothic", "Hiragino Sans", sans-serif',
            color: COLORS.textPink,
            fontStyle: 'bold',
            stroke: '#4838a0',
            strokeThickness: 3,
            shadow: { offsetX: 0, offsetY: 0, color: '#ff4d94', blur: 10, fill: true },
        }).setOrigin(0.5);

        this.goPanelG = this.add.graphics();
        const pW = 240;
        const pH = 80;
        const pLeft = GAME_WIDTH / 2 - pW / 2;
        const pTop = 310;
        this.goPanelG.fillStyle(COLORS.midPurple, 0.3);
        this.goPanelG.fillRoundedRect(pLeft, pTop, pW, pH, 12);
        this.goPanelG.lineStyle(2, COLORS.neonPink, 0.4);
        this.goPanelG.strokeRoundedRect(pLeft, pTop, pW, pH, 12);
        this.goPanelG.lineStyle(1, COLORS.softPurple, 0.15);
        this.goPanelG.strokeRoundedRect(pLeft + 4, pTop + 4, pW - 8, pH - 8, 10);

        this.goScoreLabel = this.add.text(GAME_WIDTH / 2, pTop + 18, 'Total Score', {
            fontSize: '13px',
            fontFamily: '"Zen Maru Gothic", "Hiragino Sans", sans-serif',
            color: COLORS.textDimPurple,
            fontStyle: 'italic',
        }).setOrigin(0.5, 0);

        this.finalScoreText = this.add.text(GAME_WIDTH / 2, pTop + 42, String(finalScore), {
            fontSize: '32px',
            fontFamily: '"Zen Maru Gothic", "Hiragino Sans", sans-serif',
            color: COLORS.textCyan,
            fontStyle: 'bold',
            stroke: '#4838a0',
            strokeThickness: 2,
            shadow: { offsetX: 0, offsetY: 0, color: '#3dffd4', blur: 6, fill: true },
        }).setOrigin(0.5, 0);

        const restartLabel = playerLeft ? 'Return to Lobby' : 'Play Again';
        const btnY = 430;
        this.goButtonG = this.add.graphics();
        const btnW = 240;
        const btnH = 52;
        const btnLeft = GAME_WIDTH / 2 - btnW / 2;
        const btnTop = btnY - btnH / 2;

        this.goButtonG.fillStyle(COLORS.midPurple, 1);
        this.goButtonG.fillRoundedRect(btnLeft, btnTop, btnW, btnH, 12);
        this.goButtonG.fillStyle(COLORS.softPurple, 0.2);
        this.goButtonG.fillRoundedRect(btnLeft + 4, btnTop + 4, btnW - 8, btnH * 0.4, 8);
        this.goButtonG.lineStyle(2, COLORS.neonPink, 0.7);
        this.goButtonG.strokeRoundedRect(btnLeft, btnTop, btnW, btnH, 12);
        this.goButtonG.lineStyle(1, COLORS.neonPink, 0.15);
        this.goButtonG.strokeRoundedRect(btnLeft - 2, btnTop - 2, btnW + 4, btnH + 4, 14);

        this.restartText = this.add.text(GAME_WIDTH / 2, btnY - 1, restartLabel, {
            fontSize: '20px',
            fontFamily: '"Zen Maru Gothic", "Hiragino Sans", sans-serif',
            color: COLORS.textWhite,
            fontStyle: 'bold',
            stroke: '#6850a8',
            strokeThickness: 2,
        }).setOrigin(0.5);

        this.overlay.on('pointerdown', () => {
            SoundManager.play('buttonClick');
            if (playerLeft) {
                this.scene.stop('GameScene');
                this.scene.stop('UIScene');
                this.scene.start('LobbyScene');
            } else {
                NetworkManager.sendRestart();
            }
        });
    }

    _hideGameOver() {
        if (this.overlay) { this.overlay.destroy(); this.overlay = null; }
        if (this.gameOverText) { this.gameOverText.destroy(); this.gameOverText = null; }
        if (this.gameOverTextShadow) { this.gameOverTextShadow.destroy(); this.gameOverTextShadow = null; }
        if (this.finalScoreText) { this.finalScoreText.destroy(); this.finalScoreText = null; }
        if (this.restartText) { this.restartText.destroy(); this.restartText = null; }
        if (this.goDecoG) { this.goDecoG.destroy(); this.goDecoG = null; }
        if (this.goPanelG) { this.goPanelG.destroy(); this.goPanelG = null; }
        if (this.goScoreLabel) { this.goScoreLabel.destroy(); this.goScoreLabel = null; }
        if (this.goButtonG) { this.goButtonG.destroy(); this.goButtonG = null; }
    }
}
