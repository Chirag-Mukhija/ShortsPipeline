// Hand-drawn geometry: seeded wobbly point sets (blobs, lines, ellipses, boxes, clouds, arrowheads) and the boil jitter applied to them.
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

export const smooth = (pts: P[]): string => {
  if (pts.length < 2) return "";
  const f = (n: number) => n.toFixed(1);
  let d = `M${f(pts[0]![0])},${f(pts[0]![1])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(i - 1, 0)]!;
    const p1 = pts[i]!;
    const p2 = pts[i + 1]!;
    const p3 = pts[Math.min(i + 2, pts.length - 1)]!;
    d += ` C${f(p1[0] + (p2[0] - p0[0]) / 6)},${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)},${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])},${f(p2[1])}`;
  }
  return d;
};

export const jitter = (pts: P[], boil: number, seed: number, amp: number): P[] => {
  const r = rng(seed * 31 + boil * 977 + 7);
  return pts.map(([x, y]) => [x + (r() - 0.5) * amp, y + (r() - 0.5) * amp]);
};

export const slicePts = (pts: P[], p: number): P[] => {
  if (p >= 1) return pts;
  const n = pts.length - 1;
  const f = Math.max(0, p) * n;
  const i = Math.floor(f);
  const u = f - i;
  const out = pts.slice(0, i + 1);
  const a = pts[i]!;
  const b = pts[Math.min(i + 1, n)]!;
  if (u > 0) out.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]);
  return out;
};

// A rounded, wobbly box drawn in one stroke that overshoots its start, like the blobs in the creator's sketch.
export const blobPts = (cx: number, cy: number, w: number, h: number, seed: number): P[] => {
  const r = rng(seed);
  const n = 30;
  const a0 = -2.4 + r() * 0.6;
  const span = Math.PI * 2 + 0.5;
  const ph1 = r() * 6;
  const ph2 = r() * 6;
  return Array.from({ length: n + 1 }, (_, i) => {
    const th = a0 + (span * i) / n;
    const c = Math.cos(th);
    const s = Math.sin(th);
    const ex = Math.sign(c) * Math.pow(Math.abs(c), 0.42);
    const ey = Math.sign(s) * Math.pow(Math.abs(s), 0.42);
    const wob = 1 + 0.035 * Math.sin(3 * th + ph1) + 0.025 * Math.sin(5 * th + ph2);
    const k = 1 + (i / n) * 0.05;
    return [cx + (ex * w * wob * k) / 2, cy + (ey * h * wob * k) / 2] as P;
  });
};

export const linePts = (x1: number, y1: number, x2: number, y2: number, seed: number, bow = 0.04, n = 8): P[] => {
  const r = rng(seed);
  const len = Math.hypot(x2 - x1, y2 - y1) || 1;
  const nx = -(y2 - y1) / len;
  const ny = (x2 - x1) / len;
  const b = (r() - 0.5) * 2 * bow * len;
  return Array.from({ length: n + 1 }, (_, i) => {
    const u = i / n;
    const o = Math.sin(Math.PI * u) * b;
    return [x1 + (x2 - x1) * u + nx * o, y1 + (y2 - y1) * u + ny * o] as P;
  });
};

export const ellPts = (cx: number, cy: number, rx: number, ry: number, seed: number, over = 0.4, n = 22): P[] => {
  const r = rng(seed);
  const a0 = r() * Math.PI * 2;
  const ph = r() * 6;
  return Array.from({ length: n + 1 }, (_, i) => {
    const th = a0 + ((Math.PI * 2 + over) * i) / n;
    const k = 1 + 0.04 * Math.sin(2 * th + ph) + 0.03 * (i / n);
    return [cx + Math.cos(th) * rx * k, cy + Math.sin(th) * ry * k] as P;
  });
};

export const arcPts = (cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, n = 16): P[] =>
  Array.from({ length: n + 1 }, (_, i) => {
    const th = a0 + ((a1 - a0) * i) / n;
    return [cx + Math.cos(th) * rx, cy + Math.sin(th) * ry] as P;
  });

export const curvePts = (x1: number, y1: number, cx: number, cy: number, x2: number, y2: number, n = 16): P[] =>
  Array.from({ length: n + 1 }, (_, i) => {
    const u = i / n;
    const v = 1 - u;
    return [v * v * x1 + 2 * v * u * cx + u * u * x2, v * v * y1 + 2 * v * u * cy + u * u * y2] as P;
  });

export const rectPts = (x: number, y: number, w: number, h: number, seed: number): P[] => {
  const r = rng(seed);
  const o = () => (r() - 0.5) * 5;
  const corners: P[] = [[x, y], [x + w, y], [x + w, y + h], [x, y + h], [x, y + 3], [x + w * 0.14, y - 2]];
  const pts: P[] = [];
  for (let i = 0; i < corners.length - 1; i++) {
    const a = corners[i]!;
    const b = corners[i + 1]!;
    for (let k = 0; k < 4; k++) {
      const u = k / 4;
      pts.push([a[0] + (b[0] - a[0]) * u + o(), a[1] + (b[1] - a[1]) * u + o()]);
    }
  }
  pts.push(corners[corners.length - 1]!);
  return pts;
};

export const cloudPts = (cx: number, cy: number, rx: number, ry: number, seed: number): P[] => {
  const r = rng(seed);
  const a0 = r() * 6;
  const n = 48;
  return Array.from({ length: n + 1 }, (_, i) => {
    const th = a0 + ((Math.PI * 2 + 0.3) * i) / n;
    const k = 1 + 0.14 * Math.abs(Math.sin(3.5 * th));
    return [cx + Math.cos(th) * rx * k, cy + Math.sin(th) * ry * k] as P;
  });
};

export const headFor = (pts: P[], atStart: boolean, size: number): P[][] => {
  if (pts.length < 2) return [];
  const a = atStart ? pts[0]! : pts[pts.length - 1]!;
  const b = atStart ? pts[Math.min(2, pts.length - 1)]! : pts[Math.max(pts.length - 3, 0)]!;
  const ang = Math.atan2(a[1] - b[1], a[0] - b[0]);
  const wing = (da: number): P[] => [[a[0] - Math.cos(ang + da) * size, a[1] - Math.sin(ang + da) * size], a];
  return [wing(0.5), wing(-0.5)];
};
