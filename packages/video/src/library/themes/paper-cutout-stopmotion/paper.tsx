// Paper primitives: the paper filter (scissor-rough edge, fibre grain, cut-edge light), PaperPiece with depth-plane shadow, torn sheets, cut-out letters, masking tape, the kraft tabletop and the stepped camera.
import { createContext, useContext, useId, type CSSProperties, type FC, type ReactNode } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { useTime } from "../../core/time";
import { CAM_STEP, CORE, CREAM, HEAD, INK, KRAFT, MONO, MUSTARD, SHADOW_RGB, STEP, TAPE, TEAL, TOMATO, castShadow } from "./theme";
import { drop, mix, nudge, rng, stepRamp, type Pose } from "./stop";
import { cutCircle, cutPoly, pathOf, tapeClip, tornRect, type P } from "./shapes";

export const useFxId = () => `pc${useId().replace(/[^a-zA-Z0-9]/g, "")}`;

// Two filters per piece: `id` turns a flat fill into paper; `id`+"l" separates stacked layers inside a piece (cut-edge light plus a 2 px contact shadow).
export const PaperFx: FC<{ id: string; seed?: number; rough?: number; grain?: number; boil?: boolean }> = ({ id, seed = 1, rough = 1.8, grain = 1, boil = true }) => {
  const f = useCurrentFrame();
  // Boiling edges: the fine edge noise re-seeds every hold, under 2 px, so a held shot never freezes.
  const b = boil ? Math.floor(f / STEP) % 3 : 0;
  return (
    <svg width={0} height={0} style={{ position: "absolute" }} aria-hidden>
      <defs>
        <filter id={id} x="-6%" y="-6%" width="112%" height="112%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves={2} seed={seed * 5 + b} result="en" />
          <feDisplacementMap in="SourceGraphic" in2="en" scale={rough} xChannelSelector="R" yChannelSelector="G" result="cut" />
          <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves={3} seed={seed + 11} result="mn" />
          <feColorMatrix in="mn" type="matrix" values={`0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  ${0.6 * grain} 0 0 0 ${-0.3 * grain}`} result="ml" />
          <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves={2} seed={seed + 23} result="gn" />
          <feColorMatrix in="gn" type="matrix" values={`0 0 0 0 0.22  0 0 0 0 0.14  0 0 0 0 0.06  ${-1.1 * grain} 0 0 0 ${0.56 * grain}`} result="gd" />
          <feTurbulence type="turbulence" baseFrequency="0.035 0.2" numOctaves={1} seed={seed + 37} result="fn" />
          <feColorMatrix in="fn" type="matrix" values={`0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  ${-16 * grain} 0 0 0 ${0.3 * grain}`} result="fl" />
          <feComposite in="ml" in2="cut" operator="in" result="m" />
          <feComposite in="gd" in2="cut" operator="in" result="g" />
          <feComposite in="fl" in2="cut" operator="in" result="fb" />
          <feOffset in="cut" dx="1.8" dy="1.8" result="s1" />
          <feComposite in="cut" in2="s1" operator="out" result="tl" />
          <feFlood floodColor="#ffffff" floodOpacity="0.55" />
          <feComposite in2="tl" operator="in" result="hi" />
          <feOffset in="cut" dx="-1.4" dy="-1.4" result="s2" />
          <feComposite in="cut" in2="s2" operator="out" result="br" />
          <feFlood floodColor={`rgb(${SHADOW_RGB})`} floodOpacity="0.3" />
          <feComposite in2="br" operator="in" result="lo" />
          <feMerge>
            <feMergeNode in="cut" />
            <feMergeNode in="m" />
            <feMergeNode in="g" />
            <feMergeNode in="fb" />
            <feMergeNode in="hi" />
            <feMergeNode in="lo" />
          </feMerge>
        </filter>
        <filter id={`${id}l`} x="-15%" y="-15%" width="135%" height="135%" colorInterpolationFilters="sRGB">
          <feGaussianBlur in="SourceAlpha" stdDeviation="1.2" />
          <feOffset dx="2" dy="2.6" result="sb" />
          <feFlood floodColor={`rgb(${SHADOW_RGB})`} floodOpacity="0.38" />
          <feComposite in2="sb" operator="in" result="sh" />
          <feOffset in="SourceGraphic" dx="1.4" dy="1.4" result="o" />
          <feComposite in="SourceGraphic" in2="o" operator="out" result="tl" />
          <feFlood floodColor="#ffffff" floodOpacity="0.5" />
          <feComposite in2="tl" operator="in" result="hi" />
          <feMerge>
            <feMergeNode in="sh" />
            <feMergeNode in="SourceGraphic" />
            <feMergeNode in="hi" />
          </feMerge>
        </filter>
      </defs>
    </svg>
  );
};

const LayerCtx = createContext<string | undefined>(undefined);
// Filter for a layer stacked inside a piece (an eye on a head, a flame on a rocket).
export const useLayer = () => useContext(LayerCtx);
export const Layer: FC<{ d: string; fill: string; o?: number }> = ({ d, fill, o = 1 }) => <path d={d} fill={fill} opacity={o} filter={useLayer()} />;

export type PieceProps = {
  x: number;
  y: number;
  w: number;
  h: number;
  // Depth plane: 0 flat on the board, 1 mid, 2 front, 3 hovering.
  z?: number;
  pose?: Partial<Pose>;
  r?: number;
  s?: number;
  seed?: number;
  rough?: number;
  grain?: number;
  still?: boolean;
  // Children are SVG in a w×h box unless html is set.
  html?: boolean;
  // Ink printed on the paper: rides with the piece but casts no shadow and isn't roughened.
  print?: ReactNode;
  children?: ReactNode;
  style?: CSSProperties;
};

// PaperPiece: anything cut from paper, sitting on a depth plane, nudged between exposures.
export const Piece: FC<PieceProps> = ({ x, y, w, h, z = 1, pose = {}, r = 0, s = 1, seed = 1, rough = 1.8, grain = 1, still, html, print, children, style }) => {
  const id = useFxId();
  const f = useCurrentFrame();
  const p = mix(pose);
  if (p.o <= 0) return null;
  const n = still ? { dx: 0, dy: 0, r: 0 } : nudge(f, seed);
  const tf = `translate(${(p.dx + n.dx).toFixed(2)}px, ${(p.dy + n.dy).toFixed(2)}px) rotate(${(r + p.r + n.r).toFixed(2)}deg) scale(${(s * p.s).toFixed(4)})`;
  return (
    <div style={{ position: "absolute", left: x - w / 2, top: y - h / 2, width: w, height: h, opacity: p.o, ...style }}>
      <PaperFx id={id} seed={seed} rough={rough} grain={grain} />
      <div style={{ position: "absolute", inset: 0, transform: tf }}>
        <div style={{ position: "absolute", inset: 0, filter: `url(#${id}) ${castShadow(z + p.lift * 3)}` }}>
          <LayerCtx.Provider value={`url(#${id}l)`}>
            {html ? children : (
              <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: "block", overflow: "visible" }}>
                {children}
              </svg>
            )}
          </LayerCtx.Provider>
        </div>
        {print && <div style={{ position: "absolute", inset: 0 }}>{print}</div>}
      </div>
    </div>
  );
};

export type SheetProps = Omit<PieceProps, "w" | "h" | "children"> & { w: number; h: number; color?: string; sides?: string; amp?: number; core?: string | false; children?: ReactNode };

// A sheet torn on the listed sides ("t", "r", "b", "l"), the white core peeking out where it tore. Print sits in the sheet's own w×h box.
export const Sheet: FC<SheetProps> = ({ w, h, color = CREAM, sides = "tb", amp = 7, core = CORE, seed = 1, children, print, ...rest }) => {
  const pad = amp + 12;
  const g = tornRect(pad, pad, w, h, seed, sides, amp);
  return (
    <Piece {...rest} seed={seed} w={w + pad * 2} h={h + pad * 2} print={print && <div style={{ position: "absolute", left: pad, top: pad, width: w, height: h }}>{print}</div>}>
      {core && <path d={g.core} fill={core} />}
      <path d={g.paper} fill={color} />
      {children && <g transform={`translate(${pad} ${pad})`}>{children}</g>}
    </Piece>
  );
};

export type CutTextProps = {
  text: string;
  x: number;
  y: number;
  size: number;
  color?: string | string[];
  font?: string;
  weight?: number;
  seed?: number;
  // Cue: letters drop on one per `per` seconds from here.
  at?: number;
  per?: number;
  tilt?: number;
  z?: number;
  anchor?: "center" | "left";
  // Collage tiles behind each letter, cycled.
  tiles?: string[];
  emphAt?: number;
  pose?: Partial<Pose>;
  spacing?: number;
  // Flow inside a row instead of being placed at x, y.
  inline?: boolean;
};

// WobbleLetter: every letter cut out on its own, with a seeded tilt and offset, dropped onto the board one exposure after another.
export const CutText: FC<CutTextProps> = ({ text, x, y, size, color = INK, font = HEAD, weight = 600, seed = 1, at = 0, per = 2 / 30, tilt = 5, z = 1, anchor = "center", tiles, emphAt, pose = {}, spacing = 0.02, inline }) => {
  const id = useFxId();
  const { t, f } = useTime();
  const cols = Array.isArray(color) ? color : [color];
  let k = 0;
  return (
    <div style={{ ...(inline ? { position: "relative" } : { position: "absolute", left: x, top: y, transform: `translate(${anchor === "center" ? "-50%" : "0"}, -50%)` }), display: "flex", alignItems: "center", whiteSpace: "pre", fontFamily: font, fontWeight: weight, fontSize: size, lineHeight: 1, letterSpacing: 0 }}>
      <PaperFx id={id} seed={seed} rough={Math.min(2.2, size / 60)} />
      {text.split("").map((ch, i) => {
        if (ch === " ") return <span key={i} style={{ width: size * 0.3 }} />;
        const j = k++;
        const r = rng(seed * 31 + j * 7);
        const rot = (r() - 0.5) * 2 * tilt;
        const dy = (r() - 0.5) * size * 0.08;
        const sc = 0.95 + r() * 0.1;
        const n = nudge(f, seed * 13 + j, 0.6);
        const p = mix(drop(t, at + j * per, 2), pose, emphAt !== undefined && t >= emphAt && t < emphAt + 0.6 ? { r: Math.floor((t - emphAt) * 15) % 2 ? -3 : 3, lift: 0.4 } : {});
        if (p.o <= 0) return <span key={i} style={{ visibility: "hidden", padding: tiles ? "0.08em 0.14em" : 0, margin: `0 ${size * spacing}px` }}>{ch}</span>;
        const tile = tiles ? tiles[j % tiles.length] : undefined;
        const tc = rng(seed * 7 + j);
        return (
          <span key={i} style={{ display: "inline-block", margin: `0 ${size * spacing}px`, transform: `translate(${p.dx + n.dx}px, ${dy + p.dy + n.dy}px) rotate(${rot + p.r + n.r}deg) scale(${sc * p.s})`, filter: castShadow(z + p.lift * 3) }}>
            <span
              style={{
                display: "inline-block",
                color: cols[j % cols.length],
                padding: tile ? "0.1em 0.14em 0.06em" : 0,
                background: tile,
                clipPath: tile ? `polygon(${[0, 1, 2, 3].map((c) => `${((c === 1 || c === 2 ? 100 : 0) + (tc() - 0.5) * 8).toFixed(1)}% ${((c >= 2 ? 100 : 0) + (tc() - 0.5) * 8).toFixed(1)}%`).join(", ")})` : undefined,
                filter: `url(#${id})`,
              }}
            >
              {ch}
            </span>
          </span>
        );
      })}
    </div>
  );
};

export type TapeProps = { x: number; y: number; text?: string; w?: number; h?: number; r?: number; seed?: number; at?: number; size?: number; color?: string; ink?: string; anchor?: "center" | "left" | "right"; pose?: Partial<Pose> };

// TapeLabel: a strip of masking tape with torn ends; with text it sizes itself, typewriter caps in Space Mono.
export const Tape: FC<TapeProps> = ({ x, y, text, w, h = 58, r = -2, seed = 3, at = -1, size = 30, color = TAPE, ink = INK, anchor = "center", pose = {} }) => {
  const id = useFxId();
  const { t, f } = useTime();
  const p = mix(drop(t, at, 2), pose);
  if (p.o <= 0) return null;
  const n = nudge(f, seed, 0.5);
  const tx = anchor === "center" ? "-50%" : anchor === "right" ? "-100%" : "0";
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: `translate(${tx}, -50%) translate(${p.dx + n.dx}px, ${p.dy + n.dy}px) rotate(${r + p.r + n.r}deg) scale(${p.s})`, filter: `drop-shadow(1px 2px ${1 + p.lift * 4}px rgba(${SHADOW_RGB}, 0.22))` }}>
      <PaperFx id={id} seed={seed} rough={0.8} grain={0.7} />
      <div
        style={{
          width: w,
          minHeight: h,
          padding: text ? "0 34px" : 0,
          background: color,
          clipPath: tapeClip(seed),
          filter: `url(#${id})`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: MONO,
          fontWeight: 700,
          fontSize: size,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: ink,
          whiteSpace: "nowrap",
        }}
      >
        {text}
      </div>
    </div>
  );
};

// A short strip of tape holding a corner down: no text, just a torn translucent rectangle.
export const TapeBit: FC<{ x: number; y: number; r?: number; w?: number; seed?: number; at?: number }> = ({ x, y, r = -35, w = 130, seed = 5, at = -1 }) => <Tape x={x} y={y} w={w} h={42} r={r} seed={seed} at={at} />;

const noise = (freq: string, oct: number, type: string, matrix: string, size: number) =>
  `url("data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}'><filter id='n'><feTurbulence type='${type}' baseFrequency='${freq}' numOctaves='${oct}' stitchTiles='stitch'/><feColorMatrix values='${matrix}'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>`,
  )}")`;
const GRAIN = noise("0.8", 2, "fractalNoise", "0 0 0 0 0.25  0 0 0 0 0.15  0 0 0 0 0.05  -1.2 0 0 0 0.62", 320);
const FIBRES = noise("0.03 0.2", 1, "turbulence", "0 0 0 0 1  0 0 0 0 0.97  0 0 0 0 0.9  -18 0 0 0 0.34", 640);
const MOTTLE = noise("0.004", 3, "fractalNoise", "0 0 0 0 0.35  0 0 0 0 0.2  0 0 0 0 0.05  1.1 0 0 0 -0.45", 960);

// Offcuts on the edge of the board: hole-punch dots, scissor slivers and a loose thread, all outside the 96 px safe area.
const CRUMBS: { d: string; fill: string }[] = [
  { d: pathOf(cutCircle(64, 1012, 11, 4, 10)), fill: TOMATO },
  { d: pathOf(cutCircle(112, 1044, 9, 5, 10)), fill: TEAL },
  { d: pathOf(cutCircle(1858, 64, 10, 6, 10)), fill: MUSTARD },
  { d: pathOf(cutCircle(1874, 1030, 9, 7, 10)), fill: CREAM },
  { d: pathOf(cutPoly([[20, 70], [190, 40], [196, 50], [26, 84]], 8, 2)), fill: TOMATO },
  { d: pathOf(cutPoly([[1700, 1052], [1880, 1000], [1884, 1012], [1706, 1064]], 9, 2)), fill: TEAL },
  { d: pathOf(cutPoly([[1820, 380], [1900, 300], [1908, 310], [1830, 392]], 10, 2)), fill: MUSTARD },
];

// PaperBackdrop: a kraft cardboard tabletop under a desk lamp, with faint flutes, fibres, offcuts at the edges and a stop-motion exposure flicker.
export const Tabletop: FC<{ color?: string; crumbs?: boolean }> = ({ color = KRAFT, crumbs = true }) => {
  const f = useCurrentFrame();
  const flick = 1 + (rng(Math.floor(f / STEP) + 91)() - 0.5) * 0.03;
  return (
    <AbsoluteFill style={{ background: color, filter: `brightness(${flick.toFixed(3)})` }}>
      <AbsoluteFill style={{ backgroundImage: MOTTLE }} />
      <AbsoluteFill style={{ backgroundImage: "repeating-linear-gradient(90deg, rgba(90,55,20,0.05) 0px, rgba(255,240,210,0.04) 9px, rgba(90,55,20,0.05) 18px)" }} />
      <AbsoluteFill style={{ backgroundImage: FIBRES }} />
      <AbsoluteFill style={{ backgroundImage: GRAIN }} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 70% 60% at 32% 26%, rgba(255,244,222,0.26), rgba(255,244,222,0) 70%)" }} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 85% 80% at 50% 48%, rgba(0,0,0,0) 55%, rgba(70,40,12,0.34) 100%)" }} />
      {crumbs && (
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, filter: castShadow(0) }}>
          {CRUMBS.map((c, i) => <path key={i} d={c.d} fill={c.fill} />)}
          <path d="M 30 640 C 60 600, 20 560, 58 520 S 70 450, 40 420" fill="none" stroke={INK} strokeOpacity={0.3} strokeWidth={1.6} />
          <path d="M 1890 700 C 1860 730, 1900 770, 1870 800" fill="none" stroke={TOMATO} strokeOpacity={0.6} strokeWidth={1.8} />
        </svg>
      )}
    </AbsoluteFill>
  );
};

// The rostrum camera: a gentle push and pan that only moves on twos.
export const Shot: FC<{ children: ReactNode; push?: number; pan?: P; at?: number; dur?: number }> = ({ children, push = 0.03, pan = [0, 0], at = 0, dur = 4 }) => {
  const { t } = useTime();
  const u = stepRamp(t, at, dur, CAM_STEP);
  return <AbsoluteFill style={{ transform: `translate(${pan[0] * u}px, ${pan[1] * u}px) scale(${1 + push * u})` }}>{children}</AbsoluteFill>;
};

// Plain printed text (ink on paper) for use inside a Piece's print slot.
export const Print: FC<{ children: ReactNode; size?: number; font?: string; weight?: number; color?: string; align?: CSSProperties["textAlign"]; style?: CSSProperties }> = ({ children, size = 44, font = HEAD, weight = 500, color = INK, align = "left", style }) => (
  <div style={{ fontFamily: font, fontWeight: weight, fontSize: size, lineHeight: 1.15, color, textAlign: align, ...style }}>{children}</div>
);
