// The hook (b0 to b22): a real QR code fills the frame, a red beam tears 96 modules out of it, time stops, a lime scan line reads it anyway, the camera dives through the hole and lands on "1994. DENSO." built from modules.
import type { CSSProperties, FC } from "react";
import { AbsoluteFill, Easing, interpolate } from "remotion";
import type { SceneProps } from "@kit/contract";
import { clamp01, cueAt, useT } from "@kit/motion";
import { HOLE, inHole, MATRIX, SIZE } from "./qr";

// The film's locked palette, for the colours `style` doesn't carry. Red is only the beam and its glow, lime only the read.
const VOID = "#0B0B0F";
const RED = "#FF3B2F";
const LIME = "#D7FF3A";

const M = 29;
const QUIET = 4;
const N = SIZE + QUIET * 2;
const TILE = N * M;
const MID = TILE / 2;
const HOLE_N = HOLE.length;

const hash = (a: number, b = 0) => {
  const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const ramp = (t: number, a: number, b: number, ease?: (x: number) => number) => interpolate(t, [a, b], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const mix = (a: string, b: string, p: number) => {
  const A = rgb(a);
  const B = rgb(b);
  return `rgb(${A.map((v, i) => Math.round(lerp(v, B[i]!, clamp01(p)))).join(",")})`;
};

// Tile cells count from the quiet zone's corner; code cells sit QUIET further in.
const isInk = (r: number, c: number) => r >= QUIET && c >= QUIET && r < N - QUIET && c < N - QUIET && MATRIX[r - QUIET]![c - QUIET]!;
const isHole = (r: number, c: number) => r >= QUIET && c >= QUIET && r < N - QUIET && c < N - QUIET && inHole(r - QUIET, c - QUIET);

// Where the camera dives: the point in the hole with the most 16:9 room around it, and the scale at which that room fills the frame.
const DIVE = (() => {
  const solid: [number, number][] = [];
  const hr = HOLE.map(([r]) => r + QUIET);
  const hc = HOLE.map(([, c]) => c + QUIET);
  for (let r = Math.min(...hr) - 2; r <= Math.max(...hr) + 2; r++) for (let c = Math.min(...hc) - 2; c <= Math.max(...hc) + 2; c++) if (!isHole(r, c)) solid.push([r, c]);
  let best = { x: 0, y: 0, room: 0 };
  for (const [r, c] of HOLE) {
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      const x = (c + QUIET + (j + 0.5) / 4) * M;
      const y = (r + QUIET + (i + 0.5) / 4) * M;
      // Room is measured in half-frame-heights: how far the 16:9 window can open before it meets a solid cell.
      let room = Infinity;
      for (const [sr, sc] of solid) {
        const dx = Math.max(sc * M - x, x - (sc + 1) * M, 0) / (16 / 9);
        const dy = Math.max(sr * M - y, y - (sr + 1) * M, 0);
        room = Math.min(room, Math.max(dx, dy));
        if (room <= best.room) break;
      }
      if (room > best.room) best = { x, y, room };
    }
  }
  return best;
})();
const HX = (HOLE.reduce((s, [, c]) => s + c, 0) / HOLE_N + QUIET + 0.5) * M;
const HY = (HOLE.reduce((s, [r]) => s + r, 0) / HOLE_N + QUIET + 0.5) * M;

// The beam comes from the upper left; modules nearest its line go first, in waves 30 ms apart.
const BEAM_ANGLE = Math.atan2(780, 1350);
type Piece = { x: number; y: number; r: number; c: number; ink: boolean; delay: number; vx: number; vy: number; vz: number; ux: number; uy: number; spin: [number, number, number] };
const PIECES: Piece[] = HOLE.map(([r, c], i) => {
  const x = (c + QUIET + 0.5) * M;
  const y = (r + QUIET + 0.5) * M;
  const off = Math.abs(-(x - HX) * Math.sin(BEAM_ANGLE) + (y - HY) * Math.cos(BEAM_ANGLE));
  const a = (-54 + (hash(i, 1) - 0.5) * 78 + ((x - HX) / M) * 3.2) * (Math.PI / 180);
  const speed = 380 + 2100 * hash(i, 2) ** 1.5;
  return {
    x,
    y,
    r: r + QUIET,
    c: c + QUIET,
    ink: MATRIX[r]![c]!,
    delay: off,
    vx: Math.cos(a) * speed,
    vy: Math.sin(a) * speed,
    vz: 180 + 2300 * hash(i, 3) ** 2.6,
    ux: Math.cos(a),
    uy: Math.sin(a),
    spin: [(hash(i, 4) - 0.5) * 11, (hash(i, 5) - 0.5) * 11, (hash(i, 6) - 0.5) * 7] as [number, number, number],
  };
})
  .sort((a, b) => a.delay - b.delay)
  .map((p, i) => ({ ...p, delay: Math.floor((i / HOLE_N) * 11) * 0.03 }));
const pieceAt = new Map(PIECES.map((p) => [p.r * N + p.c, p]));

const SPARKS = Array.from({ length: 46 }, (_, i) => {
  const back = i % 4 === 0;
  const a = (back ? 205 + (hash(i, 21) - 0.5) * 50 : -48 + (hash(i, 21) - 0.5) * 110) * (Math.PI / 180);
  const v = 700 + 2200 * hash(i, 22);
  return { vx: Math.cos(a) * v, vy: Math.sin(a) * v, at: hash(i, 23) * 0.28, life: 0.22 + 0.3 * hash(i, 24), size: 4 + 7 * hash(i, 25) };
});

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
const INK_FIXED = cellsPath((r, c) => isInk(r, c) && !isHole(r, c));

type V3 = [number, number, number];
const spinOf = (ax: number, ay: number, az: number) => {
  const [cx, sx, cy, sy, cz, sz] = [Math.cos(ax), Math.sin(ax), Math.cos(ay), Math.sin(ay), Math.cos(az), Math.sin(az)];
  return ([x, y, z]: V3): V3 => {
    const y1 = y * cx - z * sx;
    const z1 = y * sx + z * cx;
    const x2 = x * cy + z1 * sy;
    const z2 = -x * sy + z1 * cy;
    return [x2 * cz - y1 * sz, x2 * sz + y1 * cz, z2];
  };
};
const A = M / 2;
const B = 5;
const FACES: { n: V3; pts: V3[]; side: boolean }[] = [
  { n: [0, 0, 1], side: false, pts: [[-A, -A, B], [A, -A, B], [A, A, B], [-A, A, B]] },
  { n: [0, 0, -1], side: false, pts: [[-A, -A, -B], [A, -A, -B], [A, A, -B], [-A, A, -B]] },
  { n: [1, 0, 0], side: true, pts: [[A, -A, -B], [A, A, -B], [A, A, B], [A, -A, B]] },
  { n: [-1, 0, 0], side: true, pts: [[-A, -A, -B], [-A, A, -B], [-A, A, B], [-A, -A, B]] },
  { n: [0, 1, 0], side: true, pts: [[-A, A, -B], [A, A, -B], [A, A, B], [-A, A, B]] },
  { n: [0, -1, 0], side: true, pts: [[-A, -A, -B], [A, -A, -B], [A, -A, B], [-A, -A, B]] },
];

// ---------- 1994 ----------
const DIGITS: Record<string, string[]> = {
  "1": ["..###..", ".####..", "#####..", "..###..", "..###..", "..###..", "..###..", "..###..", "..###..", "#######", "#######"],
  "9": [".######.", "########", "###..###", "###..###", "###..###", "########", ".#######", ".....###", "###..###", "########", ".######."],
  "4": ["###..###", "###..###", "###..###", "###..###", "###..###", "########", "########", "########", ".....###", ".....###", ".....###"],
  ".": ["...", "...", "...", "...", "...", "...", "...", "...", "###", "###", "###"],
};
const G = 40;
const YEAR = (() => {
  const out: { x: number; y: number; row: number; digit: number; k: number }[] = [];
  let col = 0;
  [..."1994."].forEach((ch, digit) => {
    const rows = DIGITS[ch]!;
    rows.forEach((line, row) => [...line].forEach((v, c) => v === "#" && out.push({ x: (col + c) * G, y: row * G, row, digit, k: out.length })));
    col += rows[0]!.length + 2;
  });
  return { cells: out, width: (col - 2) * G, height: 11 * G };
})();

const Scene: FC<SceneProps<Record<string, unknown>>> = ({ style, width: W, height: H, cues }) => {
  const { t, fps } = useT();
  const white = style.surface;
  const ink = style.ink;

  const HIT = cueAt(cues, "beam", 0.938);
  const FREEZE = cueAt(cues, "still", 1.876);
  const READ = cueAt(cues, "read", 3.751);
  const THROUGH = cueAt(cues, "through", 5.637);
  const YEAR_AT = cueAt(cues, "1994", 7.503);
  const DENSO_AT = cueAt(cues, "DENSO", 8.441);

  const display: CSSProperties = { fontFamily: style.display, fontWeight: 900, fontVariationSettings: '"wght" 900', letterSpacing: "-0.045em" };

  if (t >= YEAR_AT - 0.5 / fps) return <YearCard {...{ style, W, H, t, fps, YEAR_AT, DENSO_AT, display }} />;

  // The simulation's clock: it runs, stops dead on the fourth beat, and stays stopped (the loose pieces get their own exit).
  const brake = 0.12;
  const s = t < FREEZE - brake ? t : FREEZE - brake + (() => {
    const u = Math.min(t - (FREEZE - brake), brake);
    return u - (u * u) / (2 * brake);
  })();
  const u = Math.max(0, s - HIT);
  const hit = s >= HIT - 0.4 / fps;

  // ---------- camera ----------
  // The code fills the frame; the hit shoves it back and to the right, which opens the margin the type lands in.
  const shove = hit ? 1 - Math.exp(-8.5 * u) * Math.cos(5 * u) * (1 - ramp(u, 0.6, 0.85)) : 0;
  const push = 1 + (0.03 * Math.min(t, 7.5)) / 7.5;
  const restX = Math.round(W - 108 - MID);
  const base = push * lerp(1.085, 1, shove);
  const baseX = lerp(W / 2, restX, shove);
  const swing = hit ? Math.exp(-6 * u) * Math.sin(9 * u) * (1 - ramp(u, 0.6, 0.85)) : 0;

  const diveEnd = YEAR_AT;
  const diveP = ramp(t, THROUGH, diveEnd);
  const diveScale = ((H / 2) * 1.03) / DIVE.room / base;
  const Z = base * Math.exp(Math.log(diveScale) * diveP ** 2.1);
  const pan = ramp(t, THROUGH, THROUGH + 0.7, Easing.bezier(0.5, 0, 0.3, 1));
  const fx = lerp(baseX + (DIVE.x - MID) * base, W / 2, pan);
  const fy = lerp(H / 2 + (DIVE.y - MID) * base, H / 2, pan);
  const toX = (x: number) => fx + (x - DIVE.x) * Z;
  const toY = (y: number) => fy + (y - DIVE.y) * Z;

  // ---------- the tear ----------
  const gone = (p: Piece) => hit && u >= p.delay;
  const goneAt = (r: number, c: number) => {
    const p = pieceAt.get(r * N + c);
    return p ? gone(p) : false;
  };
  let holes = "";
  let still = "";
  for (const p of PIECES) {
    if (gone(p)) holes += cell(p.c * M, p.r * M);
    else if (p.ink) still += cell(p.c * M, p.r * M);
  }
  const tilePath = `M0 0H${TILE}V${TILE}H0Z${holes}`;

  // Wound heat: full at the hit, 25% through the breath, gone as the read starts.
  const cool = 1 - ramp(t, READ, READ + 0.45);
  const heat = hit ? lerp(0.25, 1, Math.exp(-3.4 * u)) * cool : 0;
  const ring1: string[] = [];
  const ring2: string[] = [];
  const burn: { d: string; k: number }[] = [];
  if (heat > 0.01) {
    for (let r = QUIET; r < N - QUIET; r++) for (let c = QUIET; c < N - QUIET; c++) {
      if (goneAt(r, c)) {
        const x = c * M;
        const y = r * M;
        if (!goneAt(r - 1, c)) burn.push({ d: `M${x - 2} ${y}h${M + 4}`, k: r * 67 + c });
        if (!goneAt(r + 1, c)) burn.push({ d: `M${x - 2} ${y + M}h${M + 4}`, k: r * 71 + c });
        if (!goneAt(r, c - 1)) burn.push({ d: `M${x} ${y - 2}v${M + 4}`, k: r * 73 + c });
        if (!goneAt(r, c + 1)) burn.push({ d: `M${x + M} ${y - 2}v${M + 4}`, k: r * 79 + c });
        continue;
      }
      let near = 9;
      for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) if (goneAt(r + dr, c + dc)) near = Math.min(near, Math.max(Math.abs(dr), Math.abs(dc)));
      if (near === 1) ring1.push(cell(c * M, r * M));
      else if (near === 2) ring2.push(cell(c * M, r * M));
    }
  }

  // ---------- the beam ----------
  const tip = { x: toX(HX), y: toY(HY) };
  const src = { x: -260, y: -190 };
  const len = Math.hypot(tip.x - src.x, tip.y - src.y);
  const ang = (Math.atan2(tip.y - src.y, tip.x - src.x) * 180) / Math.PI;
  const beamIn = ramp(t, HIT - 0.12, HIT, Easing.in(Easing.quad));
  const beamOut = ramp(s, HIT + 0.42, HIT + 0.66, Easing.in(Easing.cubic));
  const beamOn = beamIn > 0 && beamOut < 1;
  const beamW = 14 + 16 * (hit ? Math.exp(-14 * u) : 0);
  const beamFrom = beamOut * len;
  const beamTo = beamIn * len;
  const lit = hit ? (1 - beamOut) * (0.55 + 0.45 * Math.exp(-5 * u)) : 0;

  // ---------- flying modules ----------
  const exit = ramp(t, READ - 0.03, READ + 0.5);
  const flying = hit && exit < 1
    ? PIECES.filter(gone).map((p, i) => {
        const tau = u - p.delay;
        const drag = (1 - Math.exp(-2.5 * tau)) / 2.5;
        const out = exit * exit;
        const z = p.vz * drag + out * 500;
        const k = 1500 / Math.max(260, 1500 - z);
        const vx = HX - 70;
        const vy = HY + 130;
        const x = vx + (p.x + p.vx * drag + p.ux * out * 2500 - vx) * k;
        const y = vy + (p.y + p.vy * drag + p.uy * out * 2500 - vy) * k;
        const turn = drag * 1.35 + out * 0.9;
        const rot = spinOf(p.spin[0] * turn, p.spin[1] * turn, p.spin[2] * turn);
        return { p, i, x, y, z, k, rot, hot: (0.34 + 0.66 * Math.exp(-2.6 * tau)) };
      }).sort((a, b) => a.z - b.z)
    : [];
  const poly = (f: (typeof flying)[number], pts: V3[], dx = 0, dy = 0) =>
    `M${pts.map((pt) => {
      const [x, y, z] = f.rot(pt);
      const kk = f.k * (1 + (z * f.k) / 1500);
      return `${(f.x + x * kk + dx).toFixed(1)} ${(f.y + y * kk + dy).toFixed(1)}`;
    }).join("L")}Z`;
  const shadows = flying.map((f) => poly(f, FACES[0]!.pts, 5 + f.z * 0.07, 7 + f.z * 0.12)).join("");

  // ---------- the read ----------
  const wipeEnd = READ + 0.2;
  const readEnd = READ + 1.6;
  const tileLeft = toX(0);
  const lineLocal = ((t - wipeEnd) / (readEnd - wipeEnd)) * TILE;
  const wipeX = lerp(60, tileLeft, ramp(t, READ - 0.01, wipeEnd));
  const restLocal = Math.min(lineLocal, TILE + 26);
  const lineX = t < wipeEnd ? wipeX : t < THROUGH ? tileLeft + restLocal * Z : toX(TILE + 26);
  const lineOn = t >= READ - 0.01 && diveP < 0.75;
  const smear = 1400 * ramp(t, THROUGH + 0.1, THROUGH + 0.6, Easing.in(Easing.quad));
  const limeOn = (r: number, c: number) => {
    if (isInk(r, c) || isHole(r, c)) return false;
    const at = wipeEnd + ((c + 0.5) / N) * (readEnd - wipeEnd);
    return t >= at - 0.5 * ((readEnd - wipeEnd) / N) && t < at + 0.25 + 0.3 * hash(r * 3.1, c * 7.7) ** 1.6;
  };
  let lime = "";
  if (t > wipeEnd && t < readEnd + 0.65) {
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      if (!limeOn(r, c)) continue;
      const w = Math.min(M + (c + 1 < N && limeOn(r, c + 1) ? 1 : 0), Math.max(0, lineLocal - c * M));
      if (w > 0) lime += cell(c * M, r * M, w, r + 1 < N && limeOn(r + 1, c) ? M + 1 : M);
    }
  }
  const bloom = lineOn && t > wipeEnd && t < readEnd + 0.1;

  // ---------- the cards ----------
  const left = 96;
  const maxW = restX - MID - 16 - 40 - left;
  const size1 = Math.min(190, Math.floor(maxW / 4.17));
  const size2 = Math.min(250, Math.floor(maxW / 3.22));
  const baseline = H - 98;
  const cards = [
    { lines: ["Partly", "missing."], size: size1, from: 0, to: 1 },
    { lines: ["It still", "reads."], size: size2, from: 1, to: 2 },
  ];
  const cardOut = ramp(t, THROUGH, THROUGH + 0.3, Easing.in(Easing.quad));
  const split = t < READ - 0.01 ? -10 : t < wipeEnd ? wipeX : W;

  return (
    <AbsoluteFill style={{ background: VOID, overflow: "hidden" }}>
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <clipPath id="hk-old"><rect x={split} y={0} width={W} height={H} /></clipPath>
          <clipPath id="hk-new"><rect x={-10} y={0} width={Math.max(0, split + 10)} height={H} /></clipPath>
          {cards.flatMap((card, ci) => card.lines.map((_, li) => {
            const y = baseline - (1 - li) * card.size * 0.95;
            return <clipPath key={`${ci}${li}`} id={`hk-c${ci}${li}`}><rect x={0} y={y - card.size * 0.86} width={W} height={card.size * 1.1} /></clipPath>;
          }))}
        </defs>
        {cardOut < 1 && hit ? cards.map((card, ci) => (
          <g key={ci} clipPath={ci === 0 ? "url(#hk-old)" : "url(#hk-new)"} opacity={1 - cardOut} transform={`translate(${-140 * cardOut} 0)`}>
            {ci === 0 && split >= W ? null : ci === 1 && split < 0 ? null : card.lines.map((line, li) => {
              const y = baseline - (1 - li) * card.size * 0.95;
              // The first card rises line by line behind the tile that just left; the second is simply there, uncovered by the scan line.
              const p = ci === 0 ? ramp(t, HIT + 0.03 + li * 0.1, HIT + 0.28 + li * 0.1, Easing.bezier(0.16, 1.25, 0.3, 1)) : 1;
              return (
                <g key={li} clipPath={`url(#hk-c${ci}${li})`}>
                  <text x={left - card.size * 0.05} y={y + (1 - p) * card.size * 1.15} fill={white} fontSize={card.size} style={display}>{line}</text>
                </g>
              );
            })}
          </g>
        )) : null}
      </svg>

      <div style={{ position: "absolute", inset: 0, transform: Math.abs(swing) > 0.002 ? `perspective(2200px) rotateY(${(9 * swing).toFixed(3)}deg) rotateX(${(-4 * swing).toFixed(3)}deg)` : undefined, transformOrigin: `${baseX}px ${H / 2}px` }}>
        <svg width={W} height={H} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          <defs>
            <radialGradient id="hk-pool" gradientUnits="userSpaceOnUse" cx={HX} cy={HY} r={360}>
              <stop offset="0" stopColor={RED} stopOpacity={0.95} />
              <stop offset="0.45" stopColor={RED} stopOpacity={0.42} />
              <stop offset="1" stopColor={RED} stopOpacity={0} />
            </radialGradient>
            <clipPath id="hk-tile"><path d={tilePath} clipRule="evenodd" /></clipPath>
            <linearGradient id="hk-bloom"><stop offset="0" stopColor={LIME} stopOpacity={0} /><stop offset="1" stopColor={LIME} stopOpacity={0.7} /></linearGradient>
          </defs>
          <g transform={`translate(${fx} ${fy}) scale(${Z}) translate(${-DIVE.x} ${-DIVE.y})`}>
            <path d={tilePath} fill={white} fillRule="evenodd" />
            {lime ? <path d={lime} fill={LIME} /> : null}
            {lit > 0.01 ? <g clipPath="url(#hk-tile)"><circle cx={HX} cy={HY} r={360} fill="url(#hk-pool)" opacity={lit} /></g> : null}
            <path d={INK_FIXED + still} fill={ink} />
            {bloom ? <g clipPath="url(#hk-tile)"><rect x={lineLocal - 70} y={0} width={70} height={TILE} fill="url(#hk-bloom)" /></g> : null}
            {heat > 0.01 ? (
              <g>
                <path d={ring2.join("")} fill={RED} opacity={0.2 * heat} />
                <path d={ring1.join("")} fill={RED} opacity={0.62 * heat} />
                {burn.map((b, i) => {
                  const f = 0.72 + 0.28 * Math.sin(s * 19 + hash(b.k) * 6.28);
                  return (
                    <g key={i} fill="none" stroke={RED}>
                      <path d={b.d} strokeWidth={26} opacity={0.16 * heat * f} />
                      <path d={b.d} strokeWidth={12} opacity={0.3 * heat * f} />
                      <path d={b.d} strokeWidth={4} opacity={Math.min(1, 0.25 + heat) * f * cool} />
                    </g>
                  );
                })}
              </g>
            ) : null}
            {shadows ? <g clipPath="url(#hk-tile)"><path d={shadows} fill={VOID} opacity={0.3 * (1 - exit)} /></g> : null}
            {hit ? SPARKS.map((sp, i) => {
              const tau = u - sp.at;
              if (tau < 0 || tau > sp.life) return null;
              const d = (1 - Math.exp(-3 * tau)) / 3;
              const q = sp.size * (1 - tau / sp.life);
              return <rect key={i} x={HX + sp.vx * d - q / 2} y={HY + sp.vy * d + 420 * tau * tau - q / 2} width={q} height={q} fill={RED} />;
            }) : null}
            {flying.map((f) => {
              const faces = FACES.map((face) => ({ face, nz: f.rot(face.n)[2] })).filter((q) => q.nz > 0.02).sort((a, b) => a.nz - b.nz);
              return (
                <g key={f.i}>
                  {faces.map(({ face, nz }, j) => {
                    const own = f.p.ink ? ink : mix(VOID, white, face.side ? 0.55 + 0.25 * nz : 0.72 + 0.28 * nz);
                    const fill = face.side ? mix(f.p.ink ? ink : "#A9A9AD", RED, f.hot) : own;
                    return <path key={j} d={poly(f, face.pts)} fill={fill} stroke={RED} strokeOpacity={face.side ? 0 : f.hot} strokeWidth={1.6} strokeLinejoin="round" />;
                  })}
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <linearGradient id="hk-beam" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={RED} stopOpacity={0} />
            <stop offset="0.5" stopColor={RED} stopOpacity={0.62} />
            <stop offset="1" stopColor={RED} stopOpacity={0} />
          </linearGradient>
          <radialGradient id="hk-tip">
            <stop offset="0" stopColor={RED} stopOpacity={1} />
            <stop offset="0.3" stopColor={RED} stopOpacity={0.55} />
            <stop offset="1" stopColor={RED} stopOpacity={0} />
          </radialGradient>
          <linearGradient id="hk-smear"><stop offset="0" stopColor={LIME} stopOpacity={1} /><stop offset="1" stopColor={LIME} stopOpacity={0} /></linearGradient>
          <linearGradient id="hk-glow"><stop offset="0" stopColor={LIME} stopOpacity={0} /><stop offset="0.5" stopColor={LIME} stopOpacity={0.4} /><stop offset="1" stopColor={LIME} stopOpacity={0} /></linearGradient>
        </defs>
        {beamOn && beamTo > beamFrom ? (
          <g transform={`translate(${src.x} ${src.y}) rotate(${ang})`}>
            <rect x={beamFrom} y={-70} width={beamTo - beamFrom} height={140} fill="url(#hk-beam)" opacity={0.75} />
            <rect x={beamFrom} y={-beamW / 2} width={beamTo - beamFrom} height={beamW} fill={RED} />
            {hit ? <circle cx={beamTo} cy={0} r={90 + 150 * Math.exp(-9 * u)} fill="url(#hk-tip)" opacity={lit} /> : null}
          </g>
        ) : null}
        {lineOn ? (
          <g>
            {smear > 0 ? <rect x={lineX} y={0} width={smear} height={H} fill="url(#hk-smear)" opacity={0.85} /> : null}
            <rect x={lineX - 45} y={30} width={90} height={H - 60} fill="url(#hk-glow)" opacity={t < wipeEnd || t > readEnd ? 1 : 0} />
            <rect x={lineX - 3} y={30 - smear} width={6} height={H - 60 + smear * 2} fill={LIME} />
          </g>
        ) : null}
      </svg>
    </AbsoluteFill>
  );
};

// The downbeat: a hard cut to paper, modules rain into a loose 1994, the next beat stamps them onto the grid, DENSO. slams in under it.
const YearCard: FC<{ style: SceneProps<unknown>["style"]; W: number; H: number; t: number; fps: number; YEAR_AT: number; DENSO_AT: number; display: CSSProperties }> = ({ style, W, H, t, fps, YEAR_AT, DENSO_AT, display }) => {
  const STAMP = (YEAR_AT + DENSO_AT) / 2;
  const size = 220;
  const cap = size * 0.727;
  const gap = 84;
  const left = Math.round((W - YEAR.width) / 2);
  const top = Math.round((H - YEAR.height - gap - cap) / 2);
  const lock = ramp(t, STAMP - 2 / fps, STAMP);
  const stamp = t < STAMP - 2 / fps ? 0 : t < STAMP ? lock : 1 - ramp(t, STAMP, STAMP + 5 / fps, Easing.out(Easing.cubic));
  const slam = ramp(t, DENSO_AT - 4 / fps, DENSO_AT, Easing.in(Easing.quad));
  const knock = t < DENSO_AT ? 0 : 1 - ramp(t, DENSO_AT, DENSO_AT + 6 / fps, Easing.out(Easing.cubic));
  const push = 1 + 0.02 * ramp(t, YEAR_AT, YEAR_AT + 3.6);

  let crisp = "";
  const loose: { x: number; y: number; h: number; r: number; k: number }[] = [];
  for (const c of YEAR.cells) {
    const land = YEAR_AT + 0.1 + c.digit * 0.072 + (10 - c.row) * 0.008 + hash(c.k, 41) * 0.07;
    const fall = 0.2 + 0.16 * hash(c.k, 42);
    const p = clamp01((t - (land - fall)) / fall);
    if (t >= STAMP) {
      const right = YEAR.cells.some((o) => o.x === c.x + G && o.y === c.y);
      const below = YEAR.cells.some((o) => o.y === c.y + G && o.x === c.x);
      crisp += cell(c.x, c.y, right ? G + 1 : G, below ? G + 1 : G);
      continue;
    }
    const from = -top - 160 - 520 * hash(c.k, 43);
    const speed = p >= 1 ? 0 : (2 * p * (c.y - from)) / fall / fps;
    const off = 1 - lock;
    const jx = (hash(c.k, 44) - 0.5) * 22 * off;
    const jy = (hash(c.k, 45) - 0.5) * 22 * off;
    loose.push({ x: c.x + jx, y: lerp(from, c.y, p * p) + jy, h: G + speed * 0.55, r: p >= 1 ? (hash(c.k, 46) - 0.5) * 26 * off : 0, k: c.k });
  }

  return (
    <AbsoluteFill style={{ background: style.bg, overflow: "hidden" }}>
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        <g transform={`translate(${W / 2} ${H / 2}) scale(${push}) translate(${-W / 2} ${-H / 2})`}>
          <g transform={`translate(${left + YEAR.width / 2} ${top + YEAR.height / 2 - knock * 14}) scale(${1 + 0.055 * stamp}) translate(${-YEAR.width / 2} ${-YEAR.height / 2})`}>
            {crisp ? <path d={crisp} fill={style.ink} /> : null}
            {loose.map((c) => (
              <rect key={c.k} x={c.x} y={c.y + G - c.h} width={G} height={c.h} fill={style.ink} transform={c.r ? `rotate(${c.r} ${c.x + G / 2} ${c.y + G / 2})` : undefined} />
            ))}
          </g>
          {slam > 0 ? (
            <g transform={`translate(${left} ${top + YEAR.height + gap + cap}) scale(${1.5 - 0.5 * slam - 0.025 * Math.sin(Math.PI * knock)})`} opacity={clamp01(slam * 3)}>
              <text x={-size * 0.065} y={0} fontSize={size} fill={style.ink} style={display}>DENSO.</text>
            </g>
          ) : null}
        </g>
      </svg>
    </AbsoluteFill>
  );
};

export default Scene;
