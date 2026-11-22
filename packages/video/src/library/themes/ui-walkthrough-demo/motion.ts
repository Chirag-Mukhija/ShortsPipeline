// Screen Studio motion, precomputed per frame: a curved raw cursor path from keys, spring smoothing, rest detection, and an auto-zoom camera with a 70 % safe zone and look-ahead.
import { useMemo } from "react";
import { Easing, useCurrentFrame, useVideoConfig } from "remotion";
import { BAR_H, CLICK_SPRING, CURSOR_SPRING, PAN, ZOOM_IN, ZOOM_OUT } from "./theme";

export type Pt = { x: number; y: number };
export type Rect = { x: number; y: number; w: number; h: number };
// A cursor key: be at (x, y) at t seconds; with click it arrives a beat early and clicks exactly at t.
export type CursorKey = { t: number; x: number; y: number; click?: boolean; dur?: number; bow?: number };
export type ZoomSpan = { from: number; to: number; s?: number };
export type WalkOpts = {
  keys: CursorKey[];
  // Where the keys' coordinate space sits on the stage (the window's content rect) and how big that space is.
  area: Rect;
  space?: { w: number; h: number };
  zoom?: number;
  safeZone?: number;
  // "rests" zooms when the cursor holds still (< 2 px for 0.5 s) and on clicks; "clicks" only on clicks; "off" never.
  auto?: "rests" | "clicks" | "off";
  zooms?: ZoomSpan[];
  // How far outside the content rect the zoomed view may show, in stage px.
  pad?: number;
};
export type WalkFrame = { cursor: Pt; cam: { cx: number; cy: number; s: number }; zoomed: boolean };

const STAGE = { w: 1920, h: 1080 };
const MOVE = Easing.bezier(0.45, 0, 0.2, 1);
const SUB = 4;

const travel = (a: Pt, b: Pt) => Math.hypot(b.x - a.x, b.y - a.y);

// Raw target path: each hop is a quadratic curve bowed sideways, so the pointer glides instead of sliding on rails.
export const rawCursor = (keys: CursorKey[], t: number): Pt => {
  const first = keys[0];
  if (!first) return { x: 0, y: 0 };
  let pos: Pt = { x: first.x, y: first.y };
  for (let i = 1; i < keys.length; i++) {
    const a = keys[i - 1]!;
    const b = keys[i]!;
    const arrive = b.t - (b.click ? 0.12 : 0);
    const d = b.dur ?? Math.min(0.9, Math.max(0.35, 0.3 + travel(a, b) / 1800));
    const start = Math.max(a.t, arrive - d);
    if (t <= start) return pos;
    const p = arrive <= start ? 1 : MOVE(Math.min(1, (t - start) / (arrive - start)));
    const bow = (b.bow ?? 0.14) * (i % 2 ? 1 : -1);
    const mx = (a.x + b.x) / 2 - (b.y - a.y) * bow;
    const my = (a.y + b.y) / 2 + (b.x - a.x) * bow;
    const q = 1 - p;
    pos = { x: q * q * a.x + 2 * q * p * mx + p * p * b.x, y: q * q * a.y + 2 * q * p * my + p * p * b.y };
    if (t < arrive) return pos;
    pos = { x: b.x, y: b.y };
  }
  return pos;
};

const toStage = (o: WalkOpts) => {
  const sp = o.space ?? { w: o.area.w, h: o.area.h };
  return (p: Pt): Pt => ({ x: o.area.x + (p.x * o.area.w) / sp.w, y: o.area.y + (p.y * o.area.h) / sp.h });
};

// Focus spans for the camera: rests and clicks widened by a lead and a linger, merged when they nearly touch.
const focusSpans = (o: WalkOpts, cur: Pt[], fps: number, frames: number): ZoomSpan[] => {
  if (o.zooms) return o.zooms;
  if (o.auto === "off") return [];
  const raw: ZoomSpan[] = [];
  const win = Math.round(fps * 0.5);
  if ((o.auto ?? "rests") === "rests") {
    let runStart = -1;
    for (let f = 0; f <= cur.length; f++) {
      let still = f < cur.length - win;
      for (let k = 1; still && k <= win; k++) still = travel(cur[f]!, cur[f + k]!) < 2;
      if (still && runStart < 0) runStart = f;
      if (!still && runStart >= 0) {
        // A rest that begins on frame 0 is the cursor waiting before the demo starts, not a point of interest.
        // So is a rest that runs to the end of the clip: the pointer has been parked.
        if (runStart > 0 && f < frames) raw.push({ from: runStart / fps - 0.3, to: (f + win) / fps + 0.6 });
        runStart = -1;
      }
    }
  }
  for (const k of o.keys) if (k.click) raw.push({ from: k.t - 0.5, to: k.t + 0.8 });
  raw.sort((a, b) => a.from - b.from);
  const out: ZoomSpan[] = [];
  for (const s of raw) {
    const last = out[out.length - 1];
    if (last && s.from - last.to < 1.2) last.to = Math.max(last.to, s.to);
    else out.push({ ...s });
  }
  return out;
};

// One pass over every frame: spring the cursor onto the raw path, then spring the camera onto the focus spans.
export const simulateWalk = (o: WalkOpts, frames: number, fps: number): WalkFrame[] => {
  const st = toStage(o);
  const clicks = o.keys.filter((k) => k.click).map((k) => k.t);
  const dt = 1 / (fps * SUB);
  const cur: Pt[] = [];
  let p = st(rawCursor(o.keys, 0));
  let v = { x: 0, y: 0 };
  for (let f = 0; f < frames + fps; f++) {
    cur.push({ ...p });
    for (let s = 0; s < SUB; s++) {
      const tt = (f * SUB + s) * dt;
      const target = st(rawCursor(o.keys, tt));
      const sp = clicks.some((c) => Math.abs(tt - c) < 0.16) ? CLICK_SPRING : CURSOR_SPRING;
      v = { x: v.x + (sp.k * (target.x - p.x) - sp.c * v.x) * dt, y: v.y + (sp.k * (target.y - p.y) - sp.c * v.y) * dt };
      p = { x: p.x + v.x * dt, y: p.y + v.y * dt };
    }
  }
  const spans = focusSpans(o, cur, fps, frames);
  const zoom = o.zoom ?? 1.7;
  const safe = o.safeZone ?? 0.7;
  const pad = o.pad ?? 28;
  const N = { x: STAGE.w / 2, y: STAGE.h / 2 };
  const look = Math.round(fps * 0.5);
  const out: WalkFrame[] = [];
  let s = 1;
  let vs = 0;
  let c = { ...N };
  let vc = { x: 0, y: 0 };
  let D = { ...N };
  let wasIn = false;
  for (let f = 0; f < frames; f++) {
    const t = f / fps;
    const span = spans.find((z) => t >= z.from && t < z.to);
    const Z = span ? span.s ?? zoom : 1;
    if (span) {
      // Pan target: the cursor averaged over the next 0.5 s, so the camera leads instead of chasing.
      let ax = 0;
      let ay = 0;
      for (let k = 0; k < look; k++) {
        ax += cur[f + k]!.x / look;
        ay += cur[f + k]!.y / look;
      }
      const hw = (STAGE.w / 2 / Z) * safe;
      const hh = (STAGE.h / 2 / Z) * safe;
      if (!wasIn || Math.abs(ax - D.x) > hw || Math.abs(ay - D.y) > hh) D = { x: ax, y: ay };
      const vw = STAGE.w / 2 / Z;
      const vh = STAGE.h / 2 / Z;
      const clampTo = (val: number, lo: number, hi: number) => (lo > hi ? (lo + hi) / 2 : Math.min(hi, Math.max(lo, val)));
      D = { x: clampTo(D.x, o.area.x - pad + vw, o.area.x + o.area.w + pad - vw), y: clampTo(D.y, o.area.y - pad - BAR_H + vh, o.area.y + o.area.h + pad - vh) };
    } else D = { ...N };
    wasIn = !!span;
    out.push({ cursor: cur[f]!, cam: { cx: c.x, cy: c.y, s }, zoomed: !!span });
    for (let k = 0; k < SUB; k++) {
      const zs = Z > s ? ZOOM_IN : ZOOM_OUT;
      vs += (zs.k * (Z - s) - zs.c * vs) * dt;
      s += vs * dt;
      const ps = span ? PAN : ZOOM_OUT;
      vc = { x: vc.x + (ps.k * (D.x - c.x) - ps.c * vc.x) * dt, y: vc.y + (ps.k * (D.y - c.y) - ps.c * vc.y) * dt };
      c = { x: c.x + vc.x * dt, y: c.y + vc.y * dt };
    }
  }
  return out;
};

// The hook a scene uses: the whole path is computed once per mount, then each frame is a lookup.
export const useWalk = (o: WalkOpts) => {
  const f = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const key = JSON.stringify(o);
  const path = useMemo(() => simulateWalk(o, durationInFrames, fps), [key, durationInFrames, fps]);
  const now = path[Math.min(path.length - 1, Math.max(0, f))]!;
  return { ...now, path, t: f / fps, clicks: o.keys.filter((k) => k.click).map((k) => ({ t: k.t, ...toStage(o)(k) })) };
};

// Stage → screen under a camera: the transform SmartZoom applies, for overlays that must stay crisp in screen space.
export const camPoint = (cam: { cx: number; cy: number; s: number }, p: Pt): Pt => ({ x: (p.x - cam.cx) * cam.s + STAGE.w / 2, y: (p.y - cam.cy) * cam.s + STAGE.h / 2 });
