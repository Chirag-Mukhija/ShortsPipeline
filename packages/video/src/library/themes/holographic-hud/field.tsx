// Holographic HUD background: a dark projection room with a perspective floor grid sliding toward camera, a faint central ring, drifting motes, edge ticks and corner readouts.
import { useId, type FC } from "react";
import { AbsoluteFill } from "remotion";
import { FPS, H, W } from "../../core/video";
import { useTime } from "../../core/time";
import { BG, HOLO, LABEL_STYLE, MONO, MUTED, VIOLET, rgba } from "./theme";
import { noise } from "./motion";
import { project, type Cam } from "./space";
import { Dot, TickScale } from "./primitives";

export const ROOM: Cam = { h: 420, d: 1400, f: 1100, cx: 960, cy: 800 };

// The floor grid: lines fade toward the horizon, cross lines slide toward the viewer, and a brighter scan line rolls in every few seconds.
export const FloorGrid: FC<{ cam?: Cam; opacity?: number; speed?: number; step?: number; tone?: string }> = ({ cam = ROOM, opacity = 1, speed = 90, step = 220, tone = HOLO }) => {
  const { t } = useTime();
  const id = `fg${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const zNear = -700;
  const zFar = 9000;
  const xs = Array.from({ length: 31 }, (_, i) => (i - 15) * step);
  const off = (t * speed) % step;
  const zs = Array.from({ length: Math.ceil((zFar - zNear) / step) }, (_, i) => zNear + i * step - off + step);
  const horizon = project(cam, 0, 0, 1e6).y;
  const scanZ = zFar - ((t * 1400) % 12000);
  return (
    <svg width={W} height={H} style={{ position: "absolute", inset: 0, opacity }}>
      <defs>
        <linearGradient id={id} x1="0" y1={horizon} x2="0" y2={H} gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.35" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#fff" stopOpacity="1" />
        </linearGradient>
        <mask id={`${id}m`}>
          <rect x={0} y={0} width={W} height={H} fill={`url(#${id})`} />
        </mask>
      </defs>
      <g mask={`url(#${id}m)`} stroke={tone} fill="none">
        {xs.map((x) => {
          const a = project(cam, x, 0, zNear);
          const b = project(cam, x, 0, zFar);
          return <line key={`x${x}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} strokeOpacity={x === 0 ? 0.3 : 0.16} strokeWidth={1.2} />;
        })}
        {zs.map((z, i) => {
          const a = project(cam, xs[0]!, 0, z);
          const b = project(cam, xs[xs.length - 1]!, 0, z);
          return <line key={`z${i}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} strokeOpacity={0.16} strokeWidth={1.2} />;
        })}
        {scanZ > zNear && (() => {
          const a = project(cam, xs[0]!, 0, scanZ);
          const b = project(cam, xs[xs.length - 1]!, 0, scanZ);
          return <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={tone} strokeOpacity={0.55} strokeWidth={2.5} />;
        })()}
      </g>
      <line x1={0} y1={horizon} x2={W} y2={horizon} stroke={tone} strokeOpacity={0.18} strokeWidth={1} />
    </svg>
  );
};

const pad = (n: number, k = 2) => String(Math.floor(n)).padStart(k, "0");

// The room every HUD scene floats in.
export const HoloField: FC = () => {
  const { t, f } = useTime();
  const motes = Array.from({ length: 36 }, (_, i) => {
    const y = (noise(i, 1) * H - t * (8 + noise(i, 2) * 18) + H) % H;
    const x = noise(i, 3) * W + Math.sin(t * 0.4 + i) * 12;
    return { x, y, r: 1 + noise(i, 4) * 2, o: 0.15 + 0.35 * (0.5 + 0.5 * Math.sin(t * (1 + noise(i, 5) * 2) + i)) };
  });
  const tc = `T+${pad(t / 60)}:${pad(t % 60)}.${pad(f % FPS)}`;
  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse 70% 60% at 50% 42%, #0A1626 0%, #060C16 55%, ${BG} 100%)` }}>
      <FloorGrid />
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        <g transform={`translate(960 440)`} fill="none">
          <circle r={500} stroke={rgba(HOLO, 0.06)} strokeWidth={1.5} />
          <circle r={470} stroke={rgba(HOLO, 0.07)} strokeWidth={8} strokeDasharray="2 18" transform={`rotate(${t * 4})`} />
          <circle r={420} stroke={rgba(VIOLET, 0.08)} strokeWidth={2} strokeDasharray="160 40 20 40" transform={`rotate(${-t * 6})`} />
        </g>
        {motes.map((m, i) => (
          <circle key={i} cx={m.x} cy={m.y} r={m.r} fill={HOLO} opacity={m.o} />
        ))}
        <g stroke={rgba(HOLO, 0.45)} strokeWidth={2} fill="none">
          <path d="M 44 84 V 44 H 84" />
          <path d={`M ${W - 84} 44 H ${W - 44} V 84`} />
          <path d={`M 44 ${H - 84} V ${H - 44} H 84`} />
          <path d={`M ${W - 84} ${H - 44} H ${W - 44} V ${H - 84}`} />
        </g>
      </svg>
      <TickScale x={50} y={300} length={480} vertical n={48} cursor={0.5 + 0.35 * Math.sin(t * 0.6)} opacity={0.55} />
      <div style={{ position: "absolute", left: 104, top: 50, fontFamily: MONO, fontSize: 28, color: MUTED, opacity: 0.75, fontVariantNumeric: "tabular-nums" }}>{tc}</div>
      <div style={{ position: "absolute", right: 104, top: 52, display: "flex", alignItems: "center", gap: 12, opacity: 0.8 }}>
        <Dot seed={2} size={10} />
        <Dot seed={5} size={10} color={HOLO} />
        <Dot seed={9} size={10} color={VIOLET} />
        <span style={{ ...LABEL_STYLE, fontSize: 28, color: MUTED, marginLeft: 6 }}>Link</span>
      </div>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 85% 80% at 50% 50%, transparent 55%, rgba(0,0,0,0.55) 100%)" }} />
    </AbsoluteFill>
  );
};
