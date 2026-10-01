import type { ReactNode } from 'react';

export function Group({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <section className="group">
      <h3>{label}{hint && <span>{hint}</span>}</h3>
      {children}
    </section>
  );
}

export function Swatches({ value, options, onChange, label }: { value: string; options: string[]; onChange: (v: string) => void; label: string }) {
  return (
    <div className="swatches" role="radiogroup" aria-label={label}>
      {options.map((c) => (
        <button
          key={c} type="button" role="radio" aria-checked={value.toLowerCase() === c.toLowerCase()} aria-label={c}
          className="swatch" style={{ background: c }} onClick={() => onChange(c)}
        />
      ))}
      <label className="swatch swatch-custom" title="Custom colour">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} aria-label={`${label} custom colour`} />
      </label>
    </div>
  );
}

export function Chips<T extends string>({ value, options, onChange, label }: {
  value: T | null; options: { id: T; label: string; note?: string }[]; onChange: (v: T) => void; label: string;
}) {
  return (
    <div className="chips" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o.id} type="button" role="radio" aria-checked={value === o.id} className="chip" onClick={() => onChange(o.id)} title={o.note}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Toggles({ options, value, onToggle }: { options: { id: string; label: string }[]; value: string[]; onToggle: (id: string) => void }) {
  return (
    <div className="chips">
      {options.map((o) => (
        <button key={o.id} type="button" aria-pressed={value.includes(o.id)} className="chip" onClick={() => onToggle(o.id)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
