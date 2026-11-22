// Isometric primitives: the world SVG and view, the three-face block, ground shadows, tile pulse, pipes with racing packets, upright leader labels and the blueprint backdrop.
import { useId, type FC, type ReactNode } from "react";
import { AbsoluteFill, Easing, interpolate, random } from "remotion";
import { FPS, H, W } from "../../core/video";
import { useTime } from "../../core/time";
import { ACCENT, CARD, INK, LABEL, MONO, RULE, SIGNAL, SUB, BG, toneOf, type Tone, type ToneName } from "./theme";
import {
  C30, FxCtx, S30, ViewCtx, boxGeo, bob, drawOn, pathLen, pointAt, proj, pts, riseState, useFx, useView, view,
  type BoxGeo, type View, type WP,
} from "./iso";

// ---------- world ----------
export const IsoWorld: FC<{ view?: Partial<View>; cam?: string; children?: ReactNode; opacity?: number }> = ({ view: vp, cam, children, opacity = 1 }) => {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ position: "absolute", inset: 0, overflow: "visible", opacity }}>
      <defs>
        <filter id={`sh${id}`} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="10" />
        </filter>
        <filter id={`so${id}`} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="4" />
        </filter>
      </defs>
      <FxCtx.Provider value={{ shadow: `url(#sh${id})`, soft: `url(#so${id})` }}>
        <ViewCtx.Provider value={view(vp ?? {})}>
          <g transform={cam}>{children}</g>
        </ViewCtx.Provider>
      </FxCtx.Provider>
    </svg>
  );
};

// A sub-world with its own view (another district, the other side of a comparison), inside the same SVG.
export const IsoGroup: FC<{ view: Partial<View>; children?: ReactNode }> = ({ view: vp, children }) => {
  const parent = useView();
  return <ViewCtx.Provider value={{ ...parent, ...vp }}>{children}</ViewCtx.Provider>;
};

// ---------- faces ----------
// Draws a box's visible faces flat-shaded, with the 2 px lighter top edges that make iso blocks crisp.
export const Faces: FC<{ geo: BoxGeo; tone: Tone; edge?: boolean }> = ({ geo, tone, edge = true }) => (
  <>
    {geo.sides.map((s, i) => (
      <polygon key={i} points={pts(s.poly)} fill={s.color} stroke={s.color} strokeWidth={0.8} strokeLinejoin="round" />
    ))}
    <polygon points={pts(geo.top)} fill={tone.top} stroke={tone.top} strokeWidth={0.8} strokeLinejoin="round" />
    {edge && geo.sides.map((s, i) => <line key={`e${i}`} x1={s.poly[3]![0]} y1={s.poly[3]![1]} x2={s.poly[2]![0]} y2={s.poly[2]![1]} stroke="#FFFFFF" strokeOpacity={0.85} strokeWidth={2} strokeLinecap="round" />)}
  </>
);

// Soft ellipse on the ground under a footprint; light comes from the upper left, so it leans down-right.
export const GroundShadow: FC<{ x: number; y: number; w: number; d: number; scale?: number; opacity?: number }> = ({ x, y, w, d, scale = 1, opacity = 1 }) => {
  const v = useView();
  const fx = useFx();
  const [cx, cy] = proj(v, x + w / 2, y + d / 2, 0);
  const r = ((w + d) / 2) * v.u * 0.98 * scale;
  if (scale <= 0.01 || opacity <= 0) return null;
  return <ellipse cx={cx + r * 0.12} cy={cy + r * 0.1} rx={r * C30} ry={r * S30} fill={INK} opacity={0.17 * opacity} filter={fx.shadow} />;
};

export type BlockProps = {
  gx: number;
  gy: number;
  w?: number;
  d?: number;
  h?: number;
  z?: number;
  tone?: ToneName | Tone;
  // Rise-in cue (s); omit to start standing. out = sink-away cue.
  at?: number;
  out?: number;
  // 0..1: lift 12 px off the ground. glow 0..1: coral halo.
  lift?: number;
  glow?: number;
  shadow?: boolean;
  edge?: boolean;
  opacity?: number;
  // Extra drawing on the faces (windows, LEDs), in the block's own rising frame.
  deco?: (geo: BoxGeo, v: View) => ReactNode;
  children?: ReactNode;
};

export const IsoBlock: FC<BlockProps> = ({ gx, gy, w = 1, d = 1, h = 1, z = 0, tone = "white", at, out, lift = 0, glow = 0, shadow, edge, opacity = 1, deco, children }) => {
  const v = useView();
  const { t } = useTime();
  const r = riseState(t, at, out);
  if (!r.visible) return null;
  const tn = toneOf(tone);
  const geo = boxGeo(v, gx, gy, z, w, d, h, tn);
  const [bx, by] = proj(v, gx + w / 2, gy + d / 2, z);
  const hasShadow = shadow ?? z === 0;
  return (
    <g opacity={opacity * r.op}>
      {hasShadow && <GroundShadow x={gx} y={gy} w={w} d={d} scale={r.k * r.scale * (1 - 0.12 * lift)} opacity={1 - 0.35 * lift} />}
      <g
        transform={`translate(${bx} ${by + r.dy - 12 * lift}) scale(${r.scale}) translate(${-bx} ${-by})`}
        style={glow > 0 ? { filter: `drop-shadow(0 0 ${18 * glow}px rgba(255,122,89,${0.75 * glow}))` } : undefined}
      >
        <Faces geo={geo} tone={tn} edge={edge} />
        {deco?.(geo, v)}
        {children}
      </g>
    </g>
  );
};

// ---------- tile pulse ----------
// A diamond lit under the active block, with a halo ring that grows and fades on a 30-frame loop.
export const TilePulse: FC<{ gx: number; gy: number; w?: number; d?: number; z?: number; at: number; until?: number; color?: string; pad?: number }> = ({ gx, gy, w = 1, d = 1, z = 0, at, until, color = ACCENT, pad = 0.22 }) => {
  const v = useView();
  const { t } = useTime();
  const on = interpolate(t, [at, at + 0.25], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) * (until === undefined || !Number.isFinite(until) ? 1 : interpolate(t, [until, until + 0.3], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  if (on <= 0) return null;
  const x0 = gx - pad;
  const y0 = gy - pad;
  const x1 = gx + w + pad;
  const y1 = gy + d + pad;
  const dia = [proj(v, x0, y0, z), proj(v, x1, y0, z), proj(v, x1, y1, z), proj(v, x0, y1, z)];
  const [cx, cy] = proj(v, gx + w / 2, gy + d / 2, z);
  const loop = (((t - at) * FPS) % 30) / 30;
  const s = 1 + loop * 0.8;
  return (
    <g opacity={on}>
      <polygon points={pts(dia)} fill={color} fillOpacity={0.22} stroke={color} strokeWidth={3} strokeLinejoin="round" />
      <polygon points={pts(dia)} fill="none" stroke={color} strokeWidth={3} strokeLinejoin="round" opacity={(1 - loop) * 0.9} transform={`translate(${cx} ${cy}) scale(${s}) translate(${-cx} ${-cy})`} />
    </g>
  );
};

// ---------- pipes and packets ----------
export type PacketSpec = { count?: number; speed?: number; start?: number; loop?: boolean; tone?: ToneName; gap?: number };

// A small cube racing along a world path (speed in screen px per frame) with a fading trail.
export const PacketDot: FC<{ path: WP[]; z?: number; start: number; speed?: number; loop?: boolean; gap?: number; phase?: number; tone?: ToneName | Tone; size?: number }> = ({ path, z = 0.1, start, speed = 8, loop, gap = 2, phase = 0, tone = "coral", size = 0.3 }) => {
  const v = useView();
  const { t } = useTime();
  if (loop && t < start) return null;
  const L = pathLen(path);
  let s = ((t - start) * FPS * speed) / v.u;
  if (loop) s = (((s + phase * (L + gap)) % (L + gap)) + (L + gap)) % (L + gap);
  if (s < 0 || s > L + 0.6) return null;
  const tn = toneOf(tone);
  const cubes = [0, 1, 2, 3].map((k) => {
    const sk = s - k * 0.24;
    if (sk < 0 || sk > L) return null;
    const [px, py] = pointAt(path, sk);
    const sz = size * (1 - k * 0.16);
    const geo = boxGeo(v, px - sz / 2, py - sz / 2, z, sz, sz, sz, tn);
    const fadeEnd = interpolate(s, [L, L + 0.6], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    return (
      <g key={k} opacity={(k === 0 ? 1 : 0.5 / k) * fadeEnd}>
        <Faces geo={geo} tone={tn} edge={k === 0} />
      </g>
    );
  });
  return <g>{cubes.reverse()}</g>;
};

// A thick rounded connector lying on the ground; it draws on in 18 f and can carry packets.
export const IsoPipe: FC<{ path: WP[]; z?: number; at?: number; width?: number; tone?: ToneName; packets?: PacketSpec; opacity?: number; active?: number }> = ({ path, z = 0.04, at, width = 18, tone = "mist", packets, opacity = 1, active = 0 }) => {
  const v = useView();
  const fx = useFx();
  const { t } = useTime();
  const p = drawOn(t, at);
  if (p <= 0) return null;
  const tn = toneOf(tone);
  const d = path.map((q, i) => `${i ? "L" : "M"}${proj(v, q[0], q[1], z).map((n) => n.toFixed(1)).join(" ")}`).join(" ");
  const dash = { pathLength: 1, strokeDasharray: `${p} 2` };
  const n = packets?.count ?? 0;
  return (
    <g opacity={opacity} fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} stroke={INK} strokeOpacity={0.12} strokeWidth={width + 6} transform="translate(4 7)" filter={fx.soft} {...dash} />
      <path d={d} stroke={tn.right} strokeWidth={width} transform="translate(0 5)" {...dash} />
      <path d={d} stroke={tn.top} strokeWidth={width} {...dash} />
      <path d={d} stroke={tn.left} strokeWidth={3} strokeDasharray={p >= 1 ? "2 14" : `${p} 2`} pathLength={p >= 1 ? undefined : 1} opacity={0.9} />
      {active > 0 && <path d={d} stroke={ACCENT} strokeWidth={width * 0.45} opacity={active} {...dash} />}
      {p >= 1 && n > 0 && Array.from({ length: n }, (_, i) => (
        <PacketDot key={i} path={path} z={z + 0.04} start={packets?.start ?? 0} speed={packets?.speed ?? 7} loop={packets?.loop ?? true} gap={packets?.gap ?? 1.5} phase={i / n} tone={packets?.tone ?? "coral"} />
      ))}
    </g>
  );
};

// ---------- labels ----------
export type LabelProps = { x: number; y: number; z?: number; text: string; tag?: string; at?: number; out?: number; lift?: number; dx?: number; accent?: boolean; led?: string; size?: number };

// An upright label card hanging on a thin leader that grows out of the object; stays upright whatever the view does.
export const IsoLabel: FC<LabelProps> = ({ x, y, z = 0, text, tag, at, out, lift = 90, dx = 0, accent, led, size = 34 }) => {
  const v = useView();
  const { t } = useTime();
  const f = at === undefined ? 99 : (t - at) * FPS;
  const lead = interpolate(f, [0, 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const card = interpolate(f, [5, 17], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.back(1.6)) });
  const gone = out === undefined ? 0 : interpolate(t, [out, out + 0.27], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.in(Easing.cubic) });
  if (lead <= 0 || gone >= 1) return null;
  const [ax, ay] = proj(v, x, y, z);
  const top = ay - lift * lead;
  const cx = ax + dx * lead;
  return (
    <g opacity={1 - gone}>
      <path d={`M${ax} ${ay} L${ax} ${ay - lift * 0.35 * lead} L${cx} ${top}`} fill="none" stroke={INK} strokeOpacity={0.45} strokeWidth={2.5} strokeLinejoin="round" />
      <circle cx={ax} cy={ay} r={6} fill={CARD} stroke={INK} strokeWidth={2.5} />
      <foreignObject x={cx - 500} y={top - 300} width={1000} height={300} style={{ overflow: "visible" }}>
        <div style={{ width: 1000, height: 300, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div
            style={{
              opacity: card,
              transform: `translateY(${(1 - card) * 14}px) scale(${0.9 + 0.1 * card})`,
              transformOrigin: "50% 100%",
              marginBottom: 6,
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: tag ? "12px 22px 14px 18px" : "12px 22px 12px 18px",
              background: accent ? INK : CARD,
              color: accent ? "#FFFFFF" : INK,
              border: `2px solid ${accent ? INK : RULE}`,
              borderRadius: 14,
              boxShadow: "0 12px 26px rgba(27,35,64,0.16)",
              fontFamily: LABEL,
              fontWeight: 700,
              fontSize: size,
              lineHeight: 1.1,
              whiteSpace: "nowrap",
            }}
          >
            <span style={{ width: 13, height: 13, borderRadius: 3, background: led ?? (accent ? ACCENT : SIGNAL), transform: "rotate(45deg)", flex: "none" }} />
            <div>
              <div>{text}</div>
              {tag && <div style={{ fontFamily: MONO, fontWeight: 500, fontSize: 28, color: accent ? "#AFC0EE" : SUB, marginTop: 4 }}>{tag}</div>}
            </div>
          </div>
        </div>
      </foreignObject>
    </g>
  );
};

// ---------- backdrop ----------
// Blueprint paper: cool off-white, a diamond grid at 8 %, a soft centre light, and idle life (bobbing cubes in the margins, faint packets crawling the grid).
export const Blueprint: FC = () => {
  const { t } = useTime();
  const u = 72;
  const lines: ReactNode[] = [];
  const span = W * 0.6;
  for (let k = -40; k <= 40; k++) {
    const c = H / 2 + k * u;
    lines.push(<line key={`a${k}`} x1={-span} y1={c - (W / 2 + span) * 0.57735} x2={W + span} y2={c + (W / 2 + span) * 0.57735} />);
    lines.push(<line key={`b${k}`} x1={-span} y1={c + (W / 2 + span) * 0.57735} x2={W + span} y2={c - (W / 2 + span) * 0.57735} />);
  }
  const v = view({ u });
  // Idle cubes sit in the corners' safe margin (screen positions) so they never land under content.
  const cubes: [number, number, number, ToneName][] = [
    [150, 120, 0.3, "sky"],
    [1770, 130, 0.0, "coral"],
    [1790, 960, 0.6, "mint"],
    [130, 950, 1.1, "blue"],
  ];
  return (
    <AbsoluteFill style={{ backgroundColor: BG }}>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 60% 55% at 50% 48%, rgba(255,255,255,0.85), rgba(255,255,255,0) 70%)" }} />
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        <g stroke={INK} strokeOpacity={0.08} strokeWidth={1.5}>{lines}</g>
        <ViewCtx.Provider value={v}>
          {[0, 1].map((i) => {
            const loopF = 210;
            const ph = (((t * FPS + i * 105) % loopF) / loopF);
            const y0 = i === 0 ? -5 : 6;
            const x = -14 + ph * 28;
            const [sx, sy] = proj(v, x, y0, 0);
            return <rect key={i} x={sx - 5} y={sy - 5} width={10} height={10} rx={2} fill={SIGNAL} opacity={0.35 * Math.sin(ph * Math.PI)} transform={`rotate(45 ${sx} ${sy})`} />;
          })}
          {cubes.map(([sx, sy, ph, tone], i) => {
            const tn = toneOf(tone);
            const a = (sx - W / 2) / (C30 * u);
            const b = (sy - H / 2) / (S30 * u);
            const geo = boxGeo(v, (a + b) / 2 - 0.18, (b - a) / 2 - 0.18, bob(t, ph * 3, 3) / u, 0.36, 0.36, 0.36, tn);
            return (
              <g key={i} opacity={0.55}>
                <Faces geo={geo} tone={tn} />
              </g>
            );
          })}
        </ViewCtx.Provider>
      </svg>
    </AbsoluteFill>
  );
};

// Seeded on/off for blinking things, re-rolled every `every` frames.
export const blink = (seed: string, f: number, every = 6, p = 0.7) => random(`${seed}-${Math.floor(f / every)}`) < p;
