// Renders each character's signature look in its own world from the live renderer (headless Chrome, software GL is fine).
// Usage: npm run thumbs [-- --only floe] [-- --quality high]
import { createServer } from 'vite';
import { chromium } from 'playwright-core';
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync, realpathSync } from 'node:fs';
import { dirname } from 'node:path';
import sharp from 'sharp';

const arg = (k, d) => (process.argv.includes(k) ? process.argv[process.argv.indexOf(k) + 1] : d);
const only = arg('--only', null);
const quality = arg('--quality', 'high');
const chrome = process.env.CHROME_PATH ?? ['/usr/local/bin/google-chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].find(existsSync);
const out = 'public/thumbs';
const ids = ['floe', 'alma', 'lumi', 'orbit'].filter((i) => !only || i === only);
const W = 600, H = 750;

await mkdir(out, { recursive: true });
const server = await createServer({ server: { port: 5199, strictPort: true }, logLevel: 'error' });
await server.listen();
// Headless CI boxes have no GPU: fall back to Chrome's bundled SwiftShader (software Vulkan -> ANGLE).
const icd = `${dirname(realpathSync(chrome))}/vk_swiftshader_icd.json`;
const browser = await chromium.launch({
  executablePath: chrome,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu-sandbox', '--no-zygote', '--no-sandbox'],
  env: { ...process.env, ...(existsSync(icd) ? { VK_ICD_FILENAMES: icd } : {}) },
});
try {
  for (const id of ids) {
    const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
    page.on('pageerror', (e) => console.error('[pageerror]', e.message));
    await page.goto(`http://localhost:5199/thumb.html?id=${id}&look=signature&quality=${quality}&t=4`, { waitUntil: 'commit' });
    await page.evaluate(([w, h]) => { const c = document.getElementById('c'); c.width = w; c.height = h; c.style.width = w + 'px'; c.style.height = h + 'px'; }, [W, H]).catch(() => {});
    await page.waitForFunction(() => window.__ready || window.__error, null, { timeout: 280000 });
    const err = await page.evaluate(() => window.__error);
    if (err) throw new Error(`${id}: ${err}`);
    const png = await page.locator('#c').screenshot();
    const webp = await sharp(png).webp({ quality: 84, effort: 5 }).toBuffer();
    await writeFile(`${out}/${id}.webp`, webp);
    console.log('wrote', `${out}/${id}.webp`, webp.length, 'bytes', JSON.stringify(await page.evaluate(() => window.__stats)));
    await page.close();
  }
} finally {
  await browser.close();
  await server.close();
}
