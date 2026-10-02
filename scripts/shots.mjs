// Deterministic stills for visual QA via headless Chrome (software GL is fine).
// Usage: node scripts/shots.mjs '<json jobs>' [--size 720x900] [--out .scratch/shots] [--webp]
// A job is { name, q: "id=floe&world=mountain&..." } using the thumb.html query contract (see src/thumb.ts).
import { createServer } from 'vite';
import { chromium } from 'playwright-core';
import { existsSync, realpathSync } from 'node:fs';
import { dirname } from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';

const arg = (k, d) => (process.argv.includes(k) ? process.argv[process.argv.indexOf(k) + 1] : d);
const jobs = JSON.parse(process.argv[2]);
const [W, H] = arg('--size', '720x900').split('x').map(Number);
const out = arg('--out', '.scratch/shots');
const chrome = process.env.CHROME_PATH;
const icd = `${dirname(realpathSync(chrome))}/vk_swiftshader_icd.json`;
await mkdir(out, { recursive: true });
const server = await createServer({ server: { port: Number(arg('--port', 5210)), strictPort: true }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({
  executablePath: chrome,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu-sandbox', '--no-zygote', '--no-sandbox'],
  env: { ...process.env, ...(existsSync(icd) ? { VK_ICD_FILENAMES: icd } : {}) },
});
let failed = 0;
try {
  for (const j of jobs) {
    const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
    page.on('console', (m) => ['error', 'warning'].includes(m.type()) && console.error(`[${j.name}]`, m.text().slice(0, 300)));
    page.on('pageerror', (e) => console.error(`[${j.name}] pageerror`, e.message));
    await page.setViewportSize({ width: W, height: H });
    await page.goto(`http://localhost:${server.config.server.port}/thumb.html?${j.q}`, { waitUntil: 'commit' });
    await page.evaluate(([w, h]) => { const c = document.getElementById('c'); c.width = w; c.height = h; c.style.width = w + 'px'; c.style.height = h + 'px'; }, [W, H]).catch(() => {});
    await page.waitForFunction(() => window.__ready || window.__error, null, { timeout: 280000 });
    const err = await page.evaluate(() => window.__error);
    if (err) { console.error(`[${j.name}] ERROR`, err.split('\n').slice(0, 4).join(' | ')); failed++; await page.close(); continue; }
    const buf = await page.locator('#c').screenshot({ omitBackground: !!j.alpha });
    await writeFile(`${out}/${j.name}.png`, buf);
    console.log('ok', j.name, JSON.stringify(await page.evaluate(() => ({ ...window.__stats, buildMs: Math.round(window.__buildMs), blobMs: Math.round(globalThis.__blobMs), blobs: globalThis.__blobN }))));
    await page.close();
  }
} finally {
  await browser.close();
  await server.close();
}
process.exit(failed ? 1 : 0);
