// Ma geometry: a seeded RNG, smooth sampled paths, the tapered brush outline with dry-brush streaks, pebble outlines and the ensō circle.
export type P = [number, number];

export const rng = (seed: number) => {
  let a = Math.imul(seed | 0, 2654435761) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let x = a;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
};

const f1 = (n: number) => n.toFixed(1);
const smoothstep = (a: number, b: number, x: number) => {
  const u = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return u * u * (3 - 2 * u);
};

// Catmull-Rom through the control points, sampled densely so the brush width can vary point by point.
export const sample = (ctrl: P[], n = 140, closed = false): P[] => {
  const pts = closed ? [...ctrl, ctrl[0]!] : ctrl;
  const segs = pts.length - 1;
  const at = (i: number) => (closed ? ctrl[((i % ctrl.length) + ctrl.length) % ctrl.length]! : pts[Math.min(Math.max(i, 0), pts.length - 1)]!);
  const out: P[] = [];
  for (let k = 0; k <= n; k++) {
    const g = (k / n) * segs;
    const i = Math.min(Math.floor(g), segs - 1);
    const u = g - i;
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
    const c = (a: number, b: number, c2: number, d: number) =>
      0.5 * (2 * b + (-a + c2) * u + (2 * a - 5 * b + 4 * c2 - d) * u * u + (-a + 3 * b - 3 * c2 + d) * u * u * u);
    out.push([c(p0[0], p1[0], p2[0], p3[0]), c(p0[1], p1[1], p2[1], p3[1])]);
  }
  return out;
};

export const lengths = (pts: P[]) => {
  const acc = [0];
  for (let i = 1; i < pts.length; i++) acc.push(acc[i - 1]! + Math.hypot(pts[i]![0] - pts[i - 1]![0], pts[i]![1] - pts[i - 1]![1]));
  return acc;
};

export const linePath = (pts: P[]) => pts.map((p, i) => `${i ? "L" : "M"}${f1(p[0])},${f1(p[1])}`).join(" ");

export const closedSmooth = (ctrl: P[]) => linePath(sample(ctrl, 90, true)) + " Z";

// A pebble: an ellipse nudged by a seed so no two stones match.
export const pebble = (cx: number, cy: number, rx: number, ry: number, seed: number, wob = 0.07): P[] => {
  const r = rng(seed);
  const n = 9;
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    const k = 1 + (r() - 0.5) * 2 * wob;
    // Stones sit flatter at the bottom.
    const flat = Math.sin(a) > 0 ? 0.88 : 1;
    return [cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k * flat] as P;
  });
};

// The ensō: one loaded stroke round a circle that never quite closes, its radius breathing with the hand.
export const ensoCtrl = (cx: number, cy: number, r: number, seed: number, start = 2.2, sweep = 5.75): P[] => {
  const rr = rng(seed);
  const n = 12;
  return Array.from({ length: n + 1 }, (_, i) => {
    const a = start + (i / n) * sweep;
    const k = 1 + (rr() - 0.5) * 0.035 - (i / n) * 0.03;
    return [cx + Math.cos(a) * r * k, cy + Math.sin(a) * r * k] as P;
  });
};

export type BrushShape = { body: string; streaks: { d: string; w: number; o: number; dash: string }[]; head: P | null };

// A loaded brush: width swells after the press, thins toward a dry tail, and the tail splits into paper-coloured streaks.
// `p` reveals the stroke along its length; the taper belongs to the whole stroke so the tail only thins when it is really reached.
export const brush = (ctrl: P[], width: number, p: number, seed: number, opts: { attack?: number; tail?: number; dry?: number } = {}): BrushShape => {
  const { attack = 0.06, tail = 0.35, dry = 0.55 } = opts;
  if (p <= 0) return { body: "", streaks: [], head: null };
  const pts = sample(ctrl, 160);
  const acc = lengths(pts);
  const L = acc[acc.length - 1]!;
  const r = rng(seed);
  const wob = Array.from({ length: 6 }, () => r() * Math.PI * 2);
  const wAt = (s: number) => {
    const press = smoothstep(0, attack, s) * 0.45 + 0.55;
    const lift = 1 - 0.9 * smoothstep(1 - tail, 1, s);
    const hand = 1 + 0.1 * Math.sin(s * 7 + wob[0]!) + 0.06 * Math.sin(s * 17 + wob[1]!);
    return (width / 2) * press * lift * hand;
  };
  const end = p * L;
  const left: P[] = [];
  const right: P[] = [];
  const kept: { pt: P; nx: number; ny: number; s: number; w: number }[] = [];
  for (let i = 0; i < pts.length; i++) {
    if (acc[i]! > end) break;
    const a = pts[Math.max(0, i - 1)]!;
    const b = pts[Math.min(pts.length - 1, i + 1)]!;
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const m = Math.hypot(dx, dy) || 1;
    const nx = -dy / m;
    const ny = dx / m;
    const s = acc[i]! / L;
    const w = wAt(s);
    const pt = pts[i]!;
    kept.push({ pt, nx, ny, s, w });
    left.push([pt[0] + nx * w, pt[1] + ny * w]);
    right.push([pt[0] - nx * w, pt[1] - ny * w]);
  }
  if (kept.length < 2) return { body: "", streaks: [], head: null };
  const last = kept[kept.length - 1]!;
  // A round leading edge while the brush is still moving.
  const cap: P[] = [];
  if (p < 1) {
    const ang = Math.atan2(last.ny, last.nx);
    for (let k = 1; k < 8; k++) {
      const a = ang - (k / 8) * Math.PI;
      cap.push([last.pt[0] + Math.cos(a) * last.w, last.pt[1] + Math.sin(a) * last.w]);
    }
  }
  // The press: a blunt, rounded start where the loaded brush first touches.
  const first = kept[0]!;
  const back: P[] = [];
  const ang0 = Math.atan2(first.ny, first.nx);
  for (let k = 1; k < 8; k++) {
    const a = ang0 + Math.PI - (k / 8) * Math.PI;
    back.push([first.pt[0] + Math.cos(a) * first.w, first.pt[1] + Math.sin(a) * first.w]);
  }
  const body = linePath([...left, ...cap, ...right.reverse(), ...back]) + " Z";
  // Dry-brush: thin lines of paper run along the tail at fixed offsets across the bristles.
  // They break up in seeded dashes, and the caller clips them to the body so no paper line runs past the ink.
  const streaks: { d: string; w: number; o: number; dash: string }[] = [];
  for (let k = 0; k < 14; k++) {
    const off = (r() - 0.5) * 1.7;
    const from = dry + r() * 0.3;
    const seg = kept.filter((q) => q.s >= from).map((q) => [q.pt[0] + q.nx * q.w * off, q.pt[1] + q.ny * q.w * off] as P);
    const dash = Array.from({ length: 6 }, () => `${Math.round(20 + r() * 120)} ${Math.round(4 + r() * 30)}`).join(" ");
    if (seg.length > 1) streaks.push({ d: linePath(seg), w: 0.8 + r() * 1.9, o: 0.5 + r() * 0.5, dash });
  }
  return { body, streaks, head: last.pt };
};
