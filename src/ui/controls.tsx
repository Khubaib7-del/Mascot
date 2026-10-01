import { useState, type ReactNode } from 'react';
import { hexToHsv, hexToRgb, hsvToHex, PALETTE, rgbToHex } from './color';

export function Group({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <section className="group">
      <h3>{label}{hint && <span>{hint}</span>}</h3>
      {children}
    </section>
  );
}

/** One-line slider: label, track, and a seven-segment style readout. */
export function Slider({ label, value, min = 0, max = 1, step = 0.01, onChange, digits = 2, hint }: {
  label: string; value: number; min?: number; max?: number; step?: number; onChange: (v: number) => void; digits?: number; hint?: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <label className="sl" title={hint}>
      <span className="sl-l">{label}</span>
      <input type="range" min={min} max={max} step={step} value={value} aria-label={label}
        style={{ ['--p' as string]: `${pct}%` }} onChange={(e) => onChange(Number(e.target.value))} />
      <output className="seg">{value.toFixed(digits)}</output>
    </label>
  );
}

export function Swatches({ value, options, onChange, label }: { value: string; options: string[]; onChange: (v: string) => void; label: string }) {
  return (
    <div className="swatches" role="radiogroup" aria-label={label}>
      {options.map((c) => (
        <button key={c} type="button" role="radio" aria-checked={value.toLowerCase() === c.toLowerCase()} aria-label={c}
          className="swatch" style={{ background: c }} onClick={() => onChange(c)} />
      ))}
    </div>
  );
}

export function Chips<T extends string>({ value, options, onChange, label }: {
  value: T | null; options: { id: T; label: string; note?: string; disabled?: boolean }[]; onChange: (v: T) => void; label: string;
}) {
  return (
    <div className="chips" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o.id} type="button" role="radio" aria-checked={value === o.id} disabled={o.disabled} className="chip" onClick={() => onChange(o.id)} title={o.note}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Toggles({ options, value, onToggle, max }: { options: { id: string; label: string; note?: string }[]; value: string[]; onToggle: (id: string) => void; max?: number }) {
  const full = max !== undefined && value.length >= max;
  return (
    <div className="chips">
      {options.map((o) => (
        <button key={o.id} type="button" aria-pressed={value.includes(o.id)} disabled={full && !value.includes(o.id)} className="chip" title={o.note} onClick={() => onToggle(o.id)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Switch({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={on} className="switch" onClick={() => onChange(!on)}>
      <span className="switch-track"><span /></span>{label}
    </button>
  );
}

/** Visual swatch grid + HSV sliders + HEX / RGB entry. Replaces the old row of tiny dots. */
export function ColorPicker({ value, onChange, swatches, label }: { value: string; onChange: (hex: string) => void; swatches?: string[]; label: string }) {
  const hsv = hexToHsv(value);
  const [r, g, b] = hexToRgb(value);
  const [draft, setDraft] = useState<string | null>(null);
  const set = (p: Partial<typeof hsv>) => onChange(hsvToHex({ ...hsv, ...p }));
  return (
    <div className="cp">
      <div className="cp-current" style={{ background: value }} aria-hidden />
      {swatches && (
        <>
          <p className="cp-cap">Suggested</p>
          <div className="cp-grid cp-grid-lg" role="radiogroup" aria-label={`${label} suggestions`}>
            {swatches.map((c) => <button key={c} type="button" role="radio" aria-checked={c.toLowerCase() === value.toLowerCase()} aria-label={c} className="cp-sw" style={{ background: c }} onClick={() => onChange(c)} />)}
          </div>
        </>
      )}
      <p className="cp-cap">Palette</p>
      <div className="cp-grid" role="radiogroup" aria-label={`${label} palette`}>
        {PALETTE.map((c) => <button key={c} type="button" role="radio" aria-checked={c.toLowerCase() === value.toLowerCase()} aria-label={c} className="cp-sw" style={{ background: c }} onClick={() => onChange(c)} />)}
      </div>
      <label className="sl"><span className="sl-l">Hue</span>
        <input className="track-hue" type="range" min={0} max={359} value={Math.round(hsv.h)} aria-label="Hue" onChange={(e) => set({ h: Number(e.target.value) })} /><output className="seg">{Math.round(hsv.h)}</output></label>
      <label className="sl"><span className="sl-l">Saturation</span>
        <input type="range" min={0} max={1} step={0.01} value={hsv.s} aria-label="Saturation" style={{ ['--p' as string]: `${hsv.s * 100}%` }} onChange={(e) => set({ s: Number(e.target.value) })} /><output className="seg">{hsv.s.toFixed(2)}</output></label>
      <label className="sl"><span className="sl-l">Brightness</span>
        <input type="range" min={0} max={1} step={0.01} value={hsv.v} aria-label="Brightness" style={{ ['--p' as string]: `${hsv.v * 100}%` }} onChange={(e) => set({ v: Number(e.target.value) })} /><output className="seg">{hsv.v.toFixed(2)}</output></label>
      <div className="cp-inputs">
        <label>HEX<input value={draft ?? value} spellCheck={false} aria-label="Hex colour"
          onChange={(e) => { const v = e.target.value; setDraft(v); if (/^#[0-9a-f]{6}$/i.test(v)) onChange(v.toLowerCase()); }} onBlur={() => setDraft(null)} /></label>
        {([['R', r], ['G', g], ['B', b]] as const).map(([k, v], i) => (
          <label key={k}>{k}<input type="number" min={0} max={255} value={v} aria-label={`${k} channel`}
            onChange={(e) => { const c = [r, g, b]; c[i] = Number(e.target.value); onChange(rgbToHex(c[0], c[1], c[2])); }} /></label>
        ))}
      </div>
    </div>
  );
}
