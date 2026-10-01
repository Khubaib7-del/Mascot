// Composites thumbnails into one row for quick visual review. Usage: node scripts/contact-sheet.mjs out.png id1 id2 ...
import sharp from 'sharp';
const [out, ...names] = process.argv.slice(2);
const w = 360, h = 450;
const tiles = await Promise.all(names.map(async (n, i) => ({ input: await sharp(`public/thumbs/${n}.webp`).resize(w, h).png().toBuffer(), left: i * w, top: 0 })));
await sharp({ create: { width: w * names.length, height: h, channels: 3, background: '#ece6da' } }).composite(tiles).png().toFile(out);
