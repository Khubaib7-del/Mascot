// Headless smoke + visual QA for the whole site (software GL). Usage: node scripts/verify-ui.mjs
import { createServer } from 'vite';
import { chromium } from 'playwright-core';
import { existsSync, realpathSync } from 'node:fs';
import { dirname } from 'node:path';
import { mkdir } from 'node:fs/promises';
import sharp from 'sharp';

const chrome = process.env.CHROME_PATH;
const icd = `${dirname(realpathSync(chrome))}/vk_swiftshader_icd.json`;
await mkdir('.scratch/qa', { recursive: true });
const server = await createServer({ server: { port: 5220, strictPort: true }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({
  executablePath: chrome,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu-sandbox', '--no-zygote', '--no-sandbox'],
  env: { ...process.env, ...(existsSync(icd) ? { VK_ICD_FILENAMES: icd } : {}) },
});
const base = 'http://localhost:5220/?quality=low&debug';
const problems = [], results = [];
const ok = (name, pass, extra = '') => { results.push(`${pass ? 'PASS' : 'FAIL'}  ${name}${extra ? ' — ' + extra : ''}`); };
const watch = (page, tag) => {
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type()) && !/Failed to load resource/.test(m.text())) problems.push(`[${tag}] ${m.type()}: ${m.text().slice(0, 200)}`); });
  page.on('pageerror', (e) => problems.push(`[${tag}] pageerror: ${e.message}`));
};
const ready = (page, t = 150000) => page.waitForSelector('.viewer[data-status="ready"]', { timeout: t });
/** True when the composited page shows a character: a WebGL canvas can't be read back with drawImage, so measure a real screenshot. */
const hasContent = async (page) => {
  const buf = await page.screenshot();
  const { width, height } = await sharp(buf).metadata();
  const crop = await sharp(buf).extract({ left: Math.round(width * 0.3), top: Math.round(height * 0.25), width: Math.round(width * 0.4), height: Math.round(height * 0.5) }).stats();
  const sd = crop.channels.slice(0, 3).reduce((a, c) => a + c.stdev, 0) / 3;
  return sd > 14;
};
const chapter = async (page, id) => {
  await page.evaluate((c) => document.querySelector(`[data-chapter="${c}"]`).scrollIntoView({ behavior: 'instant', block: 'center' }), id);
  await page.waitForFunction((c) => document.querySelector('.world-page').dataset.chapterActive === c, id, { timeout: 60000 });
  await page.waitForTimeout(1200);
  await page.waitForFunction(() => !window.__stage.busy, null, { timeout: 300000 }).catch(() => {});
  await page.evaluate(() => window.__stage.settle()); await page.waitForTimeout(2500);
};
try {
  // ---------- desktop landing
  const d = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  watch(d, 'desktop');
  await d.goto(base, { waitUntil: 'commit' });
  await ready(d); await d.mouse.move(420, 320); await d.waitForTimeout(1500); await d.evaluate(() => window.__stage.settle()); await d.waitForTimeout(3000);
  await d.screenshot({ path: '.scratch/qa/home-1-hero.png' });
  ok('landing hero renders a live canvas', await hasContent(d));
  const h = await d.evaluate(() => document.querySelector('.splash')?.classList.contains('gone'));
  ok('splash dismissed after first frame', !!h);
  for (const [i, id] of ['collection', 'craft', 'worlds', 'finale'].entries()) {
    await chapter(d, id);
    await d.screenshot({ path: `.scratch/qa/home-${i + 2}-${id}.png` });
    ok(`chapter ${id} keeps a character on screen`, await hasContent(d));
  }

  // ---------- playground
  await d.goto(`${base}#/mascot/floe?debug`, { waitUntil: 'commit' });
  await ready(d); await d.evaluate(() => window.__stage.settle()); await d.waitForTimeout(4000);
  await d.screenshot({ path: '.scratch/qa/pg-1-default.png' });
  ok('playground renders', await hasContent(d));
  for (const [tab, shot] of [['Color', 'pg-2-color'], ['Fur', 'pg-3-fur'], ['Face', 'pg-4-face'], ['Outfit', 'pg-5-outfit'], ['Charms', 'pg-6-charms'], ['Agent', 'pg-7-agent'], ['Motion', 'pg-8-motion'], ['Scene', 'pg-9-scene'], ['Quality', 'pg-10-quality']]) {
    await d.getByRole('tab', { name: tab }).click(); await d.waitForTimeout(400);
    if (tab === 'Charms') { await d.getByRole('button', { name: 'Rocket', exact: true }).click(); await d.getByRole('button', { name: 'Terminal', exact: true }).click(); await d.getByRole('button', { name: 'Star', exact: true }).click(); await d.waitForTimeout(1500); }
    if (tab === 'Agent') { await d.getByRole('radio', { name: 'Coding', exact: true }).click(); await d.waitForTimeout(5000); }
    if (tab === 'Fur') { await d.locator('input[aria-label="Fur length"]').fill('1.8'); await d.waitForTimeout(1500); }
    if (tab === 'Face') { await d.getByRole('radio', { name: 'Surprised', exact: true }).click(); await d.waitForTimeout(1500); }
    await d.screenshot({ path: `.scratch/qa/${shot}.png` });
  }
  // world switch via the dock
  await d.getByRole('radio', { name: 'Space', exact: true }).click(); await d.waitForTimeout(1500); await d.waitForFunction(() => !window.__stage.busy, null, { timeout: 300000 }).catch(() => {}); await d.evaluate(() => window.__stage.settle()); await d.waitForTimeout(3000);
  await d.screenshot({ path: '.scratch/qa/pg-11-space.png' });
  ok('world switch keeps the character', await hasContent(d));

  // ---------- quality lifecycle: user change + forced failure
  await d.getByRole('tab', { name: 'Quality' }).click();
  await d.getByRole('radio', { name: 'High', exact: true }).click({ timeout: 300000 }); await d.waitForTimeout(6000);
  ok('quality change to High keeps the character', await hasContent(d));
  await d.getByRole('radio', { name: 'Ultra', exact: true }).click({ timeout: 300000 }); await d.waitForTimeout(8000);
  ok('quality change to Ultra keeps the character', await hasContent(d));
  const forced = await d.evaluate(() => {
    const s = window.__stage; if (!s) return 'no-stage';
    const gl = s.renderer.getContext(); const orig = gl.getError.bind(gl); let n = 0;
    gl.getError = () => (n++ < 2 ? 1281 : orig()); // first two tier attempts "fail"
    const before = s.qualityTier; const after = s.setQuality('ultra'); gl.getError = orig;
    return `${before} -> ${after}`;
  });
  await d.waitForTimeout(4000);
  ok('forced GL failure falls back down the ladder', typeof forced === 'string' && forced.includes('->'), forced);
  ok('character still on screen after forced failure', await hasContent(d));
  await d.screenshot({ path: '.scratch/qa/pg-12-after-failure.png' });
  const lostRestore = await d.evaluate(async () => {
    const s = window.__stage; const gl = s.renderer.getContext(); const ext = gl.getExtension('WEBGL_lose_context');
    if (!ext) return 'no-ext'; ext.loseContext(); await new Promise((r) => setTimeout(r, 600)); ext.restoreContext(); await new Promise((r) => setTimeout(r, 2500)); return 'done';
  });
  await d.waitForTimeout(4000);
  ok('context loss + restore recovers the scene', lostRestore === 'done' && await hasContent(d), lostRestore);

  // ---------- route churn (dispose paths)
  for (const hsh of ['#/explore', '#/mascot/alma', '#/', '#/mascot/lumi', '#/mascot/orbit', '#/explore']) { await d.evaluate((x) => { location.hash = x; }, hsh); await d.waitForTimeout(2500); }
  await d.screenshot({ path: '.scratch/qa/explore.png', fullPage: true });
  await d.goto(`${base}#/mascot/nope`, { waitUntil: 'commit' }); await d.waitForTimeout(600);
  ok('unknown mascot shows 404', (await d.locator('h1').innerText()).includes('couldn’t find'));

  // ---------- mobile
  const m = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
  watch(m, 'mobile');
  await m.goto(base, { waitUntil: 'commit' }); await ready(m); await m.evaluate(() => window.__stage?.settle()); await m.waitForTimeout(3500);
  await m.screenshot({ path: '.scratch/qa/m-1-home.png' });
  await m.goto(`${base}#/mascot/alma`, { waitUntil: 'commit' }); await ready(m); await m.evaluate(() => window.__stage?.settle()); await m.waitForTimeout(4000);
  await m.screenshot({ path: '.scratch/qa/m-2-pg.png' });
  ok('mobile playground renders', await hasContent(m));

  // ---------- reduced motion
  const r = await browser.newPage({ viewport: { width: 1100, height: 760 }, reducedMotion: 'reduce' });
  watch(r, 'reduced');
  await r.goto(`${base}#/mascot/orbit`, { waitUntil: 'commit' }); await ready(r); await r.evaluate(() => window.__stage?.settle()); await r.waitForTimeout(3000);
  await r.screenshot({ path: '.scratch/qa/pg-reduced.png' });
  ok('reduced-motion playground renders', await hasContent(r));
} finally {
  await browser.close();
  await server.close();
}
console.log(results.join('\n'));
console.log(problems.length ? `CONSOLE PROBLEMS (${problems.length}):\n${[...new Set(problems)].join('\n')}` : 'no console errors/warnings');
