// Minimal Phaser mock for testing modules that depend on Phaser globals.

import { vi } from 'vitest';

class MockEventEmitter {
  constructor() {
    this._listeners = {};
  }
  on(event, fn) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(fn);
    return this;
  }
  off(event, fn) {
    if (!this._listeners[event]) return this;
    this._listeners[event] = this._listeners[event].filter(f => f !== fn);
    return this;
  }
  emit(event, ...args) {
    if (!this._listeners[event]) return false;
    for (const fn of this._listeners[event]) fn(...args);
    return true;
  }
  removeAllListeners() {
    this._listeners = {};
    return this;
  }
}

const Phaser = {
  Events: {
    EventEmitter: MockEventEmitter,
  },
  Math: {
    Clamp: vi.fn((value, min, max) => {
      return Math.max(min, Math.min(max, value));
    }),
  },
};

// Install the mock globally, just like the browser would have it.
globalThis.Phaser = Phaser;

export default Phaser;
