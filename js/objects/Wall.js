import { GAME_WIDTH, GAME_HEIGHT, PLAY_AREA_TOP } from '../mechanics/FruitConfig.js';

// Anime color palette
const DARK_PURPLE  = 0x2a1050;
const MID_PURPLE   = 0x3d1a6e;
const LIGHT_PURPLE = 0x5a2d8e;
const NEON_PINK    = 0xff44aa;
const FLOOR_INDIGO = 0x1a0e30;

export function createWalls(scene) {
    const T = 24; // wall thickness

    const opts = {
        isStatic: true,
        friction: 0.5,
        restitution: 0.1,
        label: 'wall',
    };

    // Left wall (physics body)
    scene.matter.add.rectangle(-T / 2, GAME_HEIGHT / 2, T, GAME_HEIGHT, opts);

    // Right wall (physics body)
    scene.matter.add.rectangle(GAME_WIDTH + T / 2, GAME_HEIGHT / 2, T, GAME_HEIGHT, opts);

    // Bottom wall (physics body)
    scene.matter.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT - T / 2, GAME_WIDTH + T * 2, T, opts);

    // ---- Visual anime-styled walls ----
    const gfx = scene.add.graphics();

    // Left wall
    _drawAnimeWall(gfx, -T, PLAY_AREA_TOP, T, GAME_HEIGHT - PLAY_AREA_TOP, 'left');

    // Right wall
    _drawAnimeWall(gfx, GAME_WIDTH, PLAY_AREA_TOP, T, GAME_HEIGHT - PLAY_AREA_TOP, 'right');

    // ---- Floor ----
    _drawAnimeFloor(gfx, 0, GAME_HEIGHT - T, GAME_WIDTH, T);

    // ---- Neon barrier (danger line) ----
    const dangerGfx = scene.add.graphics();
    _drawNeonBarrier(scene, dangerGfx, PLAY_AREA_TOP);
}

function _drawAnimeWall(gfx, x, y, width, height, side) {
    // Gradient purple fill from dark to lighter
    const steps = 8;
    const stepW = width / steps;
    for (let i = 0; i < steps; i++) {
        // Interpolate from dark purple to lighter purple
        const t = i / (steps - 1);
        const r = Math.floor(0x2a + (0x5a - 0x2a) * t);
        const g = Math.floor(0x10 + (0x2d - 0x10) * t);
        const b = Math.floor(0x50 + (0x8e - 0x50) * t);
        const color = (r << 16) | (g << 8) | b;

        if (side === 'left') {
            // Gradient goes from dark (left) to light (right / inner edge)
            gfx.fillStyle(color, 1);
            gfx.fillRect(x + i * stepW, y, stepW + 1, height);
        } else {
            // Gradient goes from light (left / inner edge) to dark (right)
            gfx.fillStyle(color, 1);
            gfx.fillRect(x + (steps - 1 - i) * stepW, y, stepW + 1, height);
        }
    }

    // Neon pink edge line on the inner side
    if (side === 'left') {
        // Right edge (inner side)
        gfx.fillStyle(NEON_PINK, 0.9);
        gfx.fillRect(x + width - 2, y, 2, height);
        // Softer glow next to neon line
        gfx.fillStyle(NEON_PINK, 0.3);
        gfx.fillRect(x + width - 5, y, 3, height);
        gfx.fillStyle(NEON_PINK, 0.1);
        gfx.fillRect(x + width - 9, y, 4, height);
    } else {
        // Left edge (inner side)
        gfx.fillStyle(NEON_PINK, 0.9);
        gfx.fillRect(x, y, 2, height);
        // Softer glow next to neon line
        gfx.fillStyle(NEON_PINK, 0.3);
        gfx.fillRect(x + 2, y, 3, height);
        gfx.fillStyle(NEON_PINK, 0.1);
        gfx.fillRect(x + 5, y, 4, height);
    }

    // Subtle vertical shimmer lines on the wall for anime effect
    for (let sy = y; sy < y + height; sy += 60) {
        const shimmerAlpha = 0.06 + Math.sin(sy * 0.05) * 0.03;
        gfx.fillStyle(0xcc88ff, shimmerAlpha);
        if (side === 'left') {
            gfx.fillRect(x + width - 8, sy, 1, 30);
        } else {
            gfx.fillRect(x + 7, sy, 1, 30);
        }
    }
}

function _drawAnimeFloor(gfx, x, y, width, height) {
    // Dark indigo base with subtle purple tint
    gfx.fillStyle(FLOOR_INDIGO, 1);
    gfx.fillRect(x, y, width, height);

    // Slight purple tint overlay
    gfx.fillStyle(MID_PURPLE, 0.3);
    gfx.fillRect(x, y, width, height);

    // Top edge neon glow (subtle pink line along the top of the floor)
    gfx.fillStyle(NEON_PINK, 0.4);
    gfx.fillRect(x, y, width, 1);
    gfx.fillStyle(NEON_PINK, 0.15);
    gfx.fillRect(x, y + 1, width, 2);

    // Subtle texture dots
    for (let i = 0; i < 25; i++) {
        const px = x + ((i * 23) % width);
        const py = y + ((i * 7) % height);
        gfx.fillStyle(LIGHT_PURPLE, 0.15);
        gfx.fillRect(px, py, 2, 2);
    }
}

function _drawNeonBarrier(scene, gfx, yPos) {
    // Wide faint pink outer glow
    gfx.fillStyle(0xff66aa, 0.06);
    gfx.fillRect(0, yPos - 8, GAME_WIDTH, 16);

    // Mid glow - pink
    gfx.fillStyle(0xff66aa, 0.12);
    gfx.fillRect(0, yPos - 4, GAME_WIDTH, 8);

    // Core bright line - pink
    gfx.fillStyle(0xff66aa, 0.5);
    gfx.fillRect(0, yPos - 1, GAME_WIDTH, 2);

    // Bright center line
    gfx.fillStyle(0xffaacc, 0.7);
    gfx.fillRect(0, yPos, GAME_WIDTH, 1);

    // Alternating pink and cyan dots along the barrier
    for (let x = 15; x < GAME_WIDTH; x += 30) {
        const isPink = ((x / 30) % 2) < 1;
        const dotColor = isPink ? 0xff66aa : 0x44ddff;
        const dotAlpha = isPink ? 0.8 : 0.7;
        gfx.fillStyle(dotColor, dotAlpha);
        gfx.fillRect(x - 1, yPos - 2, 3, 3);

        // Small glow around each dot
        gfx.fillStyle(dotColor, 0.2);
        gfx.fillRect(x - 3, yPos - 4, 7, 7);
    }

    // Animated pulsing glow overlay using pink color
    const pulseGfx = scene.add.graphics();
    scene.tweens.add({
        targets: { alpha: 0.1 },
        alpha: 0.35,
        duration: 1500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        onUpdate: (tween) => {
            const val = tween.getValue();
            pulseGfx.clear();
            pulseGfx.fillStyle(0xff66aa, val);
            pulseGfx.fillRect(0, yPos - 4, GAME_WIDTH, 8);
        },
    });
}
