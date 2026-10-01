import { useState } from 'react';
import { ColorPicker, Chips, Group, Slider, Switch, Toggles } from '../controls';
import type { AgentStateId, CameraPresetId, ClipId, ExpressionId, LightingId, MascotConfig, MascotDefinition, Params, SurfaceId, WorldId } from '../../mascot/types';
import { SURFACES } from '../../engine/surfaces';
import { LIGHTING, LIGHTING_IDS } from '../../engine/lighting';
import { WORLDS, WORLD_IDS } from '../../engine/worlds';
import { CAMERA_PRESETS } from '../../engine/camera';
import { EXPRESSIONS, EXPRESSION_IDS } from '../../engine/animation/expressions';
import { CLIPS, PLAYABLE } from '../../engine/animation/clips';
import { AGENT_GROUPS, AGENT_STATES } from '../../engine/agent';
import { ACCESSORIES, ACCESSORY_COLOR_LABELS } from '../../engine/accessories';
import { CHARMS } from '../../engine/charms';
import { MAX_CHARMS } from '../../mascot/config';
import { ENTRANCES, LOOPS, EXITS, buildCustomMovement, type CustomMovement, type Easing, type Gait } from '../../engine/animation/movement';
import { TIERS, type QualityTier } from '../../engine/quality';
import { BODY_PRESETS, FACE_PRESETS, FUR_PRESETS, type ParamPreset } from './presets';
import type { Stage } from '../../engine/stage';

export type Tab = 'character' | 'color' | 'fur' | 'face' | 'outfit' | 'charms' | 'agent' | 'motion' | 'scene' | 'quality';
export const TABS: { id: Tab; label: string }[] = [
  { id: 'character', label: 'Character' }, { id: 'color', label: 'Color' }, { id: 'fur', label: 'Fur' }, { id: 'face', label: 'Face' },
  { id: 'outfit', label: 'Outfit' }, { id: 'charms', label: 'Charms' }, { id: 'agent', label: 'Agent' }, { id: 'motion', label: 'Motion' },
  { id: 'scene', label: 'Scene' }, { id: 'quality', label: 'Quality' },
];

interface Props {
  tab: Tab;
  def: MascotDefinition;
  config: MascotConfig;
  patch: (p: Partial<MascotConfig>) => void;
  setParams: (p: Partial<Params>) => void;
  stage: Stage | null;
  playing: ClipId | null;
  tier: QualityTier | 'auto';
  setTier: (t: QualityTier | 'auto') => void;
  liveTier: QualityTier | null;
  stats: { fps: number; tris: number; draws: number } | null;
  safe: boolean;
}

const Presets = ({ list, apply, label }: { list: ParamPreset[]; apply: (p: Partial<Params>) => void; label: string }) => (
  <div className="chips" role="group" aria-label={label}>
    {list.map((p) => <button key={p.id} className="chip" title={p.note} onClick={() => apply(p.params)}>{p.label}</button>)}
  </div>
);

export function Panel(p: Props) {
  const { def, config, patch, setParams, stage } = p;
  const prm = config.params;
  const sl = (label: string, key: keyof Params, o: { min?: number; max?: number; step?: number } = {}) =>
    <Slider label={label} value={prm[key]} min={o.min ?? 0} max={o.max ?? 1} step={o.step ?? 0.01} onChange={(v) => setParams({ [key]: v })} />;

  const colorRegions = [
    ...def.customization.colors.map((c) => ({ slot: c.slot, label: c.label, swatches: c.swatches })),
    ...config.accessories.flatMap((id) => ACCESSORIES[id]?.colors ?? []).filter((v, i, a) => a.indexOf(v) === i).map((slot) => ({ slot, label: ACCESSORY_COLOR_LABELS[slot] ?? slot, swatches: undefined as string[] | undefined })),
  ];
  const [region, setRegion] = useState(colorRegions[0]?.slot ?? 'body');
  const active = colorRegions.find((r) => r.slot === region) ?? colorRegions[0];
  const setColor = (slot: string, hex: string) => {
    const colors = { ...config.colors, [slot]: hex };
    if (slot === 'eye' && prm.heterochromia < 0.5) colors.eye2 = hex;
    patch({ colors });
  };

  const [mv, setMv] = useState<CustomMovement>({ from: 'left', duration: 2.4, delay: 0, easing: 'easeOut', gait: 'walk', distance: 3.4 });
  const compat = (id: string) => ACCESSORIES[id].attach.every((a) => !!def.attach[a]);

  switch (p.tab) {
    case 'character':
      return (
        <>
          <p className="species">{def.species}</p>
          <p className="body-copy">{def.description}</p>
          <div className="tags">{def.personality.map((t) => <span key={t}>{t}</span>)}</div>
          <Group label="Surface" hint={SURFACES[config.surface].note}>
            <Chips<SurfaceId> label="Surface" value={config.surface} onChange={(surface) => patch({ surface })}
              options={def.customization.surfaces.map((s) => ({ id: s, label: SURFACES[s].label, note: SURFACES[s].note }))} />
          </Group>
          <Group label="Proportions"><Presets list={BODY_PRESETS} apply={setParams} label="Proportion presets" />
            {sl('Head size', 'headSize', { min: 0.7, max: 1.4 })}{sl('Body size', 'bodySize', { min: 0.7, max: 1.4 })}</Group>
        </>
      );
    case 'color':
      return (
        <>
          <Group label="Region">
            <div className="chips" role="radiogroup" aria-label="Colour region">
              {colorRegions.map((r) => (
                <button key={r.slot} role="radio" aria-checked={region === r.slot} className="chip chip-dot" onClick={() => setRegion(r.slot)}>
                  <i style={{ background: config.colors[r.slot] }} />{r.label}
                </button>
              ))}
            </div>
          </Group>
          {active && <ColorPicker label={active.label} value={config.colors[active.slot] ?? '#ffffff'} swatches={active.swatches} onChange={(hex) => setColor(active.slot, hex)} />}
        </>
      );
    case 'fur': {
      const furry = !!SURFACES[config.surface].fur;
      return (
        <>
          {!furry && <p className="note">The <b>{SURFACES[config.surface].label}</b> surface has no fur. Choose a fur, wool or fleece surface in Character to use these controls.</p>}
          <Group label="Presets"><Presets list={FUR_PRESETS} apply={setParams} label="Fur presets" /></Group>
          <Group label="Coat">
            {sl('Fur length', 'furLength', { min: 0.2, max: 2.5 })}{sl('Fur density', 'furDensity', { min: 0.4, max: 2 })}
            {sl('Softness', 'softness')}{sl('Fluffiness', 'fluffiness')}{sl('Direction', 'furDirection')}{sl('Variation', 'furVariation')}
          </Group>
          <Group label="Light response">{sl('Roughness', 'roughness')}{sl('Sheen', 'sheen')}</Group>
        </>
      );
    }
    case 'face':
      return (
        <>
          <Group label="Expression" hint="Resting face">
            <Chips<ExpressionId> label="Expression" value={config.expression} onChange={(expression) => patch({ expression })}
              options={EXPRESSION_IDS.map((id) => ({ id, label: EXPRESSIONS[id].label }))} />
          </Group>
          <Group label="Eyes"><Presets list={FACE_PRESETS} apply={setParams} label="Eye presets" />
            {sl('Eye size', 'eyeSize', { min: 0.6, max: 1.6 })}{sl('Iris size', 'irisSize', { min: 0.6, max: 1.4 })}{sl('Pupil size', 'pupilSize', { min: 0.4, max: 1.6 })}
            {sl('Eye spacing', 'eyeSpacing', { min: 0.7, max: 1.4 })}{sl('Highlight', 'highlight', { min: 0, max: 2 })}{sl('Squint', 'squint')}{sl('Blink speed', 'blinkSpeed', { min: 0.3, max: 2.5 })}
            <Switch label="Heterochromia (second eye colour)" on={prm.heterochromia >= 0.5} onChange={(on) => setParams({ heterochromia: on ? 1 : 0 })} />
          </Group>
        </>
      );
    case 'outfit':
      return (
        <>
          {(['Neck', 'Head', 'Face', 'Back', 'Body'] as const).map((g) => {
            const list = Object.values(ACCESSORIES).filter((a) => a.group === g);
            if (!list.length) return null;
            return (
              <Group key={g} label={g}>
                <Toggles value={config.accessories} onToggle={(id) => patch({ accessories: config.accessories.includes(id) ? config.accessories.filter((x) => x !== id) : [...config.accessories, id] })}
                  options={list.map((a) => ({ id: a.id, label: a.label, note: compat(a.id) ? undefined : 'Not compatible with this body' })).filter((o) => compat(o.id))} />
              </Group>
            );
          })}
          <p className="fine">Pieces attach to named points on the body and swing with its motion. Recolour them under Color.</p>
        </>
      );
    case 'charms': {
      const groups = Array.from(new Set(Object.values(CHARMS).map((c) => c.group)));
      return (
        <>
          <Group label="Keychain rail" hint={`${config.charms.length} / ${MAX_CHARMS}`}>
            <div className="chips">{config.charms.length === 0 && <span className="fine">Nothing hanging yet.</span>}
              {config.charms.map((id, i) => <button key={`${id}${i}`} className="chip" aria-label={`Remove ${CHARMS[id].label}`} onClick={() => patch({ charms: config.charms.filter((_, k) => k !== i) })}>{CHARMS[id].label} ×</button>)}
              {config.charms.length > 0 && <button className="chip chip-quiet" onClick={() => patch({ charms: [] })}>Clear</button>}</div>
          </Group>
          {groups.map((g) => (
            <Group key={g} label={g}>
              <div className="chips">{Object.values(CHARMS).filter((c) => c.group === g).map((c) => (
                <button key={c.id} className="chip" disabled={config.charms.length >= MAX_CHARMS} onClick={() => patch({ charms: [...config.charms, c.id] })}>{c.label}</button>
              ))}</div>
            </Group>
          ))}
        </>
      );
    }
    case 'agent':
      return (
        <>
          <p className="note"><b>{AGENT_STATES[config.agent].label}.</b> {AGENT_STATES[config.agent].status.text}. Expression, motion, props and the status halo above the head all follow the state.</p>
          {AGENT_GROUPS.map((g) => (
            <Group key={g} label={g}>
              <Chips<AgentStateId> label={g} value={config.agent} onChange={(agent) => patch({ agent })}
                options={Object.values(AGENT_STATES).filter((s) => s.group === g).map((s) => ({ id: s.id, label: s.label }))} />
            </Group>
          ))}
          {AGENT_STATES[config.agent].suggestWorld && config.world !== AGENT_STATES[config.agent].suggestWorld && (
            <button className="btn btn-small btn-ghost" onClick={() => patch({ world: AGENT_STATES[config.agent].suggestWorld })}>Move to {WORLDS[AGENT_STATES[config.agent].suggestWorld!].label}</button>
          )}
        </>
      );
    case 'motion':
      return (
        <>
          <Group label="Play" hint="Idle continues underneath">
            <div className="chips">{PLAYABLE.filter((id) => def.animations.includes(id) || ['point', 'confused'].includes(id)).map((id) => (
              <button key={id} className="chip" aria-pressed={p.playing === id} onClick={() => (p.playing === id ? stage?.stopClip() : stage?.play(id))}>{CLIPS[id].label}</button>
            ))}</div>
          </Group>
          <Group label="Feel">{sl('Motion energy', 'motionEnergy', { min: 0, max: 2 })}{sl('Animation speed', 'animSpeed', { min: 0.3, max: 2 })}</Group>
          <Group label="Movement"><div className="chips">{[...LOOPS, ...ENTRANCES, ...EXITS].map((m) => <button key={m.id} className="chip" onClick={() => stage?.playMovement(m.id)}>{m.label}</button>)}
            <button className="chip chip-quiet" onClick={() => stage?.stopMovement()}>Stop</button></div></Group>
          <Group label="Movement builder">
            <div className="builder">
              <label>From<select value={mv.from} onChange={(e) => setMv({ ...mv, from: e.target.value as CustomMovement['from'] })}>{['left', 'right', 'top', 'bottom', 'back'].map((o) => <option key={o}>{o}</option>)}</select></label>
              <label>Gait<select value={mv.gait ?? 'none'} onChange={(e) => setMv({ ...mv, gait: e.target.value === 'none' ? null : (e.target.value as Gait) })}>{['walk', 'run', 'hop', 'fly', 'float', 'none'].map((o) => <option key={o}>{o}</option>)}</select></label>
              <label>Easing<select value={mv.easing} onChange={(e) => setMv({ ...mv, easing: e.target.value as Easing })}>{['linear', 'easeOut', 'easeInOut', 'bounce', 'overshoot'].map((o) => <option key={o}>{o}</option>)}</select></label>
            </div>
            <Slider label="Duration" min={0.5} max={6} step={0.1} value={mv.duration} digits={1} onChange={(duration) => setMv({ ...mv, duration })} />
            <Slider label="Delay" min={0} max={3} step={0.1} value={mv.delay} digits={1} onChange={(delay) => setMv({ ...mv, delay })} />
            <Slider label="Distance" min={1} max={8} step={0.1} value={mv.distance} digits={1} onChange={(distance) => setMv({ ...mv, distance })} />
            <button className="btn btn-small" onClick={() => stage?.playMovement(buildCustomMovement(mv))}>Play entrance</button>
          </Group>
        </>
      );
    case 'scene':
      return (
        <>
          <Group label="World" hint={WORLDS[config.world].note}>
            <Chips<WorldId> label="World" value={config.world} onChange={(world) => patch({ world })} options={WORLD_IDS.map((id) => ({ id, label: WORLDS[id].label }))} />
          </Group>
          <Group label="Lighting" hint={LIGHTING[config.lighting].note}>
            <Chips<LightingId> label="Lighting" value={config.lighting} onChange={(lighting) => patch({ lighting })} options={LIGHTING_IDS.map((id) => ({ id, label: LIGHTING[id].label }))} />
          </Group>
          <Group label="Camera">
            <Chips<CameraPresetId> label="Camera" value={config.camera} onChange={(camera) => patch({ camera })}
              options={(Object.keys(CAMERA_PRESETS) as CameraPresetId[]).map((id) => ({ id, label: CAMERA_PRESETS[id].label }))} />
            <p className="fine">Drag to orbit · scroll or pinch to zoom · right-drag, Shift-drag or two fingers to pan.</p>
          </Group>
        </>
      );
    case 'quality':
      return (
        <>
          <Group label="Render quality" hint={p.liveTier ? `Running ${p.liveTier}` : undefined}>
            <Chips<QualityTier | 'auto'> label="Quality" value={p.tier} onChange={p.setTier}
              options={[{ id: 'auto', label: 'Auto' }, ...(Object.keys(TIERS) as QualityTier[]).map((t) => ({ id: t, label: t[0].toUpperCase() + t.slice(1) }))]} />
            <p className="fine">Changes apply in place. If a tier fails, the previous scene is restored and a lower tier is tried — the character never leaves the screen.</p>
          </Group>
          {p.safe && <p className="note">Shader fur is disabled on this device to keep things stable.</p>}
          <Group label="Readout">
            <dl className="readout">
              <div><dt>FPS</dt><dd className="seg">{p.stats ? Math.round(p.stats.fps) : '--'}</dd></div>
              <div><dt>Tris</dt><dd className="seg">{p.stats ? Math.round(p.stats.tris / 1000) + 'k' : '--'}</dd></div>
              <div><dt>Draws</dt><dd className="seg">{p.stats ? p.stats.draws : '--'}</dd></div>
            </dl>
          </Group>
        </>
      );
  }
}
