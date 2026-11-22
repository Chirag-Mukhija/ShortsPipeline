// Clay primitives: the lighting filters that turn any flat shape into puffy clay, the clay slab, contact shadows, faces, a placed body and the cream studio sweep.
import type { CSSProperties, FC, ReactNode } from "react";
import { AbsoluteFill, random } from "remotion";
import { useTime } from "../../core/time";
import { H, W } from "../../core/video";
import { CREAM, CREAM_DEEP, INK, LILAC, BUTTER, PINK, MINT, SHADOW, shade, tint } from "./theme";
import { bob, bodyTransform, type Body, REST } from "./motion";

// One light for the whole theme: top-left (SVG azimuth 225°). Each size blurs the shape's alpha into a height map
// (sigma), lights it with a diffuse and a low specular, and drops a warm shadow down-right. "-f" variants skip the
// drop shadow for bodies that stand on the floor with a contact shadow instead.
export type ClaySize = "xs" | "s" | "m" | "l" | "xl";
const SIZES: Record<ClaySize, number> = { xs: 1.6, s: 3, m: 7, l: 13, xl: 24 };

export const ClayFilter: FC<{ id: string; sigma: number; drop: boolean }> = ({ id, sigma, drop }) => {
  // Big shapes get a gentler dome (capped surface scale), and both light maps are blurred a touch to hide the
  // 8-bit stair-steps the lighting otherwise picks out of the blurred alpha.
  const ss = Math.min(sigma * 3.2, 42);
  const smooth = Math.max(0.6, sigma * 0.14);
  return (
    <filter id={id} x="-30%" y="-30%" width="160%" height="170%" colorInterpolationFilters="sRGB">
      <feGaussianBlur in="SourceAlpha" stdDeviation={sigma} result="hm" />
      <feDiffuseLighting in="hm" surfaceScale={ss} diffuseConstant={1} lightingColor="#ffffff" result="dif0">
        <feDistantLight azimuth={225} elevation={50} />
      </feDiffuseLighting>
      <feGaussianBlur in="dif0" stdDeviation={smooth} result="dif" />
      {/* Matte clay: half ambient, half diffuse, so a flat face keeps its own colour (0.62·sin 50° + 0.53 ≈ 1) and the shadow side only dims to about half. */}
      <feComposite in="SourceGraphic" in2="dif" operator="arithmetic" k1={0.62} k2={0.53} k3={0} k4={0} result="lit" />
      <feSpecularLighting in="hm" surfaceScale={ss} specularConstant={0.6} specularExponent={26} lightingColor="#fffaf2" result="spc0">
        <feDistantLight azimuth={225} elevation={35} />
      </feSpecularLighting>
      <feGaussianBlur in="spc0" stdDeviation={smooth} result="spc" />
      <feComposite in="spc" in2="SourceAlpha" operator="in" result="spcIn" />
      <feComposite in="spcIn" in2="lit" operator="arithmetic" k1={0} k2={0.7} k3={1} k4={0} result="clay" />
      {drop ? (
        <>
          <feGaussianBlur in="SourceAlpha" stdDeviation={sigma * 1.5 + 3} result="sb" />
          <feOffset in="sb" dx={sigma * 0.6 + 3} dy={sigma * 1.2 + 6} result="so" />
          <feFlood floodColor={shade(SHADOW, 0.1)} floodOpacity={0.42} />
          <feComposite in2="so" operator="in" result="sh" />
          <feMerge>
            <feMergeNode in="sh" />
            <feMergeNode in="clay" />
          </feMerge>
        </>
      ) : null}
    </filter>
  );
};

// Mount once per scene (pieces do it themselves through ClayScene); duplicate copies are identical, so harmless.
export const ClayDefs: FC = () => (
  <svg width={0} height={0} style={{ position: "absolute" }} aria-hidden>
    <defs>
      {(Object.keys(SIZES) as ClaySize[]).map((k) => (
        <g key={k}>
          <ClayFilter id={`clay-${k}`} sigma={SIZES[k]} drop />
          <ClayFilter id={`clay-${k}-f`} sigma={SIZES[k]} drop={false} />
        </g>
      ))}
    </defs>
  </svg>
);

export const clayFilter = (size: ClaySize, floor = false) => `url(#clay-${size}${floor ? "-f" : ""})`;
export const sizeFor = (px: number): ClaySize => (px < 70 ? "s" : px < 170 ? "m" : px < 420 ? "l" : "xl");

// The clay's own albedo: a faint dome of colour under the filter's lighting, so big flat tops never look printed.
export const clayFill = (c: string) => `radial-gradient(120% 120% at 32% 22%, ${tint(c, 0.32)} 0%, ${c} 52%, ${shade(c, 0.1)} 100%)`;

export const ClayScene: FC<{ children: ReactNode; style?: CSSProperties }> = ({ children, style }) => (
  <AbsoluteFill style={style}>
    <ClayDefs />
    {children}
  </AbsoluteFill>
);

export type SlabProps = { w: number; h: number; color: string; r?: number; floor?: boolean; size?: ClaySize; style?: CSSProperties; children?: ReactNode };

// A rounded clay slab (pill when r ≥ h/2, ball when w = h and r = w/2). Children sit on its face.
export const Slab: FC<SlabProps> = ({ w, h, color, r = Math.min(w, h) * 0.3, floor, size, style, children }) => (
  <div style={{ position: "relative", width: w, height: h, filter: clayFilter(size ?? sizeFor(Math.min(w, h)), floor), ...style }}>
    <div style={{ position: "absolute", inset: 0, borderRadius: r, background: clayFill(color) }} />
    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>{children}</div>
  </div>
);

// A soft warm ellipse on the floor; it shrinks and fades as the body above it lifts (lift 0 = touching).
export const ContactShadow: FC<{ x: number; y: number; w: number; lift?: number; o?: number }> = ({ x, y, w, lift = 0, o = 1 }) => {
  const s = 1 - 0.55 * Math.min(1, lift);
  return (
    <div
      style={{
        position: "absolute",
        left: x - (w * s) / 2,
        top: y - w * 0.09 * s,
        width: w * s,
        height: w * 0.18 * s,
        borderRadius: "50%",
        background: `radial-gradient(closest-side, ${SHADOW}cc, ${SHADOW}55 55%, ${SHADOW}00)`,
        opacity: o * (1 - 0.6 * Math.min(1, lift)),
      }}
    />
  );
};

// A body placed by its base centre (x, y = where it touches the floor), animated by a Body and an optional wobble.
export const Thing: FC<{ x: number; y: number; w: number; h: number; body?: Body; wobble?: number; shadow?: boolean; children: ReactNode; z?: number }> = ({ x, y, w, h, body = REST, wobble = 0, shadow = true, children, z }) => (
  <>
    {shadow && body.o > 0 && <ContactShadow x={x} y={y + 6} w={w * 0.95} lift={body.lift} o={body.o} />}
    <div style={{ position: "absolute", left: x - w / 2, top: y - h, width: w, height: h, transformOrigin: "50% 100%", transform: bodyTransform(body, wobble), opacity: body.o, zIndex: z }}>
      {children}
    </div>
  </>
);

export type Mood = "smile" | "happy" | "o" | "meh";

// Two glossy bead eyes, rosy cheeks and a mouth; blinks on a seeded rhythm, and `talk` (0..1) opens the mouth.
export const Face: FC<{ w: number; mood?: Mood; seed?: number; talk?: number; look?: number }> = ({ w, mood = "smile", seed = 1, talk = 0, look = 0 }) => {
  const { t } = useTime();
  const period = 2.6 + random(`blink${seed}`) * 1.8;
  const ph = (t + random(`bph${seed}`) * period) % period;
  const blink = ph < 0.13 ? 0.12 : 1;
  const e = w * 0.075;
  const gap = w * 0.17;
  const lx = look * w * 0.04;
  const mouthOpen = mood === "o" ? 1 : mood === "happy" ? 0.8 : talk;
  return (
    <svg width={w} height={w * 0.6} viewBox={`${-w / 2} ${-w * 0.3} ${w} ${w * 0.6}`} style={{ overflow: "visible" }}>
      {[-1, 1].map((s) => (
        <g key={s}>
          <ellipse cx={s * gap * 1.55} cy={w * 0.07} rx={e * 1.3} ry={e * 0.8} fill={PINK} opacity={0.75} />
          <g transform={`translate(${s * gap + lx} ${-w * 0.04}) scale(1 ${blink})`}>
            <ellipse rx={e * 0.82} ry={e} fill={INK} />
            <circle cx={-e * 0.3} cy={-e * 0.38} r={e * 0.3} fill="#fff" />
          </g>
        </g>
      ))}
      {mood === "meh" ? (
        <path d={`M ${-w * 0.07} ${w * 0.11} Q 0 ${w * 0.08} ${w * 0.07} ${w * 0.11}`} stroke={INK} strokeWidth={w * 0.028} strokeLinecap="round" fill="none" />
      ) : mouthOpen > 0.05 ? (
        <path d={`M ${-w * 0.075} ${w * 0.07} Q 0 ${w * 0.07 + w * 0.13 * mouthOpen + w * 0.03} ${w * 0.075} ${w * 0.07} Z`} fill={INK} stroke={INK} strokeWidth={w * 0.02} strokeLinejoin="round" />
      ) : (
        <path d={`M ${-w * 0.08} ${w * 0.07} Q 0 ${w * 0.15} ${w * 0.08} ${w * 0.07}`} stroke={INK} strokeWidth={w * 0.028} strokeLinecap="round" fill="none" />
      )}
    </svg>
  );
};

// Grain: one 240 px turbulence tile as an SVG data image, rasterised once and tiled (the board's 4 % noise, cheap per frame).
const GRAIN = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.25 0 0 0 0 0.2 0 0 0 0 0.18 0 0 0 1.2 -0.25'/></filter><rect width='240' height='240' filter='url(#n)'/></svg>`,
)}")`;

export const Grain: FC<{ o?: number }> = ({ o = 0.05 }) => <AbsoluteFill style={{ backgroundImage: GRAIN, opacity: o, pointerEvents: "none" }} />;

// A photo-studio sweep: lighter wall up top curving into a warmer floor, a key-light pool top-left and a soft corner falloff.
export const Sweep: FC<{ color?: string }> = ({ color = CREAM }) => (
  <AbsoluteFill
    style={{
      background: [
        `radial-gradient(70% 80% at 22% 12%, ${tint(color, 0.55)}cc 0%, ${tint(color, 0.55)}00 70%)`,
        `radial-gradient(90% 90% at 100% 110%, ${shade(color, 0.08)}aa 0%, ${shade(color, 0.08)}00 60%)`,
        `linear-gradient(180deg, ${tint(color, 0.25)} 0%, ${color} 58%, ${color === CREAM ? CREAM_DEEP : shade(color, 0.06)} 100%)`,
      ].join(","),
    }}
  />
);

// Small clay pebbles parked in three corners; they bob on their own phases above soft shadows, the background's idle life.
const PEBBLES = [
  { x: 150, y: 150, w: 92, h: 46, r: 23, c: PINK, rot: -18, ph: 0 },
  { x: 1785, y: 140, w: 62, h: 62, r: 31, c: BUTTER, rot: 0, ph: 2.1 },
  { x: 1700, y: 236, w: 34, h: 34, r: 17, c: MINT, rot: 0, ph: 1.2 },
  { x: 1850, y: 470, w: 54, h: 48, r: 16, c: LILAC, rot: 12, ph: 4.2 },
];

export const ClayRoom: FC<{ color?: string; pebbles?: boolean }> = ({ color = CREAM, pebbles = true }) => {
  const { t } = useTime();
  return (
    <AbsoluteFill style={{ backgroundColor: color, width: W, height: H }}>
      <ClayDefs />
      <Sweep color={color} />
      {pebbles &&
        PEBBLES.map((p, i) => {
          const dy = bob(t, p.ph, 6, 3.4 + i * 0.4);
          return (
            <div key={i}>
              <ContactShadow x={p.x} y={p.y + p.h / 2 + 22} w={p.w * 0.9} lift={(dy + 6) / 30} o={0.8} />
              <div style={{ position: "absolute", left: p.x - p.w / 2, top: p.y - p.h / 2 + dy, transform: `rotate(${p.rot + Math.sin(t * 0.7 + p.ph) * 4}deg)` }}>
                <Slab w={p.w} h={p.h} r={p.r} color={p.c} size="m" floor />
              </div>
            </div>
          );
        })}
      <Grain />
    </AbsoluteFill>
  );
};
