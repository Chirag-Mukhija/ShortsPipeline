// Moments only this theme does: a sentence ring that gives up one word, a number built from hundreds of letters, letters riding a stroke from shape to shape, and the iris wipe that recolours the letters at its edge.
import type { FC, ReactNode } from "react";
import { AbsoluteFill, Easing, interpolate, spring } from "remotion";
import { ramp } from "../../core/time";
import { FPS, H, W } from "../../core/video";
import { DIM_OPACITY, TONE, useFontsReady, type Tone } from "./theme";
import { CENTRE, Glyph, alongPaths, circlePath, display, layout, measure, mono, rnd, sampleText, sans, travel, useStage, type Cue, type Item, type Pose, type Pt } from "./glyphs";
import { SNAP, Swarm, half } from "./assemble";
import { Field } from "./field";

const CL = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const wrap180 = (d: number) => ((((d + 180) % 360) + 360) % 360) - 180;

// ---------- the ring gives up a word ----------
export type RingFocusProps = { text: string; word: number; spawn: Cue; focus: Cue; size?: number; ringSize?: number; tone?: Tone; out?: Cue; mark?: boolean };

// A whole sentence orbits as a ring of letters; on the spoken word, that word's letters leave the ring, turn upright and line up big in the middle while the rest dim and keep turning.
export const RingFocus: FC<RingFocusProps> = ({ text, word, spawn, focus, size = 150, ringSize = 40, tone = "sage", out, mark }) => {
  useFontsReady();
  const { t, cue, pulse } = useStage();
  const tk = TONE[tone];
  const ty = sans(size, 600, 0.02, true);
  const L = layout(text, ty, { x: 0, y: 0 });
  const sc = ringSize / size;
  const gapW = measure("  ", ty);
  const total = L.box.w + gapW;
  const target = layout(L.words[word] ?? "", ty, { x: CENTRE.x, y: CENTRE.y, align: "center", anchor: "middle" });
  const r = Math.max(270, (total * sc * 1.1) / (Math.PI * 2), target.box.w / 2 + 110);
  const s0 = cue(spawn);
  const f0 = cue(focus);
  const o0 = out !== undefined ? cue(out) : undefined;
  const f = t * FPS;
  const spin = (f * 0.15 * Math.PI) / 180;
  const breath = 1 + 0.03 * (0.5 - 0.5 * Math.cos((f / 150) * Math.PI * 2)) + 0.03 * pulse;
  const dim = interpolate(t, [f0 - 0.2, f0 + 0.2], [1, DIM_OPACITY], CL);
  let w = 0;
  return (
    <>
      {L.items.map((it, k) => {
        const appear = s0 + k / FPS;
        if (t < appear) return null;
        const sp = interpolate(t - appear, [0, 1.5], [0, 1], { ...CL, easing: Easing.out(Easing.exp) });
        const th = ((it.x + it.w / 2) / total) * Math.PI * 2 - Math.PI / 2 + spin - (1 - sp) * Math.PI * 0.9;
        const { hx, hy } = half(it);
        const rr = r * breath * sp;
        const drift = 3 * Math.sin((f / (80 + 60 * rnd(`rf${k}`))) * Math.PI * 2 + k);
        const ringP: Pose = { x: CENTRE.x + Math.cos(th) * rr - hx, y: CENTRE.y + Math.sin(th) * rr - hy + drift, r: wrap180((th * 180) / Math.PI + 90), s: sc, o: interpolate(t - appear, [0, 8 / FPS], [0, 1], CL) };
        const pulled = it.group === word;
        let p = ringP;
        if (pulled) {
          const tt = target.items[w++];
          if (tt) {
            const e = interpolate(t, [f0 - 0.8 + (w - 1) / FPS, f0], [0, 1], { ...CL, easing: SNAP });
            p = travel(ringP, { x: tt.x, y: tt.y, r: 0, s: 1, o: 1 }, e, 0.7, CENTRE);
            if (t >= f0) {
              const k2 = spring({ frame: (t - f0) * FPS, fps: FPS, config: { stiffness: 200, damping: 14 } });
              p = { ...p, s: p.s * (1 + 0.25 * Math.sin(Math.PI * Math.min(1.25, k2))) };
            }
          }
        } else p = { ...p, o: p.o * dim };
        if (o0 !== undefined && t > o0) {
          const u = (t - o0 - k / 60) * FPS;
          if (u > 0) p = { ...p, y: p.y + 0.8 * u * u, o: p.o * Math.max(0, 1 - u / 24) };
        }
        return <Glyph key={k} ch={it.ch} ty={ty} w={it.w} p={p} color={pulled && mark ? tk.mark : tk.ink} />;
      })}
    </>
  );
};

// ---------- a number built from letters ----------
export type NumberGatherProps = { value: string; label?: string; at: Cue; labelAt?: Cue; letters?: string; size?: number; step?: number; y?: number; tone?: Tone; out?: Cue };

// The number's own shape filled with a few hundred small letters that fly in from everywhere and lock into a grid; the label assembles underneath.
export const NumberGather: FC<NumberGatherProps> = ({ value, label, at, labelAt, letters, size = 600, step = 21, y = 450, tone = "sage", out }) => {
  useFontsReady();
  const { cue } = useStage();
  const tk = TONE[tone];
  const a0 = cue(at);
  // Wider tracking than a headline so neighbouring digits keep a clear gutter of empty cells.
  const pts = sampleText(value, display(size, 0.07), CENTRE.x, y, step);
  const ty = sans(step + 3, 600, 0, true);
  const src = (letters ?? value).toUpperCase().replace(/[^A-Z0-9%]/g, "") || "0";
  const items: Item[] = pts.map((p, k) => {
    const ch = src[k % src.length]!;
    const w = measure(ch, ty);
    return { ch, w, ty, group: 0, line: 0, x: p.x - w / 2, y: p.y - ((ty.lh ?? 1.2) * ty.size) / 2 };
  });
  const bottom = pts.length ? Math.max(...pts.map((p) => p.y)) : y + size / 2;
  return (
    <>
      <Swarm
        items={items}
        at={a0}
        from="scatter"
        spread={760}
        hang={0.6}
        dur={1.0}
        stagger={Math.min(1 / FPS, 1.1 / Math.max(1, items.length))}
        order="random"
        seed={400}
        colorOf={(_, k) => (rnd(`ng${k}`) < 0.16 ? tk.sub : tk.ink)}
        out={out}
        exit="fall"
      />
      {label && (
        <Swarm items={layout(label, sans(50, 500), { x: CENTRE.x, y: bottom + 54, align: "center", maxW: 1400 }).items} at={labelAt ?? a0 + 0.5} from="scatter" spread={140} hang={0.25} dur={0.6} stagger={0.5 / FPS} seed={401} color={tk.sub} out={out} exit="fall" />
      )}
    </>
  );
};

// ---------- letters riding a stroke ----------
export const SHAPES = {
  circle: (cx: number, cy: number, r: number): Pt[][] => [circlePath(cx, cy, r)],
  arrow: (cx: number, cy: number, len: number): Pt[][] => {
    const tip = { x: cx + len / 2, y: cy };
    const h = len * 0.26;
    return [
      [{ x: cx - len / 2, y: cy }, tip],
      [{ x: tip.x - h * Math.cos(0.65), y: cy - h * Math.sin(0.65) }, tip, { x: tip.x - h * Math.cos(0.65), y: cy + h * Math.sin(0.65) }],
    ];
  },
  check: (cx: number, cy: number, s: number): Pt[][] => [[{ x: cx - s * 0.55, y: cy - s * 0.02 }, { x: cx - s * 0.15, y: cy + s * 0.38 }, { x: cx + s * 0.6, y: cy - s * 0.42 }]],
  square: (cx: number, cy: number, s: number): Pt[][] => [[{ x: cx - s / 2, y: cy - s / 2 }, { x: cx + s / 2, y: cy - s / 2 }, { x: cx + s / 2, y: cy + s / 2 }, { x: cx - s / 2, y: cy + s / 2 }, { x: cx - s / 2, y: cy - s / 2 }]],
};

export type ShapeStage = { at: Cue; paths: Pt[][]; label?: string };
export type ShapeMorphProps = { stages: ShapeStage[]; text?: string; n?: number; size?: number; tone?: Tone; out?: Cue; labelY?: number };

// Line art drawn with letters: they ride the stroke of a circle, then unwind into an arrow, a tick, any polyline, each on its cue.
export const ShapeMorph: FC<ShapeMorphProps> = ({ stages, text = "ASSEMBLE", n = 56, size = 36, tone = "sage", out, labelY = 860 }) => {
  useFontsReady();
  const { t, cue } = useStage();
  const tk = TONE[tone];
  const ty = sans(size, 600, 0, true);
  const src = text.toUpperCase().replace(/[^A-Z0-9]/g, "") || "A";
  const ats = stages.map((s) => cue(s.at));
  const targets = stages.map((s) => alongPaths(s.paths, n));
  const dur = 0.95;
  const o0 = out !== undefined ? cue(out) : undefined;
  const f = t * FPS;
  return (
    <>
      {Array.from({ length: n }, (_, k) => {
        const ch = src[k % src.length]!;
        const it: Item = { ch, w: measure(ch, ty), ty, group: 0, line: 0, x: 0, y: 0 };
        const { hx, hy } = half(it);
        const lag = (k / n) * 0.3;
        const appear = ats[0]! - dur - 0.7 - lag;
        if (t < appear) return null;
        const ang = rnd(`sm${k}`) * Math.PI * 2;
        const dist = 380 + 420 * rnd(`smd${k}`);
        let p: Pose = {
          x: CENTRE.x + Math.cos(ang) * dist * 1.3 - hx + 8 * Math.sin(f / 60 + k),
          y: CENTRE.y + Math.sin(ang) * dist * 0.55 - hy,
          r: (rnd(`smr${k}`) - 0.5) * 200,
          s: 0.6,
          o: interpolate(t - appear, [0, 0.3], [0, 0.6], CL),
        };
        targets.forEach((pts, s) => {
          const q = pts[k];
          if (!q) return;
          const start = ats[s]! - dur - lag * (s === 0 ? 1 : 0.5);
          const e = interpolate(t, [start, start + dur], [0, 1], { ...CL, easing: SNAP });
          if (e <= 0) return;
          const rest: Pose = { x: q.x - hx, y: q.y - hy, r: q.a ?? 0, s: 1, o: 1 };
          // Unwrap the rotation so a letter turns the short way round between strokes.
          const from = { ...p, r: rest.r + wrap180(p.r - rest.r) };
          p = travel(from, rest, e, 0.9 * (rnd(`sw${k}`) < 0.5 ? -1 : 1));
        });
        if (o0 !== undefined && t > o0) {
          const u = (t - o0 - k / 60) * FPS;
          if (u > 0) p = { ...p, y: p.y + 0.8 * u * u, o: p.o * Math.max(0, 1 - u / 24) };
        }
        return <Glyph key={k} ch={ch} ty={ty} w={it.w} p={p} color={tk.ink} />;
      })}
      {stages.map((s, i) =>
        s.label ? (
          <Swarm
            key={i}
            items={layout(s.label, mono(34, 0.16), { x: CENTRE.x, y: labelY, align: "center" }).items}
            at={ats[i]! + 0.15}
            from="scatter"
            spread={110}
            hang={0.15}
            dur={0.5}
            stagger={0.6 / FPS}
            seed={500 + i}
            color={tk.sub}
            out={ats[i + 1] !== undefined ? ats[i + 1]! - dur : out}
            exit="scatter"
          />
        ) : null,
      )}
    </>
  );
};

// ---------- iris wipe ----------
export type IrisWipeProps = { at: Cue; from?: Tone; to?: Tone; x?: number; y?: number; frames?: number; field?: boolean; children?: (tone: Tone) => ReactNode };

// Scene change: a circle grows from a point and recolours the ground (board: 24 f, expo in-out). Content is drawn once per tone, so letters change colour exactly at the circle's edge.
export const IrisWipe: FC<IrisWipeProps> = ({ at, from = "sage", to = "night", x = CENTRE.x, y = CENTRE.y, frames = 24, field = true, children }) => {
  const { t, cue } = useStage();
  const a = cue(at);
  const maxR = Math.hypot(Math.max(x, W - x), Math.max(y, H - y)) + 40;
  const r = interpolate(t, [a, a + frames / FPS], [0, maxR], { ...CL, easing: Easing.inOut(Easing.exp) });
  const edge = r > 0 && r < maxR ? 1 - ramp(t, a + (frames - 6) / FPS, 6 / FPS) : 0;
  return (
    <>
      <AbsoluteFill>
        {field && <Field tone={from} />}
        {children?.(from)}
      </AbsoluteFill>
      {r > 0 && (
        <AbsoluteFill style={{ clipPath: `circle(${r}px at ${x}px ${y}px)` }}>
          {field && <Field tone={to} />}
          {children?.(to)}
        </AbsoluteFill>
      )}
      {edge > 0 && (
        <svg style={{ position: "absolute", left: 0, top: 0 }} width={W} height={H}>
          <circle cx={x} cy={y} r={r + 6} fill="none" stroke={TONE[from].ink} strokeWidth={2} opacity={0.5 * edge} />
        </svg>
      )}
    </>
  );
};

