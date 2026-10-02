import { Color, IUniform, Material, MeshPhysicalMaterial, Vector3, Vector4 } from 'three';

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

export interface FurUniforms extends MarkUniforms, OccUniforms {
  uLayers: IUniform<number>;
  uLen: IUniform<number>;
  uDensity: IUniform<number>;
  uRoot: IUniform<number>;
  uRim: IUniform<number>;
  uGravity: IUniform<number>;
  uLean: IUniform<number>;
  uBend: IUniform<number>;
  uRadial: IUniform<number>;
  uFlowC: IUniform<Vector3>;
  uClump: IUniform<number>;
  uTuft: IUniform<number>;
  uCurl: IUniform<number>;
  uThick: IUniform<number>;
  uFluff: IUniform<number>;
  uSoft: IUniform<number>;
  uVary: IUniform<number>;
  uWisp: IUniform<number>;
  uTilt: IUniform<number>;
  uHard: IUniform<number>;
  uValley: IUniform<number>;
  uGain: IUniform<number>;
  uMaskC: IUniform<Vector3[]>;
  uMaskR: IUniform<Vector3[]>;
  uMaskF: IUniform<number[]>;
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
  if (uMarkKind > 1.5) {
    float n = mkHash(floor(q * 0.5));
    float d = length(fract(q * 0.5) - 0.5);
    return step(n, uMarkCov) * smoothstep(0.5, 0.28, d + (h - 0.5) * 0.25);
  }
  if (h > uMarkCov) return 0.0;
  vec3 c = cell + 0.5 + (vec3(h, h2, h3) - 0.5) * 0.3;
  float d = length(q - c);
  float r = uMarkSize * (0.55 + 0.45 * h2);
  float edge = 0.2;
  if (uMarkKind > 0.5) {
    float ring = smoothstep(r, r - edge, d) * smoothstep(r * 0.42, r * 0.58, d);
    return max(ring, smoothstep(r * 0.3, 0.0, d) * 0.4);
  }
  return smoothstep(r, r - edge * 2.0, d);
}
`;

/**
 * Analytic sphere ambient occlusion: a handful of proxy spheres (head, torso, limbs) darken the fur and skin
 * where one part sits against another — under the chin, inside the arms, between the legs. Cheap, and it is
 * what gives a stuffed-toy silhouette its sense of weight.
 */
export interface OccUniforms { uOcc: IUniform<Vector4[]>; uOccSelf: IUniform<number>; uOccK: IUniform<number> }
export const OCC_COUNT = 6;
export const createOccUniforms = (spheres: Vector4[]): OccUniforms => ({ uOcc: { value: spheres }, uOccSelf: { value: -1 }, uOccK: { value: 0.8 } });

const OCC_DECL = /* glsl */ `
uniform vec4 uOcc[6]; uniform float uOccSelf; uniform float uOccK; varying vec3 vWPos; varying vec3 vWNor;
float occAO() {
  vec3 n = normalize(vWNor); float ao = 1.0;
  for (int i = 0; i < 6; i++) {
    if (float(i) == uOccSelf) continue;
    vec4 s = uOcc[i]; if (s.w <= 0.0) continue;
    vec3 d = s.xyz - vWPos; float l = max(length(d), 1e-3);
    float o = clamp((s.w * s.w) / (l * l) * (0.35 + 0.65 * dot(n, d / l)), 0.0, 1.0);
    ao *= 1.0 - 0.8 * o;
  }
  return mix(1.0, ao, uOccK);
}
`;
const OCC_VERT = 'vWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;\nvWNor = normalize(mat3(modelMatrix) * objectNormal);';

export function attachOcclusion(material: Material, u: OccUniforms) {
  const prev = material.onBeforeCompile, prevKey = material.customProgramCacheKey?.bind(material) ?? (() => '');
  material.onBeforeCompile = (shader, renderer) => {
    prev?.call(material, shader, renderer);
    Object.assign(shader.uniforms, u);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos; varying vec3 vWNor;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>\n${OCC_VERT}`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${OCC_DECL}`)
      .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb *= occAO();');
  };
  material.customProgramCacheKey = () => `${prevKey()}|occ1`;
}

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
  material.customProgramCacheKey = () => 'mascot-marks-v2';
}

const VERT_DECL = /* glsl */ `
varying vec3 vWPos; varying vec3 vWNor;
uniform float uLayers; uniform float uLen; uniform float uGravity; uniform float uTime; uniform float uLean; uniform float uBend; uniform float uRadial;
uniform vec3 uFlowC; uniform vec3 uMaskC[3]; uniform vec3 uMaskR[3]; uniform float uMaskF[3];
varying float vLayer; varying float vFade; varying vec3 vBase; varying vec3 vFlowV;
`;

// Shells are one InstancedMesh: gl_InstanceID is the layer. `position` here is the undisplaced surface
// point, which gives every layer the same strand identity (see fragment shader). Each shell is pushed out
// along the normal and then swept along a flow direction, so the coat lies down like real fur instead of
// standing up like a brush.
const VERT_BODY = /* glsl */ `
vLayer = (float(gl_InstanceID) + 1.0) / uLayers;
vBase = position;
float fade = 1.0;
for (int i = 0; i < 3; i++) {
  if (uMaskR[i].x > 0.0) {
    vec3 fm = (position - uMaskC[i]) / uMaskR[i];
    fade = min(fade, mix(uMaskF[i], 1.0, smoothstep(0.7, 1.15, length(fm))));
  }
}
vFade = fade;
vec3 fn = normalize(objectNormal);
vec3 fg = mix(vec3(0.0, -1.0, 0.0), normalize(position - uFlowC + vec3(1e-4)), uRadial);
vec3 ft = fg - fn * dot(fg, fn);
float fl = length(ft);
ft = fl > 0.02 ? ft / fl : vec3(0.0, 0.0, 1.0);
float fh = vLayer;
float fLen = uLen * fade;
transformed += fn * (fLen * fh) + ft * (uBend * fLen * fh * fh);
transformed.y -= uGravity * fh * fh * fade;
transformed.x += uLean * fLen * fh * fh;
float sway = fh * fh * fLen * 0.05;
transformed.x += sin(uTime * 1.3 + position.y * 7.0) * sway;
transformed.z += cos(uTime * 1.1 + position.x * 7.0) * sway;
vFlowV = normalize(normalMatrix * ft);
${OCC_VERT}
`;

const FRAG_DECL = /* glsl */ `
${OCC_DECL}
uniform float uDensity; uniform float uRoot; uniform float uRim; uniform vec3 uRimColor;
uniform float uClump; uniform float uTuft; uniform float uCurl; uniform float uThick; uniform float uFluff; uniform float uSoft; uniform float uVary;
uniform float uWisp; uniform float uTilt; uniform float uHard; uniform float uValley; uniform float uGain;
varying float vLayer; varying float vFade; varying vec3 vBase; varying vec3 vFlowV;
float furHash(vec3 p){ p = fract(p * vec3(0.1031, 0.1030, 0.0973)); p += dot(p, p.yxz + 33.33); return fract((p.x + p.y) * p.z); }
${MARK_DECL}
`;

// Strands are cells of a 3D lattice sampled at the base surface point (no UV seams, no pole pinching).
// A second, coarser lattice defines tufts: strands lean toward their tuft's centre as they rise, which is what
// gives real fur its pointed locks, and each tuft varies in length and tone. Wool adds a helical offset (curl).
const FRAG_START = /* glsl */ `
const mat3 furRot = mat3(0.80, 0.36, -0.48, -0.50, 0.84, -0.21, 0.33, 0.41, 0.85);
float fh = vLayer;
vec3 fp = furRot * vBase * uDensity;
vec3 tp = fp * uTuft;
vec3 tc0 = floor(tp);
float t1 = furHash(tc0 + 3.7), t2 = furHash(tc0 + 11.3), t3 = furHash(tc0 + 29.1);
vec3 tcen = tc0 + 0.5 + (vec3(t1, t2, t3) - 0.5) * 0.6;
float valley = smoothstep(0.12, 0.7, length(tp - tcen));
vec3 tuftN = vec3(t1, t2, t3) - 0.5;
fp -= ((tcen - tp) / uTuft) * uClump * fh;
if (uCurl > 0.0) { float ca = fh * 7.5 + t2 * 6.2831; fp += vec3(cos(ca), sin(ca * 1.3), sin(ca)) * uCurl * fh; }
vec3 fcell = floor(fp);
float h1 = furHash(fcell), h2 = furHash(fcell + 17.31), h3 = furHash(fcell + 41.7);
vec3 fsc = fcell + 0.5 + (vec3(h1, h2, h3) - 0.5) * 0.5;
float hMin = mix(0.8, 0.5, uFluff);
float strandH = (hMin + (1.0 - hMin) * h1) * (0.78 + 0.22 * t1);
bool wisp = h3 > 1.0 - uWisp * 0.45;
strandH = min(strandH, 0.84);
if (wisp) strandH = 1.0;
float taper = clamp(fh / strandH, 0.0, 1.0);
float tipR = mix(0.16, 0.03, uSoft);
float strandR = mix(uThick, tipR, pow(taper, mix(1.5, 0.85, uSoft))) * (0.8 + 0.4 * h2) * (wisp ? 1.15 : 1.0);
float fd = length(fp - fsc);
float fw = max(length(fwidth(vBase * uDensity)), 1e-3);
float cover = clamp((strandR - fd) / fw + 0.5, 0.0, 1.0);
cover = mix(cover, step(0.5, cover), uHard);
if (fh > strandH || cover < 0.03) discard;
`;

const FRAG_COLOR = /* glsl */ `
float furAO = mix(1.0 - uRoot, 1.0, pow(fh, 0.7));
// Shadowed valleys between locks: the structure that makes a white coat read as fur rather than paper.
furAO *= 1.0 - uValley * valley * (1.0 - fh);
float tipLift = 1.0 + (h2 - 0.5) * (0.05 + 0.2 * uVary);
// 0.88: white coats must stay below clipping so their form shading survives bright light.
diffuseColor.rgb *= 0.88 * uGain * furAO * tipLift * (0.94 + 0.12 * t2) * occAO();
diffuseColor.rgb = mix(diffuseColor.rgb, uMarkColor, markMask(vBase) * 0.95);
diffuseColor.a = cover;
`;

const FRAG_TILT = /* glsl */ `
normal = normalize(normal + vFlowV * uTilt * fh + tuftN * 0.55 * fh);
`;

const FRAG_RIM = /* glsl */ `
{
  float fres = pow(1.0 - saturate(dot(normalize(vViewPosition), normal)), 2.2);
  outgoingLight += uRimColor * diffuseColor.rgb * uRim * fres * (0.2 + fh);
}
`;

export function createFurMaterial(sharedTime: IUniform<number>, marks: MarkUniforms, occ: OccUniforms): { material: MeshPhysicalMaterial; uniforms: FurUniforms } {
  const uniforms: FurUniforms = {
    ...marks, ...occ,
    uLayers: { value: 16 }, uLen: { value: 0.05 }, uDensity: { value: 200 }, uRoot: { value: 0.3 }, uRim: { value: 0.6 },
    uGravity: { value: 0 }, uLean: { value: 0 }, uBend: { value: 0.5 }, uRadial: { value: 0 }, uFlowC: { value: new Vector3() },
    uClump: { value: 0.5 }, uTuft: { value: 0.14 }, uCurl: { value: 0 }, uThick: { value: 0.42 }, uFluff: { value: 0.5 },
    uSoft: { value: 0.5 }, uVary: { value: 0.5 }, uWisp: { value: 0.04 }, uTilt: { value: 0.6 }, uHard: { value: 0 }, uValley: { value: 0.34 }, uGain: { value: 1 },
    uMaskC: { value: [new Vector3(), new Vector3(), new Vector3()] }, uMaskR: { value: [new Vector3(), new Vector3(), new Vector3()] }, uMaskF: { value: [1, 1, 1] },
    uRimColor: { value: new Color(1, 1, 1) }, uTime: sharedTime,
  };
  // Physical material for its sheen lobe: the soft, backscattered edge glow of fabric and fur.
  const material = new MeshPhysicalMaterial({ roughness: 1, metalness: 0, sheen: 0.4, sheenRoughness: 0.55, sheenColor: new Color('#ffffff'), alphaToCoverage: true });
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${VERT_DECL}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>\n${VERT_BODY}`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${FRAG_DECL}`)
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>\n${FRAG_START}`)
      .replace('#include <color_fragment>', `#include <color_fragment>\n${FRAG_COLOR}`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>\n${FRAG_TILT}`)
      .replace('#include <opaque_fragment>', `${FRAG_RIM}\n#include <opaque_fragment>`);
  };
  material.customProgramCacheKey = () => 'mascot-fur-shell-v4';
  return { material, uniforms };
}
