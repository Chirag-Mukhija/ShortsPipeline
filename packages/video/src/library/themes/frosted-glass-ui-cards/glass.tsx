// The glass itself: Rig (scripted cursor tilt and parallax every card reads), GlassCard (frosted pane, specular rim, glint, rise/pop/frost entrances), inner Chip, and the glint and edge helpers.
import { createContext, useContext, type CSSProperties, type FC, type ReactNode } from "react";
import { Easing, interpolate } from "remotion";
import { INOUT, OUT, clamp01, ramp, useTime } from "../../core/time";
import { BLUR, CYAN, RADIUS, SHADOW, TINT, fr, rgba, sp, type SpringCfg, type Tint } from "./theme";
import { FROST } from "./field";

// ---------- rig: one scripted cursor drives tilt and parallax for every card inside it ----------
export type CursorKey = { t: number; x: number; y: number };
export type RigState = { cx: number; cy: number; tilt: number };
const RigCtx = createContext<RigState | null>(null);

// Cursor position in -1..1 between keys, eased in-out so the camera never jerks.
export const cursorAt = (t: number, keys: CursorKey[], d = 0.9) => {
  let x = keys[0]?.x ?? 0;
  let y = keys[0]?.y ?? 0;
  for (const k of keys.slice(1)) {
    if (t < k.t - d) break;
    const e = ramp(t, k.t - d, d, INOUT);
    x += (k.x - x) * e;
    y += (k.y - y) * e;
  }
  return { x, y };
};

// Without a path the rig sways on its own (well under conscious notice), so holds never freeze.
export const Rig: FC<{ path?: CursorKey[]; tilt?: number; children: ReactNode }> = ({ path, tilt = 4, children }) => {
  const { t } = useTime();
  const c = path ? cursorAt(t, path) : { x: 0, y: 0 };
  const cx = c.x + Math.sin(t * 0.5) * 0.25;
  const cy = c.y + Math.cos(t * 0.37) * 0.18;
  return <RigCtx.Provider value={{ cx, cy, tilt }}>{children}</RigCtx.Provider>;
};

export const useRig = (): RigState => {
  const { t } = useTime();
  return useContext(RigCtx) ?? { cx: Math.sin(t * 0.5) * 0.25, cy: Math.cos(t * 0.37) * 0.18, tilt: 4 };
};

// ---------- glint ----------
// A diagonal light band crossing a card: 20 frames, in-out quad. `u` is 0..1 across.
export const GlintBand: FC<{ u: number; strength?: number; r: number }> = ({ u, strength = 1, r }) => {
  if (u <= 0 || u >= 1 || strength <= 0) return null;
  return (
    <div style={{ position: "absolute", inset: 0, borderRadius: r, overflow: "hidden", pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          top: "-20%",
          bottom: "-20%",
          width: "42%",
          left: `${-50 + u * 160}%`,
          transform: "skewX(-22deg)",
          opacity: strength,
          background: "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.10) 35%, rgba(255,255,255,0.42) 50%, rgba(255,255,255,0.10) 65%, rgba(255,255,255,0) 100%)",
        }}
      />
    </div>
  );
};

const QUAD = Easing.inOut(Easing.quad);
// The strongest live glint at time t: cue glints at full strength, plus a faint idle glint every 90 frames.
export const glintAt = (t: number, cues: number[], idle: number | false) => {
  let best = { u: 0, s: 0 };
  for (const g of cues) {
    if (t >= g && t <= g + fr(20)) best = { u: interpolate(t, [g, g + fr(20)], [0, 1], { easing: QUAD }), s: 1 };
  }
  if (idle !== false && best.s === 0) {
    const period = 3;
    const local = (((t + idle) % period) + period) % period;
    if (local <= fr(24)) best = { u: interpolate(local, [0, fr(24)], [0, 1], { easing: QUAD }), s: 0.35 };
  }
  return best;
};

// ---------- the specular rim: a 1.5 px ring whose bright side follows the light as the card tilts ----------
export const Rim: FC<{ r: number; angle: number; glow?: number; glowColor?: string; width?: number }> = ({ r, angle, glow = 0, glowColor = CYAN, width = 1.5 }) => {
  const ring: CSSProperties = {
    position: "absolute",
    inset: 0,
    borderRadius: r,
    padding: width,
    WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
    WebkitMaskComposite: "xor",
    maskComposite: "exclude",
    pointerEvents: "none",
  };
  return (
    <>
      <div style={{ ...ring, background: `linear-gradient(${angle}deg, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.28) 22%, rgba(255,255,255,0.10) 55%, rgba(255,255,255,0.35) 100%)` }} />
      {glow > 0 && <div style={{ ...ring, padding: width + 1, opacity: glow, background: `linear-gradient(${angle}deg, #FFFFFF 0%, ${glowColor} 40%, ${rgba(glowColor.startsWith("#") ? glowColor : CYAN, 0.6)} 100%)` }} />}
    </>
  );
};

// ---------- GlassCard ----------
export type Enter = "rise" | "pop" | "frost" | "none";
export type GlassProps = {
  x: number;
  y: number;
  w: number;
  h: number;
  r?: number;
  tint?: Tint;
  blur?: number;
  at?: number;
  out?: number;
  enter?: Enter;
  popCfg?: SpringCfg;
  // Where a "pop" grows from, relative to the card's top-left (e.g. the button that opened a modal).
  origin?: { x: number; y: number };
  glint?: number[];
  idleGlint?: number | false;
  glow?: number;
  glowColor?: string;
  // Parallax travel in px for a full cursor swing; bigger = nearer the viewer.
  depth?: number;
  // Idle float phase; false holds the card still.
  float?: number | false;
  lift?: number;
  dim?: number;
  rz?: number;
  extraTilt?: { rx?: number; ry?: number };
  pad?: number | string;
  contentStyle?: CSSProperties;
  children?: ReactNode;
};

export const useGlassEntrance = (t: number, at: number, enter: Enter, popCfg?: SpringCfg) => {
  if (enter === "none") return { o: 1, y: 0, s: 1, frost: 1, blur: 0 };
  if (enter === "pop") {
    const s = sp(t, at, popCfg);
    return { o: clamp01(s * 2.2), y: 0, s: 0.55 + 0.45 * s, frost: ramp(t, at, fr(16)), blur: (1 - clamp01(s * 1.3)) * 8 };
  }
  if (enter === "frost") {
    const e = ramp(t, at, fr(20), OUT);
    return { o: e, y: 0, s: 1, frost: e, blur: (1 - e) * 6 };
  }
  const e = ramp(t, at, fr(18), OUT);
  return { o: e, y: (1 - e) * 40, s: 0.96 + 0.04 * e, frost: ramp(t, at, fr(20), OUT), blur: (1 - e) * 12 };
};

export const GlassCard: FC<GlassProps> = ({
  x, y, w, h, r = RADIUS, tint = "clear", blur = BLUR, at = 0, out, enter = "rise", popCfg, origin, glint = [], idleGlint = 0,
  glow = 0, glowColor = CYAN, depth = 8, float = 0, lift = 0, dim = 0, rz = 0, extraTilt, pad = 0, contentStyle, children,
}) => {
  const { t, f } = useTime();
  const rig = useRig();
  const en = useGlassEntrance(t, at, enter, popCfg);
  if (en.o <= 0) return null;
  const ex = out === undefined ? 0 : ramp(t, out, fr(10), Easing.in(Easing.cubic));
  if (ex >= 1) return null;
  const o = en.o * (1 - ex);
  const fy = float === false ? 0 : Math.sin((f + float * 37) / 50) * 4;
  const rx = -rig.cy * rig.tilt + (extraTilt?.rx ?? 0);
  const ry = rig.cx * rig.tilt + (extraTilt?.ry ?? 0);
  const px = -rig.cx * depth;
  const py = -rig.cy * depth;
  const s = en.s * (1 - 0.02 * ex) * (1 + 0.04 * lift) * (1 - 0.06 * dim);
  const ty = en.y + fy - 16 * ex - 12 * lift;
  const [top, bottom] = TINT[tint];
  const g = glintAt(t, glint, idleGlint);
  const angle = 160 - ry * 7 + rx * 5;
  const frost = blur * en.frost;
  const tOrigin = origin ? `${origin.x}px ${origin.y}px` : "50% 50%";
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        transformOrigin: tOrigin,
        transform: `translate3d(${px}px, ${py + ty}px, 0) perspective(1800px) rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${rz}deg) scale(${s})`,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: r,
          opacity: o,
          backgroundImage: `${FROST}, linear-gradient(170deg, ${top} 0%, ${bottom} 100%)`,
          backgroundSize: "220px 220px, 100% 100%",
          backdropFilter: `blur(${frost}px) saturate(${100 + 60 * en.frost}%)`,
          WebkitBackdropFilter: `blur(${frost}px) saturate(${100 + 60 * en.frost}%)`,
          boxShadow: `${SHADOW}, inset 0 1px 0 rgba(255,255,255,0.45), inset 0 -1px 0 rgba(255,255,255,0.08)${glow > 0 ? `, 0 0 ${60 * glow}px ${glowColor.startsWith("#") ? rgba(glowColor, 0.45 * glow) : glowColor}` : ""}${lift > 0 ? `, 0 ${50 * lift}px ${90 * lift}px -20px rgba(10,5,40,${0.4 * lift})` : ""}`,
        }}
      />
      {/* A soft sheen across the upper-left: the light catching the face of the pane. */}
      <div style={{ position: "absolute", inset: 0, borderRadius: r, opacity: o, background: `linear-gradient(${angle - 30}deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.03) 38%, rgba(255,255,255,0) 60%)`, pointerEvents: "none" }} />
      <div style={{ position: "absolute", inset: 0, opacity: o }}>
        <Rim r={r} angle={angle} glow={glow} glowColor={glowColor} />
        <GlintBand u={g.u} strength={g.s} r={r} />
      </div>
      <div
        style={{
          position: "absolute",
          inset: 0,
          padding: pad,
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          opacity: o * (1 - 0.5 * dim),
          filter: en.blur > 0.05 || dim > 0.01 ? `blur(${en.blur + dim * 1.6}px) saturate(${1 - dim * 0.6})` : undefined,
          ...contentStyle,
        }}
      >
        {children}
      </div>
    </div>
  );
};

// ---------- Pane: a static frosted pane for scenes that move their own layers (stacks, wipes); fades through FadeCtx ----------
export const FadeCtx = createContext(1);

export const Pane: FC<{ x: number; y: number; w: number; h: number; r?: number; tint?: Tint; blur?: number; o?: number; angle?: number; glint?: { u: number; s: number }; children?: ReactNode; style?: CSSProperties }> = ({ x, y, w, h, r = 28, tint = "clear", blur = BLUR, o = 1, angle = 160, glint, children, style }) => {
  const fade = useContext(FadeCtx) * o;
  if (fade <= 0) return null;
  const [top, bottom] = TINT[tint];
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        borderRadius: r,
        opacity: fade,
        backgroundImage: `${FROST}, linear-gradient(170deg, ${top} 0%, ${bottom} 100%)`,
        backgroundSize: "220px 220px, 100% 100%",
        backdropFilter: `blur(${blur}px) saturate(160%)`,
        WebkitBackdropFilter: `blur(${blur}px) saturate(160%)`,
        boxShadow: `${SHADOW}, inset 0 1px 0 rgba(255,255,255,0.45)`,
        ...style,
      }}
    >
      <Rim r={r} angle={angle} />
      {glint && <GlintBand u={glint.u} strength={glint.s} r={r} />}
      {children}
    </div>
  );
};

// ---------- inner glass: chips, pills and tiles inside a card (no backdrop-filter of their own: the card already frosted what is behind) ----------
export const Chip: FC<{ children?: ReactNode; r?: number; pad?: string; tint?: Tint | "accent"; accent?: string; style?: CSSProperties }> = ({ children, r = 999, pad = "10px 22px", tint = "clear", accent = CYAN, style }) => {
  const fill = tint === "accent" ? `linear-gradient(170deg, ${rgba(accent, 0.38)}, ${rgba(accent, 0.14)})` : `linear-gradient(170deg, ${TINT[tint][0]}, ${TINT[tint][1]})`;
  return (
    <div
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        gap: 14,
        padding: pad,
        borderRadius: r,
        background: fill,
        boxShadow: `inset 0 0 0 1.5px ${tint === "accent" ? rgba(accent, 0.55) : "rgba(255,255,255,0.22)"}, inset 0 1px 0 rgba(255,255,255,0.4)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};
