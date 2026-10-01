import type { MascotDefinition } from '../mascot/types';
import { SURFACES } from '../engine/surfaces';

export function MascotCard({ def, index }: { def: MascotDefinition; index: number }) {
  return (
    <a className="card" href={`#/mascot/${def.id}`} aria-label={`${def.name}, ${def.family}. Open in playground.`}>
      <div className="card-img" style={{ background: `radial-gradient(90% 70% at 50% 30%, ${def.swatch[0]}, ${def.swatch[1]})` }}>
        <img src={def.thumbnail} alt="" loading="lazy" decoding="async" draggable={false} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
        <span className="card-index">{String(index).padStart(2, '0')}</span>
      </div>
      <div className="card-body">
        <h3>{def.name}</h3>
        <p className="card-family">{def.family}</p>
        <p className="card-tag">{def.tagline}</p>
        <p className="card-meta">
          {SURFACES[def.defaults.surface].label} · {def.animations.length} motions · {def.customization.accessories.length} accessories
          {def.status === 'prototype' && <span className="badge">Prototype</span>}
        </p>
      </div>
    </a>
  );
}
