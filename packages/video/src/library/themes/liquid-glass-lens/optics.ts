// Glass optics maths: signed-distance shapes with smooth-min unions, plus the per-pixel displacement map and light overlay every lens is painted from.

// A rounded rect (a circle when r = w/2 = h/2), centred on x, y, in frame pixels.
export type Blob = { x: number; y: number; w: number; h: number; r?: number };
// k is the smooth-min radius in px: 0 keeps blobs separate, ~24 pulls a liquid bridge between them.
export type Shape = { blobs: Blob[]; k?: number };
export type Region = { x: number; y: number; w: number; h: number };

const sdBlob = (px: number, py: number, b: Blob) => {
  const r = Math.max(0, Math.min(b.r ?? Math.min(b.w, b.h) / 2, b.w / 2, b.h / 2));
  const qx = Math.abs(px - b.x) - b.w / 2 + r;
  const qy = Math.abs(py - b.y) - b.h / 2 + r;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
};

// Polynomial smooth-min (Inigo Quilez): the "liquid" in the glass, it lets two shapes melt into one surface.
const smin = (a: number, b: number, k: number) => {
  if (k <= 0) return Math.min(a, b);
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
};

export const sdf = (s: Shape) => {
  const k = s.k ?? 0;
  const blobs = s.blobs.filter((b) => b.w > 0.5 && b.h > 0.5);
  return (px: number, py: number) => {
    let d = 1e9;
    for (let i = 0; i < blobs.length; i++) {
      const v = sdBlob(px, py, blobs[i]!);
      d = i === 0 ? v : smin(d, v, k);
    }
    return d;
  };
};

export const bounds = (s: Shape, margin: number): Region => {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const b of s.blobs) {
    x0 = Math.min(x0, b.x - b.w / 2);
    y0 = Math.min(y0, b.y - b.h / 2);
    x1 = Math.max(x1, b.x + b.w / 2);
    y1 = Math.max(y1, b.y + b.h / 2);
  }
  const x = Math.floor(x0 - margin);
  const y = Math.floor(y0 - margin);
  return { x, y, w: Math.ceil(x1 + margin) - x, h: Math.ceil(y1 + margin) - y };
};

export const centre = (s: Shape) => {
  let ax = 0, ay = 0, aw = 0;
  for (const b of s.blobs) {
    const a = b.w * b.h;
    ax += b.x * a;
    ay += b.y * a;
    aw += a;
  }
  return aw > 0 ? { x: ax / aw, y: ay / aw } : { x: 0, y: 0 };
};

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

export type MapOpts = {
  // Width of the curved rim in px; the flat middle of a rim lens does not bend.
  bevel: number;
  // How far the lip bends the picture, in px, at the board's refraction (0.69).
  rimPx: number;
  // rim = a pill or panel that bends only at its edge; dome = a magnifier curved all the way across.
  mode: "rim" | "dome";
  // Dome only: magnification at the centre.
  zoom?: number;
  // Map resolution relative to the region (morphs use 0.5, the filter stretches it back).
  res?: number;
};

// The largest offset a map can hold, in px: the filter's displacement scale is twice this.
export const mapReach = (shape: Shape, o: MapOpts) => {
  if (o.mode !== "dome") return o.rimPx;
  const half = Math.max(...shape.blobs.map((b) => Math.max(b.w, b.h) / 2));
  return (1 - 1 / Math.max(1.01, o.zoom ?? 1.6)) * half * 1.25 + o.rimPx;
};

// Displacement map, painted from the shape's normals: R/G hold the sample offset (128 = none), A holds coverage,
// so one image both bends the plate and cuts the glass out of it. Positive rim offsets sample outward, so the lip
// squeezes the world just beyond the edge into a thin bright band, the liquid-glass signature.
export const paintMap = (shape: Shape, region: Region, o: MapOpts): string => {
  const res = o.res ?? 1;
  const W = Math.max(2, Math.round(region.w * res));
  const H = Math.max(2, Math.round(region.h * res));
  const cv = document.createElement("canvas");
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext("2d")!;
  const img = ctx.createImageData(W, H);
  const px = img.data;
  const f = sdf(shape);
  const c = centre(shape);
  const reach = Math.max(1, mapReach(shape, o));
  const mag = o.mode === "dome" ? 1 - 1 / Math.max(1.01, o.zoom ?? 1.6) : 0;
  const half = Math.max(1, Math.max(...shape.blobs.map((b) => Math.max(b.w, b.h) / 2)));
  const bev = Math.max(1, o.bevel);
  for (let j = 0; j < H; j++) {
    const y = region.y + (j + 0.5) / res;
    for (let i = 0; i < W; i++) {
      const x = region.x + (i + 0.5) / res;
      const d = f(x, y);
      const cov = clamp01(0.5 - d * res);
      if (cov <= 0) continue;
      let ox = 0, oy = 0;
      if (mag > 0) {
        // Sampling toward the centre magnifies; a little barrel toward the rim makes it read as a dome, not a zoom.
        const dx = x - c.x, dy = y - c.y;
        const rr = Math.min(1, Math.hypot(dx, dy) / half);
        const g = mag * (1 + 0.25 * rr * rr);
        ox = -dx * g;
        oy = -dy * g;
      }
      const s = -d;
      if (s < bev) {
        const e = 1 - s / bev;
        const gx = f(x + 1, y) - f(x - 1, y);
        const gy = f(x, y + 1) - f(x, y - 1);
        const gl = Math.hypot(gx, gy) || 1;
        // Squircle bevel: almost flat inside, steep at the lip, so the bend gathers in a thin band.
        const m = e * e * (0.35 + 0.65 * e) * o.rimPx;
        ox += (gx / gl) * m;
        oy += (gy / gl) * m;
      }
      const k = (j * W + i) * 4;
      px[k] = Math.round(128 + 127 * Math.max(-1, Math.min(1, ox / reach)));
      px[k + 1] = Math.round(128 + 127 * Math.max(-1, Math.min(1, oy / reach)));
      px[k + 2] = 128;
      px[k + 3] = Math.round(cov * 255);
    }
  }
  ctx.putImageData(img, 0, 0);
  return cv.toDataURL("image/png");
};

export type LightOpts = {
  bevel: number;
  // Direction the light comes from, in degrees (screen space, 0 = from the right, -135 = from the top left).
  angle: number;
  rimLit: number;
  rimFar: number;
  fresnel: number;
  // Glass body tint as r, g, b (0–255) and alpha.
  tint: [number, number, number, number];
  shadow: number;
  // A specular glint travelling clockwise round the rim: u 0..1 round the shape, s strength.
  glint?: { u: number; s: number };
  // Brightens the whole surface (a hover or a "lit" state).
  glow?: number;
};

// The light pass, drawn above the refracted plate: tint, fresnel brightening, the two-sided specular rim, a crisp lip,
// the travelling glint, and outside the glass a soft contact shadow plus the caustic the lens throws onto the plate.
export const paintLight = (ctx: CanvasRenderingContext2D, shape: Shape, region: Region, o: LightOpts) => {
  const W = region.w, H = region.h;
  const img = ctx.createImageData(W, H);
  const px = img.data;
  const f = sdf(shape);
  const c = centre(shape);
  const a = (o.angle * Math.PI) / 180;
  const lx = Math.cos(a), ly = Math.sin(a);
  const bev = Math.max(1, o.bevel);
  const [tr, tg, tb, ta] = o.tint;
  // Shadow falls away from the light and down; the caustic lands on the far side of the glass.
  const shx = -lx * 6, shy = 16 - ly * 4;
  const csx = -lx * 10, csy = -ly * 10;
  const sig = 22;
  const glow = o.glow ?? 0;
  const TAU = Math.PI * 2;
  for (let j = 0; j < H; j++) {
    const y = region.y + j + 0.5;
    for (let i = 0; i < W; i++) {
      const x = region.x + i + 0.5;
      const d = f(x, y);
      let wht = 0, blk = 0, tin = 0;
      if (d < 0.5) {
        const cov = clamp01(0.5 - d);
        const s = Math.max(0, -d);
        const e = Math.max(0, 1 - s / bev);
        tin = ta;
        wht = glow * 0.12;
        if (e > 0) {
          const gx = f(x + 1, y) - f(x - 1, y);
          const gy = f(x, y + 1) - f(x, y - 1);
          const gl = Math.hypot(gx, gy) || 1;
          const nx = gx / gl, ny = gy / gl;
          const nl = -(nx * lx + ny * ly);
          const lit = Math.max(0, nl), far = Math.max(0, -nl);
          const e2 = e * e, e4 = e2 * e2;
          wht += o.fresnel * 0.22 * e2 * e;
          wht += o.rimLit * lit * lit * lit * e4 * e;
          wht += o.rimFar * far * far * far * e4 * e;
          // The lip: a hairline where the glass surface turns, brighter on the lit side.
          const lip = Math.exp(-(s * s) / 2.2);
          wht += lip * (0.16 + 0.5 * lit + 0.22 * far);
          blk += 0.12 * far * e2 * (1 - e2);
          if (o.glint && o.glint.s > 0) {
            const ang = (Math.atan2(y - c.y, x - c.x) + TAU) % TAU;
            const g = o.glint.u * TAU - Math.PI / 2;
            let dd = Math.abs(ang - ((g + TAU * 4) % TAU));
            dd = Math.min(dd, TAU - dd);
            wht += o.glint.s * 0.9 * Math.exp(-(dd * dd) / 0.05) * e2 * e;
          }
        }
        const sum = wht + tin + blk;
        if (sum > 0) {
          const k = (j * W + i) * 4;
          const al = Math.min(1, sum);
          px[k] = (255 * wht + tr * tin) / sum;
          px[k + 1] = (255 * wht + tg * tin) / sum;
          px[k + 2] = (255 * wht + tb * tin) / sum;
          px[k + 3] = Math.round(al * cov * 255);
        }
        if (cov >= 1) continue;
      }
      if (d > sig * 3 + 20) continue;
      const ds = f(x - shx, y - shy);
      const sh = o.shadow * Math.exp(-Math.max(0, ds) / sig) * clamp01(d);
      const dc = f(x - csx, y - csy);
      const cs = 0.2 * Math.exp(-((dc + 3) * (dc + 3)) / 18) * clamp01(d / 2);
      const k = (j * W + i) * 4;
      const tot = sh + cs;
      if (tot <= 0.002) continue;
      const prev = px[k + 3]! / 255;
      const al = Math.min(1, tot + prev);
      const v = (255 * cs) / tot;
      px[k] = v;
      px[k + 1] = Math.min(255, v * 1.02);
      px[k + 2] = v * 0.9;
      px[k + 3] = Math.round(al * 255);
    }
  }
  ctx.putImageData(img, 0, 0);
};
