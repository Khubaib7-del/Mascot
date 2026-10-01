import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MascotViewer } from '../MascotViewer';
import { MascotCard } from '../MascotCard';
import { Logo } from '../Logo';
import { MASCOTS, getMascot } from '../../mascot/registry';
import { signatureConfig } from '../../mascot/config';
import { WORLDS, WORLD_IDS } from '../../engine/worlds';
import { AGENT_STATES } from '../../engine/agent';
import type { MascotConfig, MascotDefinition, WorldId } from '../../mascot/types';
import type { Stage, StageEvent } from '../../engine/stage';

interface Chapter { id: string; mascot: string; over: Partial<MascotConfig> }

/** Scroll chapters. The same canvas travels between them: fog rises, the world and character swap, fog clears. */
const CHAPTERS: Chapter[] = [
  { id: 'hero', mascot: 'floe', over: {} },
  { id: 'collection', mascot: 'alma', over: { camera: 'threeQuarter' } },
  { id: 'craft', mascot: 'lumi', over: {} },
  { id: 'worlds', mascot: 'orbit', over: {} },
  { id: 'finale', mascot: 'floe', over: { world: 'beach', lighting: 'sunset', agent: 'successful', expression: 'excited', accessories: ['scarf'] } },
];

const cfgFor = (c: Chapter): { def: MascotDefinition; config: MascotConfig } => {
  const def = getMascot(c.mascot)!;
  return { def, config: { ...signatureConfig(def), ...c.over } };
};

export function Home() {
  const hero = useMemo(() => cfgFor(CHAPTERS[0]), []);
  const stageRef = useRef<Stage | null>(null);
  const current = useRef<{ chapter: string; mascot: string }>({ chapter: 'hero', mascot: 'floe' });
  const [ready, setReady] = useState(false);
  const [chapter, setChapter] = useState('hero');
  const [hovered, setHovered] = useState<string>('alma');
  const shift = typeof window !== 'undefined' && window.innerWidth > 900 ? 0.18 : 0;

  const go = useCallback((c: Chapter, worldOverride?: WorldId, mascotOverride?: string) => {
    const s = stageRef.current;
    if (!s) return;
    const base = mascotOverride ? cfgFor({ ...c, mascot: mascotOverride }) : cfgFor(c);
    const config = worldOverride ? { ...base.config, world: worldOverride } : base.config;
    const changed = current.current.mascot !== base.def.id;
    current.current = { chapter: c.id, mascot: base.def.id };
    s.travel({ def: changed ? base.def : undefined, config, entrance: changed ? 'walkInRight' : undefined });
  }, []);

  // Chapter detection
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>('[data-chapter]'));
    const io = new IntersectionObserver((entries) => {
      const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!vis) return;
      const id = (vis.target as HTMLElement).dataset.chapter!;
      setChapter(id);
      if (id === current.current.chapter) return;
      const ch = CHAPTERS.find((c) => c.id === id);
      if (ch) go(ch, undefined, id === 'collection' ? hovered : undefined);
    }, { threshold: [0.5, 0.75] });
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [go]);

  const onEvent = useCallback((e: StageEvent) => { if (e.type === 'frame') setReady(true); }, []);
  const onStage = useCallback((s: Stage | null) => {
    stageRef.current = s;
    if (new URLSearchParams(location.search).has('debug')) (window as unknown as { __stage?: Stage | null }).__stage = s;
  }, []);

  const hoverCard = (id: string) => {
    setHovered(id);
    if (chapter !== 'collection' || current.current.mascot === id) return;
    const def = getMascot(id)!;
    current.current.mascot = id;
    stageRef.current?.travel({ def, config: { ...signatureConfig(def), camera: 'threeQuarter' }, entrance: 'dropIn' });
  };

  return (
    <main id="main" className="world-page" data-chapter-active={chapter}>
      <div className={`splash ${ready ? 'gone' : ''}`} aria-hidden={ready}><Logo size={72} animated /><p>Waking the characters…</p></div>
      <MascotViewer def={hero.def} config={hero.config} mode="hero" shiftX={shift} className="world-fixed" onStage={onStage} onEvent={onEvent} entrance="walkInLeft" poster="/brand/banner.webp" />

      <section className="ch ch-hero" data-chapter="hero" aria-labelledby="h-hero">
        <div className="hero-copy">
          <p className="eyebrow">Living characters for intelligent work</p>
          <h1 id="h-hero" className="display">Mascots that<br />actually live.</h1>
          <p className="lede">Real fur, real light and real moods. Characters that breathe, look back at you, carry their tools — and show what your agent is doing.</p>
          <div className="actions">
            <a className="btn" href="#/mascot/floe">Meet Floe</a>
            <a className="btn btn-ghost" href="#/explore">Explore the collection</a>
          </div>
          <p className="hint">Move your cursor · click Floe · scroll to travel</p>
        </div>
      </section>

      <section className="ch ch-collection" data-chapter="collection" aria-labelledby="h-coll">
        <div className="panel">
          <p className="eyebrow">The collection</p>
          <h2 id="h-coll" className="h2">Four characters. Four temperaments.</h2>
          <p className="lede narrow">Not one model in four colours: each has its own body, coat, face and way of moving. Hover a card and the character steps into the scene.</p>
          <div className="card-rail">
            {MASCOTS.map((m, i) => <MascotCard key={m.id} def={m} index={i + 1} compact active={hovered === m.id} onHover={() => hoverCard(m.id)} />)}
          </div>
        </div>
      </section>

      <section className="ch ch-craft" data-chapter="craft" aria-labelledby="h-craft">
        <div className="panel">
          <p className="eyebrow">Agent states</p>
          <h2 id="h-craft" className="h2">Every state is a scene.</h2>
          <p className="lede narrow">Coding, reading, searching, deploying, blocked, done — a state changes the face, the posture, the props on the table and the little halo above the head. Compose it with any outfit, coat or world.</p>
          <ul className="state-list" aria-label="Some agent states">
            {['coding', 'searching', 'reading', 'deploying', 'blocked', 'successful'].map((s) => (
              <li key={s}><i style={{ background: AGENT_STATES[s as keyof typeof AGENT_STATES].status.color }} aria-hidden />{AGENT_STATES[s as keyof typeof AGENT_STATES].label}</li>
            ))}
          </ul>
          <a className="btn btn-ghost" href="#/mascot/lumi">Put Lumi to work</a>
        </div>
      </section>

      <section className="ch ch-worlds" id="worlds" data-chapter="worlds" aria-labelledby="h-worlds">
        <div className="panel">
          <p className="eyebrow">Worlds</p>
          <h2 id="h-worlds" className="h2">Change the world, keep the character.</h2>
          <p className="lede narrow">Ten real-time environments, eleven lighting moods. Pick one and Orbit steps through the clouds into it.</p>
          <div className="chips" role="radiogroup" aria-label="Preview a world">
            {WORLD_IDS.map((w) => <button key={w} role="radio" aria-checked={false} className="chip" onClick={() => go(CHAPTERS[3], w)}>{WORLDS[w].label}</button>)}
          </div>
        </div>
      </section>

      <section className="ch ch-library" id="library" data-chapter="finale" aria-labelledby="h-lib">
        <div className="panel">
          <p className="eyebrow">The library — later</p>
          <h2 id="h-lib" className="h2">Built to become the place you get your mascot.</h2>
          <ul className="roadmap">
            <li><span>Free & premium characters</span><em>Planned</em></li>
            <li><span>Downloadable GLB / VRM with licence</span><em>Planned</em></li>
            <li><span>Embeddable website agent</span><em>Planned</em></li>
            <li><span>Creator submissions & packs</span><em>Planned</em></li>
          </ul>
          <p className="fine">No payments or accounts exist in this build. Licence and asset-pipeline fields are already part of every character definition.</p>
          <a className="btn" href="#/explore">Explore the collection</a>
        </div>
      </section>
    </main>
  );
}
