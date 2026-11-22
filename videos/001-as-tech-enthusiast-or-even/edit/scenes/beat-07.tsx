// Video 001, Beat 7 (6:11–7:24): three rules on a notebook checklist page; the "do it" vs "explain first" recordings and the high-scorer bar, the chat folding shut and the no-AI calendar, then the shiny idea parked on a string while the pencil goes back to the main link.
import type { FC, ReactNode } from "react";
import { AbsoluteFill, Easing, OffthreadVideo, Sequence, getStaticFiles, interpolate, interpolateColors, staticFile, useVideoConfig } from "remotion";
import { Camera, INOUT, Layer, POP, clamp01, ramp, seg, useTime, type Rect, type Shot } from "@library/core";
import {
  At, Bulb, GRAIN, Hand, PlayBtn, Robot, Sk, arcPts, blobPts, curvePts, ellPts, linePts, rectPts, rng, slicePts, wr, type P,
} from "@library/themes/hand-drawn";
import { STYLE } from "./style";

// Colours and fonts come from the video's shared style, never hardcoded, so a whole-video change reaches this beat.
const { accent: ACCENT, dot: DOT, ink: INK, paper: PAPER, pencil: PENCIL, sans: SANS } = STYLE;

const START = 371.33;
const END = 444.19;
// One page: rule three's corner (left), the checklist (middle), the split screen and the bar (right), memory and the calendar (below).
const WORLD = { w: 9000, h: 3400 };

// Caveat's average advance per character (measured against earlier beats' underlines); Hand's own clip guesses wider.
const CW = 0.37;
const handEst = (text: string, size: number) => text.length * size * 0.5 + 30;
// Write-on progress that reveals `frac` of the actual written text (anchor start).
const toP = (text: string, size: number, frac: number) => (frac >= 1 ? 1 : clamp01((14 + frac * text.length * size * CW) / handEst(text, size)));
const along = (t: number, keys: [number, number][]) =>
  interpolate(t, keys.map((k) => k[0]), keys.map((k) => k[1]), { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
// Where the pen is while a start-anchored Hand writes on with progress p.
const penAt = (text: string, x: number, y: number, size: number, p: number): P => [Math.min(x - 14 + handEst(text, size) * p, x + text.length * size * CW), y - size * 0.12];
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
// A polyline with in-between points, so the stroke's smoothing keeps sharp corners instead of looping round them.
const dense = (pts: P[], n = 4): P[] => [
  ...pts.slice(1).flatMap((b, i) => {
    const a = pts[i]!;
    return Array.from({ length: n }, (_, k) => [a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n] as P);
  }),
  pts[pts.length - 1]!,
];
// A wavy line of "handwriting" with no real words, for code or notes written by hand.
const scrawl = (x0: number, y: number, x1: number, seed: number): P[] => {
  const r = rng(seed);
  const n = Math.max(8, Math.round((x1 - x0) / 8));
  const ph = r() * 6;
  return Array.from({ length: n + 1 }, (_, i) => {
    const u = i / n;
    return [x0 + (x1 - x0) * u + Math.sin(i * 1.9 + ph) * 4, y + Math.sin(i * 1.15 + ph) * 9 * (0.55 + 0.45 * Math.sin(i * 0.37 + ph))] as P;
  });
};
const tipOf = (pts: P[], p: number): P => {
  const s = slicePts(pts, Math.max(0.001, p));
  return s[s.length - 1]!;
};

// ---------- new piece: Pencil, the creator's pencil, tip at (x, y), leaning right; it writes, then leaves ----------
const Pencil: FC<{ x: number; y: number; r?: number; o?: number; s?: number }> = ({ x, y, r = 32, o = 1, s = 1 }) => {
  if (o <= 0) return null;
  const body: P[] = [[-24, -62], [-24, -292], [24, -292], [24, -62]];
  return (
    <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`} opacity={o}>
      <rect x={-24 + 12} y={-340 + 10} width={48} height={280} fill={INK} opacity={0.06} />
      <polygon points="0,0 -24,-62 -24,-326 24,-326 24,-62" fill={PAPER} />
      <rect x={-24} y={-326} width={48} height={34} fill={PENCIL} opacity={0.3} />
      <Sk pts={dense([[-24, -62], ...body.slice(1), [24, -62]], 4)} w={4.5} color={INK} seed={7001} amp={1} />
      <Sk pts={dense([[-24, -62], [0, 0], [24, -62]], 3)} w={4.5} color={INK} seed={7002} amp={0.8} ghost={false} />
      <polygon points="0,0 -8,-20 8,-20" fill={INK} />
      <Sk pts={linePts(0, -70, 0, -284, 7003, 0.01, 6)} w={2.4} color={PENCIL} seed={7003} ghost={false} />
      {[-292, -306].map((yy, k) => (
        <Sk key={k} pts={linePts(-24, yy, 24, yy, 7004 + k, 0.02, 3)} w={3.4} color={INK} seed={7004 + k} ghost={false} />
      ))}
      <Sk pts={dense([[-24, -306], [-24, -334], [-14, -344], [14, -344], [24, -334], [24, -306]], 2)} w={4.5} color={INK} seed={7006} amp={0.8} ghost={false} />
    </g>
  );
};

// ---------- region A: the checklist page (rules one to three) ----------
const PG = { x: 3420, y: 330, w: 1700, h: 1470 };
const ROWS = [760, 1180, 1600];
const NUM_X = 3612;
const BOX_X = 3680;
const TXT_X = 3842;
const RULE_SIZE = 72;
const LINES = Array.from({ length: 12 }, (_, k) => 572 + k * 105);
const RULE1 = "Ask AI to explain, not just do";
const RULE2 = "Try it again without AI";
const RULE3 = "A shiny new idea";
const BOX3 = { x: BOX_X + 55, y: ROWS[2]! - 25 };
const BULB_C = { x: 2250, y: 1250 };
const BULB_WHIP = 419.82;

const CheckBox: FC<{ row: number; at: number; tick?: number; num: string; ring: number; seed: number }> = ({ row, at, tick, num, ring, seed }) => {
  const { t } = useTime();
  const y = ROWS[row]!;
  return (
    <g>
      <Hand x={NUM_X} y={y} text={num} size={84} color={INK} p={ramp(t, at, 0.25)} />
      <Sk pts={ellPts(NUM_X, y - 28, 40, 50, seed + 9, 0.5, 24)} p={ramp(t, ring, 0.35, INOUT)} w={4} color={INK} seed={seed + 9} />
      <Sk pts={rectPts(BOX_X, y - 80, 110, 110, seed)} p={ramp(t, at + 0.05, 0.35)} w={4.8} color={INK} seed={seed} />
      {tick !== undefined && <Sk pts={[[BOX_X + 16, y - 32], [BOX_X + 48, y + 6], [BOX_X + 112, y - 108]]} p={ramp(t, tick, 0.28)} w={8} color={INK} seed={seed + 3} amp={1.4} />}
    </g>
  );
};

// New piece: Sparkle, a four-point twinkle that marks something as shiny.
const Sparkle: FC<{ x: number; y: number; s: number; seed: number }> = ({ x, y, s, seed }) =>
  s <= 0.02 ? null : (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <Sk pts={[[0, -26], [5, -5], [26, 0], [5, 5], [0, 26], [-5, 5], [-26, 0], [-5, -5], [0, -26]]} w={3.6} color={INK} seed={seed} amp={0.8} ghost={false} />
    </g>
  );

const ChecklistPage: FC = () => {
  const { t } = useTime();
  const L = PG.x;
  const T = PG.y;
  return (
    <g>
      <rect x={L + 16} y={T + 20} width={PG.w} height={PG.h} fill={INK} opacity={0.06} />
      <rect x={L} y={T} width={PG.w} height={PG.h} fill={PAPER} />
      {LINES.map((y, k) => (
        <Sk key={k} pts={linePts(L + 30, y, L + PG.w - 30, y, 7100 + k, 0.002, 12)} w={2} color={DOT} seed={7100 + k} ghost={false} amp={0.8} />
      ))}
      <Sk pts={linePts(L + 150, T + 10, L + 150, T + PG.h - 10, 7120, 0.002, 12)} w={2.6} color={PENCIL} seed={7120} ghost={false} amp={0.8} />
      <Sk pts={rectPts(L, T, PG.w, PG.h, 7121)} w={4.2} color={INK} seed={7121} />
      {/* the heading */}
      <Hand x={3600} y={480} text="3 rules" size={120} anchor="start" color={INK} p={wr(t, 372.5, "3 rules")} />
      <Sk pts={curvePts(3592, 506, 3760, 494, 3922, 508, 12)} p={ramp(t, 373.05, 0.4, INOUT)} w={5} color={INK} seed={7122} ghost={false} />
      <Hand x={4070} y={474} text="not guaranteed" size={72} anchor="start" color={PENCIL} rotate={-3} p={wr(t, 375.08, "not guaranteed")} />
      <CheckBox row={0} at={373.35} tick={378.2} num="1" ring={376.12} seed={7130} />
      <CheckBox row={1} at={373.6} tick={400.62} num="2" ring={397.92} seed={7140} />
      <CheckBox row={2} at={373.85} num="3" ring={415.15} seed={7150} />
      {/* rule one, written along the voice; "explain" gets the video's coral underline */}
      <Hand x={TXT_X} y={ROWS[0]!} text={RULE1} size={RULE_SIZE} anchor="start" color={INK} p={toP(RULE1, RULE_SIZE, along(t, [[376.62, 0], [377.3, 0.33], [377.72, 0.63], [378.42, 1]]))} />
      <Sk pts={curvePts(4100, 784, 4196, 774, 4296, 786, 10)} p={ramp(t, 377.8, 0.4, INOUT)} w={6.5} color={ACCENT} seed={7160} ghost={false} />
      {/* rule two */}
      <Hand x={TXT_X} y={ROWS[1]!} text={RULE2} size={RULE_SIZE} anchor="start" color={INK} p={toP(RULE2, RULE_SIZE, along(t, [[399.55, 0], [400.12, 0.56], [400.62, 1]]))} />
      <Sk pts={curvePts(4180, 1204, 4320, 1194, 4458, 1206, 10)} p={ramp(t, 400.75, 0.4, INOUT)} w={6.5} color={ACCENT} seed={7161} ghost={false} />
      {/* rule three: the idea itself */}
      <Hand x={TXT_X} y={ROWS[2]!} text={RULE3} size={RULE_SIZE} anchor="start" color={INK} p={toP(RULE3, RULE_SIZE, along(t, [[417.2, 0], [417.62, 0.5], [418.1, 1]]))} />
    </g>
  );
};

// The bulb: pops out of box three, rides the whip over to the left corner, sparkles beside the play button, then hops into the parking note.
const BULB_HOP = 425.4;
const ShinyBulb: FC = () => {
  const { t } = useTime();
  if (t < 417.72 || t >= BULB_HOP + 0.36) return null;
  const pop = ramp(t, 417.72, 0.4, Easing.out(Easing.back(2.6)));
  const fly = ramp(t, BULB_WHIP, 0.34, INOUT);
  const hop = ramp(t, BULB_HOP, 0.36, Easing.in(Easing.quad));
  const dest = noteToWorld(t, BULB_IN_NOTE[0], BULB_IN_NOTE[1]);
  let x = lerp(BOX3.x, BULB_C.x, fly) ;
  let y = lerp(BOX3.y, BULB_C.y, fly) - Math.sin(Math.PI * fly) * 160;
  let s = lerp(1.7, 1.45, fly) * pop;
  if (hop > 0) {
    x = lerp(x, dest[0], hop);
    y = lerp(y, dest[1], hop) - Math.sin(Math.PI * hop) * 90;
    s = lerp(s, 0.85 * dest[2], hop);
  }
  const shine = 1 - ramp(t, BULB_HOP - 0.1, 0.2);
  const tw = (k: number) => shine * pop * (0.55 + 0.45 * Math.sin(t * 6.5 + k * 2.1));
  return (
    <g>
      <At x={x} y={y} s={s} r={-6 * Math.sin(Math.PI * fly)}>
        <circle cx={0} cy={-12} r={58} fill={ACCENT} opacity={0.1 * shine} />
        <Bulb p={ramp(t, 417.72, 0.55)} />
      </At>
      <Sparkle x={x - 92 * s} y={y - 70 * s} s={0.9 * tw(0)} seed={7171} />
      <Sparkle x={x + 96 * s} y={y - 92 * s} s={0.7 * tw(1)} seed={7172} />
      <Sparkle x={x + 84 * s} y={y + 24 * s} s={0.55 * tw(2)} seed={7173} />
    </g>
  );
};

// ---------- region B: the split screen (fs-02) and the high-scorer bar ----------
const MON = { x: 6750, y: 850, w: 2100, h: 700 };
const PANEL = { w: 960, h: 540 };
const PANELS = [
  { x: 6230, y: 860 },
  { x: 7270, y: 860 },
];
const FS02 = "media/fs-02.mov";
const FS_L = 378.6;
const FS_R = 383.6;
// The slot holds both takes back to back; the second ("explain why first") is assumed to start about halfway in.
const FS_SPLIT = 5.5;
// Off on purpose: the file now in media/ is one long autonomous session (with the creator's name and project list in its sidebar), not the two takes this slot asks for, so the halves stay labelled placeholders until the right recording lands.
const USE_FS02 = false;

const hasFootage = () => {
  try {
    return USE_FS02 && getStaticFiles().some((f) => f.name === FS02);
  } catch {
    return false;
  }
};

const FootagePanel: FC<{ i: 0 | 1; from: number; startAt: number; dim: number; label: string; hideAt: number }> = ({ i, from, startAt, dim, label, hideAt }) => {
  const { t } = useTime();
  const { fps } = useVideoConfig();
  const { x, y } = PANELS[i]!;
  const { w, h } = PANEL;
  const zoom = 1 + 0.07 * ramp(t, from, 5, Easing.inOut(Easing.sin));
  const appear = ramp(t, 378.75, 0.35);
  if (appear <= 0) return null;
  return (
    <g opacity={appear}>
      {hasFootage() ? (
        <foreignObject x={x - w / 2} y={y - h / 2} width={w} height={h}>
          <div style={{ width: w, height: h, overflow: "hidden", position: "relative", backgroundColor: PAPER }}>
            <Sequence from={Math.round(from * fps)} layout="none">
              <OffthreadVideo
                src={staticFile(FS02)}
                startFrom={Math.round(startAt * fps)}
                muted
                style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${zoom})`, filter: "sepia(0.22) saturate(0.82) contrast(1.04)" }}
              />
            </Sequence>
            {/* Paper multiplied over the recording so it sits in the sketchbook's warm light. */}
            <div style={{ position: "absolute", inset: 0, backgroundColor: PAPER, mixBlendMode: "multiply", opacity: 0.45 }} />
          </div>
        </foreignObject>
      ) : (
        <g>
          <rect x={x - w / 2} y={y - h / 2} width={w} height={h} fill={DOT} opacity={0.32} />
          <Sk pts={rectPts(x - w / 2 + 14, y - h / 2 + 14, w - 28, h - 28, 7200 + i)} w={3} color={PENCIL} seed={7200 + i} dash="14 12" />
          <g transform={`translate(${x} ${y - 60}) scale(${1.3 * (t >= from ? 1 + 0.05 * Math.sin((t - from) * 5) : 1)})`}>
            <PlayBtn p={ramp(t, 378.8, 0.5)} seed={7203 + i * 3} />
          </g>
          <Hand x={x} y={y + 90} text={label} size={52} color={INK} p={wr(t, Math.max(378.95, from - 0.1), label)} opacity={1 - ramp(t, hideAt, 0.3)} />
        </g>
      )}
      {/* the panel not being talked about sits back under a sheet of paper */}
      <rect x={x - w / 2} y={y - h / 2} width={w} height={h} fill={PAPER} opacity={0.62 * dim} />
    </g>
  );
};

// New piece: PromptBubble, a wobbly bubble that pops above a screen with its tail pointing down into it.
const PromptBubble: FC<{ x: number; y: number; w: number; text: string; at: number; seed: number; out?: number; children?: ReactNode }> = ({ x, y, w, text, at, seed, out = END, children }) => {
  const { t } = useTime();
  const e = ramp(t, at, 0.34, POP);
  if (e <= 0) return null;
  const h = 104;
  return (
    <At x={x} y={y} s={0.4 + 0.6 * e} o={clamp01(e * 3) * (1 - ramp(t, out, 0.3))}>
      <path d={`M${-26},${h * 0.4} L${8},${h * 0.5 + 48} L${30},${h * 0.42} Z`} fill={PAPER} />
      <ellipse cx={0} cy={0} rx={w / 2} ry={h / 2} fill={PAPER} />
      <Sk pts={blobPts(0, 0, w, h, seed)} p={ramp(t, at, 0.3)} w={4.2} color={INK} seed={seed} />
      <Sk pts={[[-26, h * 0.46], [8, h * 0.5 + 48], [30, h * 0.47]]} p={ramp(t, at + 0.1, 0.2)} w={4.2} color={INK} seed={seed + 1} amp={1} ghost={false} />
      <Hand x={0} y={20} text={text} size={60} color={INK} p={wr(t, at + 0.08, text)} />
      {children}
    </At>
  );
};

const SplitScreen: FC = () => {
  const { t } = useTime();
  const draw = ramp(t, 378.5, 0.6, INOUT);
  const L = MON.x - MON.w / 2;
  const T = MON.y - MON.h / 2;
  const dimL = ramp(t, FS_R, 0.4);
  const dimR = 1 - ramp(t, FS_R, 0.4);
  // The pencil writes two lines under the "explain" take, then lifts off for the bar.
  const lineA = scrawl(6890, 1262, 7330, 7230);
  const lineB = scrawl(6890, 1318, 7150, 7231);
  const pA = ramp(t, 386.55, 0.85, Easing.linear);
  const pB = ramp(t, 388.3, 0.6, Easing.linear);
  const penIn = ramp(t, 386.25, 0.3, Easing.out(Easing.cubic));
  const penOut = ramp(t, 389.35, 0.35, Easing.in(Easing.cubic));
  const tip = t < 388.3 ? tipOf(lineA, pA) : tipOf(lineB, pB);
  const writing = (t > 386.55 && t < 387.4) || (t > 388.3 && t < 388.9) ? Math.sin(t * 38) * 4 : 0;
  if (draw <= 0) return null;
  return (
    <g>
      <rect x={L + 14} y={T + 18} width={MON.w} height={MON.h} rx={26} fill={INK} opacity={0.06 * draw} />
      <rect x={L} y={T} width={MON.w} height={MON.h} rx={26} fill={PAPER} opacity={draw > 0.3 ? 1 : 0} />
      <FootagePanel i={0} from={FS_L} startAt={0} dim={dimL} label="fs-02 · 'do it' take" hideAt={383.45} />
      <FootagePanel i={1} from={FS_R} startAt={FS_SPLIT} dim={dimR} label="fs-02 · 'explain first' take" hideAt={389.5} />
      <Sk pts={blobPts(MON.x, MON.y, MON.w, MON.h, 7210)} p={draw} w={6} color={INK} seed={7210} />
      {PANELS.map((pn, k) => (
        <Sk key={k} pts={rectPts(pn.x - PANEL.w / 2, pn.y - PANEL.h / 2, PANEL.w, PANEL.h, 7212 + k)} p={ramp(t, 378.7 + k * 0.1, 0.4)} w={3.6} color={INK} seed={7212 + k} ghost={false} />
      ))}
      <Sk pts={linePts(MON.x, T + 40, MON.x, T + MON.h - 40, 7215, 0.01, 6)} p={ramp(t, 378.9, 0.3)} w={4} color={INK} seed={7215} />
      <PromptBubble x={PANELS[0]!.x} y={412} w={280} text="do it" at={381.82} seed={7220} out={383.5} />
      <PromptBubble x={PANELS[1]!.x} y={412} w={440} text="explain first" at={384.4} seed={7222}>
        <Sk pts={curvePts(-188, 40, -110, 32, -14, 42, 10)} p={ramp(t, 385.05, 0.4, INOUT)} w={6} color={ACCENT} seed={7224} ghost={false} />
      </PromptBubble>
      <Hand x={PANELS[0]!.x} y={1292} text="→ the code" size={58} color={PENCIL} p={wr(t, 382.85, "→ the code")} opacity={1 - ramp(t, 383.6, 0.3)} />
      {/* hand-written lines under the "explain" take */}
      <Sk pts={lineA} p={pA} w={4} color={INK} seed={7230} amp={1} ghost={false} />
      <Sk pts={lineB} p={pB} w={4} color={INK} seed={7231} amp={1} ghost={false} />
      {t >= 386.25 && t < 389.75 && <Pencil x={tip[0] + 260 * (1 - penIn) + 120 * penOut} y={tip[1] + writing - 220 * (1 - penIn) - 420 * penOut} o={clamp01(penIn * 3) * (1 - penOut)} />}
    </g>
  );
};

const BAR = { x: 8450, base: 1160, h: 540, w: 170, fill: 0.68 };
const ARROW = { x1: 7772, x2: 8344, y: 760, cx: 8058, cy: 680 };

// The coral column from Beat 4 (the people who asked conceptual questions), hatched by hand.
const HighBar: FC = () => {
  const { t } = useTime();
  const e = ramp(t, 390.35, 0.6, Easing.out(Easing.back(1.4)));
  if (e <= 0) return null;
  const x = BAR.x + 700 * (1 - e);
  const f = BAR.fill * ramp(t, 390.85, 0.8, INOUT);
  const h = BAR.h * f;
  const gap = 17;
  const n = h < 14 ? 0 : Math.floor((h - 14) / gap) + 1;
  const { w, base } = BAR;
  return (
    <g>
      <rect x={x - w / 2} y={base - BAR.h} width={w} height={BAR.h} fill={PAPER} />
      {h > 0 && <rect x={x - w / 2} y={base - h} width={w} height={h} fill={ACCENT} opacity={0.1} />}
      {Array.from({ length: n }, (_, k) => {
        const y = base - 8 - k * gap;
        return <Sk key={k} pts={linePts(x - w / 2 + 10, y + 1, x + w / 2 - 10, y - 13, 7300 + k, 0.02, 3)} w={3} color={ACCENT} seed={7300 + k} ghost={false} amp={1.4} />;
      })}
      {h > 2 && <Sk pts={linePts(x - w / 2, base - h, x + w / 2, base - h, 7340, 0.01, 4)} w={4.5} color={ACCENT} seed={7340} ghost={false} />}
      <Sk pts={rectPts(x - w / 2, base - BAR.h, w, BAR.h, 7341)} w={4.5} color={ACCENT} seed={7341} />
      <Sk pts={linePts(x - 150, base, x + 150, base, 7342, 0.01, 6)} w={4} color={INK} seed={7342} ghost={false} />
      <Hand x={BAR.x} y={base + 74} text="high scorers" size={54} color={INK} p={wr(t, 393.42, "high scorers")} />
    </g>
  );
};

// New piece: HangTag, a luggage tag on a string that drops from a line and swings until it settles.
const HangTag: FC<{ x: number; y: number; text: string; at: number; w: number }> = ({ x, y, text, at, w }) => {
  const { t } = useTime();
  const e = ramp(t, at, 0.3, Easing.out(Easing.quad));
  if (e <= 0) return null;
  const u = Math.max(0, t - at - 0.2);
  const sw = 9 * Math.exp(-u * 1.6) * Math.sin(u * 6.5) + 0.8 * Math.sin(t * 1.4);
  const len = 120 * e;
  const h = 106;
  return (
    <g transform={`rotate(${sw} ${x} ${y})`}>
      <Sk pts={linePts(x, y, x, y + len, 7350, 0.03, 4)} w={2.6} color={PENCIL} seed={7350} ghost={false} amp={1} />
      <g transform={`translate(${x} ${y + len + h / 2})`} opacity={e}>
        <path d={`M${-w / 2 + 40},${-h / 2} L${w / 2},${-h / 2} L${w / 2},${h / 2} L${-w / 2 + 40},${h / 2} L${-w / 2},0 Z`} fill={PAPER} />
        <Sk pts={dense([[-w / 2 + 40, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2 + 40, h / 2], [-w / 2, 0], [-w / 2 + 40, -h / 2]], 4)} w={4.2} color={INK} seed={7351} amp={1.2} />
        <Sk pts={ellPts(-w / 2 + 34, 0, 9, 9, 7352)} w={3} color={INK} seed={7352} ghost={false} />
        <Hand x={22} y={16} text={text} size={46} color={INK} p={wr(t, at + 0.12, text)} />
      </g>
    </g>
  );
};

const Closer: FC = () => {
  const { t } = useTime();
  const p = ramp(t, 391.0, 0.5, INOUT);
  if (p <= 0) return null;
  return (
    <g>
      <Sk pts={curvePts(ARROW.x1, ARROW.y, ARROW.cx, ARROW.cy, ARROW.x2, ARROW.y, 18)} p={p} w={4.5} color={INK} seed={7360} head />
      <Hand x={ARROW.cx} y={ARROW.cy - 40} text="closer" size={62} color={INK} p={wr(t, 391.22, "closer")} />
      <HangTag x={ARROW.cx} y={ARROW.cy + 42} text="can't prove cause" at={395.95} w={450} />
    </g>
  );
};

// ---------- region D: the chat folds shut, memory, the calendar, the margin note ----------
const CHAT = { x: 4050, y: 2640, w: 620, h: 440 };
const CODE: [number, number, number][] = [[3800, 2560, 4180], [3850, 2630, 4120], [3850, 2700, 4230], [3800, 2770, 3990]];
const CODE_T = 402.35;

// New piece: FoldChat, a chat window whose close button is clicked and which folds shut onto its bottom edge.
const FoldChat: FC = () => {
  const { t } = useTime();
  const p = ramp(t, 400.9, 0.45);
  if (p <= 0) return null;
  const click = ramp(t, 401.25, 0.2);
  const fold = ramp(t, 401.42, 0.38, Easing.in(Easing.cubic));
  const gone = ramp(t, 401.82, 0.25);
  const L = CHAT.x - CHAT.w / 2;
  const T = CHAT.y - CHAT.h / 2;
  const B = T + CHAT.h;
  const c = 1 - fold;
  return (
    <g opacity={1 - gone}>
      <g transform={`translate(0 ${B}) scale(1 ${Math.max(0.02, c)}) skewX(${-10 * fold}) translate(0 ${-B})`}>
        <rect x={L} y={T} width={CHAT.w} height={CHAT.h} rx={16} fill={PAPER} />
        <Sk pts={rectPts(L, T, CHAT.w, CHAT.h, 7400)} p={p} w={4.8} color={INK} seed={7400} />
        <Sk pts={linePts(L, T + 56, L + CHAT.w, T + 56, 7401, 0.01, 6)} p={p} w={3.6} color={INK} seed={7401} ghost={false} />
        <Hand x={L + 30} y={T + 40} text="chat" size={40} anchor="start" color={PENCIL} p={p} />
        <Hand x={L + CHAT.w - 34} y={T + 42} text="×" size={56} color={INK} p={p} font={SANS} />
        {/* the conversation: your ask on the right, the answer on the left */}
        <Sk pts={blobPts(L + CHAT.w - 150, T + 120, 220, 62, 7402)} p={p} w={3.6} color={INK} seed={7402} ghost={false} />
        <Sk pts={blobPts(L + 210, T + 240, 360, 130, 7403)} p={p} w={3.6} color={INK} seed={7403} ghost={false} />
        {[0, 1, 2].map((k) => (
          <Sk key={k} pts={linePts(L + 70, T + 210 + k * 30, L + 330 - k * 50, T + 210 + k * 30, 7404 + k, 0.01, 5)} p={p} w={3} color={PENCIL} seed={7404 + k} ghost={false} />
        ))}
        <Sk pts={blobPts(L + CHAT.w - 130, T + 360, 180, 56, 7408)} p={p} w={3.6} color={INK} seed={7408} ghost={false} />
      </g>
      {/* the click on the close button */}
      {click > 0 && click < 1 && <Sk pts={ellPts(L + CHAT.w - 34, T + 26, 18 + 26 * click, 18 + 26 * click, 7409)} w={4.5} color={ACCENT} seed={7409} opacity={1 - click} ghost={false} />}
    </g>
  );
};

const Memory: FC = () => {
  const { t } = useTime();
  if (t < 400.9) return null;
  const parts = CODE.map(([x0, y, x1], k) => ({ pts: scrawl(x0, y, x1, 7420 + k), p: ramp(t, CODE_T + k * 0.21, 0.21, Easing.linear) }));
  const cur = parts.find((q) => q.p > 0 && q.p < 1) ?? (t < CODE_T ? parts[0]! : parts[parts.length - 1]!);
  const tip = tipOf(cur.pts, cur.p);
  const penIn = ramp(t, 402.05, 0.3, Easing.out(Easing.cubic));
  const penOut = ramp(t, 403.25, 0.35, Easing.in(Easing.cubic));
  return (
    <g>
      <FoldChat />
      {parts.map((q, k) => (
        <Sk key={k} pts={q.pts} p={q.p} w={4.2} color={INK} seed={7420 + k} amp={1} ghost={false} />
      ))}
      <Hand x={CHAT.x} y={2400} text="From memory" size={70} color={INK} p={wr(t, 402.7, "From memory")} />
      {t >= 402.05 && t < 403.6 && <Pencil x={tip[0] + 300 * (1 - penIn) + 260 * penOut} y={tip[1] - 260 * (1 - penIn) - 300 * penOut + Math.sin(t * 40) * 3} o={clamp01(penIn * 3) * (1 - penOut)} />}
    </g>
  );
};

const CAL = { x: 4900, y: 2520, cw: 240, h: 190, n: 8 };
const DAYS = [
  { k: 0, label: "today", at: 403.85 },
  { k: 1, label: "tomorrow", at: 406.05 },
  { k: 7, label: "next week", at: 406.85 },
];
const cellX = (k: number) => CAL.x + CAL.cw * k + CAL.cw / 2;

// New piece: CalendarStrip, a ringed desk-calendar strip whose days get a coral tick, with the gaps between them hopped by arrows.
const CalendarStrip: FC = () => {
  const { t } = useTime();
  const p = ramp(t, 403.2, 0.6, INOUT);
  if (p <= 0) return null;
  const W8 = CAL.cw * CAL.n;
  const robotIn = ramp(t, 403.35, 0.35, POP);
  return (
    <g>
      <rect x={CAL.x + 12} y={CAL.y + 16} width={W8} height={CAL.h} fill={INK} opacity={0.05} />
      <rect x={CAL.x} y={CAL.y} width={W8} height={CAL.h} fill={PAPER} />
      <Sk pts={rectPts(CAL.x, CAL.y, W8, CAL.h, 7500)} p={p} w={4.8} color={INK} seed={7500} />
      {Array.from({ length: CAL.n - 1 }, (_, k) => (
        <Sk key={k} pts={linePts(CAL.x + CAL.cw * (k + 1), CAL.y + 6, CAL.x + CAL.cw * (k + 1), CAL.y + CAL.h - 6, 7501 + k, 0.02, 4)} p={ramp(t, 403.3 + k * 0.04, 0.3)} w={3} color={INK} seed={7501 + k} ghost={false} />
      ))}
      {Array.from({ length: CAL.n }, (_, k) => (
        <Sk key={`r${k}`} pts={ellPts(cellX(k), CAL.y - 4, 12, 22, 7510 + k)} p={ramp(t, 403.35 + k * 0.04, 0.3)} w={3.6} color={INK} seed={7510 + k} ghost={false} />
      ))}
      {/* the legend: no AI on these days */}
      <At x={CAL.x + 50} y={2400} s={0.9 * robotIn} o={clamp01(robotIn * 3)}>
        <Robot p={ramp(t, 403.35, 0.5)} />
      </At>
      <Sk pts={linePts(CAL.x + 4, 2344, CAL.x + 96, 2436, 7520, 0.04, 5)} p={ramp(t, 403.62, 0.18)} w={6} color={INK} seed={7520} />
      <Sk pts={linePts(CAL.x + 96, 2344, CAL.x + 4, 2436, 7521, 0.04, 5)} p={ramp(t, 403.74, 0.18)} w={6} color={INK} seed={7521} />
      <Hand x={CAL.x + 130} y={2430} text="no AI" size={66} anchor="start" color={INK} p={wr(t, 403.55, "no AI")} />
      {DAYS.map((d) => {
        const cx = cellX(d.k);
        const cy = CAL.y + CAL.h / 2;
        return (
          <g key={d.k}>
            <Sk pts={[[cx - 52, cy - 8], [cx - 14, cy + 40], [cx + 62, cy - 62]]} p={ramp(t, d.at, 0.28)} w={9} color={ACCENT} seed={7530 + d.k} amp={1.4} />
            <Hand x={cx} y={CAL.y + CAL.h + 84} text={d.label} size={56} color={INK} p={wr(t, d.at + 0.05, d.label)} />
          </g>
        );
      })}
      {/* spacing it out: hops under the strip, the second much longer */}
      <Sk pts={curvePts(cellX(0) + 10, 2860, cellX(0) + CAL.cw / 2, 2960, cellX(1) - 10, 2860, 12)} p={ramp(t, 408.15, 0.35, INOUT)} w={4} color={PENCIL} seed={7540} dash="10 10" head />
      <Sk pts={curvePts(cellX(1) + 10, 2860, (cellX(1) + cellX(7)) / 2, 3080, cellX(7) - 10, 2860, 24)} p={ramp(t, 408.4, 0.6, INOUT)} w={4} color={PENCIL} seed={7541} dash="10 10" head />
    </g>
  );
};

// New piece: GradCap, a little mortarboard for "students".
const GradCap: FC<{ p: number }> = ({ p }) => (
  <>
    <Sk pts={dense([[-66, 0], [0, -28], [66, 0], [0, 28], [-66, 0]], 3)} p={seg(p, 0, 2)} w={4.5} color={INK} seed={7550} amp={1} />
    <Sk pts={[[-36, 14], [-36, 44], ...curvePts(-36, 44, 0, 62, 36, 44, 8).slice(1), [36, 14]]} p={seg(p, 1, 2)} w={4.5} color={INK} seed={7551} amp={1} ghost={false} />
    <Sk pts={[[0, 0], [54, 8], [56, 46]]} p={seg(p, 1, 2)} w={3.4} color={INK} seed={7552} amp={0.8} ghost={false} />
  </>
);

const NOTE_D = { x: 7000, y1: 2560, y2: 2710 };
const STUD = "studied on students:";
const MINE = "my version";
const MarginNote: FC = () => {
  const { t } = useTime();
  if (t < 409.7) return null;
  const p1 = toP(STUD, 60, along(t, [[409.95, 0], [410.75, 0.55], [411.45, 0.62], [411.95, 1]]));
  const p2 = toP(MINE, 78, along(t, [[413.75, 0], [414.4, 1]]));
  const tip = t < 413.0 ? penAt(STUD, NOTE_D.x, NOTE_D.y1, 60, p1) : penAt(MINE, NOTE_D.x, NOTE_D.y2, 78, p2);
  const penIn = ramp(t, 409.7, 0.3, Easing.out(Easing.cubic));
  const penOut = ramp(t, 414.55, 0.4, Easing.in(Easing.cubic));
  const capIn = ramp(t, 411.4, 0.35, POP);
  const writing = (t > 409.95 && t < 411.95) || (t > 413.75 && t < 414.4) ? Math.sin(t * 40) * 3 : 0;
  return (
    <g>
      <Sk pts={curvePts(NOTE_D.x - 16, 2600, NOTE_D.x - 70, 2560, NOTE_D.x - 150, 2600, 10)} p={ramp(t, 409.85, 0.35)} w={3.6} color={PENCIL} seed={7560} head />
      <Hand x={NOTE_D.x} y={NOTE_D.y1} text={STUD} size={60} anchor="start" color={PENCIL} p={p1} />
      <At x={NOTE_D.x + 710} y={NOTE_D.y1 - 40} s={capIn} o={clamp01(capIn * 3)} r={-8}>
        <GradCap p={ramp(t, 411.4, 0.5)} />
      </At>
      <Hand x={NOTE_D.x} y={NOTE_D.y2} text={MINE} size={78} anchor="start" color={INK} p={p2} />
      <Sk pts={curvePts(NOTE_D.x - 6, NOTE_D.y2 + 24, NOTE_D.x + 150, NOTE_D.y2 + 14, NOTE_D.x + 296, NOTE_D.y2 + 26, 10)} p={ramp(t, 414.42, 0.4, INOUT)} w={5} color={INK} seed={7561} ghost={false} />
      <Pencil x={tip[0] + 220 * (1 - penIn) + 200 * penOut} y={tip[1] + writing - 240 * (1 - penIn) - 320 * penOut} o={clamp01(penIn * 3) * (1 - penOut)} />
    </g>
  );
};

// ---------- region C: the shiny idea, the runner, the parking note, the main link ----------
const MAIN = { x: 1500, y: 1720, s: 1.75 };
const PLAY = { x: 2590, y: 1180 };
const NOTE = { x: 2600, y: 1540, w: 600, h: 440 };
// Where the note's paper clip hooks onto the side string, and the clip's top in the note's own coordinates.
const HOOK = { x: 900, y: 802 };
const CLIP_TOP: P = [-226, -276];
const PARK_S = 0.78;
const PARK_R = 4;
const FLY = 427.8;
const LAND = 428.36;
const BULB_IN_NOTE: P = [110, -132];
const STRING: P[] = curvePts(560, 760, 1010, 860, 1460, 730, 24);

const parkCentre = (r: number): P => {
  const a = (r * Math.PI) / 180;
  const [lx, ly] = [CLIP_TOP[0] * PARK_S, CLIP_TOP[1] * PARK_S];
  return [HOOK.x - (lx * Math.cos(a) - ly * Math.sin(a)), HOOK.y - (lx * Math.sin(a) + ly * Math.cos(a))];
};
// The note's pose over time: slides in, sits for the cu, flies to the string and swings from its clip.
const noteXf = (t: number) => {
  const inE = ramp(t, 424.85, 0.45, Easing.out(Easing.back(1.3)));
  const snap = t > 426.72 ? -3 * Math.exp(-(t - 426.72) * 6) * Math.sin((t - 426.72) * 30) : 0;
  let x = lerp(3250, NOTE.x, inE);
  let y = NOTE.y;
  let r = lerp(14, -2, inE) + snap;
  let s = 1;
  const fly = ramp(t, FLY, LAND - FLY, INOUT);
  if (fly > 0) {
    const swing = t > LAND ? 7 * Math.exp(-(t - LAND) * 1.5) * Math.sin((t - LAND) * 6) + 0.8 * Math.sin(t * 1.2) : 0;
    const [hx, hy] = parkCentre(PARK_R);
    r = lerp(-2, PARK_R, fly);
    s = lerp(1, PARK_S, fly);
    x = lerp(NOTE.x, hx, fly);
    y = lerp(NOTE.y, hy, fly) - Math.sin(Math.PI * fly) * 140;
    if (t > LAND) {
      r = PARK_R + swing;
      [x, y] = parkCentre(r);
    }
  }
  return { x, y, r, s };
};
const noteToWorld = (t: number, lx: number, ly: number): [number, number, number] => {
  const { x, y, r, s } = noteXf(t);
  const a = (r * Math.PI) / 180;
  return [x + s * (lx * Math.cos(a) - ly * Math.sin(a)), y + s * (lx * Math.sin(a) + ly * Math.cos(a)), s];
};

// New piece: PaperClip, a wire clip drawn in one stroke, slid onto a corner.
const clipPts: P[] = [
  ...dense([[0, 54], [0, -46]], 4),
  ...arcPts(13, -46, 13, 13, Math.PI, Math.PI * 2, 8).slice(1),
  ...dense([[26, -46], [26, 62]], 4).slice(1),
  ...arcPts(16, 62, 10, 10, 0, Math.PI, 8).slice(1),
  ...dense([[6, 62], [6, -26]], 4).slice(1),
  ...arcPts(12.5, -26, 6.5, 6.5, Math.PI, Math.PI * 2, 6).slice(1),
  ...dense([[19, -26], [19, 40]], 3).slice(1),
];
const PaperClip: FC<{ p: number }> = ({ p }) => <Sk pts={clipPts} p={p} w={4.6} color={INK} seed={7600} amp={0.7} ghost={false} />;

// New piece: ParkingNote, a coral-tinted sticky note with a three-field plan; the idea's bulb hops in as the answer to "what it is".
const FIELDS = [
  { text: "what it is:", y: -100, at: 425.0, blank: [-20, 250] as P },
  { text: "first step:", y: 22, at: 425.62, blank: [-20, 250] as P },
  { text: "when:", y: 144, at: 426.15, blank: [-120, 250] as P },
];
const ParkingNote: FC = () => {
  const { t } = useTime();
  if (t < 424.85) return null;
  const { x, y, r, s } = noteXf(t);
  const { w, h } = NOTE;
  const clipIn = ramp(t, 426.62, 0.2, Easing.out(Easing.quad));
  const parked = ramp(t, LAND, 0.4);
  const bulbOn = t >= BULB_HOP + 0.36;
  const fadeEnd = 1 - ramp(t, 442.95, 0.35);
  return (
    <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`} opacity={fadeEnd}>
      <rect x={-w / 2 + 12} y={-h / 2 + 16} width={w} height={h} fill={INK} opacity={0.08} />
      <rect x={-w / 2} y={-h / 2} width={w} height={h} fill={PAPER} />
      <rect x={-w / 2} y={-h / 2} width={w} height={h} fill={ACCENT} opacity={0.14} />
      <Sk pts={rectPts(-w / 2, -h / 2, w, h, 7610)} w={4} color={INK} seed={7610} />
      {FIELDS.map((f, k) => (
        <g key={k}>
          <Hand x={-250} y={f.y} text={f.text} size={56} anchor="start" color={INK} p={wr(t, f.at, f.text)} />
          {k > 0 && <Sk pts={scrawl(f.blank[0], f.y - 14, f.blank[1], 7620 + k)} p={ramp(t, f.at + 0.32, 0.4, Easing.linear)} w={3.6} color={PENCIL} seed={7620 + k} amp={1} ghost={false} />}
          <Sk pts={linePts(f.blank[0] - 10, f.y + 18, f.blank[1] + 10, f.y + 18, 7625 + k, 0.004, 6)} p={ramp(t, f.at + 0.15, 0.3)} w={2.4} color={PENCIL} seed={7625 + k} dash="5 9" />
        </g>
      ))}
      {bulbOn && (
        <g transform={`translate(${BULB_IN_NOTE[0]} ${BULB_IN_NOTE[1]}) scale(0.85)`} opacity={1 - 0.45 * parked}>
          <Bulb p={1} />
        </g>
      )}
      {clipIn > 0 && (
        <g transform={`translate(-238 ${-h / 2 - 40 - 70 * (1 - clipIn)}) rotate(-8)`} opacity={clamp01(clipIn * 3)}>
          <PaperClip p={1} />
        </g>
      )}
    </g>
  );
};

// New piece: SideString, a thin line pinned at both ends where parked ideas hang.
const SideString: FC = () => {
  const { t } = useTime();
  const p = ramp(t, 427.6, 0.45, INOUT);
  const o = 1 - ramp(t, 442.95, 0.35);
  if (p <= 0 || o <= 0) return null;
  const pull = t > LAND ? 10 * Math.exp(-(t - LAND) * 3) : 0;
  const pts = STRING.map(([x, y], i) => [x, y + pull * Math.sin((Math.PI * i) / (STRING.length - 1))] as P);
  return (
    <g opacity={o}>
      <Sk pts={pts} p={p} w={2.6} color={PENCIL} seed={7640} amp={0.8} ghost={false} />
      {[STRING[0]!, STRING[STRING.length - 1]!].map(([x, y], k) => (
        <g key={k}>
          <circle cx={x} cy={y} r={13} fill={INK} opacity={p} />
          <circle cx={x - 4} cy={y - 4} r={4} fill={PAPER} opacity={0.7 * p} />
        </g>
      ))}
    </g>
  );
};

// New piece: Dasher, a stick runner who sprints, then skids to a stop and leans back.
const Dasher: FC<{ x: number; y: number; s: number; running: boolean; skid: number; o: number }> = ({ x, y, s, running, skid, o }) => {
  const { f } = useTime();
  if (o <= 0) return null;
  const a = Math.floor(f / 5) % 2 === 0;
  const legs: P[][] = running
    ? a
      ? [[[4, -8], [-14, 18], [-30, 34]], [[4, -8], [24, 16], [34, 40]]]
      : [[[4, -8], [-4, 18], [8, 42]], [[4, -8], [18, 14], [4, 36]]]
    : [[[0, -8], [10, 16], [24, 40]], [[0, -8], [-10, 16], [2, 40]]];
  const arms: P[][] = running
    ? a
      ? [[[2, -44], [-22, -30], [-30, -12]], [[2, -44], [24, -36], [38, -50]]]
      : [[[2, -44], [22, -28], [30, -12]], [[2, -44], [-18, -38], [-30, -52]]]
    : [[[-2, -44], [-26, -54], [-40, -66]], [[-2, -44], [-24, -32], [-40, -30]]];
  const lean = running ? 8 : -12 * skid;
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} opacity={o}>
      <g transform={`rotate(${lean} 0 40)`}>
        <Sk pts={ellPts(running ? 0 : -6, -70, 14, 14, 7650)} w={5} color={INK} seed={7650} ghost={false} />
        <Sk pts={linePts(running ? 0 : -4, -56, running ? 4 : 0, -8, 7651, 0.05, 3)} w={5} color={INK} seed={7651} ghost={false} />
        {[...legs, ...arms].map((l, k) => (
          <Sk key={k} pts={l} w={5} color={INK} seed={7652 + k} ghost={false} amp={1.2} />
        ))}
      </g>
      {running &&
        [-34, -10, 14].map((yy, k) => <Sk key={`m${k}`} pts={linePts(-48, yy, -82 - k * 8, yy, 7660 + k, 0.02, 2)} w={3.5} color={PENCIL} seed={7660 + k} ghost={false} />)}
      {!running &&
        [0, 1, 2].map((k) => (
          <Sk key={`d${k}`} pts={linePts(34 + k * 16, 40 - k * 6, 60 + k * 26, 30 - k * 14, 7665 + k, 0.03, 2)} p={skid} w={3.5} color={PENCIL} seed={7665 + k} ghost={false} />
        ))}
    </g>
  );
};

// New piece: Flask, a lab flask for "lab studies".
const Flask: FC<{ p: number }> = ({ p }) => (
  <>
    <Sk pts={dense([[-16, -70], [-16, -22], [-58, 46], [58, 46], [16, -22], [16, -70]], 3)} p={seg(p, 0, 2)} w={4.8} color={INK} seed={7670} amp={1} />
    <Sk pts={linePts(-26, -70, 26, -70, 7671, 0.02, 3)} p={seg(p, 0, 2)} w={4.8} color={INK} seed={7671} ghost={false} />
    <Sk pts={linePts(-40, 18, 40, 18, 7672, 0.03, 4)} p={seg(p, 1, 2)} w={3} color={PENCIL} seed={7672} ghost={false} />
    {[[-14, 32, 6], [12, 28, 8], [-2, 4, 5]].map(([bx, by, br], k) => (
      <Sk key={k} pts={ellPts(bx!, by!, br!, br!, 7673 + k)} p={seg(p, 1, 2)} w={3} color={PENCIL} seed={7673 + k} ghost={false} />
    ))}
  </>
);

// The chain the main link belongs to: neighbours appear one by one ("what they did next"), the rest on the closing pull-back.
const CHAIN_X = [MAIN.x - 1000, MAIN.x - 520, MAIN.x, MAIN.x + 520, MAIN.x + 1000];
const CHAIN_Y = [MAIN.y - 12, MAIN.y + 10, MAIN.y, MAIN.y - 14, MAIN.y + 8];
const HALF = (k: number) => (k === 2 ? 119 * MAIN.s : 119);

const Join: FC<{ a: number; b: number; p: number; ink: string; seed: number; dash?: string }> = ({ a, b, p, ink, seed, dash }) => {
  if (p <= 0) return null;
  const x1 = CHAIN_X[a]! + HALF(a) - 8;
  const x2 = CHAIN_X[b]! - HALF(b) + 8;
  const mx = (x1 + x2) / 2;
  const y = (CHAIN_Y[a]! + CHAIN_Y[b]!) / 2;
  return (
    <g>
      <Sk pts={linePts(x1, CHAIN_Y[a]! + 4, mx - 27, y, seed, 0.15, 4)} p={seg(p, 0, 4)} w={3.6} color={ink} seed={seed} dash={dash} />
      <Sk pts={ellPts(mx - 11, y, 19, 11, seed + 1)} p={seg(p, 1, 4)} w={3.6} color={ink} seed={seed + 1} dash={dash} />
      <Sk pts={ellPts(mx + 11, y, 19, 11, seed + 2)} p={seg(p, 2, 4)} w={3.6} color={ink} seed={seed + 2} dash={dash} />
      <Sk pts={linePts(mx + 27, y, x2, CHAIN_Y[b]! + 4, seed + 3, 0.15, 4)} p={seg(p, 3, 4)} w={3.6} color={ink} seed={seed + 3} dash={dash} />
    </g>
  );
};

const PULL_OUT = 443.15;
const MainCorner: FC = () => {
  const { t } = useTime();
  if (t < 419.5) return null;
  // Distraction: the link shakes and greys from the moment the play button shows up until the plan stops it interfering.
  const shake = ramp(t, 420.3, 0.3) * (1 - ramp(t, 432.55, 0.35));
  const dx = shake * 7 * Math.sin(t * 47);
  const dr = shake * 1.8 * Math.sin(t * 31 + 1);
  const ink = 1 - 0.45 * shake;
  const bold = ramp(t, 432.62, 0.4);
  // The nudge: the arrow pokes the link and it rocks once.
  const poke = ramp(t, 440.82, 0.14, Easing.in(Easing.quad)) - ramp(t, 440.96, 0.3, Easing.out(Easing.quad));
  const rock = t > 440.96 ? 2.5 * Math.exp(-(t - 440.96) * 5) * Math.sin((t - 440.96) * 16) : 0;
  const col = interpolateColors(ink, [0, 1], [PENCIL, INK]);
  const playPop = ramp(t, 420.27, 0.35, POP);
  const pulse = t < 426.8 ? 1 + 0.09 * Math.sin((t - 420.3) * 9) : 1;
  const playDim = 1 - 0.55 * ramp(t, 426.8, 0.4);
  const run = ramp(t, 422.72, 0.8, Easing.inOut(Easing.quad));
  const running = t >= 422.6 && t < 423.52;
  const skid = ramp(t, 423.52, 0.25);
  const clear = 1 - ramp(t, 442.95, 0.35);
  // Pencil: flies in, underlines the link's name in coral, lifts away before the pull-back.
  const penIn = ramp(t, 441.5, 0.45, Easing.out(Easing.cubic));
  const under = ramp(t, 442.3, 0.55, INOUT);
  const penOut = ramp(t, 442.95, 0.4, Easing.in(Easing.cubic));
  const ul = curvePts(MAIN.x - 150, MAIN.y + 52, MAIN.x, MAIN.y + 42, MAIN.x + 150, MAIN.y + 54, 14);
  const tip = tipOf(ul, under);
  const chainP = (k: number) => ramp(t, PULL_OUT + 0.1 + Math.abs(k - 2) * 0.12, 0.45);
  const nextP = ramp(t, 434.68, 0.6);
  return (
    <g>
      {/* the closing chain around the main link */}
      {[0, 1, 3, 4].map((k) => {
        const p = k === 3 ? Math.max(nextP, chainP(k)) : chainP(k);
        if (p <= 0) return null;
        const solid = k === 3 ? ramp(t, PULL_OUT, 0.4) : 1;
        return (
          <g key={k}>
            <Sk pts={blobPts(CHAIN_X[k]!, CHAIN_Y[k]!, 238, 130, 7700 + k)} p={p} w={3.6} color={PENCIL} seed={7700 + k} dash={solid < 1 ? "12 10" : undefined} />
          </g>
        );
      })}
      <Join a={0} b={1} p={chainP(0)} ink={PENCIL} seed={7710} />
      <Join a={1} b={2} p={chainP(1)} ink={PENCIL} seed={7720} />
      <Join a={2} b={3} p={Math.max(nextP, chainP(3))} ink={PENCIL} seed={7730} />
      <Join a={3} b={4} p={chainP(4)} ink={PENCIL} seed={7740} />

      {/* the main link */}
      <g transform={`translate(${MAIN.x + dx + 14 * poke} ${MAIN.y}) rotate(${dr + rock}) scale(${MAIN.s * (1 + 0.06 * bold)})`}>
        <ellipse cx={0} cy={0} rx={116} ry={62} fill={PAPER} />
        <Sk pts={blobPts(0, 0, 238, 130, 7750)} w={3.6 + 2.2 * bold} color={col} seed={7750} />
        <Hand x={0} y={14} text="main thing" size={46} color={col} />
      </g>
      {shake > 0.02 &&
        [-1, 1].map((side) =>
          [0, 1].map((k) => (
            <Sk key={`${side}${k}`} pts={arcPts(MAIN.x + side * (250 + k * 34), MAIN.y, 30, 70 - k * 16, side > 0 ? -0.9 : Math.PI - 0.9, side > 0 ? 0.9 : Math.PI + 0.9, 8)} w={3.6} color={PENCIL} seed={7760 + k + (side > 0 ? 3 : 0)} opacity={shake} ghost={false} />
          )),
        )}
      <Sk pts={ul} p={under} w={6.5} color={ACCENT} seed={7765} ghost={false} />

      <g opacity={clear}>
        {/* the play button that's always right there, and the next one queued behind it */}
        <g opacity={playDim}>
          <At x={PLAY.x + 170} y={PLAY.y - 100} s={0.75 * ramp(t, 421.05, 0.35, POP)} o={0.6}>
            <Sk pts={blobPts(0, 0, 124, 86, 7770)} p={ramp(t, 421.05, 0.4)} w={4} color={PENCIL} seed={7770} dash="10 9" />
          </At>
          <At x={PLAY.x} y={PLAY.y} s={1.5 * playPop * pulse} o={clamp01(playPop * 3)}>
            <PlayBtn p={ramp(t, 420.27, 0.45)} seed={7772} />
          </At>
        </g>
        <Dasher x={lerp(1830, 2060, run)} y={1570} s={1.9} running={running} skid={skid} o={ramp(t, 422.6, 0.15) * (1 - ramp(t, 424.75, 0.3))} />
        <g opacity={1 - ramp(t, 424.8, 0.3)}>
          <Hand x={1930} y={1930} text="don't chase it," size={64} anchor="end" color={INK} p={wr(t, 422.72, "don't chase it,")} />
          <Hand x={1985} y={1930} text="don't ignore it" size={64} anchor="start" color={INK} p={wr(t, 423.55, "don't ignore it")} />
        </g>
        {/* the plan that made it stop */}
        <g opacity={1 - ramp(t, 431.7, 0.35)}>
          <Hand x={1360} y={1010} text="a specific plan" size={62} anchor="start" color={INK} p={wr(t, 429.6, "a specific plan")} />
          <Hand x={1360} y={1100} text="for an unfinished goal" size={62} anchor="start" color={INK} p={wr(t, 430.45, "for an unfinished goal")} />
        </g>
        <Hand x={MAIN.x} y={1975} text="stopped interfering" size={58} color={INK} p={wr(t, 432.62, "stopped interfering")} opacity={1 - ramp(t, 436.05, 0.15)} />
        {/* lab studies, not about programming: take it as a nudge */}
        <g opacity={1 - ramp(t, 441.15, 0.3)}>
          <At x={720} y={1560} s={1.35 * ramp(t, 436.9, 0.35, POP)}>
            <Flask p={ramp(t, 436.9, 0.6)} />
          </At>
          <Hand x={720} y={1750} text="lab studies" size={58} color={INK} p={wr(t, 437.0, "lab studies")} opacity={1 - ramp(t, 439.75, 0.25)} />
          <Hand x={990} y={1585} text="</>" size={62} color={PENCIL} font={SANS} p={ramp(t, 438.2, 0.25)} />
          <Sk pts={linePts(930, 1590, 1050, 1548, 7780, 0.03, 4)} p={ramp(t, 438.6, 0.2)} w={5} color={INK} seed={7780} />
          <Sk pts={curvePts(860, 2010 + 0, 1040, 1960, 1258 + 18 * poke, 1800, 16)} p={ramp(t, 440.3, 0.5, INOUT)} w={5} color={INK} seed={7781} head />
          <Hand x={MAIN.x + 40} y={2070} text="take it as a nudge" size={60} color={INK} p={wr(t, 440.0, "take it as a nudge")} />
        </g>
      </g>
      <Hand x={MAIN.x} y={1990} text="back to the main thing" size={62} color={INK} p={wr(t, 442.05, "back to the main thing")} />
      {t >= 441.5 && t < 443.4 && <Pencil x={tip[0] + 600 * (1 - penIn) + 300 * penOut} y={tip[1] - 600 * (1 - penIn) - 400 * penOut} o={clamp01(penIn * 3) * (1 - penOut)} />}
    </g>
  );
};

// ---------- the shot list: every move lands on a spoken word ----------
const R = (x: number, y: number, w: number, h: number): Rect => ({ x, y, w, h });
// A view by centre and scale (fill 1 of a frame-sized rect), so each framing is exact.
const V = (cx: number, cy: number, s: number) => ({ target: R(cx - 960 / s, cy - 540 / s, 1920 / s, 1080 / s), size: 1 });
const SHOTS: Shot[] = [
  // 1 "So here are 3 rules": born on a ruled line of the page Beat 6 dived into, pull back to the whole checklist.
  { at: START, ...V(4600, 568.4, 14) },
  { at: 371.36, ...V(4270, 1065, 0.68), move: "pull", dur: 1.7 },
  // 2 "One. Ask AI to explain": push onto box one.
  { at: 376.0, ...V(4120, 870, 1.55), move: "push", dur: 0.8 },
  // 3 "Same task, two ways. If I ask 'do it'": glide to the split screen, left take.
  { at: 378.45, ...V(6300, 840, 1.1), move: "glide", dur: 0.8 },
  // 4 "If I ask 'explain me why'": glide to the right take.
  { at: 383.5, ...V(7230, 862, 1.03), move: "glide", dur: 0.7 },
  // 5 "That's closer to the people who scored high": push onto the coral bar.
  { at: 389.55, ...V(8080, 920, 1.5), move: "push", dur: 0.9 },
  // 6 "2. Before you move on": pull back to the checklist, box two.
  { at: 397.8, ...V(4100, 1230, 1.3), move: "pull", dur: 1.0 },
  // 7 "Close the chat and write it from memory": push down onto the chat window.
  { at: 401.1, ...V(4050, 2620, 1.6), move: "push", dur: 0.7 },
  // 8 "testing yourself ... tomorrow and next week": glide to the calendar.
  { at: 403.2, ...V(5860, 2640, 0.95), move: "glide", dur: 0.65 },
  // 9 "The study behind that used students": push onto the margin note.
  { at: 409.55, ...V(7330, 2620, 1.5), move: "push", dur: 0.8 },
  // 10 "3. When a shiny new idea shows up": pull back to box three.
  { at: 415.05, ...V(3980, 1650, 1.3), move: "pull", dur: 1.1 },
  // 11 "because the next video is always right up there": whip left with the bulb to the play button.
  { at: BULB_WHIP, ...V(2420, 1220, 1.7), move: "whip", dur: 0.3 },
  // 12 "don't chase it, don't just ignore it": glide out to the runner and the main link.
  { at: 422.3, ...V(1950, 1500, 1.1), move: "glide", dur: 0.8 },
  // 13 "Write a short plan for it, and park it": push onto the parking note.
  { at: 424.75, ...V(2620, 1590, 1.6), move: "push", dur: 0.7 },
  // 14 "In lab studies, people who made a specific plan": pull back as the note hangs on the string.
  { at: 427.75, ...V(1350, 1270, 0.95), move: "pull", dur: 1.0 },
  // 15 "found it stopped interfering": push onto the main link.
  { at: 431.75, ...V(1500, 1730, 1.7), move: "push", dur: 0.8 },
  // 16 "Those were lab studies ... take it as a nudge": hard cut wider.
  { at: 436.22, ...V(1330, 1740, 1.15), move: "cut" },
  // 17 "Then I go back to the main thing": push onto the link, then pull back into the closing chain.
  { at: 441.2, ...V(1500, 1740, 1.8), move: "push", dur: 0.7 },
  { at: PULL_OUT, ...V(1500, 1720, 0.75), move: "pull", dur: 1.0 },
];

// The page itself lives in the world, so every camera move is felt in the dot grid.
const PageWorld: FC = () => (
  <AbsoluteFill style={{ width: WORLD.w, height: WORLD.h, backgroundColor: PAPER, backgroundImage: `radial-gradient(${DOT} 1.7px, transparent 2.2px)`, backgroundSize: "40px 40px", backgroundPosition: "20px 20px" }} />
);

const Beat07: FC = () => {
  const { t } = useTime();
  if (t < START || t >= END) return null;
  // Small camera kicks on the bulb pop, the clip snap, the note landing and the poke, outside the rig so they never fight the shot list.
  const kick = (at: number, a = 6) => (t >= at && t < at + 0.5 ? Math.exp(-(t - at) * 12) * Math.sin((t - at) * 70) * a : 0);
  const k = kick(417.85, 5) + kick(426.75, 4) + kick(LAND, 5) + kick(440.96, 6);
  return (
    <AbsoluteFill style={{ backgroundColor: PAPER }}>
      <AbsoluteFill style={{ transform: `translate(${k}px, ${-k * 0.6}px)` }}>
        <Camera world={WORLD} shots={SHOTS} breath={1.5} motionBlur={{ samples: 8, shutter: 180, threshold: 80 }}>
          <Layer depth={1}>
            <PageWorld />
            <svg width={WORLD.w} height={WORLD.h} viewBox={`0 0 ${WORLD.w} ${WORLD.h}`} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
              {t < 422.6 && <ChecklistPage />}
              {t >= 378.4 && t < 401.5 && (
                <>
                  <SplitScreen />
                  <HighBar />
                  <Closer />
                </>
              )}
              {t >= 400.8 && t < 416.4 && (
                <>
                  <Memory />
                  <CalendarStrip />
                  <MarginNote />
                </>
              )}
              {t >= 419.5 && (
                <>
                  <SideString />
                  <MainCorner />
                  <ParkingNote />
                </>
              )}
              <ShinyBulb />
            </svg>
          </Layer>
        </Camera>
      </AbsoluteFill>
      {/* Atmosphere in front of the lens: grain and vignette do not zoom. */}
      <AbsoluteFill style={{ backgroundImage: GRAIN, opacity: 0.35, mixBlendMode: "multiply", pointerEvents: "none" }} />
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 45%, transparent 55%, ${INK}22 100%)`, pointerEvents: "none" }} />
    </AbsoluteFill>
  );
};

export default Beat07;
