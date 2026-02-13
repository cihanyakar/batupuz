// SoundManager - Web Audio API synthesized anime-style sounds
// No external audio files needed

class _SoundManager {
    constructor() {
        this._initialized = false;
        this._ctx = null;
    }

    init() {
        if (this._initialized) return;
        this._initialized = true;
        try {
            this._ctx = new (window.AudioContext || window.webkitAudioContext)();
            this._ctx.resume();
        } catch (e) {
            // Audio not supported
        }
    }

    play(soundName) {
        if (!this._ctx) return;
        try {
            switch (soundName) {
                case 'drop':       this._playDrop(); break;
                case 'merge':      this._playMerge(); break;
                case 'maxMerge':   this._playMaxMerge(); break;
                case 'timerWarning': this._playTimerWarning(); break;
                case 'gameOver':   this._playGameOver(); break;
                case 'gameStart':  this._playGameStart(); break;
                case 'buttonClick': this._playButtonClick(); break;
                case 'autoDrop':   this._playAutoDrop(); break;
            }
        } catch (e) {
            // Ignore audio errors
        }
    }

    // ---- Sound generators (anime style) ----

    _playDrop() {
        // Quick pop sound - sine wave 600Hz→400Hz, short duration
        const ctx = this._ctx;
        const now = ctx.currentTime;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(400, now + 0.1);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.1);
    }

    _playMerge() {
        // Sparkle ping - two sine oscillators, bright and cheerful
        const ctx = this._ctx;
        const now = ctx.currentTime;

        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(800, now);
        osc1.frequency.exponentialRampToValueAtTime(1200, now + 0.2);

        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1000, now);
        osc2.frequency.exponentialRampToValueAtTime(1500, now + 0.2);

        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

        osc1.connect(gain).connect(ctx.destination);
        osc2.connect(gain);
        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.2);
        osc2.stop(now + 0.2);
    }

    _playMaxMerge() {
        // Anime jingle - ascending 3-note arpeggio with triangle waves, celebratory
        const ctx = this._ctx;
        const now = ctx.currentTime;

        const notes = [800, 1000, 1200];
        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const t = now + i * 0.1;
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, t);
            gain.gain.setValueAtTime(0.18, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
            osc.connect(gain).connect(ctx.destination);
            osc.start(t);
            osc.stop(t + 0.25);
        });
    }

    _playTimerWarning() {
        // Quick high beep - sine 1000Hz, very short
        const ctx = this._ctx;
        const now = ctx.currentTime;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1000, now);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.08);
    }

    _playGameOver() {
        // Sad two descending notes - sine 600→400 then 400→300
        const ctx = this._ctx;
        const now = ctx.currentTime;

        // First note
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(600, now);
        osc1.frequency.exponentialRampToValueAtTime(400, now + 0.25);
        gain1.gain.setValueAtTime(0.15, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc1.connect(gain1).connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.3);

        // Second note
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(400, now + 0.25);
        osc2.frequency.exponentialRampToValueAtTime(300, now + 0.5);
        gain2.gain.setValueAtTime(0.15, now + 0.25);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        osc2.connect(gain2).connect(ctx.destination);
        osc2.start(now + 0.25);
        osc2.stop(now + 0.5);
    }

    _playGameStart() {
        // Upbeat ascending arpeggio - 4 quick notes with sine waves
        const ctx = this._ctx;
        const now = ctx.currentTime;

        const notes = [600, 800, 1000, 1200];
        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const t = now + i * 0.1;
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, t);
            gain.gain.setValueAtTime(0.15, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
            osc.connect(gain).connect(ctx.destination);
            osc.start(t);
            osc.stop(t + 0.2);
        });
    }

    _playButtonClick() {
        // Soft pop - sine 900Hz→600Hz, very short
        const ctx = this._ctx;
        const now = ctx.currentTime;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(900, now);
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.06);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.06);
    }

    _playAutoDrop() {
        // Descending chirp - sine 800Hz→400Hz
        const ctx = this._ctx;
        const now = ctx.currentTime;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(400, now + 0.15);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.15);
    }
}

export const SoundManager = new _SoundManager();
