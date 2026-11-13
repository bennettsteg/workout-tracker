/**
 * Generates the PWA icon set: a simple white barbell glyph on the orange primary
 * (#f97316) tile. Pure JS (pngjs), no native deps, so it runs anywhere Node runs.
 *
 *   node scripts/generate-icons.mjs
 *
 * Outputs (committed; re-run only when the logo changes):
 *   public/icons/icon-192.png, icon-512.png            "any" icons, rounded tile
 *   public/icons/icon-maskable-192.png, -512.png        full-bleed, bar inside the safe zone
 *   public/icons/apple-touch-icon.png                   180x180, opaque full-bleed (iOS rounds it)
 *   public/icons/icon.svg                               scalable "any" icon (favicon)
 *   src/app/favicon.ico                                 16/32/48 PNG-in-ICO
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { PNG } from "pngjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const iconsDir = path.join(root, "public", "icons");

const PRIMARY = [0xf9, 0x73, 0x16];
const BAR_COLOR = [0x1c, 0x12, 0x00];

function hex(rgb) {
  return "#" + rgb.map((c) => c.toString(16).padStart(2, "0")).join("");
}

/** Draws a rounded (or full-bleed when radius=0) tile with a horizontal barbell glyph. */
function drawTile(size, { barFraction, radius }) {
  const png = new PNG({ width: size, height: size });
  const cx = size / 2;
  const cy = size / 2;
  const r = size * radius;

  const insideRoundedTile = (x, y) => {
    if (r === 0) return true;
    const dx = Math.max(0, r - x, r - (size - 1 - x));
    const dy = Math.max(0, r - y, r - (size - 1 - y));
    if (dx === 0 || dy === 0) return true;
    return dx * dx + dy * dy <= r * r;
  };

  // Barbell geometry, scaled by barFraction (fraction of tile width the bar spans).
  const barHalfWidth = (size * barFraction) / 2;
  const barHalfHeight = size * 0.035;
  const plateHalfHeight = size * 0.14;
  const plateWidth = size * 0.055;
  const collarHalfHeight = size * 0.09;
  const collarWidth = size * 0.03;

  const within = (v, center, halfW, halfH, x, y) =>
    x >= center - halfW && x <= center + halfW && y >= cy - halfH && y <= cy + halfH;

  const isBar = (x, y) => within(null, cx, barHalfWidth - plateWidth, barHalfHeight, x, y);
  const isLeftPlate = (x, y) =>
    within(null, cx - barHalfWidth + plateWidth / 2, plateWidth / 2, plateHalfHeight, x, y);
  const isRightPlate = (x, y) =>
    within(null, cx + barHalfWidth - plateWidth / 2, plateWidth / 2, plateHalfHeight, x, y);
  const isLeftCollar = (x, y) =>
    within(null, cx - barHalfWidth - collarWidth / 2, collarWidth / 2, collarHalfHeight, x, y);
  const isRightCollar = (x, y) =>
    within(null, cx + barHalfWidth + collarWidth / 2, collarWidth / 2, collarHalfHeight, x, y);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (size * y + x) << 2;
      const inside = insideRoundedTile(x, y);
      let rgb = inside ? PRIMARY : [0, 0, 0];
      let alpha = inside ? 255 : 0;

      if (inside) {
        const glyph =
          isBar(x, y) ||
          isLeftPlate(x, y) ||
          isRightPlate(x, y) ||
          isLeftCollar(x, y) ||
          isRightCollar(x, y);
        if (glyph) rgb = BAR_COLOR;
      }

      png.data[idx] = rgb[0];
      png.data[idx + 1] = rgb[1];
      png.data[idx + 2] = rgb[2];
      png.data[idx + 3] = alpha;
    }
  }

  return PNG.sync.write(png);
}

function tileSvg(size, { barFraction, radius }) {
  const r = size * radius;
  const cx = size / 2;
  const cy = size / 2;
  const barHalfWidth = (size * barFraction) / 2;
  const strokeWidth = size * 0.07;
  const plateHalfHeight = size * 0.14;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
<rect width="${size}" height="${size}" rx="${r}" fill="${hex(PRIMARY)}"/>
<g stroke="${hex(BAR_COLOR)}" stroke-width="${strokeWidth}" stroke-linecap="round">
<line x1="${cx - barHalfWidth}" y1="${cy}" x2="${cx + barHalfWidth}" y2="${cy}"/>
<line x1="${cx - barHalfWidth * 0.6}" y1="${cy - plateHalfHeight}" x2="${cx - barHalfWidth * 0.6}" y2="${cy + plateHalfHeight}"/>
<line x1="${cx + barHalfWidth * 0.6}" y1="${cy - plateHalfHeight}" x2="${cx + barHalfWidth * 0.6}" y2="${cy + plateHalfHeight}"/>
</g>
</svg>`;
}

/** Packs PNG buffers into an .ico (PNG-compressed entries, supported by every modern browser). */
function ico(entries) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(entries.length, 4);
  let offset = 6 + 16 * entries.length;
  const dirs = entries.map(({ size, data }) => {
    const dir = Buffer.alloc(16);
    dir.writeUInt8(size === 256 ? 0 : size, 0);
    dir.writeUInt8(size === 256 ? 0 : size, 1);
    dir.writeUInt16LE(1, 4); // colour planes
    dir.writeUInt16LE(32, 6); // bits per pixel
    dir.writeUInt32LE(data.length, 8);
    dir.writeUInt32LE(offset, 12);
    offset += data.length;
    return dir;
  });
  return Buffer.concat([header, ...dirs, ...entries.map((e) => e.data)]);
}

await mkdir(iconsDir, { recursive: true });

const any = { barFraction: 0.56, radius: 0.22 };
const maskable = { barFraction: 0.42, radius: 0 };

for (const size of [192, 512]) {
  await writeFile(path.join(iconsDir, `icon-${size}.png`), drawTile(size, any));
  await writeFile(path.join(iconsDir, `icon-maskable-${size}.png`), drawTile(size, maskable));
}

await writeFile(path.join(iconsDir, "apple-touch-icon.png"), drawTile(180, { ...any, radius: 0 }));
await writeFile(path.join(iconsDir, "icon.svg"), tileSvg(512, any) + "\n");

const favicons = [16, 32, 48].map((size) => ({ size, data: drawTile(size, any) }));
await writeFile(path.join(root, "src", "app", "favicon.ico"), ico(favicons));

console.log("Icons written to public/icons and src/app/favicon.ico");
