// Lays out PNGs side by side on a neutral backdrop. Usage: node scripts/strip.mjs out.png in1.png in2.png ...
import { chromium } from 'playwright-core';
import { resolve } from 'node:path';
import { writeFile, mkdir } from 'node:fs/promises';
const [out, ...ins] = process.argv.slice(2);
await mkdir('.scratch', { recursive: true });
const w = Number(process.env.SW ?? 360), h = Number(process.env.SH ?? 450);
await writeFile('.scratch/strip.html', `<body style="margin:0;background:#ece6da;display:flex;width:${ins.length * w}px">${ins.map((f) => `<img src="file://${resolve(f)}" width="${w}" height="${h}">`).join('')}</body>`);
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH, args: ['--no-sandbox'] });
const p = await b.newPage({ viewport: { width: ins.length * w, height: h } });
await p.goto('file://' + resolve('.scratch/strip.html'));
await p.screenshot({ path: out });
await b.close();
