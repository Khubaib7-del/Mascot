export interface HSV { h: number; s: number; v: number }

export function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', '').padEnd(6, '0').slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export const rgbToHex = (r: number, g: number, b: number) =>
  '#' + [r, g, b].map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('');

export function hexToHsv(hex: string): HSV {
  const [r, g, b] = hexToRgb(hex).map((v) => v / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60; if (h < 0) h += 360;
  }
  return { h, s: max ? d / max : 0, v: max };
}

export function hsvToHex({ h, s, v }: HSV): string {
  const c = v * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - c;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
}

/** A wide, curated palette: neutrals, naturals, then saturated hues in three tones. */
export const PALETTE: string[] = [
  '#ffffff', '#f6f3ee', '#e9dcc9', '#cfc3b2', '#9a9a9a', '#3a3a40',
  '#f4b9c8', '#f2a9a0', '#ffcf9e', '#f4cf6d', '#c9e4a6', '#a8d8c8',
  '#9fd3f2', '#b5c4f0', '#d7b5f0', '#e8b7a4', '#c98a5a', '#8a5a3a',
  '#ff7a8a', '#ff9a4a', '#ffd24a', '#5fd08a', '#3ac0d8', '#5a8cff',
  '#a06ae8', '#e85fb0', '#d94a4a', '#e8a22a', '#2f9e62', '#3b5bdb',
  '#6a3fa0', '#a02f70', '#8a2f2f', '#8a6a1a', '#1f6a46', '#1f2e7a',
];
