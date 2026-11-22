// Signature moments: the Screen Studio walkthrough (window + spring cursor + auto-zoom camera), the drag-to-select claim, the prompt-to-chart answer, and the before/after wipe.
import type { FC, ReactNode } from "react";
import { AbsoluteFill, random } from "remotion";
import { H, W } from "../../core/video";
import { clamp01, ramp, useTime } from "../../core/time";
import { ACCENT, APP_H, APP_W, BACK, BAR_H, BAD, GOOD, MONO, SANS, UI, VIOLET, WIN, type Look, type Wallpaper } from "./theme";
import { useWalk, type CursorKey, type Rect, type ZoomSpan } from "./motion";
import { WallpaperBackdrop } from "./backdrop";
import { FloatingWindow, ScreenMedia, appRect, contentRect, type WinBox } from "./window";
import { ClickRipple, Cursor, TargetGlow } from "./cursor";
import { Icon } from "./app";

// The camera: stage → screen as translate(centre) · scale(s) · translate(−focus), so zoom magnifies the whole composition.
export const SmartZoom: FC<{ cam: { cx: number; cy: number; s: number }; children: ReactNode }> = ({ cam, children }) => (
  <AbsoluteFill style={{ transformOrigin: "0 0", transform: `translate(${W / 2}px, ${H / 2}px) scale(${cam.s}) translate(${-cam.cx}px, ${-cam.cy}px)` }}>{children}</AbsoluteFill>
);

export type WalkState = ReturnType<typeof useWalk>;
export type WalkthroughProps = {
  keys: CursorKey[];
  win?: WinBox;
  // Coordinate space of the keys; defaults to the stand-in app's 1360 × 765. For a recording, pass its pixel size.
  space?: { w: number; h: number };
  zoom?: number;
  safeZone?: number;
  auto?: "rests" | "clicks" | "off";
  zooms?: ZoomSpan[];
  look?: Look;
  chrome?: "mac" | "browser" | "none";
  url?: string;
  title?: string;
  src?: string;
  startFrom?: number;
  at?: number;
  wallpaper?: Wallpaper;
  cursorAt?: number;
  // Elements that glow as they are clicked, in key space.
  targets?: { rect: Rect; at: number; hold?: number }[];
  // Content drawn in the window (APP_W × APP_H design space), on top of src if given.
  screen?: (w: WalkState) => ReactNode;
  // Stage-space extras that zoom with the window (spotlights, tethers).
  stage?: (w: WalkState) => ReactNode;
  // Screen-space extras that stay crisp and still (captions, keycaps).
  overlay?: (w: WalkState) => ReactNode;
};

export const Walkthrough: FC<WalkthroughProps> = ({ keys, win = WIN, space, zoom, safeZone, auto, zooms, look, chrome, url, title, src, startFrom, at, wallpaper, cursorAt, targets = [], screen, stage, overlay }) => {
  const sp = space ?? { w: APP_W, h: APP_H };
  const w = useWalk({ keys, area: contentRect(win), space: sp, zoom, safeZone, auto, zooms });
  const toApp = (r: Rect): Rect => ({ x: (r.x * APP_W) / sp.w, y: (r.y * APP_H) / sp.h, w: (r.w * APP_W) / sp.w, h: (r.h * APP_H) / sp.h });
  return (
    <AbsoluteFill>
      <WallpaperBackdrop wallpaper={wallpaper} cam={w.cam} />
      <SmartZoom cam={w.cam}>
        <FloatingWindow win={win} look={look} chrome={chrome} url={url} title={title} src={src} startFrom={startFrom} at={at}>
          {screen?.(w)}
        </FloatingWindow>
        {targets.map((g, i) => (
          <TargetGlow key={i} rect={appRect(toApp(g.rect), win)} at={g.at} hold={g.hold} />
        ))}
        {stage?.(w)}
        <ClickRipple clicks={w.clicks} />
        <Cursor p={w.cursor} clicks={w.clicks.map((c) => c.t)} at={cursorAt ?? keys[0]?.t} size={40} />
      </SmartZoom>
      {overlay?.(w)}
    </AbsoluteFill>
  );
};

// ---------- Drag-to-select claim ----------

export type SelectClaimProps = { words: { w: string; t: number }[]; select: [number, number]; at: number; dur?: number; y?: number; size?: number; toolbar?: boolean };

// The key words of a claim get selected like text in an editor: an I-beam glides in, drags across them, the selection fills, a format bar pops.
export const SelectClaim: FC<SelectClaimProps> = ({ words, select, at, dur = 0.7, y = 540, size = 104, toolbar = true }) => {
  const { t } = useTime();
  const [a, b] = select;
  const n = b - a + 1;
  const drag = clamp01((t - at) / dur);
  const bar = ramp(t, at + dur + 0.15, 0.35, BACK(1.6));
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "absolute", top: y, left: 160, right: 160, transform: "translateY(-50%)", textAlign: "center", fontFamily: SANS, fontWeight: 700, fontSize: size, lineHeight: 1.18, letterSpacing: -size * 0.03, color: "#FFFFFF" }}>
        {words.map((wd, i) => {
          const ap = ramp(t, wd.t - 0.1, 0.3);
          const inSel = i >= a && i <= b;
          const sp = inSel ? clamp01(drag * n - (i - a)) : 0;
          const isStart = i === a;
          const isEnd = inSel && (sp < 1 || i === b) && sp > 0;
          // The I-beam lives inside the word being dragged across, so it tracks real glyph widths without measuring.
          const beamHere = (isStart && drag <= 0) || isEnd;
          const glide = isStart && drag <= 0 ? 1 - ramp(t, at - 0.8, 0.7, BACK(1.1)) : 0;
          return (
            <span key={i} style={{ position: "relative", display: "inline-block", marginRight: size * 0.26, opacity: ap, transform: `translateY(${(1 - ap) * 14}px)` }}>
              {sp > 0 && <span style={{ position: "absolute", left: -6, top: size * 0.06, bottom: size * 0.02, width: `calc(${sp * 100}% + ${sp >= 1 && i < b ? size * 0.26 + 6 : 12 * sp}px)`, background: "rgba(91,140,255,0.55)", borderRadius: 6 }} />}
              <span style={{ position: "relative" }}>{wd.w}</span>
              {beamHere && t > at - 0.8 && (
                <svg width={34} height={size * 1.2} viewBox="0 0 34 120" preserveAspectRatio="none" style={{ position: "absolute", left: `calc(${(isEnd ? sp : 0) * 100}% - 17px)`, top: -size * 0.04, transform: `translate(${glide * 320}px, ${glide * 260}px)`, opacity: 1 - glide * 0.6, overflow: "visible", filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))" }}>
                  <path d="M8 4 H26 M17 4 V116 M8 116 H26" stroke="#FFFFFF" strokeWidth={5} strokeLinecap="round" fill="none" />
                  <path d="M8 4 H26 M17 4 V116 M8 116 H26" stroke="#14161F" strokeWidth={2} strokeLinecap="round" fill="none" />
                </svg>
              )}
              {toolbar && isStart && bar > 0 && (
                <span style={{ position: "absolute", left: 0, bottom: "100%", marginBottom: 20, transform: `translateY(${(1 - bar) * 16}px) scale(${0.85 + 0.15 * bar})`, transformOrigin: "0 100%", opacity: clamp01(bar * 1.5), display: "flex", alignItems: "center", gap: 6, padding: 8, borderRadius: 18, background: "#14161F", boxShadow: "0 20px 40px -12px rgba(0,0,0,0.6)", border: "1px solid rgba(255,255,255,0.1)", letterSpacing: 0 }}>
                  {["B", "I"].map((k) => (
                    <span key={k} style={{ width: 56, height: 56, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, fontWeight: 700, fontStyle: k === "I" ? "italic" : "normal", fontFamily: k === "I" ? "Georgia, serif" : SANS, color: "#E6E9F2" }}>{k}</span>
                  ))}
                  <span style={{ width: 56, height: 56, display: "flex", alignItems: "center", justifyContent: "center", color: "#E6E9F2" }}>
                    <Icon name="link" size={30} />
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 10, height: 56, padding: "0 18px", borderRadius: 12, background: ACCENT, color: "#FFFFFF", fontSize: 30, fontWeight: 600, whiteSpace: "nowrap" }}>
                    <Icon name="spark" size={26} fill color="#FFFFFF" />
                    Highlight
                  </span>
                </span>
              )}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ---------- Prompt → chart ----------

const SIGNUPS = Array.from({ length: 24 }, (_, i) => 14 + i * 3.1 + (random(`su-${i}`) - 0.5) * 22 + (i > 15 ? (i - 15) * 2.2 : 0));

export type PromptToChartProps = { prompt: string; reply: string; at: number; steps?: string[]; win?: WinBox; look?: Look };

// An AI product answering with a chart: the prompt bubble pops, a 12 f shimmer, then axes draw (12 f), dots land in x order (0.5 f each), the trend line draws (20 f) and the agent's checklist ticks.
export const PromptToChart: FC<PromptToChartProps> = ({ prompt, reply, at, steps = ["Read signups.csv", "Grouped by week", "Fitted a trend"], win = WIN, look = "light" }) => {
  const { t } = useTime();
  const u = UI[look];
  const bub = ramp(t, at, 0.3, BACK(1.5));
  const think = at + 0.45;
  const chart = think + 0.4;
  const shimmer = Math.min(ramp(t, think, 0.1), 1 - ramp(t, chart, 0.15));
  const ax = ramp(t, chart, 0.4);
  const line = ramp(t, chart + 0.4 + 24 * (0.5 / 30), 0.67);
  const cw = 720;
  const ch = 330;
  const max = 110;
  const px = (i: number) => 70 + (i / 23) * (cw - 100);
  const py = (v: number) => ch - 40 - (v / max) * (ch - 70);
  // Least-squares trend, so the line is honest to the dots.
  const mx = 11.5;
  const my = SIGNUPS.reduce((s, v) => s + v, 0) / 24;
  const slope = SIGNUPS.reduce((s, v, i) => s + (i - mx) * (v - my), 0) / SIGNUPS.reduce((s, _, i) => s + (i - mx) ** 2, 0);
  const trend = (i: number) => my + slope * (i - mx);
  return (
    <FloatingWindow win={win} look={look} title="Orbit AI">
      <div style={{ position: "absolute", inset: 0, background: u.win, fontFamily: SANS, color: u.text }}>
        <div style={{ position: "absolute", right: 60, top: 40, maxWidth: 760, transform: `scale(${0.8 + 0.2 * bub})`, transformOrigin: "100% 50%", opacity: clamp01(bub * 1.5), padding: "18px 30px", borderRadius: "28px 28px 8px 28px", background: ACCENT, color: "#FFFFFF", fontSize: 34, fontWeight: 500 }}>{prompt}</div>
        <div style={{ position: "absolute", left: 60, top: 150, width: 52, height: 52, borderRadius: 16, background: `linear-gradient(140deg, ${ACCENT}, ${VIOLET})`, display: "flex", alignItems: "center", justifyContent: "center", opacity: ramp(t, think - 0.1, 0.2) }}>
          <Icon name="spark" size={30} fill color="#FFFFFF" />
        </div>
        {shimmer > 0 && (
          <div style={{ position: "absolute", left: 136, top: 162, width: 420, height: 30, borderRadius: 15, opacity: shimmer, background: `linear-gradient(90deg, ${u.field} 0%, ${ACCENT}55 ${((t - think) / 0.4) * 100}%, ${u.field} ${((t - think) / 0.4) * 100 + 30}%)` }} />
        )}
        <div style={{ position: "absolute", left: 136, top: 156, fontSize: 32, fontWeight: 500, opacity: ramp(t, chart, 0.3) }}>{reply}</div>
        <div style={{ position: "absolute", left: 136, top: 226, width: cw, height: ch + 30, borderRadius: 22, border: `1px solid ${u.line}`, background: u.card, boxShadow: "0 10px 30px -14px rgba(20,30,80,0.25)", opacity: ramp(t, chart - 0.05, 0.2) }}>
          <svg width={cw} height={ch + 30} style={{ position: "absolute", left: 0, top: 10 }}>
            <line x1={60} y1={ch - 40} x2={60 + (cw - 80) * ax} y2={ch - 40} stroke={u.faint} strokeWidth={2} />
            <line x1={60} y1={ch - 40} x2={60} y2={ch - 40 - (ch - 70) * ax} stroke={u.faint} strokeWidth={2} />
            {[0, 50, 100].map((v) => (
              <text key={v} x={48} y={py(v) + 9} textAnchor="end" fontSize={26} fill={u.soft} fontFamily={MONO} opacity={ax}>{v}</text>
            ))}
            {["W1", "W12", "W24"].map((l, k) => (
              <text key={l} x={px([0, 11, 23][k]!)} y={ch + 2} textAnchor="middle" fontSize={26} fill={u.soft} fontFamily={MONO} opacity={ax}>{l}</text>
            ))}
            {SIGNUPS.map((v, i) => {
              const d = ramp(t, chart + 0.4 + i * (0.5 / 30), 0.2, BACK(2));
              return <circle key={i} cx={px(i)} cy={py(v)} r={9 * d} fill={v >= trend(i) ? ACCENT : VIOLET} stroke={u.card} strokeWidth={2} />;
            })}
            <line x1={px(0)} y1={py(trend(0))} x2={px(0) + (px(23) - px(0)) * line} y2={py(trend(0) + (trend(23) - trend(0)) * line)} stroke={BAD} strokeWidth={4.5} strokeLinecap="round" />
          </svg>
        </div>
        <div style={{ position: "absolute", left: 900, top: 226, width: 400 }}>
          {steps.map((s, i) => {
            const d = ramp(t, chart + 0.35 + i * 0.4, 0.25, BACK(2));
            return (
              <div key={s} style={{ display: "flex", alignItems: "center", gap: 16, height: 74, borderBottom: `1px solid ${u.line}`, fontSize: 30, fontWeight: 500, color: d > 0.5 ? u.text : u.faint }}>
                <div style={{ width: 38, height: 38, borderRadius: 19, border: `2.5px solid ${d > 0 ? GOOD : u.line}`, background: d > 0 ? GOOD : "transparent", display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${0.7 + 0.3 * d})` }}>
                  {d > 0 && <Icon name="check" size={24} w={3.2} color="#FFFFFF" />}
                </div>
                {s}
              </div>
            );
          })}
        </div>
      </div>
    </FloatingWindow>
  );
};

// ---------- Before / after wipe ----------

export type BeforeAfterProps = { a: ReactNode | string; b: ReactNode | string; at: number; dur?: number; rest?: number; labels?: [string, string]; win?: WinBox; look?: Look; hand?: boolean };

const Layer: FC<{ c: ReactNode | string }> = ({ c }) => (typeof c === "string" ? <ScreenMedia src={c} /> : <>{c}</>);

// A vertical wipe across one window: the divider sweeps from before to after, then settles at `rest` with a hand cursor on the knob.
export const BeforeAfterSlider: FC<BeforeAfterProps> = ({ a, b, at, dur = 1.3, rest = 0.5, labels = ["Before", "After"], win = WIN, look = "light", hand = true }) => {
  const { t } = useTime();
  const go = ramp(t, at, dur, (x) => 0.5 - Math.cos(x * Math.PI) / 2);
  const back = ramp(t, at + dur + 0.1, 0.6);
  const x = 0.94 - 0.86 * go + (rest - 0.08) * back;
  const r = contentRect(win);
  const kx = r.x + r.w * x;
  const ky = r.y + r.h * 0.5;
  // Labels ride in the title bar, so they never cover the UI being compared.
  const pill = (txt: string, side: "l" | "r", on: number) => (
    <div style={{ position: "absolute", top: r.y - BAR_H / 2, left: side === "l" ? r.x + 104 : r.x + r.w - 20, transform: `translate(${side === "l" ? 0 : -100}%, -50%)`, padding: "3px 18px", borderRadius: 999, background: side === "l" ? "#E4E7F0" : "#1C1C22", color: side === "l" ? "#14161F" : "#FFFFFF", fontFamily: SANS, fontSize: 28, fontWeight: 600, opacity: 0.35 + 0.65 * on, display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ width: 10, height: 10, borderRadius: 5, background: on > 0.5 ? ACCENT : "#9AA0B2" }} />
      {txt}
    </div>
  );
  return (
    <>
      <FloatingWindow win={win} look={look}>
        <AbsoluteFill>
          <Layer c={b} />
        </AbsoluteFill>
        <AbsoluteFill style={{ clipPath: `inset(0 ${(1 - x) * 100}% 0 0)` }}>
          <Layer c={a} />
        </AbsoluteFill>
      </FloatingWindow>
      {pill(labels[0], "l", clamp01((x - 0.12) * 5))}
      {pill(labels[1], "r", clamp01((0.88 - x) * 5))}
      <div style={{ position: "absolute", left: kx - 2, top: r.y, width: 4, height: r.h, background: "#FFFFFF", boxShadow: "0 0 18px rgba(0,0,0,0.35)" }} />
      <div style={{ position: "absolute", left: kx - 34, top: ky - 34, width: 68, height: 68, borderRadius: 34, background: "#FFFFFF", boxShadow: `0 8px 24px rgba(0,0,0,0.35), 0 0 0 ${4 + 4 * Math.min(go, 1 - back * 0.5)}px ${ACCENT}55`, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
        <svg width={40} height={24} viewBox="0 0 40 24">
          <path d="M12 4 L4 12 L12 20 M28 4 L36 12 L28 20" fill="none" stroke="#1A1D2E" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      {hand && <Cursor p={{ x: kx + 8 + (1 - ramp(t, at - 0.6, 0.5)) * 260, y: ky + 14 + (1 - ramp(t, at - 0.6, 0.5)) * 180 }} style="hand" size={50} clicks={[at - 0.05]} at={at - 0.6} />}
    </>
  );
};
