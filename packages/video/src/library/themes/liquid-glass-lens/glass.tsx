// The lens engine: GlassScene (the plate plus anything that sits behind glass) and Glass, one refractive surface that re-draws the scene under an SVG displacement filter with chromatic fringe, then lights it.
import { createContext, useContext, useId, useLayoutEffect, useRef, type CSSProperties, type FC, type ReactNode } from "react";
import { continueRender, delayRender } from "remotion";
import { useTime } from "../../core/time";
import { H, W } from "../../core/video";
import { bounds, centre, mapReach, paintLight, paintMap, type Blob, type MapOpts, type Shape } from "./optics";
import { PlateSvg, type Mood } from "./plate";
import { OPTICS } from "./theme";

// ---------- scene ----------
type SceneCtx = { backdrop: ReactNode };
const Ctx = createContext<SceneCtx | null>(null);

// Everything inside `behind` is SVG in frame coordinates; it is drawn once flat and again inside every lens, bent.
// flat={false} skips drawing the plate itself (when a Background already shows it) but still feeds it to the lenses.
export const GlassScene: FC<{ mood?: Mood; behind?: ReactNode; flat?: boolean; children?: ReactNode; style?: CSSProperties }> = ({ mood = "grove", behind, flat = true, children, style }) => {
  const backdrop = (
    <>
      <PlateSvg mood={mood} />
      {behind}
    </>
  );
  return (
    <Ctx.Provider value={{ backdrop }}>
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", ...style }}>
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", inset: 0 }}>
          {flat ? backdrop : behind}
        </svg>
        {children}
      </div>
    </Ctx.Provider>
  );
};

// Adds SVG (frame coords) on top of whatever the lenses already see: drawn flat here, and bent inside any Glass below it.
export const Behind: FC<{ svg: ReactNode; children?: ReactNode }> = ({ svg, children }) => {
  const prev = useBackdrop();
  return (
    <Ctx.Provider value={{ backdrop: (<>{prev}{svg}</>) }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        {svg}
      </svg>
      {children}
    </Ctx.Provider>
  );
};

const useBackdrop = (): ReactNode => useContext(Ctx)?.backdrop ?? <PlateSvg />;

// ---------- displacement maps ----------
// Maps are pure functions of shape and region, so static glass paints its map once; morphs paint one per frame.
const MAPS = new Map<string, string>();
const READY = new Set<string>();
const mapFor = (key: string, make: () => string) => {
  let url = MAPS.get(key);
  if (!url) {
    url = make();
    MAPS.set(key, url);
    if (MAPS.size > 120) MAPS.delete(MAPS.keys().next().value!);
  }
  return url;
};

// The filter reads its map through <feImage>, which loads asynchronously; hold the frame until the image has decoded.
const useDecoded = (url: string) => {
  useLayoutEffect(() => {
    if (READY.has(url)) return;
    const h = delayRender("liquid-glass map");
    const im = new Image();
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      READY.add(url);
      if (READY.size > 400) READY.clear();
      continueRender(h);
    };
    im.onload = finish;
    im.onerror = finish;
    im.src = url;
    if (im.complete) finish();
    return finish;
  }, [url]);
};

const q = (n: number) => Math.round(n * 2) / 2;
const shapeKey = (s: Shape) => `${s.k ?? 0}|${s.blobs.map((b) => `${q(b.x)},${q(b.y)},${q(b.w)},${q(b.h)},${q(b.r ?? -1)}`).join(";")}`;

export type Tint = [number, number, number, number];
export const CLEAR: Tint = [255, 255, 255, 0.07];
export const SMOKE: Tint = [8, 22, 12, 0.26];
export const INKY: Tint = [4, 10, 8, 0.46];

export type GlassProps = {
  shape: Shape;
  mode?: "rim" | "dome";
  // Board units: 0 flat window, 0.69 the reference glass, 1+ a heavy lens. Negative bends the other way.
  refraction?: number;
  // Fraction the red and blue channels split at the rim.
  chroma?: number;
  // Blur inside the glass in px (0 = clear; the condense entrance bridges through a little).
  frost?: number;
  bevel?: number;
  // Dome only: magnification at the centre.
  zoom?: number;
  tint?: Tint;
  // Light direction in degrees (default from the top left), plus the idle drift added on top.
  light?: number;
  glint?: { u: number; s: number };
  glow?: number;
  // Liquid wobble 0..1: noise added to the bend while the glass is settling.
  wobble?: number;
  // Uniform scale about the shape's centre (the condense entrance), with the refracted plate kept registered.
  scale?: number;
  opacity?: number;
  shadow?: number;
  // Extra SVG (frame coords) only this lens sees, e.g. labels a sliding tab magnifies.
  under?: ReactNode;
  // Replaces what the lens sees entirely (a transition shows the next scene through the glass).
  see?: ReactNode;
  margin?: number;
  // Map resolution: 1 for static glass, 0.5 for shapes that change every frame.
  res?: number;
  // Content laid out over blob 0 (or `box`), scaled with the glass.
  box?: Blob;
  children?: ReactNode;
};

// How many px of bend one board unit of refraction gives per px of bevel.
const BEND = 1.9;

export const Glass: FC<GlassProps> = ({
  shape, mode = "rim", refraction = OPTICS.refraction, chroma = OPTICS.chroma, frost = 0, bevel = OPTICS.bevel, zoom = 1.6,
  tint = CLEAR, light = -135, glint, glow = 0, wobble = 0, scale = 1, opacity = 1, shadow = OPTICS.shadow, under, see, margin = 56, res = 1, box, children,
}) => {
  const { t } = useTime();
  const ctxBackdrop = useBackdrop();
  const backdrop = see ?? ctxBackdrop;
  const id = `lg${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const region = bounds(shape, margin);
  const c = centre(shape);
  const mo: MapOpts = { bevel, rimPx: OPTICS.refraction * bevel * BEND * 0.5, mode, zoom, res };
  const key = `${shapeKey(shape)}|${region.x},${region.y},${region.w},${region.h}|${mode}|${q(bevel)}|${zoom}|${res}`;
  const url = mapFor(key, () => paintMap(shape, region, mo));
  useDecoded(url);

  // Idle life: the rim light swings 0 → 8° on sin(f / 70).
  const angle = light + 8 * (0.5 + 0.5 * Math.sin((t * 30) / 70));
  const cv = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const ctx = cv.current?.getContext("2d");
    if (!ctx) return;
    paintLight(ctx, shape, region, { bevel, angle, rimLit: OPTICS.rimLit, rimFar: OPTICS.rimFar, fresnel: 1, tint, shadow, glint, glow });
  });

  // The map holds the bend at the board's refraction; other strengths scale the filter, so the map stays cached.
  const S = 2 * mapReach(shape, mo) * (refraction / OPTICS.refraction);
  // Fringe grows with the bend but is capped, so a strong magnifier splits colour at the rim, not across the middle.
  const fringe = Math.sign(S) * Math.min(Math.abs(S) * chroma * 3, 10);
  const sR = S + fringe, sG = S, sB = S - fringe;
  const freq = 0.011 * (1 + 0.08 * Math.sin(t * 2.2));
  const lx = c.x - region.x, ly = c.y - region.y;
  const bx = box ?? shape.blobs[0]!;
  const isolate = (ch: 0 | 1 | 2) => [0, 1, 2].map((r) => [0, 1, 2, 3, 4].map((k) => (k === r && r === ch ? 1 : 0)).join(" ")).join("  ") + "  0 0 0 1 0";

  return (
    <div
      style={{
        position: "absolute", left: region.x, top: region.y, width: region.w, height: region.h, opacity,
        transform: `scale(${scale})`, transformOrigin: `${lx}px ${ly}px`, pointerEvents: "none",
      }}
    >
      <svg width={region.w} height={region.h} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <filter id={id} x="0" y="0" width={region.w} height={region.h} filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
            <feImage href={url} x="0" y="0" width={region.w} height={region.h} preserveAspectRatio="none" result="raw" />
            <feFlood floodColor="rgb(128,128,128)" result="mid" />
            <feComposite in="raw" in2="mid" operator="over" result="map0" />
            {wobble > 0.001 ? (
              <>
                <feTurbulence type="fractalNoise" baseFrequency={freq} numOctaves={2} seed={7} result="tn" />
                <feColorMatrix in="tn" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 0 0 0.5  0 0 0 0 1" result="tn1" />
                <feComposite in="map0" in2="tn1" operator="arithmetic" k1={0} k2={1} k3={wobble * 0.9} k4={-wobble * 0.45} result="map" />
              </>
            ) : (
              <feComposite in="map0" in2="map0" operator="over" result="map" />
            )}
            <feGaussianBlur in="SourceGraphic" stdDeviation={Math.max(0, frost)} result="src" />
            <feDisplacementMap in="src" in2="map" scale={sR} xChannelSelector="R" yChannelSelector="G" result="dR" />
            <feDisplacementMap in="src" in2="map" scale={sG} xChannelSelector="R" yChannelSelector="G" result="dG" />
            <feDisplacementMap in="src" in2="map" scale={sB} xChannelSelector="R" yChannelSelector="G" result="dB" />
            <feColorMatrix in="dR" type="matrix" values={isolate(0)} result="cR" />
            <feColorMatrix in="dG" type="matrix" values={isolate(1)} result="cG" />
            <feColorMatrix in="dB" type="matrix" values={isolate(2)} result="cB" />
            <feComposite in="cR" in2="cG" operator="arithmetic" k2={1} k3={1} result="cRG" />
            <feComposite in="cRG" in2="cB" operator="arithmetic" k2={1} k3={1} result="rgb" />
            {/* Glass gathers light: a touch more saturation and lift than the plate it bends. */}
            <feColorMatrix in="rgb" type="saturate" values="1.18" result="sat" />
            <feComponentTransfer in="sat" result="lift">
              <feFuncR type="linear" slope={1.04} intercept={0.02} />
              <feFuncG type="linear" slope={1.04} intercept={0.02} />
              <feFuncB type="linear" slope={1.04} intercept={0.02} />
            </feComponentTransfer>
            <feComposite in="lift" in2="raw" operator="in" />
          </filter>
        </defs>
        <g filter={`url(#${id})`}>
          <rect width={region.w} height={region.h} fill="none" />
          <g transform={`translate(${lx} ${ly}) scale(${1 / scale}) translate(${-c.x} ${-c.y})`}>
            {backdrop}
            {under}
          </g>
        </g>
      </svg>
      <canvas ref={cv} width={region.w} height={region.h} style={{ position: "absolute", inset: 0 }} />
      {children ? (
        <div
          style={{
            position: "absolute", left: bx.x - bx.w / 2 - region.x, top: bx.y - bx.h / 2 - region.y, width: bx.w, height: bx.h,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
};
