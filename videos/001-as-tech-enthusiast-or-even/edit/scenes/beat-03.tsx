// Video 001, Beat 3 (1:58–2:55): is switching bad? A balance scale that never settles, the one 2002 study, founders not employees, and the real question, on one sketch page the camera tours.
import type { FC, ReactNode } from "react";
import { AbsoluteFill, Easing, interpolate, interpolateColors } from "remotion";
import { Camera, H, INOUT, Layer, MaskGrow, POP, W, cameraAt, clamp01, fade, ramp, useTime, type Point, type Rect, type Shot } from "@library/core";
import {
  At, Bulb, Chart, CloudBoxes, GRAIN, Hand, Laptop, NetGraph, Paper, PlayBtn, Robot, RotArrows, Sk, Stage, Stamp,
  arcPts, curvePts, ellPts, linePts, rectPts, smooth, wr, type P,
} from "@library/themes/hand-drawn";
import { STYLE } from "./style";

// Colours and fonts come from the video's shared style, never hardcoded, so a whole-video change reaches this beat.
const { accent: ACCENT, dot: DOT, ink: INK, paper: PAPER, pencil: PENCIL, sans: SANS } = STYLE;

const START = 118.11;
const END = 175.31;
// One page: the scale (left), the tally and the robot (middle), the 2002 paper, the career path, founder and banner (right).
const WORLD = { w: 6200, h: 3600 };
const lin = (x: number) => x;

// ---------- new piece: BalanceScale, a hand-drawn balance whose beam never settles ----------
const PV = { x: 1500, y: 1040 };
const ARM = 520;
const HANG = 470;
const D0 = 117.75;
const BLOCK_T = [121.5, 121.72, 121.94, 122.14, 122.34];
const CARD_T = [125.2, 125.48, 125.76, 126.04, 126.32, 126.62, 126.95];
const ARROWS_AT = 152.25;
const QMARK_AT = 156.5;
// Each landing kicks the beam; the kick dies out but the sway underneath never does.
const KICKS: [number, number][] = [
  [118.8, 4],
  ...BLOCK_T.map((b) => [b + 0.2, 3.2] as [number, number]),
  ...CARD_T.map((c) => [c + 0.3, -2.4] as [number, number]),
  [ARROWS_AT + 0.25, -3.5],
  [QMARK_AT + 0.1, 2.2],
];
// Degrees the left pan sits lower than the right.
const leanAt = (t: number) => {
  let v = 2.2 * Math.sin(t * 1.7) + 1.1 * Math.sin(t * 2.9 + 1.3);
  for (const b of BLOCK_T) v += 2.4 * ramp(t, b + 0.2, 0.4);
  for (const c of CARD_T) v -= 1.55 * ramp(t, c + 0.3, 0.4);
  for (const [k, a] of KICKS) {
    const tau = t - k;
    if (tau > 0) v += a * Math.exp(-3 * tau) * Math.sin(11 * tau);
  }
  return v;
};
const scaleAt = (lean: number) => {
  const a = (-lean * Math.PI) / 180;
  return { a, el: { x: PV.x - ARM * Math.cos(a), y: PV.y - ARM * Math.sin(a) }, er: { x: PV.x + ARM * Math.cos(a), y: PV.y + ARM * Math.sin(a) } };
};

// A pan hanging from a beam end: two strings, the load (in rim-centred coordinates), then the bowl in front of it.
const Pan: FC<{ e: { x: number; y: number }; p: number; seed: number; children?: ReactNode }> = ({ e, p, seed, children }) => {
  const x = e.x;
  const y = e.y + HANG;
  const bowl = curvePts(x - 190, y, x, y + 115, x + 190, y, 14);
  return (
    <>
      <Sk pts={linePts(e.x, e.y, x - 172, y, seed, 0.01, 6)} p={p} w={4} seed={seed} ghost={false} />
      <Sk pts={linePts(e.x, e.y, x + 172, y, seed + 1, 0.01, 6)} p={p} w={4} seed={seed + 1} ghost={false} />
      <Sk pts={ellPts(e.x, e.y + 4, 10, 10, seed + 2)} p={p} w={4.5} seed={seed + 2} ghost={false} />
      <g transform={`translate(${x} ${y})`}>{children}</g>
      <path d={`${smooth(bowl)} Z`} fill={PAPER} opacity={p} />
      <Sk pts={bowl} p={p} w={6.5} seed={seed + 3} />
      <Sk pts={linePts(x - 196, y, x + 196, y, seed + 4, 0.004, 8)} p={p} w={6} seed={seed + 4} ghost={false} />
    </>
  );
};

// Left pan: one tall stack of blocks dropping in, later "a year" written on the top block and a pencil question mark.
const BLOCKS = [{ w: 176, dx: 0 }, { w: 162, dx: 7 }, { w: 170, dx: -6 }, { w: 156, dx: 9 }, { w: 166, dx: -3 }];
const BH = 68;
const LeftLoad: FC = () => {
  const { t } = useTime();
  const top = BLOCKS[4]!;
  return (
    <>
      {BLOCKS.map((b, k) => {
        const at = BLOCK_T[k]!;
        if (t < at) return null;
        const e = ramp(t, at, 0.2, Easing.in(Easing.quad));
        const x0 = b.dx - b.w / 2;
        const y0 = 18 - BH * (k + 1) - 300 * (1 - e);
        return (
          <g key={k}>
            <rect x={x0} y={y0} width={b.w} height={BH} fill={PAPER} />
            <Sk pts={rectPts(x0, y0, b.w, BH, 3100 + k)} w={5.5} seed={3100 + k} />
            {k % 2 === 0 &&
              [0, 1, 2, 3].map((j) => (
                <Sk key={j} pts={linePts(x0 + b.w - 62 + j * 13, y0 + BH - 12, x0 + b.w - 44 + j * 13, y0 + 12, 3110 + k * 5 + j, 0.02, 2)} w={2.6} color={PENCIL} seed={3110 + k * 5 + j} ghost={false} />
              ))}
          </g>
        );
      })}
      <Hand x={top.dx} y={18 - BH * 5 + 46} text="a year" size={40} p={wr(t, 162.32, "a year")} opacity={1 - ramp(t, 166.4, 0.4)} />
      <Hand x={150} y={-205} text="?" size={130} color={PENCIL} rotate={8} p={ramp(t, QMARK_AT, 0.35)} />
    </>
  );
};

// Right pan: small cards dealt in, each a topic sampled (the chain's own doodles), later circled by spinning switch arrows.
const CARDS = [
  { x: -100, y: -24, r: -7 }, { x: 8, y: -22, r: 5 }, { x: 112, y: -26, r: -4 },
  { x: -50, y: -100, r: 9 }, { x: 62, y: -104, r: -6 },
  { x: -8, y: -178, r: 4 }, { x: 72, y: -186, r: 14 },
];
const ICONS: { s: number; draw: (p: number) => ReactNode }[] = [
  { s: 0.5, draw: (p) => <PlayBtn p={p} seed={3201} /> },
  { s: 0.55, draw: (p) => <Bulb p={p} /> },
  { s: 0.3, draw: (p) => <Laptop p={p} typed={() => p} /> },
  { s: 0.5, draw: (p) => <NetGraph p={p} /> },
  { s: 0.36, draw: (p) => <Chart p={p} /> },
  { s: 0.4, draw: (p) => <CloudBoxes p={p} /> },
  { s: 0.5, draw: (p) => <PlayBtn p={p} seed={3207} /> },
];
const RightLoad: FC = () => {
  const { t } = useTime();
  return (
    <>
      {CARDS.map((c, k) => {
        const at = CARD_T[k]!;
        if (t < at) return null;
        const e = ramp(t, at, 0.3, Easing.in(Easing.quad));
        const r = c.r + 32 * (1 - e) * (k % 2 ? 1 : -1);
        return (
          <g key={k} transform={`translate(${c.x + 60 * (1 - e)} ${c.y - 360 * (1 - e)}) rotate(${r})`}>
            <rect x={-58} y={-40} width={116} height={80} fill={PAPER} />
            <Sk pts={rectPts(-58, -40, 116, 80, 3220 + k)} w={3.6} seed={3220 + k} />
            <At x={0} y={0} s={ICONS[k]!.s}>{ICONS[k]!.draw(ramp(t, at + 0.22, 0.4))}</At>
          </g>
        );
      })}
      <At x={0} y={-112} s={1.45} r={(t - ARROWS_AT) * 140} o={ramp(t, ARROWS_AT, 0.2)}>
        <RotArrows r={112} p={ramp(t, ARROWS_AT, 0.5)} seed={3250} />
      </At>
    </>
  );
};

const BalanceScale: FC = () => {
  const { t } = useTime();
  const g = scaleAt(leanAt(t));
  const tau = t - 118.8;
  const shake = tau > 0 ? 6 * Math.exp(-12 * tau) * Math.sin(50 * tau) : 0;
  const d = (a: number, dur = 0.35) => ramp(t, a, dur, INOUT);
  const pPl = d(D0, 0.4);
  const pPost = d(D0 + 0.1);
  const pBeam = d(D0 + 0.25);
  const pPan = d(D0 + 0.4);
  const pGauge = d(D0 + 0.5);
  const tip: P = [PV.x + 118 * Math.sin(g.a), PV.y - 118 * Math.cos(g.a)];
  return (
    <g transform={`translate(0 ${shake})`}>
      <polygon points="1250,1920 1750,1920 1830,2050 1170,2050" fill={PAPER} opacity={pPl} />
      <Sk pts={[[1250, 1920], [1500, 1918], [1750, 1920], [1790, 1985], [1830, 2050], [1500, 2052], [1170, 2050], [1210, 1985], [1250, 1920], [1270, 1917]]} p={pPl} w={6.5} seed={3010} amp={1.6} />
      <Sk pts={linePts(1488, PV.y + 18, 1486, 1920, 3011, 0.01, 8)} p={pPost} w={6} seed={3011} />
      <Sk pts={linePts(1512, PV.y + 18, 1514, 1920, 3012, 0.01, 8)} p={pPost} w={6} seed={3012} />
      <Sk pts={arcPts(PV.x, PV.y, 132, 132, -2.1, -1.04, 14)} p={pGauge} w={3} color={PENCIL} seed={3013} ghost={false} />
      {[-0.42, -0.21, 0, 0.21, 0.42].map((da, k) => {
        const th = -Math.PI / 2 + da;
        return <Sk key={k} pts={linePts(PV.x + Math.cos(th) * 132, PV.y + Math.sin(th) * 132, PV.x + Math.cos(th) * (k === 2 ? 158 : 148), PV.y + Math.sin(th) * (k === 2 ? 158 : 148), 3014 + k, 0.02, 2)} p={pGauge} w={3} color={PENCIL} seed={3014 + k} ghost={false} />;
      })}
      <Sk pts={linePts(PV.x, PV.y, tip[0], tip[1], 3019, 0.01, 4)} p={pGauge} w={5} seed={3019} ghost={false} head />
      <Pan e={g.el} p={pPan} seed={3030}>
        <LeftLoad />
      </Pan>
      <Pan e={g.er} p={pPan} seed={3040}>
        <RightLoad />
      </Pan>
      <Sk pts={linePts(g.el.x, g.el.y, g.er.x, g.er.y, 3020, 0.004, 12)} p={pBeam} w={9} seed={3020} />
      <circle cx={PV.x} cy={PV.y} r={18} fill={PAPER} opacity={pBeam} />
      <Sk pts={ellPts(PV.x, PV.y, 18, 18, 3021)} p={pBeam} w={6} seed={3021} ghost={false} />
    </g>
  );
};

// The words around the scale, each faded once the camera has left so the return visit reads clean.
const ScaleWords: FC = () => {
  const { t } = useTime();
  return (
    <>
      <g opacity={1 - ramp(t, 124.15, 0.35)}>
        <Stamp x={1500} y={1990} text="NO STUDY FOUND" at={118.58} w={560} size={60} seed={3001} />
      </g>
      <Hand x={980} y={1790} text="one stack, a year" size={80} p={wr(t, 122.4, "one stack, a year")} opacity={fade(t, 122.4, 128.4)} />
      <Hand x={2020} y={1790} text="keep sampling" size={80} p={wr(t, 125.3, "keep sampling")} opacity={fade(t, 125.3, 128.4)} />
      <Hand x={1500} y={862} text="switching isn't proof you're failing" size={104} p={wr(t, 152.3, "switching isn't proof you're failing")} opacity={1 - ramp(t, 157.4, 0.4)} />
      <Hand x={990} y={1785} text="not proven safe either" size={60} p={wr(t, 158.5, "not proven safe either")} opacity={1 - ramp(t, 161.4, 0.4)} />
      {/* The margin note: an aside in pencil grey, pointing at "a year" on the stack. */}
      {/* Leaves as the pull to the tally starts, before the widening frame can clip it. */}
      <g opacity={1 - ramp(t, 166.05, 0.3)}>
        <Sk pts={curvePts(735, 1222, 800, 1180, 872, 1214, 12)} p={ramp(t, 163.4, 0.4)} w={3.6} color={PENCIL} seed={3060} head />
        <Hand x={560} y={1205} text="my judgment," size={52} color={PENCIL} rotate={-3} p={wr(t, 164.15, "my judgment,")} />
        <Hand x={566} y={1275} text="not a finding" size={52} color={PENCIL} rotate={-3} p={wr(t, 164.7, "not a finding")} />
      </g>
    </>
  );
};

// ---------- new piece: StudyPaper, a research paper that slides in from the margin and writes its cover ----------
const DOC = { x: 4000, y: 900 };
const StudyPaper: FC = () => {
  const { t } = useTime();
  if (t < 127.9) return null;
  const e = ramp(t, 128.0, 0.65, Easing.out(Easing.cubic));
  const x = DOC.x + 950 * (1 - e);
  const r = -2.5 + 12 * (1 - e);
  const outline: P[] = [[-280, -370], [210, -370], [280, -300], [280, 370], [-280, 370], [-280, -370], [-250, -371]];
  const lines = ramp(t, 128.35, 0.5);
  return (
    <g transform={`translate(${x} ${DOC.y}) rotate(${r})`}>
      <polygon points="-266,-352 224,-352 294,-282 294,388 -266,388" fill={INK} opacity={0.07} />
      <polygon points="-280,-370 210,-370 280,-300 280,370 -280,370" fill={PAPER} />
      <Sk pts={outline} w={4.5} seed={3301} />
      <Sk pts={[[210, -370], [212, -300], [280, -300]]} w={3.6} seed={3302} ghost={false} />
      {/* Title lines stay abstract scribbles: only the author, data source and year are real. */}
      <Sk pts={linePts(-232, -190, 180, -192, 3303, 0.01, 8)} p={lines} w={7} seed={3303} ghost={false} />
      <Sk pts={linePts(-232, -148, 70, -149, 3304, 0.01, 6)} p={lines} w={7} seed={3304} ghost={false} />
      {[100, 140, 180, 220, 260, 300].map((y, k) => (
        <Sk key={k} pts={linePts(-232, y, [210, 180, 220, 150, 200, 90][k]!, y, 3310 + k, 0.01, 6)} p={ramp(t, 128.5 + k * 0.06, 0.4)} w={3.4} color={PENCIL} seed={3310 + k} ghost={false} />
      ))}
      <Hand x={-232} y={-262} text="2002" size={72} font={SANS} weight={700} anchor="start" p={ramp(t, 129.95, 0.35)} />
      <Sk pts={ellPts(-140, -287, 122, 58, 3320, 0.5)} p={ramp(t, 130.25, 0.45, INOUT)} w={4.5} color={ACCENT} seed={3320} />
      <Hand x={-232} y={-40} text="Lazear" size={52} font={SANS} weight={700} anchor="start" p={wr(t, 132.05, "Lazear")} />
      <Hand x={-232} y={25} text="Stanford alumni data" size={34} font={SANS} weight={600} anchor="start" p={wr(t, 133.2, "Stanford alumni data")} />
      <Sk pts={linePts(-236, 46, 206, 44, 3321, 0.02, 8)} p={ramp(t, 134.3, 0.4)} w={3.6} seed={3321} ghost={false} />
    </g>
  );
};

// ---------- new piece: CareerPath, a zigzag path that draws through many different role boxes to a founder's desk ----------
const ROLES: P[] = [[3580, 1860], [3880, 2140], [4180, 1860], [4480, 2140], [4780, 1860]];
const PATH_AT = 135.55;
const PATH_DUR = 2.4;
const PATH: P[] = (() => {
  const keys: P[] = [[3350, 2010], ...ROLES, [4985, 1990]];
  const out: P[] = [];
  keys.slice(1).forEach((b, i) => {
    const a = keys[i]!;
    const seg = linePts(a[0], a[1], b[0], b[1], 3400 + i, 0.07, 6);
    out.push(...(i === 0 ? seg : seg.slice(1)));
  });
  return out;
})();
const roleShape = (k: number, cx: number, cy: number): P[][] => {
  if (k === 0) return [ellPts(cx, cy, 30, 30, 3420)];
  if (k === 1) return [[[cx - 32, cy + 26], [cx, cy - 28], [cx + 32, cy + 26], [cx - 32, cy + 26]]];
  if (k === 2) return [rectPts(cx - 28, cy - 28, 56, 56, 3422)];
  if (k === 3) return [[[cx - 42, cy + 12], [cx - 21, cy - 18], [cx, cy + 12], [cx + 21, cy - 18], [cx + 42, cy + 12]]];
  return [linePts(cx - 30, cy, cx + 30, cy, 3424, 0.03, 3), linePts(cx, cy - 30, cx, cy + 30, 3425, 0.03, 3)];
};
const CareerPath: FC = () => {
  const { t } = useTime();
  if (t < PATH_AT - 0.1) return null;
  const p = ramp(t, PATH_AT, PATH_DUR, lin);
  return (
    <>
      <Sk pts={PATH} p={p} w={4.5} seed={3401} head />
      {ROLES.map(([cx, cy], k) => {
        const at = PATH_AT + (PATH_DUR * (k + 1)) / 6 - 0.12;
        const s = ramp(t, at, 0.35, POP);
        if (s <= 0) return null;
        return (
          <At key={k} x={cx} y={cy} s={0.5 + 0.5 * s} o={clamp01(s * 3)}>
            <rect x={-95} y={-65} width={190} height={130} fill={PAPER} />
            <Sk pts={rectPts(-95, -65, 190, 130, 3410 + k)} w={4.5} seed={3410 + k} />
            {roleShape(k, 0, 0).map((pts, j) => (
              <Sk key={j} pts={pts} p={ramp(t, at + 0.12, 0.3)} w={4} color={PENCIL} seed={3430 + k * 3 + j} ghost={false} />
            ))}
          </At>
        );
      })}
      <Hand x={4180} y={1722} text="many different roles" size={64} p={wr(t, 137.1, "many different roles")} />
    </>
  );
};

// ---------- new piece: DeskFounder and Employee, two stick figures: one at a desk with a little flag, one standing with a badge ----------
const FounderDesk: FC = () => {
  const { t } = useTime();
  const p = ramp(t, 137.7, 0.6, INOUT);
  if (p <= 0) return null;
  const s = (k: number) => clamp01(p * 6 - k);
  const flag = ramp(t, 140.55, 0.4);
  return (
    <>
      <Sk pts={linePts(4985, 2118, 5445, 2120, 3501, 0.005, 8)} p={s(0)} w={3.4} color={PENCIL} seed={3501} ghost={false} />
      <Sk pts={[[5005, 1880], [5015, 1985], [5090, 1985]]} p={s(0)} w={4.5} seed={3502} amp={1.2} />
      <Sk pts={linePts(5020, 1985, 5016, 2112, 3503, 0.02, 3)} p={s(1)} w={4} seed={3503} ghost={false} />
      <Sk pts={linePts(5086, 1985, 5090, 2112, 3504, 0.02, 3)} p={s(1)} w={4} seed={3504} ghost={false} />
      <Sk pts={ellPts(5060, 1856, 26, 28, 3505)} p={s(1)} w={4.5} seed={3505} />
      <Sk pts={[[5058, 1885], [5055, 1935], [5052, 1980]]} p={s(2)} w={4.5} seed={3506} amp={1.2} />
      <Sk pts={[[5052, 1980], [5090, 1981], [5125, 1983], [5127, 2045], [5128, 2105]]} p={s(2)} w={4.5} seed={3507} amp={1.2} />
      <Sk pts={[[5057, 1908], [5108, 1948], [5172, 1964]]} p={s(3)} w={4.5} seed={3508} amp={1.2} />
      <Sk pts={linePts(5140, 1990, 5420, 1990, 3509, 0.005, 8)} p={s(3)} w={5.5} seed={3509} />
      <Sk pts={linePts(5162, 1990, 5162, 2116, 3510, 0.02, 3)} p={s(4)} w={4.5} seed={3510} ghost={false} />
      <Sk pts={linePts(5398, 1990, 5398, 2116, 3511, 0.02, 3)} p={s(4)} w={4.5} seed={3511} ghost={false} />
      <Sk pts={[[5180, 1985], [5250, 1985], [5310, 1985], [5326, 1935], [5342, 1884]]} p={s(5)} w={4.5} seed={3512} amp={1.2} />
      <Sk pts={linePts(5392, 1988, 5394, 1880, 3513, 0.02, 3)} p={flag} w={3.6} seed={3513} ghost={false} />
      <Sk pts={[[5394, 1882], [5446, 1898], [5394, 1916]]} p={ramp(t, 140.8, 0.3)} w={3.6} seed={3514} amp={1} ghost={false} />
    </>
  );
};

const Employee: FC = () => {
  const { t } = useTime();
  const p = ramp(t, 143.5, 0.6, INOUT);
  if (p <= 0) return null;
  const s = (k: number) => clamp01(p * 5 - k);
  const scrib: P[] = Array.from({ length: 11 }, (_, i) => [5585 + (i % 2) * 165 + (i % 3) * 4, 1815 + i * 31] as P);
  return (
    <>
      <Sk pts={linePts(5560, 2118, 5770, 2120, 3521, 0.005, 6)} p={s(0)} w={3.4} color={PENCIL} seed={3521} ghost={false} />
      <Sk pts={ellPts(5662, 1856, 26, 28, 3522)} p={s(0)} w={4.5} seed={3522} />
      <Sk pts={linePts(5661, 1885, 5660, 1995, 3523, 0.02, 4)} p={s(1)} w={4.5} seed={3523} />
      <Sk pts={[[5660, 1995], [5646, 2055], [5634, 2112]]} p={s(2)} w={4.5} seed={3524} amp={1.2} />
      <Sk pts={[[5660, 1995], [5674, 2055], [5688, 2112]]} p={s(2)} w={4.5} seed={3525} amp={1.2} />
      <Sk pts={[[5660, 1912], [5642, 1945], [5628, 1980]]} p={s(3)} w={4.5} seed={3526} amp={1.2} />
      <Sk pts={[[5660, 1912], [5680, 1945], [5694, 1978]]} p={s(3)} w={4.5} seed={3527} amp={1.2} />
      <Sk pts={rectPts(5674, 1980, 46, 34, 3528)} p={s(4)} w={4} seed={3528} ghost={false} />
      <Sk pts={rectPts(5666, 1926, 16, 20, 3529)} p={s(4)} w={3} color={PENCIL} seed={3529} ghost={false} />
      <Hand x={5662} y={2225} text="employees" size={56} p={wr(t, 144.95, "employees")} />
      <Sk pts={scrib} p={ramp(t, 145.35, 0.35, lin)} w={6} seed={3530} amp={3} ghost={false} />
      <Sk pts={linePts(5525, 2208, 5800, 2200, 3531, 0.02, 6)} p={ramp(t, 145.65, 0.25)} w={5} seed={3531} ghost={false} />
    </>
  );
};

const FounderWords: FC = () => {
  const { t } = useTime();
  const dim = interpolateColors(ramp(t, 143.6, 0.4), [0, 1], [INK, PENCIL]);
  return (
    <>
      <Hand x={5230} y={1680} text="strongest predictor:" size={56} color={dim} p={wr(t, 138.55, "strongest predictor:")} />
      <Hand x={5230} y={1757} text="entrepreneur" size={60} color={ACCENT} p={wr(t, 142.3, "entrepreneur")} />
      <Sk pts={ellPts(5222, 1990, 262, 186, 3540, 0.5)} p={ramp(t, 144.15, 0.45, INOUT)} w={4.5} color={ACCENT} seed={3540} />
      <Hand x={5215} y={2225} text="founders" size={56} p={wr(t, 144.25, "founders")} />
    </>
  );
};

// ---------- new piece: Banner, a pennant that unfurls from its pole, flutters, and gets struck through ----------
const Banner: FC = () => {
  const { t } = useTime();
  if (t < 146.1) return null;
  const e = ramp(t, 146.2, 0.6, Easing.out(Easing.cubic));
  const len = 800 * e;
  const n = 14;
  const wave = (u: number) => 12 * Math.sin(u * Math.PI * 2 + t * 2.4) * u;
  const topE: P[] = Array.from({ length: n + 1 }, (_, i) => [5040 + (len * i) / n, 1045 + wave(i / n)] as P);
  const botE: P[] = Array.from({ length: n + 1 }, (_, i) => [5040 + (len * (n - i)) / n, 1235 + wave((n - i) / n)] as P);
  const xe = 5040 + len;
  const ribbon: P[] = [...topE, [xe - 55 * e, 1140 + wave(1)], ...botE];
  return (
    <>
      <Sk pts={linePts(5040, 975, 5040, 1490, 3601, 0.01, 6)} p={ramp(t, 146.1, 0.25)} w={5.5} seed={3601} />
      <Sk pts={ellPts(5040, 963, 12, 12, 3602)} p={ramp(t, 146.15, 0.2)} w={4.5} seed={3602} ghost={false} />
      {e > 0.02 && (
        <>
          <path d={`${smooth(ribbon)} Z`} fill={PAPER} />
          <Sk pts={[...ribbon, [5040, 1045]]} w={4.5} seed={3603} amp={1.6} />
        </>
      )}
      <Hand x={5420} y={1172} text="generalists win" size={84} p={wr(t, 147.6, "generalists win")} />
      <Sk pts={linePts(5130, 1152, 5730, 1136, 3604, 0.02, 8)} p={ramp(t, 148.25, 0.3, INOUT)} w={9} color={ACCENT} seed={3604} ghost={false} />
      <Hand x={5470} y={1400} text="it doesn't say that." size={54} color={PENCIL} rotate={-2} p={wr(t, 149.1, "it doesn't say that.")} />
    </>
  );
};

// ---------- new piece: TallyCrossOut, a tally of switches scribbled out while "what I learned" writes beneath ----------
const Tally: FC = () => {
  const { t } = useTime();
  if (t < 167.7) return null;
  const scrib: P[] = Array.from({ length: 9 }, (_, i) => [2462 + (i % 2) * 206, 1300 + i * 20] as P);
  return (
    <>
      <Hand x={2560} y={1255} text="how many times" size={72} p={wr(t, 167.85, "how many times")} />
      {[2500, 2540, 2580, 2620].map((x, k) => (
        <Sk key={k} pts={linePts(x, 1312, x + 4, 1450, 3701 + k, 0.03, 4)} p={ramp(t, 168.05 + k * 0.17, 0.15)} w={5} seed={3701 + k} ghost={false} />
      ))}
      <Sk pts={linePts(2468, 1434, 2662, 1322, 3705, 0.03, 4)} p={ramp(t, 168.75, 0.18)} w={5} seed={3705} ghost={false} />
      <Sk pts={scrib} p={ramp(t, 169.0, 0.3, lin)} w={6} seed={3706} amp={3} ghost={false} />
      <Sk pts={linePts(2290, 1234, 2830, 1228, 3707, 0.02, 8)} p={ramp(t, 169.15, 0.25)} w={5} seed={3707} ghost={false} />
      <Sk pts={linePts(2560, 1488, 2562, 1562, 3708, 0.05, 4)} p={ramp(t, 169.6, 0.25)} w={4} color={PENCIL} seed={3708} head />
      <Hand x={2560} y={1655} text="what I learned" size={84} color={ACCENT} p={wr(t, 169.85, "what I learned")} />
      <Sk pts={curvePts(2250, 1686, 2560, 1670, 2870, 1682, 16)} p={ramp(t, 170.65, 0.45, INOUT)} w={5} color={ACCENT} seed={3709} />
    </>
  );
};

// ---------- new piece: RollingRobot, the robot on a body and two wheels that rolls in, rocks to a stop, blinks and lights its eye ----------
const RB = { x: 2900, y: 2420, s: 1.7, from: 3720, in: 171.3, stop: 172.1 };
const EYE = { x: RB.x + 14 * RB.s, y: RB.y - 6 * RB.s };
const robotX = (t: number) => interpolate(t, [RB.in, RB.stop], [RB.from, RB.x], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
const RollingRobot: FC = () => {
  const { t } = useTime();
  if (t < RB.in - 0.05) return null;
  const x = robotX(t);
  const speed = clamp01((robotX(t - 1 / 30) - x) / 40);
  const tau = t - RB.stop;
  // Leans back while rolling, tips forward on the stop and rocks out.
  const rock = tau < 0 ? 6 * speed : -8 * Math.exp(-4 * tau) * Math.sin(9 * tau);
  const spin = (-(RB.from - x) / (14 * RB.s)) * (180 / Math.PI);
  const blink = t > 173.45 && t < 173.6;
  const glow = ramp(t, 174.05, 0.3);
  return (
    <g transform={`translate(${x} ${RB.y}) scale(${RB.s})`}>
      {speed > 0.05 &&
        [-6, 26, 58].map((y, k) => (
          <Sk key={k} pts={linePts(52 + k * 6, y, 100 + k * 14, y, 3801 + k, 0.02, 3)} w={3} color={PENCIL} opacity={speed} seed={3801 + k} ghost={false} />
        ))}
      <Sk pts={linePts(-70, 108, 70, 108, 3805, 0.01, 6)} w={2.6} color={PENCIL} seed={3805} ghost={false} />
      <g transform={`rotate(${rock} 0 94)`}>
        <rect x={-30} y={34} width={60} height={46} fill={PAPER} />
        <Sk pts={rectPts(-30, 34, 60, 46, 3806)} w={4} seed={3806} />
        <Sk pts={ellPts(0, 57, 8, 8, 3807)} w={3} color={PENCIL} seed={3807} ghost={false} />
        <rect x={-36} y={-30} width={72} height={58} fill={PAPER} />
        <Robot p={1} />
        {blink && (
          <>
            <rect x={-24} y={-15} width={48} height={18} fill={PAPER} />
            <Sk pts={linePts(-20, -6, -8, -6, 3808, 0.05, 2)} w={4} seed={3808} ghost={false} />
            <Sk pts={linePts(8, -6, 20, -6, 3809, 0.05, 2)} w={4} seed={3809} ghost={false} />
          </>
        )}
        {glow > 0 && <circle cx={14} cy={-6} r={3 + 4 * glow} fill={ACCENT} opacity={glow} />}
      </g>
      {[-18, 18].map((wx, k) => (
        <g key={k} transform={`translate(${wx} 94) rotate(${spin})`}>
          <circle r={14} fill={PAPER} />
          <Sk pts={ellPts(0, 0, 14, 14, 3810 + k)} w={4} seed={3810 + k} ghost={false} />
          <Sk pts={linePts(-10, 0, 10, 0, 3812 + k, 0.02, 2)} w={2.6} seed={3812 + k} ghost={false} />
        </g>
      ))}
    </g>
  );
};

const RobotWords: FC = () => {
  const { t } = useTime();
  return <Hand x={RB.x} y={2228} text="where AI comes in" size={64} p={wr(t, 172.1, "where AI comes in")} />;
};

// ---------- the world, drawn in one SVG so every camera move is felt across the whole page ----------
const World3: FC = () => {
  const { t } = useTime();
  return (
    <svg width={WORLD.w} height={WORLD.h} viewBox={`0 0 ${WORLD.w} ${WORLD.h}`} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
      <BalanceScale />
      <ScaleWords />
      <StudyPaper />
      <CareerPath />
      <FounderDesk />
      {t >= 138 && <FounderWords />}
      <Employee />
      <Banner />
      <Tally />
      <RollingRobot />
      {t >= 172 && <RobotWords />}
    </svg>
  );
};

// ---------- the shot list (edit.json b03-s01..s14), with small creeps and punches on the key words ----------
const R = (x: number, y: number, w: number, h: number): Rect => ({ x, y, w, h });
const pt = (x: number, y: number, r: number): Point => ({ x, y, r });
const SHOTS: Shot[] = [
  // s01 "a study on it": born on the whole scale, push in as the stamp slams on its base; creep while it sways.
  { at: START, target: R(760, 800, 1480, 1300), size: 0.8 },
  { at: START + 0.01, target: R(860, 880, 1280, 1220), size: 0.9, move: "push", dur: 0.75 },
  { at: 119.4, target: R(900, 900, 1200, 1150), size: 0.92, move: "push", dur: 1.6 },
  // s02 "stick with one stack": glide onto the left pan as the blocks drop in from above.
  { at: 121.3, target: R(700, 1000, 560, 860), size: 0.9, move: "glide", dur: 0.7 },
  // s03 "keep sampling": pull back to both pans.
  { at: 124.4, target: R(640, 800, 1720, 1300), size: 0.92, move: "pull", dur: 1.1 },
  // s04 "the closest thing I found": whip right to the paper sliding in; punch on "2002".
  { at: 127.95, target: R(3600, 480, 800, 840), size: 0.85, move: "whip", dur: 0.32 },
  { at: 129.8, target: R(3700, 520, 600, 600), size: 0.8, move: "punch", dur: 0.3 },
  // s05 "An economist, Lazear": push onto the cover as the name and the data source write on.
  { at: 131.0, target: R(3740, 760, 520, 260), size: 0.7, move: "push", dur: 1.0 },
  // s06 "many different roles": glide down to the path, then ride along it.
  { at: 135.45, target: R(3280, 1650, 1300, 650), size: 0.9, move: "glide", dur: 0.8 },
  { at: 136.4, target: R(3830, 1650, 1300, 650), size: 0.9, move: "glide", dur: 1.6 },
  // s07 "strongest predictor": push onto the founder at the path's end.
  { at: 138.25, target: R(5000, 1580, 480, 600), size: 0.9, move: "push", dur: 0.9 },
  // s08 "founders, not employees": pull back to take in the employee beside him.
  { at: 143.4, target: R(4950, 1580, 950, 760), size: 0.9, move: "pull", dur: 1.2 },
  // s09 "generalists win": hard cut to the banner, punch on the strike.
  { at: 146.15, target: R(5000, 1000, 900, 440), size: 0.82, move: "cut" },
  { at: 148.2, size: 0.95, move: "punch", dur: 0.3 },
  // s10 "switching isn't proof": the long glide back across the page to the scale.
  { at: 150.3, target: R(640, 670, 1720, 1400), size: 0.92, move: "glide", dur: 1.2 },
  // s11 "not proven safe either": glide onto the one-stack pan.
  { at: 155.6, target: R(600, 1060, 800, 820), size: 0.88, move: "glide", dur: 0.8 },
  // s12 "my judgment, not a finding": push onto the margin note.
  { at: 160.4, target: R(320, 1100, 820, 300), size: 0.85, move: "push", dur: 1.1 },
  // s13 "how many times I switched": pull wide for the tally, push in on "what I learned".
  { at: 165.9, target: R(650, 800, 2300, 1300), size: 0.92, move: "pull", dur: 1.3 },
  { at: 169.3, target: R(2150, 1140, 850, 650), size: 0.85, move: "push", dur: 0.8 },
  // s14 "where AI comes in": whip down to the robot rolling in, then push into its eye for the mask.
  { at: 171.2, target: R(2500, 2120, 800, 540), size: 0.85, move: "whip", dur: 0.32 },
  { at: 174.35, target: pt(EYE.x, EYE.y, 60), size: 0.55, move: "push", dur: 0.45 },
];
const CAM_OPTS = { world: WORLD, breath: 1.6 };
const MASK_AT = 174.6;
const MASK_DUR = 0.7;

// The page itself lives in the world, so every camera move is felt in the dot grid.
const PageWorld: FC = () => (
  <AbsoluteFill style={{ width: WORLD.w, height: WORLD.h, backgroundColor: PAPER, backgroundImage: `radial-gradient(${DOT} 1.7px, transparent 2.2px)`, backgroundSize: "40px 40px", backgroundPosition: "20px 20px" }} />
);

const Scene3: FC = () => (
  <AbsoluteFill style={{ backgroundColor: PAPER }}>
    <Camera {...CAM_OPTS} shots={SHOTS} motionBlur={{ samples: 8, shutter: 180, threshold: 80 }}>
      <Layer depth={1}>
        <PageWorld />
        <World3 />
      </Layer>
    </Camera>
    {/* Atmosphere in front of the lens: grain and vignette do not zoom. */}
    <AbsoluteFill style={{ backgroundImage: GRAIN, opacity: 0.35, mixBlendMode: "multiply", pointerEvents: "none" }} />
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 45%, transparent 55%, ${INK}1c 100%)`, pointerEvents: "none" }} />
  </AbsoluteFill>
);

const Beat03: FC = () => {
  const { t } = useTime();
  if (t < START || t >= END) return null;
  const mp = clamp01((t - MASK_AT) / MASK_DUR);
  if (mp <= 0) return <Scene3 />;
  // Hand-off: clean paper grows out of the robot's lit eye, so Beat 4 starts on a fresh page.
  const cam = cameraAt(t, SHOTS, CAM_OPTS);
  const o = { x: W / 2 + (EYE.x - cam.x) * cam.s, y: H / 2 + (EYE.y - cam.y) * cam.s };
  const e = Easing.inOut(Easing.cubic)(mp);
  const cover = Math.max(Math.hypot(o.x, o.y), Math.hypot(W - o.x, o.y), Math.hypot(o.x, H - o.y), Math.hypot(W - o.x, H - o.y)) * 1.03;
  const r = cover * (0.15 * e + 0.85 * e * e);
  return (
    <AbsoluteFill>
      <MaskGrow p={mp} a={<Scene3 />} b={<Paper />} origin={o} push={0.04} />
      <Stage>
        <Sk pts={ellPts(o.x, o.y, r, r, 3901, 0.3, 40)} w={6} color={ACCENT} seed={3901} opacity={1 - ramp(t, END - 0.2, 0.15)} ghost={false} />
      </Stage>
    </AbsoluteFill>
  );
};

export default Beat03;
