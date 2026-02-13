import { FRUIT_TIERS, MAX_TIER, GAME_WIDTH, PLAY_AREA_TOP } from './FruitConfig.js';
import { EventBus, Events } from './EventBus.js';

export class GameMechanics {
    constructor() {
        this.score = 0;
        this.isGameOver = false;
        this.players = [
            { id: 0, currentTier: 0, nextTier: 0 },
            { id: 1, currentTier: 0, nextTier: 0 },
        ];
    }

    initFromServer(playersData) {
        this.score = 0;
        this.isGameOver = false;
        for (const pd of playersData) {
            this.players[pd.id].currentTier = pd.tier;
            this.players[pd.id].nextTier = pd.nextTier;
        }
    }

    getPlayer(playerId) {
        return this.players[playerId];
    }

    applyDrop(playerId, tier, x) {
        const radius = FRUIT_TIERS[tier].radius;
        const clampedX = Phaser.Math.Clamp(x, radius, GAME_WIDTH - radius);
        return { playerId, tier, x: clampedX, y: PLAY_AREA_TOP - 40 };
    }

    assignFruit(playerId, tier, nextTier) {
        const player = this.players[playerId];
        player.currentTier = tier;
        player.nextTier = nextTier;
    }

    addScore(resultTier) {
        const delta = FRUIT_TIERS[resultTier].points;
        this.score += delta;
        EventBus.emit(Events.SCORE_CHANGED, { score: this.score, delta });
    }

    setScore(newScore) {
        this.score = newScore;
        EventBus.emit(Events.SCORE_CHANGED, { score: this.score, delta: 0 });
    }

    reset(playersData) {
        this.score = 0;
        this.isGameOver = false;
        if (playersData) {
            this.initFromServer(playersData);
        }
    }
}
