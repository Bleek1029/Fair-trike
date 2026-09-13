const fs = require('fs'), zlib = require('zlib');
const f = (p) => {
  const b = fs.readFileSync(p);
  const w = b.readUInt32BE(16), h = b.readUInt32BE(20);
  let o = 8; const idat = [];
  while (o + 8 <= b.length) {
    const len = b.readUInt32BE(o), ty = b.toString('ascii', o + 4, o + 8);
    if (ty === 'IDAT') idat.push(b.slice(o + 8, o + 8 + len));
    o += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const counts = {};
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * (w * 4 + 1) + 1 + x * 4;
      if (i + 2 >= raw.length) continue;
      const key = '#' + [raw[i], raw[i + 1], raw[i + 2]].map((v) => v.toString(16).padStart(2, '0')).join('');
      counts[key] = (counts[key] || 0) + 1;
    }
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3);
  console.log(p.split('icons').pop(), top.map(([k, v]) => k + ' ' + Math.round((100 * v) / (w * h)) + '%').join(', '));
};
['icon-192.png', 'icon-512.png', 'maskable-512.png', 'apple-touch-icon.png'].forEach((n) =>
  f('d:/Downloads/Appdev/fairtrike-modern/frontend/public/icons/' + n));
