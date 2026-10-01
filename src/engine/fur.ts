import { Color, IUniform, Material, MeshStandardMaterial, Vector3 } from 'three';

export interface MarkUniforms {
  uMarkColor: IUniform<Color>;
  uMarkScale: IUniform<number>;
  uMarkCov: IUniform<number>;
  uMarkSize: IUniform<number>;
  uMarkKind: IUniform<number>;
  uMarkSeed: IUniform<number>;
}

export function createMarkUniforms(): MarkUniforms {
  return {
    uMarkColor: { value: new Color() }, uMarkScale: { value: 1 }, uMarkCov: { value: 0 },
    uMarkSize: { value: 0.4 }, uMarkKind: { value: 0 }, uMarkSeed: { value: 0 },
  };
}

export interface FurUniforms extends MarkUniforms {
  uLayers: IUniform<number>;
  uLen: IUniform<number>;
  uDensity: IUniform<number>;
  uRoot: IUniform<number>;
  uRim: IUniform<number>;
  uGravity: IUniform<number>;
  uLean: IUniform<number>;
  uClump: IUniform<number>;
  uThick: IUniform<number>;
  uFluff: IUniform<number>;
  uSoft: IUniform<number>;
  uVary: IUniform<number>;
  uMaskC: IUniform<Vector3>;
  uMaskR: IUniform<Vector3>;
  uRimColor: IUniform<Color>;
  uTime: IUniform<number>;
}

const MARK_DECL = /* glsl */ `
uniform vec3 uMarkColor; uniform float uMarkScale; uniform float uMarkCov; uniform float uMarkSize; uniform float uMarkKind; uniform float uMarkSeed;
float mkHash(vec3 p){ p = fract(p * vec3(0.1031, 0.1030, 0.0973)); p += dot(p, p.yxz + 33.33); return fract((p.x + p.y) * p.z); }
// One jittered mark per lattice cell, evaluated at a single cell (no neighbour search) so it is cheap on every shell.
float markMask(vec3 p){
  if (uMarkCov <= 0.001) return 0.0;
  vec3 q = p * uMarkScale + vec3(uMarkSeed);
  vec3 cell = floor(q);
  float h = mkHash(cell), h2 = mkHash(cell + 7.7), h3 = mkHash(cell + 19.1);
  if (uMarkKind > 1.5) { // patches: soft low-frequency blobs
    float n = mkHash(floor(q * 0.5)) ;
    float d = length(fract(q * 0.5) - 0.5);
    return step(n, uMarkCov) * smoothstep(0.5, 0.28, d + (h - 0.5) * 0.25);
  }
  if (h > uMarkCov) return 0.0;
  vec3 c = cell + 0.5 + (vec3(h, h2, h3) - 0.5) * 0.3;
  float d = length(q - c);
  float r = uMarkSize * (0.55 + 0.45 * h2);
  float edge = 0.05;
  if (uMarkKind > 0.5) { // rosettes: broken ring with a dusty centre
    float ring = smoothstep(r, r - edge, d) * smoothstep(r * 0.45, r * 0.55, d);
    return max(ring, smoothstep(r * 0.3, 0.0, d) * 0.45);
  }
  return smoothstep(r, r - edge * 2.0, d);
}
`;

/** Skin material: paints markings using object-space position. Shell materials reuse markMask via vBase. */
export function attachMarkings(material: Material, u: MarkUniforms) {
  const prev = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    prev?.call(material, shader, renderer);
    Object.assign(shader.uniforms, u);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vMkPos;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvMkPos = position;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vMkPos;\n${MARK_DECL}`)
      .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb = mix(diffuseColor.rgb, uMarkColor, markMask(vMkPos) * 0.92);');
  };
  material.customProgramCacheKey = () => 'mascot-marks-v1';
}

const VERT_DECL = /* glsl */ `
uniform float uLayers; uniform float uLen; uniform float uGravity; uniform float uTime; uniform float uLean;
uniform vec3 uMaskC; uniform vec3 uMaskR;
varying float vLayer; varying float vFade; varying vec3 vBase;
`;

// Shells are one InstancedMesh: gl_InstanceID is the layer. `position` here is the undisplaced
// surface point, which gives every layer the same strand identity (see fragment shader).
const VERT_BODY = /* glsl */ `
vLayer = (float(gl_InstanceID) + 1.0) / uLayers;
vBase = position;
vec3 fm = (position - uMaskC) / max(uMaskR, vec3(1e-4));
vFade = uMaskR.x > 0.0 ? mix(0.2, 1.0, smoothstep(0.78, 1.2, length(fm))) : 1.0;
float shellLen = uLen * vLayer * vFade;
transformed += objectNormal * shellLen;
transformed.y -= uGravity * vLayer * vLayer * vFade;
transformed.x += uLean * uLen * vLayer * vLayer * vFade;
float sway = vLayer * vLayer * vFade * uLen * 0.06;
transformed.x += sin(uTime * 1.3 + position.y * 7.0) * sway;
transformed.z += cos(uTime * 1.1 + position.x * 7.0) * sway;
`;

const FRAG_DECL = /* glsl */ `
uniform float uDensity; uniform float uRoot; uniform float uRim; uniform vec3 uRimColor;
uniform float uClump; uniform float uThick; uniform float uFluff; uniform float uSoft; uniform float uVary;
varying float vLayer; varying float vFade; varying vec3 vBase;
float furHash(vec3 p){ p = fract(p * vec3(0.1031, 0.1030, 0.0973)); p += dot(p, p.yxz + 33.33); return fract((p.x + p.y) * p.z); }
${MARK_DECL}
`;

// Strands are cells of a 3D grid sampled at the base surface point: one jittered strand per cell,
// tapered with height and randomly truncated. No UV seams, no pole pinching. `uClump` leans whole
// groups of strands the same way (wool locks) by shifting the lookup with layer height.
const FRAG_START = /* glsl */ `
// Fixed oblique rotation so flat patches never align with the lattice (avoids moire rings).
const mat3 furRot = mat3(0.80, 0.36, -0.48, -0.50, 0.84, -0.21, 0.33, 0.41, 0.85);
vec3 furP = furRot * vBase * uDensity;
if (uClump > 0.0) {
  vec3 lock = floor(furP / 3.0);
  furP += (vec3(furHash(lock), furHash(lock + 3.1), furHash(lock + 8.7)) - 0.5) * 2.0 * uClump * vLayer * 1.6;
}
vec3 furCell = floor(furP);
float h1 = furHash(furCell);
float h2 = furHash(furCell + 17.31);
float h3 = furHash(furCell + 41.7);
vec3 furC = furCell + 0.5 + (vec3(h1, h2, h3) - 0.5) * 0.42;
float hMin = mix(0.8, 0.42, uFluff);
float strandH = hMin + (1.0 - hMin) * h1;
float taper = clamp(vLayer / strandH, 0.0, 1.0);
float tipR = mix(0.2, 0.05, uSoft);
float strandR = mix(uThick + 0.06, tipR, pow(taper, mix(1.6, 0.9, uSoft))) * (0.8 + 0.4 * h3);
if (vLayer > strandH || length(furP - furC) > strandR) discard;
`;

const FRAG_COLOR = /* glsl */ `
float tipLift = 1.0 + (h2 - 0.5) * (0.12 + 0.5 * uVary);
diffuseColor.rgb *= mix(1.0 - uRoot, 1.0, smoothstep(0.0, 0.85, vLayer)) * tipLift;
diffuseColor.rgb = mix(diffuseColor.rgb, uMarkColor, markMask(vBase) * 0.95);
`;

const FRAG_RIM = /* glsl */ `
{
  float fres = pow(1.0 - saturate(dot(normalize(vViewPosition), normal)), 2.5);
  outgoingLight += uRimColor * diffuseColor.rgb * uRim * fres * (0.25 + vLayer);
}
`;

export function createFurMaterial(sharedTime: IUniform<number>, marks: MarkUniforms): { material: MeshStandardMaterial; uniforms: FurUniforms } {
  const uniforms: FurUniforms = {
    ...marks,
    uLayers: { value: 16 }, uLen: { value: 0.05 }, uDensity: { value: 60 }, uRoot: { value: 0.4 }, uRim: { value: 0.6 },
    uGravity: { value: 0 }, uLean: { value: 0 }, uClump: { value: 0 }, uThick: { value: 0.4 }, uFluff: { value: 0.5 },
    uSoft: { value: 0.5 }, uVary: { value: 0.5 },
    uMaskC: { value: new Vector3() }, uMaskR: { value: new Vector3(0, 0, 0) },
    uRimColor: { value: new Color(1, 1, 1) }, uTime: sharedTime,
  };
  const material = new MeshStandardMaterial({ roughness: 0.9, metalness: 0 });
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${VERT_DECL}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>\n${VERT_BODY}`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${FRAG_DECL}`)
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>\n${FRAG_START}`)
      .replace('#include <color_fragment>', `#include <color_fragment>\n${FRAG_COLOR}`)
      .replace('#include <opaque_fragment>', `${FRAG_RIM}\n#include <opaque_fragment>`);
  };
  material.customProgramCacheKey = () => 'mascot-fur-shell-v2';
  return { material, uniforms };
}
