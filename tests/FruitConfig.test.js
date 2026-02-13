import { describe, it, expect } from 'vitest';
import {
  FRUIT_TIERS,
  MAX_TIER,
  SPAWNABLE_TIERS,
  GAME_WIDTH,
  GAME_HEIGHT,
  PLAY_AREA_TOP,
} from '../js/mechanics/FruitConfig.js';

describe('FruitConfig', () => {
  describe('FRUIT_TIERS', () => {
    it('has exactly 8 entries (tiers 0-7)', () => {
      expect(FRUIT_TIERS).toHaveLength(8);
    });

    it('each tier has the required properties: tier, name, radius, color, points', () => {
      for (const entry of FRUIT_TIERS) {
        expect(entry).toHaveProperty('tier');
        expect(entry).toHaveProperty('name');
        expect(entry).toHaveProperty('radius');
        expect(entry).toHaveProperty('color');
        expect(entry).toHaveProperty('points');
      }
    });

    it('tier indices match their position in the array', () => {
      FRUIT_TIERS.forEach((entry, index) => {
        expect(entry.tier).toBe(index);
      });
    });

    it('radii are in strictly ascending order', () => {
      for (let i = 1; i < FRUIT_TIERS.length; i++) {
        expect(FRUIT_TIERS[i].radius).toBeGreaterThan(FRUIT_TIERS[i - 1].radius);
      }
    });

    it('points are in strictly ascending order', () => {
      for (let i = 1; i < FRUIT_TIERS.length; i++) {
        expect(FRUIT_TIERS[i].points).toBeGreaterThan(FRUIT_TIERS[i - 1].points);
      }
    });

    it('no two tiers share the same radius', () => {
      const radii = FRUIT_TIERS.map(t => t.radius);
      const unique = new Set(radii);
      expect(unique.size).toBe(radii.length);
    });

    it('no two tiers share the same name', () => {
      const names = FRUIT_TIERS.map(t => t.name);
      const unique = new Set(names);
      expect(unique.size).toBe(names.length);
    });

    it('all colors are valid hex numbers', () => {
      for (const entry of FRUIT_TIERS) {
        expect(typeof entry.color).toBe('number');
        expect(entry.color).toBeGreaterThanOrEqual(0x000000);
        expect(entry.color).toBeLessThanOrEqual(0xffffff);
      }
    });

    it('all radii are positive numbers', () => {
      for (const entry of FRUIT_TIERS) {
        expect(entry.radius).toBeGreaterThan(0);
      }
    });

    it('all points are positive integers', () => {
      for (const entry of FRUIT_TIERS) {
        expect(entry.points).toBeGreaterThan(0);
        expect(Number.isInteger(entry.points)).toBe(true);
      }
    });
  });

  describe('MAX_TIER', () => {
    it('equals FRUIT_TIERS.length - 1', () => {
      expect(MAX_TIER).toBe(FRUIT_TIERS.length - 1);
    });

    it('equals 7', () => {
      expect(MAX_TIER).toBe(7);
    });
  });

  describe('SPAWNABLE_TIERS', () => {
    it('only contains valid tier indices (within 0..MAX_TIER)', () => {
      for (const tier of SPAWNABLE_TIERS) {
        expect(tier).toBeGreaterThanOrEqual(0);
        expect(tier).toBeLessThanOrEqual(MAX_TIER);
      }
    });

    it('all values are strictly less than MAX_TIER', () => {
      for (const tier of SPAWNABLE_TIERS) {
        expect(tier).toBeLessThan(MAX_TIER);
      }
    });

    it('contains at least one tier', () => {
      expect(SPAWNABLE_TIERS.length).toBeGreaterThan(0);
    });

    it('contains tiers [0, 1, 2, 3]', () => {
      expect(SPAWNABLE_TIERS).toEqual([0, 1, 2, 3]);
    });
  });

  describe('Game dimensions', () => {
    it('GAME_WIDTH is a positive number', () => {
      expect(GAME_WIDTH).toBeGreaterThan(0);
    });

    it('GAME_HEIGHT is a positive number', () => {
      expect(GAME_HEIGHT).toBeGreaterThan(0);
    });

    it('PLAY_AREA_TOP is a positive number', () => {
      expect(PLAY_AREA_TOP).toBeGreaterThan(0);
    });

    it('PLAY_AREA_TOP is less than GAME_HEIGHT', () => {
      expect(PLAY_AREA_TOP).toBeLessThan(GAME_HEIGHT);
    });

    it('GAME_WIDTH equals 600', () => {
      expect(GAME_WIDTH).toBe(600);
    });

    it('GAME_HEIGHT equals 780', () => {
      expect(GAME_HEIGHT).toBe(780);
    });

    it('PLAY_AREA_TOP equals 98', () => {
      expect(PLAY_AREA_TOP).toBe(98);
    });
  });
});
