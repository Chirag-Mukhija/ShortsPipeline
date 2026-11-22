// Spotlight noir title pieces: a swinging lamp that ignites a title, a title opened through a pinhole aperture, a beam that hunts word by word and locks on the key word, and a quote lit through venetian blinds.
import type { FC } from "react";
import { Easing, interpolateColors } from "remotion";
import { INOUT, OUT, ramp, useTime } from "../../core/time";
import { ACCENT, ALARM, CONE, LIT, beamAt, jitter, pendulum, switchOn, type BeamKey } from "./theme";
import { Dark, push, spot, trail, type BeamFn, type Light, type Pt } from "./light";
import { Txt, measure } from "./type";
import { Fedora } from "./objects";

// ---------- swinging spotlight ----------
export type SwingTitleProps = { title: string; kicker?: string; sub?: string; at?: number; settle?: number; y?: number; size?: number; r?: number };

// A lamp swings in on a pendulum; every letter it passes catches the light and keeps it, until the beam settles centred on the title.
export const SwingTitle: FC<SwingTitleProps> = ({ title, kicker, sub, at = 0.2, settle = 3.2, y = 520, size = 140, r = 300 }) => {
  const { t } = useTime();
  const beam: BeamFn = (tt) => {
    if (tt < at) return null;
    const amp = 660 * (1 - ramp(tt, settle - 1.4, 1.6, INOUT));
    const j = jitter(tt, 1, 3);
    return { x: 960 + pendulum(tt - at, amp, 2.6, -Math.PI / 2) + j.dx, y: y + 10 + j.dy, r };
  };
  const on = switchOn(t, at, 1);
  const b = beam(t);
  return (
    <Dark
      lights={b ? [spot(b.x, b.y, b.r, { soft: 0.5, i: on })] : []}
      glow={trail(beam, t, { from: at, latch: true, level: 0.9 })}
      beams={b ? [{ from: [960, -520], x: b.x, y: b.y, r: b.r * 0.9, i: on, dust: 48, seed: 3 }] : []}
      cam={push(1 + 0.04 * ramp(t, 0, 6, INOUT))}
    >
      {kicker && <Txt x={960} y={y - size * 0.95} text={kicker} size={30} voice="mono" fill={ACCENT} track={0.35} />}
      <Txt x={960} y={y} text={title} size={size} voice="serif" track={0.05} />
      {sub && <Txt x={960} y={y + size * 0.88} text={sub} size={54} voice="italic" />}
    </Dark>
  );
};

// ---------- pinhole title ----------
export type PinholeTitleProps = { title: string; kicker?: string; sub?: string; at?: number; open?: number; r?: number; cx?: number; cy?: number };

// Black, then a pinhole of light flares, then the aperture opens with a chromatic edge and the title is simply there.
export const PinholeTitle: FC<PinholeTitleProps> = ({ title, kicker, sub, at = 0.3, open = 1.3, r = 700, cx = 960, cy = 540 }) => {
  const { t } = useTime();
  const p0 = ramp(t, at, 4 / 30);
  const p1 = ramp(t, at + 12 / 30, open, Easing.inOut(Easing.cubic));
  const rr = 8 * p0 + (r - 8) * p1;
  const edge = p0 * (0.45 + 0.55 * (1 - p1));
  const flare = p0 * (1 - ramp(t, at + 10 / 30, 0.5));
  return (
    <Dark
      lights={rr > 1 ? [spot(cx, cy, rr, { soft: 0.1 })] : []}
      wall={0.17}
      dim={0.05}
      cam={push(1.03 - 0.03 * ramp(t, at, 4, INOUT), cx, cy)}
      over={
        p0 > 0 && (
          <g style={{ mixBlendMode: "screen" }}>
            <g fill="none" opacity={edge} style={{ filter: "blur(2px)" }}>
              <circle cx={cx - 3} cy={cy} r={rr + 7} stroke={ALARM} strokeWidth={5} opacity={0.6} />
              <circle cx={cx} cy={cy} r={rr + 1} stroke={ACCENT} strokeWidth={4} opacity={0.7} />
              <circle cx={cx + 3} cy={cy} r={rr - 5} stroke={CONE} strokeWidth={3} opacity={0.55} />
            </g>
            <ellipse cx={cx} cy={cy} rx={30 + 520 * flare} ry={3} fill={CONE} opacity={flare} style={{ filter: "blur(2px)" }} />
            <circle cx={cx} cy={cy} r={22} fill={CONE} opacity={flare * 0.8} style={{ filter: "blur(8px)" }} />
          </g>
        )
      }
    >
      {kicker && <Txt x={cx} y={cy - 140} text={kicker} size={32} voice="mono" fill={ACCENT} track={0.4} />}
      <Txt x={cx} y={cy - 10} text={title} size={165} voice="caps" track={0.06} />
      {sub && <Txt x={cx} y={cy + 120} text={sub} size={52} voice="italic" />}
    </Dark>
  );
};

// ---------- beam lock ----------
export type LockWord = { w: string; t: number; key?: boolean };
export type BeamLockProps = { lines: LockWord[][]; y?: number; size?: number; from?: Pt };

// The beam jumps to each word as it is spoken (said words keep a low glow); on the key word it stops, tightens, rings, and the word turns amber.
export const BeamLock: FC<BeamLockProps> = ({ lines, y = 420, size = 170, from = [1700, -420] }) => {
  const { t } = useTime();
  const gap = size * 0.3;
  const placed = lines.flatMap((line, li) => {
    const ws = line.map((w) => measure(w.w, size, "caps", 0.03));
    const total = ws.reduce((a, b) => a + b, 0) + gap * (line.length - 1);
    let x = 960 - total / 2;
    return line.map((w, i) => {
      const cx = x + ws[i]! / 2;
      x += ws[i]! + gap;
      return { ...w, x: cx, y: y + li * size * 1.02, width: ws[i]! };
    });
  });
  const first = placed[0]!;
  const key = placed.find((p) => p.key) ?? placed[placed.length - 1]!;
  const lockAt = key.t + 0.2;
  const keys: BeamKey[] = [
    { t: first.t - 0.5, x: -320, y: first.y, r: 240 },
    ...placed.map((p) => ({ t: p.t - 0.1, x: p.x, y: p.y, r: Math.max(p.width * 0.62, size * 0.9), d: 0.27 })),
  ];
  const beam: BeamFn = (tt) => {
    if (tt < keys[0]!.t) return null;
    const b = beamAt(tt, keys, 0.27, OUT);
    const j = jitter(tt, 2, 3);
    return { x: b.x + j.dx, y: b.y + j.dy, r: b.r * (1 - 0.36 * ramp(tt, lockAt, 10 / 30, OUT)) };
  };
  // The afterglow only records where the beam rests on a word, so a sweep between words never lights words not yet said.
  const resting: BeamFn = (tt) => (keys.slice(1).some((k) => tt > k.t - 0.27 && tt < k.t - 0.03) ? null : beam(tt));
  const b = beam(t);
  const locked = ramp(t, lockAt, 0.3);
  const pulse = t > lockAt ? ((t - lockAt) % 1.1) / 1.1 : 0;
  return (
    <Dark
      lights={b ? [spot(b.x, b.y, b.r, { soft: 0.42 })] : []}
      glow={trail(resting, t, { from: keys[0]!.t, hold: 0.66, fall: 0.4, rest: 0.34 })}
      beams={b ? [{ from, x: b.x, y: b.y, r: b.r * 0.9, dust: 30, seed: 7 }] : []}
      over={
        b &&
        locked > 0 && (
          <g fill="none" stroke={ACCENT}>
            <circle cx={b.x} cy={b.y} r={b.r * 1.02} strokeWidth={2} opacity={0.4 * locked} />
            <circle cx={b.x} cy={b.y} r={b.r * 1.02 + 110 * pulse} strokeWidth={2.5} opacity={(1 - pulse) * 0.75 * locked} />
            <circle cx={b.x} cy={b.y} r={b.r} fill={ACCENT} stroke="none" opacity={0.07 * locked} style={{ mixBlendMode: "screen" }} />
          </g>
        )
      }
    >
      {placed.map((p, i) => (
        <Txt key={i} x={p.x} y={p.y} text={p.w} size={size} voice="caps" track={0.03} fill={p === key ? interpolateColors(locked, [0, 1], [LIT, ACCENT]) : LIT} />
      ))}
    </Dark>
  );
};

// ---------- blinds quote ----------
export type BlindsQuoteProps = { lines: string[]; by?: string; at?: number; x?: number; y?: number; size?: number; figure?: boolean };

// Light through venetian blinds falls across the wall; the slats tilt open as the quote is said, and a man in a fedora stands in the light.
export const BlindsQuote: FC<BlindsQuoteProps> = ({ lines, by, at = 0.4, x = 200, y = 430, size = 70, figure = true }) => {
  const { t } = useTime();
  const open = 0.12 + 0.52 * ramp(t, at, 0.9, INOUT);
  const drift = 36 * Math.sin(t * 0.32);
  const lead = size * 1.45;
  const lights: Light[] = [
    { kind: "blinds", x: -80 + drift, y: 50, w: 1640, h: 920, slats: 12, open, skew: 18, rot: -5, blur: 6, mullion: 0.56 },
    spot(760, 560, 980, { soft: 0.85, i: 0.2 }),
  ];
  return (
    <Dark
      lights={lights}
      wall={0.26}
      dim={0.2}
      beams={[{ from: [-420, -380], x: 820, y: 560, r: 760, w0: 160, i: 0.4, dust: 34, seed: 12 }]}
      shadow={figure && <Fedora x={1400} y={250 + Math.sin(t * 0.7) * 3} s={1.05} />}
      cam={push(1 + 0.03 * ramp(t, 0, 6, INOUT))}
    >
      <Txt x={x - 12} y={y - lead * 1.25} text="“" size={260} voice="serif" fill={ACCENT} anchor="start" />
      {lines.map((l, i) => (
        <Txt key={i} x={x} y={y + i * lead} text={l} size={size} voice="italic" anchor="start" />
      ))}
      {by && <Txt x={x} y={y + lines.length * lead + 20} text={by} size={30} voice="mono" fill={ACCENT} anchor="start" track={0.22} />}
    </Dark>
  );
};

