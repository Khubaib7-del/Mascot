import { Color, IUniform, MeshStandardMaterial, Vector3 } from 'three';

export interface FurUniforms {
  uLayers: IUniform<number>;
  uLen: IUniform<number>;
  uDensity: IUniform<number>;
  uRoot: IUniform<number>;
  uRim: IUniform<number>;
  uGravity: IUniform<number>;
  uMaskC: IUniform<Vector3>;
  uMaskR: IUniform<Vector3>;
  uRimColor: IUniform<Color>;
  uTime: IUniform<number>;
}

const VERT_DECL = /* glsl */ `
uniform float uLayers; uniform float uLen; uniform float uGravity; uniform float uTime;
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
float sway = vLayer * vLayer * vFade * uLen * 0.06;
transformed.x += sin(uTime * 1.3 + position.y * 7.0) * sway;
transformed.z += cos(uTime * 1.1 + position.x * 7.0) * sway;
`;

const FRAG_DECL = /* glsl */ `
uniform float uDensity; uniform float uRoot; uniform float uRim; uniform vec3 uRimColor;
varying float vLayer; varying float vFade; varying vec3 vBase;
float furHash(vec3 p){ p = fract(p * vec3(0.1031, 0.1030, 0.0973)); p += dot(p, p.yxz + 33.33); return fract((p.x + p.y) * p.z); }
`;

// Strands are cells of a 3D grid sampled at the base surface point. One jittered strand per cell,
// tapered with height and randomly truncated. No UV seams, no pole pinching.
const FRAG_START = /* glsl */ `
// Fixed oblique rotation so flat patches never align with the lattice (avoids moire rings).
const mat3 furRot = mat3(0.80, 0.36, -0.48, -0.50, 0.84, -0.21, 0.33, 0.41, 0.85);
vec3 furP = furRot * vBase * uDensity;
vec3 furCell = floor(furP);
float h1 = furHash(furCell);
float h2 = furHash(furCell + 17.31);
float h3 = furHash(furCell + 41.7);
vec3 furC = furCell + 0.5 + (vec3(h1, h2, h3) - 0.5) * 0.42;
float strandH = 0.55 + 0.45 * h1;
float taper = clamp(vLayer / strandH, 0.0, 1.0);
float strandR = mix(0.48, 0.2, taper * taper) * (0.8 + 0.4 * h3);
if (vLayer > strandH || length(furP - furC) > strandR) discard;
`;

const FRAG_COLOR = /* glsl */ `
float tipLift = 0.82 + 0.26 * h2;
diffuseColor.rgb *= mix(1.0 - uRoot, 1.0, smoothstep(0.0, 0.85, vLayer)) * tipLift;
`;

const FRAG_RIM = /* glsl */ `
{
  float fres = pow(1.0 - saturate(dot(normalize(vViewPosition), normal)), 2.5);
  outgoingLight += uRimColor * diffuseColor.rgb * uRim * fres * (0.25 + vLayer);
}
`;

export function createFurMaterial(sharedTime: IUniform<number>): { material: MeshStandardMaterial; uniforms: FurUniforms } {
  const uniforms: FurUniforms = {
    uLayers: { value: 16 }, uLen: { value: 0.05 }, uDensity: { value: 60 }, uRoot: { value: 0.4 }, uRim: { value: 0.6 },
    uGravity: { value: 0 }, uMaskC: { value: new Vector3() }, uMaskR: { value: new Vector3(0, 0, 0) },
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
  material.customProgramCacheKey = () => 'mascot-fur-shell-v1';
  return { material, uniforms };
}
