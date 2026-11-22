// Device frames: the floating macOS/browser window and the phone, each showing the creator's recording (src) or a drawn stand-in UI, with the board's spring entrance and soft exit.
import type { CSSProperties, FC, ReactNode } from "react";
import { AbsoluteFill, Img, OffthreadVideo, spring, useVideoConfig } from "remotion";
import { ramp, useTime } from "../../core/time";
import { APP_H, APP_W, BAR_H, MONO, SANS, SHADOW, UI, WIN, type Look } from "./theme";
import type { Rect } from "./motion";

export type WinBox = { x: number; y: number; w: number; h: number };

// The window's content rect on the stage (x, y = centre of the whole frame, bar included).
export const contentRect = (win: WinBox = WIN): Rect => ({ x: win.x - win.w / 2, y: win.y - (win.h + BAR_H) / 2 + BAR_H, w: win.w, h: win.h });
// A point in the stand-in app's design space (APP_W × APP_H) on the stage.
export const appPt = (x: number, y: number, win: WinBox = WIN) => {
  const r = contentRect(win);
  return { x: r.x + (x * r.w) / APP_W, y: r.y + (y * r.h) / APP_H };
};
export const appRect = (q: Rect, win: WinBox = WIN): Rect => {
  const a = appPt(q.x, q.y, win);
  return { x: a.x, y: a.y, w: (q.w * win.w) / APP_W, h: (q.h * win.h) / APP_H };
};

const VIDEO = /\.(mp4|webm|mov|m4v|mkv)(\?|$)/i;

// The creator's own footage: OffthreadVideo for recordings, Img for screenshots; pass staticFile(...) or a local URL.
export const ScreenMedia: FC<{ src: string; fit?: "cover" | "contain"; startFrom?: number; volume?: number }> = ({ src, fit = "cover", startFrom, volume = 0 }) => {
  const style: CSSProperties = { width: "100%", height: "100%", objectFit: fit, display: "block" };
  return VIDEO.test(src) ? <OffthreadVideo src={src} style={style} startFrom={startFrom} volume={volume} /> : <Img src={src} style={style} />;
};

// Entrance: scale 0.92 → 1 and rise 24 px on a spring (damping 18, stiffness 150); exit: drift back to 0.96 and fade in 12 f.
export const useWindowIn = (at?: number, out?: number) => {
  const { t, f } = useTime();
  const { fps } = useVideoConfig();
  const e = at === undefined ? 1 : spring({ frame: f - Math.round(at * fps), fps, config: { damping: 18, stiffness: 150, mass: 1 } });
  const x = out === undefined ? 0 : ramp(t, out, 0.4);
  return {
    opacity: Math.min(at === undefined ? 1 : ramp(t, at, 0.22), 1 - x),
    scale: (0.92 + 0.08 * e) * (1 - 0.04 * x),
    dy: 24 * (1 - e),
  };
};

const Lights: FC = () => (
  <div style={{ display: "flex", gap: 10, marginLeft: 22 }}>
    {["#FF5F57", "#FEBC2E", "#28C840"].map((c) => (
      <div key={c} style={{ width: 15, height: 15, borderRadius: 8, background: c, boxShadow: "inset 0 0 0 0.75px rgba(0,0,0,0.18)" }} />
    ))}
  </div>
);

export type WindowProps = {
  win?: WinBox;
  look?: Look;
  chrome?: "mac" | "browser" | "none";
  title?: string;
  url?: string;
  // The creator's recording or screenshot; children still draw on top of it (in APP_W × APP_H design space).
  src?: string;
  startFrom?: number;
  fit?: "cover" | "contain";
  at?: number;
  out?: number;
  radius?: number;
  children?: ReactNode;
  style?: CSSProperties;
};

export const FloatingWindow: FC<WindowProps> = ({ win = WIN, look = "light", chrome = "mac", title, url, src, startFrom, fit, at, out, radius = 22, children, style }) => {
  const u = UI[look];
  const m = useWindowIn(at, out);
  const left = win.x - win.w / 2;
  const top = win.y - (win.h + BAR_H) / 2;
  const bar = chrome === "none" ? 0 : BAR_H;
  return (
    <div
      style={{
        position: "absolute",
        left,
        top: top + (BAR_H - bar),
        width: win.w,
        height: win.h + bar,
        borderRadius: radius,
        overflow: "hidden",
        background: u.win,
        boxShadow: `${SHADOW}, 0 0 0 1px ${look === "light" ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.10)"}`,
        opacity: m.opacity,
        transform: `translateY(${m.dy}px) scale(${m.scale})`,
        fontFamily: SANS,
        ...style,
      }}
    >
      {bar > 0 && (
        <div style={{ height: bar, background: u.bar, borderBottom: `1px solid ${u.line}`, display: "flex", alignItems: "center", position: "relative" }}>
          <Lights />
          {chrome === "browser" ? (
            <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", top: 8, height: bar - 16, minWidth: win.w * 0.42, borderRadius: 10, background: look === "light" ? "#FFFFFF" : "#17171C", border: `1px solid ${u.line}`, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, color: u.soft, fontSize: 28, fontFamily: MONO, fontWeight: 500 }}>
              <svg width={16} height={20} viewBox="0 0 16 20">
                <rect x={1} y={8} width={14} height={11} rx={3} fill={u.faint} />
                <path d="M4 8 V5.5 a4 4 0 0 1 8 0 V8" fill="none" stroke={u.faint} strokeWidth={2.2} />
              </svg>
              {url ?? "orbit.app"}
            </div>
          ) : (
            title && <div style={{ position: "absolute", left: 0, right: 0, textAlign: "center", color: u.soft, fontSize: 28, fontWeight: 600, letterSpacing: 0.2 }}>{title}</div>
          )}
        </div>
      )}
      <div style={{ position: "relative", width: win.w, height: win.h, overflow: "hidden" }}>
        {src && (
          <AbsoluteFill>
            <ScreenMedia src={src} startFrom={startFrom} fit={fit} />
          </AbsoluteFill>
        )}
        <div style={{ position: "absolute", left: 0, top: 0, width: APP_W, height: APP_H, transform: `scale(${win.w / APP_W}, ${win.h / APP_H})`, transformOrigin: "0 0" }}>{children}</div>
      </div>
      {/* The glass: a faint diagonal sheen and a lit top edge, the board's "slight reflection". */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", borderRadius: radius, background: "linear-gradient(118deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.0) 28%)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.55)" }} />
    </div>
  );
};

export const PHONE_W = 390;
export const PHONE_H = 844;

// A phone in the same language: graphite bezel, dynamic island, side buttons; content in 390 × 844 design space or the creator's src.
export const PhoneFrame: FC<{ x: number; y: number; h?: number; src?: string; at?: number; tilt?: number; children?: ReactNode }> = ({ x, y, h = 840, src, at, tilt = 0, children }) => {
  const m = useWindowIn(at);
  const bezel = 16;
  const ih = h - bezel * 2;
  const iw = (ih * PHONE_W) / PHONE_H;
  const w = iw + bezel * 2;
  return (
    <div style={{ position: "absolute", left: x - w / 2, top: y - h / 2, width: w, height: h, opacity: m.opacity, transform: `translateY(${m.dy}px) scale(${m.scale}) rotate(${tilt}deg)` }}>
      {[{ t: 0.2, hh: 0.07, side: -1 }, { t: 0.3, hh: 0.1, side: -1 }, { t: 0.26, hh: 0.14, side: 1 }].map((b, i) => (
        <div key={i} style={{ position: "absolute", top: h * b.t, height: h * b.hh, width: 6, borderRadius: 3, background: "#2A2A33", [b.side < 0 ? "left" : "right"]: -4 }} />
      ))}
      <div style={{ position: "absolute", inset: 0, borderRadius: w * 0.17, background: "linear-gradient(145deg, #3A3A44, #121216 40%, #1E1E24)", boxShadow: SHADOW }} />
      <div style={{ position: "absolute", left: bezel, top: bezel, width: iw, height: ih, borderRadius: w * 0.17 - bezel, overflow: "hidden", background: "#FFFFFF" }}>
        {src ? <ScreenMedia src={src} /> : <div style={{ width: PHONE_W, height: PHONE_H, transform: `scale(${iw / PHONE_W})`, transformOrigin: "0 0" }}>{children}</div>}
        <div style={{ position: "absolute", top: ih * 0.014, left: "50%", width: iw * 0.31, height: ih * 0.042, transform: "translateX(-50%)", borderRadius: 999, background: "#0B0B0E" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(125deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0) 30%)" }} />
      </div>
    </div>
  );
};
