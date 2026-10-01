import { Group, Mesh, TorusGeometry, MeshStandardMaterial, type Object3D } from 'three';
import { MODELS } from './models';
import { Tracker } from './worlds/common';
import type { SwingDef } from './accessories';

export interface CharmDef { id: string; label: string; model: string; scale: number; group: string }

const c = (id: string, label: string, group: string, scale = 1): [string, CharmDef] => [id, { id, label, model: id, scale, group }];

/** Original collectible miniatures. Anything that echoes a real brand is a generic symbol, never a logo. */
export const CHARMS: Record<string, CharmDef> = Object.fromEntries([
  c('keyboard', 'Keyboard', 'Developer', 0.95), c('terminal', 'Terminal', 'Developer'), c('branch', 'Commit graph', 'Developer'), c('database', 'Database', 'Developer', 0.9),
  c('laptop', 'Laptop', 'Developer', 0.95), c('monitor', 'Monitor', 'Developer', 0.9), c('wrench', 'Wrench', 'Developer'), c('gear', 'Gear', 'Developer', 0.9),
  c('cloud', 'Cloud', 'Ship'), c('server', 'Server', 'Ship', 0.9), c('rocket', 'Rocket', 'Ship', 0.95), c('package', 'Package', 'Ship', 0.9), c('hammer', 'Hammer', 'Ship', 0.95),
  c('document', 'Document', 'Office', 0.9), c('spreadsheet', 'Spreadsheet', 'Office', 0.85), c('calculator', 'Calculator', 'Office', 0.9), c('coffee', 'Coffee', 'Office', 0.9), c('chart', 'Chart', 'Office', 0.9), c('envelope', 'Mail', 'Office', 0.95),
  c('magnifier', 'Magnifier', 'Research'), c('book', 'Book', 'Research', 0.9), c('notebook', 'Notebook', 'Research', 0.85),
  c('camera', 'Camera', 'Create', 0.95), c('microphone', 'Microphone', 'Create'), c('headphones', 'Headphones', 'Create', 0.95), c('palette', 'Palette', 'Create', 0.9),
  c('controller', 'Controller', 'Play', 0.95), c('planet', 'Planet', 'Play'), c('lock', 'Lock', 'Security'), c('keyring', 'Key', 'Security'), c('shield', 'Shield', 'Security'),
  c('reactor', 'Arc reactor', 'Badges', 0.95), c('emblem', 'Hero emblem', 'Badges'), c('energyHammer', 'Energy hammer', 'Badges'), c('bolt', 'Bolt', 'Badges'),
  c('star', 'Star', 'Badges'), c('medal', 'Medal', 'Badges'), c('heart', 'Heart', 'Badges'), c('mark', 'Platform mark', 'Badges'),
].filter(([id]) => id in MODELS));

export const CHARM_IDS = Object.keys(CHARMS);

export interface CharmRig { group: Group; swings: SwingDef[] }

/** Builds the rail: a short bar with up to six chained charms, each on its own pendulum. */
export function buildCharmRail(tr: Tracker, ids: string[], spacing: number): CharmRig {
  const group = new Group(), swings: SwingDef[] = [];
  const metal = tr.add(new MeshStandardMaterial({ color: '#d9dce4', roughness: 0.25, metalness: 1 }));
  const n = ids.length;
  ids.forEach((id, i) => {
    const def = CHARMS[id]; if (!def) return;
    const piv = new Group();
    const x = (i - (n - 1) / 2) * spacing * 2;
    piv.position.set(x, 0, -Math.abs(x) * 0.25);
    const ring = new Mesh(tr.add(new TorusGeometry(0.02, 0.006, 8, 16)), metal); ring.position.y = -0.01; piv.add(ring);
    const links = 2 + (i % 2);
    for (let l = 0; l < links; l++) { const k = new Mesh(tr.add(new TorusGeometry(0.014, 0.004, 6, 12)), metal); k.position.y = -0.05 - l * 0.03; k.rotation.y = (l % 2) * Math.PI / 2; piv.add(k); }
    const model = MODELS[def.model].build(tr);
    const s = 0.2 * def.scale; model.scale.setScalar(s);
    const hang = 0.05 + links * 0.03 + 0.5 * s;
    model.position.y = -hang; model.rotation.y = (i % 2 ? -1 : 1) * 0.35;
    model.traverse((o: Object3D) => { if ((o as Mesh).isMesh) (o as Mesh).castShadow = true; });
    piv.add(model);
    group.add(piv);
    swings.push({ pivot: piv, ref: 'charmRail', gain: 1.6 + (i % 3) * 0.3, stiffness: 20 + (i % 3) * 3, damping: 1.7, max: 0.8, mode: 'rot' });
  });
  return { group, swings };
}
