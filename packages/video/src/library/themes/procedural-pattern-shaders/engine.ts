// The pattern engine: one shared, lazily created WebGL context per page that renders any pattern into its drawing buffer for a 2D canvas to copy.
import { renderCpu } from "./cpu";
import { fragmentFor, VERTEX, type PatternName } from "./shaders";

export type Vec4 = [number, number, number, number];
export type Rect = { x: number; y: number; w: number; h: number };

export type DrawSpec = {
  pattern: PatternName;
  colors: string[];
  time: number;
  // Internal (shader) resolution in px; the caller upscales when copying.
  w: number;
  h: number;
  rect: Rect;
  origin: [number, number, number];
  cam: Vec4;
  scale: number;
  p: Vec4;
  q: Vec4;
  threshold: number;
  seed: number;
};

export type Rendered = { src: HTMLCanvasElement; sx: number; sy: number; sw: number; sh: number };

type Prog = { prog: WebGLProgram; loc: Record<string, WebGLUniformLocation | null> };
type GLState = { canvas: HTMLCanvasElement; gl: WebGLRenderingContext; progs: Map<PatternName, Prog | null> };

const UNIFORMS = ["uRes", "uRect", "uOrigin", "uCam", "uTime", "uScale", "uP", "uQ", "uC0", "uC1", "uC2", "uC3", "uC4", "uN", "uThresh", "uSeed"];

// One context for every pattern on the page: Chrome caps live WebGL contexts (~16), so a context per piece would
// start losing them as soon as a swatch grid mounts. undefined = not tried yet; null = WebGL unavailable here.
let state: GLState | null | undefined;

const compile = (gl: WebGLRenderingContext, type: number, src: string) => {
  const sh = gl.createShader(type)!;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    console.error("[pattern-shaders] compile failed", gl.getShaderInfoLog(sh));
    return null;
  }
  return sh;
};

const createState = (): GLState | null => {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = 960;
  canvas.height = 540;
  // preserveDrawingBuffer keeps the pixels readable by drawImage after the draw call returns.
  const gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: true, preserveDrawingBuffer: true, antialias: false, depth: false, stencil: false, powerPreference: "low-power" });
  if (!gl) return null;
  canvas.addEventListener("webglcontextlost", (e) => e.preventDefault());
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  // One oversized triangle covers the viewport with no diagonal seam.
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  return { canvas, gl, progs: new Map() };
};

const getState = () => {
  if (state === null) return null;
  // A lost context (GPU reset, tab eviction) is replaced with a fresh one rather than drawn into.
  if (!state || state.gl.isContextLost()) state = createState();
  return state;
};

const program = (s: GLState, name: PatternName) => {
  if (s.progs.has(name)) return s.progs.get(name)!;
  const { gl } = s;
  const vs = compile(gl, gl.VERTEX_SHADER, VERTEX);
  const fs = compile(gl, gl.FRAGMENT_SHADER, fragmentFor(name));
  let out: Prog | null = null;
  if (vs && fs) {
    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.bindAttribLocation(prog, 0, "aPos");
    gl.linkProgram(prog);
    if (gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      out = { prog, loc: Object.fromEntries(UNIFORMS.map((u) => [u, gl.getUniformLocation(prog, u)])) };
    } else console.error("[pattern-shaders] link failed", gl.getProgramInfoLog(prog));
  }
  s.progs.set(name, out);
  return out;
};

const rgbCache = new Map<string, [number, number, number]>();
export const rgb01 = (c: string): [number, number, number] => {
  let v = rgbCache.get(c);
  if (!v) {
    const m = c.match(/^rgba?\(([^)]+)\)/);
    if (m) {
      const [r, g, b] = m[1]!.split(",").map((x) => parseFloat(x));
      v = [r! / 255, g! / 255, b! / 255];
    } else {
      const h = c.replace("#", "");
      const n = parseInt(h.length === 3 ? h.replace(/./g, "$&$&") : h.slice(0, 6), 16);
      v = [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
    }
    rgbCache.set(c, v);
  }
  return v;
};

// Renders into the bottom-left w×h of the shared buffer and returns the source rect to copy.
// Without WebGL it runs the CPU port instead (same math), so a render never depends on the GL flags it was launched with.
export const renderPattern = (d: DrawSpec): Rendered | null => {
  const s = getState();
  const pr = s && program(s, d.pattern);
  if (!s || !pr) return renderCpu(d);
  const { gl, canvas } = s;
  // Grow-only buffer: resizing reallocates, so tiles of different sizes share one large-enough buffer via the viewport.
  if (canvas.width < d.w || canvas.height < d.h) {
    canvas.width = Math.max(canvas.width, d.w);
    canvas.height = Math.max(canvas.height, d.h);
  }
  gl.viewport(0, 0, d.w, d.h);
  gl.useProgram(pr.prog);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  const L = pr.loc;
  gl.uniform2f(L.uRes!, d.w, d.h);
  gl.uniform4f(L.uRect!, d.rect.x, d.rect.y, d.rect.w, d.rect.h);
  gl.uniform3f(L.uOrigin!, ...d.origin);
  gl.uniform4f(L.uCam!, ...d.cam);
  gl.uniform1f(L.uTime!, d.time);
  gl.uniform1f(L.uScale!, d.scale);
  gl.uniform4f(L.uP!, ...d.p);
  gl.uniform4f(L.uQ!, ...d.q);
  const cols = d.colors.length ? d.colors : ["#000000"];
  for (let i = 0; i < 5; i++) gl.uniform3f(L[`uC${i}`]!, ...rgb01(cols[Math.min(i, cols.length - 1)]!));
  gl.uniform1f(L.uN!, Math.min(5, cols.length));
  gl.uniform1f(L.uThresh!, d.threshold);
  gl.uniform1f(L.uSeed!, d.seed);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  return { src: canvas, sx: 0, sy: canvas.height - d.h, sw: d.w, sh: d.h };
};

// Last-resort safety net (no 2D canvas either): bold diagonal bands in the same palette, so a frame is never blank.
export const fallbackPattern = (ctx: CanvasRenderingContext2D, colors: string[], time: number, w: number, h: number) => {
  ctx.fillStyle = colors[0] ?? "#000";
  ctx.fillRect(0, 0, w, h);
  const inks = colors.length > 1 ? colors.slice(1) : colors;
  const step = h / 6;
  const shift = (time * step * 0.5) % (step * 2);
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.rotate(-0.6);
  for (let i = -24; i < 24; i++) {
    ctx.fillStyle = inks[((i % inks.length) + inks.length) % inks.length]!;
    ctx.fillRect(i * step * 2 + shift, -w, step, w * 2);
  }
  ctx.restore();
};
