import type { Params } from '../../mascot/types';

export interface ParamPreset { id: string; label: string; note: string; params: Partial<Params> }

export const FUR_PRESETS: ParamPreset[] = [
  { id: 'plush', label: 'Plush toy', note: 'Soft, even, low-contrast', params: { furLength: 0.7, furDensity: 1.2, softness: 0.8, fluffiness: 0.3, furVariation: 0.2, furDirection: 0.5 } },
  { id: 'cloud', label: 'Cloud', note: 'Long and airy', params: { furLength: 1.6, furDensity: 0.8, softness: 0.9, fluffiness: 0.9, furVariation: 0.6, furDirection: 0.5 } },
  { id: 'sleek', label: 'Sleek', note: 'Short and close', params: { furLength: 0.5, furDensity: 1.5, softness: 0.4, fluffiness: 0.1, furVariation: 0.3, furDirection: 0.55 } },
  { id: 'wild', label: 'Windswept', note: 'Leaning, uneven', params: { furLength: 1.3, furDensity: 0.9, softness: 0.5, fluffiness: 0.7, furVariation: 0.9, furDirection: 0.85 } },
];

export const FACE_PRESETS: ParamPreset[] = [
  { id: 'default', label: 'Natural', note: 'Authored proportions', params: { eyeSize: 1, irisSize: 1, pupilSize: 1, eyeSpacing: 1, highlight: 1, squint: 0 } },
  { id: 'wide', label: 'Wide-eyed', note: 'Big, bright, innocent', params: { eyeSize: 1.25, irisSize: 1.1, pupilSize: 0.9, eyeSpacing: 1.05, highlight: 1.3, squint: 0 } },
  { id: 'sly', label: 'Sly', note: 'Narrow, knowing', params: { eyeSize: 0.9, irisSize: 1, pupilSize: 0.8, eyeSpacing: 0.95, highlight: 0.8, squint: 0.4 } },
  { id: 'sparkle', label: 'Sparkle', note: 'Big highlights', params: { eyeSize: 1.15, irisSize: 1.25, pupilSize: 0.7, eyeSpacing: 1, highlight: 1.7, squint: 0 } },
];

export const BODY_PRESETS: ParamPreset[] = [
  { id: 'default', label: 'Authored', note: 'As designed', params: { headSize: 1, bodySize: 1 } },
  { id: 'chibi', label: 'Chibi', note: 'Big head, small body', params: { headSize: 1.22, bodySize: 0.88 } },
  { id: 'sturdy', label: 'Sturdy', note: 'Smaller head, broader body', params: { headSize: 0.92, bodySize: 1.12 } },
];
