// The illustrated worlds of the dive, each with its portal: the giant's open mouth, the mouth's throat, a CRT floating in star space, the dot after "HELLO, WORLD", and a chip's die.
import type { FC } from "react";
import { useTime } from "../../core/time";
import { BlinkEyes, StarField, scatterStars } from "./life";
import { Inked, blob, inkLine, inkRect, smooth, useSvgId, type Pt } from "./ink";
import type { Portal, World } from "./dive";
import { CHUNK, DISPLAY, CORAL, CORAL_DEEP, FLESH, FLESH_DEEP, HOT, HOT_DEEP, INK, PAPER, PAPER_DIM, SKIN, SUN, VOID, VOID_SOFT, rng } from "./theme";

export const ellipseD = (cx: number, cy: number, rx: number, ry: number) =>
  `M${cx - rx} ${cy} a${rx} ${ry} 0 1 0 ${rx * 2} 0 a${rx} ${ry} 0 1 0 ${-rx * 2} 0Z`;

// Everything a world might show through a hole lies within ~1130 units of its centre, so bleed fills cover that and more.
const BLEED = { x: -1300, y: -1300, w: 4520, h: 3680 };
const Fill: FC<{ c: string }> = ({ c }) => <rect {...BLEED} width={BLEED.w} height={BLEED.h} fill={c} />;

// ---------- 1. The giant: a huge friendly face rising from the bottom; its open mouth is the portal ----------
const GIANT_MOUTH = { x: 960, y: 930, rx: 70, ry: 82 };
const tuft = (() => {
  const pts: Pt[] = [];
  const g = rng(21);
  for (let i = 0; i <= 8; i++) {
    const a = Math.PI * 1.17 + (i / 8) * Math.PI * 0.66;
    const r = i % 2 ? 175 + g() * 20 : 290 + g() * 40;
    pts.push([960 + Math.cos(a) * r * 0.95, 770 + Math.sin(a) * r]);
  }
  pts.push([1080, 800], [840, 800]);
  return smooth(pts);
})();
const giantBody = "M300 2400 L300 1180 C300 800 580 600 960 600 C1340 600 1620 800 1620 1180 L1620 2400 Z";

export const GiantFace: FC<{ lookAt?: { at: number; x: number; y: number }[] }> = ({ lookAt }) => (
  <g>
    <Inked d={tuft} fill={HOT} w={8} />
    <Inked d={giantBody} fill={SKIN} w={9} />
    {/* the shadow side is a flat of the paper shade, never a gradient */}
    <path d="M1420 760 C1560 860 1620 1000 1620 1180 L1620 2400 L1500 2400 L1500 1180 C1500 1000 1470 860 1420 760Z" fill={PAPER_DIM} />
    <Inked d={giantBody} w={9} />
    <ellipse cx={720} cy={935} rx={78} ry={42} fill={FLESH} />
    <ellipse cx={1200} cy={935} rx={78} ry={42} fill={FLESH} />
    <Inked d="M770 700 Q840 662 905 690" w={8} />
    <Inked d="M1015 690 Q1080 662 1150 700" w={8} />
    <BlinkEyes x={960} y={778} size={104} gap={1.75} lookAt={lookAt} seed={8} blinkEvery={3.2} />
    <path d={ellipseD(GIANT_MOUTH.x, GIANT_MOUTH.y, GIANT_MOUTH.rx, GIANT_MOUTH.ry)} fill={CORAL_DEEP} />
  </g>
);

export const GIANT: World = {
  name: "The giant",
  Back: () => (
    <g>
      <Fill c={PAPER} />
      <GiantFace />
    </g>
  ),
  Front: () => <Inked d={ellipseD(GIANT_MOUTH.x, GIANT_MOUTH.y, GIANT_MOUTH.rx, GIANT_MOUTH.ry)} w={9} />,
  portal: { x: GIANT_MOUTH.x, y: GIANT_MOUTH.y, r: GIANT_MOUTH.rx - 5, shape: ellipseD(GIANT_MOUTH.x, GIANT_MOUTH.y, GIANT_MOUTH.rx, GIANT_MOUTH.ry) },
};

// ---------- 2. Inside the mouth: coral gums, teeth, a flesh tongue, and the dark throat as the portal ----------
const THROAT = blob(960, 470, 205, 238, 9, 0.06, 16);
const ridges = (() => {
  const g = rng(31);
  const out: string[] = [];
  for (let i = 0; i < 18; i++) {
    const a = -Math.PI * 0.95 + (i / 17) * Math.PI * 0.9 + (g() - 0.5) * 0.12;
    const r0 = 300 + g() * 60;
    const r1 = r0 + 90 + g() * 120;
    const side = i % 2 ? 1 : -1;
    out.push(inkLine([960 + Math.cos(a) * r0, 470 + Math.sin(a) * r0 * 0.8], [960 + Math.cos(a + side * 0.08) * r1, 470 + Math.sin(a + side * 0.08) * r1 * 0.8], 40 + i, 0.08 * side));
  }
  for (let i = 0; i < 8; i++) {
    const side = i < 4 ? -1 : 1;
    const y = 300 + (i % 4) * 120;
    out.push(inkLine([960 + side * 430, y], [960 + side * (560 + g() * 120), y + 40 + g() * 40], 90 + i, 0.12));
  }
  return out;
})();
const tooth = (x: number, y: number, w: number, h: number, seed: number, up = false) => {
  const r = rng(seed);
  const tip = up ? y : y + h;
  const base = up ? y + h : y;
  const lobe = (r() - 0.5) * 10;
  return `M${x} ${base} L${x + 4} ${tip + (up ? 24 : -24)} Q${x + w * 0.25} ${tip + lobe} ${x + w / 2} ${tip + (up ? 10 : -10)} Q${x + w * 0.75} ${tip - lobe} ${x + w - 4} ${tip + (up ? 24 : -24)} L${x + w} ${base}Z`;
};

const MouthBack: FC = () => {
  const { t } = useTime();
  return (
    <g>
      <Fill c={CORAL_DEEP} />
      <Inked d={blob(960, 560, 1180, 720, 33, 0.04, 18)} fill={CORAL} w={8} />
      {ridges.map((d, i) => (
        <Inked key={i} d={d} w={5} />
      ))}
      {/* upper teeth hang along an arch; lower ones peek from behind the tongue */}
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
        const x = 330 + i * 160;
        const dip = 70 - Math.abs(i - 3.5) ** 2 * 6;
        return <Inked key={i} d={tooth(x, -60, 140, 170 + dip, 50 + i)} fill={SKIN} w={7} />;
      })}
      {[0, 1, 2].map((i) => (
        <Inked key={`l${i}`} d={tooth(150 + i * 150, 760 - i * 22, 135, 300, 60 + i, true)} fill={SKIN} w={7} />
      ))}
      {[0, 1, 2].map((i) => (
        <Inked key={`r${i}`} d={tooth(1635 - i * 150, 760 - i * 22, 135, 300, 70 + i, true)} fill={SKIN} w={7} />
      ))}
      <path d={THROAT} fill={VOID} />
      <Inked d={blob(960, 1160, 900, 380, 12, 0.035, 16)} fill={FLESH} w={9} />
      <path d={blob(1180, 1010, 260, 70, 13, 0.1)} fill={FLESH_DEEP} />
      <path d={blob(700, 1060, 200, 60, 14, 0.1)} fill={FLESH_DEEP} />
      <Inked d={inkLine([960, 840], [972, 1030], 15, 0.06)} w={7} />
      <Inked d={`M560 ${930 + Math.sin(t * 2) * 4} q60 -30 120 0 t120 0`} w={5} />
      <Inked d={`M1210 ${900 + Math.sin(t * 2 + 1) * 4} q50 -26 100 0 t100 0`} w={5} />
    </g>
  );
};

const MouthFront: FC = () => {
  const { t } = useTime();
  const sway = Math.sin(t * 1.7) * 4;
  return (
    <g>
      <Inked d={THROAT} w={9} />
      <g transform={`rotate(${sway} 960 160)`}>
        <Inked d="M915 150 C915 230 905 300 960 330 C1015 300 1005 230 1005 150 Z" fill={FLESH} w={8} />
      </g>
    </g>
  );
};

export const MOUTH: World = { name: "Inside the mouth", Back: MouthBack, Front: MouthFront, portal: { x: 960, y: 470, r: 182, shape: THROAT } };

// ---------- 3. Star space: a pink CRT floats among stars; its screen is the portal ----------
const SPACE_STARS = scatterStars(46, 11, [-700, -500, 3320, 2080], [960, 540, 520, 420], 10, 28);
const SPECKS = (() => {
  const g = rng(12);
  return Array.from({ length: 90 }, () => [-700 + g() * 3320, -500 + g() * 2080, 2 + g() * 3, g() * 6] as const);
})();
const SCREEN = inkRect(762, 352, 396, 296, 44, 5, 0);

const SpaceBack: FC = () => {
  const { t } = useTime();
  const wig = Math.sin(t * 3) * 6;
  return (
    <g>
      <Fill c={VOID} />
      {SPECKS.map(([x, y, r, ph], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill={PAPER} opacity={0.4 + 0.6 * Math.abs(Math.sin(t * 1.3 + ph))} />
      ))}
      <StarField stars={SPACE_STARS} outline={false} />
      <path d="M300 140 a110 110 0 1 0 0.1 0Z" fill={PAPER} />
      <circle cx={345} cy={225} r={104} fill={VOID} />
      <g transform="rotate(-18 1640 250)">
        <circle cx={1640} cy={250} r={72} fill={HOT} />
        <path d={`M1640 250 m-72 0 a72 72 0 0 0 144 0`} fill={HOT_DEEP} />
        <ellipse cx={1640} cy={250} rx={140} ry={30} fill="none" stroke={SUN} strokeWidth={12} />
        <path d="M1568 250 a72 72 0 0 1 144 0" fill={HOT} />
      </g>
      {/* the CRT */}
      <g transform={`rotate(${-wig / 2} 920 300)`}>
        <Inked d="M920 300 L860 190" w={7} stroke={PAPER} />
        <circle cx={860} cy={190} r={16} fill={SUN} />
      </g>
      <g transform={`rotate(${wig} 1000 300)`}>
        <Inked d="M1000 300 L1070 200" w={7} stroke={PAPER} />
        <circle cx={1070} cy={200} r={16} fill={SUN} />
      </g>
      <Inked d={inkRect(900, 728, 120, 52, 10, 6, 1)} fill={HOT_DEEP} w={7} />
      <Inked d={blob(960, 790, 190, 34, 7, 0.02)} fill={HOT} w={7} />
      <Inked d={inkRect(690, 290, 540, 450, 64, 3, 3)} fill={HOT} w={9} />
      <path d="M1176 312 C1214 330 1226 370 1226 420 L1226 650 C1226 700 1206 728 1170 738 L1176 312Z" fill={HOT_DEEP} />
      <path d={SCREEN} fill={VOID_SOFT} />
      <circle cx={1150} cy={694} r={13} fill={SUN} stroke={INK} strokeWidth={5} />
      <circle cx={1112} cy={694} r={13} fill={PAPER} stroke={INK} strokeWidth={5} />
      {[0, 1, 2, 3].map((i) => (
        <Inked key={i} d={`M${770 + i * 26} 680 L${770 + i * 26} 708`} w={6} />
      ))}
      {[0, 1, 2].map((i) => (
        <path key={i} d={`M${760 + i * 160} ${870 + (i % 2) * 18} q40 18 80 0`} stroke={PAPER} strokeWidth={6} strokeLinecap="round" fill="none" opacity={0.6} strokeDasharray="2 16" />
      ))}
    </g>
  );
};

const SpaceFront: FC = () => (
  <g>
    <Inked d={SCREEN} w={10} />
    <path d="M800 400 Q805 378 830 372" stroke={SKIN} strokeWidth={10} strokeLinecap="round" fill="none" opacity={0.85} />
    <path d="M800 432 L800 446" stroke={SKIN} strokeWidth={10} strokeLinecap="round" opacity={0.85} />
  </g>
);

export const SPACE: World = { name: "Star space", Back: SpaceBack, Front: SpaceFront, portal: { x: 960, y: 500, r: 142, shape: SCREEN } };

// ---------- 4. Inside the screen: a pink desktop, a code window, and the big dot after "HELLO, WORLD" ----------
const DOT = { x: 1252, y: 600, r: 38 };

const DeskBack: FC = () => {
  const { t } = useTime();
  const pid = useSvgId("ztw-dots");
  const cursor = Math.floor(t * 2) % 2 === 0;
  const bars: [number, number, number, string][] = [
    [420, 330, 120, HOT_DEEP], [560, 330, 200, CORAL], [780, 330, 90, INK],
    [460, 380, 160, FLESH], [640, 380, 260, HOT_DEEP], [920, 380, 110, SUN],
    [460, 430, 90, INK], [570, 430, 180, CORAL],
    [420, 730, 140, HOT_DEEP], [580, 730, 240, FLESH], [840, 730, 100, CORAL],
    [460, 780, 200, SUN], [680, 780, 130, INK],
  ];
  return (
    <g>
      <defs>
        <pattern id={pid} width={64} height={64} patternUnits="userSpaceOnUse">
          <circle cx={16} cy={16} r={6} fill={HOT_DEEP} />
          <circle cx={48} cy={48} r={6} fill={HOT_DEEP} />
        </pattern>
      </defs>
      <Fill c={HOT} />
      <rect {...BLEED} width={BLEED.w} height={BLEED.h} fill={`url(#${pid})`} />
      <Inked d={inkRect(352, 212, 1260, 700, 40, 8, 2)} fill={INK} w={9} />
      <Inked d={inkRect(330, 190, 1260, 700, 40, 7, 2)} fill={PAPER} w={9} />
      <path d="M332 268 L332 230 C332 205 350 192 372 192 L1548 192 C1570 192 1588 205 1588 230 L1588 268 Z" fill={SUN} />
      <Inked d="M332 268 L1588 268" w={8} />
      <Inked d={inkRect(330, 190, 1260, 700, 40, 7, 2)} w={9} />
      {[CORAL, SUN, PAPER].map((c, i) => (
        <circle key={i} cx={384 + i * 48} cy={230} r={15} fill={c} stroke={INK} strokeWidth={5} />
      ))}
      <text x={960} y={243} textAnchor="middle" fontFamily={CHUNK} fontSize={32} fill={INK}>hello.py</text>
      {bars.map(([x, y, w, c], i) => (
        <rect key={i} x={x} y={y - 13} width={w} height={26} rx={13} fill={c} stroke={INK} strokeWidth={4} />
      ))}
      <g fontFamily={DISPLAY} fontSize={170} textAnchor="end" letterSpacing={2}>
        <text x={1200 + 9} y={DOT.y + DOT.r + 9} fill={INK} stroke={INK} strokeWidth={15} strokeLinejoin="round">HELLO, WORLD</text>
        <text x={1200} y={DOT.y + DOT.r} fill={SUN} stroke={INK} strokeWidth={15} strokeLinejoin="round" paintOrder="stroke">HELLO, WORLD</text>
      </g>
      <circle cx={DOT.x + 9} cy={DOT.y + 9} r={DOT.r + 8} fill={INK} />
      <circle cx={DOT.x} cy={DOT.y} r={DOT.r} fill={VOID} />
      {cursor && <rect x={1316} y={DOT.y - 100} width={30} height={140} fill={INK} />}
    </g>
  );
};

export const DESK: World = {
  name: "Inside the screen",
  Back: DeskBack,
  Front: () => <circle cx={DOT.x} cy={DOT.y} r={DOT.r + 2} fill="none" stroke={INK} strokeWidth={9} />,
  portal: { x: DOT.x, y: DOT.y, r: DOT.r - 3, shape: ellipseD(DOT.x, DOT.y, DOT.r, DOT.r) },
};

// ---------- 5. The chip: a yellow board, ink traces with pink pulses, and the die window as the portal ----------
const DIE = { x: 960, y: 580, r: 118 };
const traces = (() => {
  const out: Pt[][] = [];
  for (let side = 0; side < 4; side++) {
    for (let i = 0; i < 6; i++) {
      const o = -175 + i * 70;
      const flip = i < 3 ? -1 : 1;
      const lead = 300 + (i % 3) * 90;
      const pts: Pt[] =
        side === 0 ? [[960 + o, 310], [960 + o, 310 - lead + 180], [960 + o + flip * 160, 310 - lead], [960 + o + flip * 160, -1200]]
        : side === 1 ? [[960 + o, 770], [960 + o, 770 + lead - 180], [960 + o + flip * 160, 770 + lead], [960 + o + flip * 160, 2300]]
        : side === 2 ? [[730, 540 + o], [730 - lead + 180, 540 + o], [730 - lead, 540 + o + flip * 160], [-1300, 540 + o + flip * 160]]
        : [[1190, 540 + o], [1190 + lead - 180, 540 + o], [1190 + lead, 540 + o + flip * 160], [3200, 540 + o + flip * 160]];
      out.push(pts);
    }
  }
  return out;
})();
const along = (pts: Pt[], u: number): Pt => {
  const lens = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i]![0], p[1] - pts[i]![1]));
  let rem = u * lens.reduce((a, b) => a + b, 0);
  for (let i = 0; i < lens.length; i++) {
    if (rem <= lens[i]!) {
      const k = rem / lens[i]!;
      return [pts[i]![0] + (pts[i + 1]![0] - pts[i]![0]) * k, pts[i]![1] + (pts[i + 1]![1] - pts[i]![1]) * k];
    }
    rem -= lens[i]!;
  }
  return pts[pts.length - 1]!;
};

const ChipBack: FC = () => {
  const { t } = useTime();
  return (
    <g>
      <Fill c={SUN} />
      {traces.map((pts, i) => (
        <g key={i}>
          <polyline points={pts.map((p) => p.join(",")).join(" ")} fill="none" stroke={INK} strokeWidth={10} strokeLinejoin="round" />
          <circle cx={pts[2]![0]} cy={pts[2]![1]} r={18} fill={HOT} stroke={INK} strokeWidth={6} />
        </g>
      ))}
      {traces.map((pts, i) => {
        // A pulse runs inward along every trace, offset per trace, toward the die.
        const u = 1 - ((t * 0.18 + i * 0.137) % 1);
        const [x, y] = along(pts.slice(0, 3), u);
        return <circle key={`p${i}`} cx={x} cy={y} r={11} fill={HOT} stroke={INK} strokeWidth={4} />;
      })}
      {[0, 1, 2, 3].flatMap((side) =>
        [0, 1, 2, 3, 4, 5].map((i) => {
          const o = -175 + i * 70;
          const [x, y, w, h] = side === 0 ? [960 + o - 14, 274, 28, 50] : side === 1 ? [960 + o - 14, 756, 28, 50] : side === 2 ? [694, 540 + o - 14, 50, 28] : [1176, 540 + o - 14, 50, 28];
          return <rect key={`${side}-${i}`} x={x} y={y} width={w} height={h} rx={6} fill={PAPER} stroke={INK} strokeWidth={5} />;
        }),
      )}
      <Inked d={inkRect(744, 324, 450, 450, 44, 21, 2)} fill={INK} w={8} />
      <Inked d={inkRect(730, 310, 460, 460, 44, 22, 2)} fill={VOID_SOFT} w={9} />
      <text x={960} y={410} textAnchor="middle" fontFamily={CHUNK} fontSize={50} fill={PAPER} letterSpacing={6}>CPU</text>
      <circle cx={DIE.x} cy={DIE.y} r={DIE.r + 18} fill={PAPER} stroke={INK} strokeWidth={8} />
      <circle cx={DIE.x} cy={DIE.y} r={DIE.r} fill={VOID} />
    </g>
  );
};

export const CHIP: World = {
  name: "The chip",
  Back: ChipBack,
  Front: () => <circle cx={DIE.x} cy={DIE.y} r={DIE.r} fill="none" stroke={INK} strokeWidth={9} />,
  portal: { x: DIE.x, y: DIE.y, r: DIE.r - 6, shape: ellipseD(DIE.x, DIE.y, DIE.r, DIE.r) },
};

// The whole loop in order: the chip's die opens back onto the giant, so `loop` dives can go on forever.
export const WORLDS: World[] = [GIANT, MOUTH, SPACE, DESK, CHIP];

// Swap a world's portal-side art while keeping its geometry (e.g. add a headline to the giant for a title).
export const withExtra = (w: World, Extra: FC, over = false): World =>
  over ? { ...w, Front: () => (<g>{w.Front && <w.Front />}<Extra /></g>) } : { ...w, Back: () => (<g><w.Back /><Extra /></g>) };

export type { Portal };
