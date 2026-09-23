/**
 * Generates the PWA icon set from the institute logo.
 *
 *   node scripts/generate-icons.mjs
 *
 * Two variants are produced:
 *  - "any"      : the logo with a little breathing room, used for the browser tab,
 *                 the install dialog and iOS home screens.
 *  - "maskable" : Android launchers crop icons to a circle or squircle, so the logo
 *                 is inset into a ~40% safe zone. Without this the edges get clipped.
 */
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';

const SRC = 'public/images/logo-icon.png';
const OUT = 'public/icons';

// Sampled from the logo, same as --color-accent-strong in globals.css.
const BG = { r: 0x16, g: 0x2f, b: 0x2a, alpha: 1 };

await mkdir(OUT, { recursive: true });

async function render(size, inset, file) {
  const logo = Math.round(size * inset);
  const pad = Math.round((size - logo) / 2);

  const resized = await sharp(SRC)
    .resize(logo, logo, { fit: 'contain', background: { ...BG, alpha: 0 } })
    .toBuffer();

  await sharp({ create: { width: size, height: size, channels: 4, background: BG } })
    .composite([{ input: resized, top: pad, left: pad }])
    .png()
    .toFile(`${OUT}/${file}`);

  console.log(`  ${file}  ${size}x${size}`);
}

console.log('Generating icons:');
await render(192, 0.78, 'icon-192.png');
await render(512, 0.78, 'icon-512.png');
// Maskable needs a much larger safe zone - the corners will be cut off.
await render(192, 0.6, 'icon-maskable-192.png');
await render(512, 0.6, 'icon-maskable-512.png');
await render(180, 0.78, 'apple-touch-icon.png');
console.log('Done.');
