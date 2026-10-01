import { Stage } from './engine/stage';
import { getMascot } from './mascot/registry';
import { defaultConfig, sanitizeConfig } from './mascot/config';
import type { CameraPresetId, ClipId, EnvironmentId, ExpressionId, SurfaceId } from './mascot/types';

declare global { interface Window { __ready?: boolean; __error?: string; __stats?: unknown } }

// Used by scripts/render-thumbnails.mjs: deterministic still frames of a mascot.
async function main() {
  const q = new URLSearchParams(location.search);
  const def = getMascot(q.get('id') ?? 'moss');
  if (!def) throw new Error('unknown mascot');
  const cfg = defaultConfig(def);
  const patch: Record<string, unknown> = { ...cfg };
  if (q.get('surface')) patch.surface = q.get('surface') as SurfaceId;
  if (q.get('expression')) patch.expression = q.get('expression') as ExpressionId;
  if (q.get('env')) patch.environment = q.get('env') as EnvironmentId;
  if (q.get('camera')) patch.camera = q.get('camera') as CameraPresetId;
  if (q.get('accessories')) patch.accessories = q.get('accessories')!.split(',');
  const config = sanitizeConfig(def, patch);
  const canvas = document.getElementById('c') as HTMLCanvasElement;
  const stage = new Stage(canvas, { mode: 'static', quality: (q.get('quality') as 'ultra') ?? 'ultra', adaptive: false });
  await stage.setMascot(def, config);
  stage.freeze(Number(q.get('t') ?? 3.1), (q.get('clip') as ClipId) || undefined);
  window.__stats = stage.stats();
  window.__ready = true;
}
main().catch((e) => { window.__error = String(e?.stack ?? e); });
