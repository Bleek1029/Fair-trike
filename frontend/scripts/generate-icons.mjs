/**
 * Fairtrike PWA icon generator — zero-dependency (node >= 18 ESM).
 *
 * Rasterizes the design-system tricycle mark (same geometry as
 * public/favicon.svg, 100x100 viewBox) into the PNG icon set referenced by
 * public/manifest.webmanifest and index.html.
 *
 * Usage: node scripts/generate-icons.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import url from 'node:url';

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const ICONS_DIR = path.join(ROOT, 'public', 'icons');

/** Brand palette — single source (matches tailwind.config.js / favicon.svg). */
const BRAND = {
  container: [0x0d, 0x5c, 0x3a, 0xff], // primary-container  #0d5c3a
  wheelRing: [0x09, 0x42, 0x28, 0xff], // wheel outer        #094228
  white: [0xff, 0xff, 0xff, 0xff],
  glass: [0xff, 0xff, 0xff, 0x26],     // white @ 15% opacity
  mint: [0x8e, 0xf0, 0xb3, 0xff],      // headlamp           #8ef0b3
};

/** Output set: [filename, size, options]. `maskable` scales content to the 80% safe zone. */
const OUTPUTS = [
  ['icon-192.png', 192, { maskable: false }],
  ['icon-512.png', 512, { maskable: false }],
  ['maskable-512.png', 512, { maskable: true }],
  ['apple-touch-icon.png', 180, { maskable: false }],
];

// ---------------------------------------------------------------------------
// Minimal PNG writer (8-bit RGBA, no interlace)
// ---------------------------------------------------------------------------

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(bytes) {
  let c = 0xffffffff;
  for (const b of bytes) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const out = Buffer.alloc(8 + data.length + 4);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, 'ascii'), data])), 8 + data.length);
  return out;
}

function encodePng(width, height, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type RGBA
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------
// Tiny rasterizer (alpha-blended shape fills in the normalized 0..100 space)
// ---------------------------------------------------------------------------

function makeCanvas(size) {
  return { size, px: Buffer.alloc(size * size * 4) };
}

function blend(canvas, x, y, color) {
  if (x < 0 || y < 0 || x >= canvas.size || y >= canvas.size) return;
  const i = (y * canvas.size + x) * 4;
  const a = color[3] / 255;
  const dst = canvas.px;
  dst[i] = Math.round(color[0] * a + dst[i] * (1 - a));
  dst[i + 1] = Math.round(color[1] * a + dst[i + 1] * (1 - a));
  dst[i + 2] = Math.round(color[2] * a + dst[i + 2] * (1 - a));
  dst[i + 3] = Math.round(Math.max(color[3], dst[i + 3]));
}

const distSq = (x1, y1, x2, y2) => (x1 - x2) ** 2 + (y1 - y2) ** 2;

function inPolygon(px, py, verts) {
  let inside = false;
  for (let i = 0, j = verts.length - 1; i < verts.length; j = i++) {
    const [xi, yi] = verts[i];
    const [xj, yj] = verts[j];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function fillCircle(canvas, scale, cx, cy, r, color) {
  const R = r * scale;
  for (let y = Math.floor((cy - r) * scale); y <= Math.ceil((cy + r) * scale); y++)
    for (let x = Math.floor((cx - r) * scale); x <= Math.ceil((cx + r) * scale); x++)
      if (distSq(x + 0.5, y + 0.5, cx * scale, cy * scale) <= R * R) blend(canvas, x, y, color);
}

function fillPolygon(canvas, scale, verts, color) {
  const ys = verts.map((v) => v[1]);
  const scaled = verts.map(([vx, vy]) => [vx * scale, vy * scale]);
  const yMin = Math.floor(Math.min(...ys) * scale);
  const yMax = Math.ceil(Math.max(...ys) * scale);
  for (let y = yMin; y <= yMax; y++) {
    const xs = scaled.map((v) => v[0]);
    for (let x = Math.floor(Math.min(...xs)); x <= Math.ceil(Math.max(...xs)); x++)
      if (inPolygon(x + 0.5, y + 0.5, scaled)) blend(canvas, x, y, color);
  }
}

function fillRoundRect(canvas, scale, radius, color, fullBleed) {
  const side = 100 * scale;
  const R = radius * scale;
  for (let y = 0; y < canvas.size; y++)
    for (let x = 0; x < canvas.size; x++) {
      const nx = Math.min(Math.max(x + 0.5, R), side - R);
      const ny = Math.min(Math.max(y + 0.5, R), side - R);
      if (distSq(x + 0.5, y + 0.5, nx, ny) <= R * R) blend(canvas, x, y, color);
      else if (fullBleed) blend(canvas, x, y, color); // maskable: no transparent corners
    }
}

/** The design-system tricycle mark, drawn in the 0..100 design space. */
function drawMark(canvas, contentScale) {
  const scale = canvas.size / 100;
  const s = scale * contentScale;
  const pad = (100 * (1 - contentScale)) / 2; // design-space offset
  const t = (x, y) => [x + pad, y + pad];

  fillRoundRect(canvas, scale, 24 * contentScale, BRAND.container, false);
  fillCircle(canvas, s, ...t(50, 50), 34 * contentScale, BRAND.glass);
  fillPolygon(canvas, s, [t(30, 64), t(44, 38), t(68, 38), t(76, 50), t(76, 64)], BRAND.white);
  fillPolygon(canvas, s, [t(47, 43), t(62, 43), t(67, 52), t(47, 52)], BRAND.container);
  fillCircle(canvas, s, ...t(40, 66), 8 * contentScale, BRAND.wheelRing);
  fillCircle(canvas, s, ...t(40, 66), 4 * contentScale, BRAND.white);
  fillCircle(canvas, s, ...t(68, 66), 8 * contentScale, BRAND.wheelRing);
  fillCircle(canvas, s, ...t(68, 66), 4 * contentScale, BRAND.white);
  fillCircle(canvas, s, ...t(28, 46), 3 * contentScale, BRAND.mint);
}

// ---------------------------------------------------------------------------

fs.mkdirSync(ICONS_DIR, { recursive: true });
for (const [file, size, { maskable }] of OUTPUTS) {
  const canvas = makeCanvas(size);
  drawMark(canvas, maskable ? 0.76 : 1);
  const png = encodePng(size, size, canvas.px);
  fs.writeFileSync(path.join(ICONS_DIR, file), png);
  console.log(`wrote public/icons/${file} (${size}x${size}, ${(png.length / 1024).toFixed(1)} kB, maskable=${maskable})`);
}
