export type QualityTier = 'low' | 'medium' | 'high' | 'ultra';

export interface QualitySettings {
  tier: QualityTier;
  dprMax: number;
  /** Multiplier on each surface's shell-layer count. */
  furLayerScale: number;
  shadows: boolean;
  shadowMapSize: number;
  sphereSegments: [number, number];
  msaa: boolean;
  fpsCap: number;
}

export const TIERS: Record<QualityTier, QualitySettings> = {
  low: { tier: 'low', dprMax: 1, furLayerScale: 0.3, shadows: false, shadowMapSize: 512, sphereSegments: [28, 18], msaa: false, fpsCap: 30 },
  medium: { tier: 'medium', dprMax: 1.5, furLayerScale: 0.55, shadows: true, shadowMapSize: 1024, sphereSegments: [40, 26], msaa: true, fpsCap: 60 },
  high: { tier: 'high', dprMax: 2, furLayerScale: 1, shadows: true, shadowMapSize: 2048, sphereSegments: [56, 36], msaa: true, fpsCap: 0 },
  ultra: { tier: 'ultra', dprMax: 2.5, furLayerScale: 1.4, shadows: true, shadowMapSize: 2048, sphereSegments: [72, 48], msaa: true, fpsCap: 0 },
};

const ORDER: QualityTier[] = ['low', 'medium', 'high', 'ultra'];
export const lowerTier = (t: QualityTier): QualityTier => ORDER[Math.max(0, ORDER.indexOf(t) - 1)];

/** Heuristic start tier. Runtime adaptation (Stage) corrects any wrong guess downward. */
export function detectTier(): QualityTier {
  const forced = new URLSearchParams(location.search).get('quality') as QualityTier | null;
  if (forced && forced in TIERS) return forced;

  const nav = navigator as Navigator & { deviceMemory?: number };
  const mobile = matchMedia('(pointer: coarse)').matches && Math.min(screen.width, screen.height) < 820;
  const mem = nav.deviceMemory ?? 8;
  const cores = navigator.hardwareConcurrency ?? 4;

  let software = false;
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    const ext = gl?.getExtension('WEBGL_debug_renderer_info');
    const r = ext ? String(gl?.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : '';
    software = /swiftshader|llvmpipe|software/i.test(r);
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
  } catch { /* detection is best-effort */ }

  if (software || mem <= 2) return 'low';
  if (mobile || mem <= 4 || cores <= 4) return 'medium';
  if (mem >= 8 && cores >= 8 && devicePixelRatio >= 2) return 'ultra';
  return 'high';
}

export function webglSupported(): boolean {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2');
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
    return !!gl;
  } catch {
    return false;
  }
}
