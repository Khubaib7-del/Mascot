// Renders deterministic frames of a clip at several times to review animation without a GPU.
// Usage: node scripts/pose-sheet.mjs <mascot> <clip> t1,t2,t3 [surface]
import { createServer } from 'vite';
import { chromium } from 'playwright-core';
import { existsSync, realpathSync } from 'node:fs';
import { dirname } from 'node:path';
import { mkdir } from 'node:fs/promises';

const [id, clip, times = '0.6,1.2,2', surface = 'plush'] = process.argv.slice(2);
const chrome = process.env.CHROME_PATH;
const icd = `${dirname(realpathSync(chrome))}/vk_swiftshader_icd.json`;
await mkdir('.scratch', { recursive: true });
const server = await createServer({ server: { port: 5201, strictPort: true }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ executablePath: chrome, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu-sandbox', '--no-zygote', '--no-sandbox'], env: { ...process.env, ...(existsSync(icd) ? { VK_ICD_FILENAMES: icd } : {}) } });
try {
  let i = 0;
  for (const t of times.split(',')) {
    const page = await browser.newPage({ viewport: { width: 720, height: 900 } });
    await page.goto(`http://localhost:5201/thumb.html?id=${id}&clip=${clip}&t=${t}&surface=${surface}&quality=medium&env=daylight&camera=fullBody`, { waitUntil: 'commit' });
    await page.waitForFunction(() => window.__ready || window.__error, null, { timeout: 120000 });
    const err = await page.evaluate(() => window.__error);
    if (err) throw new Error(err);
    await page.locator('#c').screenshot({ path: `.scratch/pose-${clip}-${i++}.png` });
    await page.close();
  }
} finally { await browser.close(); await server.close(); }
