import { FRUIT_TIERS } from '../mechanics/FruitConfig.js';

export class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }

    create() {
        // Generate all gem textures
        this._generateKuvars();      // Tier 0: Quartz (pink crystal)
        this._generateAmetist();     // Tier 1: Amethyst (purple)
        this._generateTopaz();       // Tier 2: Topaz (golden)
        this._generateZumrut();      // Tier 3: Emerald (green)
        this._generateYakut();       // Tier 4: Ruby (red)
        this._generateSafir();       // Tier 5: Sapphire (blue)
        this._generateElmas();       // Tier 6: Diamond (white/sparkling)
        this._generateYildizTasi();  // Tier 7: Star Stone (rainbow/cosmic)

        // Generate background texture
        this._generateAnimeBackground();

        this.scene.start('LobbyScene');
    }

    // ─── HELPER: draw a single "pixel" block ───
    _px(gfx, x, y, size, color, alpha = 1) {
        gfx.fillStyle(color, alpha);
        gfx.fillRect(x, y, size, size);
    }

    // ─── HELPER: draw a filled circle of pixels ───
    _pixelCircle(gfx, cx, cy, radius, pxSize, color, alpha = 1) {
        for (let py = -radius; py <= radius; py += pxSize) {
            for (let px = -radius; px <= radius; px += pxSize) {
                if (px * px + py * py <= radius * radius) {
                    this._px(gfx, cx + px, cy + py, pxSize, color, alpha);
                }
            }
        }
    }

    // ─── HELPER: draw a filled hexagon of pixels (6-sided) ───
    _pixelHex(gfx, cx, cy, radius, pxSize, color, alpha = 1) {
        for (let py = -radius; py <= radius; py += pxSize) {
            for (let px = -radius; px <= radius; px += pxSize) {
                // Hexagonal distance check (6-sided)
                const ax = Math.abs(px);
                const ay = Math.abs(py);
                // Hex formula: max(ax, (ax/2 + ay*0.866)) < radius
                if (Math.max(ax, ax * 0.5 + ay * 0.866) <= radius) {
                    this._px(gfx, cx + px, cy + py, pxSize, color, alpha);
                }
            }
        }
    }

    // ─── HELPER: draw a filled octagon of pixels (8-sided) ───
    _pixelOct(gfx, cx, cy, radius, pxSize, color, alpha = 1) {
        // Draw an octagonal gem shape (square with cut corners)
        const cut = radius * 0.38; // how much to cut corners
        for (let py = -radius; py <= radius; py += pxSize) {
            for (let px = -radius; px <= radius; px += pxSize) {
                const ax = Math.abs(px);
                const ay = Math.abs(py);
                // Octagon: ax + ay < radius * 1.2 AND ax < radius AND ay < radius
                if (ax + ay <= radius + cut && ax <= radius && ay <= radius) {
                    this._px(gfx, cx + px, cy + py, pxSize, color, alpha);
                }
            }
        }
    }

    // ─── HELPER: draw a filled diamond/rhombus of pixels ───
    _pixelDiamond(gfx, cx, cy, radius, pxSize, color, alpha = 1) {
        for (let py = -radius; py <= radius; py += pxSize) {
            for (let px = -radius; px <= radius; px += pxSize) {
                if (Math.abs(px) + Math.abs(py) <= radius) {
                    this._px(gfx, cx + px, cy + py, pxSize, color, alpha);
                }
            }
        }
    }

    // ─── HELPER: dither pattern between two colors ───
    _dither(gfx, x, y, w, h, pxSize, color1, color2, alpha = 1) {
        let toggle = false;
        for (let py = y; py < y + h; py += pxSize) {
            toggle = !toggle;
            for (let px = x; px < x + w; px += pxSize) {
                const c = toggle ? color1 : color2;
                this._px(gfx, px, py, pxSize, c, alpha);
                toggle = !toggle;
            }
        }
    }

    // ─── HELPER: draw a sparkle cross ───
    _sparkle(gfx, cx, cy, p, color, alpha) {
        this._px(gfx, cx, cy, p, color, alpha);
        this._px(gfx, cx - p, cy, p, color, alpha * 0.5);
        this._px(gfx, cx + p, cy, p, color, alpha * 0.5);
        this._px(gfx, cx, cy - p, p, color, alpha * 0.5);
        this._px(gfx, cx, cy + p, p, color, alpha * 0.5);
    }

    // ─── HELPER: draw faceted gem body ───
    // Draws a circular gem shape with faceted edges (octagonal feel)
    _gemBody(gfx, cx, cy, radius, p, baseColor, darkColor, lightColor, highlightColor) {
        // Outer glow
        this._pixelCircle(gfx, cx, cy, radius - 1, p, baseColor, 0.2);

        // Main gem body - slightly octagonal via layered circles
        this._pixelCircle(gfx, cx, cy, radius - 3, p, darkColor);
        this._pixelCircle(gfx, cx, cy, radius - 5, p, baseColor);

        // Top facet (lighter, catches the light)
        for (let py = -radius + 6; py < 0; py += p) {
            const normY = (py + radius - 6) / (radius - 6);
            const halfW = Math.floor((radius - 8) * (0.5 + normY * 0.5));
            for (let px = -halfW; px <= halfW; px += p) {
                if (px * px + py * py <= (radius - 6) * (radius - 6)) {
                    const edgeDist = 1 - Math.sqrt(px * px + py * py) / (radius - 6);
                    this._px(gfx, cx + px, cy + py, p, lightColor, 0.3 + edgeDist * 0.3);
                }
            }
        }

        // Facet lines - diagonal cuts to create gem look
        const facetAngles = [Math.PI * 0.25, Math.PI * 0.75, Math.PI * 1.25, Math.PI * 1.75];
        for (const angle of facetAngles) {
            for (let r = radius * 0.3; r < radius - 6; r += p) {
                const fx = Math.round(cx + Math.cos(angle) * r);
                const fy = Math.round(cy + Math.sin(angle) * r);
                const ddx = fx - cx;
                const ddy = fy - cy;
                if (ddx * ddx + ddy * ddy < (radius - 6) * (radius - 6)) {
                    this._px(gfx, fx, fy, p, darkColor, 0.35);
                }
            }
        }

        // Central facet highlight (diamond shape in center)
        const centerSize = Math.floor(radius * 0.35);
        for (let py = -centerSize; py <= centerSize; py += p) {
            const halfW = centerSize - Math.abs(py);
            for (let px = -halfW; px <= halfW; px += p) {
                this._px(gfx, cx + px, cy + py - Math.floor(radius * 0.1), p, highlightColor, 0.15);
            }
        }

        // Bright edge highlights on upper-left facets
        for (let angle = Math.PI * 0.7; angle < Math.PI * 1.3; angle += 0.06) {
            const r = radius - 6;
            const hx = Math.round(cx + Math.cos(angle) * r);
            const hy = Math.round(cy + Math.sin(angle) * r);
            this._px(gfx, hx, hy, p, highlightColor, 0.25);
        }
    }

    // ─── HELPER: draw kawaii face on a gem ───
    _kawaiiGemFace(gfx, cx, cy, radius, p, faceColor) {
        // Scale face features based on gem radius
        const eyeSpacing = Math.floor(radius * 0.22);
        const eyeY = cy - Math.floor(radius * 0.05);
        const smileY = cy + Math.floor(radius * 0.18);
        const blushSpacing = Math.floor(radius * 0.35);
        const blushY = cy + Math.floor(radius * 0.06);

        if (radius <= 30) {
            // Small gems: simple dot eyes
            this._px(gfx, cx - eyeSpacing, eyeY, p, faceColor);
            this._px(gfx, cx + eyeSpacing, eyeY, p, faceColor);

            // Small smile
            this._px(gfx, cx - Math.floor(p * 1), smileY, p, faceColor);
            this._px(gfx, cx, smileY + p, p, faceColor);
            this._px(gfx, cx + Math.floor(p * 1), smileY, p, faceColor);
        } else if (radius <= 55) {
            // Medium gems: ^_^ closed eyes
            // Left eye ^
            this._px(gfx, cx - eyeSpacing - p, eyeY, p, faceColor);
            this._px(gfx, cx - eyeSpacing, eyeY - p, p, faceColor);
            this._px(gfx, cx - eyeSpacing + p, eyeY, p, faceColor);
            // Right eye ^
            this._px(gfx, cx + eyeSpacing - p, eyeY, p, faceColor);
            this._px(gfx, cx + eyeSpacing, eyeY - p, p, faceColor);
            this._px(gfx, cx + eyeSpacing + p, eyeY, p, faceColor);

            // Smile curve
            this._px(gfx, cx - p * 2, smileY, p, faceColor);
            this._px(gfx, cx - p, smileY + p, p, faceColor);
            this._px(gfx, cx, smileY + p, p, faceColor);
            this._px(gfx, cx + p, smileY + p, p, faceColor);
            this._px(gfx, cx + p * 2, smileY, p, faceColor);
        } else if (radius <= 82) {
            // Large gems: open sparkly eyes
            const eyeR = Math.max(4, Math.floor(radius * 0.07));
            // Left eye
            this._pixelCircle(gfx, cx - eyeSpacing, eyeY, eyeR, p, faceColor);
            // Eye highlights
            this._px(gfx, cx - eyeSpacing - Math.floor(eyeR * 0.5), eyeY - Math.floor(eyeR * 0.6), p, 0xffffff, 0.9);
            this._px(gfx, cx - eyeSpacing + Math.floor(eyeR * 0.3), eyeY - Math.floor(eyeR * 0.3), p, 0xffffff, 0.5);
            // Right eye
            this._pixelCircle(gfx, cx + eyeSpacing, eyeY, eyeR, p, faceColor);
            this._px(gfx, cx + eyeSpacing - Math.floor(eyeR * 0.5), eyeY - Math.floor(eyeR * 0.6), p, 0xffffff, 0.9);
            this._px(gfx, cx + eyeSpacing + Math.floor(eyeR * 0.3), eyeY - Math.floor(eyeR * 0.3), p, 0xffffff, 0.5);

            // Wide happy smile
            const smileW = Math.floor(radius * 0.2);
            for (let i = -smileW; i <= smileW; i += p) {
                const curveY = Math.floor(Math.abs(i) * Math.abs(i) / (smileW * 1.5));
                this._px(gfx, cx + i, smileY + p - curveY, p, faceColor);
            }
        } else {
            // Huge gems: big sparkling anime eyes with star highlights
            const eyeR = Math.max(6, Math.floor(radius * 0.08));
            const innerR = Math.max(3, Math.floor(eyeR * 0.6));
            // Left eye
            this._pixelCircle(gfx, cx - eyeSpacing, eyeY, eyeR, p, faceColor);
            this._pixelCircle(gfx, cx - eyeSpacing, eyeY, innerR, p, 0x111111);
            this._px(gfx, cx - eyeSpacing - Math.floor(eyeR * 0.5), eyeY - Math.floor(eyeR * 0.7), p, 0xffffff, 0.95);
            this._px(gfx, cx - eyeSpacing, eyeY - Math.floor(eyeR * 0.4), p, 0xffffff, 0.6);
            this._px(gfx, cx - eyeSpacing + Math.floor(eyeR * 0.4), eyeY + Math.floor(eyeR * 0.3), p, 0xffffff, 0.4);
            // Right eye
            this._pixelCircle(gfx, cx + eyeSpacing, eyeY, eyeR, p, faceColor);
            this._pixelCircle(gfx, cx + eyeSpacing, eyeY, innerR, p, 0x111111);
            this._px(gfx, cx + eyeSpacing - Math.floor(eyeR * 0.5), eyeY - Math.floor(eyeR * 0.7), p, 0xffffff, 0.95);
            this._px(gfx, cx + eyeSpacing, eyeY - Math.floor(eyeR * 0.4), p, 0xffffff, 0.6);
            this._px(gfx, cx + eyeSpacing + Math.floor(eyeR * 0.4), eyeY + Math.floor(eyeR * 0.3), p, 0xffffff, 0.4);

            // Cat mouth :3
            this._px(gfx, cx, smileY, p, faceColor);
            this._px(gfx, cx - p * 2, smileY + p * 2, p, faceColor);
            this._px(gfx, cx - p, smileY + p * 3, p, faceColor);
            this._px(gfx, cx + p, smileY + p * 3, p, faceColor);
            this._px(gfx, cx + p * 2, smileY + p * 2, p, faceColor);
        }

        // Blush marks (always present)
        const blushR = Math.max(3, Math.floor(radius * 0.06));
        this._pixelCircle(gfx, cx - blushSpacing, blushY, blushR, p, 0xff8899, 0.35);
        this._pixelCircle(gfx, cx + blushSpacing, blushY, blushR, p, 0xff8899, 0.35);
    }

    // ─── TIER 0: KUVARS - Quartz (radius 20) ───
    _generateKuvars() {
        const gem = FRUIT_TIERS[0];
        const d = gem.radius * 2; // 40
        const gfx = this.add.graphics();
        const cx = gem.radius;
        const cy = gem.radius;
        const p = 1; // pixel size

        // Outer glow - soft pink (diamond shape)
        this._pixelDiamond(gfx, cx, cy, gem.radius - 1, p, 0xffccdd, 0.15);

        // Main crystal body - dark pink base
        this._pixelDiamond(gfx, cx, cy, gem.radius - 3, p, 0xcc99aa);

        // Brighter pink crystal body
        this._pixelDiamond(gfx, cx, cy, gem.radius - 5, p, 0xffccdd);

        // Upper facet highlight
        this._pixelDiamond(gfx, cx - 2, cy - 3, gem.radius - 10, p, 0xffdde8);

        // Facet lines - create crystalline look
        for (let r = 4; r < gem.radius - 5; r += p) {
            // Diagonal facet cuts
            this._px(gfx, cx - r * 0.7, cy - r * 0.7, p, 0xbb8899, 0.3);
            this._px(gfx, cx + r * 0.7, cy - r * 0.7, p, 0xbb8899, 0.3);
        }

        // Central bright facet
        for (let py = -4; py <= 4; py += p) {
            const hw = 4 - Math.abs(py);
            for (let px = -hw; px <= hw; px += p) {
                this._px(gfx, cx + px, cy + py - 2, p, 0xffeeff, 0.2);
            }
        }

        // Kawaii face
        this._px(gfx, cx - 4, cy - 1, p, 0x774455); // left eye
        this._px(gfx, cx + 4, cy - 1, p, 0x774455); // right eye

        // Small smile
        this._px(gfx, cx - 2, cy + 3, p, 0x774455);
        this._px(gfx, cx, cy + 4, p, 0x774455);
        this._px(gfx, cx + 2, cy + 3, p, 0x774455);

        // Blush marks
        this._px(gfx, cx - 7, cy + 1, p, 0xff8899, 0.5);
        this._px(gfx, cx - 9, cy + 1, p, 0xff8899, 0.3);
        this._px(gfx, cx + 7, cy + 1, p, 0xff8899, 0.5);
        this._px(gfx, cx + 9, cy + 1, p, 0xff8899, 0.3);

        // White sparkle highlight top-left
        this._px(gfx, cx - 6, cy - 8, p, 0xffffff, 1);
        this._px(gfx, cx - 4, cy - 8, p, 0xffffff, 0.7);
        this._px(gfx, cx - 6, cy - 6, p, 0xffffff, 0.7);
        this._px(gfx, cx - 8, cy - 8, p, 0xffffff, 0.4);
        this._px(gfx, cx - 6, cy - 10, p, 0xffffff, 0.4);

        // Small sparkle top-right
        this._px(gfx, cx + 6, cy - 10, p, 0xffffff, 0.5);

        gfx.generateTexture(`fruit_${gem.tier}`, d, d);
        gfx.destroy();
        this.textures.get(`fruit_${gem.tier}`).setFilter(1);
    }

    // ─── TIER 1: AMETIST - Amethyst (radius 30) ───
    _generateAmetist() {
        const gem = FRUIT_TIERS[1];
        const d = gem.radius * 2; // 60
        const gfx = this.add.graphics();
        const cx = gem.radius;
        const cy = gem.radius;
        const p = 1;

        // Outer glow - purple (hexagonal shape)
        this._pixelHex(gfx, cx, cy, gem.radius - 1, p, 0xbb66ff, 0.15);

        // Main body - deep purple base
        this._pixelHex(gfx, cx, cy, gem.radius - 3, p, 0x7733bb);

        // Brighter purple fill
        this._pixelHex(gfx, cx, cy, gem.radius - 5, p, 0xbb66ff);

        // Upper-left lighter facet zone
        this._pixelHex(gfx, cx - 4, cy - 4, gem.radius - 12, p, 0xcc88ff);

        // Facet lines - diagonal crystal cuts
        const facetAngles = [Math.PI * 0.25, Math.PI * 0.75, Math.PI * 1.25, Math.PI * 1.75];
        for (const angle of facetAngles) {
            for (let r = gem.radius * 0.3; r < gem.radius - 6; r += p) {
                const fx = Math.round(cx + Math.cos(angle) * r);
                const fy = Math.round(cy + Math.sin(angle) * r);
                const ddx = fx - cx;
                const ddy = fy - cy;
                if (ddx * ddx + ddy * ddy < (gem.radius - 6) * (gem.radius - 6)) {
                    this._px(gfx, fx, fy, p, 0x6622aa, 0.35);
                }
            }
        }

        // Central diamond-shaped facet highlight
        const centerSize = 8;
        for (let py = -centerSize; py <= centerSize; py += p) {
            const hw = centerSize - Math.abs(py);
            for (let px = -hw; px <= hw; px += p) {
                this._px(gfx, cx + px, cy + py - 3, p, 0xddaaff, 0.18);
            }
        }

        // Hexagonal crystal edge accents on rim
        for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 3) {
            const edgeR = gem.radius - 5;
            const ex = Math.round(cx + Math.cos(angle) * edgeR);
            const ey = Math.round(cy + Math.sin(angle) * edgeR);
            this._px(gfx, ex, ey, p, 0xddaaff, 0.4);
        }

        // Kawaii face - ^_^ closed happy eyes
        // Left eye ^
        this._px(gfx, cx - 8, cy, p, 0x331166);
        this._px(gfx, cx - 6, cy - 2, p, 0x331166);
        this._px(gfx, cx - 4, cy, p, 0x331166);
        // Right eye ^
        this._px(gfx, cx + 4, cy, p, 0x331166);
        this._px(gfx, cx + 6, cy - 2, p, 0x331166);
        this._px(gfx, cx + 8, cy, p, 0x331166);

        // Small smile
        this._px(gfx, cx - 2, cy + 4, p, 0x331166);
        this._px(gfx, cx, cy + 5, p, 0x331166);
        this._px(gfx, cx + 2, cy + 4, p, 0x331166);

        // Blush marks
        this._px(gfx, cx - 11, cy + 2, p, 0xff88aa, 0.45);
        this._px(gfx, cx - 13, cy + 2, p, 0xff88aa, 0.25);
        this._px(gfx, cx + 11, cy + 2, p, 0xff88aa, 0.45);
        this._px(gfx, cx + 13, cy + 2, p, 0xff88aa, 0.25);

        // Sparkle highlight top-left
        this._sparkle(gfx, cx - 12, cy - 12, p, 0xffffff, 0.9);

        // Small sparkle top-right
        this._px(gfx, cx + 10, cy - 14, p, 0xffffff, 0.5);
        this._px(gfx, cx + 14, cy - 8, p, 0xffffff, 0.4);

        gfx.generateTexture(`fruit_${gem.tier}`, d, d);
        gfx.destroy();
        this.textures.get(`fruit_${gem.tier}`).setFilter(1);
    }

    // ─── TIER 2: TOPAZ (radius 42) ───
    _generateTopaz() {
        const gem = FRUIT_TIERS[2];
        const d = gem.radius * 2; // 84
        const gfx = this.add.graphics();
        const cx = gem.radius;
        const cy = gem.radius;
        const p = 1;

        // Outer glow - golden (octagonal shape)
        this._pixelOct(gfx, cx, cy, gem.radius - 1, p, 0xffcc44, 0.15);

        // Main body - deep golden base
        this._pixelOct(gfx, cx, cy, gem.radius - 2, p, 0xaa8822);

        // Brighter golden fill
        this._pixelOct(gfx, cx, cy, gem.radius - 5, p, 0xffcc44);

        // Upper highlight zone
        this._pixelOct(gfx, cx - 5, cy - 6, gem.radius - 16, p, 0xffdd77);

        // Bright inner highlight
        this._pixelOct(gfx, cx - 8, cy - 10, 8, p, 0xffee99, 0.5);

        // Facet lines - geometric cuts
        const facetAngles = [Math.PI * 0.2, Math.PI * 0.5, Math.PI * 0.8, Math.PI * 1.2, Math.PI * 1.5, Math.PI * 1.8];
        for (const angle of facetAngles) {
            for (let r = gem.radius * 0.25; r < gem.radius - 6; r += p) {
                const fx = Math.round(cx + Math.cos(angle) * r);
                const fy = Math.round(cy + Math.sin(angle) * r);
                const ddx = fx - cx;
                const ddy = fy - cy;
                if (ddx * ddx + ddy * ddy < (gem.radius - 6) * (gem.radius - 6)) {
                    this._px(gfx, fx, fy, p, 0x886611, 0.3);
                }
            }
        }

        // Central facet diamond
        const centerSize = 10;
        for (let py = -centerSize; py <= centerSize; py += p) {
            const hw = centerSize - Math.abs(py);
            for (let px = -hw; px <= hw; px += p) {
                this._px(gfx, cx + px, cy + py - 3, p, 0xffeeaa, 0.2);
            }
        }

        // Edge rim highlights
        for (let angle = Math.PI * 0.6; angle < Math.PI * 1.4; angle += 0.05) {
            const r = gem.radius - 5;
            const hx = Math.round(cx + Math.cos(angle) * r);
            const hy = Math.round(cy + Math.sin(angle) * r);
            this._px(gfx, hx, hy, p, 0xffeeaa, 0.3);
        }

        // Subtle fire effect - warm inner glow
        for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2;
            const r = gem.radius * 0.5 + (i % 3) * 4;
            const fx = Math.round(cx + Math.cos(angle) * r);
            const fy = Math.round(cy + Math.sin(angle) * r);
            const ddx = fx - cx;
            const ddy = fy - cy;
            if (ddx * ddx + ddy * ddy < (gem.radius - 6) * (gem.radius - 6)) {
                this._px(gfx, fx, fy, p, 0xffaa22, 0.2);
            }
        }

        // Kawaii face - ^_^ closed happy eyes
        // Left eye ^
        this._px(gfx, cx - 10, cy + 2, p, 0x664400);
        this._px(gfx, cx - 7, cy - 1, p, 0x664400);
        this._px(gfx, cx - 4, cy + 2, p, 0x664400);
        // Right eye ^
        this._px(gfx, cx + 4, cy + 2, p, 0x664400);
        this._px(gfx, cx + 7, cy - 1, p, 0x664400);
        this._px(gfx, cx + 10, cy + 2, p, 0x664400);

        // Smile
        this._px(gfx, cx - 3, cy + 8, p, 0x664400);
        this._px(gfx, cx, cy + 10, p, 0x664400);
        this._px(gfx, cx + 3, cy + 8, p, 0x664400);

        // Blush circles
        this._pixelCircle(gfx, cx - 14, cy + 5, 4, p, 0xff8866, 0.35);
        this._pixelCircle(gfx, cx + 14, cy + 5, 4, p, 0xff8866, 0.35);

        // Sparkle highlights
        this._sparkle(gfx, cx - 16, cy - 18, p, 0xffffff, 0.9);
        this._px(gfx, cx + 14, cy - 20, p, 0xffffff, 0.5);
        this._sparkle(gfx, cx + 18, cy - 14, p, 0xffffff, 0.5);

        gfx.generateTexture(`fruit_${gem.tier}`, d, d);
        gfx.destroy();
        this.textures.get(`fruit_${gem.tier}`).setFilter(1);
    }

    // ─── TIER 3: ZUMRUT - Emerald (radius 55) ───
    _generateZumrut() {
        const gem = FRUIT_TIERS[3];
        const d = gem.radius * 2; // 110
        const gfx = this.add.graphics();
        const cx = gem.radius;
        const cy = gem.radius;
        const p = 1;

        // Outer glow - green (octagonal shape)
        this._pixelOct(gfx, cx, cy, gem.radius - 1, p, 0x44dd88, 0.15);

        // Dark green base
        this._pixelOct(gfx, cx, cy, gem.radius - 2, p, 0x228855);

        // Main emerald green body
        this._pixelOct(gfx, cx, cy, gem.radius - 5, p, 0x44dd88);

        // Lighter upper-left zone
        this._pixelOct(gfx, cx - 8, cy - 8, gem.radius - 18, p, 0x66eeaa);

        // Bright highlight spot
        this._pixelOct(gfx, cx - 12, cy - 14, 10, p, 0x88ffbb, 0.5);

        // Emerald-cut facet pattern (rectangular step-cut style)
        // Horizontal facet lines
        for (let row = -gem.radius + 14; row < gem.radius - 14; row += Math.floor(gem.radius * 0.25)) {
            for (let col = -gem.radius + 10; col < gem.radius - 10; col += p) {
                if (col * col + row * row < (gem.radius - 8) * (gem.radius - 8)) {
                    this._px(gfx, cx + col, cy + row, p, 0x1a7744, 0.3);
                }
            }
        }

        // Diagonal facet cuts
        const facetAngles = [Math.PI * 0.25, Math.PI * 0.75, Math.PI * 1.25, Math.PI * 1.75];
        for (const angle of facetAngles) {
            for (let r = gem.radius * 0.2; r < gem.radius - 7; r += p) {
                const fx = Math.round(cx + Math.cos(angle) * r);
                const fy = Math.round(cy + Math.sin(angle) * r);
                const ddx = fx - cx;
                const ddy = fy - cy;
                if (ddx * ddx + ddy * ddy < (gem.radius - 7) * (gem.radius - 7)) {
                    this._px(gfx, fx, fy, p, 0x1a7744, 0.25);
                }
            }
        }

        // Central facet highlight - diamond
        const centerSize = 14;
        for (let py = -centerSize; py <= centerSize; py += p) {
            const hw = centerSize - Math.abs(py);
            for (let px = -hw; px <= hw; px += p) {
                this._px(gfx, cx + px, cy + py - 4, p, 0xaaffcc, 0.15);
            }
        }

        // Inner crystal inclusions (garden effect typical of emeralds)
        const inclusions = [
            [-10, -4], [8, -8], [-6, 10], [12, 6], [-14, 2],
            [4, -14], [-2, 16], [16, -2], [6, 12],
        ];
        for (const [ix, iy] of inclusions) {
            const ddx = ix * ix + iy * iy;
            if (ddx < (gem.radius - 12) * (gem.radius - 12)) {
                this._px(gfx, cx + ix, cy + iy, p, 0x33bb77, 0.4);
                this._px(gfx, cx + ix + p, cy + iy, p, 0x55ddaa, 0.2);
            }
        }

        // Kawaii face - star-shaped eyes for medium gem
        // Left star eye
        this._px(gfx, cx - 12, cy - 2, p, 0x1a4422);
        this._px(gfx, cx - 12, cy - 5, p, 0x1a4422);
        this._px(gfx, cx - 12, cy + 1, p, 0x1a4422);
        this._px(gfx, cx - 15, cy - 2, p, 0x1a4422);
        this._px(gfx, cx - 9, cy - 2, p, 0x1a4422);
        this._px(gfx, cx - 15, cy - 5, p, 0x1a4422);
        this._px(gfx, cx - 9, cy - 5, p, 0x1a4422);
        this._px(gfx, cx - 12, cy - 2, p, 0xffee44, 0.7);
        this._px(gfx, cx - 12, cy - 5, p, 0xffee44, 0.5);

        // Right star eye
        this._px(gfx, cx + 12, cy - 2, p, 0x1a4422);
        this._px(gfx, cx + 12, cy - 5, p, 0x1a4422);
        this._px(gfx, cx + 12, cy + 1, p, 0x1a4422);
        this._px(gfx, cx + 9, cy - 2, p, 0x1a4422);
        this._px(gfx, cx + 15, cy - 2, p, 0x1a4422);
        this._px(gfx, cx + 9, cy - 5, p, 0x1a4422);
        this._px(gfx, cx + 15, cy - 5, p, 0x1a4422);
        this._px(gfx, cx + 12, cy - 2, p, 0xffee44, 0.7);
        this._px(gfx, cx + 12, cy - 5, p, 0xffee44, 0.5);

        // Happy smile
        this._px(gfx, cx - 9, cy + 10, p, 0x1a4422);
        this._px(gfx, cx - 6, cy + 13, p, 0x1a4422);
        this._px(gfx, cx - 3, cy + 14, p, 0x1a4422);
        this._px(gfx, cx, cy + 15, p, 0x1a4422);
        this._px(gfx, cx + 3, cy + 14, p, 0x1a4422);
        this._px(gfx, cx + 6, cy + 13, p, 0x1a4422);
        this._px(gfx, cx + 9, cy + 10, p, 0x1a4422);

        // Blush
        this._pixelCircle(gfx, cx - 18, cy + 6, 6, p, 0xff7788, 0.3);
        this._pixelCircle(gfx, cx + 18, cy + 6, 6, p, 0xff7788, 0.3);

        // Sparkle effects
        this._sparkle(gfx, cx - 22, cy - 26, p, 0xffffff, 0.9);
        this._sparkle(gfx, cx + 24, cy - 22, p, 0xffffff, 0.6);
        this._sparkle(gfx, cx - 26, cy + 18, p, 0xffffff, 0.5);
        this._px(gfx, cx + 20, cy + 22, p, 0xffffff, 0.4);
        this._px(gfx, cx - 8, cy - 30, p, 0xffffff, 0.5);

        gfx.generateTexture(`fruit_${gem.tier}`, d, d);
        gfx.destroy();
        this.textures.get(`fruit_${gem.tier}`).setFilter(1);
    }

    // ─── TIER 4: YAKUT - Ruby (radius 70) ───
    _generateYakut() {
        const gem = FRUIT_TIERS[4];
        const d = gem.radius * 2; // 140
        const gfx = this.add.graphics();
        const cx = gem.radius;
        const cy = gem.radius;
        const p = 1;

        // Outer glow - deep red (hexagonal shape)
        this._pixelHex(gfx, cx, cy, gem.radius - 1, p, 0xff4455, 0.15);

        // Dark red base
        this._pixelHex(gfx, cx, cy, gem.radius - 2, p, 0x882233);

        // Main ruby red body
        this._pixelHex(gfx, cx, cy, gem.radius - 5, p, 0xff4455);

        // Slightly brighter central area
        this._pixelHex(gfx, cx, cy, gem.radius - 12, p, 0xff5566);

        // Upper-left highlight zone
        this._pixelHex(gfx, cx - 10, cy - 10, gem.radius - 24, p, 0xff7788);

        // Bright highlight spot
        this._pixelHex(gfx, cx - 14, cy - 16, 10, p, 0xff99aa, 0.5);

        // Facet lines - ruby brilliant cut pattern
        const facetAngles = [0, Math.PI * 0.25, Math.PI * 0.5, Math.PI * 0.75,
            Math.PI, Math.PI * 1.25, Math.PI * 1.5, Math.PI * 1.75];
        for (const angle of facetAngles) {
            for (let r = gem.radius * 0.15; r < gem.radius - 7; r += p) {
                const fx = Math.round(cx + Math.cos(angle) * r);
                const fy = Math.round(cy + Math.sin(angle) * r);
                const ddx = fx - cx;
                const ddy = fy - cy;
                if (ddx * ddx + ddy * ddy < (gem.radius - 7) * (gem.radius - 7)) {
                    this._px(gfx, fx, fy, p, 0x661122, 0.25);
                }
            }
        }

        // Central table facet (large diamond)
        const centerSize = 18;
        for (let py = -centerSize; py <= centerSize; py += p) {
            const hw = centerSize - Math.abs(py);
            for (let px = -hw; px <= hw; px += p) {
                this._px(gfx, cx + px, cy + py - 4, p, 0xffaabb, 0.12);
            }
        }

        // Internal fire - warm glowing patches
        const fireSpots = [
            [-12, -8, 0xff6644], [10, -12, 0xff5533], [-8, 12, 0xff7744],
            [14, 8, 0xff6644], [0, -18, 0xff5533], [-18, 4, 0xff7744],
        ];
        for (const [fx, fy, fc] of fireSpots) {
            const ddx = fx * fx + fy * fy;
            if (ddx < (gem.radius - 14) * (gem.radius - 14)) {
                this._pixelCircle(gfx, cx + fx, cy + fy, 6, p, fc, 0.15);
            }
        }

        // Edge rim highlights (pigeon blood glow)
        for (let angle = Math.PI * 0.65; angle < Math.PI * 1.35; angle += 0.04) {
            const r = gem.radius - 6;
            const hx = Math.round(cx + Math.cos(angle) * r);
            const hy = Math.round(cy + Math.sin(angle) * r);
            this._px(gfx, hx, hy, p, 0xffbbcc, 0.25);
        }

        // Kawaii face - determined/confident open eyes
        // Left eye
        this._pixelCircle(gfx, cx - 16, cy - 6, 5, p, 0x440011);
        this._px(gfx, cx - 18, cy - 9, p, 0xffffff, 0.9);
        this._px(gfx, cx - 15, cy - 8, p, 0xffffff, 0.5);

        // Right eye
        this._pixelCircle(gfx, cx + 16, cy - 6, 5, p, 0x440011);
        this._px(gfx, cx + 14, cy - 9, p, 0xffffff, 0.9);
        this._px(gfx, cx + 17, cy - 8, p, 0xffffff, 0.5);

        // Confident eyebrows
        for (let i = 0; i < 4; i++) {
            this._px(gfx, cx - 22 + i * p, cy - 16 + i, p, 0x440011, 0.8);
        }
        for (let i = 0; i < 4; i++) {
            this._px(gfx, cx + 22 - i * p, cy - 16 + i, p, 0x440011, 0.8);
        }

        // Wide confident smile
        this._px(gfx, cx - 12, cy + 10, p, 0x440011);
        this._px(gfx, cx - 9, cy + 14, p, 0x440011);
        this._px(gfx, cx - 6, cy + 16, p, 0x440011);
        this._px(gfx, cx - 3, cy + 17, p, 0x440011);
        this._px(gfx, cx, cy + 18, p, 0x440011);
        this._px(gfx, cx + 3, cy + 17, p, 0x440011);
        this._px(gfx, cx + 6, cy + 16, p, 0x440011);
        this._px(gfx, cx + 9, cy + 14, p, 0x440011);
        this._px(gfx, cx + 12, cy + 10, p, 0x440011);
        // Upper lip line
        this._px(gfx, cx - 9, cy + 10, p, 0x440011);
        this._px(gfx, cx - 6, cy + 11, p, 0x440011);
        this._px(gfx, cx - 3, cy + 11, p, 0x440011);
        this._px(gfx, cx, cy + 11, p, 0x440011);
        this._px(gfx, cx + 3, cy + 11, p, 0x440011);
        this._px(gfx, cx + 6, cy + 11, p, 0x440011);
        this._px(gfx, cx + 9, cy + 10, p, 0x440011);

        // Blush cheeks
        this._pixelCircle(gfx, cx - 26, cy + 4, 6, p, 0xff8899, 0.3);
        this._pixelCircle(gfx, cx + 26, cy + 4, 6, p, 0xff8899, 0.3);

        // Sparkle highlights
        this._sparkle(gfx, cx - 30, cy - 36, p, 0xffffff, 0.9);
        this._sparkle(gfx, cx + 32, cy - 30, p, 0xffffff, 0.7);
        this._sparkle(gfx, cx - 34, cy + 24, p, 0xffffff, 0.5);
        this._sparkle(gfx, cx + 28, cy + 28, p, 0xffffff, 0.4);
        this._px(gfx, cx - 20, cy - 44, p, 0xffffff, 0.6);
        this._px(gfx, cx + 40, cy - 10, p, 0xffffff, 0.4);
        this._px(gfx, cx, cy - 48, p, 0xffffff, 0.5);

        gfx.generateTexture(`fruit_${gem.tier}`, d, d);
        gfx.destroy();
        this.textures.get(`fruit_${gem.tier}`).setFilter(1);
    }

    // ─── TIER 5: SAFIR - Sapphire (radius 82) ───
    _generateSafir() {
        const gem = FRUIT_TIERS[5];
        const d = gem.radius * 2; // 164
        const gfx = this.add.graphics();
        const cx = gem.radius;
        const cy = gem.radius;
        const p = 1;

        // Outer glow - blue (octagonal shape)
        this._pixelOct(gfx, cx, cy, gem.radius - 1, p, 0x4488ff, 0.15);

        // Dark blue base
        this._pixelOct(gfx, cx, cy, gem.radius - 2, p, 0x224488);

        // Main sapphire blue body
        this._pixelOct(gfx, cx, cy, gem.radius - 5, p, 0x4488ff);

        // Lighter blue central zone
        this._pixelOct(gfx, cx, cy, gem.radius - 14, p, 0x5599ff);

        // Upper-left highlight
        this._pixelOct(gfx, cx - 10, cy - 12, gem.radius - 28, p, 0x77bbff);
        this._pixelOct(gfx, cx - 16, cy - 18, 12, p, 0x99ccff, 0.5);

        // Star sapphire asterism effect (6-rayed star)
        for (let rayIdx = 0; rayIdx < 3; rayIdx++) {
            const angle = (rayIdx / 3) * Math.PI;
            for (let r = 4; r < gem.radius - 10; r += p) {
                // Ray in one direction
                const fx1 = Math.round(cx + Math.cos(angle) * r);
                const fy1 = Math.round(cy + Math.sin(angle) * r);
                // Ray in opposite direction
                const fx2 = Math.round(cx - Math.cos(angle) * r);
                const fy2 = Math.round(cy - Math.sin(angle) * r);
                const fadeAlpha = 0.2 * (1 - r / (gem.radius - 10));
                const d1 = (fx1 - cx) * (fx1 - cx) + (fy1 - cy) * (fy1 - cy);
                const d2 = (fx2 - cx) * (fx2 - cx) + (fy2 - cy) * (fy2 - cy);
                if (d1 < (gem.radius - 6) * (gem.radius - 6)) {
                    this._px(gfx, fx1, fy1, p, 0xaaddff, fadeAlpha);
                }
                if (d2 < (gem.radius - 6) * (gem.radius - 6)) {
                    this._px(gfx, fx2, fy2, p, 0xaaddff, fadeAlpha);
                }
            }
        }

        // Facet lines - brilliant cut
        const facetAngles = [Math.PI * 0.17, Math.PI * 0.5, Math.PI * 0.83,
            Math.PI * 1.17, Math.PI * 1.5, Math.PI * 1.83];
        for (const angle of facetAngles) {
            for (let r = gem.radius * 0.2; r < gem.radius - 8; r += p) {
                const fx = Math.round(cx + Math.cos(angle) * r);
                const fy = Math.round(cy + Math.sin(angle) * r);
                const ddx = fx - cx;
                const ddy = fy - cy;
                if (ddx * ddx + ddy * ddy < (gem.radius - 7) * (gem.radius - 7)) {
                    this._px(gfx, fx, fy, p, 0x113366, 0.3);
                }
            }
        }

        // Central table facet
        const centerSize = 20;
        for (let py = -centerSize; py <= centerSize; py += p) {
            const hw = centerSize - Math.abs(py);
            for (let px = -hw; px <= hw; px += p) {
                this._px(gfx, cx + px, cy + py - 4, p, 0xbbddff, 0.1);
            }
        }

        // Deep blue depth zones
        const depthSpots = [
            [-15, 10], [18, -8], [-8, -18], [12, 14], [-20, -4], [22, 6],
        ];
        for (const [dx, dy] of depthSpots) {
            this._pixelCircle(gfx, cx + dx, cy + dy, 8, p, 0x2244aa, 0.2);
        }

        // Kawaii face - open sparkly eyes
        // Left eye
        this._pixelCircle(gfx, cx - 18, cy - 6, 6, p, 0x112244);
        this._px(gfx, cx - 21, cy - 10, p, 0xffffff, 0.9);
        this._px(gfx, cx - 18, cy - 9, p, 0xffffff, 0.6);
        this._px(gfx, cx - 15, cy - 3, p, 0xffffff, 0.4);

        // Right eye
        this._pixelCircle(gfx, cx + 18, cy - 6, 6, p, 0x112244);
        this._px(gfx, cx + 15, cy - 10, p, 0xffffff, 0.9);
        this._px(gfx, cx + 18, cy - 9, p, 0xffffff, 0.6);
        this._px(gfx, cx + 21, cy - 3, p, 0xffffff, 0.4);

        // Happy smile curve
        this._px(gfx, cx - 9, cy + 10, p, 0x112244);
        this._px(gfx, cx - 6, cy + 13, p, 0x112244);
        this._px(gfx, cx - 3, cy + 14, p, 0x112244);
        this._px(gfx, cx, cy + 15, p, 0x112244);
        this._px(gfx, cx + 3, cy + 14, p, 0x112244);
        this._px(gfx, cx + 6, cy + 13, p, 0x112244);
        this._px(gfx, cx + 9, cy + 10, p, 0x112244);

        // Blush
        this._pixelCircle(gfx, cx - 28, cy + 4, 6, p, 0xff88aa, 0.3);
        this._pixelCircle(gfx, cx + 28, cy + 4, 6, p, 0xff88aa, 0.3);

        // Sparkle highlights around the gem
        this._sparkle(gfx, cx - 34, cy - 38, p, 0xffffff, 0.9);
        this._sparkle(gfx, cx + 36, cy - 32, p, 0xffffff, 0.7);
        this._sparkle(gfx, cx - 36, cy + 28, p, 0xffffff, 0.5);
        this._sparkle(gfx, cx + 32, cy + 30, p, 0xffffff, 0.4);
        this._px(gfx, cx - 24, cy - 48, p, 0xffffff, 0.6);
        this._px(gfx, cx + 44, cy - 12, p, 0xffffff, 0.4);
        this._px(gfx, cx, cy - 52, p, 0xffffff, 0.5);

        gfx.generateTexture(`fruit_${gem.tier}`, d, d);
        gfx.destroy();
        this.textures.get(`fruit_${gem.tier}`).setFilter(1);
    }

    // ─── TIER 6: ELMAS - Diamond (radius 95) ───
    _generateElmas() {
        const gem = FRUIT_TIERS[6];
        const d = gem.radius * 2; // 190
        const gfx = this.add.graphics();
        const cx = gem.radius;
        const cy = gem.radius;
        const p = 1;

        // Outer glow - brilliant white (octagonal shape)
        this._pixelOct(gfx, cx, cy, gem.radius - 1, p, 0xeeeeff, 0.2);

        // Pale icy blue base layer
        this._pixelOct(gfx, cx, cy, gem.radius - 2, p, 0xbbccdd);

        // Main diamond white body
        this._pixelOct(gfx, cx, cy, gem.radius - 5, p, 0xeeeeff);

        // Slightly warmer white center
        this._pixelOct(gfx, cx, cy, gem.radius - 14, p, 0xf4f4ff);

        // Upper highlight - pure bright white
        this._pixelOct(gfx, cx - 8, cy - 10, gem.radius - 28, p, 0xffffff);
        this._pixelOct(gfx, cx - 16, cy - 20, 14, p, 0xffffff, 0.7);

        // Diamond fire - rainbow refraction patches scattered inside
        const firePatches = [
            [-18, -12, 0xffaaaa], [14, -16, 0xaaffaa], [-10, 14, 0xaaaaff],
            [20, 8, 0xffffaa], [-22, 6, 0xffaaff], [6, -22, 0xaaffff],
            [16, 18, 0xffccaa], [-14, 20, 0xccaaff], [0, -26, 0xffaacc],
            [24, -4, 0xaaffcc], [-6, 24, 0xccffaa], [10, 10, 0xffddaa],
        ];
        for (const [fx, fy, fc] of firePatches) {
            const ddx = fx * fx + fy * fy;
            if (ddx < (gem.radius - 16) * (gem.radius - 16)) {
                this._pixelCircle(gfx, cx + fx, cy + fy, 6, p, fc, 0.12);
            }
        }

        // Brilliant-cut facet lines (many precise cuts)
        for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2;
            for (let r = gem.radius * 0.1; r < gem.radius - 8; r += p) {
                const fx = Math.round(cx + Math.cos(angle) * r);
                const fy = Math.round(cy + Math.sin(angle) * r);
                const ddx = fx - cx;
                const ddy = fy - cy;
                if (ddx * ddx + ddy * ddy < (gem.radius - 7) * (gem.radius - 7)) {
                    this._px(gfx, fx, fy, p, 0xbbbbcc, 0.2);
                }
            }
        }

        // Central table - large octagonal facet
        const centerSize = 24;
        for (let py = -centerSize; py <= centerSize; py += p) {
            const hw = centerSize - Math.abs(py);
            for (let px = -hw; px <= hw; px += p) {
                this._px(gfx, cx + px, cy + py - 4, p, 0xffffff, 0.12);
            }
        }

        // Concentric facet rings
        for (let ring = 0; ring < 3; ring++) {
            const ringR = gem.radius * (0.4 + ring * 0.18);
            for (let angle = 0; angle < Math.PI * 2; angle += 0.04) {
                const rx = Math.round(cx + Math.cos(angle) * ringR);
                const ry = Math.round(cy + Math.sin(angle) * ringR);
                const ddx = rx - cx;
                const ddy = ry - cy;
                if (ddx * ddx + ddy * ddy < (gem.radius - 6) * (gem.radius - 6)) {
                    this._px(gfx, rx, ry, p, 0xccccdd, 0.15);
                }
            }
        }

        // Edge brilliance - bright rim at upper portion
        for (let angle = Math.PI * 0.6; angle < Math.PI * 1.4; angle += 0.03) {
            const r = gem.radius - 5;
            const hx = Math.round(cx + Math.cos(angle) * r);
            const hy = Math.round(cy + Math.sin(angle) * r);
            this._px(gfx, hx, hy, p, 0xffffff, 0.35);
        }

        // Kawaii face - big sparkling anime eyes
        // Left eye
        this._pixelCircle(gfx, cx - 20, cy - 6, 8, p, 0x556688);
        this._pixelCircle(gfx, cx - 20, cy - 6, 5, p, 0x334466);
        this._px(gfx, cx - 24, cy - 11, p, 0xffffff, 0.95);
        this._px(gfx, cx - 20, cy - 10, p, 0xffffff, 0.6);
        this._px(gfx, cx - 17, cy - 2, p, 0xffffff, 0.4);

        // Right eye
        this._pixelCircle(gfx, cx + 20, cy - 6, 8, p, 0x556688);
        this._pixelCircle(gfx, cx + 20, cy - 6, 5, p, 0x334466);
        this._px(gfx, cx + 16, cy - 11, p, 0xffffff, 0.95);
        this._px(gfx, cx + 20, cy - 10, p, 0xffffff, 0.6);
        this._px(gfx, cx + 23, cy - 2, p, 0xffffff, 0.4);

        // Cat mouth :3
        this._px(gfx, cx, cy + 10, p, 0x556688);
        this._px(gfx, cx - 6, cy + 14, p, 0x556688);
        this._px(gfx, cx - 3, cy + 16, p, 0x556688);
        this._px(gfx, cx + 3, cy + 16, p, 0x556688);
        this._px(gfx, cx + 6, cy + 14, p, 0x556688);

        // Blush circles
        this._pixelCircle(gfx, cx - 32, cy + 6, 7, p, 0xff8899, 0.3);
        this._pixelCircle(gfx, cx + 32, cy + 6, 7, p, 0xff8899, 0.3);

        // Many sparkle highlights for diamond brilliance
        this._sparkle(gfx, cx - 38, cy - 44, p, 0xffffff, 1.0);
        this._sparkle(gfx, cx + 40, cy - 38, p, 0xffffff, 0.9);
        this._sparkle(gfx, cx - 40, cy + 30, p, 0xffffff, 0.7);
        this._sparkle(gfx, cx + 36, cy + 34, p, 0xffffff, 0.6);
        this._sparkle(gfx, cx, cy - 54, p, 0xffffff, 0.8);
        this._sparkle(gfx, cx - 48, cy - 10, p, 0xffffff, 0.5);
        this._sparkle(gfx, cx + 48, cy + 8, p, 0xffffff, 0.4);
        this._px(gfx, cx - 28, cy - 52, p, 0xffffff, 0.7);
        this._px(gfx, cx + 46, cy - 20, p, 0xffffff, 0.5);
        this._px(gfx, cx - 10, cy + 50, p, 0xffffff, 0.4);
        this._px(gfx, cx + 20, cy - 56, p, 0xffffff, 0.6);

        gfx.generateTexture(`fruit_${gem.tier}`, d, d);
        gfx.destroy();
        this.textures.get(`fruit_${gem.tier}`).setFilter(1);
    }

    // ─── TIER 7: YILDIZ TASI - Star Stone (radius 108) ───
    _generateYildizTasi() {
        const gem = FRUIT_TIERS[7];
        const d = gem.radius * 2; // 216
        const gfx = this.add.graphics();
        const cx = gem.radius;
        const cy = gem.radius;
        const p = 1;

        // Outer cosmic glow - layered rainbow
        this._pixelCircle(gfx, cx, cy, gem.radius - 1, p, 0xffaaff, 0.12);
        this._pixelCircle(gfx, cx + 4, cy - 4, gem.radius - 1, p, 0xaaddff, 0.06);
        this._pixelCircle(gfx, cx - 4, cy + 4, gem.radius - 1, p, 0xffddaa, 0.06);

        // Dark cosmic base
        this._pixelCircle(gfx, cx, cy, gem.radius - 2, p, 0x885599);

        // Main body - luminous pink/purple
        this._pixelCircle(gfx, cx, cy, gem.radius - 5, p, 0xffaaff);

        // Lighter central area
        this._pixelCircle(gfx, cx, cy, gem.radius - 16, p, 0xffbbff);

        // Upper highlight
        this._pixelCircle(gfx, cx - 10, cy - 12, gem.radius - 32, p, 0xffccff);
        this._pixelCircle(gfx, cx - 18, cy - 22, 16, p, 0xffddff, 0.6);

        // Rainbow/cosmic color zones swirling inside
        const cosmicColors = [
            { angle: 0, color: 0xff8888 },         // red zone
            { angle: Math.PI * 0.33, color: 0xffcc66 },  // orange/gold
            { angle: Math.PI * 0.67, color: 0x88ff88 },  // green
            { angle: Math.PI, color: 0x88ccff },        // blue
            { angle: Math.PI * 1.33, color: 0xcc88ff },  // purple
            { angle: Math.PI * 1.67, color: 0xff88cc },  // pink
        ];
        for (const zone of cosmicColors) {
            for (let r = 10; r < gem.radius - 20; r += p * 2) {
                const spread = 0.3;
                for (let a = zone.angle - spread; a < zone.angle + spread; a += 0.06) {
                    const wave = Math.sin(r * 0.06 + a * 3) * 6;
                    const zx = Math.round(cx + Math.cos(a) * (r + wave));
                    const zy = Math.round(cy + Math.sin(a) * (r + wave));
                    const ddx = zx - cx;
                    const ddy = zy - cy;
                    if (ddx * ddx + ddy * ddy < (gem.radius - 8) * (gem.radius - 8)) {
                        const fadeAlpha = 0.12 * (1 - r / (gem.radius - 20));
                        this._px(gfx, zx, zy, p, zone.color, fadeAlpha);
                    }
                }
            }
        }

        // Star asterism - 6-pointed star pattern (stronger than sapphire)
        for (let rayIdx = 0; rayIdx < 6; rayIdx++) {
            const angle = (rayIdx / 6) * Math.PI * 2;
            for (let r = 6; r < gem.radius - 12; r += p) {
                const fx = Math.round(cx + Math.cos(angle) * r);
                const fy = Math.round(cy + Math.sin(angle) * r);
                const ddx = fx - cx;
                const ddy = fy - cy;
                if (ddx * ddx + ddy * ddy < (gem.radius - 8) * (gem.radius - 8)) {
                    const fadeAlpha = 0.25 * (1 - r / (gem.radius - 12));
                    this._px(gfx, fx, fy, p, 0xffffff, fadeAlpha);
                    // Wider rays near center
                    if (r < gem.radius * 0.5) {
                        const perpX = Math.round(-Math.sin(angle) * p);
                        const perpY = Math.round(Math.cos(angle) * p);
                        this._px(gfx, fx + perpX, fy + perpY, p, 0xffffff, fadeAlpha * 0.5);
                        this._px(gfx, fx - perpX, fy - perpY, p, 0xffffff, fadeAlpha * 0.5);
                    }
                }
            }
        }

        // Facet lines - 12-fold symmetry
        for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2;
            for (let r = gem.radius * 0.15; r < gem.radius - 8; r += p) {
                const fx = Math.round(cx + Math.cos(angle) * r);
                const fy = Math.round(cy + Math.sin(angle) * r);
                const ddx = fx - cx;
                const ddy = fy - cy;
                if (ddx * ddx + ddy * ddy < (gem.radius - 8) * (gem.radius - 8)) {
                    this._px(gfx, fx, fy, p, 0x774488, 0.2);
                }
            }
        }

        // Central table facet - large
        const centerSize = 28;
        for (let py = -centerSize; py <= centerSize; py += p) {
            const hw = centerSize - Math.abs(py);
            for (let px = -hw; px <= hw; px += p) {
                this._px(gfx, cx + px, cy + py - 4, p, 0xffeeff, 0.1);
            }
        }

        // Scattered cosmic sparkle dots inside the gem (like tiny stars)
        const cosmicDots = [
            [-20, -18], [22, -14], [-16, 20], [18, 16], [-28, 4],
            [26, -6], [-8, -28], [10, 24], [-24, -12], [30, 10],
            [0, -30], [-12, 28], [20, 20], [-30, -8], [14, -26],
            [-4, 30], [28, -18], [-22, 16], [8, -8], [-8, 8],
        ];
        for (const [dx, dy] of cosmicDots) {
            const ddx = dx * dx + dy * dy;
            if (ddx < (gem.radius - 14) * (gem.radius - 14)) {
                const dotColor = ((dx + dy + 200) % 3 === 0) ? 0xffffff :
                    ((dx + dy + 200) % 3 === 1) ? 0xffddff : 0xddddff;
                this._px(gfx, cx + dx, cy + dy, p, dotColor, 0.3 + Math.random() * 0.2);
            }
        }

        // Edge brilliance with color shifting
        for (let angle = 0; angle < Math.PI * 2; angle += 0.03) {
            const r = gem.radius - 6;
            const hx = Math.round(cx + Math.cos(angle) * r);
            const hy = Math.round(cy + Math.sin(angle) * r);
            const colorIdx = Math.floor((angle / (Math.PI * 2)) * 6);
            const edgeColors = [0xffaaaa, 0xffddaa, 0xaaffaa, 0xaaddff, 0xccaaff, 0xffaadd];
            this._px(gfx, hx, hy, p, edgeColors[colorIdx], 0.2);
        }

        // Kawaii face - huge sparkling anime eyes with star catches
        // Left eye
        this._pixelCircle(gfx, cx - 24, cy - 6, 9, p, 0x663377);
        this._pixelCircle(gfx, cx - 24, cy - 6, 6, p, 0x331144);
        // Star-shaped eye highlights
        this._px(gfx, cx - 28, cy - 12, p, 0xffffff, 0.95);
        this._px(gfx, cx - 26, cy - 10, p, 0xffffff, 0.8);
        this._px(gfx, cx - 24, cy - 8, p, 0xffffff, 0.6);
        this._px(gfx, cx - 21, cy - 2, p, 0xffffff, 0.4);
        // Small star catch
        this._px(gfx, cx - 20, cy - 10, p, 0xffffff, 0.5);

        // Right eye
        this._pixelCircle(gfx, cx + 24, cy - 6, 9, p, 0x663377);
        this._pixelCircle(gfx, cx + 24, cy - 6, 6, p, 0x331144);
        this._px(gfx, cx + 20, cy - 12, p, 0xffffff, 0.95);
        this._px(gfx, cx + 22, cy - 10, p, 0xffffff, 0.8);
        this._px(gfx, cx + 24, cy - 8, p, 0xffffff, 0.6);
        this._px(gfx, cx + 27, cy - 2, p, 0xffffff, 0.4);
        this._px(gfx, cx + 28, cy - 10, p, 0xffffff, 0.5);

        // Cat mouth :3
        this._px(gfx, cx, cy + 12, p, 0x663377);
        this._px(gfx, cx - 9, cy + 18, p, 0x663377);
        this._px(gfx, cx - 6, cy + 20, p, 0x663377);
        this._px(gfx, cx - 3, cy + 21, p, 0x663377);
        this._px(gfx, cx + 3, cy + 21, p, 0x663377);
        this._px(gfx, cx + 6, cy + 20, p, 0x663377);
        this._px(gfx, cx + 9, cy + 18, p, 0x663377);

        // Blush circles
        this._pixelCircle(gfx, cx - 36, cy + 8, 8, p, 0xff88aa, 0.3);
        this._pixelCircle(gfx, cx + 36, cy + 8, 8, p, 0xff88aa, 0.3);

        // Many sparkles for maximum cosmic brilliance
        this._sparkle(gfx, cx - 44, cy - 50, p, 0xffffff, 1.0);
        this._sparkle(gfx, cx + 46, cy - 44, p, 0xffffff, 0.9);
        this._sparkle(gfx, cx - 46, cy + 36, p, 0xffffff, 0.7);
        this._sparkle(gfx, cx + 42, cy + 40, p, 0xffffff, 0.6);
        this._sparkle(gfx, cx, cy - 60, p, 0xffffff, 0.85);
        this._sparkle(gfx, cx - 54, cy - 14, p, 0xffffff, 0.5);
        this._sparkle(gfx, cx + 54, cy + 10, p, 0xffffff, 0.45);
        this._sparkle(gfx, cx - 20, cy + 52, p, 0xffffff, 0.4);
        this._sparkle(gfx, cx + 24, cy - 58, p, 0xffffff, 0.55);
        // Rainbow-tinted sparkles
        this._sparkle(gfx, cx - 36, cy - 30, p, 0xffaaaa, 0.4);
        this._sparkle(gfx, cx + 38, cy - 18, p, 0xaaddff, 0.4);
        this._sparkle(gfx, cx - 30, cy + 26, p, 0xaaffaa, 0.35);
        this._sparkle(gfx, cx + 34, cy + 22, p, 0xffddaa, 0.35);

        // Extra loose sparkle dots
        this._px(gfx, cx - 32, cy - 58, p, 0xffffff, 0.7);
        this._px(gfx, cx + 50, cy - 28, p, 0xffffff, 0.5);
        this._px(gfx, cx - 14, cy + 58, p, 0xffffff, 0.4);
        this._px(gfx, cx + 56, cy + 2, p, 0xffffff, 0.3);

        gfx.generateTexture(`fruit_${gem.tier}`, d, d);
        gfx.destroy();
        this.textures.get(`fruit_${gem.tier}`).setFilter(1);
    }

    // ─── BACKGROUND: ANIME INDIGO-TO-PURPLE GRADIENT (optimized) ───
    _generateAnimeBackground() {
        const W = 600;
        const H = 780;
        const gfx = this.add.graphics();

        // Base gradient: soft lavender top to muted purple bottom
        for (let y = 0; y < H; y++) {
            const t = y / H;
            const r = Math.floor(0x68 + (0x52 - 0x68) * t);
            const g = Math.floor(0x58 + (0x40 - 0x58) * t);
            const b = Math.floor(0xa8 + (0x90 - 0xa8) * t);
            gfx.fillStyle((r << 16) | (g << 8) | b, 1);
            gfx.fillRect(0, y, W, 1);
        }

        // Soft bokeh circles - concentric rings for radial fade (~120 calls vs ~200,000)
        const bokehCircles = [
            [100, 200, 60, 0xff4d94, 0.10],
            [480, 150, 80, 0x3dffd4, 0.08],
            [300, 500, 70, 0xff70b0, 0.09],
            [50, 600, 50, 0x3dcce8, 0.10],
            [520, 450, 65, 0xcc7aff, 0.08],
            [200, 100, 55, 0x7a9dff, 0.09],
            [400, 700, 75, 0xff4d94, 0.08],
            [150, 400, 45, 0x3dffd4, 0.10],
            [500, 650, 55, 0xcc7aff, 0.08],
            [350, 300, 50, 0xff70b0, 0.07],
        ];
        for (const [bx, by, br, bc, ba] of bokehCircles) {
            const steps = 12;
            for (let i = steps; i > 0; i--) {
                const stepR = br * (i / steps);
                const dist = 1 - (i / steps);
                const alpha = ba * (1 - dist * dist);
                if (alpha > 0.005) {
                    gfx.fillStyle(bc, alpha);
                    gfx.fillCircle(bx, by, stepR);
                }
            }
        }

        // Small twinkling stars
        const stars = [
            [45, 80], [120, 40], [200, 65], [310, 30], [420, 55],
            [530, 70], [80, 160], [250, 140], [370, 130], [490, 180],
            [60, 280], [180, 250], [340, 270], [460, 240], [560, 300],
            [30, 380], [150, 350], [280, 390], [430, 370], [550, 420],
            [90, 480], [220, 460], [360, 500], [500, 510], [570, 550],
            [40, 580], [170, 620], [300, 600], [440, 630], [560, 660],
            [100, 700], [250, 720], [400, 690], [520, 740], [80, 750],
            [350, 180], [475, 90], [55, 510], [260, 550], [410, 460],
        ];
        for (const [sx, sy] of stars) {
            const brightness = 0.5 + ((sx * 7 + sy * 13) % 100) / 120;
            gfx.fillStyle(0xffffff, brightness);
            gfx.fillRect(sx, sy, 1, 1);
            gfx.fillStyle(0xffffff, brightness * 0.4);
            gfx.fillRect(sx - 1, sy, 1, 1);
            gfx.fillRect(sx + 1, sy, 1, 1);
            gfx.fillRect(sx, sy - 1, 1, 1);
            gfx.fillRect(sx, sy + 1, 1, 1);
        }

        // Scattered sakura petals
        const petals = [
            [70, 120], [180, 80], [320, 150], [450, 100], [540, 200],
            [30, 300], [200, 340], [380, 280], [510, 350], [100, 430],
            [280, 470], [420, 520], [560, 480], [60, 570], [230, 610],
            [370, 640], [490, 590], [150, 700], [340, 730], [470, 710],
            [40, 190], [260, 220], [500, 270], [120, 520], [390, 400],
        ];
        for (const [px, py] of petals) {
            const petalAlpha = 0.2 + ((px * 3 + py * 11) % 100) / 400;
            const petalColor = ((px + py) % 3 === 0) ? 0xff70b0 : ((px + py) % 3 === 1) ? 0xff4d94 : 0xcc7aff;
            const rot = (px * 7 + py * 3) % 4;
            gfx.fillStyle(petalColor, petalAlpha);
            gfx.fillRect(px, py, 1, 1);
            if (rot === 0) {
                gfx.fillStyle(petalColor, petalAlpha * 0.8);
                gfx.fillRect(px + 1, py, 1, 1);
                gfx.fillStyle(petalColor, petalAlpha * 0.6);
                gfx.fillRect(px - 1, py, 1, 1);
                gfx.fillStyle(petalColor, petalAlpha * 0.5);
                gfx.fillRect(px, py - 1, 1, 1);
            } else if (rot === 1) {
                gfx.fillStyle(petalColor, petalAlpha * 0.8);
                gfx.fillRect(px, py + 1, 1, 1);
                gfx.fillStyle(petalColor, petalAlpha * 0.6);
                gfx.fillRect(px, py - 1, 1, 1);
                gfx.fillStyle(petalColor, petalAlpha * 0.5);
                gfx.fillRect(px + 1, py, 1, 1);
            } else if (rot === 2) {
                gfx.fillStyle(petalColor, petalAlpha * 0.7);
                gfx.fillRect(px + 1, py + 1, 1, 1);
                gfx.fillStyle(petalColor, petalAlpha * 0.5);
                gfx.fillRect(px - 1, py - 1, 1, 1);
            } else {
                gfx.fillStyle(petalColor, petalAlpha * 0.7);
                gfx.fillRect(px + 1, py - 1, 1, 1);
                gfx.fillStyle(petalColor, petalAlpha * 0.6);
                gfx.fillRect(px - 1, py + 1, 1, 1);
                gfx.fillStyle(petalColor, petalAlpha * 0.4);
                gfx.fillRect(px + 1, py + 1, 1, 1);
            }
        }

        // Subtle vertical light rays - row-by-row fills (~1500 calls vs ~30,000)
        for (let ray = 0; ray < 5; ray++) {
            const rayX = 150 + ray * 80;
            const rayWidth = 20 + ray * 4;
            for (let y = 0; y < 300; y++) {
                const alpha = (1 - y / 300) * 0.05;
                gfx.fillStyle(0xcc7aff, alpha);
                gfx.fillRect(Math.max(0, rayX - rayWidth / 2), y, rayWidth, 1);
            }
        }

        gfx.generateTexture('bg_parchment', W, H);
        gfx.destroy();
    }
}
