// The specimen page: flat paper (or night) with seeded grain, a giant ghost "Aa" that breathes through its axes, live axis readouts, and the mono kicker and readout labels.
import type { CSSProperties, FC } from "react";
import { AbsoluteFill } from "remotion";
import { useTime } from "../../core/time";
import { FR, M, MONO, TONE, type Tone } from "./theme";
import { VarWord, grow, type Axes } from "./type";

// Recursive in full mono, casual off: every readout keeps its column while digits tick.
export const monoStyle = (size = 28, wght = 500, casl = 0): CSSProperties => ({
  fontFamily: MONO,
  fontSize: size,
  fontVariationSettings: `"MONO" 1, "CASL" ${casl}, "wght" ${wght}`,
  letterSpacing: "0.06em",
  lineHeight: 1.1,
  whiteSpace: "pre",
});

const n3 = (v: number) => String(Math.round(v)).padStart(4, " ");

// "wght  642  wdth  118": the axis values a letter is at right now, as a specimen sheet would print them.
export const AxisReadout: FC<{ axes: Axes; color: string; size?: number; keys?: (keyof Axes)[]; style?: CSSProperties }> = ({ axes, color, size = 28, keys = ["wght", "wdth"], style }) => (
  <div style={{ ...monoStyle(size), color, ...style }}>
    {keys
      .filter((k) => axes[k] !== undefined)
      .map((k) => `${k} ${n3(axes[k] as number)}`)
      .join("   ")}
  </div>
);

// A specimen-site axis slider: hairline track, end values, and an accent handle at the current value.
export const AxisSlider: FC<{ axis: string; value: number; min: number; max: number; width: number; color: string; muted: string; rule: string; style?: CSSProperties }> = ({ axis, value, min, max, width, color, muted, rule, style }) => {
  const x = ((value - min) / (max - min)) * width;
  return (
    <div style={{ position: "relative", width, height: 84, ...style }}>
      <div style={{ ...monoStyle(28, 600), color: muted, position: "absolute", left: 0, top: 0 }}>{axis}</div>
      <div style={{ ...monoStyle(28, 700), color, position: "absolute", right: 0, top: 0 }}>{Math.round(value)}</div>
      <div style={{ position: "absolute", left: 0, top: 58, width, height: 2, background: rule }} />
      <div style={{ position: "absolute", left: 0, top: 57, width: x, height: 4, background: color }} />
      <div style={{ position: "absolute", left: x - 9, top: 50, width: 18, height: 18, borderRadius: 9, background: color }} />
    </div>
  );
};

// A small mono label that types in letter by letter, each letter swelling from light to its weight.
export const Kicker: FC<{ text: string; at: number; color: string; size?: number; wght?: number; style?: CSSProperties }> = ({ text, at, color, size = 30, wght = 650, style }) => {
  const { t } = useTime();
  return (
    <div style={{ display: "flex", ...style }}>
      <VarWord
        text={text}
        size={size}
        family={MONO}
        color={color}
        track={0.08}
        lineHeight={1.1}
        axes={(i) => grow(t, at, i, { wght, MONO: 1, CASL: 0 }, { wght: 300, MONO: 1, CASL: 1 }, FR)}
      />
    </div>
  );
};

// The ghost's axis state: weight and width breathe on slow, offset cycles so the page is never still.
export const ghostAxes = (t: number, i: number): Axes => ({
  wght: 520 + 420 * Math.sin(2 * Math.PI * (t / 6 - i * 0.18)),
  wdth: 96 + 46 * Math.sin(2 * Math.PI * (t / 8 - i * 0.12) + 1.1),
  slnt: -5 - 5 * Math.sin(2 * Math.PI * (t / 10 - i * 0.1)),
});

export type SpecimenProps = { tone?: Tone; ghost?: string; readout?: boolean; label?: string };

// The background every scene sits on. Grain re-seeds every 2 frames (15 fps), the board's "optional faint grain".
export const Specimen: FC<SpecimenProps> = ({ tone = "paper", ghost = "Aa", readout = true, label = "ROBOTO FLEX · VARIABLE" }) => {
  const { t, f } = useTime();
  const c = TONE[tone];
  const g0 = ghostAxes(t, 0);
  return (
    <AbsoluteFill style={{ background: c.bg, overflow: "hidden" }}>
      {ghost && (
        <div style={{ position: "absolute", right: -60, bottom: -220 }}>
          <VarWord text={ghost} size={860} color={c.ghost} lineHeight={1} axes={(i) => ghostAxes(t, i)} />
        </div>
      )}
      {readout && (
        <>
          <div style={{ ...monoStyle(28), color: c.muted, position: "absolute", left: M, top: 72 }}>{label}</div>
          <AxisReadout axes={g0} color={c.muted} keys={["wght", "wdth", "slnt"]} style={{ position: "absolute", right: M, top: 72 }} />
        </>
      )}
      <svg width="100%" height="100%" style={{ position: "absolute", inset: 0, opacity: tone === "paper" ? 0.07 : 0.09, mixBlendMode: tone === "paper" ? "multiply" : "screen" }}>
        <filter id={`vfb-grain-${tone}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={Math.floor(f / 2) % 7} />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#vfb-grain-${tone})`} />
      </svg>
    </AbsoluteFill>
  );
};

// A full-frame tone change for demos and scenes that need night instead of paper.
export const Night: FC<{ ghost?: string; label?: string }> = ({ ghost = "Rr", label }) => <Specimen tone="night" ghost={ghost} label={label} />;
