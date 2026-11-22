// Catalog entries for the camera rig and surfaces: demos built as one world with a camera (stage, landscape, depth planes) so the difference from a slide shows.
import type { FC, ReactNode } from "react";
import { AbsoluteFill, random } from "remotion";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";
import type { LibraryEntry } from "./catalog";
import { Camera, Hud, Layer, useCamera, type Rect, type Shot } from "./camera-rig";
import { Grain, LightLeak, LightSweep, Particles, Surface, Vignette, textPocket, type SurfacePalette, type SurfaceRecipe } from "./surface";
import { OUT, ramp, useTime } from "./time";
import { H, W } from "./video";

const SANS = loadInter("normal", { weights: ["500", "600", "700"], subsets: ["latin"] }).fontFamily;
const MONO = loadMono("normal", { weights: ["500"], subsets: ["latin"] }).fontFamily;

// Graphite and ember: one warm accent, one cool support, never pure black or white.
const DARK: SurfacePalette = { base: "#171a21", deep: "#0b0c10", accent: "#ff8a4c", accentLit: "#ffcf9e", light: "#f3efe7" };
const LIGHT: SurfacePalette = { base: "#eee7dc", deep: "#3a2f28", accent: "#e8774a", accentLit: "#f6c08f", light: "#fbf8f2" };
const INK = "#f4f1ea";
const MUTED = "#9aa1ad";
const EDGE = "#3a404d";
const COOL = "#7fa8ff";

// ---------- the stage world: four objects on plinths in one room (3840x2160) ----------
const STAGE = { w: 3840, h: 2160 };
const HORIZON = 1200;
const OBJ = [
  { id: "battery", x: 560, base: 1580, k: 1.75, label: "Battery" },
  { id: "chip", x: 1450, base: 1540, k: 1.75, label: "Chip" },
  { id: "gauge", x: 2380, base: 1580, k: 1.75, label: "Heat" },
  { id: "phone", x: 3290, base: 1550, k: 1.75, label: "Screen" },
] as const;
const OBJ_H = { battery: 330, chip: 300, gauge: 330, phone: 400 };
type ObjId = (typeof OBJ)[number]["id"];
const objRect = (id: ObjId): Rect => {
  const o = OBJ.find((v) => v.id === id)!;
  const h = OBJ_H[id] * o.k;
  return { x: o.x - 350, y: o.base - h - 40, w: 700, h: h + 170 };
};
const STAGE_TARGETS: Record<string, Rect> = {
  all: { x: 0, y: 0, ...STAGE },
  ...Object.fromEntries(OBJ.map((o) => [o.id, objRect(o.id)])),
};

const Battery: FC<{ level: number }> = ({ level }) => (
  <g>
    <rect x={-30} y={-326} width={60} height={28} rx={9} fill={EDGE} />
    <rect x={-82} y={-304} width={164} height={296} rx={36} fill="url(#gBody)" stroke={EDGE} strokeWidth={3} />
    <rect x={-62} y={-284 + (1 - level) * 256} width={124} height={256 * level} rx={20} fill="url(#gEmber)" />
    <rect x={-68} y={-290} width={12} height={240} rx={6} fill="#ffffff" opacity={0.07} />
    <text x={0} y={-130} textAnchor="middle" fontFamily={SANS} fontWeight={700} fontSize={58} fill={INK}>{Math.round(level * 100)}%</text>
  </g>
);

const Chip: FC<{ glow: number }> = ({ glow }) => (
  <g transform="translate(0 -150)">
    {[-1, 1].flatMap((sd) => [0, 1, 2, 3, 4, 5].flatMap((i) => [
      <rect key={`v${sd}${i}`} x={-100 + i * 40 - 7} y={sd * 150 - (sd > 0 ? 0 : 26)} width={14} height={26} rx={4} fill={EDGE} />,
      <rect key={`h${sd}${i}`} x={sd * 150 - (sd > 0 ? 0 : 26)} y={-100 + i * 40 - 7} width={26} height={14} rx={4} fill={EDGE} />,
    ]))}
    <rect x={-150} y={-150} width={300} height={300} rx={30} fill="url(#gBody)" stroke={EDGE} strokeWidth={3} />
    <circle r={120} fill="url(#gGlow)" opacity={0.35 + 0.5 * glow} />
    <rect x={-74} y={-74} width={148} height={148} rx={16} fill="#1b1f27" stroke="#ff8a4c" strokeOpacity={0.5 + 0.4 * glow} strokeWidth={3} />
    {[0, 1, 2].map((i) => <line key={i} x1={-74 + 37 * (i + 1)} y1={-74} x2={-74 + 37 * (i + 1)} y2={74} stroke="#ffffff" strokeOpacity={0.06} strokeWidth={2} />)}
    <text x={0} y={14} textAnchor="middle" fontFamily={MONO} fontWeight={500} fontSize={38} fill="#ffcf9e">CPU</text>
  </g>
);

const arc = (r: number, a0: number, a1: number) => {
  const p = (a: number) => `${Math.cos(a) * r} ${Math.sin(a) * r}`;
  return `M ${p(a0)} A ${r} ${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${p(a1)}`;
};
const A0 = Math.PI * 0.75;
const SWEEP = Math.PI * 1.5;
const Gauge: FC<{ v: number }> = ({ v }) => (
  <g transform="translate(0 -170)">
    <circle r={160} fill="url(#gBody)" stroke={EDGE} strokeWidth={3} />
    <path d={arc(118, A0, A0 + SWEEP)} stroke="#2a2f3a" strokeWidth={20} fill="none" strokeLinecap="round" />
    <path d={arc(118, A0, A0 + SWEEP * Math.max(0.01, v))} stroke="url(#gEmber)" strokeWidth={20} fill="none" strokeLinecap="round" />
    {Array.from({ length: 11 }, (_, i) => {
      const a = A0 + (SWEEP * i) / 10;
      return <line key={i} x1={Math.cos(a) * 92} y1={Math.sin(a) * 92} x2={Math.cos(a) * 80} y2={Math.sin(a) * 80} stroke={MUTED} strokeOpacity={0.6} strokeWidth={3} />;
    })}
    <line x1={0} y1={0} x2={Math.cos(A0 + SWEEP * v) * 86} y2={Math.sin(A0 + SWEEP * v) * 86} stroke={INK} strokeWidth={6} strokeLinecap="round" />
    <circle r={14} fill={INK} />
    <text x={0} y={92} textAnchor="middle" fontFamily={SANS} fontWeight={700} fontSize={46} fill={INK}>{Math.round(30 + v * 60)}°</text>
  </g>
);

const Phone: FC<{ p: number }> = ({ p }) => (
  <g>
    <rect x={-100} y={-410} width={200} height={400} rx={32} fill="#0f1115" stroke={EDGE} strokeWidth={4} />
    <rect x={-84} y={-394} width={168} height={368} rx={22} fill="url(#gScreen)" />
    <rect x={-26} y={-386} width={52} height={12} rx={6} fill="#0f1115" />
    {[0.45, 0.7, 0.55, 0.9].map((h, i) => {
      const hh = 190 * h * ramp(p, i * 0.12, 0.5, OUT);
      return <rect key={i} x={-64 + i * 34} y={-60 - hh} width={24} height={hh} rx={6} fill={i === 3 ? "#ff8a4c" : COOL} opacity={i === 3 ? 1 : 0.75} />;
    })}
    <text x={-64} y={-320} fontFamily={SANS} fontWeight={600} fontSize={22} fill={INK} opacity={0.8}>Usage</text>
  </g>
);

// Plinth width follows the object scale; the label stays one size so all four read alike.
const Plinth: FC<{ x: number; base: number; label: string; children: ReactNode; k: number }> = ({ x, base, label, children, k }) => {
  const r = 170 * Math.max(1, k);
  return (
    <g>
      <ellipse cx={x} cy={base + 112} rx={r * 1.3} ry={34} fill="#000000" opacity={0.55} filter="url(#fShadow)" />
      <path d={`M ${x - r} ${base} L ${x - r} ${base + 90} A ${r} 40 0 0 0 ${x + r} ${base + 90} L ${x + r} ${base} Z`} fill="url(#gPlinth)" />
      <ellipse cx={x} cy={base} rx={r} ry={40} fill="#2b303b" stroke="#ff8a4c" strokeOpacity={0.35} strokeWidth={2} />
      <text x={x} y={base + 86} textAnchor="middle" fontFamily={SANS} fontWeight={600} fontSize={40} fill={MUTED}>{label}</text>
      <g transform={`translate(${x} ${base - 6}) scale(${k})`}>{children}</g>
    </g>
  );
};

const Defs: FC = () => (
  <defs>
    <linearGradient id="gBody" x1="0" y1="0" x2="0.4" y2="1"><stop offset="0" stopColor="#2f3440" /><stop offset="1" stopColor="#1a1d24" /></linearGradient>
    <linearGradient id="gEmber" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stopColor="#ff6a3d" /><stop offset="1" stopColor="#ffb27a" /></linearGradient>
    <linearGradient id="gScreen" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1f2638" /><stop offset="1" stopColor="#141823" /></linearGradient>
    <linearGradient id="gPlinth" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#242833" /><stop offset="1" stopColor="#14161c" /></linearGradient>
    <linearGradient id="gFloor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1e2129" /><stop offset="1" stopColor="#0d0e12" /></linearGradient>
    <radialGradient id="gGlow"><stop offset="0" stopColor="#ff8a4c" stopOpacity={0.9} /><stop offset="1" stopColor="#ff8a4c" stopOpacity={0} /></radialGradient>
    <filter id="fShadow" x="-50%" y="-200%" width="200%" height="500%"><feGaussianBlur stdDeviation="22" /></filter>
  </defs>
);

// Far wall: a dot grid on its own plane, so the room has depth when the camera moves.
const WallDots: FC = () => (
  <svg width={STAGE.w} height={STAGE.h} style={{ position: "absolute", inset: 0 }}>
    {Array.from({ length: 48 * 27 }, (_, i) => {
      const x = (i % 48) * 80 + 40;
      const y = Math.floor(i / 48) * 80 + 40;
      return <circle key={i} cx={x} cy={y} r={2.4} fill="#ffffff" opacity={0.06 + 0.04 * random(`d${i}`)} />;
    })}
  </svg>
);

// The room itself: wall sign, floor with perspective lines, four objects; each object acts on its own cue.
const StageWorld: FC<{ cues?: Partial<Record<ObjId, number>>; sign?: string }> = ({ cues = {}, sign = "What's inside a phone" }) => {
  const { t } = useTime();
  const on = (id: ObjId) => ramp(t, cues[id] ?? -10, 1.1, OUT);
  return (
    <svg width={STAGE.w} height={STAGE.h} style={{ position: "absolute", inset: 0 }}>
      <Defs />
      {sign && <text x={1920} y={440} textAnchor="middle" fontFamily={SANS} fontWeight={600} fontSize={168} fill={INK} opacity={0.92} letterSpacing={-3}>{sign}</text>}
      {sign && <text x={1920} y={560} textAnchor="middle" fontFamily={MONO} fontWeight={500} fontSize={44} fill={MUTED}>four parts, one room</text>}
      <rect x={0} y={HORIZON} width={STAGE.w} height={STAGE.h - HORIZON} fill="url(#gFloor)" />
      <line x1={0} y1={HORIZON} x2={STAGE.w} y2={HORIZON} stroke="#ffffff" strokeOpacity={0.1} strokeWidth={2} />
      {Array.from({ length: 17 }, (_, i) => (
        <line key={i} x1={1920 + (i - 8) * 120} y1={HORIZON} x2={1920 + (i - 8) * 900} y2={STAGE.h} stroke="#ffffff" strokeOpacity={0.045} strokeWidth={2} />
      ))}
      {[1400, 1720, 2000].map((y) => <line key={y} x1={0} y1={y} x2={STAGE.w} y2={y} stroke="#ffffff" strokeOpacity={0.03} strokeWidth={2} />)}
      {OBJ.map((o) => (
        <Plinth key={o.id} x={o.x} base={o.base} label={o.label} k={o.k}>
          {o.id === "battery" && <Battery level={0.2 + 0.62 * on("battery")} />}
          {o.id === "chip" && <Chip glow={on("chip")} />}
          {o.id === "gauge" && <Gauge v={0.15 + 0.55 * on("gauge")} />}
          {o.id === "phone" && <Phone p={on("phone")} />}
        </Plinth>
      ))}
    </svg>
  );
};

// HUD chip naming the current shot, so a still says what the camera is doing.
const ShotChip: FC<{ labels: [number, string][] }> = ({ labels }) => {
  const { t } = useTime();
  const cur = [...labels].reverse().find(([a]) => t >= a) ?? labels[0]!;
  return (
    <div style={{ position: "absolute", left: 72, top: 64, padding: "12px 22px", borderRadius: 999, background: "rgba(8,9,12,0.55)", border: "1px solid rgba(255,255,255,0.14)", fontFamily: MONO, fontSize: 28, color: INK, letterSpacing: 1 }}>
      <span style={{ color: DARK.accent }}>● </span>
      {cur[1]}
    </div>
  );
};

const Atmos: FC = () => (
  <>
    <Vignette strength={0.55} />
    <Grain opacity={0.14} />
  </>
);

const Stage: FC<{ shots: Shot[]; labels: [number, string][]; cues?: Partial<Record<ObjId, number>>; motionBlur?: boolean; hud?: ReactNode; sign?: string }> = ({ shots, labels, cues, motionBlur, hud, sign }) => (
  <AbsoluteFill>
    <Camera shots={shots} world={STAGE} targets={STAGE_TARGETS} motionBlur={motionBlur}>
      <Surface recipe="spotlightTint" palette={DARK} parallax={0.06} />
      <Layer depth={0.35}><WallDots /></Layer>
      <Layer><StageWorld cues={cues} sign={sign} /></Layer>
      <Hud>
        <ShotChip labels={labels} />
        {hud}
      </Hud>
    </Camera>
    <Atmos />
  </AbsoluteFill>
);

// ---------- demo: a world tour (wide -> cu -> glide -> pull back) ----------
const TourDemo: FC = () => (
  <Stage
    shots={[
      { at: 0, target: "all", size: "wide" },
      { at: 0.5, target: "battery", size: "cu", move: "push", dur: 1.1 },
      { at: 2.2, target: "chip", size: "cu", move: "glide", dur: 0.8 },
      { at: 3.6, target: "all", size: "wide", move: "pull", dur: 1.4 },
    ]}
    labels={[[0, "WIDE"], [0.5, "PUSH → CU battery"], [2.2, "GLIDE → CU chip"], [3.6, "PULL → WIDE"]]}
    cues={{ battery: 1.6, chip: 3.0, gauge: 4.2, phone: 4.4 }}
  />
);

// ---------- demo: whip with motion blur ----------
const WhipDemo: FC = () => (
  <Stage
    motionBlur
    shots={[
      { at: 0, target: "battery", size: "cu" },
      { at: 1.5, target: "phone", size: "cu", move: "whip" },
      { at: 2.7, target: "gauge", size: "cu", move: "whip" },
    ]}
    labels={[[0, "CU battery"], [1.5, "WHIP + motion blur"], [2.7, "WHIP back"]]}
    cues={{ battery: 0.1, phone: 1.75, gauge: 2.95 }}
  />
);

// ---------- demo: HUD pinned to screen while the world moves, plus a callout pinned to a world point ----------
const Callout: FC<{ wx: number; wy: number; text: string; at: number; dx?: number; dy?: number }> = ({ wx, wy, text, at, dx = 220, dy = -180 }) => {
  const { t } = useTime();
  const p = useCamera().project(wx, wy);
  // Fades out as its world point leaves the frame, so a callout never points at nothing.
  const inFrame = Math.min(1, Math.max(0, Math.min(p.x, W - p.x, p.y, H - p.y) / 260));
  const e = ramp(t, at, 0.5, OUT) * inFrame;
  return (
    <>
      <svg width={W} height={H} style={{ position: "absolute", inset: 0, opacity: e }}>
        <circle cx={p.x} cy={p.y} r={10} fill={DARK.accent} />
        <circle cx={p.x} cy={p.y} r={22 + 6 * Math.sin(t * 4)} fill="none" stroke={DARK.accent} strokeOpacity={0.5} strokeWidth={2} />
        <line x1={p.x} y1={p.y} x2={p.x + dx * e} y2={p.y + dy * e} stroke={INK} strokeOpacity={0.7} strokeWidth={2} />
      </svg>
      <div style={{ position: "absolute", left: p.x + dx, top: p.y + dy, transform: `translate(0, -50%) translateY(${(1 - e) * 16}px)`, opacity: e, padding: "12px 22px", borderRadius: 14, background: "rgba(10,11,14,0.78)", border: "1px solid rgba(255,255,255,0.16)", fontFamily: SANS, fontWeight: 600, fontSize: 34, color: INK, whiteSpace: "nowrap" }}>
        {text}
      </div>
    </>
  );
};

const HudDemo: FC = () => {
  const { t } = useTime();
  const chip = OBJ[1];
  const gauge = OBJ[2];
  return (
    <Stage
      shots={[
        { at: 0, target: "chip", size: 0.6 },
        { at: 0.3, target: "chip", size: "cu", move: "push", dur: 1.6 },
        { at: 2.4, target: "gauge", size: "cu", move: "glide", dur: 1.0 },
      ]}
      labels={[[0, "MCU chip"], [0.3, "PUSH → CU"], [2.4, "GLIDE → CU gauge"]]}
      cues={{ chip: 0.6, gauge: 3.2 }}
      hud={
        <>
          <Callout wx={chip.x + 74 * chip.k} wy={chip.base - 6 - 224 * chip.k} text="8 cores" at={1.2} />
          <Callout wx={gauge.x + 83 * gauge.k} wy={gauge.base - 6 - 253 * gauge.k} text="Runs warm" at={3.5} dx={200} dy={-120} />
          <div style={{ position: "absolute", left: 120, bottom: 110, opacity: ramp(t, 0.2, 0.6, OUT) }}>
            <div style={{ ...textPocket({ strength: 0.6 }), fontFamily: SANS, fontWeight: 600, fontSize: 76, lineHeight: 1.08, color: INK, letterSpacing: -1.5 }}>
              Text stays put.<br />The world moves.
            </div>
          </div>
        </>
      }
    />
  );
};

// ---------- demo: named shot sizes, hard cuts ----------
const SIZES = ["wide", "medium", "mcu", "cu", "ecu"] as const;
const FILL_TXT = { wide: "whole room", medium: "fills 35 %", mcu: "fills 45 %", cu: "fills 75 %", ecu: "detail, 92 %" };
const SizesDemo: FC = () => {
  const { t } = useTime();
  const i = Math.min(SIZES.length - 1, Math.floor(t / 0.95));
  const g = OBJ[2];
  const hub = { x: g.x, y: g.base - 6 - 120 * g.k, r: 120 * g.k };
  const shots: Shot[] = SIZES.map((s, k) => ({ at: k * 0.95, target: s === "wide" ? "all" : s === "ecu" ? hub : "gauge", size: s, move: "cut" }));
  return (
    <Stage
      shots={shots}
      labels={[[0, "CUT"]]}
      cues={{ gauge: 0.2 }}
      sign=""
      hud={
        <div style={{ position: "absolute", right: 96, bottom: 84, textAlign: "right", fontFamily: SANS, color: INK }}>
          <div style={{ ...textPocket({ strength: 0.55, pad: [40, 90] }) }}>
            <div style={{ fontWeight: 700, fontSize: 120, letterSpacing: -2, lineHeight: 1 }}>{SIZES[i]!.toUpperCase()}</div>
            <div style={{ fontFamily: MONO, fontSize: 32, color: MUTED, marginTop: 10 }}>{FILL_TXT[SIZES[i]!]}</div>
          </div>
        </div>
      }
    />
  );
};

// ---------- demo: five parallax planes in a dusk landscape ----------
const LAND = { w: 3840, h: 2160 };
const ridge = (seed: string, y: number, amp: number, step: number, jag: number) => {
  let d = `M 0 ${LAND.h} L 0 ${y}`;
  for (let x = 0; x <= LAND.w; x += step) d += ` L ${x} ${y - amp * (0.5 + 0.5 * Math.sin(x / 520 + random(seed) * 6)) - jag * random(`${seed}${x}`)}`;
  return `${d} L ${LAND.w} ${LAND.h} Z`;
};
const Plane: FC<{ children: ReactNode }> = ({ children }) => <svg width={LAND.w} height={LAND.h} style={{ position: "absolute", inset: 0 }}>{children}</svg>;
const Tree: FC<{ x: number; y: number; s: number; fill: string }> = ({ x, y, s, fill }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`} fill={fill}>
    <rect x={-6} y={-30} width={12} height={34} />
    <path d="M 0 -170 L 46 -60 L 26 -60 L 60 -24 L -60 -24 L -26 -60 L -46 -60 Z" />
  </g>
);
const Sky: FC = () => (
  <Plane>
    <defs>
      <linearGradient id="lSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0c1124" /><stop offset="0.42" stopColor="#262447" /><stop offset="0.6" stopColor="#8a4a5e" /><stop offset="0.7" stopColor="#f09062" /><stop offset="1" stopColor="#f6b27c" /></linearGradient>
      <radialGradient id="lSun"><stop offset="0" stopColor="#fff1dc" /><stop offset="0.3" stopColor="#ffd0a0" stopOpacity={0.9} /><stop offset="1" stopColor="#ff9a5a" stopOpacity={0} /></radialGradient>
    </defs>
    <rect width={LAND.w} height={LAND.h} fill="url(#lSky)" />
    {Array.from({ length: 110 }, (_, i) => <circle key={i} cx={random(`sx${i}`) * LAND.w} cy={random(`sy${i}`) * 1000} r={1.5 + 2.5 * random(`sr${i}`)} fill="#ffffff" opacity={0.25 + 0.5 * random(`so${i}`)} />)}
    <circle cx={2620} cy={640} r={420} fill="url(#lSun)" />
    <circle cx={2620} cy={640} r={92} fill="#fff1dc" />
  </Plane>
);
// A depth tag pinned to a point on one parallax plane.
const Tag: FC<{ x: number; y: number; d: number; text: string }> = ({ x, y, d, text }) => {
  const p = useCamera().project(x, y, d);
  return <div style={{ position: "absolute", left: p.x, top: p.y, transform: "translate(-50%, -50%)", padding: "6px 14px", borderRadius: 999, background: "rgba(10,10,18,0.6)", border: "1px solid rgba(255,255,255,0.2)", fontFamily: MONO, fontSize: 24, color: INK, whiteSpace: "nowrap" }}>{text}</div>;
};
const ParallaxDemo: FC = () => {
  const { t } = useTime();
  const shots: Shot[] = [
    { at: 0, target: { x: 1100 - 800, y: 1080 - 450, w: 1600, h: 900 }, size: 1 },
    { at: 0.2, target: { x: 2700 - 800, y: 1080 - 450, w: 1600, h: 900 }, size: 1, move: "glide", dur: 4.4 },
  ];
  return (
    <AbsoluteFill>
      <Camera shots={shots} world={LAND}>
        <Layer depth={0.05}><Sky /></Layer>
        <Layer depth={0.3}><Plane><path d={ridge("far", 1060, 150, 60, 50)} fill="#4a3556" /><path d={ridge("far2", 1150, 90, 90, 30)} fill="#3b2b4b" /></Plane></Layer>
        <Layer depth={0.65}>
          <Plane>
            <path d={ridge("mid", 1250, 70, 120, 8)} fill="#261d35" />
            {Array.from({ length: 22 }, (_, i) => <Tree key={i} x={160 + i * 170 + 60 * random(`mt${i}`)} y={1262 - 40 * random(`my${i}`)} s={0.7 + 0.5 * random(`ms${i}`)} fill="#211a2f" />)}
          </Plane>
        </Layer>
        <Layer depth={1}>
          <Plane>
            <defs><radialGradient id="lWin"><stop offset="0" stopColor="#ffcf8a" stopOpacity={0.9} /><stop offset="1" stopColor="#ff9a4c" stopOpacity={0} /></radialGradient></defs>
            <path d={`M 0 1330 Q 1000 1300 1920 1322 T 3840 1310 L 3840 2160 L 0 2160 Z`} fill="#15111e" />
            <circle cx={1900} cy={1270} r={150} fill="url(#lWin)" opacity={0.6 + 0.15 * Math.sin(t * 3)} />
            <path d="M 1770 1322 L 1770 1200 L 1900 1110 L 2030 1200 L 2030 1322 Z" fill="#0f0c16" />
            <rect x={1872} y={1222} width={50} height={46} rx={4} fill="#ffc77a" />
            <rect x={1990} y={1120} width={20} height={60} fill="#0f0c16" />
            {[2850, 900].map((x) => <g key={x}><rect x={x - 4} y={1150} width={8} height={175} fill="#0f0c16" /><circle cx={x} cy={1148} r={60} fill="url(#lWin)" /><circle cx={x} cy={1148} r={9} fill="#ffe2b0" /></g>)}
            {[620, 1300, 2380, 3300].map((x, i) => <Tree key={x} x={x} y={1326} s={1.1 + 0.1 * i} fill="#0d0a14" />)}
          </Plane>
        </Layer>
        <Layer depth={1.5} style={{ filter: "blur(3px)" }}>
          <Plane>
            <path d={ridge("fg", 1330, 26, 34, 34)} fill="#07060b" />
            {Array.from({ length: 160 }, (_, i) => {
              const x = i * 24 + 12 * random(`gx${i}`);
              const h = 40 + 70 * random(`gh${i}`);
              const lean = -16 + 32 * random(`gl${i}`);
              return <path key={i} d={`M ${x - 7} 1336 Q ${x + lean * 0.4} ${1336 - h * 0.6} ${x + lean} ${1336 - h} Q ${x + 2 + lean * 0.3} ${1336 - h * 0.5} ${x + 7} 1336 Z`} fill="#07060b" />;
            })}
          </Plane>
        </Layer>
        <Hud>
          <Tag x={2620} y={500} d={0.05} text="0.05 sky" />
          <Tag x={966} y={960} d={0.3} text="0.3 far" />
          <Tag x={2500} y={1150} d={0.65} text="0.65 mid" />
          <Tag x={1900} y={1060} d={1} text="1.0 subject" />
          <Tag x={1600} y={1290} d={1.5} text="1.5 foreground" />
          <div style={{ position: "absolute", left: 96, top: 80, fontFamily: SANS, fontWeight: 600, fontSize: 64, color: INK, letterSpacing: -1, ...textPocket({ strength: 0.45 }) }}>Five planes, one camera move</div>
        </Hud>
      </Camera>
      <Grain opacity={0.12} />
      <Vignette strength={0.45} />
    </AbsoluteFill>
  );
};

// ---------- demo: depth-of-field focus pull across three planes ----------
const FOCUS_WORLD = { w: W, h: H };
// One object on its plinth, drawn on its own plane so each can sit at a different depth.
const FocusObj: FC<{ x: number; base: number; k: number; children: ReactNode; label: string }> = ({ x, base, k, children, label: l }) => (
  <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
    <Defs />
    <g transform={`translate(${x} ${base}) scale(${k}) translate(${-x} ${-base})`}>
      <Plinth x={x} base={base} label={l} k={1}>{children}</Plinth>
    </g>
  </svg>
);
const FocusDemo: FC = () => {
  const { t } = useTime();
  const shots: Shot[] = [
    { at: 0, target: { x: 0, y: 0, w: W, h: H }, size: 1, focus: 1.4 },
    { at: 1.2, target: { x: 80, y: 45, w: W - 160, h: H - 90 }, size: 1, move: "push", dur: 1.1, focus: 0.7 },
    { at: 3.0, move: "push", dur: 0.9, focus: 1 },
  ];
  const label = t < 1.2 ? "FOCUS → near" : t < 3.0 ? "RACK → far" : "RACK → mid";
  return (
    <AbsoluteFill>
      <Camera shots={shots} world={FOCUS_WORLD} dof={16}>
        <Surface recipe="spotlightTint" palette={DARK} />
        <Layer depth={0.7}><FocusObj x={1420} base={560} k={0.62} label="Screen"><Phone p={1} /></FocusObj></Layer>
        <Layer depth={1}><FocusObj x={1000} base={700} k={0.82} label="Chip"><Chip glow={1} /></FocusObj></Layer>
        <Layer depth={1.4}><FocusObj x={520} base={900} k={1.12} label="Battery"><Battery level={0.82} /></FocusObj></Layer>
        <Hud><ShotChip labels={[[0, label]]} /></Hud>
      </Camera>
      <Atmos />
    </AbsoluteFill>
  );
};

// ---------- surface demos ----------
// Life layers are thunks: JSX at module load runs before the bundle defines React.
const RECIPES: { r: SurfaceRecipe; p: SurfacePalette; life: () => ReactNode; note: string }[] = [
  { r: "horizonGlow", p: DARK, life: () => <Particles count={40} />, note: "horizonGlow + particles" },
  { r: "duotoneDiagonal", p: { ...DARK, accent: "#5b7cff", accentLit: "#9fd0ff" }, life: () => <LightSweep at={0.6} dur={2.4} />, note: "duotoneDiagonal + sweep" },
  { r: "meshBlob", p: LIGHT, life: () => <Grain opacity={0.12} blend="multiply" />, note: "meshBlob + grain" },
  { r: "spotlightTint", p: DARK, life: () => <Particles mode="float" count={26} size={[2, 6]} />, note: "spotlightTint + dust" },
  { r: "layeredSky", p: { ...LIGHT, accent: "#6f8fd8", accentLit: "#f4c79a", base: "#efe3d2" }, life: () => <LightLeak corner="tr" strength={0.4} />, note: "layeredSky + light leak" },
  { r: "paperTexture", p: { ...LIGHT, base: "#ece3d1" }, life: () => <Vignette strength={0.28} color="#4a3b2c" />, note: "paperTexture + vignette" },
];
const RecipesDemo: FC = () => {
  const tw = 520;
  const th = 293;
  return (
    <AbsoluteFill style={{ backgroundColor: "#111216" }}>
      {RECIPES.map((rc, i) => {
        const x = 110 + (i % 3) * (tw + 70);
        const y = 150 + Math.floor(i / 3) * (th + 150);
        return (
          <div key={rc.r} style={{ position: "absolute", left: x, top: y }}>
            <div style={{ width: tw, height: th, borderRadius: 18, overflow: "hidden", position: "relative", boxShadow: "0 30px 60px rgba(0,0,0,0.45)" }}>
              <div style={{ width: W, height: H, transform: `scale(${tw / W})`, transformOrigin: "0 0", position: "absolute" }}>
                <Surface recipe={rc.r} palette={rc.p}>{rc.life()}</Surface>
              </div>
            </div>
            <div style={{ marginTop: 22, fontFamily: MONO, fontSize: 26, color: "#d9d6cf" }}>{rc.note}</div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

const Headline: FC<{ text: string; sub: string; tone: "dark" | "light" }> = ({ text, sub, tone }) => {
  const { t } = useTime();
  const e = ramp(t, 0.3, 0.9, OUT);
  const ink = tone === "dark" ? INK : "#1d1a17";
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ ...textPocket({ tone, strength: tone === "dark" ? 0.5 : 0.6, pad: [90, 200] }), textAlign: "center", opacity: e, transform: `translateY(${(1 - e) * 30}px)` }}>
        <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 104, letterSpacing: -2.5, color: ink }}>{text}</div>
        <div style={{ fontFamily: MONO, fontSize: 30, marginTop: 18, color: tone === "dark" ? MUTED : "#6b5e52" }}>{sub}</div>
      </div>
    </AbsoluteFill>
  );
};

const DarkLifeDemo: FC = () => (
  <AbsoluteFill>
    <Surface recipe="horizonGlow" palette={DARK}>
      <Particles count={48} />
      <Headline text="The background is never still" sub="horizonGlow · particles · leak · grain · vignette" tone="dark" />
      <LightLeak corner="tr" strength={0.5} />
      <Vignette strength={0.55} />
      <Grain opacity={0.16} />
    </Surface>
  </AbsoluteFill>
);

const LightLifeDemo: FC = () => (
  <AbsoluteFill>
    <Surface recipe="meshBlob" palette={LIGHT}>
      <LightSweep at={1.2} dur={1.8} strength={0.8} />
      <Headline text="One sweep of light, then calm" sub="meshBlob · light sweep · grain" tone="light" />
      <Grain opacity={0.1} blend="multiply" />
      <Vignette strength={0.22} color="#5a4632" />
    </Surface>
  </AbsoluteFill>
);

const ORIGIN = "core: direction draft section 9.1 and 9.3";

export const cameraEntries: LibraryEntry[] = [
  {
    id: "camera-world-tour",
    kind: "camera",
    title: "Camera rig: one world, wide → cu → glide → pull back",
    useFor: "Any beat with several things to explain: put them in ONE world and move the camera between them instead of cutting to a new card. The default replacement for a list or a row of tiles.",
    api: "<Camera world={{w,h}} targets={{id: rect}} shots={[{ at, target, size: 'wide'|'medium'|'mcu'|'cu'|'ecu', move: 'cut'|'push'|'pull'|'glide'|'whip'|'punch', dur? }]}><Layer depth={1}>…</Layer><Hud>…</Hud></Camera>",
    seconds: 5.5,
    origin: ORIGIN,
    Demo: TourDemo,
  },
  {
    id: "camera-whip",
    kind: "camera",
    title: "Whip pan with motion blur",
    useFor: "An attention jump or a comedic turn between two things in the same world: 0.3 s whip, real motion blur from @remotion/motion-blur only on the fast frames.",
    api: "<Camera motionBlur={{ samples?: 8, shutter?: 200, threshold?: 18 }} shots={[…, { at, target, size: 'cu', move: 'whip' }]}>",
    seconds: 3.6,
    origin: ORIGIN,
    Demo: WhipDemo,
  },
  {
    id: "camera-hud",
    kind: "camera",
    title: "HUD over a moving world, with world-pinned callouts",
    useFor: "Headlines and captions that must not zoom while the camera moves, and labels that follow a world point without scaling (useCamera().project).",
    api: "<Camera …><Layer>…</Layer><Hud>{text}</Hud></Camera> · const p = useCamera().project(x, y, depth?) → { x, y, s } in screen px",
    seconds: 4.5,
    origin: ORIGIN,
    Demo: HudDemo,
  },
  {
    id: "camera-shot-sizes",
    kind: "camera",
    title: "Named shot sizes (wide, medium, mcu, cu, ecu)",
    useFor: "Choosing the size a shot list names; sizes are how much of the frame the target fills (frameOn), so the same name works for any element. Hard cuts between sizes read as jump-ins.",
    api: "frameOn(rect | {x,y,r}, size | fill) → { x, y, s } · SHOT_FILL · move: 'cut'",
    seconds: 4.8,
    origin: ORIGIN,
    Demo: SizesDemo,
  },
  {
    id: "camera-parallax",
    kind: "camera",
    title: "Parallax depth planes (0.05 / 0.3 / 0.65 / 1 / 1.5)",
    useFor: "2.5D worlds: landscapes, rooms, desks. Each <Layer depth> pans and zooms by its depth, so one glide shows real depth. Far layers never show an edge; keep foreground (>1) sparse.",
    api: "<Layer depth={0.05 | 0.3 | 0.65 | 1 | 1.5} sharp? style?>",
    seconds: 5,
    origin: ORIGIN,
    Demo: ParallaxDemo,
  },
  {
    id: "camera-focus-pull",
    kind: "camera",
    title: "Depth of field and rack focus",
    useFor: "Moving attention between near and far without a cut: layers blur by their distance from the focus plane, and a shot's `focus` racks it.",
    api: "<Camera dof={px per depth unit} shots={[{ at, focus: depth, dur? }]}> · <Layer depth sharp?>",
    seconds: 4.5,
    origin: ORIGIN,
    Demo: FocusDemo,
  },
  {
    id: "surface-recipes",
    kind: "background",
    title: "Surface recipes, each with a life layer",
    useFor: "Picking the base of a beat's background stack: every recipe is 2-3 layers from palette colours that drift on their own; add one life layer per segment.",
    api: "<Surface recipe='horizonGlow'|'duotoneDiagonal'|'meshBlob'|'spotlightTint'|'layeredSky'|'paperTexture' palette={{ base, accent, accentLit?, deep?, light? }} parallax?>{life}</Surface>",
    seconds: 4,
    origin: ORIGIN,
    Demo: RecipesDemo,
  },
  {
    id: "surface-dark-life",
    kind: "background",
    title: "Dark surface with life: glow, particles, leak, grain, vignette",
    useFor: "A dark chapter background that is never dead, with a text pocket keeping the headline readable over it.",
    api: "<Particles count? mode='rise'|'drift'|'float' size? opacity?> · <LightLeak corner? strength?> · <Grain opacity? blend?> · <Vignette strength? color?> · textPocket({ tone, strength, pad })",
    seconds: 5,
    origin: ORIGIN,
    Demo: DarkLifeDemo,
  },
  {
    id: "surface-light-life",
    kind: "background",
    title: "Light surface with one light sweep",
    useFor: "A light chapter (alternating dark/light marks a mood change): drifting mesh blobs, one sweep per segment, multiply grain.",
    api: "<LightSweep at dur? angle? width? strength?> · <Grain blend='multiply'>",
    seconds: 5,
    origin: ORIGIN,
    Demo: LightLifeDemo,
  },
];
