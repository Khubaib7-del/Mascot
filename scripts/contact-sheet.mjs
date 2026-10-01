// Composites WebPs from public/thumbs onto a neutral backdrop for quick visual review.
// Usage: node scripts/contact-sheet.mjs out.png name1 name2 ...
import { chromium } from 'playwright-core';
import { resolve } from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
await mkdir('.scratch', { recursive: true });
const [out, ...names] = process.argv.slice(2);
const html = `<body style="margin:0;background:#ece6da;display:flex;flex-wrap:wrap;width:${Math.min(names.length, 3) * 480}px">${names
  .map((n) => `<img src="file://${resolve('public/thumbs', n + '.webp')}" width="480" height="600">`)
  .join('')}</body>`;
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH, args: ['--no-sandbox'] });
const p = await b.newPage({ viewport: { width: Math.min(names.length, 3) * 480, height: Math.ceil(names.length / 3) * 600 } });
const page = resolve('.scratch', 'sheet.html');
await writeFile(page, html);
await p.goto('file://' + page);
await p.screenshot({ path: out });
await b.close();
