import type { MascotDefinition } from '../mascot/types';
import { SURFACES } from '../engine/surfaces';
import { ACCESSORIES } from '../engine/accessories';
import { AGENT_STATES } from '../engine/agent';
import { EXPRESSIONS } from '../engine/animation/expressions';
import { WORLDS } from '../engine/worlds';

interface Props { def: MascotDefinition; index: number; active?: boolean; onHover?: () => void; compact?: boolean }

/** A collectible card: the thumbnail is a real render of the character's signature look in its own world. */
export function MascotCard({ def, index, active, onHover, compact }: Props) {
  const sig = def.signature;
  return (
    <a className={`card ${active ? 'is-active' : ''} ${compact ? 'card-compact' : ''}`} href={`#/mascot/${def.id}`}
      onMouseEnter={onHover} onFocus={onHover} aria-label={`${def.name}, ${def.species}. Open in playground.`}>
      <div className="card-img" style={{ background: `linear-gradient(160deg, ${def.swatch[0]}, ${def.swatch[1]})` }}>
        <img src={def.thumbnail} alt="" loading="lazy" decoding="async" draggable={false} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
        <span className="card-index seg">{String(index).padStart(2, '0')}</span>
        <span className="card-state"><i style={{ background: AGENT_STATES[sig.state].status.color }} aria-hidden />{AGENT_STATES[sig.state].label}</span>
      </div>
      <div className="card-body">
        <h3>{def.name}</h3>
        <p className="card-family">{def.species}</p>
        {!compact && <p className="card-tag">{def.tagline}</p>}
        <p className="card-chars">{def.personality.join(' · ')}</p>
        <ul className="card-facts" aria-label="Signature look">
          <li>{SURFACES[def.defaults.surface].label}</li>
          <li>{ACCESSORIES[sig.accessory]?.label ?? sig.accessory}</li>
          <li>{WORLDS[def.defaults.world].label}</li>
          <li>{EXPRESSIONS[sig.expression].label}</li>
          {def.status === 'prototype' && <li className="badge">Prototype</li>}
        </ul>
      </div>
    </a>
  );
}
