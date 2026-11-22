// The exploded view: a generic phone's layers lift apart along a vector (expo-out, staggered from the top) with floating screws and leader-line callouts, and drop back on "reassemble".
import { useId, type FC } from "react";
import { useTime } from "../../core/time";
import { BODY, DISPLAY, FINISH, GREY, INK, MONO, VIOLET, WHITE } from "./theme";
import { ease, EXPO_OUT, IN_BACK, pop, svgId } from "./motion";
import { Screw } from "./gadgets";
import { OneBitScreen } from "./screen";

// Leader-line callout: a dot on the part, a line out to an elbow, then flat to the label. Draws on at `at`.
export const Callout: FC<{ from: [number, number]; to: [number, number]; text: string; sub?: string; at: number; side?: "right" | "left"; size?: number }> = ({ from, to, text, sub, at, side = "right", size = 42 }) => {
  const { t } = useTime();
  const p = ease(t, at, 0.4, EXPO_OUT);
  const lp = pop(t, at + 0.22, 0.4);
  if (p <= 0) return null;
  const dir = side === "right" ? 1 : -1;
  const elbowX = to[0] - dir * 40;
  const d = `M ${from[0]} ${from[1]} L ${elbowX} ${to[1]} L ${to[0]} ${to[1]}`;
  return (
    <g>
      <path d={d} fill="none" stroke={INK} strokeWidth={3.5} strokeLinejoin="round" pathLength={1} strokeDasharray={`${p} 1`} />
      <circle cx={from[0]} cy={from[1]} r={11 * Math.min(1, p * 3)} fill={WHITE} />
      <circle cx={from[0]} cy={from[1]} r={6 * Math.min(1, p * 3)} fill={INK} />
      <g opacity={lp > 0 ? 1 : 0} transform={`translate(${to[0] + dir * 14} ${to[1]}) scale(${lp})`}>
        <text x={0} y={sub ? -4 : size * 0.34} textAnchor={side === "right" ? "start" : "end"} fontFamily={DISPLAY} fontWeight={800} fontSize={size} letterSpacing={-1} fill={INK}>
          {text}
        </text>
        {sub && (
          <text x={0} y={34} textAnchor={side === "right" ? "start" : "end"} fontFamily={BODY} fontWeight={500} fontSize={29} fill={INK}>
            {sub}
          </text>
        )}
      </g>
    </g>
  );
};

export type LayerKind = "back" | "battery" | "board" | "frame" | "display" | "glass";
// `side: "left"` sends a layer's label to the left column, for parts only visible on the stack's left.
export type Layer = { kind: LayerKind; label?: string; sub?: string; side?: "left" | "right" };

const W = 300;
const H = 600;
const R = 44;
const ANGLE = -34;
const SQUASH = 0.56;
const THICK: Record<LayerKind, number> = { back: 16, battery: 12, board: 7, frame: 12, display: 7, glass: 5 };
// Where each layer's callout dot sits, in flat phone coordinates (on the part itself, toward the right-hand corner).
const ANCHOR: Record<LayerKind, [number, number]> = { back: [128, 270], battery: [110, 230], board: [-118, -82], frame: [143, 250], display: [125, 250], glass: [135, 280] };
const proj = (x: number, y: number) => {
  const a = (ANGLE * Math.PI) / 180;
  return [x * Math.cos(a) - y * Math.sin(a), (x * Math.sin(a) + y * Math.cos(a)) * SQUASH] as const;
};

// Flat artwork of each layer in phone coordinates (centre 0, 300 × 600); `side` is the colour of its edge copies.
const LayerArt: FC<{ kind: LayerKind; edge: boolean; t: number; gid: string }> = ({ kind, edge, t, gid }) => {
  const box = (fill: string, inset = 0, r = R, stroke?: string) => <rect x={-W / 2 + inset} y={-H / 2 + inset} width={W - inset * 2} height={H - inset * 2} rx={r - inset * 0.6} fill={fill} stroke={stroke} strokeWidth={stroke ? 3 : 0} />;
  switch (kind) {
    case "back":
      if (edge) return box(FINISH.white.side);
      return (
        <g>
          {box(`url(#${gid}w)`)}
          <rect x={-W / 2 + 24} y={-H / 2 + 24} width={118} height={118} rx={34} fill={FINISH.white.side} />
          <circle cx={-W / 2 + 58} cy={-H / 2 + 58} r={22} fill={INK} />
          <circle cx={-W / 2 + 108} cy={-H / 2 + 108} r={22} fill={INK} />
          <circle cx={-W / 2 + 108} cy={-H / 2 + 58} r={9} fill={VIOLET} />
        </g>
      );
    case "battery":
      if (edge) return <rect x={-W / 2 + 34} y={-H / 2 + 250} width={W - 68} height={300} rx={20} fill="#8E9196" />;
      return (
        <g>
          <rect x={-W / 2 + 34} y={-H / 2 + 250} width={W - 68} height={300} rx={20} fill={FINISH.silver.face} />
          <rect x={-W / 2 + 34} y={-H / 2 + 330} width={W - 68} height={60} fill={VIOLET} />
          <text x={0} y={-H / 2 + 372} textAnchor="middle" fontFamily={MONO} fontWeight={700} fontSize={28} fill={WHITE}>Li-ion</text>
        </g>
      );
    case "board":
      if (edge) return <path d={`M ${-W / 2 + 20} ${-H / 2 + 20} h ${W - 40} v 215 h ${-W + 40} Z`} fill="#141516" />;
      return (
        <g>
          <path d={`M ${-W / 2 + 20} ${-H / 2 + 20} h ${W - 40} v 215 h ${-W + 40} Z`} fill={FINISH.graphite.face} />
          {Array.from({ length: 7 }, (_, i) => (
            <path key={i} d={`M ${-W / 2 + 40 + i * 32} ${-H / 2 + 226} v -50 l 20 -20 v -40`} stroke={GREY} strokeWidth={3} fill="none" />
          ))}
          <rect x={-40} y={-H / 2 + 50} width={110} height={110} rx={10} fill={FINISH.silver.face} />
          <rect x={-18} y={-H / 2 + 72} width={66} height={66} rx={6} fill={VIOLET} />
          <rect x={-W / 2 + 36} y={-H / 2 + 46} width={56} height={70} rx={6} fill={FINISH.silver.side} />
          <rect x={92} y={-H / 2 + 60} width={36} height={90} rx={5} fill={FINISH.silver.side} />
        </g>
      );
    case "frame":
      return <rect x={-W / 2 + 7} y={-H / 2 + 7} width={W - 14} height={H - 14} rx={R - 4} fill="none" stroke={edge ? FINISH.silver.side : FINISH.silver.face} strokeWidth={14} />;
    case "display":
      if (edge) return box("#000", 6);
      return (
        <g>
          {box(INK, 6)}
          <g transform={`translate(${-W / 2 + 22} ${-H / 2 + 22})`}>
            <OneBitScreen w={W - 44} h={H - 44} t={t} scene="orbit" px={6} />
          </g>
        </g>
      );
    case "glass":
      if (edge) return box("rgba(255,255,255,0.35)");
      return (
        <g>
          {box("rgba(255,255,255,0.22)", 0, R, "rgba(255,255,255,0.9)")}
          <path d={`M ${-W / 2 + 40} ${-H / 2 + 220} L ${-W / 2 + 200} ${-H / 2 + 30}`} stroke={WHITE} strokeWidth={22} strokeLinecap="round" opacity={0.45} />
          <path d={`M ${-W / 2 + 60} ${-H / 2 + 300} L ${-W / 2 + 250} ${-H / 2 + 74}`} stroke={WHITE} strokeWidth={8} strokeLinecap="round" opacity={0.4} />
        </g>
      );
  }
};

export const PHONE_LAYERS: Layer[] = [
  { kind: "back", label: "Back.", sub: "the shell you hold" },
  { kind: "battery", label: "Battery.", sub: "most of the weight" },
  { kind: "board", label: "Board.", sub: "chip, memory, radios", side: "left" },
  { kind: "frame", label: "Frame.", sub: "holds it all square" },
  { kind: "display", label: "Display.", sub: "the pixels" },
  { kind: "glass", label: "Glass.", sub: "the bit you touch" },
];

// Layers listed bottom → top. `spacing` is the full lift step per layer; `labelX` puts the callouts in a column (omit for none).
export const ExplodedStack: FC<{
  x: number; y: number; at: number; layers?: Layer[]; spacing?: number; vector?: [number, number]; stagger?: number; reassembleAt?: number; labelX?: number; labelLeftX?: number; labelAt?: number; scale?: number; screws?: boolean;
}> = ({ x, y, at, layers = PHONE_LAYERS, spacing = 112, vector = [0.22, -1], stagger = 4 / 30, reassembleAt, labelX, labelLeftX, labelAt, scale = 1, screws = true }) => {
  const { t } = useTime();
  const gid = svgId(useId(), "l");
  const n = layers.length;
  const back = reassembleAt === undefined ? 0 : ease(t, reassembleAt, 16 / 30, IN_BACK);
  let base = 0;
  const lifts = layers.map((_, i) => {
    const e = ease(t, at + (n - 1 - i) * stagger, 24 / 30, EXPO_OUT);
    return i * spacing * e * (1 - back);
  });
  const stackH = layers.map((l) => THICK[l.kind]);
  const offs = stackH.map((h) => {
    const o = base;
    base += h;
    return o;
  });
  const [vx, vy] = [vector[0] / Math.hypot(...vector), vector[1] / Math.hypot(...vector)];
  const lastLift = lifts[n - 1]!;
  return (
    <g>
      <defs>
        <linearGradient id={`${gid}w`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="0.5" stopColor={FINISH.white.face} />
          <stop offset="1" stopColor="#E4E2DB" />
        </linearGradient>
        <radialGradient id={`${gid}s`}>
          <stop offset="0" stopColor={INK} stopOpacity={0.2} />
          <stop offset="1" stopColor={INK} stopOpacity={0} />
        </radialGradient>
      </defs>
      <g transform={`translate(${x} ${y}) scale(${scale})`}>
        <ellipse cx={30} cy={40} rx={330} ry={150} fill={`url(#${gid}s)`} />
        {layers.map((l, i) => {
          const lift = lifts[i]!;
          const ox = vx * lift;
          const oy = vy * lift - offs[i]!;
          const th = stackH[i]!;
          return (
            <g key={i} transform={`translate(${ox} ${oy})`}>
              {Array.from({ length: Math.ceil(th / 1.5) }, (_, k) => (
                <g key={k} transform={`translate(0 ${th - k * 1.5}) scale(1 ${SQUASH}) rotate(${ANGLE})`}>
                  <LayerArt kind={l.kind} edge t={t} gid={gid} />
                </g>
              ))}
              <g transform={`scale(1 ${SQUASH}) rotate(${ANGLE})`}>
                <LayerArt kind={l.kind} edge={false} t={t} gid={gid} />
              </g>
            </g>
          );
        })}
        {screws &&
          [[-W / 2 + 26, -H / 2 + 26], [W / 2 - 26, -H / 2 + 26], [W / 2 - 26, H / 2 - 26], [-W / 2 + 26, H / 2 - 26]].map(([sx, sy], k) => {
            const [px, py] = proj(sx!, sy!);
            const e = ease(t, at + 0.15 + k * 0.05, 0.9, EXPO_OUT) * (1 - back);
            const bob = Math.sin(t * 2.2 + k * 1.3) * 6 * e;
            const lift = lastLift + 70 * e;
            return (
              <g key={k} opacity={Math.min(1, e * 3)} transform={`translate(${px + vx * lift} ${py + vy * lift - base - 14 + bob})`}>
                <Screw r={13} rot={t * 90 + k * 40} shaft={22} />
              </g>
            );
          })}
      </g>
      {labelX !== undefined &&
          layers.map((l, i) => {
            if (!l.label) return null;
            const lift = lifts[i]!;
            const [px, py] = proj(...ANCHOR[l.kind]);
            const ax = x + (px + vx * lift) * scale;
            const ay = y + (py + vy * lift - offs[i]!) * scale;
            // Labels share one reference point so the column stays evenly spaced whatever part each dot sits on.
            const ly = y + (proj(...ANCHOR.frame)[1] + vy * lift - offs[i]!) * scale;
            const left = l.side === "left";
            return <Callout key={i} side={left ? "left" : "right"} from={[ax, ay]} to={[left ? (labelLeftX ?? x - 300 * scale) : labelX, ly]} text={l.label} sub={l.sub} at={(labelAt ?? at + 0.6) + (n - 1 - i) * 0.12} />;
          })}
    </g>
  );
};
