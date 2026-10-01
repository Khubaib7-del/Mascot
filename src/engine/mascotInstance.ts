import {
  BufferGeometry, Color, Group, InstancedMesh, IUniform, Material, Mesh, MeshBasicMaterial, MeshPhysicalMaterial,
  MeshStandardMaterial, Object3D, Vector3,
} from 'three';
import type { MascotConfig, MascotDefinition, PartDef, Role } from '../mascot/types';
import { buildGeometry } from './geometry';
import { createFurMaterial, type FurUniforms } from './fur';
import { SURFACES, type SurfaceDef } from './surfaces';
import type { QualitySettings } from './quality';
import { Animator } from './animation/animator';
import type { EnvironmentDef } from './environments';

interface PartHandle {
  def: PartDef;
  group: Group;
  mesh: Mesh;
  core: Material;
  fur?: { mesh: InstancedMesh; material: MeshStandardMaterial; uniforms: FurUniforms };
  geometry: BufferGeometry;
}

export interface RoleBinding { obj: Object3D; p: Vector3; r: Vector3; s: Vector3 }

/**
 * Runtime mascot: builds a scene graph from a MascotDefinition and applies a MascotConfig to it.
 * Contains no mascot-specific logic — everything comes from the definition.
 */
export class MascotInstance {
  readonly root = new Group();
  readonly hitMeshes: Mesh[] = [];
  readonly roles = new Map<Role, RoleBinding[]>();
  readonly animator: Animator;
  private parts = new Map<string, PartHandle>();
  private surface: SurfaceDef = SURFACES.smooth;
  private colorsBySlot = new Map<string, Color>();
  private furLayerScale = 1;

  constructor(readonly def: MascotDefinition, quality: QualitySettings, private time: IUniform<number>) {
    this.furLayerScale = quality.furLayerScale;
    const groups = new Map<string, Object3D>([['root', this.root]]);
    const needsRole = (p: PartDef) => p.role && p.role !== 'root';

    for (const def of this.def.parts) {
      const group = new Group();
      group.name = def.id;
      group.position.set(...(def.position ?? [0, 0, 0]));
      group.rotation.set(...(def.rotation ?? [0, 0, 0]));
      (groups.get(def.parent ?? 'root') ?? this.root).add(group);
      groups.set(def.id, group);

      // Fur geometry only needs to carry the silhouette; strand detail comes from the fragment shader.
      const seg = quality.sphereSegments;
      const geometry = buildGeometry(def, def.furry ? [Math.max(24, Math.round(seg[0] * 0.6)), Math.max(16, Math.round(seg[1] * 0.6))] : seg);
      const core = this.createCoreMaterial(def);
      const mesh = new Mesh(geometry, core);
      mesh.position.set(...(def.offset ?? [0, 0, 0]));
      mesh.castShadow = def.finish !== 'highlight' && def.finish !== 'glow';
      mesh.receiveShadow = true;
      group.add(mesh);
      if (def.hit) { mesh.userData.hit = true; this.hitMeshes.push(mesh); }

      const handle: PartHandle = { def, group, mesh, core, geometry };
      if (def.furry && def.finish === 'surface') {
        const { material, uniforms } = createFurMaterial(this.time);
        const shells = new InstancedMesh(geometry, material, 64);
        shells.position.copy(mesh.position);
        // Instances are identity; only gl_InstanceID matters. Shells extrude past the base bounds.
        shells.frustumCulled = false;
        shells.castShadow = false;
        shells.receiveShadow = false;
        shells.visible = false;
        if (def.furMask) {
          uniforms.uMaskC.value.set(...def.furMask.center);
          uniforms.uMaskR.value.set(...def.furMask.radii);
        }
        group.add(shells);
        handle.fur = { mesh: shells, material, uniforms };
      }
      this.parts.set(def.id, handle);

      if (needsRole(def)) {
        const list = this.roles.get(def.role!) ?? [];
        list.push({ obj: group, p: group.position.clone(), r: new Vector3().setFromEuler(group.rotation), s: group.scale.clone() });
        this.roles.set(def.role!, list);
      }
    }
    const rootBind: RoleBinding = { obj: this.root, p: new Vector3(), r: new Vector3(), s: new Vector3(1, 1, 1) };
    this.roles.set('root', [rootBind]);
    this.animator = new Animator(this);
  }

  private createCoreMaterial(p: PartDef): Material {
    switch (p.finish) {
      case 'surface': return new MeshPhysicalMaterial({ roughness: 0.6 });
      case 'matte': return new MeshStandardMaterial({ roughness: 0.85 });
      case 'gloss': return new MeshPhysicalMaterial({ roughness: 0.28, clearcoat: 0.6, clearcoatRoughness: 0.15, color: p.color ?? '#ffffff' });
      case 'iris': return new MeshPhysicalMaterial({ roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.05 });
      case 'eye': return new MeshPhysicalMaterial({ color: p.color ?? '#0b0d13', roughness: 0.06, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 1.6 });
      case 'inner': return new MeshStandardMaterial({ color: p.color ?? '#2a1217', roughness: 0.55 });
      case 'glow': return new MeshBasicMaterial({ toneMapped: false });
      case 'highlight': return new MeshBasicMaterial({ color: '#ffffff', toneMapped: false });
    }
  }

  applyConfig(cfg: MascotConfig) {
    this.colorsBySlot.clear();
    for (const [slot, hex] of Object.entries(cfg.colors)) this.colorsBySlot.set(slot, new Color(hex));
    this.surface = SURFACES[cfg.surface];
    const acc = new Set(cfg.accessories);

    for (const h of this.parts.values()) {
      if (h.def.accessory) h.group.visible = acc.has(h.def.accessory);
      const color = h.def.slot ? this.colorsBySlot.get(h.def.slot) ?? this.defaultColor(h.def.slot) : undefined;
      if (h.def.finish === 'surface') this.applySurface(h, color!);
      else if (color && 'color' in h.core && h.def.finish !== 'eye' && h.def.finish !== 'inner') {
        (h.core as MeshStandardMaterial).color.copy(color);
        if (h.def.finish === 'iris') (h.core as MeshPhysicalMaterial).emissive.copy(color).multiplyScalar(0.18);
      }
    }
    this.animator.setExpression(cfg.expression);
  }

  private defaultColor(slot: string) {
    return new Color(this.def.palette[slot] ?? '#ffffff');
  }

  private applySurface(h: PartHandle, color: Color) {
    const s = this.surface;
    const m = h.core as MeshPhysicalMaterial;
    const furry = !!h.fur && !!s.fur;
    m.color.copy(color);
    // Under fur the skin is darkened and rough; shells provide the lit colour.
    if (furry) m.color.multiplyScalar(0.62);
    m.roughness = furry ? 1 : s.roughness;
    m.metalness = furry ? 0 : s.metalness;
    m.clearcoat = furry ? 0 : s.clearcoat;
    m.clearcoatRoughness = s.clearcoatRoughness;
    m.sheen = furry ? 0 : s.sheen;
    m.sheenRoughness = s.sheenRoughness;
    m.sheenColor.set('#ffffff');
    m.needsUpdate = true;

    if (h.fur) {
      h.fur.mesh.visible = furry;
      if (furry) {
        const f = s.fur!;
        const layers = Math.max(4, Math.round(f.layers * this.furLayerScale));
        const u = h.fur.uniforms;
        h.fur.material.color.copy(color);
        h.fur.mesh.count = layers;
        u.uLayers.value = layers;
        u.uLen.value = f.length * (h.def.role === 'head' ? 0.9 : 1);
        u.uDensity.value = f.density;
        u.uRoot.value = f.rootDark;
        u.uRim.value = f.rim;
        u.uGravity.value = f.gravity;
      }
    }
  }

  setFurRim(env: EnvironmentDef) {
    for (const h of this.parts.values()) h.fur?.uniforms.uRimColor.value.set(env.furRim);
  }

  /** Quality changed at runtime: re-derive shell counts without rebuilding geometry. */
  setFurLayerScale(scale: number) {
    this.furLayerScale = scale;
    for (const h of this.parts.values()) {
      if (!h.fur || !h.fur.mesh.visible || !this.surface.fur) continue;
      const layers = Math.max(4, Math.round(this.surface.fur.layers * scale));
      h.fur.mesh.count = layers;
      h.fur.uniforms.uLayers.value = layers;
    }
  }

  get headObject(): Object3D {
    return this.roles.get('head')?.[0]?.obj ?? this.root;
  }

  /** Triangle count of everything currently drawn (shells included). */
  stats() {
    let draws = 0, tris = 0;
    for (const h of this.parts.values()) {
      if (!h.group.visible) continue;
      const idx = h.geometry.index?.count ?? 0;
      draws++; tris += idx / 3;
      if (h.fur?.mesh.visible) { draws++; tris += (idx / 3) * h.fur.mesh.count; }
    }
    return { draws, tris: Math.round(tris) };
  }

  dispose() {
    for (const h of this.parts.values()) {
      h.geometry.dispose();
      h.core.dispose();
      h.fur?.material.dispose();
      h.fur?.mesh.dispose();
    }
    this.parts.clear();
    this.root.clear();
    this.hitMeshes.length = 0;
    this.roles.clear();
  }

}
