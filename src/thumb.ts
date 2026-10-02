import { Stage } from './engine/stage';
import { getMascot } from './mascot/registry';
import { defaultConfig, sanitizeConfig, signatureConfig } from './mascot/config';
import type { ClipId } from './mascot/types';

declare global { interface Window { __ready?: boolean; __error?: string; __stats?: unknown } }

/**
 * Entry for scripts/render-thumbnails.mjs and the QA scripts: deterministic still frames.
 * Query: id, look=signature|default, any MascotConfig field as JSON in `cfg`, t, clip, quality.
 */
async function main() {
  const q = new URLSearchParams(location.search);
  const def = getMascot(q.get('id') ?? 'floe');
  if (!def) throw new Error('unknown mascot');
  const base = q.get('look') === 'default' ? defaultConfig(def) : signatureConfig(def);
  let patch: Record<string, unknown> = { ...base };
  const cfg = q.get('cfg');
  if (cfg) patch = { ...patch, ...JSON.parse(cfg) };
  for (const k of ['surface', 'expression', 'lighting', 'world', 'camera', 'agent']) if (q.get(k)) patch[k] = q.get(k);
  if (q.get('accessories')) patch.accessories = q.get('accessories')!.split(',').filter(Boolean);
  if (q.get('charms')) patch.charms = q.get('charms')!.split(',').filter(Boolean);
  const config = sanitizeConfig(def, patch);
  const canvas = document.getElementById('c') as HTMLCanvasElement;
  const stage = new Stage(canvas, { mode: 'static', quality: (q.get('quality') as 'ultra') ?? 'ultra', adaptive: false });
  const t0 = performance.now();
  await stage.setMascot(def, config, { instant: true });
  (window as unknown as { __buildMs?: number }).__buildMs = performance.now() - t0;
  stage.freeze(Number(q.get('t') ?? 3.1), (q.get('clip') as ClipId) || undefined);
  const hide = q.get('hide');
  if (hide) stage.scene.traverse((o) => { const t = o as unknown as { isPoints?: boolean; isSprite?: boolean; isLineSegments?: boolean }; if ((hide.includes('points') && (t.isPoints || t.isLineSegments)) || (hide.includes('sprites') && t.isSprite)) o.visible = false; });
  if (hide) stage.freeze(Number(q.get('t') ?? 3.1), (q.get('clip') as ClipId) || undefined);
  window.__stats = stage.stats();
  (window as unknown as { __stage?: Stage }).__stage = stage;
  window.__ready = true;
}
main().catch((e) => { window.__error = String(e?.stack ?? e); });
