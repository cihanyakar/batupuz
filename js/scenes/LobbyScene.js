import { GAME_WIDTH, GAME_HEIGHT } from '../mechanics/FruitConfig.js';
import { EventBus, Events } from '../mechanics/EventBus.js';
import { NetworkManager } from '../mechanics/NetworkManager.js';
import { SoundManager } from '../mechanics/SoundManager.js';

// Anime vibrant color palette
const COLORS = {
    darkIndigo: 0x12082a,
    midPurple: 0x3a1d6e,
    neonPink: 0xff4d94,
    neonCyan: 0x3dffd4,
    softPink: 0xff70b0,
    softPurple: 0xcc7aff,
    pastelPink: 0xffb0cc,
    pastelCyan: 0xb0ffe8,
    white: 0xffffff,
    textPink: '#ff4d94',
    textCyan: '#3dffd4',
    textWhite: '#ffffff',
    textPurple: '#cc7aff',
    textDimPurple: '#9966cc',
    textYellow: '#ffdd33',
};

export class LobbyScene extends Phaser.Scene {
    constructor() {
        super({ key: 'LobbyScene' });
        this._soundInitialized = false;
    }

    create() {
        const cx = GAME_WIDTH / 2;

        // Dark indigo background
        this.cameras.main.setBackgroundColor('#12082a');

        // Draw starry background pattern
        this._drawBackground();

        // Decorative top/bottom neon border lines
        this._drawNeonBorder(0, 0, GAME_WIDTH, 3);
        this._drawNeonBorder(0, GAME_HEIGHT - 3, GAME_WIDTH, 3);

        // ===== Sparkle decorations above title =====
        this._drawSparkles(cx, 35);

        // ===== TITLE =====
        // Title glow shadow (pink)
        this.add.text(cx + 2, 72, 'BATUPUZ', {
            fontSize: '56px',
            fontFamily: '"Zen Maru Gothic", "Hiragino Sans", sans-serif',
            color: '#ff4d94',
            fontStyle: 'bold',
        }).setOrigin(0.5).setAlpha(0.3);

        // Title main
        this.add.text(cx, 70, 'BATUPUZ', {
            fontSize: '56px',
            fontFamily: '"Zen Maru Gothic", "Hiragino Sans", sans-serif',
            color: COLORS.textPink,
            fontStyle: 'bold',
            stroke: '#3a1d6e',
            strokeThickness: 4,
            shadow: {
                offsetX: 0,
                offsetY: 0,
                color: '#ff4d94',
                blur: 12,
                fill: true,
            },
        }).setOrigin(0.5);

        // ===== Subtitle on glowing rounded rect =====
        this._drawGlowBanner(cx, 125, 320, 40);
        this.add.text(cx, 125, 'Co-op Gem Merging', {
            fontSize: '16px',
            fontFamily: '"Zen Maru Gothic", "Hiragino Sans", sans-serif',
            color: COLORS.textCyan,
            fontStyle: 'italic',
        }).setOrigin(0.5);

        // ===== Small star decorations =====
        this._drawStar(cx - 100, 170, 10, COLORS.neonPink);
        this._drawStar(cx + 100, 170, 10, COLORS.neonCyan);

        // ===== Status text =====
        this.statusText = this.add.text(cx, 210, '', {
            fontSize: '17px',
            fontFamily: '"Zen Maru Gothic", "Hiragino Sans", sans-serif',
            color: COLORS.textPurple,
        }).setOrigin(0.5);

        // ===== Room code display (hidden initially) =====
        this.codeLabel = this.add.text(cx, 248, 'Room Code:', {
            fontSize: '16px',
            fontFamily: '"Zen Maru Gothic", "Hiragino Sans", sans-serif',
            color: COLORS.textDimPurple,
            fontStyle: 'italic',
        }).setOrigin(0.5).setVisible(false);

        // Rounded panel background for code
        this.codeBg = this.add.graphics().setVisible(false);
        this._drawAnimePanel(this.codeBg, cx - 110, 268, 220, 60, 12);

        this.codeText = this.add.text(cx, 298, '', {
            fontSize: '52px',
            fontFamily: '"Zen Maru Gothic", "Hiragino Sans", sans-serif',
            color: COLORS.textCyan,
            fontStyle: 'bold',
            stroke: '#12082a',
            strokeThickness: 3,
            shadow: {
                offsetX: 0,
                offsetY: 0,
                color: '#3dffd4',
                blur: 8,
                fill: true,
            },
        }).setOrigin(0.5).setVisible(false);

        // ===== Copy link button (hidden initially) =====
        this.copyLinkBtn = this._makeAnimeButton(cx, 348, 'Copy Link', () => {
            this._initSound();
            SoundManager.play('buttonClick');
            this._copyRoomLink();
        });
        this.copyLinkBtn.bg.setVisible(false);
        this.copyLinkBtn.label.setVisible(false);
        this.copyLinkBtn.hitZone.setVisible(false).disableInteractive();

        this.copyFeedback = this.add.text(cx, 378, '', {
            fontSize: '12px',
            fontFamily: '"Zen Maru Gothic", "Hiragino Sans", sans-serif',
            color: COLORS.textCyan,
            fontStyle: 'italic',
        }).setOrigin(0.5).setVisible(false);

        // ===== Waiting text with animated dots =====
        this.waitingText = this.add.text(cx, 410, '', {
            fontSize: '18px',
            fontFamily: '"Zen Maru Gothic", "Hiragino Sans", sans-serif',
            color: COLORS.textPurple,
            fontStyle: 'italic',
        }).setOrigin(0.5);

        this._waitingDots = 0;
        this._waitingBaseText = '';

        // ===== Decorative divider with star =====
        this._drawDivider(cx, 440);

        // ===== Create Room button (anime rounded gradient) =====
        this.createBtn = this._makeAnimeButton(cx, 480, 'Create Room', () => {
            this._initSound();
            SoundManager.play('buttonClick');
            this._onCreateRoom();
        });

        // ===== Join section label =====
        this.joinLabel = this.add.text(cx, 535, '~ or enter code to join ~', {
            fontSize: '15px',
            fontFamily: '"Zen Maru Gothic", "Hiragino Sans", sans-serif',
            color: COLORS.textDimPurple,
            fontStyle: 'italic',
        }).setOrigin(0.5);

        // Tap hint for mobile
        this.tapHint = this.add.text(cx, 560, 'Tap boxes to type', {
            fontSize: '11px',
            fontFamily: '"Zen Maru Gothic", "Hiragino Sans", sans-serif',
            color: COLORS.textDimPurple,
            fontStyle: 'italic',
        }).setOrigin(0.5).setAlpha(0.6);

        // ===== Code input (4 rounded input boxes) =====
        this.inputCode = '';
        this.inputBoxes = [];
        for (let i = 0; i < 4; i++) {
            const bx = cx - 75 + i * 50;
            this._createAnimeInputBox(bx, 590, i);
        }

        // ===== Hidden HTML input for mobile keyboard =====
        this._hiddenInput = document.createElement('input');
        this._hiddenInput.type = 'text';
        this._hiddenInput.maxLength = 4;
        this._hiddenInput.autocapitalize = 'characters';
        this._hiddenInput.autocomplete = 'off';
        this._hiddenInput.autocorrect = 'off';
        this._hiddenInput.spellcheck = false;
        this._hiddenInput.inputMode = 'text';
        this._hiddenInput.style.cssText = `
            position: fixed;
            left: 50%;
            top: 70%;
            transform: translate(-50%, -50%);
            opacity: 0.01;
            width: 1px;
            height: 1px;
            border: none;
            outline: none;
            background: transparent;
            color: transparent;
            caret-color: transparent;
            z-index: 10;
            font-size: 16px;
        `;
        document.body.appendChild(this._hiddenInput);

        this._hiddenInput.addEventListener('input', () => {
            if (this._lobbyState !== 'joining' && this._lobbyState !== 'idle') return;
            this.inputCode = this._hiddenInput.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
            this._hiddenInput.value = this.inputCode;
            this._updateInputBoxes();
        });

        this._hiddenInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' && this.inputCode.length === 4) {
                this._initSound();
                SoundManager.play('buttonClick');
                this._onJoinRoom();
            }
        });

        // Tap on code input area focuses the hidden input (opens mobile keyboard)
        const inputHitZone = this.add.rectangle(cx, 590, 220, 60, 0x000000, 0)
            .setInteractive({ useHandCursor: true });
        inputHitZone.on('pointerdown', () => {
            this._hiddenInput.focus();
        });

        // ===== Join button (anime rounded gradient) =====
        this.joinBtn = this._makeAnimeButton(cx, 660, 'Join', () => {
            this._initSound();
            SoundManager.play('buttonClick');
            this._onJoinRoom();
        });

        // ===== Heart/star decoration at bottom =====
        this._drawHeart(cx, 720, 12);

        // ===== Keyboard input (desktop fallback) =====
        this.input.keyboard.on('keydown', (event) => {
            if (this._lobbyState === 'joining' || this._lobbyState === 'idle') {
                const key = event.key.toUpperCase();
                if (/^[A-Z]$/.test(key) && this.inputCode.length < 4) {
                    this.inputCode += key;
                    this._hiddenInput.value = this.inputCode;
                    this._updateInputBoxes();
                } else if (event.key === 'Backspace' && this.inputCode.length > 0) {
                    this.inputCode = this.inputCode.slice(0, -1);
                    this._hiddenInput.value = this.inputCode;
                    this._updateInputBoxes();
                } else if (event.key === 'Enter' && this.inputCode.length === 4) {
                    this._initSound();
                    SoundManager.play('buttonClick');
                    this._onJoinRoom();
                }
            }
        });

        this._lobbyState = 'idle'; // idle, connecting, created, joining, waiting

        // Listen for network events
        EventBus.on(Events.NET_JOINED, this._onJoined, this);
        EventBus.on(Events.NET_GAME_START, this._onGameStart, this);
        EventBus.on(Events.NET_ERROR, this._onError, this);

        // Start waiting dot animation timer
        this.time.addEvent({
            delay: 500,
            loop: true,
            callback: () => {
                if (this._waitingBaseText) {
                    this._waitingDots = (this._waitingDots + 1) % 4;
                    const dots = '.'.repeat(this._waitingDots);
                    this.waitingText.setText(this._waitingBaseText + dots);
                }
            },
        });

        // Handle ?room=XXXX URL parameter for direct join
        const urlParams = new URLSearchParams(window.location.search);
        const roomParam = urlParams.get('room');
        if (roomParam && roomParam.length === 4) {
            this.inputCode = roomParam.toUpperCase();
            this._updateInputBoxes();
            // Auto-join after a short delay
            this.time.delayedCall(300, () => {
                this._initSound();
                this._onJoinRoom();
            });
        }
    }

    // ===== Sound initialization on first user interaction =====
    _initSound() {
        if (!this._soundInitialized) {
            SoundManager.init();
            this._soundInitialized = true;
        }
    }

    // ===== Drawing helpers =====

    _drawBackground() {
        const g = this.add.graphics();
        // Dark indigo base fill
        g.fillStyle(0x12082a, 1);
        g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

        // Subtle star dots pattern
        const starColors = [0xffffff, 0xff70b0, 0xcc7aff, 0x3dffd4];
        for (let i = 0; i < 80; i++) {
            const sx = (i * 137 + 31) % GAME_WIDTH;
            const sy = (i * 97 + 17) % GAME_HEIGHT;
            const color = starColors[i % starColors.length];
            const alpha = 0.1 + (i % 5) * 0.06;
            const size = 0.5 + (i % 3) * 0.5;
            g.fillStyle(color, alpha);
            g.fillCircle(sx, sy, size);
        }

        // Soft purple vignette on sides
        g.fillStyle(0x0a0518, 0.2);
        g.fillRect(0, 0, 60, GAME_HEIGHT);
        g.fillRect(GAME_WIDTH - 60, 0, 60, GAME_HEIGHT);
    }

    _drawNeonBorder(x, y, w, h) {
        const g = this.add.graphics();
        // Neon pink glow line
        g.fillStyle(COLORS.neonPink, 0.6);
        g.fillRect(x, y, w, h);
        // Softer glow above/below
        g.fillStyle(COLORS.neonPink, 0.15);
        g.fillRect(x, y - 2, w, h + 4);
    }

    _drawGlowBanner(x, y, w, h) {
        const g = this.add.graphics();
        const left = x - w / 2;
        const top = y - h / 2;

        // Outer glow
        g.fillStyle(COLORS.neonCyan, 0.08);
        g.fillRoundedRect(left - 4, top - 4, w + 8, h + 8, 14);

        // Main body (dark purple with transparency)
        g.fillStyle(COLORS.midPurple, 0.7);
        g.fillRoundedRect(left, top, w, h, 10);

        // Border glow
        g.lineStyle(1.5, COLORS.neonCyan, 0.5);
        g.strokeRoundedRect(left, top, w, h, 10);
    }

    _drawAnimePanel(g, x, y, w, h, radius) {
        // Dark purple panel with neon pink border
        g.fillStyle(COLORS.midPurple, 0.4);
        g.fillRoundedRect(x, y, w, h, radius);
        g.lineStyle(2, COLORS.neonPink, 0.4);
        g.strokeRoundedRect(x, y, w, h, radius);
    }

    _drawDivider(cx, y) {
        const g = this.add.graphics();
        // Gradient-like line (pink to transparent)
        g.lineStyle(1, COLORS.neonPink, 0.4);
        g.lineBetween(cx - 120, y, cx - 12, y);
        g.lineBetween(cx + 12, y, cx + 120, y);

        // Small star in center
        this._drawStarShape(g, cx, y, 6, COLORS.neonPink, 0.6);
    }

    _drawStarShape(g, x, y, size, color, alpha) {
        g.fillStyle(color, alpha);
        // 4-pointed star
        g.fillTriangle(x, y - size, x - size * 0.35, y, x + size * 0.35, y);
        g.fillTriangle(x, y + size, x - size * 0.35, y, x + size * 0.35, y);
        g.fillTriangle(x - size, y, x, y - size * 0.35, x, y + size * 0.35);
        g.fillTriangle(x + size, y, x, y - size * 0.35, x, y + size * 0.35);
    }

    _drawSparkles(cx, y) {
        const g = this.add.graphics();
        // Multiple small sparkle/star shapes
        this._drawStarShape(g, cx - 30, y - 5, 5, COLORS.softPink, 0.7);
        this._drawStarShape(g, cx + 30, y - 5, 5, COLORS.neonCyan, 0.7);
        this._drawStarShape(g, cx, y - 12, 7, COLORS.softPurple, 0.5);
        // Tiny dots for sparkle effect
        g.fillStyle(COLORS.white, 0.6);
        g.fillCircle(cx - 18, y - 10, 1.5);
        g.fillCircle(cx + 18, y - 10, 1.5);
        g.fillCircle(cx - 8, y + 2, 1);
        g.fillCircle(cx + 8, y + 2, 1);
    }

    _drawStar(x, y, size, color) {
        const g = this.add.graphics();
        // Outer glow
        g.fillStyle(color, 0.15);
        g.fillCircle(x, y, size * 1.5);
        // 4-pointed star
        this._drawStarShape(g, x, y, size, color, 0.8);
        // Center bright dot
        g.fillStyle(0xffffff, 0.7);
        g.fillCircle(x, y, size * 0.2);
    }

    _drawHeart(x, y, size) {
        const g = this.add.graphics();
        // Draw a simple heart shape using circles + triangle
        const r = size * 0.45;
        g.fillStyle(COLORS.neonPink, 0.4);
        g.fillCircle(x - r, y - r * 0.3, r);
        g.fillCircle(x + r, y - r * 0.3, r);
        g.fillTriangle(
            x - size * 0.7, y,
            x + size * 0.7, y,
            x, y + size * 0.8
        );
        // Small sparkle on top
        g.fillStyle(0xffffff, 0.5);
        g.fillCircle(x - r * 0.3, y - r * 0.7, 1.5);
    }

    // ===== Anime rounded input box =====
    _createAnimeInputBox(bx, by, index) {
        const g = this.add.graphics();
        // Dark purple rounded background
        g.fillStyle(COLORS.midPurple, 0.8);
        g.fillRoundedRect(bx - 22, by - 28, 44, 56, 10);
        // Inner darker recess
        g.fillStyle(COLORS.darkIndigo, 0.6);
        g.fillRoundedRect(bx - 18, by - 24, 36, 48, 8);
        // Border
        g.lineStyle(1.5, COLORS.softPurple, 0.5);
        g.strokeRoundedRect(bx - 22, by - 28, 44, 56, 10);

        const letter = this.add.text(bx, by, '', {
            fontSize: '30px',
            fontFamily: '"Zen Maru Gothic", "Hiragino Sans", sans-serif',
            color: COLORS.textCyan,
            fontStyle: 'bold',
        }).setOrigin(0.5);

        // Active indicator (hidden border glow)
        const activeBorder = this.add.graphics();

        this.inputBoxes.push({ graphics: g, letter, activeBorder, x: bx, y: by });
    }

    _updateInputBoxes() {
        for (let i = 0; i < 4; i++) {
            const box = this.inputBoxes[i];
            box.letter.setText(this.inputCode[i] || '');

            box.activeBorder.clear();
            if (i < this.inputCode.length) {
                // Filled - neon cyan border
                box.activeBorder.lineStyle(2, COLORS.neonCyan, 0.8);
                box.activeBorder.strokeRoundedRect(box.x - 22, box.y - 28, 44, 56, 10);
            } else if (i === this.inputCode.length) {
                // Cursor position - subtle pink glow
                box.activeBorder.lineStyle(1.5, COLORS.neonPink, 0.6);
                box.activeBorder.strokeRoundedRect(box.x - 22, box.y - 28, 44, 56, 10);
            }
        }
    }

    // ===== Anime rounded gradient button =====
    _makeAnimeButton(x, y, text, callback) {
        const w = 260;
        const h = 56;
        const left = x - w / 2;
        const top = y - h / 2;

        const g = this.add.graphics();

        // Button body (purple base)
        g.fillStyle(COLORS.midPurple, 1);
        g.fillRoundedRect(left, top, w, h, 14);

        // Lighter highlight on top half
        g.fillStyle(COLORS.softPurple, 0.2);
        g.fillRoundedRect(left + 4, top + 4, w - 8, h * 0.4, 10);

        // Neon pink border glow
        g.lineStyle(2, COLORS.neonPink, 0.7);
        g.strokeRoundedRect(left, top, w, h, 14);

        // Outer subtle glow
        g.lineStyle(1, COLORS.neonPink, 0.15);
        g.strokeRoundedRect(left - 2, top - 2, w + 4, h + 4, 16);

        const label = this.add.text(x, y - 1, text, {
            fontSize: '20px',
            fontFamily: '"Zen Maru Gothic", "Hiragino Sans", sans-serif',
            color: COLORS.textWhite,
            fontStyle: 'bold',
            stroke: '#3a1d6e',
            strokeThickness: 2,
        }).setOrigin(0.5);

        // Interactive hit area (extra padding for touch)
        const hitZone = this.add.rectangle(x, y, w + 20, h + 16, 0x000000, 0)
            .setInteractive({ useHandCursor: true });

        hitZone.on('pointerdown', () => {
            // Press animation
            g.setScale(0.96);
            label.setScale(0.96);
            this.time.delayedCall(100, () => {
                g.setScale(1);
                label.setScale(1);
            });
            callback();
        });
        hitZone.on('pointerover', () => {
            g.setAlpha(0.85);
            label.setColor(COLORS.textPink);
        });
        hitZone.on('pointerout', () => {
            g.setAlpha(1);
            label.setColor(COLORS.textWhite);
        });

        return { bg: g, label, hitZone };
    }

    // ===== Network logic (preserved from original) =====

    async _connectIfNeeded() {
        if (NetworkManager.connected) return true;

        this.statusText.setText('Connecting to server...').setColor(COLORS.textDimPurple);
        try {
            const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
            const wsUrl = window.location.hostname === 'localhost'
                ? `ws://localhost:8082`
                : `${proto}://${window.location.host}`;
            await NetworkManager.connect(wsUrl);
            this.statusText.setText('Connected!').setColor(COLORS.textCyan);
            return true;
        } catch {
            this.statusText.setText('Connection failed!').setColor(COLORS.textPink);
            return false;
        }
    }

    async _onCreateRoom() {
        if (this._lobbyState !== 'idle') return;
        this._lobbyState = 'connecting';

        const ok = await this._connectIfNeeded();
        if (!ok) { this._lobbyState = 'idle'; return; }

        this._lobbyState = 'created';
        NetworkManager.createRoom();
    }

    async _onJoinRoom() {
        if (this.inputCode.length !== 4) return;
        if (this._lobbyState !== 'idle' && this._lobbyState !== 'joining') return;
        this._lobbyState = 'connecting';

        const ok = await this._connectIfNeeded();
        if (!ok) { this._lobbyState = 'idle'; return; }

        this._lobbyState = 'joining';
        NetworkManager.joinRoom(this.inputCode);
    }

    _copyRoomLink() {
        const url = `${window.location.origin}${window.location.pathname}?room=${this.codeText.text}`;
        navigator.clipboard.writeText(url).then(() => {
            this.copyFeedback.setText('Copied!').setVisible(true);
            this.time.delayedCall(2000, () => {
                if (this.copyFeedback) this.copyFeedback.setVisible(false);
            });
        }).catch(() => {
            this.copyFeedback.setText('Copy failed').setVisible(true);
        });
    }

    _onJoined(data) {
        if (data.playerId === 0) {
            // I created the room
            this.codeText.setText(data.code).setVisible(true);
            this.codeLabel.setVisible(true);
            this.codeBg.setVisible(true);
            // Show copy link button
            this.copyLinkBtn.bg.setVisible(true);
            this.copyLinkBtn.label.setVisible(true);
            this.copyLinkBtn.hitZone.setVisible(true).setInteractive({ useHandCursor: true });
            this._waitingBaseText = 'Waiting for other player';
            this.waitingText.setText(this._waitingBaseText);
            this.statusText.setText('');
            this._hideButtons();
        } else {
            // I joined
            this._waitingBaseText = 'Game starting';
            this.waitingText.setText(this._waitingBaseText);
            this.statusText.setText('');
            this._hideButtons();
        }
        this._lobbyState = 'waiting';
    }

    _onGameStart(data) {
        // Clean up listeners
        EventBus.off(Events.NET_JOINED, this._onJoined, this);
        EventBus.off(Events.NET_GAME_START, this._onGameStart, this);
        EventBus.off(Events.NET_ERROR, this._onError, this);

        // Clean up hidden input
        if (this._hiddenInput && this._hiddenInput.parentNode) {
            this._hiddenInput.blur();
            this._hiddenInput.parentNode.removeChild(this._hiddenInput);
            this._hiddenInput = null;
        }

        // Pass game data to GameScene via registry
        this.registry.set('gameStartData', data);
        this.registry.set('localPlayerId', NetworkManager.localPlayerId);

        this.scene.start('GameScene');
    }

    _onError(data) {
        this.statusText.setText(data.message || 'Error!').setColor(COLORS.textPink);
        this._lobbyState = 'idle';
    }

    _hideButtons() {
        this.createBtn.bg.setVisible(false);
        this.createBtn.label.setVisible(false);
        this.createBtn.hitZone.setVisible(false).disableInteractive();
        this.joinBtn.bg.setVisible(false);
        this.joinBtn.label.setVisible(false);
        this.joinBtn.hitZone.setVisible(false).disableInteractive();
        this.joinLabel.setVisible(false);
        if (this.tapHint) this.tapHint.setVisible(false);
        for (const b of this.inputBoxes) {
            b.graphics.setVisible(false);
            b.letter.setVisible(false);
            b.activeBorder.setVisible(false);
        }
    }
}
