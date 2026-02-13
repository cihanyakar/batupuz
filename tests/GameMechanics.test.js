// Install Phaser mock BEFORE importing any module that depends on Phaser.
import '../tests/mocks/phaser.js';

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GameMechanics } from '../js/mechanics/GameMechanics.js';
import { EventBus, Events } from '../js/mechanics/EventBus.js';
import { FRUIT_TIERS, GAME_WIDTH, PLAY_AREA_TOP } from '../js/mechanics/FruitConfig.js';

describe('GameMechanics', () => {
  let gm;

  beforeEach(() => {
    gm = new GameMechanics();
    // Clear Phaser.Math.Clamp mock call history between tests
    Phaser.Math.Clamp.mockClear();
    // Remove all EventBus listeners to avoid cross-test leakage
    EventBus.removeAllListeners();
  });

  describe('constructor', () => {
    it('initializes score to 0', () => {
      expect(gm.score).toBe(0);
    });

    it('initializes isGameOver to false', () => {
      expect(gm.isGameOver).toBe(false);
    });

    it('creates 2 players', () => {
      expect(gm.players).toHaveLength(2);
    });

    it('player 0 has id=0 and default tiers', () => {
      expect(gm.players[0]).toEqual({ id: 0, currentTier: 0, nextTier: 0 });
    });

    it('player 1 has id=1 and default tiers', () => {
      expect(gm.players[1]).toEqual({ id: 1, currentTier: 0, nextTier: 0 });
    });
  });

  describe('initFromServer', () => {
    it('sets player tiers from server data', () => {
      gm.initFromServer([
        { id: 0, tier: 2, nextTier: 1 },
        { id: 1, tier: 3, nextTier: 0 },
      ]);
      expect(gm.players[0].currentTier).toBe(2);
      expect(gm.players[0].nextTier).toBe(1);
      expect(gm.players[1].currentTier).toBe(3);
      expect(gm.players[1].nextTier).toBe(0);
    });

    it('resets score to 0', () => {
      gm.score = 50;
      gm.initFromServer([
        { id: 0, tier: 0, nextTier: 0 },
        { id: 1, tier: 0, nextTier: 0 },
      ]);
      expect(gm.score).toBe(0);
    });

    it('resets isGameOver to false', () => {
      gm.isGameOver = true;
      gm.initFromServer([
        { id: 0, tier: 0, nextTier: 0 },
        { id: 1, tier: 0, nextTier: 0 },
      ]);
      expect(gm.isGameOver).toBe(false);
    });
  });

  describe('getPlayer', () => {
    it('returns the correct player for id 0', () => {
      const player = gm.getPlayer(0);
      expect(player).toBe(gm.players[0]);
      expect(player.id).toBe(0);
    });

    it('returns the correct player for id 1', () => {
      const player = gm.getPlayer(1);
      expect(player).toBe(gm.players[1]);
      expect(player.id).toBe(1);
    });
  });

  describe('applyDrop', () => {
    it('calls Phaser.Math.Clamp with correct arguments', () => {
      const tier = 0;
      const x = 300;
      gm.applyDrop(0, tier, x);

      const radius = FRUIT_TIERS[tier].radius;
      expect(Phaser.Math.Clamp).toHaveBeenCalledWith(x, radius, GAME_WIDTH - radius);
    });

    it('returns the correct y position (PLAY_AREA_TOP - 40)', () => {
      const result = gm.applyDrop(0, 0, 300);
      expect(result.y).toBe(PLAY_AREA_TOP - 40);
    });

    it('returns the tier and playerId in the result', () => {
      const result = gm.applyDrop(1, 2, 200);
      expect(result.playerId).toBe(1);
      expect(result.tier).toBe(2);
    });

    it('clamps x within bounds for left edge', () => {
      const tier = 4; // radius = 70
      const result = gm.applyDrop(0, tier, 10);
      // Phaser.Math.Clamp mock clamps: max(70, min(530, 10)) = 70
      expect(result.x).toBe(FRUIT_TIERS[tier].radius);
    });

    it('clamps x within bounds for right edge', () => {
      const tier = 4; // radius = 70
      const result = gm.applyDrop(0, tier, 590);
      // Phaser.Math.Clamp mock clamps: max(70, min(530, 590)) = 530
      expect(result.x).toBe(GAME_WIDTH - FRUIT_TIERS[tier].radius);
    });

    it('does not clamp x when within valid range', () => {
      const tier = 0; // radius = 20
      const result = gm.applyDrop(0, tier, 300);
      expect(result.x).toBe(300);
    });
  });

  describe('assignFruit', () => {
    it('updates player currentTier', () => {
      gm.assignFruit(0, 3, 1);
      expect(gm.players[0].currentTier).toBe(3);
    });

    it('updates player nextTier', () => {
      gm.assignFruit(0, 3, 1);
      expect(gm.players[0].nextTier).toBe(1);
    });

    it('updates the correct player', () => {
      gm.assignFruit(1, 5, 2);
      expect(gm.players[1].currentTier).toBe(5);
      expect(gm.players[1].nextTier).toBe(2);
      // Player 0 should be unchanged
      expect(gm.players[0].currentTier).toBe(0);
      expect(gm.players[0].nextTier).toBe(0);
    });
  });

  describe('addScore', () => {
    it('increments score by the correct delta for tier 0', () => {
      gm.addScore(0);
      expect(gm.score).toBe(FRUIT_TIERS[0].points); // 1
    });

    it('increments score by the correct delta for tier 3', () => {
      gm.addScore(3);
      expect(gm.score).toBe(FRUIT_TIERS[3].points); // 10
    });

    it('accumulates score across multiple calls', () => {
      gm.addScore(0); // +1
      gm.addScore(1); // +3
      gm.addScore(2); // +6
      expect(gm.score).toBe(1 + 3 + 6);
    });

    it('emits SCORE_CHANGED event with correct payload', () => {
      const handler = vi.fn();
      EventBus.on(Events.SCORE_CHANGED, handler);

      gm.addScore(2);
      expect(handler).toHaveBeenCalledWith({
        score: FRUIT_TIERS[2].points,
        delta: FRUIT_TIERS[2].points,
      });
    });
  });

  describe('setScore', () => {
    it('sets the score directly', () => {
      gm.setScore(999);
      expect(gm.score).toBe(999);
    });

    it('emits SCORE_CHANGED event with delta 0', () => {
      const handler = vi.fn();
      EventBus.on(Events.SCORE_CHANGED, handler);

      gm.setScore(42);
      expect(handler).toHaveBeenCalledWith({ score: 42, delta: 0 });
    });

    it('can overwrite previously accumulated score', () => {
      gm.addScore(5); // score = 21
      gm.setScore(100);
      expect(gm.score).toBe(100);
    });
  });

  describe('reset', () => {
    it('resets score to 0', () => {
      gm.score = 150;
      gm.reset();
      expect(gm.score).toBe(0);
    });

    it('resets isGameOver to false', () => {
      gm.isGameOver = true;
      gm.reset();
      expect(gm.isGameOver).toBe(false);
    });

    it('applies playersData when provided', () => {
      gm.reset([
        { id: 0, tier: 1, nextTier: 2 },
        { id: 1, tier: 2, nextTier: 0 },
      ]);
      expect(gm.players[0].currentTier).toBe(1);
      expect(gm.players[0].nextTier).toBe(2);
      expect(gm.players[1].currentTier).toBe(2);
      expect(gm.players[1].nextTier).toBe(0);
    });

    it('does not fail when called without playersData', () => {
      gm.score = 50;
      gm.isGameOver = true;
      gm.reset();
      expect(gm.score).toBe(0);
      expect(gm.isGameOver).toBe(false);
    });
  });
});
