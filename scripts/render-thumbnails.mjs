// Renders deterministic transparent WebP thumbnails for every mascot via headless Chrome.
// Usage: npm run thumbs [-- --only moss]
import { createServer } from 'vite';
import { chromium } from 'playwright-core';
import { mkdir, writeFile } from 'node:fs/promises';
import sharp from 'sharp';
import { existsSync, realpathSync } from 'node:fs';
import { dirname } from 'node:path';

const chrome = process.env.CHROME_PATH ?? ['/usr/local/bin/google-chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].find(existsSync);
const out = 'public/thumbs';
const only = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1] : null;

const jobs = [
  { name: 'moss', q: 'id=moss&expression=happy&camera=hero&env=daylight' },
  { name: 'moss-smooth', q: 'id=moss&surface=smooth&expression=happy&env=daylight' },
  { name: 'moss-plush', q: 'id=moss&surface=plush&expression=happy&env=daylight' },
  { name: 'moss-fuzzy', q: 'id=moss&surface=fuzzy&expression=happy&env=daylight' },
  { name: 'pip', q: 'id=pip&expression=happy&env=pastel' },
  { name: 'orbit', q: 'id=orbit&expression=happy&env=studio' },
].filter((j) => !only || j.name === only || j.name.startsWith(`${only}-`));

await mkdir(out, { recursive: true });
const server = await createServer({ server: { port: 5199, strictPort: true }, logLevel: 'error' });
await server.listen();
// Headless CI boxes have no GPU: fall back to Chrome's bundled SwiftShader (software Vulkan -> ANGLE).
const chromeDir = chrome ? dirname(realpathSync(chrome)) : '';
const icd = `${chromeDir}/vk_swiftshader_icd.json`;
const browser = await chromium.launch({
  executablePath: chrome,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu-sandbox', '--no-zygote', '--no-sandbox'],
  env: { ...process.env, ...(existsSync(icd) ? { VK_ICD_FILENAMES: icd } : {}) },
});
try {
  for (const j of jobs) {
    const page = await browser.newPage({ viewport: { width: 720, height: 900 }, deviceScaleFactor: 1 });
    page.on('console', (m) => m.type() === 'error' && console.error('[page]', m.text()));
    page.on('pageerror', (e) => console.error('[pageerror]', e.message));
    await page.goto(`http://localhost:5199/thumb.html?${j.q}`, { waitUntil: 'commit' });
    await page.waitForFunction(() => window.__ready || window.__error, null, { timeout: 120000 });
    const err = await page.evaluate(() => window.__error);
    if (err) throw new Error(`${j.name}: ${err}`);
    const buf = await page.locator('#c').screenshot({ omitBackground: true });
    const webp = await sharp(buf).webp({ quality: 84, alphaQuality: 92, effort: 5 }).toBuffer();
    await writeFile(`${out}/${j.name}.webp`, webp);
    console.log('wrote', `${out}/${j.name}.webp`, webp.length, 'bytes', JSON.stringify(await page.evaluate(() => window.__stats)));
    await page.close();
  }
} finally {
  await browser.close();
  await server.close();
}
