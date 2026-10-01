import { useCallback, useEffect, useRef, useState } from 'react';
import { MascotViewer } from '../MascotViewer';
import { Panel, TABS, type Tab } from './Panel';
import type { Route } from '../../app/router';
import type { ClipId, MascotConfig, MascotDefinition, Params } from '../../mascot/types';
import { decodeConfig, defaultConfig, encodeConfig, sanitizeConfig, signatureConfig } from '../../mascot/config';
import { LIGHTING } from '../../engine/lighting';
import { WORLDS, WORLD_IDS } from '../../engine/worlds';
import { AGENT_STATES } from '../../engine/agent';
import type { QualityTier } from '../../engine/quality';
import type { Stage, StageEvent } from '../../engine/stage';
import { MASCOTS } from '../../mascot/registry';
import { Wordmark } from '../Logo';

interface SavedLook { name: string; at: number; config: MascotConfig }
const storeKey = (id: string) => `mascot.looks.${id}`;
const loadLooks = (id: string): SavedLook[] => { try { return JSON.parse(localStorage.getItem(storeKey(id)) ?? '[]'); } catch { return []; } };

export function Playground({ def, route }: { def: MascotDefinition; route: Route }) {
  const [config, setConfig] = useState<MascotConfig>(() => decodeConfig(def, route.query.get('c')) ?? signatureConfig(def));
  const [tab, setTab] = useState<Tab>('character');
  const [open, setOpen] = useState(() => window.innerWidth > 820);
  const [playing, setPlaying] = useState<ClipId | null>(null);
  const [tier, setTier] = useState<QualityTier | 'auto'>('auto');
  const [liveTier, setLiveTier] = useState<QualityTier | null>(null);
  const [looks, setLooks] = useState<SavedLook[]>(() => loadLooks(def.id));
  const [toast, setToast] = useState<string | null>(null);
  const [stats, setStats] = useState<{ fps: number; tris: number; draws: number } | null>(null);
  const [safe, setSafe] = useState(false);
  const [stage, setStage] = useState<Stage | null>(null);
  const stageRef = useRef<Stage | null>(null);
  const fps = useRef({ n: 0, t: performance.now() });
  const ui = LIGHTING[config.lighting].ui;

  const patch = useCallback((p: Partial<MascotConfig>) => setConfig((c) => ({ ...c, ...p })), []);
  const setParams = useCallback((p: Partial<Params>) => setConfig((c) => ({ ...c, params: { ...c.params, ...p } })), []);

  useEffect(() => {
    const t = setTimeout(() => history.replaceState(null, '', `#/mascot/${def.id}?c=${encodeConfig(config)}`), 300);
    return () => clearTimeout(t);
  }, [config, def.id]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 2600); return () => clearTimeout(t); }, [toast]);

  const onEvent = useCallback((e: StageEvent) => {
    if (e.type === 'clip') setPlaying(e.clip);
    if (e.type === 'tier') setLiveTier(e.tier);
    if (e.type === 'fallback') { setToast(e.message); setSafe(!!stageRef.current?.isSafeMode); }
    if (e.type === 'frame') {
      const f = fps.current; f.n++;
      const now = performance.now();
      if (now - f.t > 700) {
        const s = stageRef.current?.stats();
        setStats({ fps: (f.n * 1000) / (now - f.t), tris: s?.tris ?? 0, draws: s?.draws ?? 0 });
        f.n = 0; f.t = now;
      }
    }
  }, []);
  const onStage = useCallback((s: Stage | null) => { stageRef.current = s; setStage(s); if (s) setLiveTier(s.qualityTier); }, []);

  const share = async () => {
    const url = `${location.origin}${location.pathname}#/mascot/${def.id}?c=${encodeConfig(config)}`;
    try { await navigator.clipboard.writeText(url); setToast('Link copied'); } catch { setToast('Copy the address bar to share'); }
  };
  const persist = (next: SavedLook[]) => { setLooks(next); try { localStorage.setItem(storeKey(def.id), JSON.stringify(next)); return true; } catch { return false; } };
  const save = () => { persist([{ name: `Look ${looks.length + 1}`, at: Date.now(), config }, ...looks].slice(0, 8)) ? setToast('Look saved') : setToast('Storage unavailable'); };
  const capture = () => {
    const url = stageRef.current?.capture();
    if (!url) return;
    const a = document.createElement('a'); a.href = url; a.download = `${def.id}.png`; a.click();
  };

  const idx = MASCOTS.findIndex((m) => m.id === def.id);
  const next = MASCOTS[(idx + 1) % MASCOTS.length];
  const st = AGENT_STATES[config.agent];

  return (
    <div className="pg" data-ui={ui}>
      <MascotViewer def={def} config={config} mode="playground" className="pg-viewer" onStage={onStage} onEvent={onEvent}
        quality={tier === 'auto' ? undefined : tier} entrance="walkInLeft" />

      <header className="pg-top">
        <div className="pg-brand"><Wordmark light={ui === 'dark'} /><a className="back" href="#/explore">← Collection</a></div>
        <div className="pg-actions">
          <button className="ghost" onClick={() => setConfig(defaultConfig(def))}>Reset</button>
          <button className="ghost" onClick={() => setConfig(signatureConfig(def))}>Signature</button>
          <button className="ghost" onClick={save}>Save look</button>
          <button className="ghost" onClick={share}>Share</button>
          <button className="ghost" onClick={capture}>PNG</button>
        </div>
      </header>

      <div className="pg-title">
        <p className="eyebrow">{def.species}</p>
        <h1>{def.name}</h1>
        <p className="pg-state"><i style={{ background: st.status.color }} aria-hidden />{st.label}<span> — {st.status.text}</span></p>
        <a className="next" href={`#/mascot/${next.id}`}>Next: {next.name} →</a>
      </div>

      <aside className={`pg-panel ${open ? 'open' : ''}`} aria-label="Customisation">
        <div className="pg-tabs" role="tablist" aria-label="Sections">
          {TABS.map((t) => (
            <button key={t.id} role="tab" id={`tab-${t.id}`} aria-selected={tab === t.id} aria-controls="panel-body" onClick={() => { setTab(t.id); setOpen(true); }}>{t.label}</button>
          ))}
        </div>
        <button className="pg-toggle" onClick={() => setOpen(!open)} aria-expanded={open} aria-label={open ? 'Hide controls' : 'Show controls'}>{open ? 'Hide' : 'Controls'}</button>
        {open && (
          <div className="pg-body" id="panel-body" role="tabpanel" aria-labelledby={`tab-${tab}`}>
            <Panel tab={tab} def={def} config={config} patch={patch} setParams={setParams} stage={stage} playing={playing}
              tier={tier} setTier={setTier} liveTier={liveTier} stats={stats} safe={safe} />
            {tab === 'character' && looks.length > 0 && (
              <section className="group"><h3>Saved looks</h3>
                <ul className="looks">{looks.map((l) => (
                  <li key={l.at}><button className="chip" onClick={() => setConfig(sanitizeConfig(def, l.config))}>{l.name}</button>
                    <button className="x" aria-label={`Delete ${l.name}`} onClick={() => persist(looks.filter((k) => k.at !== l.at))}>×</button></li>
                ))}</ul></section>
            )}
          </div>
        )}
      </aside>

      <div className="pg-dock" role="group" aria-label="Quick scene controls">
        <div className="dock-row" role="radiogroup" aria-label="World">
          {WORLD_IDS.map((w) => <button key={w} role="radio" aria-checked={config.world === w} className="dock-chip" onClick={() => patch({ world: w })}>{WORLDS[w].label}</button>)}
        </div>
        <p className="seg dock-stats" aria-hidden>{stats ? `${Math.round(stats.fps)} FPS · ${(liveTier ?? '').toUpperCase()}` : '-- FPS'}</p>
      </div>
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
