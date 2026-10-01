import { useMemo, useState } from 'react';
import { MascotViewer } from '../MascotViewer';
import { MascotCard } from '../MascotCard';
import { Chips, Group, Swatches, Toggles } from '../controls';
import { MASCOTS, getMascot } from '../../mascot/registry';
import { defaultConfig } from '../../mascot/config';
import { SURFACES } from '../../engine/surfaces';
import type { MascotConfig, SurfaceId } from '../../mascot/types';

export function Home() {
  const hero = getMascot('moss')!;
  const heroConfig = useMemo(() => defaultConfig(hero), [hero]);
  const desktopShift = typeof window !== 'undefined' && window.innerWidth > 900 ? 0.17 : 0;

  return (
    <main id="main">
      <section className="hero">
        <MascotViewer def={hero} config={heroConfig} mode="hero" shiftX={desktopShift} className="hero-viewer" />
        <div className="hero-copy">
          <p className="eyebrow">Interactive 3D mascots</p>
          <h1 className="display">Characters with presence.</h1>
          <p className="lede">
            Real fur, fabric and polymer surfaces. Characters that breathe, blink and look back at you.
            Inspect them, dress them, and light them like a product shot.
          </p>
          <div className="actions">
            <a className="btn" href="#/mascot/moss">Meet Moss</a>
            <a className="btn btn-ghost" href="#/explore">Explore the collection</a>
          </div>
          <p className="hint">Move your cursor. Click Moss. Drag to look around.</p>
        </div>
      </section>

      <section className="section" aria-labelledby="coll">
        <header className="section-head">
          <p className="eyebrow">The collection</p>
          <h2 id="coll" className="h2">Three families, one rig.</h2>
          <p className="lede narrow">Every mascot is data: a skeleton of named parts, a palette, and the surfaces and motions it supports. New characters drop in without touching the renderer.</p>
        </header>
        <div className="grid">{MASCOTS.map((m, i) => <MascotCard key={m.id} def={m} index={i + 1} />)}</div>
      </section>

      <Surfaces />
      <Customize />

      <section className="section split" aria-labelledby="pg">
        <header>
          <p className="eyebrow">The playground</p>
          <h2 id="pg" className="h2">A quiet room with a character in it.</h2>
        </header>
        <ol className="steps">
          <li><strong>Look.</strong> Recolour, re-surface, accessorise. Share the exact look with a link.</li>
          <li><strong>Move.</strong> Nine motions on top of an idle that never stops: breathing, blinking, weight shifts, ear flicks.</li>
          <li><strong>Light.</strong> Six environments and seven camera moves. Same character, completely different mood.</li>
        </ol>
      </section>

      <section className="section library" id="library" aria-labelledby="lib">
        <header className="section-head">
          <p className="eyebrow">Library — coming later</p>
          <h2 id="lib" className="h2">Built to become a place to get mascots.</h2>
        </header>
        <ul className="roadmap">
          <li><span>Free & premium mascots</span><em>Planned</em></li>
          <li><span>Downloadable GLB / VRM with licence</span><em>Planned</em></li>
          <li><span>Embeddable website mascot</span><em>Planned</em></li>
          <li><span>Creator submissions & packs</span><em>Planned</em></li>
        </ul>
        <p className="fine">No payments or accounts exist in this build. The data model already carries licence and asset-pipeline fields so they can be added without rework.</p>
      </section>

      <section className="cta">
        <h2 className="display">Pick one up.</h2>
        <a className="btn" href="#/explore">Explore the collection</a>
      </section>
    </main>
  );
}

function Surfaces() {
  const moss = getMascot('moss')!;
  const items: { id: SurfaceId; src?: string; text: string }[] = [
    { id: 'smooth', src: moss.surfaceThumbs?.smooth, text: 'One draw call per part. The cheapest and calmest look.' },
    { id: 'plush', src: moss.surfaceThumbs?.plush, text: 'A short dense nap plus a rim term. Brushed fabric on a phone-sized budget.' },
    { id: 'fuzzy', src: moss.surfaceThumbs?.fuzzy, text: 'Peach-fuzz pile: enough shells to soften the silhouette.' },
    { id: 'furry', src: moss.surfaceThumbs?.furry, text: 'Deep shell fur with root shadow, lit tips and gravity sag.' },
  ];
  return (
    <section className="section surfaces" aria-labelledby="surf">
      <header className="section-head">
        <p className="eyebrow">Surfaces</p>
        <h2 id="surf" className="h2">The same creature, four different materials.</h2>
        <p className="lede narrow">Fur is rendered as stacked shells in a single instanced draw per part, scaled automatically to the device. Strands are a procedural 3D lattice — no textures to download.</p>
      </header>
      <div className="surface-row">
        {items.map((s) => (
          <figure key={s.id}>
            <div className="surface-img"><img src={s.src} alt={`Moss with a ${SURFACES[s.id].label.toLowerCase()} surface`} loading="lazy" decoding="async" /></div>
            <figcaption><strong>{SURFACES[s.id].label}</strong><span>{s.text}</span></figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

function Customize() {
  const def = getMascot('pip')!;
  const [cfg, setCfg] = useState<MascotConfig>(() => defaultConfig(def));
  const colors = def.customization.colors;
  return (
    <section className="section customize" aria-labelledby="cust">
      <div className="customize-viewer">
        <MascotViewer def={def} config={cfg} mode="hero" />
      </div>
      <div className="customize-panel">
        <p className="eyebrow">Customisation</p>
        <h2 id="cust" className="h2">Dress Pip. Everything is a setting.</h2>
        <Group label="Fabric">
          <Swatches label="Fabric colour" value={cfg.colors.body} options={colors[0].swatches} onChange={(v) => setCfg({ ...cfg, colors: { ...cfg.colors, body: v } })} />
        </Group>
        <Group label="Surface">
          <Chips label="Surface" value={cfg.surface} options={def.customization.surfaces.map((s) => ({ id: s, label: SURFACES[s].label }))} onChange={(s) => setCfg({ ...cfg, surface: s })} />
        </Group>
        <Group label="Accessories">
          <Toggles options={def.customization.accessories} value={cfg.accessories}
            onToggle={(id) => setCfg({ ...cfg, accessories: cfg.accessories.includes(id) ? cfg.accessories.filter((a) => a !== id) : [...cfg.accessories, id] })} />
        </Group>
        <a className="btn btn-ghost" href="#/mascot/pip">Open in the playground</a>
      </div>
    </section>
  );
}
