// Headless smoke test + screenshots (software GL). Usage: node scripts/verify-ui.mjs
import { createServer } from 'vite';
import { chromium } from 'playwright-core';
import { existsSync, realpathSync } from 'node:fs';
import { dirname } from 'node:path';
import { mkdir } from 'node:fs/promises';

const chrome = process.env.CHROME_PATH;
const icd = `${dirname(realpathSync(chrome))}/vk_swiftshader_icd.json`;
await mkdir('.scratch', { recursive: true });
const server = await createServer({ server: { port: 5200, strictPort: true }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({
  executablePath: chrome,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu-sandbox', '--no-zygote', '--no-sandbox'],
  env: { ...process.env, ...(existsSync(icd) ? { VK_ICD_FILENAMES: icd } : {}) },
});
const base = 'http://localhost:5200/?quality=low';
const problems = [];
const watch = (page, tag) => {
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) problems.push(`[${tag}] ${m.type()}: ${m.text()}`); });
  page.on('pageerror', (e) => problems.push(`[${tag}] pageerror: ${e.message}`));
};
const ready = (page) => page.waitForSelector('.viewer[data-status="ready"]', { timeout: 90000 });

try {
  const d = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  watch(d, 'desktop');
  await d.goto(base, { waitUntil: 'commit' });
  await ready(d);
  await d.mouse.move(400, 300);
  await d.waitForTimeout(2500);
  await d.screenshot({ path: '.scratch/home-hero.png' });
  await d.evaluate(() => window.scrollTo(0, 1100));
  await d.waitForTimeout(800);
  await d.screenshot({ path: '.scratch/home-mid.png' });

  await d.goto(`${base}#/mascot/moss`, { waitUntil: 'commit' });
  await ready(d);
  await d.waitForTimeout(1500);
  await d.screenshot({ path: '.scratch/pg-default.png' });
  await d.getByRole('tab', { name: 'Motion' }).click();
  await d.getByRole('button', { name: 'Wave' }).click();
  await d.waitForTimeout(1100);
  await d.screenshot({ path: '.scratch/pg-wave.png' });
  await d.getByRole('tab', { name: 'Scene' }).click();
  await d.getByRole('radio', { name: 'Cinematic' }).first().click();
  await d.waitForTimeout(6000);
  await d.screenshot({ path: '.scratch/pg-cinematic.png' });
  await d.getByRole('tab', { name: 'Look' }).click();
  await d.getByRole('radio', { name: 'Plush' }).click();
  await d.getByRole('button', { name: 'Round glasses' }).click();
  await d.waitForTimeout(900);
  await d.screenshot({ path: '.scratch/pg-plush-glasses.png' });
  console.log('share url hash:', (await d.evaluate(() => location.hash)).slice(0, 60));

  // route transitions create/dispose contexts repeatedly
  for (const h of ['#/explore', '#/mascot/pip', '#/', '#/mascot/orbit', '#/explore']) {
    await d.evaluate((x) => { location.hash = x; }, h);
    await d.waitForTimeout(1200);
  }
  await d.goto(`${base}#/mascot/nope`, { waitUntil: 'commit' });
  await d.waitForTimeout(500);
  console.log('404 text:', await d.locator('h1').innerText());

  const m = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
  watch(m, 'mobile');
  await m.goto(base, { waitUntil: 'commit' });
  await ready(m);
  await m.waitForTimeout(1500);
  await m.screenshot({ path: '.scratch/m-home.png' });
  await m.goto(`${base}#/mascot/pip`, { waitUntil: 'commit' });
  await ready(m);
  await m.waitForTimeout(1200);
  await m.screenshot({ path: '.scratch/m-pg.png' });

  const r = await browser.newPage({ viewport: { width: 1100, height: 760 }, reducedMotion: 'reduce' });
  watch(r, 'reduced');
  await r.goto(`${base}#/mascot/orbit`, { waitUntil: 'commit' });
  await ready(r);
  await r.waitForTimeout(800);
  await r.screenshot({ path: '.scratch/pg-orbit-reduced.png' });
} finally {
  await browser.close();
  await server.close();
}
console.log(problems.length ? `PROBLEMS (${problems.length}):\n${[...new Set(problems)].join('\n')}` : 'no console errors/warnings');
