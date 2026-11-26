// The rarest ratio (b47 to b76): print rushes under a red beam that finds nothing, five bars rise as 1 : 1 : 3 : 1 : 1, fold over their diagonals into a finder square, and that square flies to its corner, copies itself to the other two, and stays lit while the whole code turns on every beat.
import type { CSSProperties, FC, ReactNode } from "react";
import { AbsoluteFill, Easing } from "remotion";
import type { SceneProps } from "@kit/contract";
import { clamp01, cueAt, useT } from "@kit/motion";
import { codewordAt, isFunction, MATRIX, SIZE } from "./qr";

// The film's locked palette, for the colours `style` doesn't carry. Red is only the beam and the bars under it, lime only the found finders' white cells.
const RED = "#FF3B2F";
const LIME = "#D7FF3A";

// The track's beats b47 to b75 in this segment's local seconds; the named cues overwrite theirs.
const BEATS = [
  0, 0.469, 0.948, 1.407, 1.885, 2.364, 2.813, 3.292, 3.761, 4.23, 4.689, 5.168, 5.647, 6.126, 6.585, 7.054, 7.503, 8.002, 8.441, 8.92, 9.408, 9.877, 10.316, 10.815, 11.254, 11.733, 12.192, 12.681, 13.17,
];
const STOP = 9;
const MEASURE = 11;
const RIPPLE = 12;
const FOLD = 13;
const FLAP_A = 14;
const FLAP_B = 15;
const STAMP = 16;
const FIRST = 17;
const SECOND = 19;
const THIRD = 21;
const FILL = 22;
const SPIN = 23;
const NAMED: [string, number][] = [["search", 0], ["stop", STOP], ["fold", FOLD], ["first", FIRST], ["second", SECOND], ["third", THIRD], ["spin", SPIN]];

const EXPO = Easing.bezier(0.16, 1, 0.3, 1);
const BACK = Easing.out(Easing.back(1.25));
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const hash = (a: number, b = 0) => {
  const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const move = (f: number, at: number, dur = 9, ease: (x: number) => number = EXPO, lead = 2) => ease(clamp01((f - at + lead) / dur));
// A bump that peaks a frame or two after `at` and dies by `dur`.
const bump = (f: number, at: number, dur = 10) => {
  const p = (f - at + 1) / dur;
  return p <= 0 || p >= 1 ? 0 : Math.sin(Math.PI * p ** 0.55);
};
const box = (x: number, y: number, w: number, h: number) => `M${x} ${y}h${w}v${h}h${-w}z`;

// ---------- the print ----------

const FLOOR = 880;
const BEAM_X = 960;

type Bar = { x: number; y: number; w: number; h: number };
type Item = { w: number; h: number; white: string; ink: string; over: string; bars: Bar[]; cx: number };

// Decision: bar widths are only 1, 2 or 4 units and gaps 1 or 2, and a pattern with five neighbours even half-way to 1 : 1 : 3 : 1 : 1 (a scanner's tolerance) is redrawn from the next seed.
const barcode = (seed: number, x: number, y: number, w: number, h: number, unit: number): Bar[] => {
  for (let go = 0; go < 200; go++) {
    const out: Bar[] = [];
    const runs: number[] = [];
    let at = x;
    for (let i = 0; ; i++) {
      const bw = [1, 2, 1, 4, 2, 1][Math.floor(hash(seed + go * 31, i) * 6)]! * unit;
      if (at + bw > x + w) break;
      out.push({ x: at, y, w: bw, h });
      const gap = [1, 1, 2][Math.floor(hash(seed + go * 31 + 0.5, i) * 3)]! * unit;
      runs.push(bw, gap);
      at += bw + gap;
    }
    const alike = runs.some((_, i) => {
      const five = runs.slice(i, i + 5);
      const one = five.reduce((a, v) => a + v, 0) / 7;
      return i % 2 === 0 && five.length === 5 && five.every((v, j) => Math.abs(v / one - (j === 2 ? 3 : 1)) <= (j === 2 ? 1.5 : 0.5));
    });
    if (!alike) return out;
  }
  throw new Error("ratio.tsx: no barcode free of 1 : 1 : 3 : 1 : 1");
};

// Greeked type: a ragged line of word blocks, always at least three gaps wide.
const words = (seed: number, x: number, y: number, w: number, h: number, ragged: number) => {
  let d = "";
  const end = x + w * (1 - ragged * hash(seed, 91));
  let at = x;
  for (let i = 0; i < 20; i++) {
    const ww = Math.round(34 + 62 * hash(seed, i + 40));
    if (at + 30 > end) break;
    d += box(at, y, Math.min(ww, Math.round(end - at)), h);
    at += ww + 10;
  }
  return d;
};

const leaflet = (k: number): Omit<Item, "cx"> => {
  const w = 340;
  const h = 450;
  let over = words(k * 7 + 1, 34, 40, 250, 34, 0.1) + words(k * 7 + 2, 34, 92, 200, 34, 0.3);
  for (let i = 0; i < 5; i++) over += words(k * 7 + 3 + i, 34, 164 + i * 29, 270, 11, 0.45);
  return { w, h, ink: box(0, 0, w, h), white: box(5, 5, w - 10, h - 10), over, bars: barcode(k * 13 + 5, 34, 330, 272, 86, 6) };
};

const magazine = (k: number): Omit<Item, "cx"> => {
  const w = 430;
  const h = 490;
  // Masthead and cover picture: one ink square with a stepped skyline and a square sun cut out of it.
  const white = box(5, 112, w - 10, h - 117) + words(k * 11 + 2, 34, 32, 370, 50, 0.12);
  const n = 10;
  let photo = "";
  let top = 6;
  for (let i = 0; i < n; i++) {
    top = Math.max(3, Math.min(8, top + [-1, 1, -2, 1, 2][Math.floor(hash(k, i + 7) * 5)]!));
    photo += box(34 + i * 22, 140 + top * 22, 22, (n - top) * 22);
  }
  const sun = 34 + 22 * (hash(k, 3) < 0.5 ? 1 : 6);
  let over = "";
  for (let i = 0; i < 3; i++) over += words(k * 11 + 5 + i, 34, 394 + i * 30, 180, 12, 0.4);
  over += box(34, 140, 220, 220);
  return { w, h, ink: box(0, 0, w, h), white, over: `${over}|${photo}${box(sun, 162, 44, 44)}`, bars: barcode(k * 17 + 3, 276, 140, 124, 220, 6) };
};

const carton = (k: number): Omit<Item, "cx"> => {
  const w = 540;
  const h = 400;
  const ribs: Bar[] = Array.from({ length: 22 }, (_, i) => ({ x: 7 + i * 24, y: 14, w: 12, h: 74 }));
  const white = box(6, 14, w - 12, 74) + box(40, 130, 330, 220) + `M438 150l34 34h-20v64h-28v-64h-20z` + box(404, 264, 68, 12);
  const over = words(k * 19 + 4, 64, 154, 250, 16, 0.4) + words(k * 19 + 6, 64, 190, 270, 16, 0.5);
  return { w, h, ink: box(0, 0, w, h), white, over, bars: [...ribs, ...barcode(k * 23 + 1, 64, 232, 282, 92, 6)] };
};

const COUNTS = [1, 1, 2, 2, 3, 3, 4, 4, 4];
const TICKS = COUNTS.reduce((a, b) => a + b, 0);
const GAP = 120;
const ITEMS: Item[] = (() => {
  const out: Item[] = [];
  let x = 0;
  for (let k = 0; k < TICKS + 3; k++) {
    const it = [leaflet, magazine, carton][k % 3]!(k + 1);
    out.push({ ...it, cx: x + it.w / 2 });
    x += it.w + GAP;
  }
  return out;
})();
// The item under the beam once each beat has landed.
const LANDS = COUNTS.map((_, i) => ITEMS[COUNTS.slice(0, i + 1).reduce((a, b) => a + b, 0) - 1]!.cx);

// ---------- the finder and the code ----------

const Finder: FC<{ x: number; y: number; u: number; ink: string; white: string }> = ({ x, y, u, ink, white }) => (
  <g>
    <rect x={x} y={y} width={7 * u} height={7 * u} fill={ink} />
    <rect x={x + u} y={y + u} width={5 * u} height={5 * u} fill={white} />
    <rect x={x + 2 * u} y={y + 2 * u} width={3 * u} height={3 * u} fill={ink} />
  </g>
);

// A folding flap: the left (or right) wedge of the bars, turned over the square's diagonal by `theta`; at half a turn it lies as the top (or bottom) wedge.
const flapPath = (a: number, b: number, theta: number, side: 1 | -1, u: number, cx: number, cy: number) => {
  const pts: [number, number][] = [[a, a], [b, b], [b, -b], [a, -a]];
  return `M${pts.map(([px, py]) => {
    const x = px * u * side;
    const y = py * u * side;
    const d = (x + y) / 2;
    const n = (y - x) / 2;
    const nn = n * Math.cos(theta);
    const k = 1700 / (1700 - Math.abs(n) * Math.SQRT2 * Math.sin(theta));
    return `${(cx + (d - nn) * k).toFixed(2)} ${(cy + (d + nn) * k).toFixed(2)}`;
  }).join("L")}Z`;
};

const M = 20;
const QUIET = 4;
const TILE = (SIZE + QUIET * 2) * M;
const CORNERS: [number, number][] = [[0, 0], [0, SIZE - 7], [SIZE - 7, 0]];
const inFinder = (r: number, c: number) => CORNERS.some(([fr, fc]) => r >= fr && r < fr + 7 && c >= fc && c < fc + 7);
const isAlign = (r: number, c: number) => r >= 20 && r <= 24 && c >= 20 && c <= 24;
const isTimingRow = (r: number, c: number) => r === 6 && c >= 8 && c <= SIZE - 9;
const isTimingCol = (r: number, c: number) => c === 6 && r >= 8 && r <= SIZE - 9;
const cells = (on: (r: number, c: number) => boolean) => {
  let d = "";
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) if (on(r, c)) {
    // Neighbours overlap by a hair so a turned tile shows no seams.
    d += box((c + QUIET) * M, (r + QUIET) * M, c + 1 < SIZE && on(r, c + 1) ? M + 1 : M, r + 1 < SIZE && on(r + 1, c) ? M + 1 : M);
  }
  return d;
};
const FULL = cells((r, c) => MATRIX[r]![c]!);
// The finder's 16 white cells, clockwise from its top left.
const RING: [number, number][] = [
  ...[1, 2, 3, 4, 5].map((c): [number, number] => [1, c]),
  ...[2, 3, 4, 5].map((r): [number, number] => [r, 5]),
  ...[4, 3, 2, 1].map((c): [number, number] => [5, c]),
  ...[4, 3, 2].map((r): [number, number] => [r, 1]),
];
const TURNS = [60, 90, 45, 60, 75, 60];

// Averages `n` copies of a drawing across half a frame: each copy carries its own paper, so the mix is a true motion blur with no soft filter.
const Blur: FC<{ n: number; draw: (back: number) => ReactNode }> = ({ n, draw }) => (
  <>
    {Array.from({ length: n }, (_, j) => (
      <g key={j} opacity={1 / (j + 1)}>{draw((0.5 * (n - 1 - j)) / n)}</g>
    ))}
  </>
);

const Rise: FC<{ p: number; x: number; y: number; css: CSSProperties; children: ReactNode }> = ({ p, x, y, css, children }) =>
  p <= 0 ? null : (
    <div style={{ position: "absolute", left: x, top: y, overflow: "hidden", padding: "0 0.1em 0.06em 0", lineHeight: 1.2, whiteSpace: "pre", ...css }}>
      <span style={{ display: "inline-block", transform: `translateY(${(1 - p) * 105}%)` }}>{children}</span>
    </div>
  );

// ---------- scene ----------

const Scene: FC<SceneProps<Record<string, unknown>>> = ({ style, width: W, height: H, cues }) => {
  const { frame: f, fps } = useT();
  const seconds = [...BEATS];
  for (const [word, i] of NAMED) seconds[i] = cueAt(cues, word, BEATS[i]!);
  const B = seconds.map((s) => Math.round(s * fps));
  const b = (i: number) => B[i]!;
  const { ink, bg, surface: white } = style;
  const display: CSSProperties = { fontFamily: style.display, fontWeight: 900, fontVariationSettings: '"wght" 900', letterSpacing: "-0.045em", color: ink };

  // ---------- the conveyor ----------
  // One lunge a beat; from the sixth beat the rests close up until it runs flat out, then stops dead on "stop".
  const scroll = (ff: number) => {
    let s = LANDS[0]! - 1700;
    for (let i = 0; i < STOP; i++) {
      const start = b(i) - 2;
      if (ff < start) break;
      const end = i === STOP - 1 ? b(STOP) : b(i + 1) - 2;
      const flat = [0, 0, 0, 0, 0, 0.1, 0.35, 0.9, 1][i]!;
      const gap = i < 7 ? 3 : 0;
      const p = lerp(EXPO(clamp01((ff - start) / 11)), clamp01((ff - start) / (end - start - gap)), flat);
      s = lerp(i === 0 ? s : LANDS[i - 1]!, LANDS[i]!, p);
    }
    return s;
  };
  const conveyorOn = f < b(STOP) + 14;
  let conveyor: ReactNode = null;
  let meter: ReactNode = null;
  let beam: ReactNode = null;
  if (conveyorOn) {
    const s = scroll(f);
    const before = scroll(f - 3.6);
    const speed = s - scroll(f - 1);
    const n = Math.max(1, Math.min(14, 1 + Math.floor(speed / 9)));
    const since = f - b(STOP);
    // Sheets lean back as the belt lunges and pitch forward when it stops.
    const pitchFwd = since >= 0 ? 7 * Math.exp(-since / 2.4) * Math.cos(since * 1.1) : 0;
    const lean = Math.min(7, speed * 0.035) * (since >= 0 ? 0 : 1) - pitchFwd;
    const drop = since < 3 ? 0 : 560 * Easing.in(Easing.quad)(clamp01((since - 3) / 8));
    const visible = ITEMS.filter((it) => Math.abs(it.cx - s) < W / 2 + it.w + 260);
    const cleats = since < 10;
    conveyor = (
      <>
        <defs>
          <clipPath id="rt-belt"><rect x={0} y={0} width={W} height={FLOOR} /></clipPath>
        </defs>
        <g clipPath="url(#rt-belt)">
          <Blur n={n} draw={(back) => {
            const off = scroll(f - back);
            return (
              <>
                <rect x={0} y={370} width={W} height={FLOOR - 370} fill={bg} />
                {visible.map((it) => {
                  const x = Math.round(BEAM_X + it.cx - off - it.w / 2);
                  const [over, cut] = it.over.split("|");
                  const lit = it.bars.filter((q) => x + q.x <= BEAM_X + 5 && x + q.x + q.w + (s - before) >= BEAM_X - 5);
                  const dark = it.bars.filter((q) => !lit.includes(q));
                  const path = (list: Bar[]) => list.map((q) => box(q.x, q.y, q.w, q.h)).join("");
                  return (
                    <g key={it.cx} transform={`translate(${x} ${FLOOR + drop}) skewX(${(-lean).toFixed(2)}) translate(0 ${-it.h})`}>
                      <path d={it.ink} fill={ink} />
                      <path d={it.white} fill={white} />
                      <path d={over! + path(dark)} fill={ink} />
                      {cut ? <path d={cut} fill={white} /> : null}
                      {lit.length ? <path d={path(lit)} fill={RED} /> : null}
                    </g>
                  );
                })}
              </>
            );
          }} />
        </g>
        {cleats ? (
          <g transform={`translate(${-(s % 64)} ${since > 2 ? -22 * clamp01((since - 2) / 5) : 0})`}>
            <path d={Array.from({ length: Math.ceil(W / 64) + 2 }, (_, i) => box(i * 64, FLOOR + 6, 20, 14)).join("")} fill={ink} />
          </g>
        ) : null}
      </>
    );

    // The meter: one tick per item, a full strip, and nothing to show for it, so it falls away.
    const pitch = 73;
    meter = (
      <g>
        {Array.from({ length: TICKS }, (_, i) => {
          const passed = (ff: number) => scroll(ff) >= ITEMS[i]!.cx - 26;
          const on = passed(f);
          const fresh = on && !passed(f - 1) ? 1 : on && !passed(f - 2) ? 0.6 : on && !passed(f - 3) ? 0.25 : 0;
          const tau = since - 3 - Math.abs(i - (TICKS - 1) / 2) * 0.25;
          const y = 940 - fresh * 12 + (tau > 0 ? 3.2 * tau * tau : 0);
          const x = 96 + i * pitch;
          return on ? <rect key={i} x={x} y={y} width={49} height={40} fill={ink} /> : <rect key={i} x={x + 2} y={y + 2} width={45} height={36} fill="none" stroke={ink} strokeWidth={4} />;
        })}
      </g>
    );

    // The beam: flat steps, no gradient. On the stop it widens for two frames, then collapses to a line on the belt and is gone.
    const on = move(f, 0, 5);
    const flash = since >= 0 && since < 3 ? [30, 22, 10][since]! : 0;
    const fall = since < 3 ? 0 : Easing.in(Easing.quad)(clamp01((since - 2) / 4));
    const top = lerp(364, FLOOR - 10, fall);
    const wide = since < 6 ? 0 : 1;
    const shrink = since < 7 ? 1 : 1 - clamp01((since - 6) / 3);
    const core = 10 + flash;
    beam = since < 10 ? (
      <g>
        <rect x={BEAM_X - 36} y={lerp(364, FLOOR + 40, fall) - 16} width={72} height={16} fill={ink} opacity={fall > 0 ? 0 : on} />
        {wide ? (
          <rect x={BEAM_X - 260 * shrink} y={FLOOR - 10} width={520 * shrink} height={10} fill={RED} />
        ) : (
          <>
            <rect x={BEAM_X - core / 2 - 15} y={top} width={core + 30} height={(FLOOR - top) * on} fill={RED} opacity={0.2} />
            <rect x={BEAM_X - core / 2} y={top} width={core} height={(FLOOR - top) * on} fill={RED} />
          </>
        )}
      </g>
    ) : null;
  }

  // ---------- the five bars ----------
  const U1 = 200;
  const U2 = 88;
  const CX = W / 2;
  const squareTop = 330;
  const squareMid = squareTop + 3.5 * U2;
  const q = f >= b(FOLD) - 2 ? move(f, b(FOLD), 10, BACK) : 0;
  const u = lerp(U1, U2, q);
  const barsOn = f >= b(STOP) + 3 && f < b(FIRST);
  const foldedA = move(f, b(FLAP_A), 8, Easing.inOut(Easing.quad), 6);
  const foldedB = move(f, b(FLAP_B), 8, Easing.inOut(Easing.quad), 6);
  const COLS = [[0, 1], [1, 1], [2, 3], [5, 1], [6, 1]] as const;
  const barTime = (i: number) => b(STOP) + 4 + i * 2;
  const measureAt = (i: number) => b(MEASURE) + [0, 3, 6, 10, 12][i]!;
  const hop = (i: number) => 18 * bump(f, measureAt(i), 8) + 26 * bump(f, b(RIPPLE) + Math.abs(i - 2) * 2, 10);

  // The flight: from the middle of the frame, where it was folded, to its corner of the code.
  const TX = 1380 - TILE / 2;
  const TY = (H - TILE) / 2;
  const home = { x: TX + QUIET * M, y: TY + QUIET * M };
  const fly = Easing.in(Easing.cubic)(clamp01((f - b(FIRST) + 8) / 8));

  let bars: ReactNode = null;
  if (barsOn) {
    const floorY = lerp(FLOOR, squareTop + 7 * U2, q);
    const height = lerp(540, 7 * U2, q);
    const x0 = CX - 3.5 * u;
    const solid = foldedB >= 1;
    const stamp = f >= b(STAMP) - 4 ? (f < b(STAMP) ? 0.1 * Easing.out(Easing.quad)((f - b(STAMP) + 4) / 4) : 0.1 * (1 - EXPO(clamp01((f - b(STAMP) + 2) / 6)))) : 0;
    const wind = f >= b(FIRST) - 13 && fly === 0 ? 0.05 * Easing.out(Easing.quad)(clamp01((f - b(FIRST) + 13) / 5)) : 0.05 * (fly > 0 ? 1 - fly : 0);
    const size = lerp(U2 * (1 + stamp + wind), M, fly);
    const fx = lerp(CX, home.x + 3.5 * M, fly);
    const fy = lerp(squareMid, home.y + 3.5 * M, fly);
    const lineHalf = lerp(W / 2, 3.5 * U2, clamp01(q));
    bars = (
      <g>
        {q < 1 ? <rect x={CX - lineHalf} y={FLOOR} width={lineHalf * 2} height={6} fill={ink} opacity={q > 0.85 ? 0 : 1} /> : null}
        {/* The ruler: seven equal modules under the bars, counted off in the same groups. */}
        {f >= b(MEASURE) - 2 && q < 0.6 ? COLS.map(([c, w], i) => Array.from({ length: w }, (_, j) => {
          const p = move(f, measureAt(i) + j, 6, BACK) * (1 - clamp01(q / 0.5));
          if (p <= 0) return null;
          const x = x0 + (c + j) * u + 8;
          return i % 2 === 0
            ? <rect key={`${i}${j}`} x={x} y={FLOOR + 6 + 18 * p} width={u - 16} height={30 * p} fill={ink} />
            : <rect key={`${i}${j}`} x={x + 2} y={FLOOR + 8 + 18 * p} width={u - 20} height={Math.max(0, 30 * p - 4)} fill="none" stroke={ink} strokeWidth={4} />;
        })) : null}
        {solid ? (
          <Finder x={fx - 3.5 * size} y={fy - 3.5 * size} u={size} ink={ink} white={white} />
        ) : (
          <>
            {COLS.map(([c, w], i) => {
              const p = move(f, barTime(i), 10, BACK, 0);
              if (p <= 0) return null;
              const h = height * p + (q > 0 ? 0 : 1.6 * hop(i));
              const x = x0 + c * u;
              return i % 2 === 0
                ? <rect key={i} x={x} y={floorY - h} width={w * u} height={h} fill={ink} />
                : <rect key={i} x={x - 2} y={floorY - h + 2} width={w * u + 4} height={h - 4} fill={white} stroke={ink} strokeWidth={4} />;
            })}
            {([[foldedA, 1], [foldedB, -1]] as const).map(([p, side]) => p > 0 ? (
              <g key={side} strokeLinejoin="miter">
                {([[-3.5, -2.5, ink], [-2.5, -1.5, white], [-1.5, 0, ink]] as const).map(([a0, b0, fill]) => (
                  <path key={a0} d={flapPath(a0, b0, Math.PI * p, side, U2, CX, squareMid)} fill={fill} stroke={fill} strokeWidth={1} />
                ))}
                {/* The paper's cut edge, so the black flap reads against the black bars while it is in the air. */}
                {p > 0.02 && p < 0.99 ? <path d={flapPath(-3.5, 0, Math.PI * p, side, U2, CX, squareMid)} fill="none" stroke={white} strokeWidth={7} /> : null}
              </g>
            ) : null)}
          </>
        )}
      </g>
    );
  }

  // T8: each digit stands over its own bar; as the bars close up the line settles into plain mono spacing.
  const ratioOn = f >= b(STOP) && f < b(FIRST);
  const size8 = 132;
  const adv = size8 * 0.6;
  const base8 = 262;
  const ratio = ratioOn ? (
    <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
      <defs><clipPath id="rt-t8"><rect x={0} y={base8 - 160} width={W} height={184} /></clipPath></defs>
      <g clipPath="url(#rt-t8)">
        {["1", "1", "3", "1", "1"].map((d, i) => {
          const centre = (k: number) => COLS[k]![0] + COLS[k]![1] / 2 - 3.5;
          const x = lerp(centre(i) * U1, (i - 2) * 4 * adv, clamp01(q));
          const p = move(f, barTime(i), 8, BACK, 0);
          const pc = move(f, barTime(i), 8, BACK, 1);
          const cx = i > 0 ? lerp(((centre(i) + centre(i - 1)) / 2) * U1, (i - 2.5) * 4 * adv, clamp01(q)) : 0;
          const css: CSSProperties = { fontFamily: style.mono, fontWeight: 500, fontVariationSettings: '"wght" 500' };
          return (
            <g key={i} fontSize={size8} textAnchor="middle" fill={ink} style={css}>
              {i > 0 && pc > 0 ? <text x={CX + cx} y={base8 + (1 - pc) * 170}>:</text> : null}
              {p > 0 ? <text x={CX + x} y={base8 + (1 - p) * 170 - 0.8 * hop(i)}>{d}</text> : null}
            </g>
          );
        })}
      </g>
    </svg>
  ) : null;

  // ---------- the code ----------
  let code: ReactNode = null;
  if (f >= b(FIRST)) {
    const open = move(f, b(FIRST), 8, EXPO, 1);
    const slide = (to: number) => Easing.in(Easing.quad)(clamp01((f - b(to - 1)) / (b(to) - b(to - 1))));
    const go2 = slide(SECOND);
    const go3 = slide(THIRD);
    const knock = (i: number) => (f < b(i) ? 0 : 1 - EXPO(clamp01((f - b(i)) / 8)));
    const kx = 16 * knock(FIRST) + 18 * knock(SECOND);
    const ky = -14 * knock(FIRST) + 18 * knock(THIRD);
    const turn = (ff: number) => TURNS.reduce((sum, deg, i) => sum + deg * move(ff, b(SPIN + i), 9, Easing.out(Easing.back(1.1))), 0);
    const spinning = f >= b(SPIN) - 2;
    const n = spinning ? Math.max(1, Math.min(8, 1 + Math.floor(Math.abs(turn(f) - turn(f - 1)) / 2))) : 1;

    let built = "";
    if (!spinning) {
      const fill = (f - b(FILL)) / (b(SPIN) - 2 - b(FILL));
      built = cells((r, c) => {
        if (!MATRIX[r]![c]!) return false;
        if (inFinder(r, c)) return false;
        if (isTimingRow(r, c)) return go2 * (SIZE - 7) >= c;
        if (isTimingCol(r, c)) return go3 * (SIZE - 7) >= r;
        if (fill < 0) return false;
        if (isAlign(r, c)) return true;
        const k = codewordAt(r, c);
        return k === null ? isFunction(r, c) && fill > 0.5 : fill * 70 >= k;
      });
    }
    let lime = "";
    CORNERS.forEach(([fr, fc], i) => RING.forEach(([r, c], k) => {
      if (f >= b(SPIN) - 2 + i + k * 0.4) lime += box((fc + c + QUIET) * M - 1, (fr + r + QUIET) * M - 1, M + 2, M + 2);
    }));
    const local = home.x - TX;
    const x1 = lerp(local - QUIET * M * open, TILE, open);
    code = (
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        <Blur n={n} draw={(back) => (
          <>
            <rect x={840} y={0} width={W - 840} height={H} fill={bg} />
            <g transform={`translate(${(TX + TILE / 2 + kx).toFixed(2)} ${(TY + TILE / 2 + ky).toFixed(2)}) rotate(${turn(f - back).toFixed(3)}) translate(${-TILE / 2} ${-TILE / 2})`}>
              {(() => {
                // The white sheet unfolds out of the finder it belongs to.
                const a0 = lerp(local, 0, open);
                const a1 = Math.max(x1, local + 7 * M);
                return <rect x={a0 - 2} y={a0 - 2} width={a1 - a0 + 4} height={a1 - a0 + 4} fill={white} stroke={ink} strokeWidth={4} />;
              })()}
              {!spinning ? (
                <>
                  <path d={built} fill={ink} />
                  {CORNERS.map(([r, c], i) => {
                    const go = i === 0 ? 0 : i === 1 ? go2 : go3;
                    if (go === 0 && i > 0) return null;
                    return (
                      <g key={i}>
                        {i > 0 ? <rect x={(c * go + QUIET - 1) * M} y={(r * go + QUIET - 1) * M} width={9 * M} height={9 * M} fill={white} /> : null}
                        <Finder x={(c * go + QUIET) * M} y={(r * go + QUIET) * M} u={M} ink={ink} white={white} />
                      </g>
                    );
                  })}
                  {/* The one that stays: redrawn on top while its copies peel off it. */}
                  <Finder x={QUIET * M} y={QUIET * M} u={M} ink={ink} white={white} />
                </>
              ) : (
                <>
                  <path d={lime} fill={LIME} />
                  <path d={FULL} fill={ink} />
                </>
              )}
            </g>
          </>
        )} />
      </svg>
    );
  }

  // ---------- type ----------
  const size7 = 124;
  const line7 = (list: string[], from: number, top: number) => (
    <div style={{ position: "absolute", left: 96 - size7 * 0.05, top, height: size7 * 1.22, overflow: "hidden", whiteSpace: "pre", fontSize: size7, lineHeight: 1.2, ...display }}>
      {list.map((w, i) => {
        const at = [0, 4, 8, b(1), b(1) + 4, b(1) + 8, b(2)][from + i]!;
        return <span key={w} style={{ display: "inline-block", transform: `translateY(${(1 - move(f, at, 8, BACK)) * 110}%)` }}>{w + (i < list.length - 1 ? " " : "")}</span>;
      })}
    </div>
  );
  const size9 = 244;

  return (
    <AbsoluteFill style={{ background: bg, overflow: "hidden" }}>
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        {conveyor}
        {f < b(STOP) + 14 ? <rect x={0} y={FLOOR} width={W} height={6} fill={ink} /> : null}
        {meter}
        {bars}
        {beam}
      </svg>
      {f < b(STOP) ? (
        <>
          {line7(["They", "searched", "print"], 0, 72)}
          {line7(["for", "the", "rarest", "pattern."], 3, 72 + size7 * 0.96)}
        </>
      ) : null}
      {ratio}
      {code}
      {["Found", "at any", "angle."].map((line, i) => (
        <Rise key={line} p={f < b(FIRST) ? 0 : move(f, b([FIRST, SECOND, THIRD][i]!), 8, BACK)} x={96 - size9 * 0.055} y={48 + i * size9 * 0.97} css={{ ...display, fontSize: size9 }}>
          {line}
        </Rise>
      ))}
    </AbsoluteFill>
  );
};

export default Scene;
