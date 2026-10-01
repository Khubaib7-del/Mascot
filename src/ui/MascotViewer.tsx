import { useEffect, useRef, useState } from 'react';
import { Stage, type StageEvent } from '../engine/stage';
import { webglSupported, type QualityTier } from '../engine/quality';
import { ENVIRONMENTS } from '../engine/environments';
import type { MascotConfig, MascotDefinition } from '../mascot/types';

interface Props {
  def: MascotDefinition;
  config: MascotConfig;
  mode: 'hero' | 'playground';
  shiftX?: number;
  className?: string;
  label?: string;
  onStage?: (s: Stage | null) => void;
  onEvent?: (e: StageEvent) => void;
  quality?: QualityTier;
}

type Status = 'idle' | 'loading' | 'ready' | 'unsupported' | 'error';

const gradient = (id: MascotConfig['environment']) => {
  const [a, b] = ENVIRONMENTS[id].bg;
  return `radial-gradient(120% 90% at 50% 20%, ${a}, ${b})`;
};

/**
 * Owns one Stage. Mounts lazily when scrolled into view, disposes on unmount, and shows the
 * pre-rendered poster until the first real frame so there is never an empty box.
 */
export function MascotViewer({ def, config, mode, shiftX, className = '', label, onStage, onEvent, quality }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<Stage | null>(null);
  const configRef = useRef(config);
  const cbRef = useRef({ onStage, onEvent });
  const [status, setStatus] = useState<Status>('idle');
  const [attempt, setAttempt] = useState(0);
  const [posterOk, setPosterOk] = useState(true);
  const prevEnv = useRef(config.environment);
  const env = config.environment;
  const under = prevEnv.current;

  configRef.current = config;
  cbRef.current = { onStage, onEvent };
  useEffect(() => { prevEnv.current = env; }, [env]);

  useEffect(() => {
    const el = box.current, cv = canvas.current;
    if (!el || !cv) return;
    if (!webglSupported()) { setStatus('unsupported'); return; }
    let stage: Stage | null = null;
    let cancelled = false;
    let first = true;

    const boot = async () => {
      setStatus('loading');
      try {
        stage = new Stage(cv, {
          mode, shiftX, quality,
          onEvent: (e) => {
            if (first && e.type === 'frame') { first = false; if (!cancelled) setStatus('ready'); }
            cbRef.current.onEvent?.(e);
          },
        });
        await stage.setMascot(def, configRef.current);
        if (cancelled) { stage.dispose(); return; }
        stageRef.current = stage;
        cbRef.current.onStage?.(stage);
      } catch (err) {
        console.error(err);
        stage?.dispose();
        stage = null;
        if (!cancelled) setStatus('error');
      }
    };

    // Don't spend GPU time on viewers that are far off-screen.
    const io = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) { io.disconnect(); void boot(); }
    }, { rootMargin: '300px' });
    io.observe(el);

    return () => {
      cancelled = true;
      io.disconnect();
      cbRef.current.onStage?.(null);
      stageRef.current = null;
      stage?.dispose();
    };
  }, [def, mode, shiftX, quality, attempt]);

  useEffect(() => { stageRef.current?.applyConfig(config); }, [config]);

  const showPoster = status !== 'ready' && posterOk;
  return (
    <div ref={box} className={`viewer ${className}`} data-status={status} data-ui={ENVIRONMENTS[env].ui}>
      <div className="vbg" style={{ background: gradient(under) }} aria-hidden />
      <div className="vbg vbg-top" key={env} style={{ background: gradient(env) }} aria-hidden />
      {showPoster && (
        <img className="poster" src={def.thumbnail} alt="" onError={() => setPosterOk(false)} draggable={false} />
      )}
      <canvas
        ref={canvas}
        className="viewer-canvas"
        tabIndex={status === 'ready' ? 0 : -1}
        role="img"
        aria-label={label ?? `Interactive 3D mascot ${def.name}. Drag to rotate, press Enter to poke, arrow keys to orbit.`}
      />
      {status === 'loading' && <div className="viewer-note" role="status"><span className="spinner" aria-hidden />Preparing {def.name}…</div>}
      {(status === 'unsupported' || status === 'error') && (
        <div className="viewer-note viewer-fail" role="alert">
          <p>{status === 'unsupported' ? 'Your browser or device can’t run WebGL 2, so the live 3D view is unavailable.' : `${def.name} couldn’t be loaded.`}</p>
          {status === 'error' && <button className="btn btn-small" onClick={() => { setStatus('idle'); setAttempt((n) => n + 1); }}>Try again</button>}
        </div>
      )}
    </div>
  );
}
