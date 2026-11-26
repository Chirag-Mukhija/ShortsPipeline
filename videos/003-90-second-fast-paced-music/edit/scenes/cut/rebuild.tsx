// The answer (b160 to the end): the hook's torn code tips over, its codewords lift off, the 12 lost ones turn red and are restored in lime, its cells become a scratched disc that is read anyway and fly home, the wound is read from the inside out, and the film ends on paper with the patch in lime.
import type { CSSProperties, FC, ReactNode } from "react";
import { AbsoluteFill, Easing } from "remotion";
import type { SceneProps } from "@kit/contract";
import { clamp01, cueAt, useT } from "@kit/motion";
import { codewordAt, codewordCells, HOLE, HOLE_CODEWORDS, inHole, MATRIX, SIZE } from "./qr";

// The film's locked palette, for the colours `style` doesn't carry. Red is damage, lime is read or restored.
const VOID = "#0B0B0F";
const RED = "#FF3B2F";
const LIME = "#D7FF3A";

// The hook's own tile geometry.
const M = 29;
const QUIET = 4;
const N = SIZE + QUIET * 2;
const TILE = N * M;
const MID = TILE / 2;
const LEFT = 96;

// The track's beats b160 to b188 in this segment's local seconds (pnpm music:beats incompetech-laserpack, less 75.728); the named cues overwrite theirs.
const BEATS = [
  0, 0.469, 0.938, 1.407, 1.876, 2.345, 2.813, 3.282, 3.751, 4.22, 4.689, 5.148, 5.627, 6.096, 6.565, 7.034, 7.503, 7.972, 8.431, 8.91, 9.379, 9.848, 10.306, 10.775, 11.244, 11.723, 12.182, 12.591, 13.06,
];
const TIP = 1;
const BOXED = 2;
const ALL = 3;
const LOST = 4;
const LEVEL = 7;
const BARS = 8;
const RESTORE = 12;
const FLUSH = 15;
const SCRATCH = 16;
const SCAN = 18;
const PULSE = 22;
const RETURN = 25;
const PAPER = 28;
const NAMED: [string, number][] = [["lift", 0], ["red", LOST], ["bars", BARS], ["restore", RESTORE], ["scratch", SCRATCH], ["scan", SCAN], ["return", RETURN], ["paper", PAPER]];

const EXPO = Easing.bezier(0.16, 1, 0.3, 1);
const BACK = Easing.out(Easing.back(1.25));
const IN = Easing.in(Easing.quad);
const INOUT = Easing.inOut(Easing.cubic);
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const ramp = (f: number, a: number, b: number) => clamp01((f - a) / (b - a));
const hash = (a: number, b = 0) => {
  const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const mix = (a: string, b: string, p: number) => {
  const A = rgb(a);
  const B = rgb(b);
  return `#${A.map((v, i) => Math.round(lerp(v, B[i]!, clamp01(p))).toString(16).padStart(2, "0")).join("")}`;
};
// Eased progress of a move that lands around frame `at`: it starts two frames early so the eye gets the hit on the beat.
const move = (f: number, at: number, dur = 9, ease: (x: number) => number = EXPO, lead = 2) => ease(clamp01((f - at + lead) / dur));

// ---------- the code ----------

// Tile cells count from the quiet zone's corner; code cells sit QUIET further in.
const inCode = (r: number, c: number) => r >= QUIET && c >= QUIET && r < N - QUIET && c < N - QUIET;
const isInk = (r: number, c: number) => inCode(r, c) && MATRIX[r - QUIET]![c - QUIET]!;
const isHole = (r: number, c: number) => inCode(r, c) && inHole(r - QUIET, c - QUIET);
const wordAt = (r: number, c: number) => (inCode(r, c) ? codewordAt(r - QUIET, c - QUIET) : null);

const cell = (x: number, y: number, w = M, h = M) => `M${x} ${y}h${w}v${h}h${-w}z`;
// One path per colour; neighbouring cells overlap by a hair so no seam shows while the camera is between pixels.
const cellsPath = (on: (r: number, c: number) => boolean) => {
  let d = "";
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    if (!on(r, c)) continue;
    d += cell(c * M, r * M, c + 1 < N && on(r, c + 1) ? M + 1 : M, r + 1 < N && on(r + 1, c) ? M + 1 : M);
  }
  return d;
};
const INK_TORN = cellsPath((r, c) => isInk(r, c) && !isHole(r, c));
const INK_WHOLE = cellsPath(isInk);
const PATCH = cellsPath((r, c) => isHole(r, c) && !isInk(r, c));
const HOLE_CUT = HOLE.map(([r, c]) => cell((c + QUIET) * M, (r + QUIET) * M)).join("");
const TORN_TILE = `M0 0H${TILE}V${TILE}H0Z${HOLE_CUT}`;
const HX = (HOLE.reduce((s, [, c]) => s + c, 0) / HOLE.length + QUIET + 0.5) * M;
const HY = (HOLE.reduce((s, [r]) => s + r, 0) / HOLE.length + QUIET + 0.5) * M;

// The wound's edges, as the hook burns them, and the hole's walls the tipped-over view looks onto.
const EDGES = HOLE.flatMap(([hr, hc]) => {
  const [r, c] = [hr + QUIET, hc + QUIET];
  const x = c * M;
  const y = r * M;
  return [
    isHole(r - 1, c) ? "" : `M${x - 2} ${y}h${M + 4}`,
    isHole(r + 1, c) ? "" : `M${x - 2} ${y + M}h${M + 4}`,
    isHole(r, c - 1) ? "" : `M${x} ${y - 2}v${M + 4}`,
    isHole(r, c + 1) ? "" : `M${x + M} ${y - 2}v${M + 4}`,
  ].filter(Boolean);
}).join("");

const centreOf = (k: number) => {
  const list = codewordCells(k);
  return { x: (list.reduce((s, [, c]) => s + c, 0) / 8 + QUIET + 0.5) * M - MID, y: (list.reduce((s, [r]) => s + r, 0) / 8 + QUIET + 0.5) * M - MID };
};
const WORDS = [...new Set(Array.from({ length: SIZE * SIZE }, (_, i) => codewordAt(Math.floor(i / SIZE), i % SIZE)).filter((k): k is number => k !== null))].sort((a, b) => a - b);
const LOST_SET = new Set(HOLE_CODEWORDS);

const YAW = (-30 * Math.PI) / 180;
const PITCH = (51 * Math.PI) / 180;
const depthOf = (x: number, y: number) => x * Math.sin(YAW) + y * Math.cos(YAW);

// The lost codewords, back to front: the order they turn red and are restored in.
const LOST_ORDER = [...HOLE_CODEWORDS].sort((a, b) => depthOf(centreOf(a).x, centreOf(a).y) - depthOf(centreOf(b).x, centreOf(b).y));
const lostRank = new Map(LOST_ORDER.map((k, i) => [k, i]));

// The one codeword shown up close: an intact 2 x 4 block with a fair mix of modules, as near the wound's front as there is.
const HERO = (() => {
  let best = { k: -1, score: Infinity };
  for (const k of WORDS) {
    if (LOST_SET.has(k)) continue;
    const list = codewordCells(k);
    const rows = list.map(([r]) => r);
    const cols = list.map(([, c]) => c);
    const inks = list.filter(([r, c]) => MATRIX[r]![c]).length;
    if (Math.max(...rows) - Math.min(...rows) !== 3 || Math.max(...cols) - Math.min(...cols) !== 1 || inks < 2 || inks > 6) continue;
    const { x, y } = centreOf(k);
    const score = Math.hypot(x - (HX - MID), y - (HY - MID)) + (depthOf(x - (HX - MID), y - (HY - MID)) < 0 ? 200 : 0);
    if (score < best.score) best = { k, score };
  }
  return best.k;
})();

type Cell = { r: number; c: number; x: number; y: number; k: number; bit: number; ink: boolean; hero: boolean; lost: number; depth: number; open: { n: boolean; s: boolean; w: boolean; e: boolean } };
const CELLS: Cell[] = WORDS.flatMap((k) =>
  codewordCells(k).map(([cr, cc], bit) => {
    const [r, c] = [cr + QUIET, cc + QUIET];
    const x = c * M - MID;
    const y = r * M - MID;
    return {
      r, c, x, y, k, bit,
      ink: MATRIX[cr]![cc]!,
      hero: k === HERO,
      lost: lostRank.get(k) ?? -1,
      depth: depthOf(x + M / 2, y + M / 2),
      open: { n: wordAt(r - 1, c) !== k, s: wordAt(r + 1, c) !== k, w: wordAt(r, c - 1) !== k, e: wordAt(r, c + 1) !== k },
    };
  }),
).sort((a, b) => a.depth - b.depth);
const liftOrder = new Map([...WORDS].sort((a, b) => centreOf(a).y - centreOf(b).y).map((k, i) => [k, i / (WORDS.length - 1)]));

// ---------- camera ----------

type Pose = { s: number; yaw: number; pitch: number; fx: number; fy: number; fz: number; ax: number; ay: number };
const blend = (a: Pose, b: Pose, p: number): Pose => ({
  s: Math.exp(lerp(Math.log(a.s), Math.log(b.s), p)),
  yaw: lerp(a.yaw, b.yaw, p),
  pitch: lerp(a.pitch, b.pitch, p),
  fx: lerp(a.fx, b.fx, p),
  fy: lerp(a.fy, b.fy, p),
  fz: lerp(a.fz, b.fz, p),
  ax: lerp(a.ax, b.ax, p),
  ay: lerp(a.ay, b.ay, p),
});
const view = (p: Pose) => {
  const [cy, sy, cp, sp] = [Math.cos(p.yaw), Math.sin(p.yaw), Math.cos(p.pitch), Math.sin(p.pitch)];
  const at = (x: number, y: number, z: number): [number, number] => {
    const X = (x - p.fx) * cy - (y - p.fy) * sy;
    const Y = (x - p.fx) * sy + (y - p.fy) * cy;
    return [p.ax + p.s * X, p.ay + p.s * (Y * cp - (z - p.fz) * sp)];
  };
  const [e, f] = at(0, 0, 0);
  // A plane lying on the tile, in tile-centre coordinates.
  const matrix = `matrix(${p.s * cy} ${p.s * sy * cp} ${-p.s * sy} ${p.s * cy * cp} ${e} ${f})`;
  const quad = (pts: [number, number, number][]) => `M${pts.map((q) => at(...q).map((v) => v.toFixed(2)).join(" ")).join("L")}Z`;
  return { at, matrix, quad, cp, sp, cy };
};

// ---------- the disc ----------

// 12 rings of squares: the tile's white cells are dealt out to them from the inside, so the code and the disc are the same squares.
const PITCH_R = 27;
const RINGS = Array.from({ length: 12 }, (_, i) => 190 + i * PITCH_R);
const SQ = 23;
const NOTCH = (7 * Math.PI) / 180;
const HUB = 160;
const RIM = RINGS[11]! + 14;
type Dot = { r: number; c: number; tx: number; ty: number; tr: number; ta: number; ring: number; rad: number; ang: number; slot: boolean; home: boolean; hole: boolean; cut: boolean; id: number };
// The scratch, in the disc's own coordinates: a chord `off` from the middle, its normal pointing at `normal`.
const CHORD = (() => {
  const normal = (-78 * Math.PI) / 180;
  const off = 262;
  const half = Math.sqrt((RIM + 14) ** 2 - off ** 2);
  const [nx, ny] = [Math.cos(normal), Math.sin(normal)];
  return { nx, ny, off, half, x1: nx * off + ny * half, y1: ny * off - nx * half, x2: nx * off - ny * half, y2: ny * off + nx * half };
})();
const DOTS: Dot[] = (() => {
  const white: { r: number; c: number; tx: number; ty: number; tr: number; ta: number }[] = [];
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    if (isInk(r, c)) continue;
    const tx = (c + 0.5) * M - MID;
    const ty = (r + 0.5) * M - MID;
    white.push({ r, c, tx, ty, tr: Math.hypot(tx, ty), ta: Math.atan2(ty, tx) });
  }
  white.sort((a, b) => a.tr - b.tr || a.ta - b.ta);
  const slots = RINGS.map((rad) => Math.round((2 * Math.PI * rad) / PITCH_R));
  const total = slots.reduce((a, b) => a + b, 0);
  // A few cells may be left over on either side: spare cells vanish into the hub, spare slots grow in place.
  let next = Math.max(0, white.length - total);
  const out: Dot[] = white.slice(0, next).map((w, i) => ({ ...w, ring: -1, rad: 0, ang: w.ta, slot: false, home: true, hole: isHole(w.r, w.c), cut: false, id: i }));
  RINGS.forEach((rad, ring) => {
    const n = slots[ring]!;
    const take = white.slice(next, next + n).sort((a, b) => a.ta - b.ta);
    next += n;
    for (let i = 0; i < n; i++) {
      const ang = -Math.PI + ((i + 0.5) / n) * Math.PI * 2;
      const w = take[i];
      const [x, y] = [Math.cos(ang) * rad, Math.sin(ang) * rad];
      const away = Math.abs(x * CHORD.nx + y * CHORD.ny - CHORD.off);
      out.push({ ...(w ?? { r: 0, c: 0, tx: x, ty: y, tr: rad, ta: ang }), ring, rad, ang, slot: true, home: !!w, hole: !!w && isHole(w.r, w.c), cut: away < 17, id: out.length });
    }
  });
  return out;
})();

// A square of side `q` at (x, y), turned by `a`.
const turned = (x: number, y: number, q: number, a: number) => {
  const [cx, sx] = [(Math.cos(a) * q) / 2, (Math.sin(a) * q) / 2];
  const p = (dx: number, dy: number) => `${(x + dx * cx - dy * sx).toFixed(1)} ${(y + dx * sx + dy * cx).toFixed(1)}`;
  return `M${p(-1, -1)}L${p(1, -1)}L${p(1, 1)}L${p(-1, 1)}Z`;
};
const TURN = Math.PI * 2;
const wrap = (a: number) => ((a % TURN) + TURN) % TURN;
const shortest = (a: number) => wrap(a + Math.PI) - Math.PI;
const square90 = (a: number) => {
  const q = ((a % (Math.PI / 2)) + Math.PI / 2) % (Math.PI / 2);
  return q > Math.PI / 4 ? q - Math.PI / 2 : q;
};

// The closing fill, codeword by codeword from the wound's edge to its middle.
const FILL = [...HOLE_CODEWORDS]
  .sort((a, b) => Math.hypot(centreOf(b).x - HX + MID, centreOf(b).y - HY + MID) - Math.hypot(centreOf(a).x - HX + MID, centreOf(a).y - HY + MID))
  .flatMap((k) => codewordCells(k).map(([r, c]) => ({ r: r + QUIET, c: c + QUIET, ink: MATRIX[r]![c]! })));

// ---------- type ----------

type TextLine = { text: string; size: number; y: number; at: number; instant?: boolean };
// Lines that rise from behind their own floor on the beat; they leave on a hard cut.
const Card: FC<{ id: string; f: number; lines: TextLine[]; color: string; css: CSSProperties; W: number }> = ({ id, f, lines, color, css, W }) => (
  <>
    <defs>
      {lines.map((l, i) => (
        <clipPath key={i} id={`${id}${i}`}>
          <rect x={0} y={l.y - l.size * 0.9} width={W} height={l.size * 1.16} />
        </clipPath>
      ))}
    </defs>
    {lines.map((l, i) => {
      const p = l.instant ? 1 : move(f, l.at, 8, Easing.bezier(0.16, 1.25, 0.3, 1));
      if (p <= 0) return null;
      return (
        <g key={i} clipPath={`url(#${id}${i})`}>
          <text x={LEFT - l.size * 0.05} y={l.y + (1 - p) * l.size * 1.15} fontSize={l.size} fill={color} style={css}>
            {l.text}
          </text>
        </g>
      );
    })}
  </>
);
const stack = (lines: string[], size: number, bottom: number, at: number, lead = 0.96): TextLine[] => lines.map((text, i) => ({ text, size, y: bottom - (lines.length - 1 - i) * size * lead, at: at + i * 2 }));

// ---------- scene ----------

const LIFT = M * 1.9;
const HIGH = M * 4.6;
const THICK = 15;
const SLAB = 18;

const Scene: FC<SceneProps<Record<string, unknown>>> = ({ style, width: W, height: H, cues }) => {
  const { frame: f, t, fps } = useT();
  const seconds = [...BEATS];
  for (const [word, i] of NAMED) seconds[i] = cueAt(cues, word, BEATS[i]!);
  const B = seconds.map((s) => Math.round(s * fps));
  const b = (i: number) => B[i]!;
  const white = style.surface;
  const ink = style.ink;
  const css: CSSProperties = { fontFamily: style.display, fontWeight: 900, fontVariationSettings: '"wght" 900', letterSpacing: "-0.045em" };
  const RX = Math.round(W - 108 - MID);
  const CY = H / 2;
  const floor = H - 98;

  const flat: Pose = { s: 1, yaw: 0, pitch: 0, fx: 0, fy: 0, fz: 0, ax: RX, ay: CY };
  const rest: Pose = { s: 0.88, yaw: YAW, pitch: PITCH, fx: 0, fy: 0, fz: LIFT / 2, ax: 1236, ay: 540 };
  const morphIn = b(SCRATCH) - 10;
  const morphOut = b(RETURN) - 12;

  // T21 and its four plain bars, 7 : 15 : 25 : 30, one a beat; the last gets a frame.
  const levelCard = f >= b(LEVEL) && f < b(SCRATCH) ? (
    <>
      {[7, 15, 25, 30].map((h, i) => {
        const p = move(f, b(BARS + i), 8, BACK, 3);
        if (p <= 0) return null;
        const x = LEFT + i * 64;
        const base = 560;
        const tall = h * 10 * p;
        const o = i === 3 ? EXPO(ramp(f, b(BARS + 3) + 2, b(BARS + 3) + 9)) : 0;
        const g = 10 + 22 * (1 - o);
        return (
          <g key={h}>
            <rect x={x} y={base - tall} width={40} height={tall} fill={white} />
            {o > 0 ? <rect x={x - g} y={base - tall - g} width={40 + 2 * g} height={tall + 2 * g} fill="none" stroke={white} strokeWidth={4} /> : null}
          </g>
        );
      })}
      <Card id="rb-b" f={f} W={W} css={css} color={white} lines={stack(["Level H", "restores", "about 30%", "of codewords."], 96, floor, b(LEVEL))} />
    </>
  ) : null;

  let world: ReactNode = null;
  let overlay: ReactNode = null;

  if (f < morphIn) {
    // ---------- codewords ----------
    const hero = centreOf(HERO);
    const near: Pose = { s: 3.5, yaw: YAW, pitch: PITCH, fx: hero.x, fy: hero.y, fz: LIFT * 0.7, ax: 1240, ay: 590 };
    let pose = blend(flat, near, move(f, b(TIP), 12));
    pose = blend(pose, rest, move(f, b(ALL), 14));
    const v = view(pose);
    const tipped = pose.pitch / PITCH;

    const flush = 1 - IN(ramp(f, b(FLUSH) - 4, b(FLUSH)));
    const recoil = f >= b(FLUSH) ? 1 - EXPO(ramp(f, b(FLUSH), b(FLUSH) + 6)) : 0;

    // How far a codeword is off the grid. The close-up raises the eight bits of one, one a frame, then closes them into a block.
    const heroSolid = f >= b(BOXED) - 1;
    const liftAll = (k: number) => {
      const from = b(ALL) - 2 + liftOrder.get(k)! * 9;
      return BACK(ramp(f, from, from + 8)) * LIFT * flush;
    };
    const heroZ = (bit: number) => {
      if (!heroSolid) {
        const from = b(BOXED) - 11 + bit;
        return BACK(ramp(f, from, from + 4)) * LIFT * 0.62;
      }
      const up = lerp(LIFT * 0.62, LIFT * 1.25, move(f, b(BOXED), 7, BACK));
      return lerp(up, LIFT, move(f, b(ALL) + 3, 8)) * flush;
    };
    const lostState = (rank: number) => {
      const batch = Math.floor(rank / 4);
      const from = b(LOST + batch) - 2 + (rank % 4);
      if (f < from) return null;
      const back = b(RESTORE + batch) + (rank % 4);
      let z = BACK(ramp(f, from, from + 7)) * LIFT;
      const high = HIGH + (rank % 3) * M * 0.55;
      z = lerp(z, high, move(f, b(LEVEL) + (rank % 3), 9, BACK));
      const flip = Easing.inOut(Easing.quad)(ramp(f, back - 10, back - 3));
      if (f > back - 4) z = lerp(high, LIFT, IN(ramp(f, back - 4, back)));
      z += flip > 0 && flip < 1 ? Math.sin(Math.PI * flip) * 34 : 0;
      return { z: z * flush, flip, lime: flip >= 1, landed: f >= back };
    };

    // ---------- the ground: the tile, its edge, the wound's walls ----------
    const dim = ramp(f, b(TIP) + 2, b(BOXED)) * flush;
    const ground = mix(VOID, white, lerp(1, 0.44, dim));
    const wallS = mix(VOID, white, lerp(0.62, 0.34, dim));
    const wallW = mix(VOID, white, lerp(0.46, 0.24, dim));
    const thick = SLAB;
    let edgeS = "";
    let edgeW = "";
    if (tipped > 0.02) {
      edgeS += v.quad([[-MID, MID, 0], [MID, MID, 0], [MID, MID, -thick], [-MID, MID, -thick]]);
      edgeW += v.quad([[-MID, -MID, 0], [-MID, MID, 0], [-MID, MID, -thick], [-MID, -MID, -thick]]);
      for (const [hr, hc] of HOLE) {
        const [r, c] = [hr + QUIET, hc + QUIET];
        const [x, y] = [c * M - MID, r * M - MID];
        if (!isHole(r - 1, c)) edgeS += v.quad([[x, y, 0], [x + M, y, 0], [x + M, y, -thick], [x, y, -thick]]);
        if (!isHole(r, c + 1)) edgeW += v.quad([[x + M, y, 0], [x + M, y + M, 0], [x + M, y + M, -thick], [x + M, y, -thick]]);
      }
    }

    // ---------- the blocks ----------
    let groundInk = "";
    let groundPatch = "";
    let groundRed = "";
    let shadow = "";
    const up: { c: Cell; z: number; lost: ReturnType<typeof lostState>; loose: boolean }[] = [];
    const flying: { c: Cell; z: number; flip: number }[] = [];
    for (const c of CELLS) {
      if (c.lost >= 0) {
        const s = lostState(c.lost);
        if (!s) continue;
        if (s.flip > 0 && s.flip < 1) flying.push({ c, z: s.z, flip: s.flip });
        else if (s.z > 0.3) up.push({ c, z: s.z, lost: s, loose: false });
        else {
          if (!s.lime) groundRed += cell(c.c * M, c.r * M, M + 0.5, M + 0.5);
          else if (!c.ink) groundPatch += cell(c.c * M, c.r * M, M + 0.5, M + 0.5);
          if (s.lime && c.ink) groundInk += cell(c.c * M, c.r * M, M + 0.5, M + 0.5);
        }
        continue;
      }
      const z = c.hero ? heroZ(c.bit) : liftAll(c.k);
      if (z > 0.3) {
        up.push({ c, z, lost: null, loose: c.hero && !heroSolid });
        shadow += cell(c.c * M + z * 0.42, c.r * M + z * 0.26, M + 0.5, M + 0.5);
      } else if (c.ink) groundInk += cell(c.c * M, c.r * M, wordAt(c.r, c.c + 1) === c.k ? M + 1 : M, wordAt(c.r + 1, c.c) === c.k ? M + 1 : M);
    }
    const fixedInk = cellsPath((r, c) => isInk(r, c) && wordAt(r, c) === null);

    const tops = up.map(({ c, z, lost, loose }) => {
      const gap = 2.2;
      const o = loose ? { n: true, s: true, w: true, e: true } : c.open;
      const pull = loose ? 2.6 : gap;
      const x0 = c.x + (o.w ? pull : -0.3);
      const x1 = c.x + M - (o.e ? pull : -0.3);
      const y0 = c.y + (o.n ? pull : -0.3);
      const y1 = c.y + M - (o.s ? pull : -0.3);
      const low = Math.max(0, z - THICK);
      const tone = c.k % 2 ? 0.7 : 1;
      const bright = c.hero ? 1 : tone;
      const body = lost ? (lost.lime ? LIME : RED) : mix(VOID, white, bright);
      const top = lost && !lost.lime ? RED : c.ink ? ink : body;
      const wall = lost ? body : mix(VOID, white, bright * 0.9);
      const frame = lost ? (lost.lime ? LIME : white) : mix(VOID, white, bright);
      const edges = [
        o.n ? [[x0, y0], [x1, y0]] : null,
        o.s ? [[x0, y1], [x1, y1]] : null,
        o.w ? [[x0, y0], [x0, y1]] : null,
        o.e ? [[x1, y0], [x1, y1]] : null,
      ].filter((q): q is number[][] => !!q);
      return (
        <g key={`${c.r}-${c.c}`}>
          {o.s && z > low ? <path d={v.quad([[x0, y1, z], [x1, y1, z], [x1, y1, low], [x0, y1, low]])} fill={mix(VOID, wall, 0.62)} /> : null}
          {o.w && z > low ? <path d={v.quad([[x0, y0, z], [x0, y1, z], [x0, y1, low], [x0, y0, low]])} fill={mix(VOID, wall, 0.4)} /> : null}
          <path d={v.quad([[x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z]])} fill={top} stroke={top} strokeWidth={0.7} />
          {edges.length ? <path d={edges.map((q) => `M${q.map((pt) => v.at(pt[0]!, pt[1]!, z).map((n) => n.toFixed(2)).join(" ")).join("L")}`).join("")} fill="none" stroke={frame} strokeWidth={2 + 1.4 * (pose.s - 0.8)} strokeLinecap="square" /> : null}
        </g>
      );
    });

    // A block turning over in the air: red on one side, its restored bits on the other.
    const flips = flying.map(({ c, z, flip }) => {
      const ctr = centreOf(c.k);
      const a = Math.PI * flip;
      const facing = -Math.sin(a) * v.cy * v.sp + Math.cos(a) * v.cp;
      const turn = facing > 0 ? a : a - Math.PI;
      const pt = (x: number, y: number): [number, number, number] => [x, ctr.y + (y - ctr.y) * Math.cos(turn), z - (y - ctr.y) * Math.sin(turn)];
      const fill = facing > 0 ? RED : c.ink ? ink : LIME;
      const g = 0.3;
      return <path key={`${c.r}-${c.c}`} d={v.quad([pt(c.x - g, c.y - g), pt(c.x + M + g, c.y - g), pt(c.x + M + g, c.y + M + g), pt(c.x - g, c.y + M + g)])} fill={fill} stroke={fill} strokeWidth={0.7} />;
    });

    // ---------- the tally: one mark per lost codeword, laid along the tile's edge ----------
    const marks = LOST_ORDER.map((k, i) => {
      const s = lostState(i);
      if (!s) return null;
      const born = b(LOST + Math.floor(i / 4)) - 2 + (i % 4);
      const grow = BACK(ramp(f, born, born + 6)) * flush;
      if (grow <= 0) return null;
      const x = M * (5 + i * 2.3);
      return <rect key={k} x={x} y={TILE + M * 1.1} width={M * 1.15} height={M * 2 * grow} fill={s.landed ? LIME : RED} />;
    });

    const boxEcho = (f - b(BOXED)) / 12;
    world = (
      <g transform={recoil ? `translate(0 ${(7 * recoil).toFixed(2)})` : undefined}>
        <path d={edgeW} fill={wallW} />
        <path d={edgeS} fill={wallS} />
        <g transform={v.matrix}>
          <g transform={`translate(${-MID} ${-MID})`}>
            <path d={TORN_TILE} fill={ground} fillRule="evenodd" />
            <path d={groundPatch} fill={LIME} />
            <path d={groundRed} fill={RED} />
            <path d={fixedInk + groundInk} fill={ink} />
            <clipPath id="rb-ground"><path d={TORN_TILE} clipRule="evenodd" /></clipPath>
            {shadow ? <g clipPath="url(#rb-ground)"><path d={shadow} fill={VOID} opacity={0.42} /></g> : null}
            {marks}
          </g>
        </g>
        {tops}
        {flips}
        {boxEcho >= 0 && boxEcho < 1 ? (() => {
          const g = 74 * Easing.out(Easing.quad)(boxEcho) + 4;
          const z = heroZ(0);
          return <path d={v.quad([[hero.x - M - g, hero.y - 2 * M - g, z], [hero.x + M + g, hero.y - 2 * M - g, z], [hero.x + M + g, hero.y + 2 * M + g, z], [hero.x - M - g, hero.y + 2 * M + g, z]])} fill="none" stroke={white} strokeWidth={7 * (1 - boxEcho) + 0.5} />;
        })() : null}
      </g>
    );

    overlay = f < b(LEVEL) ? (
      <>
        {tipped > 0.02 && f < b(ALL) + 8 ? <rect x={0} y={floor - 372} width={724} height={H} fill={VOID} /> : null}
        <Card id="rb-a" f={f} W={W} css={css} color={white} lines={stack(["8 bits", "= 1", "codeword"], 128, floor, -2)} />
      </>
    ) : levelCard;
  } else if (f < b(RETURN)) {
    // ---------- the disc ----------
    const disc: Pose = { ...flat, ax: RX + 36 };
    const landed = blend(rest, disc, INOUT(ramp(f, morphIn - 1, b(SCRATCH) + 1)));
    const v = view(blend(landed, flat, INOUT(ramp(f, morphOut, b(RETURN)))));
    // The disc turns a notch a beat and stands still between: a smooth spin of this many edges reads as shimmer.
    const spin = [1, 2, 3, 4, 5, 6, 7].reduce((a, i) => a + move(f, b(SCRATCH + i), 8) * NOTCH, 0);
    const drawn = Easing.out(Easing.quad)(ramp(f, b(SCRATCH), b(SCRATCH) + 8));
    const heal = IN(ramp(f, morphOut - 6, morphOut));

    // The laser: one clockwise turn from nine o'clock, over the scratch and past it.
    const scanLen = 1.6;
    const scanP = clamp01((t - seconds[SCAN]!) / scanLen);
    const arm = Math.PI + scanP * TURN;
    const armOn = t >= seconds[SCAN]! - 0.2 && t < seconds[SCAN]! + scanLen + 0.2;
    const armGrow = EXPO(ramp(f, b(SCAN) - 5, b(SCAN)));
    const armGone = IN(clamp01((t - seconds[SCAN]! - scanLen) / 0.18));
    const armSpeed = TURN / scanLen;

    let whites = "";
    let limes = "";
    let hots = "";
    for (const d of DOTS) {
      const lag = d.slot ? (d.ring / 11) * 3 : 0;
      const into = INOUT(ramp(f, morphIn + lag, morphIn + lag + 9));
      const back = INOUT(ramp(f, morphOut + 3 - lag, morphOut + 12 - lag));
      const p = into * (1 - back);
      const along = d.cut ? d.ang : 0;
      // A module goes when the scratch's tip reaches it.
      const gx = Math.cos(along) * d.rad;
      const gy = Math.sin(along) * d.rad;
      const reach = d.cut ? ((gx - CHORD.x1) * (CHORD.x2 - CHORD.x1) + (gy - CHORD.y1) * (CHORD.y2 - CHORD.y1)) / (4 * CHORD.half * CHORD.half) : 2;
      const lost = d.cut && drawn >= reach;
      const ang = d.ang + spin;
      const onDisc = d.slot && !lost ? 1 : 0;
      const onTile = d.home && !(back > 0 && d.hole) ? 1 : 0;
      const q = lerp(M * onTile, SQ * onDisc, back > 0 || into < 1 ? p : 1);
      if (q < 0.6) continue;
      const rr = lerp(d.tr, d.rad, p);
      const aa = d.ta + shortest(ang - d.ta) * p;
      const x = p >= 1 ? Math.cos(ang) * d.rad : Math.cos(aa) * rr;
      const y = p >= 1 ? Math.sin(ang) * d.rad : Math.sin(aa) * rr;
      const path = turned(x, y, q + (p <= 0 ? 0.6 : 0), square90(ang) * p);
      const since = wrap(arm - ang) / armSpeed;
      const swept = scanP > 0 && d.slot && wrap(arm - ang) <= scanP * TURN + 1e-6 && since < 0.24 + 0.34 * hash(d.id, 3) ** 1.6 + (scanP >= 1 ? -(t - seconds[SCAN]! - scanLen) : 0);
      const pulseAt = b(PULSE) - 1 + d.ring * 1.1;
      const pulsed = d.slot && f >= pulseAt && f < pulseAt + 9 + 5 * hash(d.id, 5);
      const patch = d.hole && into < 0.55 && back === 0;
      const beside = !d.cut && d.slot && Math.abs(Math.cos(d.ang) * d.rad * CHORD.nx + Math.sin(d.ang) * d.rad * CHORD.ny - CHORD.off) < 40;
      if (swept || pulsed || patch) limes += path;
      else whites += path;
      if (beside && drawn > 0 && heal < 1) {
        const g = ((Math.cos(d.ang) * d.rad - CHORD.x1) * (CHORD.x2 - CHORD.x1) + (Math.sin(d.ang) * d.rad - CHORD.y1) * (CHORD.y2 - CHORD.y1)) / (4 * CHORD.half * CHORD.half);
        if (drawn >= g && !swept && !pulsed) hots += path;
      }
    }

    // What the scratch knocks out: squares thrown off along its normal.
    const chips = drawn > 0 ? DOTS.filter((d) => d.cut).map((d) => {
      const gx = Math.cos(d.ang) * d.rad;
      const gy = Math.sin(d.ang) * d.rad;
      const reach = ((gx - CHORD.x1) * (CHORD.x2 - CHORD.x1) + (gy - CHORD.y1) * (CHORD.y2 - CHORD.y1)) / (4 * CHORD.half * CHORD.half);
      const born = b(SCRATCH) + (1 - Math.sqrt(Math.max(0, 1 - reach))) * 8;
      const tau = (f - born) / fps;
      const life = 0.45 + 0.4 * hash(d.id, 11);
      if (tau < 0 || tau > life) return null;
      const dir = Math.atan2(CHORD.ny, CHORD.nx) + (hash(d.id, 12) - 0.5) * 1.5 + (hash(d.id, 15) < 0.25 ? Math.PI : 0);
      const run = ((260 + 900 * hash(d.id, 13)) * (1 - Math.exp(-3 * tau))) / 3;
      const q = SQ * (1 - (tau / life) ** 2);
      return <path key={d.id} d={turned(gx + Math.cos(dir) * run, gy + Math.sin(dir) * run + 300 * tau * tau, q, d.ang + (hash(d.id, 14) - 0.5) * 16 * tau)} fill={mix(white, RED, 0.35 + 0.65 * Math.exp(-5 * tau))} />;
    }) : null;

    const deg = (a: number) => (a * 180) / Math.PI;
    const tail = lerp(CHORD.x1, CHORD.x2, heal);
    const tailY = lerp(CHORD.y1, CHORD.y2, heal);
    const headX = lerp(CHORD.x1, CHORD.x2, drawn);
    const headY = lerp(CHORD.y1, CHORD.y2, drawn);
    const line = `M${tail} ${tailY}L${headX} ${headY}`;
    const hubP = Easing.out(Easing.cubic)(ramp(f, morphIn + 5, b(SCRATCH) + 3)) * (1 - ramp(f, morphOut, morphOut + 5));

    world = (
      <g transform={v.matrix}>
        {/* The clear middle of the disc, as two thin rings around the spindle hole. */}
        {hubP > 0 ? (
          <g fill="none" stroke={white}>
            <circle r={HUB * hubP} strokeWidth={4} opacity={0.4} />
            <circle r={66 * hubP} strokeWidth={12} />
          </g>
        ) : null}
        <path d={whites} fill={white} />
        <path d={hots} fill={RED} opacity={0.42} />
        <path d={limes} fill={LIME} />
        <g transform={`rotate(${deg(spin)})`}>
          {drawn > 0 && heal < 1 ? (
            <g fill="none" stroke={RED}>
              <path d={line} strokeWidth={44} opacity={0.13} />
              <path d={line} strokeWidth={24} opacity={0.26} />
              <path d={line} strokeWidth={8} />
            </g>
          ) : null}
          {chips}
        </g>
        {armOn && armGone < 1 ? (
          <g transform={`rotate(${deg(arm)})`}>
            <rect x={HUB} y={-22} width={(RIM + 22 - HUB) * armGrow * (1 - armGone)} height={44} fill={LIME} opacity={0.16} />
            <rect x={HUB} y={-3} width={(RIM + 22 - HUB) * armGrow * (1 - armGone)} height={6} fill={LIME} />
          </g>
        ) : null}
      </g>
    );
    overlay = f < b(SCRATCH) ? levelCard : <Card id="rb-c" f={f} W={W} css={css} color={white} lines={stack(["Reed-Solomon.", "CDs use the", "same family."], 86, floor, b(SCRATCH))} />;
  } else {
    // ---------- the closing read: from the wound outwards, the patch last ----------
    const from = b(RETURN) + 4;
    const span = 15;
    const far = Math.max(HX, TILE - HX, HY, TILE - HY);
    const front = ramp(f, from, from + span) * far;
    const limeOn = (r: number, c: number) => {
      if (isInk(r, c) || isHole(r, c)) return false;
      const dist = Math.max(Math.abs((c + 0.5) * M - HX), Math.abs((r + 0.5) * M - HY));
      const at = from + (dist / far) * span;
      return f >= at && f < at + 8 + 9 * hash(r * 3.1, c * 7.7) ** 1.6;
    };
    const lime = f >= from && f < from + span + 20 ? cellsPath(limeOn) : "";
    const fillFrom = b(RETURN) + 17;
    const fillLen = b(PAPER) - 5 - fillFrom;
    let inkFill = "";
    let limeFill = "";
    FILL.forEach((q, i) => {
      const at = fillFrom + (i / FILL.length) * (fillLen - 4);
      const p = (f - at) / 4;
      if (p < 0) return;
      const k = p >= 1 ? 1 : p < 0.5 ? lerp(0.3, 1.25, p * 2) : lerp(1.25, 1, p * 2 - 1);
      const d = cell((q.c + 0.5 - k / 2) * M, (q.r + 0.5 - k / 2) * M, k * M + 0.5, k * M + 0.5);
      if (q.ink) inkFill += d;
      else limeFill += d;
    });
    const heat = 0.5 * (1 - ramp(f, from - 1, from + 8));
    world = (
      <g transform={`translate(${RX - MID} ${CY - MID})`}>
        <path d={TORN_TILE} fill={white} fillRule="evenodd" />
        <path d={lime} fill={LIME} />
        <path d={INK_TORN} fill={ink} />
        {heat > 0.01 ? (
          <g fill="none" stroke={RED}>
            <path d={EDGES} strokeWidth={26} opacity={0.24 * heat} />
            <path d={EDGES} strokeWidth={12} opacity={0.5 * heat} />
            <path d={EDGES} strokeWidth={4} opacity={clamp01(heat * 2)} />
          </g>
        ) : null}
        <path d={limeFill} fill={LIME} />
        <path d={inkFill} fill={ink} />
        {f >= from && front < far ? (
          <g fill="none" stroke={LIME}>
            <clipPath id="rb-tile"><rect width={TILE} height={TILE} /></clipPath>
            <g clipPath="url(#rb-tile)">
              <rect x={HX - front} y={HY - front} width={front * 2} height={front * 2} strokeWidth={6} />
            </g>
          </g>
        ) : null}
      </g>
    );
    const small = 140;
    const large = 182;
    overlay = (
      <Card
        id="rb-d"
        f={f}
        W={W}
        css={css}
        color={white}
        lines={[
          { text: "Partly", size: small, y: floor - 2 * large * 0.95 - small * 0.95, at: b(RETURN) },
          { text: "missing.", size: small, y: floor - 2 * large * 0.95, at: b(RETURN) + 2 },
          { text: "It still", size: large, y: floor - large * 0.95, at: b(RETURN) + 4 },
          { text: "reads.", size: large, y: floor, at: b(RETURN) + 6 },
        ]}
      />
    );
  }

  // ---------- paper ----------
  const block = f < b(PAPER) - 2 ? 0 : f === b(PAPER) - 2 ? 0.34 : f === b(PAPER) - 1 ? 0.74 : 1;
  const paper = block > 0 ? (() => {
    const m = 24;
    const side = N * m;
    const left = W - 96 - side;
    const top = (H - side) / 2;
    const u = f - b(PAPER) + 2;
    const scale = u < 3 ? lerp(TILE / side, 1, IN(clamp01(u / 3))) : u < 5 ? lerp(1, 0.975, (u - 3) / 2) : lerp(0.975, 1, EXPO(clamp01((u - 5) / 8)));
    // The four lines are set to one width and stand exactly as tall as the code's ink.
    const a = 165;
    const z = 227;
    const base = top + (QUIET + SIZE) * m;
    const e = (f - b(PAPER)) / 14;
    return (
      <AbsoluteFill style={{ background: style.bg, clipPath: block < 1 ? `inset(0 ${(1 - block) * 100}% 0 0)` : undefined }}>
        <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
          {e > 0 && e < 1 ? (() => {
            const g = 90 * Easing.out(Easing.quad)(e);
            return <rect x={left - g} y={top - g} width={side + 2 * g} height={side + 2 * g} fill="none" stroke={ink} strokeWidth={6 * (1 - e) + 0.5} />;
          })() : null}
          <g transform={`translate(${left + side / 2} ${top + side / 2}) scale(${(scale * m) / M}) translate(${-MID} ${-MID})`}>
            <rect width={TILE} height={TILE} fill={white} stroke={ink} strokeWidth={(2 * M) / m} />
            <path d={PATCH} fill={LIME} />
            <path d={INK_WHOLE} fill={ink} />
          </g>
          <Card
            id="rb-e"
            f={f}
            W={W}
            css={css}
            color={ink}
            lines={[
              { text: "Partly", size: a, y: base - 1.86 * z - 0.93 * a, at: 0, instant: true },
              { text: "missing.", size: a, y: base - 1.86 * z, at: 0, instant: true },
              { text: "It still", size: z, y: base - 0.93 * z, at: 0, instant: true },
              { text: "reads.", size: z, y: base, at: 0, instant: true },
            ]}
          />
        </svg>
      </AbsoluteFill>
    );
  })() : null;

  return (
    <AbsoluteFill style={{ background: VOID, overflow: "hidden" }}>
      {block < 1 ? (
        <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
          {world}
          {overlay}
        </svg>
      ) : null}
      {paper}
    </AbsoluteFill>
  );
};

export default Scene;
