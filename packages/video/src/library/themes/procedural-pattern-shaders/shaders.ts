// GLSL sources for the pattern engine: one shared header and main, plus a thin field function per pattern (all WebGL1, loops of 9 or fewer).
export type PatternName = "spiral" | "swirl" | "waves" | "voronoi" | "perlin" | "dots" | "metaballs" | "rays" | "border" | "stripes";

export const VERTEX = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

// uRect: this canvas's rect in 1920×1080 frame px. uOrigin: pattern origin (px) and the px length of one pattern unit.
// gPx is one output pixel in pattern units, computed analytically so edges anti-alias without the derivatives extension.
const HEAD = `
precision highp float;
uniform vec2 uRes;
uniform vec4 uRect;
uniform vec3 uOrigin;
uniform vec4 uCam;
uniform float uTime;
uniform float uScale;
uniform vec4 uP;
uniform vec4 uQ;
uniform vec3 uC0, uC1, uC2, uC3, uC4;
uniform float uN;
uniform float uThresh;
uniform float uSeed;
float gPx;

vec3 pick(float i) {
  i = mod(i, uN);
  if (i < 0.5) return uC0;
  if (i < 1.5) return uC1;
  if (i < 2.5) return uC2;
  if (i < 3.5) return uC3;
  return uC4;
}
// Flat bands cycling through palette slots [first, first+count), with a one-pixel blend at each edge.
vec3 bands(float x, float first, float count, float w) {
  float i = floor(x);
  float f = fract(x);
  vec3 a = pick(first + mod(i - 1.0, count));
  vec3 b = pick(first + mod(i, count));
  return mix(a, b, smoothstep(0.0, max(w, 1e-4), f));
}
float tri(float x) { return abs(fract(x) - 0.5) * 2.0; }
float h21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21) + uSeed * 0.137);
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), u.x), mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), u.x), u.y);
}
`;

const MAIN = `
void main() {
  vec2 fc = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  vec2 px = uRect.xy + fc / uRes * uRect.zw;
  vec2 p = (px - uOrigin.xy) / uOrigin.z;
  float c = cos(uCam.w);
  float s = sin(uCam.w);
  p = mat2(c, s, -s, c) * p / uCam.z + uCam.xy;
  p *= uScale;
  gPx = (uRect.z / uRes.x) / uOrigin.z / uCam.z * uScale;
  float v = 0.0;
  vec4 col = pattern(p, uTime, v);
  // Dissolve: where the field is below the threshold the pixel goes transparent, so the next scene shows through.
  float a = col.a;
  if (uThresh > 0.0) a *= smoothstep(uThresh - 0.015, uThresh + 0.015, v);
  gl_FragColor = vec4(col.rgb * a, a);
}
`;

// uP: arms, rings per unit, stripe duty, -
const spiral = `
vec4 pattern(vec2 p, float t, out float v) {
  float r = length(p);
  float a = atan(p.y, p.x) / 6.28318;
  float x = r * uP.y + a * uP.x - t * 0.5;
  float w = gPx * (uP.y + uP.x / (6.28318 * max(r, 1e-3)));
  float d = tri(x);
  v = d;
  float m = smoothstep(uP.z - w, uP.z + w, d);
  return vec4(mix(uC1, uC0, m), 1.0);
}`;

// uP: repeats of the palette per turn, twist, wobble, -
const swirl = `
vec4 pattern(vec2 p, float t, out float v) {
  float r = length(p);
  float a = atan(p.y, p.x) / 6.28318;
  float n = uP.x * uN;
  float x = a * n + uP.y * sqrt(r) * n * 0.5 + uP.z * sin(r * 7.0 - t * 1.1) - t * 0.35;
  float w = gPx * n * (1.0 / (6.28318 * max(r, 1e-3)) + uP.y * 0.25 / sqrt(max(r, 1e-3)));
  v = tri(x);
  return vec4(bands(x, 0.0, uN, w * 1.5), 1.0);
}`;

// uP: rows per unit, zigzags per unit, amplitude, line duty. Ink colours alternate by row.
const waves = `
vec4 pattern(vec2 p, float t, out float v) {
  float z = (abs(fract(p.x * uP.y - t * 0.25) - 0.5) * 4.0 - 1.0);
  float y = p.y * uP.x + uP.z * z;
  float d = tri(y + 0.5);
  float w = gPx * (uP.x + 4.0 * uP.z * uP.y) * 1.2;
  float m = 1.0 - smoothstep(uP.w - w, uP.w + w, d);
  v = 1.0 - d;
  vec3 ink = pick(1.0 + mod(floor(y + 0.5), max(uN - 1.0, 1.0)));
  return vec4(mix(uC0, ink, m), 1.0);
}`;

// uP: cells per unit, seed drift, outline width, -. Fill from palette slots 1+, outlines in slot 0; v = cell hash so a dissolve pops cell by cell.
const voronoi = `
vec4 pattern(vec2 p, float t, out float v) {
  vec2 q = p * uP.x;
  vec2 cell = floor(q);
  vec2 f = fract(q);
  float f1 = 8.0;
  float f2 = 8.0;
  vec2 id = vec2(0.0);
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 o = vec2(float(i), float(j));
      float h = h21(cell + o);
      vec2 s = 0.5 + uP.y * vec2(sin(t * 0.6 + 6.28318 * h), cos(t * 0.5 + 6.28318 * fract(h * 7.31)));
      float d = length(o + s - f);
      if (d < f1) { f2 = f1; f1 = d; id = cell + o; }
      else if (d < f2) { f2 = d; }
    }
  }
  float h = h21(id);
  v = h;
  vec3 fill = pick(1.0 + floor(h * (uN - 1.0)));
  float w = gPx * uP.x * 1.2;
  float edge = 1.0 - smoothstep(uP.z - w, uP.z + w, f2 - f1);
  return vec4(mix(fill, uC0, edge), 1.0);
}`;

// uP: frequency, contour bands (0 = two-tone threshold), warp, threshold
const perlin = `
float fbm(vec2 p) {
  float s = 0.0;
  float a = 0.5;
  for (int i = 0; i < 3; i++) { s += a * vnoise(p); p = p * 2.03 + 11.7; a *= 0.5; }
  return s / 0.875;
}
vec4 pattern(vec2 p, float t, out float v) {
  vec2 q = p * uP.x;
  q += uP.z * vec2(vnoise(q + vec2(0.0, t * 0.12)), vnoise(q + vec2(5.2, -t * 0.12))) - uP.z * 0.5;
  float n = fbm(q + vec2(t * 0.06, 0.0));
  v = n;
  float w = gPx * uP.x * 2.2;
  if (uP.y < 0.5) {
    float m = smoothstep(uP.w - w, uP.w + w, n);
    return vec4(mix(uC0, uC1, m), 1.0);
  }
  return vec4(bands(n * uP.y, 0.0, uN, w * uP.y), 1.0);
}`;

// uP: cells per unit, dot radius (cell units), orbit radius, mode (0 orbit, 1 halftone wedge, 2 noise field)
// uQ (mode 1): wedge centre xy, disc radius, sweep 0..1 clockwise from 12 o'clock. Wedge dots use slot 1, the rest of the disc slot 2, outside slot 3.
const dots = `
vec4 pattern(vec2 p, float t, out float v) {
  vec2 q = p * uP.x;
  vec2 id = floor(q);
  vec2 f = fract(q) - 0.5;
  float h = h21(id);
  vec2 c = uP.z * vec2(cos(t * 1.3 + h * 6.28318), sin(t * 1.3 + h * 6.28318));
  float rad = uP.y;
  vec3 ink = pick(1.0 + floor(h * (uN - 1.0)));
  if (uP.w > 0.5 && uP.w < 1.5) {
    vec2 rel = (id + 0.5) / uP.x - uQ.xy;
    float ang = fract(atan(rel.x, -rel.y) / 6.28318 + 1.0);
    float inside = step(ang, uQ.w) * step(length(rel), uQ.z);
    float ring = step(length(rel), uQ.z);
    rad = mix(uP.y * mix(0.35, 0.55, ring), uP.y * 1.45, inside);
    ink = mix(mix(uC3, uC2, ring), uC1, inside);
    c = vec2(0.0);
  } else if (uP.w > 1.5) {
    rad = uP.y * smoothstep(0.28, 0.72, vnoise((id + 0.5) / uP.x * 2.4 + vec2(t * 0.15, -t * 0.08)));
    c = vec2(0.0);
  }
  float d = length(f - c);
  float w = gPx * uP.x * 1.1;
  float m = 1.0 - smoothstep(rad - w, rad + w, d);
  v = h;
  return vec4(mix(uC0, ink, m), 1.0);
}`;

// uP: radius scale, spread, pulse, ball count (≤ 6). Balls ride Lissajous paths; colour weights are cubed so each blob stays
// mostly flat and colours only meet where blobs merge.
const metaballs = `
vec4 pattern(vec2 p, float t, out float v) {
  float sum = 0.0;
  float wsum = 0.0;
  vec3 acc = vec3(0.0);
  for (int i = 0; i < 6; i++) {
    float fi = float(i);
    if (fi >= uP.w) break;
    vec2 c = vec2(sin(t * (0.37 + fi * 0.11) + fi * 2.1) * 0.62, cos(t * (0.29 + fi * 0.07) + fi * 1.3) * 0.3) * uP.y;
    float r = (0.13 + 0.05 * sin(fi * 3.7)) * uP.x * (1.0 + uP.z);
    vec2 d = p - c;
    float k = r * r / max(dot(d, d), 1e-5);
    sum += k;
    float k3 = k * k * k;
    wsum += k3;
    acc += k3 * pick(1.0 + mod(fi, uN - 1.0));
  }
  vec3 col = acc / max(wsum, 1e-9);
  float w = gPx * 14.0;
  float m = smoothstep(1.0 - w, 1.0 + w, sum);
  col = mix(col, min(col * 1.12 + 0.05, 1.0), smoothstep(2.0, 6.0, sum));
  v = clamp(sum * 0.5, 0.0, 1.0);
  return vec4(mix(uC0, col, m), 1.0);
}`;

// uP: source xy, ray density, intensity. Integer angular frequencies keep the atan seam invisible.
const rays = `
vec4 pattern(vec2 p, float t, out float v) {
  vec2 rel = p - uP.xy;
  float a = atan(rel.y, rel.x);
  float r = length(rel);
  float s = 0.0;
  for (int k = 0; k < 4; k++) {
    float fk = float(k);
    s += sin(a * floor(uP.z * (1.0 + fk * 1.37)) + t * (0.35 + fk * 0.21) + fk * 1.7) / (1.0 + fk * 0.6);
  }
  float ray = pow(clamp(0.5 + 0.5 * s / 2.1, 0.0, 1.0), 2.4);
  float fall = exp(-r * 0.9);
  float core = exp(-r * 5.0);
  float i = ray * fall * uP.w;
  v = clamp(i + core, 0.0, 1.0);
  vec3 col = mix(uC0, uC1, clamp(i * 1.6, 0.0, 1.0));
  col = mix(col, pick(min(2.0, uN - 1.0)), clamp(i * i * 1.4 + core * 0.9, 0.0, 1.0));
  return vec4(col, 1.0);
}`;

// uP: half width, half height, corner radius, line thickness (pattern units). uQ: pulse, transparent ground (1), -, -
const border = `
float sdBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}
vec4 pattern(vec2 p, float t, out float v) {
  float d = abs(sdBox(p, uP.xy, uP.z)) - uP.w * 0.5;
  float w = gPx * 1.2;
  float line = 1.0 - smoothstep(-w, w, d);
  float breathe = 0.6 + 0.4 * sin(t * 2.2);
  float glow = exp(-max(d, 0.0) * 22.0) * breathe * (0.7 + uQ.x);
  float k = fract(atan(p.y, p.x) / 6.28318 + t * 0.12) * (uN - 1.0);
  vec3 ink = mix(pick(1.0 + floor(k)), pick(1.0 + mod(floor(k) + 1.0, uN - 1.0)), smoothstep(0.0, 1.0, fract(k)));
  float a = clamp(max(line, glow), 0.0, 1.0);
  vec3 rgb = min(ink * (line * 0.6 + glow) + vec3(line * 0.45), 1.0);
  v = a;
  if (uQ.y > 0.5) return vec4(rgb / max(a, 1e-3), a);
  return vec4(mix(uC0, rgb / max(a, 1e-3), a), 1.0);
}`;

// uP: angle (rad), stripes per unit, wobble amplitude, wobble frequency
const stripes = `
vec4 pattern(vec2 p, float t, out float v) {
  vec2 dir = vec2(cos(uP.x), sin(uP.x));
  vec2 perp = vec2(-dir.y, dir.x);
  float x = dot(p, dir) * uP.y + uP.z * sin(dot(p, perp) * uP.w + t * 0.8) - t * 0.5;
  v = tri(x);
  float w = gPx * (uP.y + uP.z * uP.w) * 1.2;
  return vec4(bands(x, 0.0, uN, w), 1.0);
}`;

const BODIES: Record<PatternName, string> = { spiral, swirl, waves, voronoi, perlin, dots, metaballs, rays, border, stripes };

export const fragmentFor = (name: PatternName) => HEAD + BODIES[name] + MAIN;

// Sensible per-pattern parameters, so a field reads well with no props.
export const DEFAULT_P: Record<PatternName, [number, number, number, number]> = {
  spiral: [1, 9, 0.5, 0],
  swirl: [2, 2.4, 0.12, 0],
  waves: [9, 5, 0.32, 0.3],
  voronoi: [4.2, 0.32, 0.06, 0],
  perlin: [2.4, 0, 0.9, 0.56],
  dots: [13, 0.26, 0.16, 0],
  metaballs: [1, 1, 0, 6],
  rays: [0, 0.62, 13, 1.2],
  border: [0.7, 0.36, 0.08, 0.008],
  stripes: [0.7, 5, 0.18, 2.4],
};
