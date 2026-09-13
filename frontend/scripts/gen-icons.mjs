import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendDir = path.join(__dirname, '..');
const outDir = path.join(frontendDir, 'public', 'icons');
fs.mkdirSync(outDir, { recursive: true });

// Minimal PNG encoder (8-bit RGBA, no filters) using only node builtins.
function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c;
    }
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
}
function encodePng(w, h, rgba) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// 5x7 blocky font for F, T — draws FT + check via shapes.
const FONT = {
  F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
};
function drawGlyph(px, ox, oy, scale, glyph, color) {
  const rows = FONT[glyph];
  for (let r = 0; r < 7; r++) for (let c = 0; c < 5; c++) {
    if (rows[r][c] !== '1') continue;
    for (let y = 0; y < scale; y++) for (let x = 0; x < scale; x++) {
      const i = (((oy + r * scale + y) * px.w) + (ox + c * scale + x)) * 4;
      px.buf[i] = color[0]; px.buf[i + 1] = color[1]; px.buf[i + 2] = color[2]; px.buf[i + 3] = 255;
    }
  }
}
// Rounded-rect orange tile w/ safe padding so maskable crops stay clean.
function makeIcon(size, { rounded = true, padding = 0.08 } = {}) {
  const buf = Buffer.alloc(size * size * 4);
  const radius = rounded ? size * 0.22 : 0;
  const bg = [245, 158, 11];
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const i = (y * size + x) * 4;
    let inside = true;
    if (rounded) {
      const cx = Math.min(Math.max(x, radius), size - radius);
      const cy = Math.min(Math.max(y, radius), size - radius);
      const dx = x - cx, dy = y - cy;
      inside = dx * dx + dy * dy <= radius * radius;
    }
    if (inside) { buf[i] = bg[0]; buf[i + 1] = bg[1]; buf[i + 2] = bg[2]; buf[i + 3] = 255; }
    else { buf[i] = 0; buf[i + 1] = 0; buf[i + 2] = 0; buf[i + 3] = 0; }
  }
  const px = { w: size, buf };
  const dark = [42, 23, 0];
  const avail = size * (1 - padding * 2);
  const scale = Math.max(2, Math.floor(avail / 16));
  const gw = 5 * scale, gh = 7 * scale, gap = scale * 2;
  const totalW = gw * 2 + gap;
  const ox = Math.floor((size - totalW) / 2), oy = Math.floor((size - gh) / 2) - Math.floor(size * 0.02);
  drawGlyph(px, ox, oy, scale, 'F', dark);
  drawGlyph(px, ox + gw + gap, oy, scale, 'T', dark);
  // Green verified dot top-right with white check.
  const cr = size * 0.13, cx = size * 0.80, cy = size * 0.20;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const dx = x - cx, dy = y - cy, d = Math.sqrt(dx * dx + dy * dy);
    const i = (y * size + x) * 4;
    if (d <= cr) { buf[i] = 0; buf[i + 1] = 108; buf[i + 2] = 73; buf[i + 3] = 255; }
  }
  // White check inside the dot.
  const cs = Math.max(1, Math.floor(size / 90));
  const pts = [[-3, 0], [-1, 2], [3, -3]];
  for (const [gx, gy] of pts) for (let y = 0; y < cs * 2; y++) for (let x = 0; x < cs * 2; x++) {
    const X = Math.round(cx + gx * cs * 2 + x), Y = Math.round(cy + gy * cs * 2 + y);
    if (X < 0 || Y < 0 || X >= size || Y >= size) continue;
    const i = (Y * size + X) * 4;
    buf[i] = 255; buf[i + 1] = 255; buf[i + 2] = 255; buf[i + 3] = 255;
  }
  return encodePng(size, size, buf);
}
const created = [];
for (const size of [192, 512, 180]) {
  const name = size === 180 ? 'apple-touch-icon.png' : `icon-${size}.png`;
  const dest = path.join(outDir, name);
  fs.writeFileSync(dest, makeIcon(size));
  created.push(`${name} (${fs.statSync(dest).size} bytes)`);
}
// Maskable needs full-bleed artwork with safe zone, so generate a padded variant.
const maskDest = path.join(outDir, 'maskable-512.png');
fs.writeFileSync(maskDest, makeIcon(512, { rounded: false, padding: 0.18 }));
created.push(`maskable-512.png (${fs.statSync(maskDest).size} bytes)`);
console.log('icons created:', created.join(', '));