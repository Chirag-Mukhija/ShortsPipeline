// Spotlight noir evidence pieces: the monospace tag with a drawn leader line, a pinned evidence print under a torch, a flashlight searching a desk in the dark, and the inverting loupe that shows what was hidden.
import { useId, type FC, type ReactNode } from "react";
import { AbsoluteFill } from "remotion";
import { OUT, ramp, useTime } from "../../core/time";
import { ACCENT, CONE, LIT, MONO, NIGHT, beamAt, hand, switchOn, type BeamKey } from "./theme";
import { Dark, push, spot, type Glow } from "./light";
import { Txt, measure } from "./type";
import { DeskThing, PRINT_SPOTS, PrintImage, type DeskKind } from "./objects";

// ---------- evidence label ----------
export type EvidenceLabelProps = { px: number; py: number; lx: number; ly: number; text: string; sub?: string; at: number; color?: string };

// A ringed point on the object, a thin leader line that draws itself to the label, then the label types on in mono.
export const EvidenceLabel: FC<EvidenceLabelProps> = ({ px, py, lx, ly, text, sub, at, color = ACCENT }) => {
  const { t } = useTime();
  const pin = ramp(t, at, 6 / 30, OUT);
  const line = ramp(t, at + 0.1, 10 / 30, OUT);
  const typed = ramp(t, at + 0.35, Math.min(0.6, text.length * 0.03));
  if (pin <= 0) return null;
  const left = lx < px;
  const ex = lx + (left ? 24 : -24);
  const elbow = ex + (left ? 60 : -60);
  const pts = `${px},${py} ${elbow},${ly} ${ex},${ly}`;
  const len = Math.hypot(elbow - px, ly - py) + Math.abs(ex - elbow);
  const shown = text.slice(0, Math.round(text.length * typed));
  const wText = measure(text, 30, "mono", 0.06);
  return (
    <g>
      <circle cx={px} cy={py} r={16 * pin} fill="none" stroke={color} strokeWidth={2.5} />
      <circle cx={px} cy={py} r={4} fill={color} opacity={pin} />
      <polyline points={pts} fill="none" stroke={LIT} strokeWidth={2} strokeDasharray={len} strokeDashoffset={len * (1 - line)} opacity={0.85} />
      {typed > 0 && (
        <>
          <rect x={left ? lx - wText - 16 : lx - 12} y={ly - 30} width={wText + 28} height={sub ? 98 : 60} fill={NIGHT} opacity={0.72} />
          <Txt x={lx} y={ly} text={shown} size={30} voice="mono" anchor={left ? "end" : "start"} track={0.06} />
          {typed < 1 && <rect x={left ? lx + 4 : lx + measure(shown, 30, "mono", 0.06) + 2} y={ly - 15} width={14} height={30} fill={color} />}
          {sub && typed >= 1 && <Txt x={lx} y={ly + 44} text={sub} size={28} voice="mono" fill={color} anchor={left ? "end" : "start"} track={0.06} />}
        </>
      )}
    </g>
  );
};

// ---------- evidence print ----------
export type EvidencePhotoProps = {
  src?: string;
  at?: number;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  rot?: number;
  exhibit?: string;
  labels?: { spot: keyof typeof PRINT_SPOTS | [number, number]; text: string; sub?: string; lx: number; ly: number; t: number }[];
};

// A print pinned to the wall in the dark; a torch swings onto it, it throws a hard shadow, and evidence tags point at the details.
export const EvidencePhoto: FC<EvidencePhotoProps> = ({ src, at = 0.3, x = 260, y = 230, w = 800, h = 540, rot = -2.5, exhibit = "EXHIBIT 07", labels = [] }) => {
  const { t } = useTime();
  const border = 22;
  const cx = x + w / 2;
  const cy = y + h / 2 + 30;
  const b = beamAt(t, [{ t: at, x: -400, y: cy + 200, r: 520 }, { t: at + 0.7, x: cx - 30, y: cy, r: 560, d: 0.7 }]);
  const hh = hand(t, 5, 7);
  const on = switchOn(t, at, 2);
  const led = 0.6 + 0.4 * Math.sin(t * 6);
  const toScreen = (sx: number, sy: number) => {
    const a = (rot * Math.PI) / 180;
    const ox = x + sx * w - cx;
    const oy = y + sy * h - (y + h / 2);
    return [cx + ox * Math.cos(a) - oy * Math.sin(a), y + h / 2 + ox * Math.sin(a) + oy * Math.cos(a)] as const;
  };
  const card = (fill: string) => (
    <g transform={`rotate(${rot} ${cx} ${y + h / 2})`}>
      <rect x={x - border} y={y - border} width={w + border * 2} height={h + border * 2 + 70} fill={fill} />
    </g>
  );
  return (
    <Dark
      lights={[spot(b.x + hh.dx, b.y + hh.dy, b.r, { soft: 0.5, i: on }), spot(b.x + hh.dx, b.y + hh.dy, b.r * 1.6, { soft: 0.9, i: 0.25 * on })]}
      beams={[{ from: [-300, 1300], x: b.x + hh.dx, y: b.y + hh.dy, r: b.r * 0.8, w0: 40, i: 0.45 * on, dust: 24, seed: 80 }]}
      dim={0.07}
      wall={0.18}
      shadow={
        <g transform="translate(26 22)" opacity={0.85} style={{ filter: "blur(5px)" }}>
          {card(NIGHT)}
        </g>
      }
      over={labels.map((l, i) => {
        const [sx, sy] = typeof l.spot === "string" ? PRINT_SPOTS[l.spot] : l.spot;
        const [px, py] = toScreen(sx, sy);
        return <EvidenceLabel key={i} px={px} py={py} lx={l.lx} ly={l.ly} text={l.text} sub={l.sub} at={l.t} />;
      })}
    >
      {card("#E6E1D4")}
      <g transform={`rotate(${rot} ${cx} ${y + h / 2})`}>
        <g transform={`translate(${x} ${y})`}>
          <PrintImage w={w} h={h} src={src} led={led} />
        </g>
        <text x={x} y={y + h + 58} fontFamily={MONO} fontWeight={600} fontSize={30} fill="#2B2A27" letterSpacing={4}>
          {exhibit}
        </text>
        <circle cx={cx} cy={y - 4} r={13} fill={ACCENT} />
        <circle cx={cx - 4} cy={y - 8} r={4} fill={LIT} opacity={0.7} />
      </g>
    </Dark>
  );
};

// ---------- flashlight search ----------
export type DeskItem = { kind: DeskKind; x: number; y: number; r?: number; s?: number; note?: string[] };
export type Find = { t: number; x: number; y: number; text: string; sub?: string; lx: number; ly: number };
export type FlashlightRevealProps = { things: DeskItem[]; path: BeamKey[]; finds: Find[]; r?: number };

// A torch roams a desk in the dark: the surface and objects exist only where it points; each find gets tagged and keeps a faint glow, and the beam rests on the last one.
export const FlashlightReveal: FC<FlashlightRevealProps> = ({ things, path, finds, r = 240 }) => {
  const { t } = useTime();
  const on = switchOn(t, path[0]!.t - 0.4, 6);
  const b = beamAt(t, path.map((k) => ({ r, ...k })), 0.6);
  const hh = hand(t, 7, 9);
  const bx = b.x + hh.dx;
  const by = b.y + hh.dy;
  const last = finds[finds.length - 1];
  const rest = last ? ramp(t, last.t + 0.2, 0.4) : 0;
  const pulse = last && t > last.t + 0.2 ? ((t - last.t - 0.2) % 1.2) / 1.2 : 0;
  const glow: Glow[] = [{ level: 0.5, lights: finds.filter((f) => t >= f.t).map((f) => spot(f.x, f.y, 170, { soft: 0.6 })) }];
  return (
    <Dark
      lights={[spot(bx, by, b.r, { soft: 0.42, i: on }), spot(bx, by, b.r * 1.55, { soft: 0.9, i: 0.16 * on })]}
      glow={glow}
      beams={[{ from: [1100, 1500], x: bx, y: by, r: b.r * 0.9, w0: 36, i: 0.4 * on, dust: 24, seed: 90 }]}
      dim={0.05}
      wall={0.16}
      floor={Array.from({ length: 30 }, (_, i) => (
        <path key={i} d={`M -40 ${i * 38 + 6} C 500 ${i * 38 + 6 + Math.sin(i) * 14}, 1300 ${i * 38 - 8 + Math.cos(i * 1.3) * 16}, 1960 ${i * 38 + 10}`} fill="none" stroke={LIT} strokeWidth={i % 4 === 0 ? 3 : 1.5} opacity={0.09} />
      ))}
      over={
        <>
          {finds.map((f, i) => (
            <EvidenceLabel key={i} px={f.x} py={f.y} lx={f.lx} ly={f.ly} text={f.text} sub={f.sub} at={f.t + 0.1} />
          ))}
          {last && rest > 0 && <circle cx={bx} cy={by} r={b.r * 0.86 + 90 * pulse} fill="none" stroke={ACCENT} strokeWidth={2.5} opacity={(1 - pulse) * 0.7 * rest} />}
        </>
      }
    >
      {things.map((th, i) => (
        <DeskThing key={i} {...th} />
      ))}
    </Dark>
  );
};

// ---------- invert loupe ----------
export type InvertSpotProps = { path: BeamKey[]; r?: number; children: ReactNode; reveal?: ReactNode; light?: number };

// A loupe that inverts what it passes over (mix-blend-mode: difference) and shows a hidden layer that exists only inside it.
export const InvertSpot: FC<InvertSpotProps> = ({ path, r = 270, children, reveal, light = 1 }) => {
  const { t } = useTime();
  const clip = `loupe${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const b = beamAt(t, path.map((k) => ({ r, ...k })), 0.6);
  const rr = b.r;
  const settle = ramp(t, path[path.length - 1]!.t, 0.4);
  const lens = (
    <>
      <circle cx={b.x} cy={b.y} r={rr} fill={CONE} />
    </>
  );
  return (
    <AbsoluteFill>
      <Dark lights={[spot(960, 500, 1100, { soft: 0.7, i: light })]} wall={0.1} dim={0.25} cam={push(1 + 0.03 * ramp(t, 0, 6))}>
        {children}
      </Dark>
      <svg viewBox="0 0 1920 1080" width={1920} height={1080} style={{ position: "absolute", inset: 0, mixBlendMode: "difference" }}>
        {lens}
      </svg>
      <svg viewBox="0 0 1920 1080" width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <clipPath id={clip}>
            <circle cx={b.x} cy={b.y} r={rr - 2} />
          </clipPath>
        </defs>
        <g clipPath={`url(#${clip})`}>{reveal}</g>
        <g fill="none" stroke={ACCENT} strokeWidth={2.5}>
          <circle cx={b.x} cy={b.y} r={rr + 6} />
          {[0, 90, 180, 270].map((a) => (
            <line key={a} x1={b.x + Math.cos((a * Math.PI) / 180) * (rr + 6)} y1={b.y + Math.sin((a * Math.PI) / 180) * (rr + 6)} x2={b.x + Math.cos((a * Math.PI) / 180) * (rr + 28)} y2={b.y + Math.sin((a * Math.PI) / 180) * (rr + 28)} />
          ))}
          <circle cx={b.x} cy={b.y} r={rr + 6 + 40 * settle} opacity={0.4 * (1 - settle)} />
        </g>
      </svg>
    </AbsoluteFill>
  );
};
