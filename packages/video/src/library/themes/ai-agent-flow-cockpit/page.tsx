// Pieces that live on the paper page around the cockpit: the hero headline cycler, page headlines, the wired key word, the source lower third, the cockpit camera and the wire-pan transition.
import type { CSSProperties, FC, ReactNode } from "react";
import { AbsoluteFill, Easing } from "remotion";
import { INOUT, ramp, steps, useTime } from "../../core/time";
import { H, W } from "../../core/video";
import { Icon, type IconName } from "./icons";
import { C, EXPO, HEAD, IN, MONO, UI, alpha, fr, mix } from "./theme";
import { CockpitPanel, enter } from "./ui";
import { Wire, WireLayer, hvh, route, type Pulse } from "./wires";

// Small eyebrow over a page headline, with the board's two-dot mark.
export const Eyebrow: FC<{ text: string; at?: number; dark?: boolean; style?: CSSProperties }> = ({ text, at = 0, dark, style }) => {
  const { t } = useTime();
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, fontFamily: UI, fontWeight: 500, fontSize: 30, color: dark ? C.muted : C.inkMuted, ...enter(t, at, 0, 10, 0.4), ...style }}>
      <svg width={14} height={22} viewBox="0 0 14 22">
        <circle cx={4} cy={5} r={3} fill={C.green} />
        <circle cx={10} cy={15} r={3} fill={dark ? C.muted : C.inkMuted} />
      </svg>
      {text}
    </div>
  );
};

// Masked line rise: each line slides up from behind its own floor, 18 f expo, 3 f apart.
export const RiseLines: FC<{ lines: string[]; at: number; size?: number; color?: string; out?: number; style?: CSSProperties }> = ({ lines, at, size = 104, color = C.ink, out, style }) => {
  const { t } = useTime();
  const o = out == null ? 0 : ramp(t, out, 0.35, IN);
  return (
    <div style={{ fontFamily: HEAD, fontWeight: 500, fontSize: size, lineHeight: 1.06, letterSpacing: -size * 0.025, color, opacity: 1 - o, transform: `translateY(${-30 * o}px)`, filter: o > 0 ? `blur(${o * 8}px)` : undefined, ...style }}>
      {lines.map((l, i) => {
        const e = ramp(t, at + i * fr(3), fr(18), EXPO);
        return (
          <div key={i} style={{ overflow: "hidden", paddingBottom: "0.08em", marginBottom: "-0.08em" }}>
            <div style={{ transform: `translateY(${(1 - e) * 110}%)` }}>{l}</div>
          </div>
        );
      })}
    </div>
  );
};

// The hero: one big headline crossfading between phrases every ~75 f over a full-bleed cockpit, with a tab bar whose active tab fills white and runs a progress underline.
export const HeadlineCycler: FC<{ phrases: string[][]; tabs: { label: string; icon: IconName }[]; subs?: string[]; at?: number; every?: number }> = ({ phrases, tabs, subs = [], at = 0, every = fr(75) }) => {
  const { t } = useTime();
  const n = phrases.length;
  const k = Math.max(0, Math.floor((t - at) / every));
  const idx = k % n;
  const start = at + k * every;
  const prog = ramp(t, start, every, Easing.linear);
  const box = { x: 40, y: 40, w: W - 80, h: H - 80 };
  const tabW = (box.w - 112 - (tabs.length - 1) * 16) / tabs.length;
  return (
    <CockpitPanel box={box} at={at} glow={[mix(C.glowA, "#2A5A50", 0.4), C.glowB]}>
      <HeroWiring at={at} every={every} />
      <div style={{ position: "absolute", left: 56, top: 120, width: 1180 }}>
        <RiseLines key={k} lines={phrases[idx]!} at={start + (k === 0 ? 0.2 : 0)} size={124} color="#F4F5F6" out={start + every - 0.35} />
        {subs[idx] && (
          <div style={{ marginTop: 40, fontFamily: UI, fontWeight: 400, fontSize: 38, color: C.muted, ...enter(t, start + 0.35, 0, 12, 0.4), opacity: (enter(t, start + 0.35).opacity as number) * (1 - ramp(t, start + every - 0.35, 0.3)) }}>{subs[idx]}</div>
        )}
      </div>
      <div style={{ position: "absolute", left: 56, right: 56, bottom: 56, display: "flex", gap: 16 }}>
        {tabs.map((tb, i) => {
          const on = i === idx % tabs.length ? ramp(t, start, 0.3) : 0;
          return (
            <div key={i} style={{ position: "relative", width: tabW, height: 112, borderRadius: 18, overflow: "hidden", background: on > 0 ? mix("#2A3034", C.page, on) : "rgba(255,255,255,0.07)", border: `1.5px solid rgba(255,255,255,${0.12 * (1 - on)})`, boxSizing: "border-box", display: "flex", alignItems: "center", gap: 18, padding: "0 26px", ...enter(t, at + 0.3 + i * fr(4), 0, 20) }}>
              <div style={{ width: 52, height: 52, borderRadius: 14, background: alpha(i === 0 ? C.green : i === 1 ? C.amber : C.muted, 0.2), color: i === 0 ? C.green : i === 1 ? C.amber : C.muted, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon name={tb.icon} size={30} />
              </div>
              <span style={{ fontFamily: UI, fontWeight: 500, fontSize: 30, color: mix(C.text, C.ink, on), whiteSpace: "nowrap" }}>{tb.label}</span>
              {on > 0 && <div style={{ position: "absolute", left: 0, bottom: 0, height: 6, width: `${prog * 100}%`, background: C.green }} />}
            </div>
          );
        })}
      </div>
    </CockpitPanel>
  );
};

// Ghosted wiring behind the hero headline: three ports feed one node and fire whenever the phrase changes.
const HeroWiring: FC<{ at: number; every: number }> = ({ at, every }) => {
  const node: [number, number] = [1560, 420];
  const ins: [number, number][] = [[1210, 250], [1210, 420], [1210, 590]];
  const fires = [0, 1, 2, 3].map((k) => at + 0.4 + k * every);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: 0.55 }}>
      <WireLayer>
        {ins.map((p, i) => (
          <Wire key={i} r={hvh(p, [node[0] - 70, node[1]], 1390)} drawAt={at + 0.3 + i * 0.1} flow={0.5} pulses={fires.map((f): Pulse => ({ at: f + i * 0.12 }))} />
        ))}
      </WireLayer>
      <div style={{ position: "absolute", left: node[0] - 70, top: node[1] - 70, width: 140, height: 140, borderRadius: 36, border: `2px solid ${alpha(C.green, 0.6)}`, background: alpha(C.card, 0.8), display: "flex", alignItems: "center", justifyContent: "center", color: C.green }}>
        <Icon name="agent" size={72} stroke={1.5} />
      </div>
      {ins.map((p, i) => (
        <div key={i} style={{ position: "absolute", left: p[0] - 64, top: p[1] - 32, width: 64, height: 64, borderRadius: 32, background: alpha(C.card, 0.85), border: `2px solid ${C.chipLine}`, display: "flex", alignItems: "center", justifyContent: "center", color: C.muted }}>
          <Icon name={(["doc", "mail", "sheet"] as IconName[])[i]!} size={30} />
        </div>
      ))}
    </div>
  );
};

export type Word = { w: string; t: number; key?: boolean };

// A claim on the page, word by word on the narration; the key word snaps into a dark node chip with ports, and a pulse runs through it.
export const WiredLine: FC<{ words: Word[]; y: number; size?: number; color?: string; lead?: number }> = ({ words, y, size = 120, color = C.ink, lead = fr(3) }) => {
  const { t } = useTime();
  return (
    <div style={{ position: "absolute", left: 96, right: 96, top: y, display: "flex", flexWrap: "wrap", justifyContent: "center", alignItems: "center", columnGap: size * 0.26, rowGap: size * 0.2, fontFamily: HEAD, fontWeight: 500, fontSize: size, letterSpacing: -size * 0.025, lineHeight: 1.1, color }}>
      {words.map((wd, i) => {
        const e = ramp(t, wd.t - lead, fr(12), EXPO);
        if (!wd.key)
          return (
            <span key={i} style={{ display: "inline-block", opacity: e, transform: `translateY(${(1 - e) * 24}px)` }}>
              {wd.w}
            </span>
          );
        const k = ramp(t, wd.t - lead, fr(10), EXPO);
        const stub = ramp(t, wd.t + 0.15, 0.35, EXPO);
        const run = ramp(t, wd.t + 0.35, 0.9, INOUT);
        const L = size * 0.8;
        return (
          <span key={i} style={{ position: "relative", display: "inline-block", margin: `0 ${L + 10}px`, opacity: e, transform: `scale(${0.92 + 0.08 * k})` }}>
            <svg style={{ position: "absolute", right: "100%", top: 0, width: L, height: "100%", overflow: "visible" }}>
              <line x1={L * (1 - stub)} y1="50%" x2={L} y2="50%" stroke={C.wire} strokeWidth={4} strokeLinecap="round" />
              {run > 0 && run < 0.4 && <circle cx={(run / 0.4) * L} cy="50%" r={9} fill={C.green} style={{ filter: `drop-shadow(0 0 8px ${C.green})` }} />}
            </svg>
            <svg style={{ position: "absolute", left: "100%", top: 0, width: L, height: "100%", overflow: "visible" }}>
              <line x1={0} y1="50%" x2={L * stub} y2="50%" stroke={C.wire} strokeWidth={4} strokeLinecap="round" />
              {run > 0.6 && run < 1 && <circle cx={((run - 0.6) / 0.4) * L} cy="50%" r={9} fill={C.green} style={{ filter: `drop-shadow(0 0 8px ${C.green})` }} />}
            </svg>
            <span
              style={{
                position: "relative",
                display: "inline-block",
                padding: "0.02em 0.3em 0.08em",
                borderRadius: "0.26em",
                background: mix(C.page, C.panel, k),
                color: mix(color, "#F4F5F6", k),
                boxShadow: `0 18px 40px -18px rgba(20,23,26,${0.6 * k}), inset 0 0 0 3px ${alpha(C.green, run > 0.38 && run < 0.7 ? 0.9 : 0.25 * k)}`,
              }}
            >
              {wd.w}
              {[0, 1].map((s) => (
                <span key={s} style={{ position: "absolute", top: "50%", left: s ? undefined : -11, right: s ? -11 : undefined, width: 22, height: 22, marginTop: -11, borderRadius: 11, background: C.page, border: `4px solid ${run > (s ? 0.6 : 0) ? C.green : C.wire}`, boxSizing: "border-box", opacity: stub }} />
              ))}
            </span>
          </span>
        );
      })}
    </div>
  );
};

// Lower third: a wire runs in from the frame edge, a pulse lands, and a source tag opens from its port.
export const SourceTag: FC<{ x?: number; y: number; at: number; out?: number; icon?: IconName; eyebrow: string; title: string; detail?: string }> = ({ x = 150, y, at, out, icon = "doc", eyebrow, title, detail }) => {
  const { t } = useTime();
  const open = ramp(t, at + 0.4, fr(14), EXPO);
  const gone = out == null ? 0 : ramp(t, out + fr(12), fr(10), IN);
  const h = 128;
  const cy = y + h / 2;
  return (
    <div style={{ position: "absolute", inset: 0, opacity: 1 - gone }}>
      <WireLayer>
        <Wire r={route([[-10, cy], [x, cy]])} drawAt={at} drawDur={0.4} retractAt={out} pulses={[{ at: at + 0.05, dur: 0.4 }]} lit={open} flow={0.6} ports={false} />
      </WireLayer>
      <div
        style={{
          position: "absolute",
          left: x,
          top: y,
          height: h,
          display: "flex",
          alignItems: "center",
          gap: 22,
          padding: "0 36px 0 20px",
          borderRadius: 26,
          background: C.card,
          border: `2px solid ${C.border}`,
          boxShadow: "0 30px 60px -24px rgba(20,23,26,0.6)",
          clipPath: `inset(0 ${(1 - open) * 100}% 0 0 round 26px)`,
        }}
      >
        <div style={{ width: 84, height: 84, borderRadius: 22, background: alpha(C.amber, 0.14), border: `2px solid ${alpha(C.amber, 0.45)}`, color: C.amber, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name={icon} size={46} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontFamily: MONO, fontSize: 28, color: C.amber, ...enter(t, at + 0.55, 12, 0, 0.3) }}>{eyebrow}</span>
          <span style={{ fontFamily: UI, fontWeight: 600, fontSize: 38, color: C.text, whiteSpace: "nowrap", ...enter(t, at + 0.62, 12, 0, 0.3) }}>
            {title}
            {detail && <span style={{ fontFamily: MONO, fontWeight: 500, fontSize: 28, color: C.muted, marginLeft: 18 }}>{detail}</span>}
          </span>
        </div>
      </div>
      <div style={{ position: "absolute", left: x - 10, top: cy - 10, width: 20, height: 20, borderRadius: 10, background: C.panel, border: `4px solid ${open > 0.5 ? C.green : C.wire}`, boxSizing: "border-box" }} />
    </div>
  );
};

export type ZoomKey = { t: number; x: number; y: number; s: number; d?: number };

// The cockpit camera: eases a world point to frame centre and zooms (1 → 1.12 toward the active column over a hold), with a sub-pixel drift so holds never freeze.
export const PanelZoom: FC<{ keys: ZoomKey[]; children: ReactNode }> = ({ keys, children }) => {
  const { t } = useTime();
  const first = keys[0] ?? { t: 0, x: W / 2, y: H / 2, s: 1 };
  let { x, y, s } = first;
  for (const k of keys.slice(1)) {
    const e = ramp(t, k.t, k.d ?? 1.2, INOUT);
    x += (k.x - x) * e;
    y += (k.y - y) * e;
    s += (k.s - s) * e;
  }
  x += Math.sin(t * 0.5) * 2;
  y += Math.sin(t * 0.7 + 1) * 1.5;
  return <AbsoluteFill style={{ transformOrigin: "0 0", transform: `translate(${W / 2 - x * s}px, ${H / 2 - y * s}px) scale(${s})` }}>{children}</AbsoluteFill>;
};

// Scene transition: the outgoing scene's out-port wire runs across the page into the next scene, and the camera pans one screen along it while a pulse rides the wire.
export const WirePan: FC<{ at: number; dur?: number; a: ReactNode; b: ReactNode; fromY?: number; toY?: number; fromX?: number; toX?: number }> = ({ at, dur = 1.1, a, b, fromY = 540, toY = 540, fromX = W - 96, toX = 96 }) => {
  const { t } = useTime();
  const quart = Easing.inOut(Easing.poly(4));
  const e = ramp(t, at, dur, quart);
  const blur = Math.sin(Math.PI * e) * 2;
  const r = hvh([fromX, fromY], [W + toX, toY], W + (toX - (W - fromX)) / 2);
  return (
    <AbsoluteFill style={{ transform: `translateX(${-W * e}px)`, filter: blur > 0.2 ? `blur(${blur}px)` : undefined }}>
      <AbsoluteFill>{a}</AbsoluteFill>
      <AbsoluteFill style={{ left: W }}>{b}</AbsoluteFill>
      <WireLayer>
        <Wire r={r} drawAt={at - 0.45} drawDur={0.4} lit={steps(t, [[0, 0], [at + dur * 0.9, 1]], 0.3)} pulses={[{ at: at - 0.05, dur: dur + 0.05 }]} flow={0.5} ports={false} width={4} />
      </WireLayer>
    </AbsoluteFill>
  );
};

// Stand-in for the creator's camera in lower-third demos: a dim room, window light, a silhouette. Swap for real footage in a video.
export const CameraPlaceholder: FC = () => {
  const { t } = useTime();
  const drift = Math.sin(t * 0.4) * 6;
  return (
    <AbsoluteFill style={{ background: "linear-gradient(160deg, #3B342E 0%, #221E1B 55%, #15130F 100%)", overflow: "hidden" }}>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{ position: "absolute", left: 1180 + i * 190 + drift, top: 110, width: 160, height: 520, borderRadius: 6, background: "linear-gradient(180deg, rgba(255,232,200,0.28), rgba(255,232,200,0.08))", filter: "blur(6px)" }} />
      ))}
      <div style={{ position: "absolute", left: 640 + drift * 0.5, top: 300, width: 300, height: 360, borderRadius: "50%", background: "#0F0D0B", filter: "blur(2px)" }} />
      <div style={{ position: "absolute", left: 470 + drift * 0.5, top: 600, width: 640, height: 600, borderRadius: "48% 48% 0 0", background: "#0F0D0B", filter: "blur(2px)" }} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 40%, transparent 40%, rgba(0,0,0,0.5) 100%)" }} />
      <div style={{ position: "absolute", right: 96, top: 80, fontFamily: MONO, fontSize: 28, color: "rgba(255,255,255,0.45)" }}>camera · placeholder</div>
    </AbsoluteFill>
  );
};

