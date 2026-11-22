// The swarm engine: letters appear at an origin (scatter, orbit, rain, centre), hang, travel a closing spiral to their rest places on cue, pop when stressed, dim on focus and leave by falling, collapsing or scattering.
import type { FC } from "react";
import { Easing, interpolate, spring } from "remotion";
import { clamp01 } from "../../core/time";
import { FPS, H, W } from "../../core/video";
import { DIM_OPACITY, TONE, useFontsReady, type Tone } from "./theme";
import { CENTRE, Glyph, layout, lerp, pose, rnd, sgn, travel, useStage, type Cue, type Item, type LayoutOpts, type Pose, type Type } from "./glyphs";

// The board's "snap into place": slow to leave the hang, fast through the middle, a soft last few frames.
export const SNAP = Easing.bezier(0.62, 0, 0.12, 1);
export const EXPO = Easing.out(Easing.exp);
const CL = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// The centre of a letter's line box, from its top-left rest place.
export const half = (it: Item) => ({ hx: it.w / 2, hy: ((it.ty.lh ?? 1.2) * it.ty.size) / 2 });

// ---------- origins ----------
export type FromFn = (it: Item, k: number, n: number, t: number, appear: number) => Pose;
export type FromKind = "scatter" | "centre" | "above" | "below" | "left" | "right" | "orbit";

export type OrbitSpec = { cx?: number; cy?: number; r0?: number; r1?: number; turns?: number; omega?: number; size?: number; spawn?: number; tangent?: boolean; seed?: number; breath?: number };

// Letters spawn at the centre, spiral out to their slot on a 1–1.5 turn spiral and orbit (board: 45 f expo-out spawn, 0.15°/f, radius breathes 1.00 → 1.03 over 150 f).
export const orbitPose = (o: OrbitSpec, it: Item, k: number, n: number, t: number, appear: number, pulse = 0): Pose => {
  const { cx = CENTRE.x, cy = CENTRE.y, r0 = 170, r1 = 420, turns = 1.25, omega = 0.15, size = 34, spawn = 1.5, tangent = true, seed = 1 } = o;
  const u = n <= 1 ? 0 : k / (n - 1);
  const f = t * FPS;
  const sp = interpolate(t - appear, [0, spawn], [0, 1], { ...CL, easing: EXPO });
  const breath = 1 + (o.breath ?? 0.03) * (0.5 - 0.5 * Math.cos((f / 150) * Math.PI * 2)) + 0.025 * pulse;
  const a = u * turns * Math.PI * 2 + rnd(`orb${seed}`) * 6.283 + (f * omega * Math.PI) / 180 - (1 - sp) * Math.PI * 0.9;
  const r = (r0 + (r1 - r0) * u) * breath * sp;
  const { hx, hy } = half(it);
  const drift = 3 * Math.sin((f / (80 + 60 * rnd(`od${k}`))) * Math.PI * 2 + k);
  const op = interpolate(t - appear, [0, 8 / FPS], [0, 1], CL) * (0.98 - 0.42 * u);
  return {
    x: cx + Math.cos(a) * r - hx + drift,
    y: cy + Math.sin(a) * r - hy + drift * 0.6,
    r: tangent ? (a * 180) / Math.PI + 90 : 0,
    s: size / it.ty.size,
    o: op,
  };
};

const fromPose = (kind: FromKind, it: Item, k: number, n: number, t: number, appear: number, seed: number, spread: number, orbit: OrbitSpec, pulse: number): Pose => {
  const key = `${seed}-${k}`;
  const { hx, hy } = half(it);
  const f = t * FPS;
  const fade = interpolate(t - appear, [0, 10 / FPS], [0, 1], CL);
  switch (kind) {
    case "orbit":
      return orbitPose(orbit, it, k, n, t, appear, pulse);
    case "centre": {
      const c = { x: orbit.cx ?? CENTRE.x, y: orbit.cy ?? CENTRE.y };
      return pose(c.x - hx, c.y - hy, sgn(`cr${key}`) * 140, 0.25, fade * 0.8);
    }
    case "above":
    case "below": {
      const dir = kind === "above" ? -1 : 1;
      const lift = 260 + rnd(`ab${key}`) * 620;
      return pose(it.x, dir < 0 ? -hy * 2 - lift + it.y * 0.15 : H + lift, 0, 1, fade);
    }
    case "left":
    case "right": {
      const d = (kind === "left" ? -1 : 1) * (140 + rnd(`lr${key}`) * 320);
      return pose(it.x + d, it.y + (rnd(`ly${key}`) - 0.5) * 40, 0, 1, 0);
    }
    case "scatter":
    default: {
      // Seeded spot in a ring around the rest place, kept inside the frame, drifting slowly while it hangs.
      const ang = rnd(`sa${key}`) * Math.PI * 2;
      const dist = spread * (0.35 + 0.65 * Math.sqrt(rnd(`sd${key}`)));
      const x = Math.min(W - 70, Math.max(40, it.x + hx + Math.cos(ang) * dist * 1.35)) - hx;
      const y = Math.min(H - 70, Math.max(30, it.y + hy + Math.sin(ang) * dist * 0.8)) - hy;
      const dx = 8 * Math.sin(f / (70 + 50 * rnd(`sx${key}`)) + k);
      const dy = 8 * Math.cos(f / (90 + 40 * rnd(`sy${key}`)) + k * 1.3);
      const depth = 0.32 + 0.45 * rnd(`so${key}`);
      // Hanging letters read as small type (26–70 px) whatever their final size, like the board's scatter.
      const s = Math.min(1.15, (26 + 44 * rnd(`ss${key}`)) / it.ty.size);
      return pose(x + dx, y + dy, (rnd(`sr${key}`) - 0.5) * 220, s, fade * depth);
    }
  }
};

// ---------- the swarm ----------
// slump: the letters lose their hold (drop, tilt, dim to 35 %) but stay, for the losing side of a comparison.
export type Exit = "fall" | "collapse" | "scatter" | "fade" | "slump";
export type Order = "reading" | "random" | "centre" | "columns";

export type SwarmProps = {
  items: Item[];
  // When the text is fully in place (the spoken word, or the beat). Letters land in the `stagger` before it.
  at: Cue;
  // Narration word times: word g is in place at groupAt[g]. Overrides `at` per word.
  groupAt?: Cue[];
  // Music: word g lands `perBeat` beats after word g-1 (word 0 lands at `at`).
  perBeat?: number;
  from?: FromKind | FromFn;
  seed?: number;
  spread?: number;
  orbit?: OrbitSpec;
  dur?: number;
  stagger?: number;
  order?: Order;
  hang?: number;
  swirl?: number;
  // Spiral pivot; by default each letter spirals about its own rest place.
  pivot?: { x: number; y: number };
  tone?: Tone;
  color?: string;
  colorOf?: (it: Item, k: number) => string | undefined;
  stress?: number[];
  stressColor?: string;
  focus?: Cue;
  out?: Cue;
  exit?: Exit;
  trails?: boolean;
};

export const Swarm: FC<SwarmProps> = (p) => {
  const { t, cue, spb, pulse, energy } = useStage();
  const {
    items, at, groupAt, perBeat, from = "scatter", seed = 1, spread = 420, orbit = {}, dur = 0.9, stagger = 1 / FPS, order = "reading",
    hang = 0.5, swirl = 1.1, pivot, tone = "sage", stress = [], focus, out, exit = "fall", trails,
  } = p;
  const tk = TONE[tone];
  const n = items.length;
  const grouped = !!groupAt || perBeat !== undefined;
  const at0 = cue(at);
  const groupLand = (g: number) => (groupAt?.[g] !== undefined ? cue(groupAt[g]!) : perBeat !== undefined ? at0 + g * perBeat * spb : at0);

  // Rank inside each group (or the whole text) so the last letter of the group lands exactly on its cue.
  const keyOf = (it: Item, k: number) =>
    order === "random" ? rnd(`rk${seed}-${k}`) : order === "centre" ? Math.abs(k - (n - 1) / 2) : order === "columns" ? it.x + rnd(`col${seed}-${k}`) * 260 : k;
  const groups = new Map<number, number[]>();
  items.forEach((it, k) => {
    const g = grouped ? it.group : 0;
    groups.set(g, [...(groups.get(g) ?? []), k]);
  });
  const rank = new Array<number>(n).fill(0);
  const size = new Array<number>(n).fill(1);
  for (const ks of groups.values()) {
    const sorted = [...ks].sort((a, b) => keyOf(items[a]!, a) - keyOf(items[b]!, b));
    sorted.forEach((k, r) => {
      rank[k] = r;
      size[k] = ks.length;
    });
  }
  const focusT = focus !== undefined ? cue(focus) : undefined;
  const dimK = focusT !== undefined ? interpolate(t, [focusT, focusT + 0.35], [0, 1], { ...CL, easing: Easing.inOut(Easing.cubic) }) : 0;
  const outT = out !== undefined ? cue(out) : undefined;

  return (
    <>
      {items.map((it, k) => {
        const land = (grouped ? groupLand(it.group) : at0) - (size[k]! - 1 - rank[k]!) * stagger;
        const start = land - dur;
        const appear = start - hang;
        if (t < appear) return null;
        const rest = pose(it.x, it.y, it.r ?? 0, it.s ?? 1, 1);
        const src = typeof from === "function" ? from(it, k, n, t, appear) : fromPose(from, it, k, n, t, appear, seed, spread, orbit, pulse);
        const e = interpolate(t, [start, land], [0, 1], { ...CL, easing: from === "above" || from === "below" ? Easing.bezier(0.45, 0, 0.2, 1) : SNAP });
        const sw = from === "above" || from === "below" || from === "left" || from === "right" ? 0 : swirl * sgn(`sw${seed}-${k}`) * (0.6 + 0.4 * rnd(`sm${seed}-${k}`));
        let ps = e >= 1 ? rest : travel(src, rest, e, sw, pivot);

        const stressed = stress.includes(it.group);
        // Emphasis: spring 1 → 1.25 → 1 (stiffness 200, damping 14) on focus, or on landing when there is no focus cue.
        const popAt = focusT ?? land;
        if (stressed && t >= popAt) {
          const sp = spring({ frame: (t - popAt) * FPS, fps: FPS, config: { stiffness: 200, damping: 14 } });
          ps = { ...ps, s: ps.s * (1 + 0.25 * Math.sin(Math.PI * Math.min(1.25, sp))) * (1 + 0.04 * pulse * (0.5 + energy)) };
        }
        if (!stressed && dimK > 0) ps = { ...ps, o: ps.o * lerp(1, DIM_OPACITY, dimK) };

        if (outT !== undefined && t >= outT) {
          const x0 = outT + rank[k]! / 60;
          const u = Math.max(0, (t - x0) * FPS);
          if (exit === "fall") {
            ps = { ...ps, y: ps.y + 0.8 * u * u, r: ps.r + sgn(`fr${seed}-${k}`) * u * (0.6 + rnd(`fv${seed}-${k}`)), o: ps.o * (1 - clamp01(u / 24)) };
          } else if (exit === "slump") {
            const ex = interpolate(u, [0, 22], [0, 1], { ...CL, easing: Easing.out(Easing.back(1.8)) });
            ps = { ...ps, y: ps.y + ex * (18 + 34 * rnd(`sl${seed}-${k}`)), r: ps.r + ex * sgn(`sg${seed}-${k}`) * (3 + 13 * rnd(`sv${seed}-${k}`)), o: ps.o * lerp(1, DIM_OPACITY, clamp01(ex)) };
          } else if (exit === "fade") {
            ps = { ...ps, o: ps.o * (1 - clamp01(u / 10)) };
          } else {
            const ex = interpolate(u, [0, exit === "collapse" ? 24 : 18], [0, 1], { ...CL, easing: Easing.in(Easing.quad) });
            const target = exit === "collapse" ? fromPose("centre", it, k, n, t, -99, seed, spread, orbit, 0) : fromPose("scatter", it, k, n, t, -99, seed, spread, orbit, 0);
            ps = travel(target, ps, 1 - ex, swirl * sgn(`sw${seed}-${k}`), exit === "collapse" ? { x: orbit.cx ?? CENTRE.x, y: orbit.cy ?? CENTRE.y } : undefined);
            ps = { ...ps, o: ps.o * (1 - clamp01((ex - 0.6) / 0.4)) };
          }
        }

        const col = (stressed ? p.stressColor : undefined) ?? p.colorOf?.(it, k) ?? p.color ?? tk.ink;
        const moving = e > 0.02 && e < 0.98;
        return (
          <span key={k}>
            {trails && moving &&
              [1, 2, 3].map((j) => {
                // Rain trails: ghost copies stacked behind a falling letter, the board's vertical letter columns.
                const back = travel(src, rest, Math.max(0, e - j * 0.09), 0);
                return <Glyph key={j} ch={it.ch} ty={it.ty} w={it.w} p={{ ...back, o: back.o * (0.32 - j * 0.09) }} color={col} />;
              })}
            <Glyph ch={it.ch} ty={it.ty} w={it.w} p={ps} color={col} />
          </span>
        );
      })}
    </>
  );
};

// ---------- text that assembles ----------
export type AssembleProps = Omit<SwarmProps, "items"> & { text: string; ty: Type } & LayoutOpts;

// The workhorse: lay a line or paragraph out, then let its letters assemble from `from` and land on `at` (or per word on groupAt / perBeat).
export const Assemble: FC<AssembleProps> = ({ text, ty, x, y, maxW, align, anchor, ...rest }) => {
  useFontsReady();
  const lay = layout(text, ty, { x, y, maxW, align, anchor });
  return <Swarm items={lay.items} {...rest} />;
};
