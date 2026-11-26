// How it grew (b76 to b112): a 21 x 21 code grows ring by ring until it swallows the frame, three standards stamp down beside it, a Micro QR speck and an rMQR join it in true proportion, a gate swings up off it, and its finder square becomes the paper of the next chapter.
import type { CSSProperties, FC, ReactNode } from "react";
import { AbsoluteFill, Easing } from "remotion";
import type { SceneProps, Style } from "@kit/contract";
import { clamp01, cueAt, useT } from "@kit/motion";
import { microMatrix, plausibleMatrix, rmqrMatrix } from "./qr";

const VOID = "#0B0B0F";
const M = 96;

// The track's beats b76 to b112 in this segment's local seconds (pnpm music:beats incompetech-laserpack, less 36.607); the named cues overwrite theirs.
const BEATS = [
  0, 0.469, 0.938, 1.377, 1.846, 2.315, 2.783, 3.252, 3.721, 4.19, 4.659, 5.128, 5.617, 6.096, 6.575, 7.034, 7.513, 7.992, 8.431, 8.88, 9.369, 9.808, 10.296, 10.745, 11.254, 11.723, 12.192, 12.621, 13.1, 13.559, 14.048, 14.537, 14.992, 15.435, 15.924, 16.373, 16.842,
];
const GROW = 4;
const WHOLE = 8;
const AIM = 9;
const JIS = 11;
const ISO = 13;
const MICRO = 17;
const CLOSE = 18;
const RMQR = 20;
const BACK_OUT = 21;
const DROP = 23;
const FREE = 24;
const LOCK = 26;
const SWELL = 28;
const FINDER = 32;
const FILL = 33;
const CORE = 34;
const NAMED: [string, number][] = [["grow", GROW], ["AIM", AIM], ["JIS", JIS], ["ISO", ISO], ["Micro", MICRO], ["rMQR", RMQR], ["free", FREE], ["finder", FINDER]];

const EXPO = Easing.bezier(0.16, 1, 0.3, 1);
const BACK = Easing.out(Easing.back(1.25));
const IN = Easing.in(Easing.quad);
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const logLerp = (a: number, b: number, k: number) => Math.exp(lerp(Math.log(a), Math.log(b), k));
// Eased progress of a move that lands around frame `at`: it starts two frames early so the eye gets the hit on the beat.
const move = (f: number, at: number, dur = 9, ease: (x: number) => number = EXPO, lead = 2) => ease(clamp01((f - at + lead) / dur));
// A stamp: falls for four frames onto the beat, gives a little, settles.
const stamp = (f: number, at: number, big: number) => {
  const u = f - (at - 3);
  if (u < 3) return lerp(big, 1, IN(clamp01(u / 3)));
  if (u < 5) return lerp(1, 0.965, (u - 3) / 2);
  return lerp(0.965, 1, EXPO(clamp01((u - 5) / 7)));
};

const hit = (style: Style, size: number): CSSProperties => ({ fontFamily: style.display, fontWeight: 900, fontVariationSettings: '"wght" 900', fontSize: size, letterSpacing: "-0.045em", lineHeight: 1, whiteSpace: "nowrap" });
const mono = (style: Style, size: number, weight = 600): CSSProperties => ({ fontFamily: style.mono, fontWeight: weight, fontVariationSettings: `"wght" ${weight}`, fontSize: size, lineHeight: 1.15, whiteSpace: "pre" });

// ---------- codes (schematic: right sizes and layouts, seeded filler) ----------

type Grid = readonly (readonly boolean[])[];
const Q = 4;
const SMALL_Q = 2;

// One path per code, in module units: horizontal runs, plus slivers across every inked row boundary so no seam shows while the camera is between pixels.
const inkPath = (g: Grid) => {
  let d = "";
  g.forEach((row, r) => {
    const below = g[r + 1];
    for (let c = 0; c < row.length; ) {
      if (!row[c]) {
        c++;
        continue;
      }
      const from = c;
      while (c < row.length && row[c]) c++;
      d += `M${from} ${r}h${c - from}v1h${from - c}z`;
      if (!below) continue;
      for (let k = from; k < c; ) {
        if (!below[k]) {
          k++;
          continue;
        }
        const a = k;
        while (k < c && below[k]) k++;
        d += `M${a} ${r + 0.9}h${k - a}v0.2h${a - k}z`;
      }
    }
  });
  return d;
};

const SIZES = Array.from({ length: 40 }, (_, i) => 21 + 4 * i);
const LAST = SIZES.length - 1;
// One filler field for every size, cut from its middle: as the code grows, the modules already there stay put and only the finders travel out.
const FIELD = plausibleMatrix(209, 1177);

const alignCentres = (n: number) => {
  const v = (n - 17) / 4;
  if (v === 1) return [];
  const count = Math.floor(v / 7) + 2;
  const step = v === 32 ? 26 : Math.ceil((n - 13) / (count * 2 - 2)) * 2;
  return [6, ...Array.from({ length: count - 1 }, (_, i) => n - 7 - i * step).reverse()];
};
const gridOf = (n: number): Grid => {
  const layout = plausibleMatrix(n, 1177);
  const off = (209 - n) / 2;
  const end = n - 8;
  const g = layout.map((row, r) => row.map((v, c) => (r === 6 || c === 6 || (r < 8 && c < 8) || (r < 8 && c >= end) || (r >= end && c < 8) ? v : FIELD[r + off]![c + off]!)));
  const centres = alignCentres(n);
  for (const cr of centres) for (const cc of centres) {
    if ((cr === 6 && cc === 6) || (cr === 6 && cc === n - 7) || (cr === n - 7 && cc === 6)) continue;
    for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) g[cr + dr]![cc + dc] = Math.max(Math.abs(dr), Math.abs(dc)) !== 1;
  }
  return g;
};
const paths = new Map<number, string>();
const pathOf = (n: number) => {
  let d = paths.get(n);
  if (d === undefined) paths.set(n, (d = inkPath(gridOf(n))));
  return d;
};
const MICRO_INK = inkPath(microMatrix(11, 12));
const RMQR_INK = inkPath(rmqrMatrix(7, 43, 5));

// Growth steps as fractions of the growth's length: each step takes a little less time than the one before, down to a tenth.
const STEPS = (() => {
  const d = Array.from({ length: LAST }, (_, i) => 0.1 ** (i / (LAST - 1)));
  const total = d.reduce((a, b) => a + b, 0);
  let sum = 0;
  return d.map((x) => {
    const at = sum / total;
    sum += x;
    return at;
  });
})();

// ---------- pieces ----------

// A line of type that rises from behind its own floor on the beat and leaves on a hard cut.
const Line: FC<{ f: number; at: number; x: number; y: number; css: CSSProperties; color: string; scale?: number; children: ReactNode }> = ({ f, at, x, y, css, color, scale = 1, children }) => {
  if (f < at - 2) return null;
  const p = move(f, at, 8, BACK);
  return (
    <div style={{ position: "absolute", left: x, top: y, overflow: p < 1 ? "hidden" : "visible", padding: "8px 0", margin: "-8px 0", transform: `scale(${scale})`, transformOrigin: "0 60%" }}>
      <div style={{ ...css, color, transform: `translateY(${(1 - p) * 120}%)` }}>{children}</div>
    </div>
  );
};

// The outline that jumps off a hard landing.
const Echo: FC<{ f: number; at: number; x: number; y: number; w: number; h: number; reach: number; color: string; frames?: number }> = ({ f, at, x, y, w, h, reach, color, frames = 13 }) => {
  const e = (f - at) / frames;
  if (e < 0 || e >= 1) return null;
  const g = reach * Easing.out(Easing.quad)(e);
  return <rect x={x - g} y={y - g} width={w + 2 * g} height={h + 2 * g} fill="none" stroke={color} strokeWidth={6 * (1 - e) + 0.5} />;
};

// ---------- scene ----------

const Scene: FC<SceneProps<Record<string, unknown>>> = ({ style, width: W, height: H, cues }) => {
  const { frame: f, fps } = useT();
  const seconds = [...BEATS];
  for (const [word, i] of NAMED) seconds[i] = cueAt(cues, word, BEATS[i]!);
  const B = seconds.map((s) => Math.round(s * fps));
  const b = (i: number) => B[i]!;
  const beat = Math.max(0, B.filter((x) => f >= x - 2).length - 1);
  const white = style.surface;
  const ink = style.ink;
  const paper = style.bg;
  // Type leans on every beat it holds through: type scale, never the camera.
  const lean = (k: number) => 1 + k * (1 - EXPO(clamp01((f - b(beat) + 2) / 11))) * clamp01(f - b(beat) + 3);

  // ---- Camera: pixels per module and where the big code's centre is. Settled values are odd, so every module edge sits on a pixel.
  const RIGHT = 1350.5;
  const LEFT = 558.5;
  const CY = H / 2 + 0.5;
  let k = logLerp(27, 15, move(f, b(2), 10));
  k = logLerp(k, 5, move(f, b(WHOLE), 11));
  const toLeft = move(f, b(AIM), 9, BACK, 3);
  // The Micro QR's centre in world modules, and where it sits on screen when the camera goes in to find it.
  const FX = 108;
  const FY = 85;
  const close = move(f, b(CLOSE), 11) * (1 - move(f, b(BACK_OUT), 12));
  k = logLerp(k, 27, close);
  const X = f < b(CLOSE) - 2 ? lerp(RIGHT, LEFT, toLeft) : lerp(LEFT + FX * 5, 582.5, close) - FX * k;
  const Y = f < b(CLOSE) - 2 ? CY : lerp(CY + FY * 5, 782.5, close) - FY * k;

  // ---- The big code.
  const growFrom = b(GROW) - 2;
  const growLen = b(WHOLE) - 4 - growFrom;
  const stepAt = (i: number) => growFrom + STEPS[i]! * growLen;
  const grown = f < growFrom ? 0 : STEPS.filter((_, i) => f >= stepAt(i)).length;
  const n = SIZES[grown]!;
  const tile = n + Q * 2;
  // The rings about to be filled, drawn ahead of the tile's edge; every beat throws a few more of them out.
  const ahead: number[] = [];
  if (f >= growFrom - 3 && f < b(WHOLE)) {
    const lead = 2.4 + (beat >= GROW ? 6.5 * (1 - clamp01((f - b(beat) + 2) / 9)) : 0);
    for (let i = grown; i < LAST; i++) if (stepAt(i) - f < lead) ahead.push(SIZES[i + 1]! + Q * 2);
  }

  const big = (
    <g transform={`translate(${X} ${Y}) scale(${k})`}>
      {ahead.map((w) => (
        <rect key={w} x={-w / 2 + 0.5} y={-w / 2 + 0.5} width={w - 1} height={w - 1} fill="none" stroke={white} strokeWidth={1} />
      ))}
      <rect x={-tile / 2} y={-tile / 2} width={tile} height={tile} fill={white} />
      <path d={pathOf(n)} transform={`translate(${-n / 2} ${-n / 2})`} fill={ink} />
    </g>
  );

  // Outlined type is something named before it arrives; it fills when it does. The fill sits over the stroke, so overlapping glyph contours don't show.
  const outlined: CSSProperties = { WebkitTextStroke: `6px ${white}`, paintOrder: "stroke fill" };

  // ---- T10: two lines set to one width, on a void block cut out of the growing code.
  const fig1 = 117;
  const fig2 = 130;
  const numbers = f < b(AIM) + 10 ? (
    <div style={{ position: "absolute", left: 0, top: 683, width: 833, height: H - 683, background: VOID }}>
      <Line f={f} at={0} x={M} y={26} css={mono(style, fig1)} color={white}>
        21 x 21
      </Line>
      <Line f={f} at={b(1)} x={M} y={26} css={mono(style, fig1)} color={white}>
        {"        to"}
      </Line>
      <Line f={f} at={b(1)} x={M} y={156} css={{ ...mono(style, fig2), ...(f < growFrom ? outlined : {}) }} color={f < growFrom ? VOID : white} scale={f >= b(WHOLE) - 2 && beat === WHOLE ? lean(0.05) : 1}>
        {f < growFrom ? "177 x 177" : `${n} x ${n}`}
      </Line>
    </div>
  ) : null;

  // ---- T11: the three slabs.
  const TOP = 78;
  const SX = 1061;
  const SW = W - M - SX;
  const GAP = 32;
  const SH = (925 - 2 * GAP) / 3;
  const slabs: [string, number][] = [["AIM 1997.", AIM], ["JIS 1999.", JIS], ["ISO 2000.", ISO]];
  const slabOut = (i: number) => IN(clamp01((f - b(MICRO) + 10 - i) / 6)) * (W - SX + 80);
  const slabLayer = f < b(MICRO) + 3 ? slabs.map(([text, at], i) => {
    const landing = at === AIM ? b(at) + 2 : b(at);
    if (f < landing - 3) return null;
    const y = TOP + i * (SH + GAP);
    const s = stamp(f, landing, 1.5) * (f > landing + 11 ? lean(0.018) : 1);
    return (
      <div key={text} style={{ position: "absolute", left: SX, top: y, width: SW, height: SH, background: white, display: "flex", alignItems: "center", paddingLeft: 42, boxSizing: "border-box", transform: `translateX(${slabOut(i)}px) scale(${s})`, ...hit(style, 146), color: ink }}>
        {text}
      </div>
    );
  }) : null;
  const slabEchoes = slabs.map(([text, at], i) => <Echo key={text} f={f} at={at === AIM ? b(at) + 2 : b(at)} x={SX} y={TOP + i * (SH + GAP)} w={SW} h={SH} reach={70} color={white} />);

  // ---- The family: both small codes stand on the big tile's floor, at the big code's own module size.
  const SMALL_X = 100.5;
  const FLOOR = 92.5;
  const leave = IN(clamp01((f - b(FREE) + 6) / 6)) * 220;
  const family = f >= b(MICRO) - 4 && f < b(FREE) + 1 ? (() => {
    const drop = 1 - IN(clamp01((f - b(MICRO) + 4) / 4));
    const slide = 1 - IN(clamp01((f - b(RMQR) + 5) / 5));
    // The rMQR runs in underneath and kicks the Micro QR up; it comes down on top.
    const u = f - b(RMQR) + 1;
    const hop = u <= 0 ? 0 : u < 5 ? 17.5 * Easing.out(Easing.quad)(u / 5) : lerp(17.5, 13,IN(clamp01((u - 5) / 4)));
    const tilt = u <= 0 || u >= 9 ? 0 : -14 * Math.sin((Math.PI * u) / 9);
    const thin = 47;
    return (
      <g transform={`translate(${X} ${Y}) scale(${k})`}>
        {f >= b(RMQR) - 5 ? (
          <g transform={`translate(${SMALL_X + slide * 70 + leave} ${FLOOR - 11})`}>
            <rect width={thin} height={11} fill={white} />
            <path d={RMQR_INK} transform={`translate(${SMALL_Q} ${SMALL_Q})`} fill={ink} />
          </g>
        ) : null}
        <g transform={`translate(${SMALL_X + 7.5 + leave} ${FLOOR - 7.5 - hop - drop * 190}) rotate(${tilt})`}>
          <rect x={-7.5} y={-7.5} width={15} height={15} fill={white} />
          <path d={MICRO_INK} transform="translate(-5.5 -5.5)" fill={ink} />
        </g>
      </g>
    );
  })() : null;
  const microEcho = (
    <>
      {[0, 3].map((d) => (
        <Echo key={d} f={f} at={b(MICRO) + d} x={X + SMALL_X * k} y={Y + (FLOOR - 15) * k} w={15 * k} h={15 * k} reach={30 * k} color={white} />
      ))}
      <Echo f={f} at={b(RMQR)} x={X + SMALL_X * k} y={Y + (FLOOR - 11) * k} w={47 * k} h={11 * k} reach={90} color={white} frames={9} />
    </>
  );
  const arrived = f >= b(RMQR) - 2;
  const names = f >= b(MICRO) - 2 && f < b(FREE) - 2 ? (
    <>
      <Line f={f} at={b(MICRO)} x={SX} y={TOP} css={mono(style, 90)} color={white}>
        Micro QR 2004.
      </Line>
      <Line f={f} at={b(MICRO) + 2} x={SX} y={TOP + 116} css={{ ...mono(style, 90), ...(arrived ? {} : outlined) }} color={arrived ? white : VOID} scale={beat === RMQR ? lean(0.06) : 1}>
        rMQR 2022.
      </Line>
    </>
  ) : null;

  // ---- T13: the gate. It falls onto the code, then ratchets up a notch a beat and locks; what lies under the bar is lit, what lies above it is shut.
  const PX = 46;
  const PY = 868;
  const gateOn = f >= b(DROP) - 8;
  const fall = IN(clamp01((f - b(DROP) + 7) / 7));
  const bounce = f > b(DROP) ? 2.4 * Math.sin(Math.PI * clamp01((f - b(DROP)) / 7)) : 0;
  let angle = lerp(90, 0, fall) + bounce;
  angle = lerp(angle, 30, move(f, b(FREE), 9, BACK));
  angle = lerp(angle, 62, move(f, b(FREE + 1), 9, BACK));
  angle = lerp(angle, 90, move(f, b(LOCK), 10, Easing.out(Easing.back(1.7))));
  const rad = (angle * Math.PI) / 180;
  const enterGate = (1 - move(f, b(DROP) - 6, 5, EXPO, 2)) * 120;
  const BAR = 72;
  const LEN = 984;
  const stripe = 60;
  const shut = gateOn && angle < 89.9 && f < b(LOCK) + 4;
  const gate = gateOn ? (
    <g>
      {shut ? (
        <>
          <clipPath id="gr-tile">
            <rect x={LEFT - 462.5} y={CY - 462.5} width={925} height={925} />
          </clipPath>
          <polygon clipPath="url(#gr-tile)" fill={VOID} opacity={0.74} points={`${PX},${PY} ${PX + 3000 * Math.cos(rad)},${PY - 3000 * Math.sin(rad)} ${PX + 3000},${PY - 3000} ${PX},${PY - 3000}`} />
        </>
      ) : null}
      <g transform={`translate(${PX - enterGate} ${PY}) rotate(${-angle})`}>
        <rect x={0} y={-BAR / 2 - 10} width={LEN + 10} height={BAR + 20} fill={VOID} />
        <rect x={0} y={-BAR / 2} width={LEN} height={BAR} fill={white} />
        {/* Diagonal stripes stepped in modules, 18 px each. */}
        <path
          fill={VOID}
          d={Array.from({ length: 7 }, (_, i) =>
            Array.from({ length: 4 }, (_, r) => `M${108 + i * 126 + r * 18} ${BAR / 2 - (r + 1) * 18}h${stripe + 3}v18.2h${-stripe - 3}z`).join(""),
          ).join("")}
        />
        <rect x={-50} y={-50} width={100} height={100} fill={VOID} />
        <rect x={-42} y={-42} width={84} height={84} fill={white} />
        <rect x={-30} y={-30} width={60} height={60} fill={VOID} />
        <rect x={-18} y={-18} width={36} height={36} fill={white} />
      </g>
      <Echo f={f} at={b(LOCK) + 3} x={PX - 42} y={PY - 42} w={84} h={84} reach={120} color={white} />
    </g>
  ) : null;
  const rule = f >= b(FREE) - 2 ? (
    <>
      {[
        { text: "Free to use,", size: 143, y: 619 },
        { text: "if you follow", size: 137, y: 754 },
        { text: "the standard.", size: 121, y: 896 },
      ].map((l, i) => (
        <Line key={l.text} f={f} at={b(FREE) + i * 2} x={SX - l.size * 0.04} y={l.y} css={hit(style, l.size)} color={white} scale={beat > FREE && beat <= LOCK ? lean(0.012) : 1}>
          {l.text}
        </Line>
      ))}
    </>
  ) : null;

  // ---- The finder: swells a step a beat out of the code's own corner, takes the tile, then the frame; its core closes and only paper is left.
  let finder: ReactNode = null;
  if (f >= b(SWELL) - 2) {
    const FULL = 925 / 9;
    let m = 5;
    [8, 13, 22, 40].forEach((v, i) => (m = lerp(m, v, move(f, b(SWELL + i), 8, BACK))));
    m = lerp(m, FULL, move(f, b(FINDER), 10));
    const q = (m - 5) / (FULL - 5);
    const open = move(f, b(FILL), 13, Easing.inOut(Easing.cubic), 5);
    const cx = lerp(lerp(111, 96, q) + 4.5 * m, W / 2, open);
    const cy = lerp(lerp(93, TOP, q) + 4.5 * m, H / 2, open);
    const ring = logLerp(m, 540, open);
    const core = 3 * m * (1 - IN(clamp01((f - b(CORE) + 5) / 5)));
    const sq = (w: number, fill: string) => <rect x={cx - w / 2} y={cy - w / 2} width={w} height={w} fill={fill} />;
    finder = (
      <>
        {sq(9 * ring, paper)}
        {sq(7 * ring, ink)}
        {sq(5 * ring, paper)}
        {core > 0.5 ? sq(core, ink) : null}
      </>
    );
  }
  if (f >= b(CORE + 1)) return <AbsoluteFill style={{ background: paper }} />;

  const svg: CSSProperties = { position: "absolute", inset: 0 };
  const typeUnder = f >= b(AIM) - 3;
  return (
    <AbsoluteFill style={{ background: VOID, overflow: "hidden" }}>
      {/* The code slides over its own caption: the caption is under it from that beat on. */}
      {typeUnder ? numbers : null}
      <svg width={W} height={H} style={svg}>
        {slabEchoes}
        {microEcho}
        {big}
        {family}
      </svg>
      {typeUnder ? null : numbers}
      {slabLayer}
      {names}
      <svg width={W} height={H} style={svg}>
        {gate}
      </svg>
      {rule}
      <svg width={W} height={H} style={svg}>
        {finder}
      </svg>
    </AbsoluteFill>
  );
};

export default Scene;
