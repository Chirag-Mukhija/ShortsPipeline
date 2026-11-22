// Flat vector geometry: seeded RNG, outline sampling for shape morphs (ray-cast unions and arc-length polygons), point lerp with start alignment, and 45° long-shadow hulls.
export type P = [number, number];

export const rng = (seed: number) => {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export const N_MORPH = 160;

export type Circle = { x: number; y: number; r: number };
export type Box = { x: number; y: number; w: number; h: number };

// Outline of a union of circles and boxes, sampled by angle from a centre the union is star-shaped around.
// Along each ray the boundary is the farthest exit point of any shape the ray passes through.
export const unionOutline = (cx: number, cy: number, circles: Circle[], boxes: Box[] = [], n = N_MORPH): P[] => {
  const out: P[] = [];
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
    const ux = Math.cos(a);
    const uy = Math.sin(a);
    let far = 0;
    for (const c of circles) {
      const ox = cx - c.x;
      const oy = cy - c.y;
      const b = ox * ux + oy * uy;
      const disc = b * b - (ox * ox + oy * oy - c.r * c.r);
      if (disc >= 0) far = Math.max(far, -b + Math.sqrt(disc));
    }
    for (const r of boxes) {
      let t0 = -Infinity;
      let t1 = Infinity;
      for (const [o, u, lo, hi] of [[cx, ux, r.x, r.x + r.w], [cy, uy, r.y, r.y + r.h]] as const) {
        if (Math.abs(u) < 1e-9) {
          if (o < lo || o > hi) t1 = -1;
        } else {
          const ta = (lo - o) / u;
          const tb = (hi - o) / u;
          t0 = Math.max(t0, Math.min(ta, tb));
          t1 = Math.min(t1, Math.max(ta, tb));
        }
      }
      if (t1 >= t0 && t1 > 0) far = Math.max(far, t1);
    }
    out.push([cx + ux * far, cy + uy * far]);
  }
  return out;
};

// Resample a closed polygon to n points evenly spaced along its perimeter.
export const resample = (pts: P[], n = N_MORPH): P[] => {
  const segs = pts.map((p, i) => {
    const q = pts[(i + 1) % pts.length]!;
    return Math.hypot(q[0] - p[0], q[1] - p[1]);
  });
  const total = segs.reduce((a, b) => a + b, 0);
  const out: P[] = [];
  let si = 0;
  let acc = 0;
  for (let k = 0; k < n; k++) {
    const d = (k / n) * total;
    while (acc + segs[si]! < d && si < segs.length - 1) acc += segs[si++]!;
    const p = pts[si]!;
    const q = pts[(si + 1) % pts.length]!;
    const f = segs[si]! > 0 ? (d - acc) / segs[si]! : 0;
    out.push([p[0] + (q[0] - p[0]) * f, p[1] + (q[1] - p[1]) * f]);
  }
  return out;
};

// Rotate b's starting index so its points pair with a's nearest neighbours; without this a morph twists.
export const align = (a: P[], b: P[]): P[] => {
  let best = 0;
  let bestD = Infinity;
  for (let o = 0; o < b.length; o++) {
    let d = 0;
    for (let i = 0; i < a.length; i += 4) {
      const q = b[(i + o) % b.length]!;
      d += (a[i]![0] - q[0]) ** 2 + (a[i]![1] - q[1]) ** 2;
    }
    if (d < bestD) {
      bestD = d;
      best = o;
    }
  }
  return b.map((_, i) => b[(i + best) % b.length]!);
};

export const lerpPts = (a: P[], b: P[], p: number): P[] => a.map((q, i) => [q[0] + (b[i]![0] - q[0]) * p, q[1] + (b[i]![1] - q[1]) * p]);
export const polyD = (pts: P[]) => `M${pts.map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join("L")}Z`;

// A rounded rectangle as a polygon (corners as short arcs), for outlines that must morph.
export const roundRect = (x: number, y: number, w: number, h: number, r: number, k = 8): P[] => {
  const out: P[] = [];
  const corners: [number, number, number][] = [
    [x + w - r, y + r, -Math.PI / 2],
    [x + w - r, y + h - r, 0],
    [x + r, y + h - r, Math.PI / 2],
    [x + r, y + r, Math.PI],
  ];
  for (const [cx, cy, a0] of corners) for (let i = 0; i <= k; i++) {
    const a = a0 + (i / k) * (Math.PI / 2);
    out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return out;
};

// Morphable icon outlines, centred on 0,0 and about 360 px across.
export const SHAPES = {
  cloud: () => unionOutline(0, 20, [{ x: -95, y: 30, r: 85 }, { x: 10, y: -30, r: 115 }, { x: 115, y: 35, r: 75 }], [{ x: -95, y: 30, w: 210, h: 85 }]),
  monitor: () => {
    // The stand is spliced into the screen's bottom edge (between the two bottom corners) so the outline stays one loop.
    const screen = roundRect(-180, -150, 360, 240, 26);
    const stand: P[] = [[40, 90], [52, 140], [95, 140], [95, 162], [-95, 162], [-95, 140], [-52, 140], [-40, 90]];
    return resample([...screen.slice(0, 18), ...stand, ...screen.slice(18)]);
  },
  bulb: () => unionOutline(0, -30, [{ x: 0, y: -40, r: 125 }], [{ x: -60, y: 40, w: 120, h: 130 }]),
  shield: () =>
    resample([
      [0, -170],
      [70, -140],
      [150, -128],
      [150, -20],
      [128, 60],
      [70, 130],
      [0, 170],
      [-70, 130],
      [-128, 60],
      [-150, -20],
      [-150, -128],
      [-70, -140],
    ]),
  globe: () => unionOutline(0, 0, [{ x: 0, y: 0, r: 160 }]),
} satisfies Record<string, () => P[]>;
export type ShapeName = keyof typeof SHAPES;

// The long diagonal shadow behind a circle or a box: the hull swept 45° down-right by len.
export const circleShadowD = (x: number, y: number, r: number, len: number) => {
  const k = Math.SQRT1_2;
  const nx = r * k;
  const ny = -r * k;
  const dx = len * k;
  return `M${x + nx} ${y + ny} L${x + nx + dx} ${y + ny + dx} L${x - nx + dx} ${y - ny + dx} L${x - nx} ${y - ny} Z`;
};
export const boxShadowD = (x: number, y: number, w: number, h: number, len: number) => {
  const d = len * Math.SQRT1_2;
  return `M${x + w} ${y} L${x + w + d} ${y + d} L${x + w + d} ${y + h + d} L${x + d} ${y + h + d} L${x} ${y + h} Z`;
};
