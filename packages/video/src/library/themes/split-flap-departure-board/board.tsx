// The board itself: the dormant station wall with idle flips, the metal frame with screws and glass glare, status lamps, the tilt-and-push camera, and the columned departure board.
import type { FC, ReactNode } from "react";
import { AbsoluteFill, random, useCurrentFrame } from "remotion";
import { H, W } from "../../core/video";
import { INOUT, ramp } from "../../core/time";
import { CellView } from "./cell";
import { flapState, type CellSpec } from "./flap";
import { Nudge, rowSpecs, FlapRow, type Align, type Then } from "./rows";
import { AMBER, BEZEL_HI, BEZEL_LO, BOARD, FPS, HINGE, INK, PAINT, TONE, WALL, pitch, rowWidth, type Tone } from "./theme";

// Dormant board pitch: small enough to read as texture, never as content.
const BH = 64;
const BW = 40;
const BG = 7;

const IDLE_DRUM = " ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

// Idle life: one dim cell somewhere flips a few faces and back to blank every 40–90 frames (seeded).
const idleEvents = (f: number) => {
  const out: { start: number; col: number; row: number; ch: string; hold: number; k: number }[] = [];
  let t = 12;
  for (let k = 0; t < f + 1; k++) {
    const hold = 26 + Math.floor(random(`idle-h-${k}`) * 40);
    if (f - t < hold + 40) {
      out.push({ start: t, k, hold, col: Math.floor(random(`idle-c-${k}`) * Math.floor(W / (BW + BG))), row: Math.floor(random(`idle-r-${k}`) * Math.floor(H / (BH + BG))), ch: "ABCDEFGHJKLMNPRSTUVWXYZ0123456789"[Math.floor(random(`idle-ch-${k}`) * 33)]! });
    }
    t += 40 + Math.floor(random(`idle-g-${k}`) * 51);
  }
  return out;
};

export const StationWall: FC = () => {
  const f = useCurrentFrame();
  const cols = Math.floor(W / (BW + BG));
  const ox = (W - cols * (BW + BG) + BG) / 2;
  const oy = (H - Math.floor(H / (BH + BG)) * (BH + BG) + BG) / 2;
  // A soft light sweep crosses the whole wall every 7 s.
  const sweep = ((f + 40) % 210) / 210;
  return (
    <AbsoluteFill style={{ backgroundColor: WALL }}>
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <pattern id="sf-dormant" x={ox} y={oy} width={BW + BG} height={BH + BG} patternUnits="userSpaceOnUse">
            <rect x={0} y={0} width={BW} height={BH / 2 - 1} rx={3} fill="#17181B" />
            <rect x={0} y={BH / 2 + 1} width={BW} height={BH / 2 - 1} rx={3} fill="#141518" />
            <rect x={0} y={BH / 2 - 1} width={BW} height={2} fill={HINGE} />
          </pattern>
          <radialGradient id="sf-light" cx="50%" cy="-10%" r="85%">
            <stop offset="0" stopColor="#FFD9A0" stopOpacity={0.07} />
            <stop offset="1" stopColor="#FFD9A0" stopOpacity={0} />
          </radialGradient>
          <radialGradient id="sf-vig" cx="50%" cy="50%" r="75%">
            <stop offset="0.55" stopColor="#000" stopOpacity={0} />
            <stop offset="1" stopColor="#000" stopOpacity={0.7} />
          </radialGradient>
        </defs>
        <rect width={W} height={H} fill="url(#sf-dormant)" opacity={0.85} />
        <rect width={W} height={H} fill="url(#sf-light)" />
      </svg>
      {idleEvents(f).map((e) => {
        const spec: CellSpec = { seed: 500 + e.k, drum: IDLE_DRUM, keys: [{ f: e.start, ch: e.ch, laps: 1, cap: 3 }, { f: e.start + e.hold, ch: " ", cap: 3 }] };
        return (
          <div key={e.k} style={{ position: "absolute", inset: 0, opacity: 0.32 }}>
            <CellView s={flapState(spec, f)} h={BH} x={ox + e.col * (BW + BG)} y={oy + e.row * (BH + BG)} slot={false} />
          </div>
        );
      })}
      <div style={{ position: "absolute", inset: 0, background: `linear-gradient(105deg, rgba(255,240,210,0) ${sweep * 160 - 40}%, rgba(255,240,210,0.035) ${sweep * 160 - 25}%, rgba(255,240,210,0) ${sweep * 160 - 10}%)` }} />
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        <rect width={W} height={H} fill="url(#sf-vig)" />
      </svg>
    </AbsoluteFill>
  );
};

const Screw: FC<{ x: number; y: number; seed: number }> = ({ x, y, seed }) => (
  <div style={{ position: "absolute", left: x - 7, top: y - 7, width: 14, height: 14, borderRadius: 7, background: "radial-gradient(circle at 35% 30%, #5A5D63, #23252A 70%)", boxShadow: "0 1px 1px rgba(0,0,0,0.8)" }}>
    <div style={{ position: "absolute", left: 2, top: 6, width: 10, height: 2, background: "#111", transform: `rotate(${random(`screw-${seed}`) * 180}deg)` }} />
  </div>
);

// A frame-driven lamp: off, lit, or blinking at 1 Hz; it glows in its tone.
export const Lamp: FC<{ x: number; y: number; on: number; tone?: Tone; r?: number }> = ({ x, y, on, tone = "amber", r = 9 }) => {
  const c = TONE[tone];
  return (
    <div style={{ position: "absolute", left: x - r, top: y - r, width: r * 2, height: r * 2, borderRadius: r, background: on > 0.02 ? c : "#2A2B2F", opacity: 0.35 + 0.65 * on, boxShadow: on > 0.02 ? `0 0 ${r * 2.2 * on}px ${c}, inset 0 -2px 3px rgba(0,0,0,0.35)` : "inset 0 2px 3px rgba(0,0,0,0.6)" }} />
  );
};
export const blink = (f: number, from: number) => (f < from ? 0 : Math.floor((f - from) / 15) % 2 === 0 ? 1 : 0.15);

export type FrameProps = { x: number; y: number; w: number; h: number; at?: number; label?: string; sub?: string; glare?: boolean; seed?: number; children?: ReactNode };

// The board's housing: brushed bezel, four screws, a painted header band and a glass glare that sweeps on its own clock.
export const BoardFrame: FC<FrameProps> = ({ x, y, w, h, at = 0, label, sub, glare = true, seed = 1, children }) => {
  const f = useCurrentFrame();
  const on = ramp(f / FPS, at, 0.3);
  const b = 14;
  const band = label || sub ? 70 : 0;
  const g = (((f + seed * 37) % 240) / 240) * 1.8 - 0.4;
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h, opacity: on, transform: `scale(${0.985 + 0.015 * on})` }}>
      <div style={{ position: "absolute", inset: 0, borderRadius: 16, background: `linear-gradient(170deg, ${BEZEL_HI}, ${BEZEL_LO} 60%, #0F1012)`, boxShadow: "0 40px 90px rgba(0,0,0,0.75), 0 2px 0 rgba(255,255,255,0.06) inset" }} />
      <div style={{ position: "absolute", left: b, top: b, right: b, bottom: b, borderRadius: 8, background: BOARD, boxShadow: "inset 0 4px 14px rgba(0,0,0,0.9)" }} />
      {band > 0 && (
        <div style={{ position: "absolute", left: b + 34, right: b + 34, top: b + 6, height: band, display: "flex", alignItems: "center", justifyContent: "space-between", fontFamily: PAINT, fontWeight: 700, fontSize: 34, letterSpacing: "0.2em", borderBottom: `2px solid #24262A` }}>
          <span style={{ color: AMBER }}>{label}</span>
          <span style={{ color: INK, opacity: 0.85 }}>{sub}</span>
        </div>
      )}
      <Screw x={b / 2 + 1} y={b / 2 + 1} seed={seed} />
      <Screw x={w - b / 2 - 1} y={b / 2 + 1} seed={seed + 1} />
      <Screw x={b / 2 + 1} y={h - b / 2 - 1} seed={seed + 2} />
      <Screw x={w - b / 2 - 1} y={h - b / 2 - 1} seed={seed + 3} />
      <div style={{ position: "absolute", left: b, top: b + band, right: b, bottom: b }}>{children}</div>
      {glare && (
        <div style={{ position: "absolute", left: b, top: b, right: b, bottom: b, borderRadius: 8, overflow: "hidden", pointerEvents: "none" }}>
          <div style={{ position: "absolute", inset: 0, background: `linear-gradient(115deg, rgba(255,255,255,0) ${g * 100 - 12}%, rgba(255,255,255,0.07) ${g * 100}%, rgba(255,255,255,0) ${g * 100 + 6}%)` }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(rgba(255,255,255,0.025), rgba(255,255,255,0) 40%)" }} />
        </div>
      )}
    </div>
  );
};

// Camera: a slight backward tilt that eases toward flat while the board pushes in 4 % across the hold.
export const BoardCam: FC<{ at?: number; dur?: number; tilt?: number; push?: number; children: ReactNode }> = ({ at = 0, dur = 4, tilt = 6, push = 0.04, children }) => {
  const f = useCurrentFrame();
  const e = ramp(f / FPS, at, dur, INOUT);
  return (
    <AbsoluteFill style={{ perspective: 2600 }}>
      <AbsoluteFill style={{ transform: `rotateX(${tilt * (1 - 0.5 * e)}deg) scale(${1 + push * e})`, transformOrigin: "50% 50%" }}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---- Departure board: painted column headers over rows of flap columns ----
export type Column = { label: string; cols: number; align?: Align; tone?: Tone; drum?: string };
export type BoardRow = { cells: string[]; tones?: (Tone | undefined)[]; at?: number; then?: { at: number; cells: string[]; tones?: (Tone | undefined)[] }[]; nudge?: number[] };

export const boardLayout = (columns: Column[], h: number, colGap = pitch(h)) => {
  const xs: number[] = [];
  let x = 0;
  for (const c of columns) {
    xs.push(x);
    x += rowWidth(h, c.cols) + colGap;
  }
  return { xs, width: x - colGap };
};

export type DepartureProps = {
  columns: Column[];
  rows: BoardRow[];
  h: number;
  at: number;
  title?: string;
  sub?: string;
  // Rows: the board's 6 f row stagger unless given.
  rowStagger?: number;
  rowGap?: number;
  focus?: { row: number; at: number; tone?: Tone }[];
  out?: number;
  seed?: number;
  // Re-scramble every row to its `then` dataset with 3–5 random flaps per cell.
  scramble?: number;
  y?: number;
};

// Specs for every cell of the board, so the same timing feeds the cells and the click track.
export const departureSpecs = (p: DepartureProps): CellSpec[][][] =>
  p.rows.map((r, ri) => {
    const at = r.at ?? p.at + 0.5 + (ri * (p.rowStagger ?? 6)) / FPS;
    let gi = 0;
    return p.columns.map((c, ci) => {
      const lead = gi;
      gi += c.cols;
      // A re-scramble hits the whole row at once (cells still stagger 2 f), so a dataset change reads as one event.
      const thens: Then[] = (r.then ?? []).map((t) => ({ at: t.at, text: t.cells[ci] ?? "", tone: t.tones?.[ci] ?? c.tone, scramble: p.scramble ?? 3 }));
      return rowSpecs({ text: r.cells[ci] ?? "", cols: c.cols, align: c.align, at: at + (lead * 2) / FPS, tone: r.tones?.[ci] ?? c.tone, then: thens, out: p.out !== undefined ? p.out + ((p.rows.length - 1 - ri) * 3) / FPS : undefined, seed: (p.seed ?? 1) * 1000 + ri * 50 + ci, drum: c.drum });
    });
  });

export const DepartureBoard: FC<DepartureProps> = (p) => {
  const f = useCurrentFrame();
  const { h } = p;
  const { xs, width } = boardLayout(p.columns, h);
  const rowGap = p.rowGap ?? Math.round(h * 0.42);
  const lampW = 44;
  const padX = 46;
  const headH = 58;
  const innerW = width + lampW + padX * 2;
  const innerH = headH + p.rows.length * h + (p.rows.length - 1) * rowGap + 56;
  const band = p.title || p.sub ? 70 : 0;
  const fw = innerW + 28;
  const fh = innerH + 28 + band;
  const specs = departureSpecs(p);
  return (
    <BoardFrame x={(W - fw) / 2} y={p.y ?? (H - fh) / 2} w={fw} h={fh} at={p.at} label={p.title} sub={p.sub} seed={p.seed}>
      {p.columns.map((c, ci) => (
        <div key={ci} style={{ position: "absolute", left: padX + lampW + xs[ci]!, top: 16, width: rowWidth(h, c.cols), textAlign: c.align === "right" ? "right" : "left", fontFamily: PAINT, fontWeight: 600, fontSize: 30, letterSpacing: "0.16em", color: AMBER, opacity: ramp(f / FPS, p.at + 0.15, 0.3) }}>
          {c.label}
        </div>
      ))}
      {p.rows.map((r, ri) => {
        const y = headH + ri * (h + rowGap) + 12;
        const foc = (p.focus ?? []).filter((q) => q.row === ri && f >= q.at * FPS);
        const lit = foc.length ? blink(f, foc[foc.length - 1]!.at * FPS) : 0;
        return (
          <Nudge key={ri} at={[...(r.nudge ?? []), ...(p.focus ?? []).filter((q) => q.row === ri).map((q) => q.at)]}>
            <Lamp x={padX + 14} y={y + h / 2} on={lit} tone={foc[foc.length - 1]?.tone ?? "amber"} />
            {p.columns.map((c, ci) => (
              <FlapRow key={ci} specs={specs[ri]![ci]!} x={padX + lampW + xs[ci]!} y={y} h={h} />
            ))}
          </Nudge>
        );
      })}
    </BoardFrame>
  );
};
