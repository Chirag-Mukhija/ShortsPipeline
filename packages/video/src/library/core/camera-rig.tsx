// World-space camera rig: named shot sizes, keyed shots (cut/push/pull/glide/whip/punch), breathing drift, edge clamp, motion blur on fast moves, parallax depth layers, depth of field and a screen-space HUD.
import { Children, createContext, isValidElement, useContext, useId, type CSSProperties, type FC, type ReactNode } from "react";
import { AbsoluteFill, Easing, useVideoConfig } from "remotion";
import { CameraMotionBlur } from "@remotion/motion-blur";
import { clamp01, useTime, type Ease } from "./time";
import { H, W } from "./video";

export type Rect = { x: number; y: number; w: number; h: number };
// A point target frames a box of 2r around it (r defaults to 200 world px).
export type Point = { x: number; y: number; r?: number };
export type Target = Rect | Point | string;
export type World = { w: number; h: number };

// How much of the frame the target fills (direction draft 2.1). A number is a custom fill.
export type ShotSize = "wide" | "medium" | "mcu" | "cu" | "ecu";
export const SHOT_FILL: Record<ShotSize, number> = { wide: 0.25, medium: 0.35, mcu: 0.45, cu: 0.75, ecu: 0.92 };

export type Move = "cut" | "push" | "pull" | "glide" | "whip" | "punch";
const SINE: Ease = Easing.inOut(Easing.sin);
// Durations and eases from the draft's move table: pull starts fast with a long tail, punch overshoots a touch.
export const MOVES: Record<Move, { dur: number; ease: Ease }> = {
  cut: { dur: 0, ease: (x) => x },
  push: { dur: 1, ease: SINE },
  glide: { dur: 0.8, ease: SINE },
  pull: { dur: 1.3, ease: Easing.out(Easing.poly(4)) },
  whip: { dur: 0.3, ease: Easing.inOut(Easing.poly(4)) },
  punch: { dur: 0.3, ease: Easing.out(Easing.back(1.6)) },
};

// One key of the shot list. `at` is seconds (shots in time order). No target = keep the last target (a size or focus change only).
export type Shot = { at: number; target?: Target; size?: ShotSize | number; move?: Move; dur?: number; ease?: Ease; focus?: number };
// x, y = world point at screen centre; s = scale; focus = depth of the sharp plane.
export type CamState = { x: number; y: number; s: number; focus: number };
export type CameraOpts = { world?: World; targets?: Record<string, Rect | Point>; breath?: number; clamp?: boolean };

const isRect = (t: Rect | Point): t is Rect => "w" in t;
const toRect = (t: Rect | Point): Rect => (isRect(t) ? t : { x: t.x - (t.r ?? 200), y: t.y - (t.r ?? 200), w: (t.r ?? 200) * 2, h: (t.r ?? 200) * 2 });

// Pure: the camera that makes `rect` fill `size` of the frame, centred on it.
export const frameOn = (rect: Rect | Point, size: ShotSize | number = "mcu") => {
  const r = toRect(rect);
  const fill = typeof size === "number" ? size : SHOT_FILL[size];
  return { x: r.x + r.w / 2, y: r.y + r.h / 2, s: Math.min((W * fill) / r.w, (H * fill) / r.h) };
};

// The widest legal camera: the whole world, centred.
export const homeCam = (world: World): CamState => ({ x: world.w / 2, y: world.h / 2, s: Math.max(W / world.w, H / world.h), focus: 1 });

// Never show past the world edge: scale at least covers the frame, centre kept half a frame inside.
export const clampCam = (c: CamState, world: World): CamState => {
  const s = Math.max(c.s, W / world.w, H / world.h);
  const hw = W / (2 * s);
  const hh = H / (2 * s);
  return { ...c, s, x: Math.min(world.w - hw, Math.max(hw, c.x)), y: Math.min(world.h - hh, Math.max(hh, c.y)) };
};

// Scale eases in log space and position in 1/scale, so a zoom pivots about one fixed screen point like a real lens.
const blend = (a: CamState, b: CamState, e: number, focus: number): CamState => {
  if (e <= 0) return a;
  if (e >= 1) return { ...b, focus };
  const s = a.s * Math.pow(b.s / a.s, e);
  const ia = 1 / a.s;
  const ib = 1 / b.s;
  const k = Math.abs(ib - ia) > 1e-3 * ia ? (1 / s - ia) / (ib - ia) : e;
  return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, s, focus: a.focus + (focus - a.focus) * e };
};

// Base drift: +-4/3 px hand-held sway and up to +1.2 % scale breathing over 8 s; `amt` scales both.
const breathe = (c: CamState, t: number, amt: number): CamState => ({
  ...c,
  x: c.x + (Math.sin(t * 0.6) * 4 * amt) / c.s,
  y: c.y + (Math.sin(t * 0.83 + 1) * 3 * amt) / c.s,
  s: c.s * (1 + 0.012 * amt * (0.5 - 0.5 * Math.cos((t * Math.PI * 2) / 8))),
});

// Pure: the camera at time t for a shot list (eased from wherever the previous move had got to), with drift and clamp.
export const cameraAt = (t: number, shots: Shot[], { world = { w: W, h: H }, targets = {}, breath = 1, clamp = true }: CameraOpts = {}): CamState => {
  const resolve = (tg: Target) => (typeof tg === "string" ? targets[tg] ?? { x: world.w / 2, y: world.h / 2, w: world.w, h: world.h } : tg);
  const first = shots[0];
  let last: Rect | Point = first?.target ? resolve(first.target) : { x: 0, y: 0, w: world.w, h: world.h };
  let cur: CamState = first ? { ...frameOn(last, first.size ?? "wide"), focus: first.focus ?? 1 } : homeCam(world);
  for (const shot of shots.slice(1)) {
    if (t < shot.at) break;
    const m = MOVES[shot.move ?? "push"];
    const dur = shot.dur ?? m.dur;
    const e = dur <= 0 ? 1 : (shot.ease ?? m.ease)(clamp01((t - shot.at) / dur));
    if (shot.target) last = resolve(shot.target);
    const next = shot.target || shot.size !== undefined ? { ...frameOn(last, shot.size ?? "mcu"), focus: cur.focus } : cur;
    cur = blend(cur, next, e, shot.focus ?? cur.focus);
  }
  const c = breathe(cur, t, breath);
  return clamp ? clampCam(c, world) : c;
};

export type CameraCtx = {
  cam: CamState;
  home: CamState;
  world: World;
  // Screen speed of the camera in px per frame (pan + zoom at the frame edge).
  speed: number;
  dof: number;
  // Directional blur (screen px, x and y) each motion-blur sample adds so the samples smear together instead of strobing.
  smear: { x: number; y: number };
  // Effective camera of a parallax layer: same as `cam` at depth 1, still at depth 0.
  layerCam: (depth: number) => { x: number; y: number; s: number };
  // World point (on a layer of `depth`) to screen px, and the scale it is drawn at.
  project: (x: number, y: number, depth?: number) => { x: number; y: number; s: number };
  // Screen px offset for an unscaled backdrop that sits at `depth` (surfaces, particles).
  shift: (depth: number) => { x: number; y: number };
};

const makeCtx = (cam: CamState, world: World, speed: number, dof: number, smear = { x: 0, y: 0 }): CameraCtx => {
  const home = homeCam(world);
  // Layers agree at the home camera; each zooms by (s/home)^depth and pans by depth, so far layers never show an edge.
  const layerCam = (d: number) => ({ x: home.x + (cam.x - home.x) * d, y: home.y + (cam.y - home.y) * d, s: home.s * Math.pow(cam.s / home.s, d) });
  return {
    cam,
    home,
    world,
    speed,
    dof,
    smear,
    layerCam,
    project: (x, y, d = 1) => {
      const l = layerCam(d);
      return { x: W / 2 + (x - l.x) * l.s, y: H / 2 + (y - l.y) * l.s, s: l.s };
    },
    shift: (d) => ({ x: -(cam.x - home.x) * home.s * d, y: -(cam.y - home.y) * home.s * d }),
  };
};

const Ctx = createContext<CameraCtx>(makeCtx(homeCam({ w: W, h: H }), { w: W, h: H }, 0, 0));
export const useCamera = () => useContext(Ctx);

export type CameraProps = CameraOpts & {
  shots: Shot[];
  // Motion blur (via @remotion/motion-blur) whenever the camera moves faster than `threshold` px/frame; costs `samples` renders on those frames only.
  motionBlur?: boolean | { samples?: number; shutter?: number; threshold?: number };
  // Depth-of-field blur in px per unit of depth away from the focus plane; 0 = everything sharp.
  dof?: number;
  children: ReactNode;
};

// Re-reads the frame itself so that inside CameraMotionBlur's Freeze each sample sees its own camera.
const Scene: FC<Omit<CameraProps, "motionBlur"> & { smearK?: number }> = ({ shots, world = { w: W, h: H }, targets, breath, clamp, dof = 0, smearK = 0, children }) => {
  const { t } = useTime();
  const { fps } = useVideoConfig();
  const opts = { world, targets, breath, clamp };
  const cam = cameraAt(t, shots, opts);
  const prev = cameraAt(t - 1 / fps, shots, opts);
  const speed = Math.hypot((cam.x - prev.x) * cam.s, (cam.y - prev.y) * cam.s) + Math.abs(Math.log(cam.s / prev.s)) * (W / 2);
  const smear = { x: Math.abs(cam.x - prev.x) * cam.s * smearK, y: Math.abs(cam.y - prev.y) * cam.s * smearK };
  return (
    <Ctx.Provider value={makeCtx(cam, world, speed, dof, smear)}>
      <AbsoluteFill style={{ overflow: "hidden" }}>{children}</AbsoluteFill>
    </Ctx.Provider>
  );
};

// Screen-space layer: a direct child of <Camera> that does not zoom, pan or blur; read useCamera().project to pin a label to a world point.
export const Hud: FC<{ children: ReactNode; style?: CSSProperties }> = ({ children, style }) => <AbsoluteFill style={{ pointerEvents: "none", ...style }}>{children}</AbsoluteFill>;

// <Camera shots world>: <Layer depth> children move with the camera; other children (e.g. <Surface>) stay in screen space; <Hud> children sit on top, outside the motion blur.
export const Camera: FC<CameraProps> = ({ motionBlur = false, children, ...rest }) => {
  const { t } = useTime();
  const { fps } = useVideoConfig();
  const parts = Children.toArray(children);
  const hud = parts.filter((c) => isValidElement(c) && c.type === Hud);
  const scene = parts.filter((c) => !(isValidElement(c) && c.type === Hud));
  const mb = motionBlur === true ? {} : motionBlur || null;
  let blurOn = false;
  if (mb) {
    const opts = { world: rest.world, targets: rest.targets, breath: rest.breath, clamp: rest.clamp };
    const a = cameraAt(t, rest.shots, opts);
    const b = cameraAt(t - 1 / fps, rest.shots, opts);
    blurOn = Math.hypot((a.x - b.x) * a.s, (a.y - b.y) * a.s) + Math.abs(Math.log(a.s / b.s)) * (W / 2) > (mb.threshold ?? 18);
  }
  const samples = mb?.samples ?? 8;
  const shutter = mb?.shutter ?? 200;
  // Gap between two samples is speed * shutter fraction / samples; a blur of ~0.6 of that closes it.
  const world = <Scene {...rest} smearK={blurOn ? ((shutter / 360) * 0.6) / samples : 0}>{scene}</Scene>;
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      {blurOn && mb ? (
        <CameraMotionBlur samples={samples} shutterAngle={shutter}>
          {world}
        </CameraMotionBlur>
      ) : (
        world
      )}
      {hud.length > 0 && <Scene {...rest}>{hud}</Scene>}
    </AbsoluteFill>
  );
};

// A world-space plane the size of the world. depth 1 = subject plane; <1 farther (moves less), >1 nearer (moves more; keep it sparse, its edges can show).
export const Layer: FC<{ depth?: number; sharp?: boolean; style?: CSSProperties; children: ReactNode }> = ({ depth = 1, sharp = false, style, children }) => {
  const c = useCamera();
  const id = `cam${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const l = c.layerCam(depth);
  const blur = sharp ? 0 : c.dof * Math.abs(depth - c.cam.focus);
  // Smear in the layer's own units; a layer pans in proportion to its depth.
  const sx = (c.smear.x * depth) / l.s;
  const sy = (c.smear.y * depth) / l.s;
  const smeared = sx + sy > 0.5;
  const filters = [smeared ? `url(#${id})` : "", blur > 0.15 ? `blur(${(blur / l.s).toFixed(2)}px)` : ""].filter(Boolean).join(" ");
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: c.world.w,
        height: c.world.h,
        transformOrigin: "0 0",
        transform: `translate(${W / 2}px, ${H / 2}px) scale(${l.s}) translate(${-l.x}px, ${-l.y}px)`,
        ...style,
        // A layer's own style filter (e.g. a fixed foreground blur) adds to DOF and smear instead of replacing them.
        filter: [filters, style?.filter].filter(Boolean).join(" ") || undefined,
      }}
    >
      {smeared && (
        <svg width={0} height={0} style={{ position: "absolute" }}>
          <filter id={id} x="-5%" y="-5%" width="110%" height="110%">
            <feGaussianBlur stdDeviation={`${sx.toFixed(1)} ${sy.toFixed(1)}`} />
          </filter>
        </svg>
      )}
      {children}
    </div>
  );
};
