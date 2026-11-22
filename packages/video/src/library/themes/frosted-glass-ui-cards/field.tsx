// The colour field every glass card refracts: a deep indigo base, soft blobs on slow Lissajous drifts, grain and vignette; plus Orb (a soft local glow) and Sphere (a crisp lit ball) to set behind cards.
import type { FC } from "react";
import { AbsoluteFill, interpolateColors } from "remotion";
import { W, H } from "../../core/video";
import { ramp, useTime } from "../../core/time";
import { FIELDS, rgba, type Field } from "./theme";

const grain = (alpha: number) =>
  `url("data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 ${alpha} 0'/></filter><rect width='220' height='220' filter='url(#n)'/></svg>`,
  )}")`;
export const GRAIN = grain(0.55);
// The frost texture on a pane: finer and fainter than the field's grain.
export const FROST = grain(0.22);

// Blob anchors as fractions of the frame: big warm mass low right, violet top left, cool accents at the edges, so the centre stays calm for text.
const SLOTS = [
  { x: 0.8, y: 0.82, r: 640, a: 0.95 },
  { x: 0.16, y: 0.16, r: 600, a: 0.85 },
  { x: 0.1, y: 0.92, r: 520, a: 0.8 },
  { x: 0.6, y: 0.04, r: 460, a: 0.7 },
  { x: 0.95, y: 0.3, r: 320, a: 0.75 },
];

const mixField = (fields: Field[], mix: number) => {
  const i = Math.max(0, Math.min(fields.length - 1, Math.floor(mix)));
  const j = Math.min(fields.length - 1, i + 1);
  const u = Math.max(0, Math.min(1, mix - i));
  const a = fields[i]!;
  const b = fields[j]!;
  const c = (x: string, y: string) => interpolateColors(u, [0, 1], [x, y]);
  return { base: [c(a.base[0], b.base[0]), c(a.base[1], b.base[1])], blobs: a.blobs.map((x, k) => c(x, b.blobs[k] ?? x)) };
};

export type ColourFieldProps = {
  // One field, or several plus a fractional `mix` index to recolour between them.
  fields?: Field[];
  mix?: number;
  // Shifts every blob's drift phase so two scenes never share a pose.
  seed?: number;
  // 0..1 darkens the whole field, for a modal's backdrop dim.
  dim?: number;
  // 0..1 extra brightness on the blobs, e.g. on a beat.
  energy?: number;
};

export const ColourField: FC<ColourFieldProps> = ({ fields = [FIELDS.dusk!], mix = 0, seed = 0, dim = 0, energy = 0 }) => {
  const { f } = useTime();
  const pal = mixField(fields, mix);
  return (
    <AbsoluteFill style={{ background: `linear-gradient(155deg, ${pal.base[0]} 0%, ${pal.base[0]} 30%, ${pal.base[1]} 100%)`, overflow: "hidden" }}>
      {SLOTS.map((s, i) => {
        // Lissajous drift on the board's 240-frame loop; y runs on a different ratio so the path never retraces.
        const ph = seed * 1.7 + i * 1.3;
        const w = (Math.PI * 2) / 240;
        const x = s.x * W + Math.sin(f * w + ph) * (110 + i * 18);
        const y = s.y * H + Math.sin(f * w * 0.75 + ph * 1.9) * (80 + i * 12);
        const r = s.r * (1 + 0.06 * Math.sin(f * w * 0.5 + i));
        const col = pal.blobs[i % pal.blobs.length]!;
        const a = Math.min(1, s.a * (1 + energy * 0.35));
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x - r,
              top: y - r,
              width: r * 2,
              height: r * 2,
              borderRadius: "50%",
              background: `radial-gradient(circle at 50% 50%, ${withA(col, a)} 0%, ${withA(col, a * 0.5)} 32%, ${withA(col, 0)} 68%)`,
            }}
          />
        );
      })}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 60% 40% at 50% -6%, rgba(255,255,255,0.10), transparent 70%)" }} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 85% 80% at 50% 50%, transparent 55%, rgba(10,5,32,0.5) 100%)" }} />
      <AbsoluteFill style={{ backgroundImage: GRAIN, opacity: 0.07, mixBlendMode: "overlay" }} />
      {dim > 0 && <AbsoluteFill style={{ background: `rgba(12,6,36,${0.45 * dim})` }} />}
    </AbsoluteFill>
  );
};

// interpolateColors returns rgba(); hex goes through rgba(). Both end up as a CSS colour with alpha a.
const withA = (c: string, a: number) => {
  if (c.startsWith("#")) return rgba(c, a);
  const m = c.match(/[\d.]+/g);
  return m ? `rgba(${m[0]},${m[1]},${m[2]},${a})` : c;
};

export type OrbProps = { x: number; y: number; r?: number; color: string; at?: number; a?: number; seed?: number };

// A local colour field behind one card: it is what makes the glass read as glass, so put it half under a card's edge, not under its text.
export const Orb: FC<OrbProps> = ({ x, y, r = 260, color, at = 0, a = 0.9, seed = 0 }) => {
  const { t, f } = useTime();
  const e = ramp(t, at, 0.9);
  const dx = Math.sin(f / 70 + seed) * 18;
  const dy = Math.cos(f / 90 + seed * 2) * 14;
  const rr = r * (0.7 + 0.3 * e);
  return (
    <div
      style={{
        position: "absolute",
        left: x - rr + dx,
        top: y - rr + dy,
        width: rr * 2,
        height: rr * 2,
        borderRadius: "50%",
        opacity: e,
        background: `radial-gradient(circle, ${withA(color, a)} 0%, ${withA(color, a * 0.55)} 35%, ${withA(color, 0)} 70%)`,
      }}
    />
  );
};

// Two-tone sphere fills: a lit face and a shadow side, so the ball reads as an object, not a blob.
export const SPHERE: Record<string, [string, string, string]> = {
  coral: ["#FFD3B8", "#FF7A59", "#C2366B"],
  violet: ["#E2C6FF", "#9B5CFF", "#3A1E9C"],
  cyan: ["#E9FDFF", "#6FE3FF", "#2A5BD8"],
  rose: ["#FFD1E6", "#FF5FA2", "#8C2A9C"],
  mint: ["#E6FFF4", "#5FE8B7", "#1E7A8C"],
};

export type SphereProps = { x: number; y: number; r: number; tone?: keyof typeof SPHERE; at?: number; seed?: number; drift?: number };

// A crisp gradient sphere behind the glass. Its hard edge is what turns soft through a pane, so the frost is visible at a glance.
export const Sphere: FC<SphereProps> = ({ x, y, r, tone = "coral", at = -1, seed = 0, drift = 1 }) => {
  const { t, f } = useTime();
  const e = at < 0 ? 1 : ramp(t, at, 0.8);
  if (e <= 0) return null;
  const [hi, mid, lo] = SPHERE[tone]!;
  const dx = Math.sin(f / 90 + seed) * 22 * drift;
  const dy = Math.cos(f / 120 + seed * 1.7) * 18 * drift;
  const rr = r * (0.6 + 0.4 * e);
  return (
    <div
      style={{
        position: "absolute",
        left: x - rr + dx,
        top: y - rr + dy,
        width: rr * 2,
        height: rr * 2,
        borderRadius: "50%",
        opacity: e,
        background: `radial-gradient(circle at 32% 28%, ${hi} 0%, ${mid} 42%, ${lo} 100%)`,
        boxShadow: `0 0 ${rr * 0.6}px ${rgba(mid, 0.45)}`,
      }}
    />
  );
};

// The default stage: dusk field with two spheres parked at the edges, where card corners will overlap them.
export const Backdrop: FC = () => (
  <AbsoluteFill>
    <ColourField />
    <Sphere x={1690} y={150} r={100} tone="cyan" seed={1} />
    <Sphere x={210} y={930} r={150} tone="violet" seed={2} />
  </AbsoluteFill>
);
