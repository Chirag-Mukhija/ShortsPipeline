// Flat vector primitives: the bouncy motion helpers (pop, exit, wobble, squash, blink), SVG staging, the parallax night sky, the glowing orb, long shadows, label pills and leader lines.
import { useId, type CSSProperties, type FC, type ReactNode } from "react";
import { AbsoluteFill, interpolate, interpolateColors } from "remotion";
import { H, W } from "../../core/video";
import { OUT, clamp01, ramp, useTime } from "../../core/time";
import { BACK, DRAW_S, EXIT_S, IN, INK, LABEL, NIGHT, PLATE, PLATE_HI, POP_S, SKIES, VIOLET, TEAL, shade, tint, type SkyTone } from "./theme";
import { circleShadowD, rng } from "./geometry";

// ---------- motion ----------
// Scale for a pop-in: 0 → overshoot (back-out 1.6) → 1.
export const popIn = (t: number, at: number, d = POP_S) =>
  t < at ? 0 : interpolate(t, [at, at + d], [0, 1], { extrapolateRight: "clamp", easing: BACK });
// Exit: scale to 0.9 and fade over 9 frames, in-cubic.
export const exitOut = (t: number, at?: number) => {
  const e = at === undefined ? 0 : ramp(t, at, EXIT_S, IN);
  return { s: 1 - 0.1 * e, o: 1 - e };
};
// Damped secondary jiggle after a cue: what makes antennas, arms and labels settle with a bounce.
export const wobble = (t: number, at: number, amp = 1, hz = 3, decay = 5) => {
  const d = t - at;
  return d < 0 ? 0 : amp * Math.exp(-decay * d) * Math.sin(2 * Math.PI * hz * d);
};
// Squash and stretch with roughly constant area, lagging the pop by 2 frames.
export const squash = (t: number, at: number, amp = 0.14) => {
  const w = wobble(t, at + 0.07, amp, 2.6, 4.5);
  return { sx: 1 + w, sy: 1 - w };
};
// 1% breathing scale at a slow, per-object phase.
export const breathe = (t: number, seed = 0, amt = 0.01) => 1 + amt * Math.sin(t * 1.6 + seed * 1.7);
// Glow flicker at 0.5 Hz.
export const flicker = (t: number, seed = 0) => 0.85 + 0.15 * Math.sin(t * Math.PI + seed);
// Eye openness: closes for 3 frames every 3.5–4.5 s, at a seeded offset.
export const blink = (f: number, seed = 0) => {
  const period = 105 + Math.floor(rng(seed + 9)() * 30);
  const k = (f + Math.floor(rng(seed + 3)() * period)) % period;
  return k === 0 || k === 2 ? 0.35 : k === 1 ? 0.08 : 1;
};
// Hero emphasis: 1 → 1.08 → 1 in 10 frames.
export const pulse = (t: number, at?: number) =>
  at === undefined || t < at ? 1 : interpolate(t, [at, at + 0.15, at + 0.33], [1, 1.08, 1], { extrapolateRight: "clamp" });

// ---------- staging ----------
export const Stage: FC<{ children: ReactNode; style?: CSSProperties }> = ({ children, style }) => (
  <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ position: "absolute", inset: 0, overflow: "visible", ...style }}>
    {children}
  </svg>
);

export const At: FC<{ x: number; y: number; s?: number; sx?: number; sy?: number; r?: number; o?: number; children: ReactNode }> = ({ x, y, s = 1, sx = 1, sy = 1, r = 0, o = 1, children }) =>
  o <= 0 || s <= 0 ? null : (
    <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s * sx} ${s * sy})`} opacity={Math.min(1, o)}>
      {children}
    </g>
  );

// A 2-stop linear gradient (light top-left to deep bottom-right), the theme's one surface treatment.
export const Grad: FC<{ id: string; color: string; light?: number; dark?: number; angle?: "diag" | "down" }> = ({ id, color, light = 0.22, dark = 0.22, angle = "diag" }) => (
  <linearGradient id={id} x1="0" y1="0" x2={angle === "diag" ? "1" : "0"} y2="1">
    <stop offset="0" stopColor={tint(color, light)} />
    <stop offset="1" stopColor={shade(color, dark)} />
  </linearGradient>
);

// ---------- the sky ----------
const STAR_LAYERS = [
  { n: 70, speed: 0.2, r: [1.2, 2.2], o: 0.35 },
  { n: 40, speed: 0.4, r: [1.8, 3.0], o: 0.55 },
  { n: 16, speed: 0.7, r: [2.6, 4.2], o: 0.85 },
] as const;

// Night sky: chapter-tinted gradient, two slow nebula glows, three parallax star layers and dust rising at 0.2 px a frame.
export const Sky: FC<{ tone?: SkyTone; to?: SkyTone; shiftAt?: number; drift?: number; density?: number; tint?: string }> = ({ tone = "indigo", to, shiftAt = 0, drift = 14, density = 1, tint: starTint = INK }) => {
  const { t } = useTime();
  const k = to ? ramp(t, shiftAt, 0.9) : 0;
  const top = interpolateColors(k, [0, 1], [SKIES[tone][0], SKIES[to ?? tone][0]]);
  const bottom = interpolateColors(k, [0, 1], [SKIES[tone][1], SKIES[to ?? tone][1]]);
  return (
    <AbsoluteFill style={{ background: `linear-gradient(180deg, ${top} 0%, ${bottom} 100%)` }}>
      <Stage>
        <defs>
          <radialGradient id="fve-neb-a">
            <stop offset="0" stopColor={VIOLET} stopOpacity={0.22} />
            <stop offset="1" stopColor={VIOLET} stopOpacity={0} />
          </radialGradient>
          <radialGradient id="fve-neb-b">
            <stop offset="0" stopColor={TEAL} stopOpacity={0.12} />
            <stop offset="1" stopColor={TEAL} stopOpacity={0} />
          </radialGradient>
        </defs>
        <ellipse cx={1500 + Math.sin(t * 0.15) * 40} cy={220} rx={820} ry={520} fill="url(#fve-neb-a)" />
        <ellipse cx={300 + Math.cos(t * 0.12) * 40} cy={900} rx={760} ry={420} fill="url(#fve-neb-b)" />
        {STAR_LAYERS.map((L, li) => {
          const r = rng(77 + li * 31);
          return Array.from({ length: Math.round(L.n * density) }, (_, i) => {
            const x0 = r() * (W + 40);
            const y = r() * H;
            const rad = L.r[0] + r() * (L.r[1] - L.r[0]);
            const ph = r() * 6.28;
            const x = ((((x0 - t * drift * L.speed) % (W + 40)) + W + 40) % (W + 40)) - 20;
            const tw = 0.6 + 0.4 * Math.sin(t * (1.2 + li * 0.5) + ph);
            return <circle key={`${li}-${i}`} cx={x} cy={y} r={rad} fill={starTint} opacity={L.o * tw} />;
          });
        })}
        {Array.from({ length: Math.round(14 * density) }, (_, i) => {
          const r = rng(500 + i);
          const x = 80 + r() * (W - 160) + Math.sin(t * 0.4 + i) * 12;
          const y = (((r() * (H + 60) - t * 6) % (H + 60)) + H + 60) % (H + 60);
          return <circle key={`d${i}`} cx={x} cy={y} r={3 + r() * 3} fill={i % 3 === 0 ? TEAL : INK} opacity={0.1} />;
        })}
        {[0, 1, 2].map((i) => {
          const r = rng(900 + i * 7);
          const x = 200 + r() * 1500;
          const y = 80 + r() * 380;
          const s = 0.6 + 0.4 * Math.sin(t * 1.4 + i * 2.1);
          return <path key={`s${i}`} transform={`translate(${x} ${y}) scale(${s})`} d="M0 -14 Q2 -2 14 0 Q2 2 0 14 Q-2 2 -14 0 Q-2 -2 0 -14Z" fill={INK} opacity={0.5} />;
        })}
      </Stage>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, transparent 60%, rgba(5,8,25,0.35) 100%)" }} />
    </AbsoluteFill>
  );
};

// A curved planet surface along the bottom edge, the theme's horizon line.
export const Horizon: FC<{ color?: string; y?: number; p?: number; glow?: string }> = ({ color = "#2A3A78", y = 940, p = 1, glow = TEAL }) => {
  const id = useId().replace(/:/g, "");
  const lift = (1 - p) * 260;
  return (
    <g transform={`translate(0 ${lift})`}>
      <defs>
        <linearGradient id={`${id}g`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={tint(color, 0.08)} />
          <stop offset="1" stopColor={shade(color, 0.5)} />
        </linearGradient>
      </defs>
      <ellipse cx={W / 2} cy={y + 1500} rx={2300} ry={1530} fill={glow} opacity={0.12} />
      <ellipse cx={W / 2} cy={y + 1500} rx={2260} ry={1500} fill={`url(#${id}g)`} />
    </g>
  );
};

// ---------- surfaces ----------
// The faint 45° long shadow; a gradient so it fades out along its length.
export const LongShadow: FC<{ d: string; o?: number }> = ({ d, o = 1 }) => {
  const id = useId().replace(/:/g, "");
  return (
    <>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={NIGHT} stopOpacity={0.45 * o} />
          <stop offset="0.75" stopColor={NIGHT} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={d} fill={`url(#${id})`} />
    </>
  );
};

export type OrbProps = { x: number; y: number; r: number; color: string; p?: number; glow?: number; emphAt?: number; shadow?: boolean; ring?: boolean; seed?: number; crater?: boolean; children?: ReactNode };

// The hero orb: radial-gradient body, a terminator crescent, soft halo, long shadow; breathes and flickers when idle, pulses on emphAt.
export const GlowOrb: FC<OrbProps> = ({ x, y, r, color, p = 1, glow = 1, emphAt, shadow = true, ring = false, seed = 0, crater = false, children }) => {
  const { t } = useTime();
  const id = useId().replace(/:/g, "");
  if (p <= 0) return null;
  const em = emphAt !== undefined ? clamp01(1 - Math.abs(t - emphAt - 0.15) / 0.35) : 0;
  const s = p * breathe(t, seed) * pulse(t, emphAt);
  const halo = 0.32 * glow * flicker(t, seed) * (1 + em);
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <defs>
        <radialGradient id={`${id}h`}>
          <stop offset="0.35" stopColor={color} stopOpacity={halo} />
          <stop offset="1" stopColor={color} stopOpacity={0} />
        </radialGradient>
        <radialGradient id={`${id}b`} cx="0.36" cy="0.32" r="0.8">
          <stop offset="0" stopColor={tint(color, 0.35)} />
          <stop offset="0.55" stopColor={color} />
          <stop offset="1" stopColor={shade(color, 0.35)} />
        </radialGradient>
        <clipPath id={`${id}c`}>
          <circle r={r} />
        </clipPath>
      </defs>
      {shadow && <LongShadow d={circleShadowD(0, 0, r, r * 3.2)} />}
      <circle r={r * 2.1} fill={`url(#${id}h)`} />
      {ring && <ellipse rx={r * 1.75} ry={r * 0.42} fill="none" stroke={tint(color, 0.3)} strokeWidth={r * 0.09} opacity={0.55} transform="rotate(-18)" />}
      <circle r={r} fill={`url(#${id}b)`} />
      <g clipPath={`url(#${id}c)`}>
        <path d={`M${-r * 2} ${-r * 2}H${r * 2}V${r * 2}H${-r * 2}Z M${-r * 0.2} ${-r * 0.2} m${-r * 1.05} 0 a${r * 1.05} ${r * 1.05} 0 1 0 ${r * 2.1} 0 a${r * 1.05} ${r * 1.05} 0 1 0 ${-r * 2.1} 0`} fillRule="evenodd" fill={NIGHT} opacity={0.22} />
        {crater &&
          [[-0.35, 0.25, 0.16], [0.3, -0.3, 0.11], [0.15, 0.45, 0.09]].map(([cx, cy, cr], i) => (
            <circle key={i} cx={cx! * r} cy={cy! * r} r={cr! * r} fill={shade(color, 0.25)} opacity={0.6} />
          ))}
        {children}
      </g>
      <ellipse cx={-r * 0.38} cy={-r * 0.45} rx={r * 0.22} ry={r * 0.12} transform={`rotate(-35 ${-r * 0.38} ${-r * 0.45})`} fill="#FFFFFF" opacity={0.28} />
      {ring && <path d={`M${-r * 1.66} ${r * 0.1} A${r * 1.75} ${r * 0.42} 0 0 0 ${r * 1.66} ${-r * 0.1}`} transform="rotate(-18)" fill="none" stroke={tint(color, 0.3)} strokeWidth={r * 0.09} opacity={0.75} />}
    </g>
  );
};

// ---------- labels ----------
export type PillProps = { x: number; y: number; text: string; at: number; color?: string; size?: number; out?: number; kicker?: string; anchor?: "center" | "left" | "right"; style?: CSSProperties };

// Rounded label pill (HTML so it sizes to its text): a glowing dot, Inter text, pops with back-out and a little wobble.
export const Pill: FC<PillProps> = ({ x, y, text, at, color = TEAL, size = 36, out, kicker, anchor = "center", style }) => {
  const { t } = useTime();
  const s = popIn(t, at) * exitOut(t, out).s;
  const o = clamp01(ramp(t, at, 0.12)) * exitOut(t, out).o;
  if (s <= 0 || o <= 0) return null;
  const tx = anchor === "center" ? "-50%" : anchor === "left" ? "0%" : "-100%";
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: `translate(${tx}, -50%) scale(${s}) rotate(${wobble(t, at + 0.2, 2.5)}deg)`,
        transformOrigin: anchor === "center" ? "50% 50%" : anchor === "left" ? "0% 50%" : "100% 50%",
        opacity: o,
        display: "flex",
        alignItems: "center",
        gap: size * 0.45,
        padding: `${size * 0.42}px ${size * 0.8}px ${size * 0.42}px ${size * 0.55}px`,
        borderRadius: 999,
        background: `linear-gradient(135deg, ${PLATE_HI}, ${PLATE})`,
        boxShadow: `0 0 ${size * 1.2}px ${color}33, 14px 14px 0 rgba(8,11,32,0.35)`,
        whiteSpace: "nowrap",
        fontFamily: LABEL,
        ...style,
      }}
    >
      <div style={{ width: size * 0.5, height: size * 0.5, borderRadius: 999, background: color, boxShadow: `0 0 ${size * 0.6}px ${color}` }} />
      <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
        {kicker && <span style={{ fontSize: Math.max(28, size * 0.72), fontWeight: 500, color: tint(color, 0.35), letterSpacing: "0.02em" }}>{kicker}</span>}
        <span style={{ fontSize: size, fontWeight: 600, color: INK }}>{text}</span>
      </div>
    </div>
  );
};

// A leader line that draws on (stroke-dashoffset, 20 f out-cubic) with a dot at the anchor end.
export const Leader: FC<{ d: string; at: number; color?: string; len?: number; out?: number; w?: number }> = ({ d, at, color = INK, len = 600, out, w = 4 }) => {
  const { t } = useTime();
  const p = ramp(t, at, DRAW_S, OUT);
  const o = exitOut(t, out).o;
  if (p <= 0 || o <= 0) return null;
  return (
    <g opacity={o}>
      <path d={d} fill="none" stroke={color} strokeWidth={w} strokeLinecap="round" strokeDasharray={len} strokeDashoffset={len * (1 - p)} opacity={0.8} />
    </g>
  );
};
