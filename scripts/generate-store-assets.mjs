import { writeFileSync, mkdirSync, copyFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { deflateSync } from 'zlib';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const assetsDir = resolve(root, 'docs/assets');
mkdirSync(assetsDir, { recursive: true });

// CRC32 table
const crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[i] = c >>> 0;
}

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xFF];
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function makeChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const typeAndData = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(typeAndData), 0);
  return Buffer.concat([lenBuf, typeAndData, crcBuf]);
}

/** 24-bit RGB PNG Encoder (Color Type 2, NO ALPHA - strictly required by Chrome Web Store) */
function encodePNG24(width, height, rgbBuffer) {
  const sig = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // 8 bits per channel
  ihdr[9] = 2;  // Color Type 2: RGB Truecolor (no alpha)
  ihdr[10] = 0; // Compression: Deflate
  ihdr[11] = 0; // Filter: 0
  ihdr[12] = 0; // Interlace: None
  const ihdrChunk = makeChunk('IHDR', ihdr);

  const scanlines = Buffer.alloc(height * (1 + width * 3));
  for (let y = 0; y < height; y++) {
    const rowOffset = y * (1 + width * 3);
    scanlines[rowOffset] = 0; // None filter
    rgbBuffer.copy(scanlines, rowOffset + 1, y * width * 3, (y + 1) * width * 3);
  }

  const compressed = deflateSync(scanlines, { level: 9 });
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
}

/** Compact 5x7 ASCII bitmap font representation */
const FONT = {
  ' ': [0,0,0,0,0,0,0],
  'A': [0x0E,0x11,0x11,0x1F,0x11,0x11,0x11],
  'B': [0x1E,0x11,0x11,0x1E,0x11,0x11,0x1E],
  'C': [0x0E,0x11,0x10,0x10,0x10,0x11,0x0E],
  'D': [0x1C,0x12,0x11,0x11,0x11,0x12,0x1C],
  'E': [0x1F,0x10,0x10,0x1E,0x10,0x10,0x1F],
  'F': [0x1F,0x10,0x10,0x1E,0x10,0x10,0x10],
  'G': [0x0E,0x11,0x10,0x17,0x11,0x11,0x0E],
  'H': [0x11,0x11,0x11,0x1F,0x11,0x11,0x11],
  'I': [0x0E,0x04,0x04,0x04,0x04,0x04,0x0E],
  'J': [0x07,0x02,0x02,0x02,0x02,0x12,0x0C],
  'K': [0x11,0x12,0x14,0x18,0x14,0x12,0x11],
  'L': [0x10,0x10,0x10,0x10,0x10,0x10,0x1F],
  'M': [0x11,0x1B,0x15,0x11,0x11,0x11,0x11],
  'N': [0x11,0x19,0x15,0x13,0x11,0x11,0x11],
  'O': [0x0E,0x11,0x11,0x11,0x11,0x11,0x0E],
  'P': [0x1E,0x11,0x11,0x1E,0x10,0x10,0x10],
  'Q': [0x0E,0x11,0x11,0x11,0x15,0x12,0x0D],
  'R': [0x1E,0x11,0x11,0x1E,0x14,0x12,0x11],
  'S': [0x0E,0x11,0x10,0x0E,0x01,0x11,0x0E],
  'T': [0x1F,0x04,0x04,0x04,0x04,0x04,0x04],
  'U': [0x11,0x11,0x11,0x11,0x11,0x11,0x0E],
  'V': [0x11,0x11,0x11,0x11,0x11,0x0A,0x04],
  'W': [0x11,0x11,0x11,0x15,0x15,0x1B,0x11],
  'X': [0x11,0x11,0x0A,0x04,0x0A,0x11,0x11],
  'Y': [0x11,0x11,0x0A,0x04,0x04,0x04,0x04],
  'Z': [0x1F,0x01,0x02,0x04,0x08,0x10,0x1F],
  '0': [0x0E,0x13,0x15,0x19,0x11,0x11,0x0E],
  '1': [0x04,0x0C,0x04,0x04,0x04,0x04,0x0E],
  '2': [0x0E,0x11,0x01,0x06,0x08,0x10,0x1F],
  '3': [0x1F,0x02,0x04,0x02,0x01,0x11,0x0E],
  '4': [0x02,0x06,0x0A,0x12,0x1F,0x02,0x02],
  '5': [0x1F,0x10,0x1E,0x01,0x01,0x11,0x0E],
  '6': [0x06,0x08,0x10,0x1E,0x11,0x11,0x0E],
  '7': [0x1F,0x01,0x02,0x04,0x08,0x08,0x08],
  '8': [0x0E,0x11,0x11,0x0E,0x11,0x11,0x0E],
  '9': [0x0E,0x11,0x11,0x0F,0x01,0x02,0x0C],
  '.': [0,0,0,0,0,0x0C,0x0C],
  ':': [0,0x0C,0x0C,0,0x0C,0x0C,0],
  ',': [0,0,0,0,0x0C,0x04,0x08],
  '-': [0,0,0,0x1F,0,0,0],
  '_': [0,0,0,0,0,0,0x1F],
  '/': [0x01,0x02,0x04,0x08,0x10,0,0],
  '#': [0x0A,0x0A,0x1F,0x0A,0x1F,0x0A,0x0A],
  '@': [0x0E,0x11,0x17,0x15,0x17,0x10,0x0F],
  '(': [0x02,0x04,0x08,0x08,0x08,0x04,0x02],
  ')': [0x08,0x04,0x02,0x02,0x02,0x04,0x08],
  '[': [0x0E,0x08,0x08,0x08,0x08,0x08,0x0E],
  ']': [0x0E,0x02,0x02,0x02,0x02,0x02,0x0E],
  '{': [0x02,0x04,0x04,0x08,0x04,0x04,0x02],
  '}': [0x08,0x04,0x04,0x02,0x04,0x04,0x08],
  '<': [0x02,0x04,0x08,0x10,0x08,0x04,0x02],
  '>': [0x08,0x04,0x02,0x01,0x02,0x04,0x08],
  '=': [0,0x1F,0,0x1F,0,0,0],
  '+': [0,0x04,0x04,0x1F,0x04,0x04,0],
  '*': [0,0x15,0x0E,0x1F,0x0E,0x15,0],
  '"': [0x0A,0x0A,0,0,0,0,0],
  '\'': [0x04,0x04,0x08,0,0,0,0],
  '!': [0x04,0x04,0x04,0x04,0,0x04,0],
  '?': [0x0E,0x11,0x01,0x06,0x04,0,0x04],
};

// Map lowercase to uppercase in font
for (let c = 97; c <= 122; c++) {
  const upper = String.fromCharCode(c - 32);
  const lower = String.fromCharCode(c);
  FONT[lower] = FONT[upper];
}

class Canvas24 {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.buf = Buffer.alloc(width * height * 3, 0);
  }

  setPixel(x, y, r, g, b) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
    const idx = (y * this.width + x) * 3;
    this.buf[idx] = r;
    this.buf[idx + 1] = g;
    this.buf[idx + 2] = b;
  }

  blendPixel(x, y, r, g, b, alpha) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
    const a = Math.max(0, Math.min(1, alpha));
    const idx = (y * this.width + x) * 3;
    this.buf[idx] = Math.round(this.buf[idx] * (1 - a) + r * a);
    this.buf[idx + 1] = Math.round(this.buf[idx + 1] * (1 - a) + g * a);
    this.buf[idx + 2] = Math.round(this.buf[idx + 2] * (1 - a) + b * a);
  }

  fillRect(x, y, w, h, r, g, b) {
    const x0 = Math.max(0, x);
    const y0 = Math.max(0, y);
    const x1 = Math.min(this.width, x + w);
    const y1 = Math.min(this.height, y + h);
    for (let py = y0; py < y1; py++) {
      for (let px = x0; px < x1; px++) {
        this.setPixel(px, py, r, g, b);
      }
    }
  }

  fillGradientV(x, y, w, h, c1, c2) {
    const x0 = Math.max(0, x);
    const y0 = Math.max(0, y);
    const x1 = Math.min(this.width, x + w);
    const y1 = Math.min(this.height, y + h);
    for (let py = y0; py < y1; py++) {
      const t = (py - y) / Math.max(1, h);
      const r = Math.round(c1[0] + t * (c2[0] - c1[0]));
      const g = Math.round(c1[1] + t * (c2[1] - c1[1]));
      const b = Math.round(c1[2] + t * (c2[2] - c1[2]));
      for (let px = x0; px < x1; px++) {
        this.setPixel(px, py, r, g, b);
      }
    }
  }

  fillRoundRect(x, y, w, h, radius, r, g, b) {
    for (let py = y; py < y + h; py++) {
      for (let px = x; px < x + w; px++) {
        let inside = true;
        if (px < x + radius && py < y + radius) {
          inside = Math.hypot(px - (x + radius), py - (y + radius)) <= radius;
        } else if (px >= x + w - radius && py < y + radius) {
          inside = Math.hypot(px - (x + w - radius), py - (y + radius)) <= radius;
        } else if (px < x + radius && py >= y + h - radius) {
          inside = Math.hypot(px - (x + radius), py - (y + h - radius)) <= radius;
        } else if (px >= x + w - radius && py >= y + h - radius) {
          inside = Math.hypot(px - (x + w - radius), py - (y + h - radius)) <= radius;
        }
        if (inside) this.setPixel(px, py, r, g, b);
      }
    }
  }

  drawRoundRect(x, y, w, h, radius, r, g, b) {
    for (let px = x + radius; px < x + w - radius; px++) {
      this.setPixel(px, y, r, g, b);
      this.setPixel(px, y + h - 1, r, g, b);
    }
    for (let py = y + radius; py < y + h - radius; py++) {
      this.setPixel(x, py, r, g, b);
      this.setPixel(x + w - 1, py, r, g, b);
    }
  }

  drawText(x, y, text, color = [255, 255, 255], scale = 1) {
    let curX = x;
    for (const ch of text) {
      const glyph = FONT[ch] || FONT['?'] || [0,0,0,0,0,0,0];
      for (let row = 0; row < 7; row++) {
        const line = glyph[row];
        for (let col = 0; col < 5; col++) {
          if ((line >> (4 - col)) & 1) {
            if (scale === 1) {
              this.setPixel(curX + col, y + row, color[0], color[1], color[2]);
            } else {
              this.fillRect(curX + col * scale, y + row * scale, scale, scale, color[0], color[1], color[2]);
            }
          }
        }
      }
      curX += (5 + 1) * scale;
    }
  }

  drawBadge(x, y, text, bg, fg, scale = 1) {
    const textW = text.length * 6 * scale;
    const badgeW = textW + 12;
    const badgeH = 7 * scale + 8;
    this.fillRoundRect(x, y, badgeW, badgeH, 4, bg[0], bg[1], bg[2]);
    this.drawText(x + 6, y + 4, text, fg, scale);
    return badgeW;
  }

  drawLogoIcon(cx, cy, size) {
    const r = size / 2;
    this.fillRoundRect(cx - r, cy - r, size, size, Math.round(size * 0.22), 24, 27, 47);
    this.drawRoundRect(cx - r, cy - r, size, size, Math.round(size * 0.22), 99, 102, 241);

    // Glowing cyan orbit
    const ringR = size * 0.34;
    for (let a = 0; a < Math.PI * 2; a += 0.04) {
      const px = Math.round(cx + Math.cos(a) * ringR);
      const py = Math.round(cy + Math.sin(a) * ringR);
      this.blendPixel(px, py, 56, 189, 248, 0.9);
      this.blendPixel(px+1, py, 56, 189, 248, 0.7);
    }

    // Glowing red center dot
    const dotR = Math.max(3, size * 0.16);
    for (let dy = -dotR; dy <= dotR; dy++) {
      for (let dx = -dotR; dx <= dotR; dx++) {
        const d = Math.hypot(dx, dy);
        if (d <= dotR) {
          this.blendPixel(cx + dx, cy + dy, 244, 63, 94, 1.0);
        } else if (d <= dotR * 1.5) {
          this.blendPixel(cx + dx, cy + dy, 244, 63, 94, 0.4);
        }
      }
    }
  }

  drawChromeHeader(title, url) {
    // Window header bar
    this.fillRect(0, 0, this.width, 42, 30, 41, 59);
    // Window buttons
    this.fillCircle(18, 21, 6, 239, 68, 68);
    this.fillCircle(36, 21, 6, 234, 179, 8);
    this.fillCircle(54, 21, 6, 34, 197, 94);

    // Tab
    this.fillRoundRect(80, 8, 220, 34, 6, 15, 23, 42);
    this.drawText(96, 18, title.toUpperCase(), [226, 232, 240], 1);

    // Sub-bar with URL
    this.fillRect(0, 42, this.width, 36, 15, 23, 42);
    this.fillRoundRect(80, 48, this.width - 160, 24, 4, 30, 41, 59);
    this.drawText(95, 55, url, [148, 163, 184], 1);

    // Bottom border
    this.fillRect(0, 78, this.width, 1, 51, 65, 85);
  }

  fillCircle(cx, cy, r, red, green, blue) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dy * dy <= r * r) {
          this.setPixel(cx + dx, cy + dy, red, green, blue);
        }
      }
    }
  }

  toPNG() {
    return encodePNG24(this.width, this.height, this.buf);
  }
}

// -------------------------------------------------------------
// 1. Screenshot 1: Workflow Editor Workspace (1280x800)
// -------------------------------------------------------------
console.log('Rendering Screenshot 1: Workflow Editor (1280x800)...');
const sc1 = new Canvas24(1280, 800);
// Main background
sc1.fillRect(0, 0, 1280, 800, 15, 23, 42);
sc1.drawChromeHeader('WORKFLOW RECORDER - EDITOR', 'chrome-extension://workflow-recorder/editor.html?id=wf_checkout_flow');

// Editor Top Nav
sc1.fillRect(0, 79, 1280, 46, 24, 32, 53);
sc1.drawText(24, 94, 'WORKFLOW: E-COMMERCE CHECKOUT FLOW', [248, 250, 252], 2);
sc1.drawBadge(540, 91, '8 STEPS', [51, 65, 85], [148, 163, 184], 1);
sc1.drawBadge(620, 91, 'PLAYWRIGHT READY', [16, 185, 129], [255, 255, 255], 1);

// Buttons on top right
sc1.fillRoundRect(980, 87, 120, 30, 5, 59, 130, 246);
sc1.drawText(1000, 96, 'EXPORT CODE', [255, 255, 255], 1);
sc1.fillRoundRect(1120, 87, 130, 30, 5, 99, 102, 241);
sc1.drawText(1135, 96, '+ ADD ASSERTION', [255, 255, 255], 1);

// 3-Panel Layout
// Left Panel: Steps List (Width: 360)
sc1.fillRect(0, 125, 360, 675, 15, 23, 42);
sc1.fillRect(360, 125, 1, 675, 51, 65, 85);
sc1.drawText(20, 145, 'RECORDED INTERACTION STEPS', [148, 163, 184], 1);

const steps = [
  { num: '1', type: 'NAVIGATE', label: 'https://store.example.com', active: false },
  { num: '2', type: 'CLICK', label: 'input[name="search"]', active: false },
  { num: '3', type: 'INPUT', label: 'fill: "Wireless Headphones"', active: false },
  { num: '4', type: 'CLICK', label: 'button[data-testid="add-to-cart"]', active: true },
  { num: '5', type: 'ASSERT', label: 'visible: .cart-drawer', active: false },
  { num: '6', type: 'CLICK', label: 'a.btn-checkout', active: false },
  { num: '7', type: 'INPUT', label: 'fill: {{user_email}}', active: false },
  { num: '8', type: 'CLICK', label: 'button#place-order', active: false },
];

let stepY = 175;
for (const s of steps) {
  const bg = s.active ? [30, 41, 59] : [20, 29, 47];
  sc1.fillRoundRect(16, stepY, 328, 54, 6, bg[0], bg[1], bg[2]);
  if (s.active) {
    sc1.drawRoundRect(16, stepY, 328, 54, 6, 99, 102, 241);
    sc1.fillRect(16, stepY + 12, 4, 30, 99, 102, 241);
  }
  sc1.drawBadge(30, stepY + 12, `STEP ${s.num}`, [51, 65, 85], [203, 213, 225], 1);
  sc1.drawBadge(90, stepY + 12, s.type, s.type === 'ASSERT' ? [16, 185, 129] : [79, 70, 229], [255, 255, 255], 1);
  sc1.drawText(30, stepY + 36, s.label.toUpperCase(), [203, 213, 225], 1);
  stepY += 62;
}

// Center Panel: Step Inspector & Selector Hierarchy (Width: 540)
sc1.fillRect(361, 125, 540, 675, 24, 32, 53);
sc1.fillRect(901, 125, 1, 675, 51, 65, 85);

sc1.drawText(385, 145, 'STEP 4: CLICK ACTION INSPECTOR', [248, 250, 252], 2);
sc1.drawBadge(385, 175, 'TARGET: BUTTON[DATA-TESTID="ADD-TO-CART"]', [30, 41, 59], [56, 189, 248], 1);

sc1.drawText(385, 215, 'SMART MULTI-STRATEGY SELECTORS (AUTO-RANKED):', [148, 163, 184], 1);

const selectors = [
  { tier: 'TIER 1 (TEST ID)', sel: 'button[data-testid="add-to-cart"]', score: '98% STABLE', rec: true },
  { tier: 'TIER 2 (SEMANTIC ID)', sel: '#btn-add-cart-primary', score: '92% STABLE', rec: false },
  { tier: 'TIER 3 (ACCESSIBLE ARIA)', sel: 'button:has-text("Add to Cart")', score: '88% STABLE', rec: false },
  { tier: 'TIER 4 (PATH SELECTOR)', sel: '.product-actions > button.primary', score: '78% STABLE', rec: false },
  { tier: 'TIER 5 (CANONICAL XPATH)', sel: '//button[@data-action="add-cart"]', score: '72% STABLE', rec: false },
];

let selY = 240;
for (const sel of selectors) {
  sc1.fillRoundRect(385, selY, 490, 68, 6, 15, 23, 42);
  if (sel.rec) {
    sc1.drawRoundRect(385, selY, 490, 68, 6, 16, 185, 129);
    sc1.drawBadge(760, selY + 10, 'RECOMMENDED', [16, 185, 129], [255, 255, 255], 1);
  }
  sc1.drawText(400, selY + 12, sel.tier, [148, 163, 184], 1);
  sc1.drawBadge(400, selY + 28, sel.score, [51, 65, 85], [56, 189, 248], 1);
  sc1.drawText(400, selY + 50, sel.sel.toUpperCase(), [241, 245, 249], 1);
  selY += 78;
}

// Right Panel: Parametrization & Code Preview (Width: 378)
sc1.fillRect(902, 125, 378, 675, 15, 23, 42);
sc1.drawText(925, 145, 'GENERATED PLAYWRIGHT SCRIPT', [248, 250, 252], 1);
sc1.drawBadge(925, 165, 'AUTOMATION EXPORT PREVIEW', [51, 65, 85], [148, 163, 184], 1);

const codeSnippet = [
  '// Auto-generated by Workflow Recorder',
  'import { test, expect } from \'@playwright/test\';',
  '',
  'test(\'Checkout Flow\', async ({ page }) => {',
  '  await page.goto(\'https://store.example.com\');',
  '  await page.locator(\'input[name="search"]\')',
  '    .fill(\'Wireless Headphones\');',
  '  await page.locator(',
  '    \'button[data-testid="add-to-cart"]\'',
  '  ).click();',
  '  await expect(',
  '    page.locator(\'.cart-drawer\')',
  '  ).toBeVisible();',
  '  await page.locator(\'a.btn-checkout\').click();',
  '});',
];

let codeY = 200;
sc1.fillRoundRect(920, 190, 340, 560, 8, 10, 15, 30);
sc1.drawRoundRect(920, 190, 340, 560, 8, 51, 65, 85);
for (const cl of codeSnippet) {
  const isKw = cl.includes('import') || cl.includes('test(') || cl.includes('await');
  const isComment = cl.startsWith('//');
  const col = isComment ? [100, 116, 139] : (isKw ? [56, 189, 248] : [241, 245, 249]);
  sc1.drawText(935, codeY, cl.toUpperCase(), col, 1);
  codeY += 22;
}

writeFileSync(resolve(assetsDir, 'screenshot-1-workflow-editor.png'), sc1.toPNG());
console.log('✅ Generated screenshot-1-workflow-editor.png (1280x800)');

// -------------------------------------------------------------
// 2. Screenshot 2: Live In-Page Recording & Floating HUD (1280x800)
// -------------------------------------------------------------
console.log('Rendering Screenshot 2: Live Recording HUD (1280x800)...');
const sc2 = new Canvas24(1280, 800);
sc2.fillRect(0, 0, 1280, 800, 241, 245, 249);
sc2.drawChromeHeader('STORE DEMO - WIRELESS HEADPHONES', 'https://demo-store.example.com/products/headphones');

// Webpage Mock Content (Light theme web store)
sc2.fillRect(0, 79, 1280, 721, 255, 255, 255);
// Store Header
sc2.fillRect(0, 79, 1280, 60, 248, 250, 252);
sc2.fillRect(0, 138, 1280, 1, 226, 232, 240);
sc2.drawText(60, 100, 'ACME TECH STORE', [15, 23, 42], 2);
sc2.fillRoundRect(400, 92, 450, 34, 17, 241, 245, 249);
sc2.drawText(420, 102, 'SEARCH AUDIO, PHONES, LAPTOPS...', [148, 163, 184], 1);

// Product details layout
sc2.fillRoundRect(80, 170, 480, 480, 12, 241, 245, 249); // Image placeholder
sc2.fillCircle(320, 410, 120, 203, 213, 225); // Product illustration

// Product info right side
sc2.drawText(600, 200, 'PRO NOISE-CANCELLING HEADPHONES', [15, 23, 42], 2);
sc2.drawText(600, 230, '$299.00 USD - IN STOCK', [16, 185, 129], 1);
sc2.drawText(600, 260, 'PREMIUM WIRELESS AUDIO WITH 40-HOUR BATTERY LIFE', [100, 116, 139], 1);

// Highlighted active button being recorded!
sc2.fillRoundRect(600, 320, 260, 52, 8, 79, 70, 229);
sc2.drawText(640, 338, 'ADD TO CART', [255, 255, 255], 2);

// Element inspector outline box (Showing recorder interaction)
sc2.drawRoundRect(595, 315, 270, 62, 10, 244, 63, 94);
sc2.drawBadge(600, 290, 'CAPTURED: BUTTON[DATA-TESTID="ADD-TO-CART"]', [244, 63, 94], [255, 255, 255], 1);

// FLOATING RECORDER HUD (Shadow DOM Isolated Bar in bottom right)
const hudX = 720;
const hudY = 660;
const hudW = 500;
const hudH = 90;

sc2.fillRoundRect(hudX, hudY, hudW, hudH, 16, 15, 23, 42);
sc2.drawRoundRect(hudX, hudY, hudW, hudH, 16, 99, 102, 241);

// Status indicator
sc2.fillCircle(hudX + 35, hudY + 45, 8, 244, 63, 94);
sc2.drawText(hudX + 55, hudY + 32, 'RECORDING LIVE', [248, 250, 252], 2);
sc2.drawText(hudX + 55, hudY + 54, '00:02:45 | 7 STEPS CAPTURED', [148, 163, 184], 1);

// Control buttons inside HUD
sc2.fillRoundRect(hudX + 270, hudY + 28, 90, 36, 6, 30, 41, 59);
sc2.drawText(hudX + 285, hudY + 40, 'PAUSE', [241, 245, 249], 1);

sc2.fillRoundRect(hudX + 375, hudY + 28, 105, 36, 6, 239, 68, 68);
sc2.drawText(hudX + 395, hudY + 40, 'FINISH', [255, 255, 255], 1);

writeFileSync(resolve(assetsDir, 'screenshot-2-live-recording.png'), sc2.toPNG());
console.log('✅ Generated screenshot-2-live-recording.png (1280x800)');

// -------------------------------------------------------------
// 3. Screenshot 3: Multi-Framework Code Exporter Modal (1280x800)
// -------------------------------------------------------------
console.log('Rendering Screenshot 3: Multi-Framework Exporter (1280x800)...');
const sc3 = new Canvas24(1280, 800);
sc3.fillRect(0, 0, 1280, 800, 15, 23, 42);
sc3.drawChromeHeader('WORKFLOW RECORDER - CODE EXPORT MODAL', 'chrome-extension://workflow-recorder/editor.html');

// Background blur simulation
sc3.fillRect(0, 79, 1280, 721, 10, 15, 28);

// Modal Box in Center
const mX = 200;
const mY = 120;
const mW = 880;
const mH = 620;

sc3.fillRoundRect(mX, mY, mW, mH, 14, 24, 32, 53);
sc3.drawRoundRect(mX, mY, mW, mH, 14, 99, 102, 241);

// Modal Header
sc3.drawText(mX + 30, mY + 30, 'EXPORT AUTOMATION WORKFLOW', [248, 250, 252], 2);
sc3.drawText(mX + 30, mY + 54, 'SELECT YOUR TARGET AUTOMATION FRAMEWORK AND COPY OR DOWNLOAD CODE', [148, 163, 184], 1);

// Framework Tabs
const tabs = [
  { name: 'PLAYWRIGHT (TS)', active: true },
  { name: 'PUPPETEER (JS)', active: false },
  { name: 'CYPRESS', active: false },
  { name: 'SELENIUM PYTHON', active: false },
  { name: 'CANONICAL JSON', active: false },
];

let tabX = mX + 30;
for (const t of tabs) {
  const bg = t.active ? [99, 102, 241] : [30, 41, 59];
  const fg = t.active ? [255, 255, 255] : [148, 163, 184];
  const w = sc3.drawBadge(tabX, mY + 80, t.name, bg, fg, 1);
  tabX += w + 10;
}

// Code Box
sc3.fillRoundRect(mX + 30, mY + 120, mW - 60, 420, 8, 10, 15, 28);
sc3.drawRoundRect(mX + 30, mY + 120, mW - 60, 420, 8, 51, 65, 85);

const exportCode = [
  'import { test, expect } from \'@playwright/test\';',
  '',
  'test.describe(\'Recorded Suite: Checkout Workflow\', () => {',
  '  test(\'Execute end-to-end checkout\', async ({ page }) => {',
  '    // Step 1: Navigation with network idle',
  '    await page.goto(\'https://store.example.com\', { waitUntil: \'networkidle\' });',
  '',
  '    // Step 2 & 3: Search input with variable parameter',
  '    await page.locator(\'input[name="search"]\').fill(\'Wireless Headphones\');',
  '    await page.keyboard.press(\'Enter\');',
  '',
  '    // Step 4: Resilient click using primary testId selector',
  '    await page.locator(\'button[data-testid="add-to-cart"]\').click();',
  '',
  '    // Step 5: DOM assertion validation',
  '    await expect(page.locator(\'div.cart-drawer\')).toBeVisible({ timeout: 5000 });',
  '',
  '    // Step 6: Proceed to checkout',
  '    await page.locator(\'a.btn-checkout\').click();',
  '  });',
  '});',
];

let expY = mY + 140;
for (const l of exportCode) {
  const isKw = l.includes('import') || l.includes('test') || l.includes('await');
  const isComment = l.includes('//');
  const col = isComment ? [100, 116, 139] : (isKw ? [56, 189, 248] : [226, 232, 240]);
  sc3.drawText(mX + 50, expY, l.toUpperCase(), col, 1);
  expY += 19;
}

// Modal Footer Buttons
sc3.fillRoundRect(mX + 30, mY + 560, 180, 40, 6, 51, 65, 85);
sc3.drawText(mX + 50, mY + 574, 'COPY TO CLIPBOARD', [241, 245, 249], 1);

sc3.fillRoundRect(mX + 230, mY + 560, 200, 40, 6, 16, 185, 129);
sc3.drawText(mX + 245, mY + 574, 'DOWNLOAD SCRIPT (.TS)', [255, 255, 255], 1);

sc3.fillRoundRect(mX + 450, mY + 560, 170, 40, 6, 99, 102, 241);
sc3.drawText(mX + 470, mY + 574, 'DOWNLOAD JSON SCHEMA', [255, 255, 255], 1);

writeFileSync(resolve(assetsDir, 'screenshot-3-code-export.png'), sc3.toPNG());
console.log('✅ Generated screenshot-3-code-export.png (1280x800)');

// -------------------------------------------------------------
// 4. Screenshot 4: Resilient Selector Intelligence (1280x800)
// -------------------------------------------------------------
console.log('Rendering Screenshot 4: Selector Intelligence (1280x800)...');
const sc4 = new Canvas24(1280, 800);
sc4.fillRect(0, 0, 1280, 800, 15, 23, 42);
sc4.drawChromeHeader('WORKFLOW RECORDER - SELECTOR INTELLIGENCE', 'chrome-extension://workflow-recorder/editor.html');

sc4.drawText(60, 110, 'SMART MULTI-STRATEGY SELECTOR ENGINE', [248, 250, 252], 2);
sc4.drawText(60, 135, 'NEVER SUFFER FROM FRAGILE TESTS: AUTOMATIC FALLBACK CHAINS RANKED BY STABILITY', [148, 163, 184], 1);

// Comparison Cards
// Left Card: Traditional Fragile Recording
sc4.fillRoundRect(60, 170, 560, 580, 12, 24, 32, 53);
sc4.drawRoundRect(60, 170, 560, 580, 12, 239, 68, 68);
sc4.drawBadge(80, 195, 'TRADITIONAL TOOLS (FRAGILE)', [239, 68, 68], [255, 255, 255], 1);
sc4.drawText(80, 235, 'BRITTLE COORDINATES OR DEEP NESTED PATHS', [226, 232, 240], 1);

const fragileExamples = [
  '• Record raw mouse coordinates (x: 482, y: 391) -> Fails on different screen size',
  '• Deep full XPath: /html/body/div[3]/div[2]/div[1]/button[2] -> Breaks on DOM change',
  '• Dynamic CSS classes: .btn-primary_9f81a -> Fails on next production build',
  '• No fallback mechanisms if single selector fails',
  '• Result: Constant test flakiness and high maintenance burden',
];

let fY = 275;
for (const fe of fragileExamples) {
  sc4.drawText(80, fY, fe.toUpperCase(), [248, 113, 113], 1);
  fY += 45;
}

// Right Card: Workflow Recorder Multi-Tier Engine
sc4.fillRoundRect(660, 170, 560, 580, 12, 24, 32, 53);
sc4.drawRoundRect(660, 170, 560, 580, 12, 16, 185, 129);
sc4.drawBadge(680, 195, 'WORKFLOW RECORDER (RESILIENT)', [16, 185, 129], [255, 255, 255], 1);
sc4.drawText(680, 235, '7-TIER AUTOMATIC HEURISTIC SELECTOR HIERARCHY', [226, 232, 240], 1);

const resilientTiers = [
  { tier: '1. Test ID', desc: '[data-testid="submit"]', status: 'Highest confidence (99%)' },
  { tier: '2. Semantic ID', desc: '#checkout-submit-btn', status: 'ID uniqueness verified' },
  { tier: '3. Accessible ARIA', desc: 'role=button[name="Pay Now"]', status: 'Screen-reader resilient' },
  { tier: '4. Text Content', desc: 'button:has-text("Pay Now")', status: 'Semantic label match' },
  { tier: '5. Scoped CSS', desc: 'form.checkout-form button.submit', status: 'Ancestor boundary scoped' },
  { tier: '6. XPath Fallback', desc: '//button[contains(@class, "pay")]', status: 'Resilient attribute lookup' },
];

let rY = 275;
for (const rt of resilientTiers) {
  sc4.fillRoundRect(680, rY, 520, 52, 6, 15, 23, 42);
  sc4.drawText(695, rY + 10, rt.tier.toUpperCase(), [56, 189, 248], 1);
  sc4.drawText(695, rY + 28, rt.desc.toUpperCase(), [241, 245, 249], 1);
  sc4.drawBadge(1050, rY + 12, 'VERIFIED', [16, 185, 129], [255, 255, 255], 1);
  rY += 60;
}

writeFileSync(resolve(assetsDir, 'screenshot-4-selector-intelligence.png'), sc4.toPNG());
console.log('✅ Generated screenshot-4-selector-intelligence.png (1280x800)');

// -------------------------------------------------------------
// 5. Small Promo Tile (440x280 Canvas, 24-bit RGB NO ALPHA)
// -------------------------------------------------------------
console.log('Rendering Small Promo Tile (440x280, 24-bit RGB)...');
const pSmall = new Canvas24(440, 280);
pSmall.fillGradientV(0, 0, 440, 280, [15, 23, 42], [24, 27, 47]);
pSmall.drawRoundRect(0, 0, 440, 280, 0, 79, 70, 229);

// App Logo in Center
pSmall.drawLogoIcon(220, 85, 90);

// Typography
pSmall.drawText(90, 145, 'WORKFLOW RECORDER', [255, 255, 255], 2);
pSmall.drawText(50, 175, 'RECORD BROWSER WORKFLOWS & EXPORT TESTS', [56, 189, 248], 1);

// Badges at bottom
pSmall.drawBadge(35, 215, 'PLAYWRIGHT', [51, 65, 85], [241, 245, 249], 1);
pSmall.drawBadge(135, 215, 'PUPPETEER', [51, 65, 85], [241, 245, 249], 1);
pSmall.drawBadge(230, 215, 'CYPRESS', [51, 65, 85], [241, 245, 249], 1);
pSmall.drawBadge(310, 215, 'SELENIUM', [51, 65, 85], [241, 245, 249], 1);

pSmall.drawText(125, 252, 'MANIFEST V3 • ZERO TELEMETRY', [148, 163, 184], 1);

writeFileSync(resolve(assetsDir, 'promo-small.png'), pSmall.toPNG());
console.log('✅ Generated promo-small.png (440x280, 24-bit RGB NO ALPHA)');

// -------------------------------------------------------------
// 6. Marquee Promo Tile (1400x560 Canvas, 24-bit RGB NO ALPHA)
// -------------------------------------------------------------
console.log('Rendering Marquee Promo Tile (1400x560, 24-bit RGB)...');
const pMarquee = new Canvas24(1400, 560);
pMarquee.fillGradientV(0, 0, 1400, 560, [15, 23, 42], [20, 24, 45]);

// Left branding section
pMarquee.drawLogoIcon(160, 230, 150);
pMarquee.drawBadge(280, 160, 'OFFICIAL CHROME EXTENSION • MANIFEST V3', [79, 70, 229], [255, 255, 255], 1);
pMarquee.drawText(280, 195, 'WORKFLOW RECORDER', [255, 255, 255], 4);
pMarquee.drawText(280, 245, 'AUTOMATE ANY BROWSER WORKFLOW IN SECONDS', [56, 189, 248], 2);
pMarquee.drawText(280, 275, 'INTELLIGENT MULTI-TIER SELECTOR ENGINE WITH ZERO-TELEMETRY PRIVACY', [148, 163, 184], 1);

pMarquee.drawBadge(280, 320, 'PLAYWRIGHT', [51, 65, 85], [255, 255, 255], 2);
pMarquee.drawBadge(450, 320, 'PUPPETEER', [51, 65, 85], [255, 255, 255], 2);
pMarquee.drawBadge(600, 320, 'CYPRESS', [51, 65, 85], [255, 255, 255], 2);
pMarquee.drawBadge(730, 320, 'SELENIUM', [51, 65, 85], [255, 255, 255], 2);

// Right Side: Code Preview Card
const cardX = 900;
const cardY = 80;
const cardW = 440;
const cardH = 400;

pMarquee.fillRoundRect(cardX, cardY, cardW, cardH, 12, 10, 15, 28);
pMarquee.drawRoundRect(cardX, cardY, cardW, cardH, 12, 99, 102, 241);
pMarquee.fillRect(cardX, cardY, cardW, 36, 24, 32, 53);
pMarquee.drawText(cardX + 20, cardY + 12, 'PLAYWRIGHT TEST GENERATOR', [241, 245, 249], 1);

const marqueeCode = [
  'import { test, expect } from \'@playwright/test\';',
  '',
  'test(\'E-Commerce Flow\', async ({ page }) => {',
  '  await page.goto(\'https://store.example.com\');',
  '  await page.locator(\'input[name="q"]\')',
  '    .fill(\'Headphones\');',
  '  await page.locator(\'[data-testid="buy"]\')',
  '    .click();',
  '  await expect(page.locator(\'.cart\'))',
  '    .toBeVisible();',
  '});',
];

let mCodeY = cardY + 60;
for (const line of marqueeCode) {
  const isKw = line.includes('import') || line.includes('test') || line.includes('await');
  pMarquee.drawText(cardX + 25, mCodeY, line.toUpperCase(), isKw ? [56, 189, 248] : [226, 232, 240], 1);
  mCodeY += 24;
}

writeFileSync(resolve(assetsDir, 'promo-marquee.png'), pMarquee.toPNG());
console.log('✅ Generated promo-marquee.png (1400x560, 24-bit RGB NO ALPHA)');

// -------------------------------------------------------------
// 7. Store Icon (128x128 PNG)
// -------------------------------------------------------------
copyFileSync(resolve(root, 'public/icons/icon-128.png'), resolve(assetsDir, 'store-icon-128.png'));
console.log('✅ Copied store-icon-128.png (128x128)');

console.log('\n🎉 ALL CHROME WEB STORE GRAPHIC ASSETS CREATED SUCCESSFULLY IN docs/assets/ !');
