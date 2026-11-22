// Scatter-and-assemble pieces for an explainer: the orbiting loader and title, a word landing on its spoken word, steps that rain into place, A vs B sorting, the signed quote, letter-stack bars, the source line and the beat meter.
import type { FC } from "react";
import { Easing, interpolate } from "remotion";
import { ramp, steps } from "../../core/time";
import { FPS, H, W } from "../../core/video";
import { CLAY, M, M2, TONE, useFontsReady, type Tone } from "./theme";
import { CENTRE, Glyph, Label, caps, display, layout, measure, mono, rnd, sans, useStage, type Cue, type Item, type Type } from "./glyphs";
import { EXPO, Swarm, half, orbitPose, type Exit, type FromFn, type OrbitSpec } from "./assemble";

const CL = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// A thin rule that draws from its left end.
const Rule: FC<{ x: number; y: number; w: number; p: number; color: string; h?: number; vertical?: boolean; o?: number }> = ({ x, y, w, p, color, h = 2, vertical, o = 1 }) =>
  p <= 0 ? null : (
    <div style={{ position: "absolute", left: x, top: y, width: vertical ? h : w * p, height: vertical ? w * p : h, background: color, opacity: o }} />
  );

// ---------- loader ----------
export const PercentCounter: FC<{ from: Cue; to: Cue; x?: number; y?: number; size?: number; tone?: Tone; hide?: Cue; ease?: (x: number) => number }> = ({ from, to, x = CENTRE.x, y = CENTRE.y, size = 40, tone = "sage", hide, ease = Easing.inOut(Easing.quad) }) => {
  const { t, cue } = useStage();
  const a = cue(from);
  const v = Math.round(interpolate(t, [a, cue(to)], [0, 100], { ...CL, easing: ease }));
  const o = ramp(t, a - 0.2, 0.3) * (hide === undefined ? 1 : 1 - ramp(t, cue(hide), 0.3));
  if (o <= 0) return null;
  return <Label text={`${v}%`} x={x} y={y - size * 0.62} ty={mono(size, 0)} color={TONE[tone].ink} o={o} align="center" />;
};

// N single letters on a spiral orbit around the centre: spawned from the middle 1 f apart, breathing, collapsing back in on `out`.
export const LetterRing: FC<{ text: string; spawn: Cue; out?: Cue; tone?: Tone; orbit?: OrbitSpec; ty?: Type }> = ({ text, spawn, out, tone = "sage", orbit = {}, ty = sans(34, 500, 0, true) }) => {
  useFontsReady();
  const { t, cue, pulse } = useStage();
  const s0 = cue(spawn);
  const chars = [...text.toUpperCase()].filter((c) => c !== " ");
  const o0 = out !== undefined ? cue(out) : undefined;
  return (
    <>
      {chars.map((ch, k) => {
        const it: Item = { ch, x: 0, y: 0, w: measure(ch, ty), ty, group: 0, line: 0 };
        let p = orbitPose(orbit, it, k, chars.length, t, s0 + k / FPS, pulse);
        if (o0 !== undefined && t > o0) {
          // Collapse back inward on the same spiral, 24 f quad-in.
          const e = interpolate(t, [o0 + k / 60, o0 + k / 60 + 24 / FPS], [0, 1], { ...CL, easing: Easing.in(Easing.quad) });
          const { hx, hy } = half(it);
          const cx = (orbit.cx ?? CENTRE.x) - hx;
          const cy = (orbit.cy ?? CENTRE.y) - hy;
          const ang = e * 1.6;
          const dx = (p.x - cx) * (1 - e);
          const dy = (p.y - cy) * (1 - e);
          p = { ...p, x: cx + dx * Math.cos(ang) - dy * Math.sin(ang), y: cy + dx * Math.sin(ang) + dy * Math.cos(ang), o: p.o * (1 - e) };
        }
        return <Glyph key={k} ch={ch} ty={ty} w={it.w} p={p} color={TONE[tone].ink} />;
      })}
    </>
  );
};

// ---------- title ----------
export type OrbitTitleProps = { title: string; sub?: string; kicker?: string; spawn: Cue; at: Cue; out?: Cue; exit?: Exit; tone?: Tone; size?: number; y?: number; counter?: boolean };

// The hook card: the title's own letters orbit a 0–100 % counter, then unwind from the ring into the headline, the subline a beat behind.
export const OrbitTitle: FC<OrbitTitleProps> = ({ title, sub, kicker, spawn, at, out, exit = "fall", tone = "sage", size = 150, y = 500, counter = true }) => {
  useFontsReady();
  const { cue } = useStage();
  const tk = TONE[tone];
  const T = layout(title, display(size), { x: W / 2, y, maxW: 1500, align: "center", anchor: "middle" });
  const S = sub ? layout(sub, sans(48, 500), { x: W / 2, y: T.box.y + T.box.h + 36, maxW: 1300, align: "center" }) : null;
  const N = T.items.length + (S?.items.length ?? 0);
  const s0 = cue(spawn);
  const a0 = cue(at);
  const spec: OrbitSpec = { r0: 140, r1: 430, turns: 1.4, size: 36 };
  const ring = (offset: number): FromFn => (it, k, _n, tt) => orbitPose(spec, it, k + offset, N, tt, s0 + (k + offset) / FPS);
  return (
    <>
      {counter && <PercentCounter from={s0 + 0.2} to={a0 - 1.0} hide={a0 - 0.95} tone={tone} />}
      {kicker && (
        <Swarm items={layout(kicker, mono(30, 0.16), { x: W / 2, y: T.box.y - 64, align: "center" }).items} at={a0 + 0.2} from="scatter" spread={110} hang={0.2} dur={0.6} stagger={0.6 / FPS} color={tk.sub} seed={31} out={out} exit={exit} />
      )}
      <Swarm items={T.items} from={ring(0)} at={a0} hang={99} dur={1.05} stagger={0.7 / FPS} order="random" seed={7} pivot={CENTRE} swirl={1.4} tone={tone} out={out} exit={exit} />
      {S && <Swarm items={S.items} from={ring(T.items.length)} at={a0 + 0.4} hang={99} dur={1.0} stagger={0.4 / FPS} order="random" seed={8} pivot={CENTRE} swirl={1.4} color={tk.sub} out={out} exit={exit} />}
    </>
  );
};

// ---------- key word ----------
export type WordLandProps = { word: string; at: Cue; pre?: string; preAt?: Cue; post?: string; postAt?: Cue; tone?: Tone; size?: number; y?: number; mark?: boolean; out?: Cue; exit?: Exit; spread?: number };

// A key word whose letters hang scattered across the frame, then snap together on the spoken word and pop; quiet support lines settle around it.
export const WordLand: FC<WordLandProps> = ({ word, at, pre, preAt, post, postAt, tone = "sage", size = 230, y = H / 2, mark, out, exit, spread = 620 }) => {
  useFontsReady();
  const { cue } = useStage();
  const tk = TONE[tone];
  const Wd = layout(word, display(size, 0.01), { x: W / 2, y, align: "center", anchor: "middle", maxW: W - 2 * M2 });
  const a0 = cue(at);
  const pre_ = pre ? layout(pre, sans(56, 500), { x: W / 2, y: Wd.box.y - 18, align: "center", anchor: "bottom" }) : null;
  const post_ = post ? layout(post, sans(52, 400), { x: W / 2, y: Wd.box.y + Wd.box.h + 24, align: "center" }) : null;
  return (
    <>
      {pre_ && <Swarm items={pre_.items} at={preAt ?? a0 - 0.5} from="scatter" spread={150} hang={0.25} dur={0.6} stagger={0.5 / FPS} color={tk.sub} seed={51} out={out} exit={exit} />}
      <Swarm items={Wd.items} at={a0} from="scatter" spread={spread} hang={0.7} dur={0.85} stagger={1.2 / FPS} order="random" seed={52} stress={[0]} stressColor={mark ? tk.mark : tk.ink} out={out} exit={exit} />
      {post_ && <Swarm items={post_.items} at={postAt ?? a0 + 0.6} from="scatter" spread={150} hang={0.25} dur={0.6} stagger={0.5 / FPS} color={tk.sub} seed={53} out={out} exit={exit} />}
    </>
  );
};

// ---------- steps ----------
export type ColumnStepsProps = { steps: string[]; at: Cue[]; heading?: string; x?: number; y?: number; gap?: number; size?: number; tone?: Tone; out?: Cue };

// A list whose steps rain down in letter columns and lock into rows; earlier steps dim to 35 % when the next one lands, a clay square marks the live row.
export const ColumnSteps: FC<ColumnStepsProps> = ({ steps: list, at, heading, x = 360, y = 300, gap = 132, size = 76, tone = "sage", out }) => {
  useFontsReady();
  const { t, cue } = useStage();
  const tk = TONE[tone];
  const times = at.map(cue);
  const tx = x + 150;
  const rowY = (i: number) => y + i * gap;
  const lh = size * 1.22;
  const markY = steps(t, times.map((c, i) => [i === 0 ? 0 : c - 0.15, rowY(i) + lh / 2 - 8] as [number, number]), 0.35);
  return (
    <>
      {heading && <Swarm items={layout(heading, mono(30, 0.16), { x, y: y - 96 }).items} at={times[0]! - 0.5} from="left" hang={0} dur={0.5} stagger={0.6 / FPS} color={tk.sub} seed={60} out={out} exit="fade" />}
      <div style={{ position: "absolute", left: x - 52, top: markY, width: 16, height: 16, background: tk.mark, opacity: ramp(t, times[0]! - 0.1, 0.3) * (out ? 1 - ramp(t, cue(out), 0.3) : 1) }} />
      {list.map((s, i) => {
        const L = layout(s, sans(size, 600, 0.0), { x: tx, y: rowY(i) });
        const N = layout(`(${String(i + 1).padStart(2, "0")})`, mono(34, 0), { x, y: rowY(i) + (lh - 34 * 1.25) / 2 + 4 });
        const focus = times[i + 1];
        return (
          <span key={i}>
            <Swarm items={N.items} at={times[i]! - 0.15} from="above" hang={0} dur={0.55} stagger={1 / FPS} seed={70 + i} color={tk.sub} focus={focus} out={out} exit="fall" />
            <Swarm items={L.items} at={times[i]!} from="above" order="columns" hang={0} dur={0.7} stagger={0.7 / FPS} seed={80 + i} trails tone={tone} focus={focus} out={out} exit="fall" />
          </span>
        );
      })}
    </>
  );
};

// ---------- A vs B ----------
export type SplitSortProps = { a: string; b: string; aSub?: string; bSub?: string; at: Cue; pick?: "a" | "b"; pickAt?: Cue; tone?: Tone; size?: number; out?: Cue };

// Both words start as one mixed cloud of letters; on the cue they sort themselves left and right, then the losing side slumps and dims.
export const SplitSort: FC<SplitSortProps> = ({ a, b, aSub, bSub, at, pick, pickAt, tone = "sage", size = 170, out }) => {
  useFontsReady();
  const { t, cue } = useStage();
  const tk = TONE[tone];
  const a0 = cue(at);
  const y = 500;
  const A = layout(a, display(size), { x: 520, y, align: "center", anchor: "middle", maxW: 760 });
  const B = layout(b, display(size), { x: 1400, y, align: "center", anchor: "middle", maxW: 760 });
  // One shared cloud: letters of both words drift together in an ellipse before they know which side they belong to.
  const cloud = (offset: number): FromFn => (it, k, _n, tt, appear) => {
    const kk = k + offset;
    const ang = rnd(`cl${kk}`) * Math.PI * 2;
    const rr = Math.sqrt(rnd(`cr${kk}`));
    const f = tt * FPS;
    const { hx, hy } = half(it);
    return {
      x: CENTRE.x + Math.cos(ang + f * 0.004) * rr * 430 - hx + 6 * Math.sin(f / 50 + kk),
      y: 480 + Math.sin(ang + f * 0.004) * rr * 200 - hy,
      r: (rnd(`cq${kk}`) - 0.5) * 160,
      s: 0.34 + 0.12 * rnd(`cs${kk}`),
      o: interpolate(tt - appear, [0, 0.3], [0, 1], CL) * (0.45 + 0.45 * rnd(`co${kk}`)),
    };
  };
  const pk = pickAt !== undefined ? cue(pickAt) : undefined;
  const loser = pick === "a" ? "b" : pick === "b" ? "a" : undefined;
  const side = (L: typeof A, which: "a" | "b", off: number, seed: number) => (
    <Swarm
      items={L.items}
      from={cloud(off)}
      at={a0}
      hang={0.9}
      dur={1.0}
      stagger={0.8 / FPS}
      order="random"
      seed={seed}
      pivot={{ x: CENTRE.x, y: 480 }}
      swirl={1.6}
      tone={tone}
      stress={pick === which ? L.words.map((_, i) => i) : []}
      focus={pick === which ? pk : undefined}
      out={loser === which ? pk : out}
      exit={loser === which ? "slump" : "fall"}
    />
  );
  const sub = (txt: string | undefined, cx: number, seed: number, L: typeof A, which: "a" | "b") =>
    txt ? (
      <Swarm
        items={layout(txt, sans(44, 500), { x: cx, y: L.box.y + L.box.h + 28, align: "center" }).items}
        at={a0 + 0.45}
        from="scatter"
        spread={90}
        hang={0.2}
        dur={0.5}
        stagger={0.5 / FPS}
        seed={seed}
        color={tk.sub}
        out={loser === which ? pk : out}
        exit={loser === which ? "slump" : "fall"}
      />
    ) : null;
  const win = pick === "a" ? A : pick === "b" ? B : null;
  const lineP = ramp(t, a0 + 0.1, 0.6, EXPO) * (out ? 1 - ramp(t, cue(out), 0.3) : 1);
  return (
    <>
      {/* The divider breaks around "VS" instead of sitting under a plate, so the ground stays flat. */}
      <Rule x={CENTRE.x - 1} y={330} w={130} p={lineP} color={tk.ink} vertical o={0.5} />
      <Rule x={CENTRE.x - 1} y={540} w={130} p={lineP} color={tk.ink} vertical o={0.5} />
      <Label text="VS" x={CENTRE.x} y={480} ty={mono(34, 0.1)} color={tk.ink} align="center" o={lineP} />
      {side(A, "a", 0, 91)}
      {side(B, "b", A.items.length, 92)}
      {sub(aSub, 520, 93, A, "a")}
      {sub(bSub, 1400, 94, B, "b")}
      {win && pk !== undefined && <Rule x={win.box.x} y={win.box.y + win.box.h + 6} w={win.box.w} p={ramp(t, pk + 0.1, 0.5, EXPO)} color={tk.mark} h={6} o={out ? 1 - ramp(t, cue(out), 0.3) : 1} />}
    </>
  );
};

// ---------- quote ----------
// A loose hand signature in one stroke, drawn in a 420 × 190 box.
const SIG =
  "M18 150 C 34 70, 66 24, 78 74 C 88 118, 92 168, 112 126 C 130 84, 150 40, 160 88 C 168 124, 150 160, 182 124 C 208 92, 226 70, 236 100 C 246 130, 258 132, 276 100 C 292 70, 316 58, 322 90 C 328 122, 300 150, 266 150 C 214 150, 128 166, 58 180 C 170 158, 300 146, 412 126";

export const SignatureStroke: FC<{ x: number; y: number; at: Cue; scale?: number; tone?: Tone; color?: string; d?: string }> = ({ x, y, at, scale = 1, tone = "sage", color, d = SIG }) => {
  const { t, cue } = useStage();
  // Board: 40 f, quad-out.
  const p = interpolate(t, [cue(at), cue(at) + 40 / FPS], [0, 1], { ...CL, easing: Easing.out(Easing.quad) });
  if (p <= 0) return null;
  return (
    <svg style={{ position: "absolute", left: x, top: y, overflow: "visible" }} width={420 * scale} height={190 * scale} viewBox="0 0 420 190">
      <path d={d} pathLength={1} fill="none" stroke={color ?? TONE[tone].ink} strokeWidth={3.6} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="1 1" strokeDashoffset={1 - p} />
    </svg>
  );
};

export type QuoteSignProps = { quote: string; who: string; at: Cue; signAt?: Cue; x?: number; y?: number; maxW?: number; tone?: Tone; label?: string; out?: Cue };

// The board's sign-off: small left-aligned caps whose letters drift in from scattered spots, then a signature writes itself beside them.
export const QuoteSign: FC<QuoteSignProps> = ({ quote, who, at, signAt, x = 300, y = 300, maxW = 1050, tone = "sage", label = "[ QUOTE ]", out }) => {
  useFontsReady();
  const { cue } = useStage();
  const tk = TONE[tone];
  const Q = layout(quote, caps(72, 500, 0.03), { x, y, maxW });
  const a0 = cue(at);
  const s0 = signAt !== undefined ? cue(signAt) : a0 + 0.3;
  const bottom = Q.box.y + Q.box.h;
  return (
    <>
      <Swarm items={layout(label, mono(30, 0.12), { x, y: y - 80 }).items} at={a0 - 1.2} from="left" hang={0} dur={0.5} stagger={0.6 / FPS} color={tk.sub} seed={100} out={out} exit="fade" />
      <Swarm items={Q.items} at={a0} from="scatter" spread={300} hang={0.45} dur={0.8} stagger={0.35 / FPS} order="random" seed={101} tone={tone} out={out} exit="fall" />
      <SignatureStroke x={x + Math.max(Q.box.w - 420, 640)} y={bottom + 4} at={s0} tone={tone} />
      <Swarm items={layout(`— ${who}`, mono(30, 0.08), { x, y: bottom + 96 }).items} at={s0 + 0.5} from="left" hang={0} dur={0.5} stagger={0.5 / FPS} color={tk.sub} seed={102} out={out} exit="fade" />
    </>
  );
};

// ---------- chart ----------
export type Bar = { label: string; value: number; letters?: string };
export type LetterBarsProps = { bars: Bar[]; at: Cue; gap?: number; max?: number; highlight?: number; title?: string; tone?: Tone; out?: Cue };

// A bar chart whose bars are stacks of letters falling into columns, bottom row first; the value counts up as the stack grows.
export const LetterBars: FC<LetterBarsProps> = ({ bars, at, gap = 0.35, max, highlight, title, tone = "sage", out }) => {
  useFontsReady();
  const { t, cue } = useStage();
  const tk = TONE[tone];
  const a0 = cue(at);
  const ty = mono(40, 0);
  const cell = { w: 42, h: 40 };
  const cols = 3;
  const maxRows = 13;
  const base = 800;
  const top = max ?? Math.max(...bars.map((b) => b.value));
  const span = 1240;
  const cx = (i: number) => CENTRE.x - span / 2 + (span / Math.max(1, bars.length - 1)) * i;
  const items: Item[] = [];
  const rowsOf = bars.map((b) => Math.max(1, Math.round((b.value / top) * maxRows)));
  bars.forEach((b, i) => {
    const src = (b.letters ?? b.label).toUpperCase().replace(/[^A-Z0-9]/g, "") || "A";
    for (let r = 0; r < rowsOf[i]!; r++)
      for (let c = 0; c < cols; c++) {
        const ch = src[(r * cols + c) % src.length]!;
        const w = measure(ch, ty);
        items.push({ ch, w, ty, group: i, line: r, x: cx(i) - (cols * cell.w) / 2 + c * cell.w + (cell.w - w) / 2, y: base - (r + 1) * cell.h - 2 });
      }
  });
  const lands = bars.map((_, i) => a0 + i * gap);
  const fill = (i: number) => rowsOf[i]! * cols;
  const st = (i: number) => Math.min(1.2 / FPS, 0.8 / fill(i));
  const fade = out ? 1 - ramp(t, cue(out), 0.3) : 1;
  const hi = highlight ?? -1;
  return (
    <>
      {title && <Label text={title} x={M2} y={170} ty={mono(30, 0.14)} color={tk.sub} o={ramp(t, a0 - 1.4, 0.4) * fade} />}
      <Rule x={CENTRE.x - span / 2 - 110} y={base + 6} w={span + 220} p={ramp(t, a0 - 1.3, 0.7, EXPO)} color={tk.ink} o={0.5 * fade} />
      {bars.map((_, i) => (
        <Swarm
          key={i}
          items={items.filter((it) => it.group === i)}
          at={lands[i]!}
          from="above"
          hang={0}
          dur={0.6}
          stagger={st(i)}
          seed={200 + i}
          trails
          color={i === hi ? tk.ink : tk.sub}
          out={out}
          exit="fall"
        />
      ))}
      {bars.map((b, i) => {
        const g = lands[i]!;
        const v = Math.round(interpolate(t, [g - 0.6 - (fill(i) - 1) * st(i), g], [0, b.value], { ...CL, easing: Easing.out(Easing.cubic) }));
        const o = ramp(t, g - 0.9, 0.3) * fade;
        const topY = base - rowsOf[i]! * cell.h - 2;
        const rise = interpolate(t, [g - 0.6 - (fill(i) - 1) * st(i), g], [base - 60, topY - 62], { ...CL, easing: Easing.out(Easing.cubic) });
        return (
          <span key={i}>
            <Label text={String(v)} x={cx(i)} y={rise} ty={mono(44, 0)} color={i === hi ? tk.mark : tk.ink} o={o} align="center" />
            <Label text={b.label} x={cx(i)} y={base + 26} ty={sans(38, i === hi ? 600 : 500)} color={i === hi ? tk.ink : tk.sub} o={ramp(t, a0 - 0.8 + i * 0.08, 0.4) * fade} align="center" />
          </span>
        );
      })}
    </>
  );
};

// ---------- source ----------
export type SourceLineProps = { source: string; detail?: string; at: Cue; out?: Cue; x?: number; y?: number; tone?: Tone; tag?: string };

// Lower third: letters slide in from the right and set like type, a hairline draws under them, one clay square marks the start.
export const SourceLine: FC<SourceLineProps> = ({ source, detail, at, out, x = M2, y = H - 250, tone = "sage", tag = "[ SOURCE ]" }) => {
  useFontsReady();
  const { t, cue } = useStage();
  const tk = TONE[tone];
  const a0 = cue(at);
  const S = layout(source, sans(46, 500), { x: x + 40, y: y + 46 });
  const D = detail ? layout(detail, mono(30, 0.04, false), { x: x + 40, y: y + 112 }) : null;
  const fade = out ? 1 - ramp(t, cue(out), 0.3) : 1;
  const w = Math.max(S.box.w, D?.box.w ?? 0) + 80;
  return (
    <>
      <div style={{ position: "absolute", left: x, top: y + 10, width: 14, height: 14, background: tk.mark, opacity: ramp(t, a0 - 0.7, 0.2) * fade }} />
      <Swarm items={layout(tag, mono(28, 0.14), { x: x + 40, y }).items} at={a0 - 0.5} from="right" hang={0} dur={0.45} stagger={0.5 / FPS} color={tk.sub} seed={300} out={out} exit="fade" />
      <Swarm items={S.items} at={a0} from="right" hang={0} dur={0.55} stagger={0.5 / FPS} seed={301} tone={tone} out={out} exit="fall" />
      {D && <Swarm items={D.items} at={a0 + 0.35} from="right" hang={0} dur={0.5} stagger={0.4 / FPS} seed={302} color={tk.sub} out={out} exit="fade" />}
      <Rule x={x} y={y + (D ? 166 : 112)} w={w} p={ramp(t, a0 - 0.2, 0.8, EXPO)} color={tk.ink} o={0.45 * fade} />
    </>
  );
};

// ---------- music ----------
// Bar and beat readout for music-only scenes: four squares tick on the beat, the downbeat in clay; read from the <Song> clock.
export const BeatMeter: FC<{ x?: number; y?: number; tone?: Tone; bpm?: boolean }> = ({ x = M2, y = H - M - 40, tone = "sage", bpm = true }) => {
  const { pos, pulse, spb } = useStage();
  const tk = TONE[tone];
  const bar = String(Math.max(1, pos.bar)).padStart(2, "0");
  return (
    <>
      <Label text={`BAR ${bar}`} x={x} y={y - 6} ty={mono(28, 0.12)} color={tk.sub} />
      {[1, 2, 3, 4].map((b) => {
        const on = pos.beatInBar === b && pos.beat >= 0;
        return <div key={b} style={{ position: "absolute", left: x + 160 + (b - 1) * 30, top: y + 2, width: 16, height: 16, border: `2px solid ${tk.sub}`, background: on ? (b === 1 ? CLAY : tk.ink) : "transparent", transform: `scale(${on ? 1 + 0.25 * pulse : 1})` }} />;
      })}
      {bpm && <Label text={`${Math.round(60 / spb)} BPM`} x={W - x} y={y - 6} ty={mono(28, 0.12)} color={tk.sub} align="right" />}
    </>
  );
};

