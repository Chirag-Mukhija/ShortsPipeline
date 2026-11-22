// Light machinery for spotlight noir: light shapes and the masks they make, the dark scene that shows its content only where light falls, afterglow trails, volumetric beams with dust, the film overlay and the darkroom background.
import { useId, type FC, type ReactNode } from "react";
import { AbsoluteFill, random } from "remotion";
import { FPS, H, W } from "../../core/video";
import { useTime } from "../../core/time";
import { CONE, DIM, LIT, NIGHT, flicker } from "./theme";

export type Pt = [number, number];
// soft: share of the radius that falls off (0 = hard disc, 1 = all falloff). i: intensity 0..1.
export type Spot = { kind: "spot"; x: number; y: number; r: number; ry?: number; rot?: number; soft?: number; i?: number };
export type Poly = { kind: "poly"; pts: Pt[]; blur?: number; i?: number };
export type Slit = { kind: "rect"; x: number; y: number; w: number; h: number; blur?: number; i?: number };
// Venetian-blind light: a skewed window of slats; open is the lit share of each slat period, mullion the window bar's x as a share of w.
export type Blinds = { kind: "blinds"; x: number; y: number; w: number; h: number; slats: number; open: number; skew?: number; rot?: number; blur?: number; i?: number; mullion?: number };
export type Light = Spot | Poly | Slit | Blinds;
// A glow layer lights content only (never the wall), at one level for the whole union of its shapes.
export type Glow = { level: number; lights: Light[] };

export const spot = (x: number, y: number, r: number, o: Partial<Omit<Spot, "kind">> = {}): Spot => ({ kind: "spot", x, y, r, ...o });

const useUid = () => `n${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
const softKey = (l: Spot) => Math.round((l.soft ?? 0.45) * 20);

// ---------- masks ----------
const Shape: FC<{ l: Light; uid: string }> = ({ l, uid }) => {
  const i = l.i ?? 1;
  if (i <= 0.001) return null;
  if (l.kind === "spot") {
    const ry = l.ry ?? l.r;
    return <ellipse cx={l.x} cy={l.y} rx={l.r} ry={ry} transform={l.rot ? `rotate(${l.rot} ${l.x} ${l.y})` : undefined} fill={`url(#${uid}-g${softKey(l)})`} opacity={i} />;
  }
  if (l.kind === "poly") return <polygon points={l.pts.map((p) => p.join(",")).join(" ")} fill="#fff" opacity={i} filter={`url(#${uid}-b${Math.round(l.blur ?? 14)})`} />;
  if (l.kind === "rect") return <rect x={l.x} y={l.y} width={l.w} height={l.h} fill="#fff" opacity={i} filter={`url(#${uid}-b${Math.round(l.blur ?? 10)})`} />;
  const p = l.h / l.slats;
  const band = p * Math.min(1, Math.max(0, l.open));
  const mx = l.w * (l.mullion ?? -1);
  return (
    <g opacity={i} filter={`url(#${uid}-b${Math.round(l.blur ?? 5)})`}>
      <g transform={`translate(${l.x} ${l.y}) rotate(${l.rot ?? 0}) skewX(${l.skew ?? 0})`}>
        {Array.from({ length: l.slats }, (_, s) => (
          <rect key={s} x={0} y={s * p + (p - band) / 2} width={l.w} height={band} fill="#fff" />
        ))}
        {mx > 0 && <rect x={mx - 11} y={-20} width={22} height={l.h + 40} fill="#000" />}
      </g>
    </g>
  );
};

const LightDefs: FC<{ uid: string; all: Light[] }> = ({ uid, all }) => {
  const softs = [...new Set(all.filter((l): l is Spot => l.kind === "spot").map(softKey))];
  const blurs = [...new Set(all.filter((l) => l.kind !== "spot").map((l) => Math.round((l as Poly).blur ?? (l.kind === "poly" ? 14 : l.kind === "rect" ? 10 : 5))))];
  return (
    <>
      {softs.map((k) => {
        const s = k / 20;
        return (
          <radialGradient key={`g${k}`} id={`${uid}-g${k}`}>
            <stop offset={0} stopColor="#fff" stopOpacity={1} />
            <stop offset={Math.max(0, 1 - s)} stopColor="#fff" stopOpacity={0.94} />
            <stop offset={Math.max(0, 1 - s * 0.55)} stopColor="#fff" stopOpacity={0.5} />
            <stop offset={Math.max(0, 1 - s * 0.2)} stopColor="#fff" stopOpacity={0.12} />
            <stop offset={1} stopColor="#fff" stopOpacity={0} />
          </radialGradient>
        );
      })}
      {blurs.map((b) => (
        <filter key={`b${b}`} id={`${uid}-b${b}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation={b} />
        </filter>
      ))}
    </>
  );
};

const Mask: FC<{ id: string; uid: string; lights: Light[]; glow?: Glow[] }> = ({ id, uid, lights, glow = [] }) => (
  <mask id={id} maskUnits="userSpaceOnUse" x={-W} y={-H} width={W * 3} height={H * 3}>
    {lights.map((l, k) => (
      <Shape key={k} l={l} uid={uid} />
    ))}
    {glow.map((g, k) =>
      g.level > 0 ? (
        <g key={`gl${k}`} opacity={g.level}>
          {g.lights.map((l, j) => (
            <Shape key={j} l={l} uid={uid} />
          ))}
        </g>
      ) : null,
    )}
  </mask>
);

// ---------- afterglow ----------
// Content keeps the light for `hold` s after the beam leaves, then falls to `rest` over `fall` s; latch keeps it lit for good.
export type BeamFn = (t: number) => { x: number; y: number; r: number } | null;
export const trail = (at: BeamFn, t: number, o: { from: number; hold?: number; fall?: number; rest?: number; latch?: boolean; level?: number; soft?: number }): Glow[] => {
  const { from, hold = 0.66, fall = 0.4, rest = 0, latch = false, level = 0.88, soft = 0.4 } = o;
  const f = Math.round(t * FPS);
  const f0 = Math.ceil(from * FPS);
  const fHold = Math.round((t - hold) * FPS);
  const fFall = Math.round((t - hold - fall) * FPS);
  const grab = (a: number, b: number) => {
    const out: Light[] = [];
    for (let k = Math.max(a, f0); k <= b; k += 2) {
      const p = at(k / FPS);
      if (p) out.push(spot(p.x, p.y, p.r, { soft }));
    }
    return out;
  };
  const glows: Glow[] = [{ level, lights: grab(fHold, f) }];
  if (latch) glows.push({ level, lights: grab(f0, fHold - 1) });
  else {
    if (rest > 0) glows.push({ level: rest, lights: grab(f0, fFall - 1) });
    const tiers = 4;
    for (let k = 0; k < tiers; k++) {
      const a = Math.round(fHold - ((k + 1) * (fHold - fFall)) / tiers);
      const b = Math.round(fHold - (k * (fHold - fFall)) / tiers) - 1;
      glows.push({ level: rest + (level - rest) * (1 - (k + 0.5) / tiers), lights: grab(a, b) });
    }
  }
  return glows;
};

// ---------- volumetric beam ----------
// from: where the light comes from (often off-frame); x, y, r: where it lands. Dust drifts inside the cone only.
export type BeamSpec = { from: Pt; x: number; y: number; r: number; w0?: number; i?: number; dust?: number; seed?: number };

export const Beam: FC<{ b: BeamSpec; uid: string; k: number }> = ({ b, uid, k }) => {
  const { t } = useTime();
  const i = b.i ?? 1;
  if (i <= 0.01) return null;
  const [sx, sy] = b.from;
  const dx = b.x - sx;
  const dy = b.y - sy;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const w0 = b.w0 ?? 24;
  const poly = (a: number, z: number) =>
    [
      [sx + nx * a, sy + ny * a],
      [b.x + nx * z, b.y + ny * z],
      [b.x - nx * z, b.y - ny * z],
      [sx - nx * a, sy - ny * a],
    ]
      .map((p) => p.join(","))
      .join(" ");
  const gid = `${uid}-beam${k}`;
  const seed = b.seed ?? k;
  const n = b.dust ?? 36;
  return (
    <g style={{ mixBlendMode: "screen" }}>
      <defs>
        <linearGradient id={gid} gradientUnits="userSpaceOnUse" x1={sx} y1={sy} x2={b.x} y2={b.y}>
          <stop offset={0} stopColor={CONE} stopOpacity={0.3 * i} />
          <stop offset={0.65} stopColor={CONE} stopOpacity={0.13 * i} />
          <stop offset={1} stopColor={CONE} stopOpacity={0.05 * i} />
        </linearGradient>
        <filter id={`${gid}-f`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation={18} />
        </filter>
      </defs>
      <polygon points={poly(w0, b.r)} fill={`url(#${gid})`} filter={`url(#${gid}-f)`} />
      <polygon points={poly(w0 * 0.45, b.r * 0.5)} fill={`url(#${gid})`} opacity={0.7} filter={`url(#${gid}-f)`} />
      {Array.from({ length: n }, (_, j) => {
        const r1 = random(`du${seed}-${j}a`);
        const r2 = random(`du${seed}-${j}b`);
        const r3 = random(`du${seed}-${j}c`);
        const ph = r3 * Math.PI * 2;
        const u = 0.1 + 0.88 * ((r1 + t * (0.008 + r3 * 0.014)) % 1);
        const v = Math.max(-1, Math.min(1, r2 * 2 - 1 + 0.14 * Math.sin(t * (0.4 + r1 * 0.6) + ph)));
        const hw = w0 + (b.r - w0) * u;
        const px = sx + dx * u + nx * v * hw * 0.92;
        const py = sy + dy * u + ny * v * hw * 0.92;
        const big = j % 9 === 0;
        const tw = 0.5 + 0.5 * Math.sin(t * (1.2 + r2 * 3.5) + ph);
        const op = i * (1 - v * v) * Math.min(1, (u - 0.1) * 6) * (big ? 0.12 : 0.25 + 0.6 * tw);
        return <circle key={j} cx={px} cy={py} r={big ? 6 + r1 * 5 : 0.9 + r2 * 2.1} fill={LIT} opacity={op} />;
      })}
    </g>
  );
};

// ---------- the dark scene ----------
export type DarkProps = {
  // Live lights this frame: they light the wall and the content.
  lights: Light[];
  // Afterglow: lights content only.
  glow?: Glow[];
  beams?: BeamSpec[];
  // How much the wall glows where light lands (the board's cone at ~18 %).
  wall?: number;
  // Opacity of the unlit copy of the content.
  dim?: number;
  // Camera transform for everything, e.g. a slow push-in.
  cam?: string;
  // Surfaces (desk, wall texture) that only exist where light falls; no unlit copy.
  floor?: ReactNode;
  // Hard shadows, drawn on the lit wall before the content.
  shadow?: ReactNode;
  // Content in its lit colours: an unlit copy everywhere, the full copy through the light.
  children?: ReactNode;
  // Marks on top that ignore the light (leader lines, labels, lamps).
  over?: ReactNode;
  film?: boolean;
};

export const Dark: FC<DarkProps> = ({ lights, glow = [], beams = [], wall = 0.2, dim = DIM, cam, floor, shadow, children, over, film = true }) => {
  const uid = useUid();
  const all = [...lights, ...glow.flatMap((g) => g.lights)];
  return (
    <>
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
        <defs>
          <LightDefs uid={uid} all={all} />
          <Mask id={`${uid}-w`} uid={uid} lights={lights} />
          <Mask id={`${uid}-c`} uid={uid} lights={lights} glow={glow} />
        </defs>
        <g transform={cam}>
          <rect x={-W} y={-H} width={W * 3} height={H * 3} fill={CONE} opacity={wall} mask={`url(#${uid}-w)`} />
          {floor && <g mask={`url(#${uid}-w)`}>{floor}</g>}
          {shadow}
          {children && <g opacity={dim}>{children}</g>}
          {children && <g mask={`url(#${uid}-c)`}>{children}</g>}
          {beams.map((b, k) => (
            <Beam key={k} b={b} uid={uid} k={k} />
          ))}
          {over}
        </g>
      </svg>
      {film && <Film />}
    </>
  );
};

// A slow push-in about the frame centre (the board's 4 %), as an SVG transform.
export const push = (s: number, cx = W / 2, cy = H / 2) => `translate(${cx} ${cy}) scale(${s}) translate(${-cx} ${-cy})`;

// ---------- film ----------
const GRAIN = `url("data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='256' height='256'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  1.7 0 0 0 -0.6'/></filter><rect width='256' height='256' filter='url(#n)'/></svg>`,
)}")`;

// Vignette plus grain that re-rolls every 2 frames (12 fps, like stock).
export const Film: FC<{ vignette?: number; grain?: number }> = ({ vignette = 0.7, grain = 0.035 }) => {
  const { f } = useTime();
  const k = Math.floor(f / 2);
  return (
    <>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 72% 68% at 50% 48%, transparent 45%, rgba(2,2,4,${vignette}) 100%)` }} />
      <AbsoluteFill style={{ backgroundImage: GRAIN, backgroundPosition: `${Math.floor(random(`gx${k}`) * 256)}px ${Math.floor(random(`gy${k}`) * 256)}px`, opacity: grain, mixBlendMode: "screen" }} />
    </>
  );
};

// ---------- background ----------
// The room with the lights off: near-black, a faint lamp haze high in the frame that hums and dips now and then, motes drifting through it.
export const Darkroom: FC = () => {
  const { t } = useTime();
  const fl = flicker(t, 3, 0.03);
  return (
    <AbsoluteFill style={{ backgroundColor: NIGHT }}>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 55% 60% at 50% 30%, rgba(255,243,209,${0.055 * fl}) 0%, rgba(255,243,209,${0.02 * fl}) 45%, transparent 78%)` }} />
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        {Array.from({ length: 34 }, (_, j) => {
          const r1 = random(`bg${j}a`);
          const r2 = random(`bg${j}b`);
          const x = ((r1 * W + t * (6 + r2 * 10)) % (W + 40)) - 20;
          const y = 120 + r2 * 640 + Math.sin(t * 0.5 + j) * 18;
          const near = Math.max(0, 1 - Math.hypot((x - W / 2) / 900, (y - 330) / 520));
          return <circle key={j} cx={x} cy={y} r={0.8 + r1 * 1.8} fill={LIT} opacity={(0.08 + 0.3 * near) * fl * (0.6 + 0.4 * Math.sin(t * 2 + j))} />;
        })}
      </svg>
      <Film grain={0.03} vignette={0.55} />
    </AbsoluteFill>
  );
};
