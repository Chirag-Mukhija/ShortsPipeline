// Spotlight noir stage pieces: hanging lamps over a list, a number throwing a giant shadow, two crossed spotlights for A vs B, a torch following a flow, a lower third lit through a door slit, and an object under the lamp.
import type { FC, ReactNode } from "react";
import { interpolateColors } from "remotion";
import { INOUT, OUT, ramp, useTime } from "../../core/time";
import { ACCENT, LIT, NIGHT, beamAt, countUp, hand, jitter, switchOff, switchOn, type BeamKey } from "./theme";
import { Dark, push, spot, trail, type BeamFn, type BeamSpec, type Light, type Pt } from "./light";
import { Txt, measure } from "./type";
import { Icon, Lamp, Router, type IconName } from "./objects";

// ---------- lamp lineup ----------
export type LineupStep = { n?: string; label: string; sub?: string; t: number };

// One hanging lamp per step; each catches and lights its step as it is said, and the previous one sinks to half-light.
export const Lineup: FC<{ steps: LineupStep[]; y?: number }> = ({ steps, y = 600 }) => {
  const { t } = useTime();
  const col = (1920 - 192) / steps.length;
  const xs = steps.map((_, i) => 96 + col * (i + 0.5));
  const level = steps.map((s, i) => switchOn(t, s.t - 0.12, i) * (i === steps.length - 1 ? 1 : 1 - 0.62 * ramp(t, steps[i + 1]!.t, 0.4)));
  const lights: Light[] = xs.flatMap((x, i) => [spot(x, y, 255, { soft: 0.45, i: level[i] }), spot(x, y + 255, 250, { ry: 46, soft: 0.6, i: level[i]! * 0.9 })]);
  const beams: BeamSpec[] = xs.map((x, i) => ({ from: [x, 196] as Pt, x, y: y + 150, r: 225, w0: 80, i: level[i], dust: 22, seed: 20 + i }));
  return (
    <Dark
      lights={lights}
      beams={beams}
      wall={0.2}
      floor={<rect x={0} y={y + 250} width={1920} height={3} fill={LIT} opacity={0.35} />}
      over={xs.map((x, i) => (
        <Lamp key={i} x={x} y={196} on={level[i]!} swing={Math.sin(t * 0.9 + i * 1.7) * 1.2} />
      ))}
    >
      {steps.map((s, i) => (
        <g key={i}>
          <Txt x={xs[i]!} y={y - 90} text={s.n ?? String(i + 1).padStart(2, "0")} size={150} voice="caps" fill={ACCENT} track={0.04} />
          <Txt x={xs[i]!} y={y + 50} text={s.label} size={64} voice="serif" />
          {s.sub && <Txt x={xs[i]!} y={y + 130} text={s.sub} size={30} voice="mono" opacity={0.85} />}
        </g>
      ))}
    </Dark>
  );
};

// ---------- shadow stat ----------
export type ShadowStatProps = { value: number; prefix?: string; suffix?: string; decimals?: number; label: string; note?: string; at?: number; light?: Pt; y?: number };

// A lamp snaps on below the number; the number counts in and throws a giant shadow up the wall behind it.
export const ShadowStat: FC<ShadowStatProps> = ({ value, prefix = "", suffix = "", decimals = 0, label, note, at = 0.3, light = [640, 1200], y = 470 }) => {
  const { t } = useTime();
  const on = switchOn(t, at, 2);
  const txt = `${prefix}${countUp(t, at + 0.1, value, 1.1).toFixed(decimals)}${suffix}`;
  const [lx, ly] = light;
  const k = 1.36;
  const j = jitter(t, 4, 2);
  return (
    <Dark
      lights={[spot(1010, 380, 820, { soft: 0.65, i: on * 0.95 }), spot(900 + j.dx, 660 + j.dy, 580, { soft: 0.55, i: on })]}
      beams={[{ from: light, x: 960, y, r: 440, w0: 40, i: 0.45 * on, dust: 26, seed: 31 }]}
      wall={0.22}
      shadow={
        <g transform={`translate(${lx} ${ly}) scale(${k}) translate(${-lx} ${-ly})`} opacity={0.9 * on} style={{ filter: "blur(4px)" }}>
          <Txt x={960} y={y} text={txt} size={380} voice="caps" fill={NIGHT} track={0.02} />
        </g>
      }
      cam={push(1 + 0.04 * ramp(t, at, 4, INOUT))}
    >
      <Txt x={960} y={y} text={txt} size={380} voice="caps" track={0.02} />
      <Txt x={960} y={y + 270} text={label} size={36} voice="mono" track={0.12} />
      {note && <Txt x={960} y={y + 330} text={note} size={28} voice="mono" fill={ACCENT} track={0.2} />}
    </Dark>
  );
};

// ---------- crossed spotlights: A vs B ----------
export type VersusSide = { label: string; sub?: string; t: number };
export type VersusSpotsProps = { a: VersusSide; b: VersusSide; verdict?: { winner: "a" | "b"; t: number }; vs?: string; y?: number };

// Two theatre spots cross over the stage, one for each side; on the verdict the loser's lamp dies to half-light and the winner's tightens and turns amber.
export const VersusSpots: FC<VersusSpotsProps> = ({ a, b, verdict, vs = "vs.", y = 480 }) => {
  const { t } = useTime();
  const sides = [
    { ...a, x: 560, src: [2180, -280] as Pt, id: "a" as const },
    { ...b, x: 1360, src: [-260, -280] as Pt, id: "b" as const },
  ];
  const state = sides.map((s, i) => {
    const win = verdict && verdict.winner === s.id;
    const lose = verdict && !win;
    const lvl = switchOn(t, s.t - 0.1, 3 + i) * (lose ? switchOff(t, verdict.t, 0.28) : 1);
    const r = Math.max(300, measure(s.label, 170, "caps", 0.04) * 0.68) * (1 - (win ? 0.12 * ramp(t, verdict.t, 10 / 30, OUT) : 0));
    const amber = win ? ramp(t, verdict.t + 0.1, 0.35) : 0;
    return { lvl, r, amber };
  });
  return (
    <Dark
      lights={sides.flatMap((s, i) => [spot(s.x, y + 40, state[i]!.r, { soft: 0.42, i: state[i]!.lvl }), spot(s.x, y + 360, Math.max(300, state[i]!.r), { ry: 50, soft: 0.6, i: state[i]!.lvl * 0.85 })])}
      beams={sides.map((s, i) => ({ from: s.src, x: s.x, y: y + 40, r: state[i]!.r * 0.86, w0: 30, i: state[i]!.lvl, dust: 24, seed: 40 + i }))}
      floor={<rect x={0} y={y + 360} width={1920} height={3} fill={LIT} opacity={0.3} />}
      over={
        <>
          <Txt x={960} y={y + 20} text={vs} size={96} voice="italic" fill={ACCENT} opacity={0.75} />
          {sides.map((s, i) =>
            state[i]!.amber > 0 ? (
              <rect key={i} x={s.x - (measure(s.label, 170, "caps", 0.04) / 2) * state[i]!.amber} y={y + 110} width={measure(s.label, 170, "caps", 0.04) * state[i]!.amber} height={6} fill={ACCENT} />
            ) : null,
          )}
        </>
      }
    >
      {sides.map((s, i) => (
        <g key={i}>
          <Txt x={s.x} y={y} text={s.label} size={170} voice="caps" track={0.04} fill={interpolateColors(state[i]!.amber, [0, 1], [LIT, ACCENT])} />
          {s.sub && <Txt x={s.x} y={y + 170} text={s.sub} size={32} voice="mono" track={0.08} />}
        </g>
      ))}
    </Dark>
  );
};

// ---------- torch trail: a flow followed by a torch ----------
export type TrailNode = { x: number; y: number; label: string; sub?: string; icon: IconName; t: number };

// A hand-held torch finds each step of a flow as it is named; found steps stay lit and an amber thread joins them behind the beam.
export const TorchTrail: FC<{ nodes: TrailNode[]; r?: number; from?: Pt }> = ({ nodes, r = 215, from = [-300, 1350] }) => {
  const { t } = useTime();
  const n0 = nodes[0]!;
  const keys: BeamKey[] = [{ t: n0.t - 0.6, x: -260, y: n0.y + 60, r }, ...nodes.map((n) => ({ t: n.t - 0.1, x: n.x, y: n.y + 60, r, d: 0.55 }))];
  const beam: BeamFn = (tt) => {
    if (tt < keys[0]!.t) return null;
    const b = beamAt(tt, keys, 0.55, INOUT);
    const h = hand(tt, 3, 8);
    return { x: b.x + h.dx, y: b.y + h.dy, r: b.r };
  };
  const b = beam(t);
  const found = nodes.filter((n) => t >= n.t - 0.1).map((n) => spot(n.x, n.y + 60, 205, { soft: 0.5 }));
  const h = hand(t, 9, 10);
  return (
    <Dark
      lights={b ? [spot(b.x, b.y, b.r, { soft: 0.45 }), spot(b.x, b.y, b.r * 1.8, { soft: 0.9, i: 0.25 })] : []}
      glow={[...trail(beam, t, { from: keys[0]!.t, rest: 0.18, hold: 0.4, fall: 0.5 }), { level: 0.85, lights: found }]}
      beams={b ? [{ from: [from[0] + h.dx * 4, from[1] + h.dy * 4], x: b.x, y: b.y, r: b.r * 0.9, w0: 30, i: 0.6, dust: 26, seed: 50 }] : []}
      dim={0.08}
      over={nodes.slice(1).map((n, i) => {
        const p = nodes[i]!;
        const k = ramp(t, n.t - 0.65, 0.55, INOUT);
        if (k <= 0) return null;
        const dx = n.x - p.x;
        const dy = n.y - p.y;
        const len = Math.hypot(dx, dy);
        const ux = dx / len;
        const uy = dy / len;
        const sx = p.x + ux * 110;
        const sy = p.y + uy * 110;
        const ex = sx + (len - 220) * ux * k;
        const ey = sy + (len - 220) * uy * k;
        return (
          <g key={i}>
            <line x1={sx} y1={sy} x2={ex} y2={ey} stroke={ACCENT} strokeWidth={3} strokeDasharray="14 10" />
            <circle cx={ex} cy={ey} r={6} fill={ACCENT} />
          </g>
        );
      })}
    >
      {nodes.map((n, i) => (
        <g key={i}>
          <Icon name={n.icon} x={n.x} y={n.y} />
          <Txt x={n.x} y={n.y + 135} text={n.label} size={48} voice="serif" />
          {n.sub && <Txt x={n.x} y={n.y + 190} text={n.sub} size={28} voice="mono" fill={ACCENT} track={0.14} />}
        </g>
      ))}
    </Dark>
  );
};

// ---------- door slit: source label / lower third ----------
export type DoorSlitProps = { name: string; role: string; at?: number; x?: number; y?: number; w?: number; children?: ReactNode };

// A slit of light opens low in the frame like a door easing ajar, and the name and source are there inside it.
export const DoorSlit: FC<DoorSlitProps> = ({ name, role, at = 0.3, x = 96, y = 880, w = 1000, children }) => {
  const { t } = useTime();
  const on = switchOn(t, at, 5);
  const h = 200 * ramp(t, at, 14 / 30, OUT);
  return (
    <Dark
      lights={[{ kind: "rect", x: x - 120, y: y - h / 2, w: w + 120, h, blur: 16, i: on }, spot(x + w * 0.3, y, w * 0.55, { ry: h * 1.4 + 1, soft: 0.9, i: 0.3 * on })]}
      beams={[{ from: [-260, y - 60], x: x + w * 0.85, y, r: Math.max(1, h * 0.55), w0: 60, i: 0.5 * on, dust: 18, seed: 61 }]}
      wall={0.16}
    >
      {children}
      <rect x={x + 24} y={y - 56} width={6} height={112} fill={ACCENT} />
      <Txt x={x + 58} y={y - 22} text={name} size={58} voice="serif" anchor="start" />
      <Txt x={x + 60} y={y + 38} text={role} size={30} voice="mono" fill={ACCENT} anchor="start" track={0.12} />
    </Dark>
  );
};

// ---------- under the lamp: the hero object ----------
export type UnderTheLampProps = { at?: number; label?: string; src?: string; children?: ReactNode; base?: number };

// A lamp switches on over one object: a volumetric cone full of dust, a pool on the floor, and a long soft shadow running down the frame with a tiny caption inside it.
export const UnderTheLamp: FC<UnderTheLampProps> = ({ at = 0.3, label, src, children, base = 830 }) => {
  const { t } = useTime();
  const on = switchOn(t, at, 0);
  const pan = 120 * (1 - ramp(t, 0, 3.4, INOUT));
  const grow = ramp(t, at, 1.2, OUT);
  const led = Math.floor(t * 2) % 2 ? 1 : 0.2;
  return (
    <Dark
      lights={[spot(960, base - 230, 640, { soft: 0.8, i: 0.6 * on }), spot(960, base - 140, 360, { soft: 0.5, i: on }), spot(960, base, 560, { ry: 120, soft: 0.55, i: on })]}
      beams={[{ from: [960, 186], x: 960, y: base, r: 470, w0: 90, i: on, dust: 70, seed: 70 }]}
      wall={0.2}
      cam={`translate(0 ${pan}) ${push(1 + 0.04 * ramp(t, 0, 6, INOUT))}`}
      floor={<rect x={0} y={base} width={1920} height={2} fill={LIT} opacity={0.3} />}
      shadow={<polygon points={`700,${base} 1220,${base} ${1220 + 260 * grow},${base + 420 * grow} ${700 - 260 * grow},${base + 420 * grow}`} fill={NIGHT} opacity={0.9 * on} style={{ filter: "blur(30px)" }} />}
      over={
        <>
          <Lamp x={960} y={186} on={on} w={240} />
          {label && <Txt x={960} y={base + 130} text={label} size={30} voice="mono" opacity={0.8 * on} track={0.24} />}
        </>
      }
    >
      {children ?? (src ? <image href={src} x={700} y={base - 360} width={520} height={360} preserveAspectRatio="xMidYMax meet" /> : <Router cx={960} base={base} led={led} w={520} />)}
    </Dark>
  );
};
