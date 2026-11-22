// Holographic HUD primitives: the perspective stage, scan-line overlay, the notched HoloCard that pops and unfolds, scramble text, ring gauge, tick scale, data readouts and the projector beam.
import type { CSSProperties, FC, ReactNode } from "react";
import { AbsoluteFill } from "remotion";
import { FPS, H, W } from "../../core/video";
import { INOUT, ramp, useTime } from "../../core/time";
import { ALERT, HEAD, HOLO, INK, LABEL_STYLE, MONO, MUTED, OK, TONE, VIOLET, chroma, glowText, rgba, shadows, type Tone } from "./theme";
import { EXPO, collapse, flickerIn, flickerOut, group, noise, pop, roll, scramble, unfold } from "./motion";

// ---------- stage ----------

// Scan-lines over everything: fine 3 px rows plus one soft bright band crawling down the frame.
export const ScanLines: FC<{ opacity?: number }> = ({ opacity = 1 }) => {
  const { t } = useTime();
  const band = ((t * 150) % (H + 400)) - 200;
  return (
    <AbsoluteFill style={{ pointerEvents: "none", opacity }}>
      <AbsoluteFill style={{ backgroundImage: "repeating-linear-gradient(0deg, rgba(0,0,0,0.22) 0px, rgba(0,0,0,0.22) 1px, transparent 1px, transparent 3px)" }} />
      <div style={{ position: "absolute", left: 0, top: band, width: W, height: 200, background: `linear-gradient(180deg, transparent, ${rgba(HOLO, 0.045)}, transparent)` }} />
    </AbsoluteFill>
  );
};

// A perspective world in 1920×1080 coordinates; the whole HUD sways a few degrees (the board's parallax tilt) so layers at different z separate.
export const HudStage: FC<{ children: ReactNode; amp?: number; perspective?: number; overlay?: boolean; style?: CSSProperties }> = ({ children, amp = 1.6, perspective = 1800, overlay = true, style }) => {
  const { t } = useTime();
  const ry = Math.sin(t * 0.5) * amp;
  const rx = Math.cos(t * 0.37) * amp * 0.45;
  return (
    <AbsoluteFill style={{ perspective, perspectiveOrigin: "50% 46%", ...style }}>
      <AbsoluteFill style={{ transformStyle: "preserve-3d", transform: `rotateX(${rx}deg) rotateY(${ry}deg)` }}>{children}</AbsoluteFill>
      {overlay && <ScanLines />}
    </AbsoluteFill>
  );
};

// ---------- small marks ----------

export const Label: FC<{ children: ReactNode; size?: number; color?: string; style?: CSSProperties }> = ({ children, size = 30, color = MUTED, style }) => (
  <span style={{ ...LABEL_STYLE, fontSize: size, color, lineHeight: 1, ...style }}>{children}</span>
);

// Status dot blinking on its own seeded rhythm.
export const Dot: FC<{ color?: string; size?: number; seed?: number; steady?: boolean }> = ({ color = OK, size = 12, seed = 1, steady }) => {
  const { f } = useTime();
  const period = 18 + Math.floor(noise(seed) * 22);
  const on = steady || (f + seed * 7) % period < period * 0.7;
  return <span style={{ display: "inline-block", width: size, height: size, borderRadius: size, background: color, opacity: on ? 1 : 0.25, boxShadow: on ? `0 0 ${size}px ${rgba(color, 0.8)}` : "none" }} />;
};

// ---------- the card ----------

const M = 48;
const notchPath = (w: number, h: number, c: number) => `M ${c} 0 H ${w} V ${h - c} L ${w - c} ${h} H 0 V ${c} Z`;
const notchClip = (c: number) => `polygon(${c}px 0, 100% 0, 100% calc(100% - ${c}px), calc(100% - ${c}px) 100%, 0 100%, 0 ${c}px)`;

export type HoloCardProps = {
  x: number;
  y: number;
  w: number;
  h: number;
  at: number;
  out?: number;
  exit?: "collapse" | "flicker";
  rx?: number;
  ry?: number;
  z?: number;
  tone?: Tone;
  title?: string;
  code?: string;
  notch?: number;
  glow?: boolean;
  // 0..1: pushes the card back and down in brightness (a step that's done, the losing side).
  dim?: number;
  // 0..1: bracket corners snap inward for emphasis.
  lock?: number;
  // How far back in z the card pops from, and an optional screen offset it flies in from.
  depth?: number;
  fly?: [number, number];
  seed?: number;
  pad?: number;
  children?: ReactNode;
};

// The theme's heart: a translucent notched card that pops forward out of depth, unfolds from a hairline, draws its border, fades its fill and keeps a slow hologram float.
export const HoloCard: FC<HoloCardProps> = ({ x, y, w, h, at, out, exit = "collapse", rx = 0, ry = 0, z = 0, tone = "holo", title, code, notch = 26, glow, dim = 0, lock = 0, depth = 340, fly, seed = 1, pad = 34, children }) => {
  const { t } = useTime();
  if (t < at) return null;
  const col = TONE[tone];
  const u = unfold(t, at);
  const p = pop(t, at);
  const c = exit === "collapse" ? collapse(t, out) : { sx: 1, sy: 1, dot: 0, gone: false };
  const fo = exit === "flicker" ? flickerOut(t, out) : 1;
  if (c.gone || (out !== undefined && exit === "flicker" && fo === 0 && t > out + 5 / FPS)) return null;
  const idleX = Math.sin(t * 0.9 + seed) * 1.1;
  const idleY = Math.cos(t * 0.7 + seed * 2) * 1.4;
  const zz = z - (1 - p) * depth - dim * 70;
  const sweep = ramp(t, at + 0.55, 0.7, INOUT);
  const bIn = ramp(t, at + 6 / FPS, 12 / FPS, EXPO);
  const bo = 14 + (1 - bIn) * 40 - lock * 12;
  const header = title !== undefined || code !== undefined;
  return (
    <div style={{ position: "absolute", left: x - w / 2, top: y - h / 2, width: w, height: h, transformStyle: "preserve-3d", transform: `translate3d(${fly ? fly[0] * (1 - p) : 0}px, ${fly ? fly[1] * (1 - p) : 0}px, ${zz}px)` }}>
      <div
        style={{
          position: "absolute",
          // Oversized by the bracket margin: Chrome clips a tilted layer to its own box, so the brackets must sit inside it.
          inset: -M,
          transform: `rotateX(${rx + (1 - p) * 24 + idleX}deg) rotateY(${ry + idleY}deg) scale(${u.line * c.sx}, ${u.open * c.sy})`,
          opacity: flickerIn(t, at, seed, 5) * fo * (1 - dim * 0.5),
        }}
      >
        <div style={{ position: "absolute", inset: M }}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            clipPath: notchClip(notch),
            opacity: u.fill,
            background: `linear-gradient(180deg, ${rgba(col, 0.16)}, ${rgba(col, 0.05)} 55%, ${rgba(col, 0.1)})`,
          }}
        >
          <div style={{ position: "absolute", inset: 0, backgroundImage: `repeating-linear-gradient(0deg, ${rgba(col, 0.07)} 0px, ${rgba(col, 0.07)} 1px, transparent 1px, transparent 4px)` }} />
          {/* Interference edge: an iridescent strip whose colours slide with the tilt. */}
          <div style={{ position: "absolute", left: notch, right: 0, top: 0, height: 3, background: `linear-gradient(90deg, ${rgba(col, 0)}, ${col}, ${VIOLET}, ${OK}, ${col}, ${rgba(col, 0)})`, backgroundSize: "200% 100%", backgroundPosition: `${50 + (ry + idleY) * 4}% 0` }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(105deg, transparent 42%, rgba(255,255,255,0.13) 50%, transparent 58%)", backgroundSize: "300% 100%", backgroundPosition: `${100 - sweep * 100}% 0`, opacity: sweep > 0 && sweep < 1 ? 1 : 0 }} />
        </div>
        <svg width={w + 80} height={h + 80} viewBox={`-40 -40 ${w + 80} ${h + 80}`} style={{ position: "absolute", left: -40, top: -40, overflow: "visible", filter: glow ? `drop-shadow(0 0 6px ${rgba(col, 0.7)})` : undefined }}>
          <path d={notchPath(w, h, notch)} fill="none" stroke={rgba(col, 0.75)} strokeWidth={1.6} pathLength={1} strokeDasharray={`${u.border} 1`} />
          {/* The notched corners get a bright chamfer tick; the square corners get brackets. */}
          <path d={`M ${notch * 0.15} ${notch * 0.85} L ${notch * 0.85} ${notch * 0.15}`} stroke={col} strokeWidth={4} opacity={u.border} />
          <path d={`M ${w - notch * 0.85} ${h - notch * 0.15} L ${w - notch * 0.15} ${h - notch * 0.85}`} stroke={col} strokeWidth={4} opacity={u.border} />
          <g fill="none" stroke={INK} strokeWidth={3} opacity={bIn}>
            <path d={`M ${w + bo - 30} ${-bo} H ${w + bo} V ${-bo + 30}`} />
            <path d={`M ${-bo + 30} ${h + bo} H ${-bo} V ${h + bo - 30}`} />
          </g>
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", opacity: ramp(t, u.content, 6 / FPS) }}>
          {header && (
            <div style={{ display: "flex", alignItems: "center", gap: 18, padding: `20px ${pad}px 16px ${pad + notch * 0.4}px`, borderBottom: `1px solid ${rgba(col, 0.35)}` }}>
              {code && <span style={{ fontFamily: MONO, fontWeight: 500, fontSize: 28, color: col }}>{code}</span>}
              {title && <ScrambleText text={title} at={u.content} cps={40} seed={seed + 5} style={{ ...LABEL_STYLE, fontSize: 30, color: INK }} />}
              <span style={{ flex: 1 }} />
              <Dot color={tone === "alert" ? ALERT : OK} seed={seed} />
            </div>
          )}
          <div style={{ position: "relative", flex: 1, padding: pad }}>{children}</div>
        </div>
        </div>
      </div>
      {c.dot > 0 && <div style={{ position: "absolute", left: w / 2 - 6, top: h / 2 - 6, width: 12, height: 12, borderRadius: 12, background: INK, opacity: c.dot, boxShadow: `0 0 18px 6px ${rgba(col, 0.8)}` }} />}
    </div>
  );
};

// ---------- text ----------

export type ScrambleTextProps = {
  text: string;
  at: number;
  cps?: number;
  seed?: number;
  // A substring to light in the accent colour.
  accent?: string;
  accentColor?: string;
  cursor?: boolean;
  scrambleColor?: string;
  style?: CSSProperties;
};

// Text that types on at ~30 chars/s, each glyph resolving from seeded random symbols, with an optional block cursor that blinks once typing ends.
export const ScrambleText: FC<ScrambleTextProps> = ({ text, at, cps = 30, seed = 1, accent, accentColor = HOLO, cursor = false, scrambleColor = HOLO, style }) => {
  const { t, f } = useTime();
  const chars = scramble(text, t, at, cps, seed);
  const a0 = accent ? text.indexOf(accent) : -1;
  const a1 = a0 >= 0 ? a0 + accent!.length : -1;
  let last = -1;
  chars.forEach((c, i) => {
    if (c.state !== "hidden") last = i;
  });
  const end = at + text.length / cps;
  const showCursor = cursor && t >= at && (t < end || Math.floor(f / 8) % 2 === 0) && t < end + 1.4;
  return (
    <span style={{ whiteSpace: "pre-wrap", ...style }}>
      {chars.map((c, i) => {
        const acc = i >= a0 && i < a1;
        return (
          <span key={i} style={{ visibility: c.state === "hidden" ? "hidden" : "visible", color: c.state === "scramble" ? scrambleColor : acc ? accentColor : undefined, textShadow: acc && c.state === "done" ? glowText(accentColor, 0.8) : undefined, opacity: c.state === "scramble" ? 0.8 : 1 }}>
            {c.ch}
            {showCursor && i === last && (
              <span style={{ position: "relative", display: "inline-block", width: 0 }}>
                <span style={{ position: "absolute", left: "0.08em", top: "-0.82em", width: "0.5em", height: "0.95em", background: HOLO, boxShadow: `0 0 12px ${rgba(HOLO, 0.7)}` }} />
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
};

// ---------- instruments ----------

const arc = (cx: number, cy: number, r: number, a0: number, a1: number) => {
  const p = (a: number) => [cx + r * Math.cos(((a - 90) * Math.PI) / 180), cy + r * Math.sin(((a - 90) * Math.PI) / 180)];
  const [x0, y0] = p(a0);
  const [x1, y1] = p(a1);
  return `M ${x0} ${y0} A ${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1} ${y1}`;
};

// Concentric arcs: a rotating tick ring, the value arc filling out-expo, a counter-rotating segment ring and a notched core.
export const RingGauge: FC<{ size?: number; value: number; at: number; dur?: number; tone?: Tone; children?: ReactNode }> = ({ size = 600, value, at, dur = 1.2, tone = "holo", children }) => {
  const { t } = useTime();
  const col = TONE[tone];
  const R = size / 2;
  const c = R;
  const show = (k: number) => ramp(t, at + k * 0.08, 0.5, EXPO);
  const fill = ramp(t, at + 0.15, dur, EXPO) * value;
  const ticks = Array.from({ length: 90 }, (_, i) => i);
  const headA = fill * 360;
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <g transform={`rotate(${t * 6} ${c} ${c})`} opacity={show(0)}>
          {ticks.map((i) => {
            const a = (i / 90) * Math.PI * 2;
            const long = i % 6 === 0;
            const r0 = R - 4 - (long ? 22 : 10);
            return <line key={i} x1={c + Math.cos(a) * r0} y1={c + Math.sin(a) * r0} x2={c + Math.cos(a) * (R - 4)} y2={c + Math.sin(a) * (R - 4)} stroke={rgba(col, long ? 0.7 : 0.3)} strokeWidth={long ? 2.5 : 1.5} />;
          })}
        </g>
        <circle cx={c} cy={c} r={R - 52} fill="none" stroke={rgba(col, 0.13)} strokeWidth={18} opacity={show(1)} />
        {fill > 0.002 && <path d={arc(c, c, R - 52, 0, Math.min(359.9, headA))} fill="none" stroke={col} strokeWidth={18} style={{ filter: `drop-shadow(0 0 8px ${rgba(col, 0.6)})` }} />}
        {fill > 0.002 && <line x1={c} y1={c - (R - 52) - 22} x2={c} y2={c - (R - 52) + 22} stroke={INK} strokeWidth={3} transform={`rotate(${headA} ${c} ${c})`} />}
        <circle cx={c} cy={c} r={R - 84} fill="none" stroke={rgba(VIOLET, 0.7)} strokeWidth={6} strokeDasharray="30 14 6 14" transform={`rotate(${-t * 14} ${c} ${c})`} opacity={show(2)} />
        <circle cx={c} cy={c} r={R - 104} fill="none" stroke={rgba(col, 0.35)} strokeWidth={1.5} opacity={show(3)} />
        {[0, 90, 180, 270].map((a) => (
          <rect key={a} x={c - 3} y={c - (R - 104) - 9} width={6} height={18} fill={col} transform={`rotate(${a + t * 3} ${c} ${c})`} opacity={show(3)} />
        ))}
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>{children}</div>
    </div>
  );
};

// Ruler ticks with a moving caret, for edges and scales.
export const TickScale: FC<{ x: number; y: number; length: number; vertical?: boolean; n?: number; cursor?: number; color?: string; opacity?: number; at?: number }> = ({ x, y, length, vertical, n = 40, cursor, color = HOLO, opacity = 1, at = 0 }) => {
  const { t } = useTime();
  const draw = ramp(t, at, 0.6, EXPO);
  const ticks = Array.from({ length: n + 1 }, (_, i) => i).filter((i) => i / n <= draw);
  const pos = (i: number) => (i / n) * length;
  const cp = cursor === undefined ? undefined : cursor * length;
  return (
    <svg style={{ position: "absolute", left: x - 30, top: y - 30, overflow: "visible", opacity }} width={vertical ? 60 : length + 60} height={vertical ? length + 60 : 60}>
      <g transform="translate(30 30)">
        {ticks.map((i) => {
          const L = i % 10 === 0 ? 18 : i % 5 === 0 ? 11 : 6;
          return vertical ? <line key={i} x1={0} y1={pos(i)} x2={L} y2={pos(i)} stroke={rgba(color, i % 5 === 0 ? 0.7 : 0.35)} strokeWidth={1.5} /> : <line key={i} x1={pos(i)} y1={0} x2={pos(i)} y2={-L} stroke={rgba(color, i % 5 === 0 ? 0.7 : 0.35)} strokeWidth={1.5} />;
        })}
        {cp !== undefined && draw > 0.99 && (vertical ? <path d={`M ${24} ${cp} l 12 -8 v 16 z`} fill={color} /> : <path d={`M ${cp} ${-24} l -8 -12 h 16 z`} fill={color} />)}
      </g>
    </svg>
  );
};

export type ReadoutRow = { label: string; value: number | string; unit?: string; decimals?: number; at: number; tone?: Tone; bar?: number };

// Data readout rows: label, dotted leader, a value that rolls up through scrambled digits, and an optional segmented bar.
export const Readouts: FC<{ rows: ReadoutRow[]; width: number; size?: number }> = ({ rows, width, size = 40 }) => {
  const { t } = useTime();
  return (
    <div style={{ width, display: "flex", flexDirection: "column", gap: 22 }}>
      {rows.map((r, i) => {
        if (t < r.at) return <div key={i} style={{ height: size + (r.bar !== undefined ? 30 : 0) }} />;
        const col = TONE[r.tone ?? "holo"];
        const v = typeof r.value === "number" ? roll(t, r.at + 0.1, r.value, 0.9, r.decimals ?? 0, i + 3) : null;
        const segs = 24;
        const lit = r.bar === undefined ? 0 : Math.round(r.bar * segs * ramp(t, r.at + 0.15, 0.8, EXPO));
        return (
          <div key={i} style={{ transform: `translateX(${(1 - ramp(t, r.at, 0.35, EXPO)) * 24}px)`, opacity: flickerIn(t, r.at, i + 11, 4) }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
              <ScrambleText text={r.label} at={r.at} cps={45} seed={i + 21} style={{ ...LABEL_STYLE, fontSize: 30, color: MUTED }} />
              <span style={{ flex: 1, borderBottom: `2px dotted ${rgba(col, 0.35)}`, transform: "translateY(-8px)" }} />
              <span style={{ fontFamily: MONO, fontWeight: 500, fontSize: size, color: r.tone && r.tone !== "holo" ? col : INK, fontVariantNumeric: "tabular-nums" }}>
                {v ? group(v.text) : <ScrambleText text={String(r.value)} at={r.at + 0.1} cps={30} seed={i + 41} />}
              </span>
              {r.unit && <span style={{ fontFamily: MONO, fontSize: 28, color: col }}>{r.unit}</span>}
            </div>
            {r.bar !== undefined && (
              <div style={{ display: "flex", gap: 4, marginTop: 10 }}>
                {Array.from({ length: segs }, (_, k) => (
                  <span key={k} style={{ flex: 1, height: 12, background: k < lit ? col : rgba(col, 0.12), boxShadow: k === lit - 1 ? `0 0 10px ${rgba(col, 0.9)}` : undefined }} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// ---------- projection ----------

// A projector pad on the floor and the light cone it throws upward; `on` 0..1 powers it.
export const Emitter: FC<{ x: number; y: number; w?: number; top: number; topW: number; on: number; seed?: number; tone?: Tone }> = ({ x, y, w = 420, top, topW, on, seed = 1, tone = "holo" }) => {
  const { t } = useTime();
  const col = TONE[tone];
  if (on <= 0) return null;
  const hgt = y - top;
  const motes = Array.from({ length: 26 }, (_, i) => {
    const sp = 60 + noise(seed + i, 1) * 90;
    const life = (t * sp + noise(seed + i, 2) * hgt) % hgt;
    const sx = (noise(seed + i, 3) - 0.5) * (w * 0.8 + (topW - w) * (life / hgt) * 0.8);
    return { x: x + sx, y: y - life, o: Math.sin((life / hgt) * Math.PI) * 0.8, s: 2 + noise(seed + i, 4) * 3 };
  });
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: x - Math.max(w, topW) / 2,
          top,
          width: Math.max(w, topW),
          height: hgt,
          opacity: on * (0.92 + 0.08 * Math.sin(t * 23)),
          clipPath: `polygon(${50 - (topW / Math.max(w, topW)) * 50}% 0, ${50 + (topW / Math.max(w, topW)) * 50}% 0, ${50 + (w / Math.max(w, topW)) * 50}% 100%, ${50 - (w / Math.max(w, topW)) * 50}% 100%)`,
          background: `linear-gradient(0deg, ${rgba(col, 0.3)}, ${rgba(col, 0.06)} 70%, ${rgba(col, 0.0)})`,
        }}
      />
      <svg style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }} width={W} height={H}>
        {motes.map((m, i) => (
          <circle key={i} cx={m.x} cy={m.y} r={m.s} fill={INK} opacity={m.o * on * 0.7} />
        ))}
        <g opacity={on}>
          <ellipse cx={x} cy={y} rx={w / 2 + 40} ry={34} fill="none" stroke={rgba(col, 0.35)} strokeWidth={1.5} />
          <ellipse cx={x} cy={y} rx={w / 2} ry={26} fill={rgba(col, 0.12)} stroke={col} strokeWidth={2} />
          <ellipse cx={x} cy={y} rx={w / 2 - 30} ry={18} fill="none" stroke={rgba(col, 0.8)} strokeWidth={3} strokeDasharray="22 12" strokeDashoffset={-t * 60} />
          <ellipse cx={x} cy={y} rx={w * 0.18} ry={8} fill={INK} opacity={0.85} style={{ filter: `drop-shadow(0 0 12px ${col})` }} />
        </g>
      </svg>
    </>
  );
};

// A chip of mono data: key in muted label, value in ink.
export const DataChip: FC<{ k: string; v: string; tone?: Tone; at: number; seed?: number }> = ({ k, v, tone = "holo", at, seed = 1 }) => {
  const { t } = useTime();
  const col = TONE[tone];
  return (
    <span style={{ display: "inline-flex", alignItems: "baseline", gap: 12, padding: "8px 16px", border: `1px solid ${rgba(col, 0.45)}`, background: rgba(col, 0.07), opacity: flickerIn(t, at, seed, 4) }}>
      <span style={{ ...LABEL_STYLE, fontSize: 28, color: col }}>{k}</span>
      <ScrambleText text={v} at={at + 0.05} cps={30} seed={seed + 3} style={{ fontFamily: MONO, fontWeight: 500, fontSize: 28, color: INK }} />
    </span>
  );
};

// Heading text in the display face with a whisper of chromatic split; `split` > 0 widens it for glitch moments.
export const headStyle = (size: number, split = 0.8, color = INK): CSSProperties => ({ fontFamily: HEAD, fontWeight: 600, fontSize: size, color, lineHeight: 1.05, letterSpacing: "-0.01em", textShadow: shadows(chroma(split), `0 0 18px ${rgba(HOLO, 0.25)}`) });

