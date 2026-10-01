import { useCallback, useEffect, useRef, useState } from 'react';
import { MascotViewer } from '../MascotViewer';
import { Chips, Group, Swatches, Toggles } from '../controls';
import type { Route } from '../../app/router';
import type { CameraPresetId, ClipId, EnvironmentId, ExpressionId, MascotConfig, MascotDefinition } from '../../mascot/types';
import { decodeConfig, defaultConfig, encodeConfig, sanitizeConfig } from '../../mascot/config';
import { SURFACES } from '../../engine/surfaces';
import { ENVIRONMENTS } from '../../engine/environments';
import { CAMERA_PRESETS } from '../../engine/camera';
import { EXPRESSIONS, EXPRESSION_IDS } from '../../engine/animation/expressions';
import { CLIPS } from '../../engine/animation/clips';
import { TIERS, type QualityTier } from '../../engine/quality';
import type { Stage, StageEvent } from '../../engine/stage';
import { MASCOTS } from '../../mascot/registry';

type Tab = 'look' | 'face' | 'motion' | 'scene';
const TABS: { id: Tab; label: string }[] = [
  { id: 'look', label: 'Look' }, { id: 'face', label: 'Face' }, { id: 'motion', label: 'Motion' }, { id: 'scene', label: 'Scene' },
];

interface SavedLook { name: string; at: number; config: MascotConfig }
const storeKey = (id: string) => `mascot.looks.${id}`;
const loadLooks = (id: string): SavedLook[] => {
  try { return JSON.parse(localStorage.getItem(storeKey(id)) ?? '[]'); } catch { return []; }
};

export function Playground({ def, route }: { def: MascotDefinition; route: Route }) {
  const [config, setConfig] = useState<MascotConfig>(() => decodeConfig(def, route.query.get('c')) ?? defaultConfig(def));
  const [tab, setTab] = useState<Tab>('look');
  const [open, setOpen] = useState(() => window.innerWidth > 760);
  const [playing, setPlaying] = useState<ClipId | null>(null);
  const [tier, setTier] = useState<QualityTier | 'auto'>('auto');
  const [liveTier, setLiveTier] = useState<QualityTier | null>(null);
  const [looks, setLooks] = useState<SavedLook[]>(() => loadLooks(def.id));
  const [toast, setToast] = useState<string | null>(null);
  const stage = useRef<Stage | null>(null);
  const env = ENVIRONMENTS[config.environment];

  const patch = useCallback((p: Partial<MascotConfig>) => setConfig((c) => ({ ...c, ...p })), []);

  // Keep the URL shareable without adding history entries.
  useEffect(() => {
    const t = setTimeout(() => history.replaceState(null, '', `#/mascot/${def.id}?c=${encodeConfig(config)}`), 300);
    return () => clearTimeout(t);
  }, [config, def.id]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const onEvent = useCallback((e: StageEvent) => {
    if (e.type === 'clip') setPlaying(e.clip);
    if (e.type === 'tier') setLiveTier(e.tier);
  }, []);
  const onStage = useCallback((s: Stage | null) => { stage.current = s; if (s) setLiveTier(s.qualityTier); }, []);

  const playClip = (id: ClipId) => {
    if (playing === id) stage.current?.stopClip();
    else stage.current?.play(id);
  };

  const share = async () => {
    const url = `${location.origin}${location.pathname}#/mascot/${def.id}?c=${encodeConfig(config)}`;
    try { await navigator.clipboard.writeText(url); setToast('Link copied'); } catch { setToast('Copy the address bar to share'); }
  };
  const save = () => {
    const next = [{ name: `Look ${looks.length + 1}`, at: Date.now(), config }, ...looks].slice(0, 6);
    setLooks(next);
    try { localStorage.setItem(storeKey(def.id), JSON.stringify(next)); setToast('Look saved'); } catch { setToast('Storage unavailable'); }
  };
  const removeLook = (at: number) => {
    const next = looks.filter((l) => l.at !== at);
    setLooks(next);
    try { localStorage.setItem(storeKey(def.id), JSON.stringify(next)); } catch { /* ignore */ }
  };
  const capture = () => {
    const url = stage.current?.capture();
    if (!url) return;
    const a = document.createElement('a');
    a.href = url; a.download = `${def.id}.png`; a.click();
  };
  const toggleAccessory = (id: string) =>
    patch({ accessories: config.accessories.includes(id) ? config.accessories.filter((a) => a !== id) : [...config.accessories, id] });

  const idx = MASCOTS.findIndex((m) => m.id === def.id);
  const next = MASCOTS[(idx + 1) % MASCOTS.length];

  return (
    <div className="pg" data-ui={env.ui}>
      <MascotViewer def={def} config={config} mode="playground" className="pg-viewer" onStage={onStage} onEvent={onEvent}
        quality={tier === 'auto' ? undefined : tier} />

      <header className="pg-top">
        <a className="back" href="#/explore" aria-label="Back to collection">← Collection</a>
        <div className="pg-actions">
          <button className="ghost" onClick={() => setConfig(defaultConfig(def))}>Reset</button>
          <button className="ghost" onClick={save}>Save look</button>
          <button className="ghost" onClick={share}>Share</button>
          <button className="ghost" onClick={capture}>Save PNG</button>
        </div>
      </header>

      <div className="pg-title">
        <p className="eyebrow">{def.family}</p>
        <h1>{def.name}</h1>
        <p>{def.tagline}</p>
        <a className="next" href={`#/mascot/${next.id}`}>Next: {next.name} →</a>
      </div>

      <aside className={`pg-panel ${open ? 'open' : ''}`} aria-label="Customisation">
        <div className="pg-tabs" role="tablist">
          {TABS.map((t) => (
            <button key={t.id} role="tab" id={`tab-${t.id}`} aria-selected={tab === t.id} aria-controls="panel-body"
              onClick={() => { setTab(t.id); setOpen(true); }}>{t.label}</button>
          ))}
          <button className="pg-toggle" onClick={() => setOpen(!open)} aria-expanded={open} aria-label={open ? 'Hide controls' : 'Show controls'}>{open ? '–' : '+'}</button>
        </div>
        {open && (
          <div className="pg-body" id="panel-body" role="tabpanel" aria-labelledby={`tab-${tab}`}>
            {tab === 'look' && (
              <>
                {def.customization.colors.map((c) => (
                  <Group key={c.slot} label={c.label}>
                    <Swatches label={`${c.label} colour`} value={config.colors[c.slot]} options={c.swatches}
                      onChange={(v) => patch({ colors: { ...config.colors, [c.slot]: v } })} />
                  </Group>
                ))}
                <Group label="Surface" hint={SURFACES[config.surface].note}>
                  <Chips label="Surface" value={config.surface} onChange={(s) => patch({ surface: s })}
                    options={def.customization.surfaces.map((s) => ({ id: s, label: SURFACES[s].label, note: SURFACES[s].note }))} />
                </Group>
                <Group label="Accessories">
                  <Toggles options={def.customization.accessories} value={config.accessories} onToggle={toggleAccessory} />
                </Group>
                {looks.length > 0 && (
                  <Group label="Saved looks">
                    <ul className="looks">
                      {looks.map((l) => (
                        <li key={l.at}>
                          <button className="chip" onClick={() => setConfig(sanitizeConfig(def, l.config))}>{l.name}</button>
                          <button className="x" aria-label={`Delete ${l.name}`} onClick={() => removeLook(l.at)}>×</button>
                        </li>
                      ))}
                    </ul>
                  </Group>
                )}
              </>
            )}
            {tab === 'face' && (
              <Group label="Expression" hint="Resting face">
                <Chips<ExpressionId> label="Expression" value={config.expression} onChange={(expression) => patch({ expression })}
                  options={EXPRESSION_IDS.map((id) => ({ id, label: EXPRESSIONS[id].label }))} />
              </Group>
            )}
            {tab === 'motion' && (
              <>
                <Group label="Play" hint="Idle always continues underneath">
                  <div className="chips">
                    {def.animations.map((id) => (
                      <button key={id} className="chip" aria-pressed={playing === id} onClick={() => playClip(id)}>{CLIPS[id].label}</button>
                    ))}
                  </div>
                </Group>
                <p className="fine">Tip: click or tap the character to poke it. Move the cursor and it follows with its eyes first, then its head.</p>
              </>
            )}
            {tab === 'scene' && (
              <>
                <Group label="Environment" hint={env.note}>
                  <Chips<EnvironmentId> label="Environment" value={config.environment} onChange={(environment) => patch({ environment })}
                    options={def.environments.map((id) => ({ id, label: ENVIRONMENTS[id].label }))} />
                </Group>
                <Group label="Camera">
                  <Chips<CameraPresetId> label="Camera" value={config.camera} onChange={(camera) => { patch({ camera }); stage.current?.setCameraPreset(camera); }}
                    options={(Object.keys(CAMERA_PRESETS) as CameraPresetId[]).map((id) => ({ id, label: CAMERA_PRESETS[id].label }))} />
                </Group>
                <Group label="Quality" hint={liveTier ? `Running ${liveTier}` : undefined}>
                  <Chips<QualityTier | 'auto'> label="Quality" value={tier} onChange={setTier}
                    options={[{ id: 'auto', label: 'Auto' }, ...(Object.keys(TIERS) as QualityTier[]).map((t) => ({ id: t, label: t[0].toUpperCase() + t.slice(1) }))]} />
                </Group>
              </>
            )}
          </div>
        )}
      </aside>

      <p className="pg-hint" aria-hidden>Drag to orbit · scroll or pinch to zoom · click to poke</p>
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
