// Zoom-through-worlds narration pieces: key words landing, porthole steps, a big number whose zeros are holes, a porthole versus, a speech-bubble quote, the nested-layer diagram, a source ticket and dive overlays.
import type { CSSProperties, FC, ReactNode } from "react";
import { AbsoluteFill } from "remotion";
import { useTime } from "../../core/time";
import { H, W } from "../../core/video";
import { BlinkEyes, StarField, scatterStars, type Look } from "./life";
import { Inked, Stage, ease, inkLine, inkRect, starPath } from "./ink";
import { Peeker } from "./props";
import { BACK, CHUNK, CORAL, CORAL_DEEP, DISPLAY, EXPO_OUT, FLESH, HOT, HOT_DEEP, INK, PAPER, QUAD_IN, SCRAWL, SERIF, SKIN, SUN, VOID, inked } from "./theme";

export type Tone = "void" | "coral" | "hot" | "sun" | "paper";
const TONE: Record<Tone, { bg: string; deep: string; type: string }> = {
  void: { bg: VOID, deep: "#2A2326", type: SUN },
  coral: { bg: CORAL, deep: CORAL_DEEP, type: SUN },
  hot: { bg: HOT, deep: HOT_DEEP, type: SUN },
  sun: { bg: SUN, deep: "#F2C500", type: HOT },
  paper: { bg: PAPER, deep: "#F3EAC8", type: HOT },
};

// ---------- Key words landing on the spoken word ----------
export type Word = { w: string; t: number; key?: boolean; br?: boolean };

// Each word drops in on back-out at its time; key words land bigger in hot pink and get an inked swoosh drawn under them.
export const KeyLine: FC<{ words: Word[]; size?: number; style?: CSSProperties }> = ({ words, size = 120, style }) => {
  const { t } = useTime();
  const lines: Word[][] = [];
  words.forEach((w, i) => (i === 0 || w.br ? lines.push([w]) : lines[lines.length - 1]!.push(w)));
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: size * 0.12, ...style }}>
      {lines.map((ln, li) => (
        <div key={li} style={{ display: "flex", gap: size * 0.26, alignItems: "baseline" }}>
          {ln.map((w, wi) => {
            const p = ease(t, w.t - 0.1, 12 / 30, BACK);
            const u = ease(t, w.t + 0.15, 10 / 30);
            const s = w.key ? 1.3 : 1;
            return (
              <span key={wi} style={{ position: "relative", display: "inline-block", fontFamily: DISPLAY, fontSize: size * s, letterSpacing: 2, color: w.key ? HOT : SUN, textShadow: inked(size * s * 0.035, size * s * 0.06), opacity: p > 0 ? 1 : 0, transform: `translateY(${(1 - p) * -90}px) rotate(${w.key ? -2 : 0}deg)` }}>
                {w.w}
                {w.key && (
                  <svg viewBox="0 0 300 40" preserveAspectRatio="none" style={{ position: "absolute", left: "-4%", bottom: -size * 0.12, width: "108%", height: size * 0.22, overflow: "visible" }}>
                    <path d="M6 26 C60 8 120 34 180 16 S270 10 294 22" fill="none" stroke={INK} strokeWidth={11} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - u} />
                  </svg>
                )}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
};

// ---------- Porthole steps ----------
export type Step = { label: string; sub?: string; at: number; tone?: Tone };

const Porthole: FC<{ x: number; y: number; r: number; tone: Tone; p: number; children?: ReactNode; seed?: number }> = ({ x, y, r, tone, p, children, seed = 1 }) => {
  const c = TONE[tone];
  return (
    <g transform={`translate(${x} ${y}) scale(${p}) rotate(${(1 - p) * -25})`}>
      <circle r={r + 30} fill={INK} transform="translate(10 10)" />
      <circle r={r + 30} fill={PAPER} stroke={INK} strokeWidth={8} />
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2 + 0.2;
        return <circle key={i} cx={Math.cos(a) * (r + 15)} cy={Math.sin(a) * (r + 15)} r={6} fill={SUN} stroke={INK} strokeWidth={3.5} />;
      })}
      <circle r={r} fill={c.bg} />
      <path d={`M${-r} 0 a${r} ${r} 0 0 0 ${r * 2} 0`} fill={c.deep} opacity={0.55} />
      {tone === "void" && <StarField stars={scatterStars(5, seed, [-r * 0.8, -r * 0.8, r * 1.6, r * 1.6], [0, 0, r * 0.45, r * 0.45], 7, 13)} outline={false} />}
      {children}
      <circle r={r} fill="none" stroke={INK} strokeWidth={9} />
      <path d={`M${-r * 0.62} ${-r * 0.38} Q${-r * 0.5} ${-r * 0.62} ${-r * 0.2} ${-r * 0.7}`} stroke={SKIN} strokeWidth={8} strokeLinecap="round" fill="none" opacity={0.8} />
    </g>
  );
};

// Numbered portholes along a dashed ink path; each pops in (back-out, a quarter turn) on its cue and the path draws on to it.
export const PortholeSteps: FC<{ steps: Step[]; y?: number; r?: number }> = ({ steps, y = 460, r = 118 }) => {
  const { t } = useTime();
  const n = steps.length;
  const span = Math.min(1500, (n - 1) * 470);
  const xs = steps.map((_, i) => W / 2 - span / 2 + (n === 1 ? 0 : (i * span) / (n - 1)));
  const tones: Tone[] = ["coral", "void", "hot", "sun"];
  return (
    <AbsoluteFill>
      <Stage>
        {xs.slice(1).map((x, i) => {
          const p = ease(t, steps[i + 1]!.at - 0.45, 0.4);
          const a: [number, number] = [xs[i]! + r + 46, y + 10];
          const b: [number, number] = [a[0] + (x - r - 46 - a[0]) * p, y + 10];
          return p > 0.02 ? <path key={i} d={inkLine(a, b, 70 + i, -0.1)} fill="none" stroke={INK} strokeWidth={8} strokeLinecap="round" strokeDasharray="2 20" /> : null;
        })}
        {steps.map((s, i) => {
          const p = ease(t, s.at, 0.5, BACK);
          const tone = s.tone ?? tones[i % tones.length]!;
          return (
            <Porthole key={i} x={xs[i]!} y={y} r={r} tone={tone} p={p} seed={i + 3}>
              <text y={r * 0.42} textAnchor="middle" fontFamily={DISPLAY} fontSize={r * 1.25} fill={TONE[tone].type} stroke={INK} strokeWidth={12} paintOrder="stroke" strokeLinejoin="round">{i + 1}</text>
            </Porthole>
          );
        })}
      </Stage>
      {steps.map((s, i) => {
        const p = ease(t, s.at + 0.2, 0.45, EXPO_OUT);
        return (
          <div key={i} style={{ position: "absolute", left: xs[i]! - 220, width: 440, top: y + r + 70, textAlign: "center", opacity: p, transform: `translateY(${(1 - p) * 24}px)` }}>
            <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 48, color: INK, lineHeight: 1.1 }}>{s.label}</div>
            {s.sub && <div style={{ fontFamily: SCRAWL, fontSize: 38, color: INK, opacity: 0.75, marginTop: 8 }}>{s.sub}</div>}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

// ---------- A big number whose zeros are holes into star space ----------
const ZeroHole: FC<{ size: number; seed: number }> = ({ size, seed }) => {
  const w = size * 0.5;
  const h = size * 0.74;
  return (
    <svg viewBox={`${-w / 2 - 10} ${-h / 2 - 10} ${w + 30} ${h + 30}`} width={w + 30} height={h + 30} style={{ overflow: "visible", margin: `0 ${-size * 0.02}px`, transform: `translateY(${size * 0.02}px)` }}>
      <ellipse cx={size * 0.045} cy={size * 0.045} rx={w / 2} ry={h / 2} fill={INK} />
      <ellipse rx={w / 2} ry={h / 2} fill={SUN} stroke={INK} strokeWidth={size * 0.035} />
      <ellipse rx={w * 0.25} ry={h * 0.31} fill={VOID} stroke={INK} strokeWidth={size * 0.02} />
      <path d={starPath(-w * 0.06, -h * 0.08, size * 0.05, seed)} fill={SUN} />
      <path d={starPath(w * 0.08, h * 0.12, size * 0.03, seed + 1)} fill={SUN} />
      <circle cx={w * 0.1} cy={-h * 0.15} r={size * 0.012} fill={PAPER} />
    </svg>
  );
};

// Counts up on expo-out and lands with a small punch; every 0 is drawn as a portal with stars inside. The label arrives after the number.
export const PortalNumber: FC<{ value: number; at: number; dur?: number; size?: number; prefix?: string; suffix?: string; label?: string; aside?: string; y?: number }> = ({
  value, at, dur = 1.4, size = 300, prefix = "", suffix = "", label, aside, y = 400,
}) => {
  const { t } = useTime();
  const p = ease(t, at, dur, EXPO_OUT);
  const v = Math.round(value * p);
  const punch = 1 + 0.08 * Math.sin(Math.PI * ease(t, at + dur * 0.55, 6 / 30));
  const text = `${prefix}${v.toLocaleString("en-US")}${suffix}`;
  const lp = ease(t, at + dur * 0.55 + 0.25, 0.5, EXPO_OUT);
  return (
    <AbsoluteFill style={{ alignItems: "center" }}>
      <div style={{ position: "absolute", top: y - size * 0.6, display: "flex", alignItems: "center", transform: `scale(${punch * (0.6 + 0.4 * ease(t, at - 0.1, 0.4, BACK))})`, opacity: t >= at - 0.1 ? 1 : 0 }}>
        {[...text].map((ch, i) =>
          ch === "0" ? (
            <ZeroHole key={i} size={size} seed={i * 7 + 2} />
          ) : (
            <span key={i} style={{ fontFamily: DISPLAY, fontSize: size, lineHeight: 1, color: SUN, textShadow: inked(size * 0.035, size * 0.05), display: "inline-block", width: /[0-9]/.test(ch) ? size * 0.5 : undefined, textAlign: "center" }}>{ch}</span>
          ),
        )}
      </div>
      {label && (
        <div style={{ position: "absolute", top: y + size * 0.5, opacity: lp, transform: `translateY(${(1 - lp) * 20}px)`, textAlign: "center" }}>
          <div style={{ display: "inline-block", fontFamily: SERIF, fontWeight: 700, fontSize: 54, color: INK, background: PAPER, border: `6px solid ${INK}`, borderRadius: 18, padding: "10px 34px", boxShadow: `8px 8px 0 ${INK}` }}>{label}</div>
          {aside && <div style={{ fontFamily: SCRAWL, fontSize: 40, color: INK, marginTop: 22, transform: "rotate(-2deg)" }}>{aside}</div>}
        </div>
      )}
    </AbsoluteFill>
  );
};

// ---------- A vs B through two portholes ----------
export type Side = { title: string; lines: string[]; tone: Tone };

// Two portholes with a pair of eyes inside each, looking at the other side; a star "VS" spins in between.
export const PortholeVersus: FC<{ a: Side; b: Side; at: number; verdict?: { at: number; side: "a" | "b" } }> = ({ a, b, at, verdict }) => {
  const { t } = useTime();
  const xs = [520, 1400];
  const y = 400;
  const r = 190;
  const sides = [a, b];
  const vs = ease(t, at + 0.8, 0.6, BACK);
  const win = verdict ? ease(t, verdict.at, 0.4, BACK) : 0;
  return (
    <AbsoluteFill>
      <Stage>
        {sides.map((s, i) => {
          const p = ease(t, at + i * 0.4, 0.55, BACK);
          const looks: Look[] = [{ at: 0, x: i === 0 ? 0.9 : -0.9, y: 0 }, ...(verdict ? [{ at: verdict.at, x: 0, y: -0.6 }] : [])];
          const dim = verdict && verdict.side !== (i === 0 ? "a" : "b") ? ease(t, verdict.at, 0.4) : 0;
          return (
            <g key={i} opacity={1 - dim * 0.45}>
              <Porthole x={xs[i]!} y={y} r={r} tone={s.tone} p={p} seed={i + 9}>
                <BlinkEyes x={0} y={10} size={74} gap={1.45} lookAt={looks} seed={i + 20} />
              </Porthole>
            </g>
          );
        })}
        <g transform={`translate(960 ${y}) scale(${vs}) rotate(${(1 - vs) * 160 + Math.sin(t * 1.4) * 4})`}>
          <path d={starPath(8, 8, 130, 4)} fill={INK} />
          <path d={starPath(0, 0, 130, 4)} fill={SUN} stroke={INK} strokeWidth={8} strokeLinejoin="round" />
          <text y={22} textAnchor="middle" fontFamily={CHUNK} fontSize={64} fill={INK}>VS</text>
        </g>
        {verdict && (
          <g transform={`translate(${xs[verdict.side === "a" ? 0 : 1]! + r * 0.85} ${y - r * 0.85}) scale(${win}) rotate(-12)`}>
            <path d={starPath(0, 0, 70, 9)} fill={HOT} stroke={INK} strokeWidth={7} strokeLinejoin="round" />
          </g>
        )}
      </Stage>
      {sides.map((s, i) => {
        const p = ease(t, at + i * 0.4 + 0.35, 0.5, EXPO_OUT);
        return (
          <div key={i} style={{ position: "absolute", left: xs[i]! - 330, width: 660, top: y + r + 60, textAlign: "center", opacity: p, transform: `translateY(${(1 - p) * 30}px)` }}>
            <div style={{ fontFamily: DISPLAY, fontSize: 92, lineHeight: 1, color: SUN, textShadow: inked(3.5, 6), letterSpacing: 2 }}>{s.title}</div>
            {s.lines.map((l, k) => (
              <div key={k} style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 40, color: INK, marginTop: k === 0 ? 14 : 4 }}>{l}</div>
            ))}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

// ---------- Quote: a speech bubble from the Peeker ----------
// The bubble pops from its tail toward the speaker; lines settle one after another; attribution is handwritten.
export const QuoteBubble: FC<{ lines: string[]; by: string; at: number; speaker?: number }> = ({ lines, by, at, speaker = 330 }) => {
  const { t } = useTime();
  const p = ease(t, at + 0.35, 0.55, BACK);
  const box = { x: 440, y: 150, w: 1300, h: 520 };
  const tail = `M${box.x + 120} ${box.y + box.h - 8} L${speaker + 40} ${H - 270} L${box.x + 250} ${box.y + box.h - 8}`;
  return (
    <AbsoluteFill>
      <Stage>
        <Peeker x={speaker} w={420} rise={300} at={at} mouth={ease(t, at + 0.3, 0.3)} lookAt={[{ at: 0, x: 0.8, y: -0.7 }, { at: at + 2.2, x: 0.3, y: -0.9 }]} />
        <g transform={`translate(${speaker + 40} ${H - 270}) scale(${p}) translate(${-(speaker + 40)} ${-(H - 270)})`}>
          <path d={inkRect(box.x + 14, box.y + 14, box.w, box.h, 60, 4, 6)} fill={INK} />
          <path d={tail} fill={PAPER} stroke={INK} strokeWidth={8} strokeLinejoin="round" />
          <Inked d={inkRect(box.x, box.y, box.w, box.h, 60, 4, 6)} fill={PAPER} w={8} />
          <path d={`M${box.x + 126} ${box.y + box.h - 4} L${box.x + 244} ${box.y + box.h - 4}`} stroke={PAPER} strokeWidth={14} />
          {[0, 1].map((k) => (
            <g key={k} transform={`translate(${box.x + 70 + k * 78} ${box.y + 8}) rotate(-8)`}>
              <path d="M8 62 C-14 30 6 -6 44 -10 C30 6 26 22 34 34 C58 38 62 76 34 84 C18 88 12 74 8 62Z" fill={INK} transform="translate(7 7)" />
              <path d="M8 62 C-14 30 6 -6 44 -10 C30 6 26 22 34 34 C58 38 62 76 34 84 C18 88 12 74 8 62Z" fill={SUN} stroke={INK} strokeWidth={6} strokeLinejoin="round" />
            </g>
          ))}
        </g>
      </Stage>
      <div style={{ position: "absolute", left: box.x + 190, top: box.y + 90, width: box.w - 290 }}>
        {lines.map((l, i) => {
          const q = ease(t, at + 0.75 + i * 0.3, 0.5, EXPO_OUT);
          return (
            <div key={i} style={{ fontFamily: SERIF, fontStyle: "italic", fontWeight: 500, fontSize: 62, lineHeight: 1.28, color: INK, opacity: q, transform: `translateY(${(1 - q) * 18}px)` }}>{l}</div>
          );
        })}
        <div style={{ fontFamily: SCRAWL, fontSize: 46, color: HOT_DEEP, marginTop: 26, textAlign: "right", opacity: ease(t, at + 0.9 + lines.length * 0.3, 0.5) }}>{by}</div>
      </div>
    </AbsoluteFill>
  );
};

// ---------- Nested-layer diagram ----------
const LAYER_FILL = [PAPER, HOT, CORAL, FLESH, VOID, SUN];

// Concentric hand-inked frames, outermost first, like a cross-section of the dive; each pops in on its cue with a label on a leader line.
// `focus` lights one layer's label pink with a star at its time; the core keeps a pair of eyes.
export const LayerStack: FC<{ layers: string[]; at: number; gap?: number; focus?: { i: number; at: number } }> = ({ layers, at, gap = 0.45, focus }) => {
  const { t } = useTime();
  const n = layers.length;
  const cx = 680;
  const cy = 560;
  const W0 = 1000;
  const H0 = 760;
  const dx = Math.min(90, (W0 - 260) / 2 / Math.max(1, n - 1));
  const dy = Math.min(72, (H0 - 170) / 2 / Math.max(1, n - 1));
  const labelX = 1290;
  return (
    <AbsoluteFill>
      <Stage>
        {layers.map((_, i) => {
          const p = ease(t, at + i * gap, 0.5, BACK);
          const w = W0 - 2 * dx * i;
          const h = H0 - 2 * dy * i;
          return (
            <g key={i} transform={`translate(${cx} ${cy}) scale(${0.6 + 0.4 * p}) translate(${-cx} ${-cy})`} opacity={p > 0 ? 1 : 0}>
              {i === 0 && <path d={inkRect(cx - w / 2 + 12, cy - h / 2 + 12, w, h, 56, 30, 4)} fill={INK} />}
              <Inked d={inkRect(cx - w / 2, cy - h / 2, w, h, 56 - i * 6, 30 + i, 4)} fill={LAYER_FILL[i % LAYER_FILL.length]} w={8} />
            </g>
          );
        })}
        {ease(t, at + (n - 1) * gap, 0.3) > 0 && <BlinkEyes x={cx} y={cy} size={52} gap={1.5} lookAt={[{ at: 0, x: 0.8, y: 0 }, ...(focus ? [{ at: focus.at, x: 0.9, y: -0.6 }] : [])]} seed={41} />}
        {layers.map((_, i) => {
          const q = ease(t, at + i * gap + 0.25, 0.35);
          const y = cy - (H0 / 2 - dy * i) + dy / 2;
          const x0 = cx + (W0 / 2 - dx * i) - (i === n - 1 ? dx + 20 : dx * 0.5);
          return <path key={`l${i}`} d={`M${x0} ${y} L${x0 + (labelX - 40 - x0) * q} ${y}`} stroke={INK} strokeWidth={5} strokeLinecap="round" strokeDasharray={i === n - 1 ? undefined : "2 12"} fill="none" />;
        })}
        {layers.map((_, i) => {
          const y = cy - (H0 / 2 - dy * i) + dy / 2;
          const x0 = cx + (W0 / 2 - dx * i) - (i === n - 1 ? dx + 20 : dx * 0.5);
          return <circle key={`d${i}`} cx={x0} cy={y} r={8} fill={SUN} stroke={INK} strokeWidth={4} opacity={ease(t, at + i * gap + 0.25, 0.1)} />;
        })}
        {focus && (
          <g transform={`translate(${labelX - 6} ${cy - (H0 / 2 - dy * focus.i) + dy / 2}) scale(${ease(t, focus.at, 0.4, BACK)})`}>
            <path d={starPath(0, 0, 26, 2)} fill={HOT} stroke={INK} strokeWidth={4} />
          </g>
        )}
      </Stage>
      {layers.map((l, i) => {
        const q = ease(t, at + i * gap + 0.45, 0.4, EXPO_OUT);
        const on = focus && focus.i === i ? ease(t, focus.at, 0.2) : 0;
        const y = cy - (H0 / 2 - dy * i) + dy / 2;
        return (
          <div key={i} style={{ position: "absolute", left: labelX + 30, top: y - 28, fontFamily: CHUNK, fontSize: 44, lineHeight: "56px", color: on > 0.5 ? HOT_DEEP : INK, opacity: q * (focus && t >= focus.at && focus.i !== i ? 0.55 : 1), transform: `translateX(${(1 - q) * -20}px) scale(${1 + on * 0.08})`, transformOrigin: "left center", whiteSpace: "nowrap" }}>
            {l}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

// ---------- Source ticket (lower third) ----------
// A notched yellow ticket that skates in from the left (expo-out, tilt settling to -1.5°) and drops away at `out`.
export const SourceTicket: FC<{ title: string; detail?: string; at: number; out?: number; w?: number; tag?: string }> = ({ title, detail, at, out, w = 1040, tag = "SOURCE" }) => {
  const { t } = useTime();
  const p = ease(t, at, 36 / 30, EXPO_OUT);
  const o = out === undefined ? 0 : ease(t, out, 0.4, QUAD_IN);
  const h = 150;
  const x = 96;
  const y = H - 96 - h;
  const notch = `M0 0 L${w} 0 L${w} ${h * 0.32} A${h * 0.18} ${h * 0.18} 0 0 0 ${w} ${h * 0.68} L${w} ${h} L0 ${h} L0 ${h * 0.68} A${h * 0.18} ${h * 0.18} 0 0 0 0 ${h * 0.32} Z`;
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h, transform: `translateX(${(1 - p) * -(w + 200)}px) translateY(${o * 300}px) rotate(${-1.5 - (1 - p) * 5}deg)` }}>
      <svg width={w + 20} height={h + 20} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
        <path d={notch} fill={INK} transform="translate(10 10)" />
        <path d={notch} fill={SUN} stroke={INK} strokeWidth={6} strokeLinejoin="round" />
        <path d={`M${w - 70} 14 L${w - 70} ${h - 14}`} stroke={INK} strokeWidth={4} strokeDasharray="3 12" strokeLinecap="round" />
        <path d={starPath(w - 35, h / 2, 16, 8)} fill={HOT} stroke={INK} strokeWidth={3.5} />
      </svg>
      <div style={{ position: "absolute", left: 50, top: 22, right: 100, display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontFamily: CHUNK, fontSize: 28, color: SUN, background: INK, padding: "2px 14px", borderRadius: 8, letterSpacing: 2 }}>{tag}</span>
          {detail && <span style={{ fontFamily: SCRAWL, fontSize: 34, color: INK }}>{detail}</span>}
        </div>
        <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 44, color: INK, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</div>
      </div>
    </div>
  );
};

// ---------- Dive overlays ----------
// A chunky tag that drops in when the camera arrives in a world: "LEVEL 3 · INSIDE THE SCREEN".
export const WorldTag: FC<{ text: string; at: number; out?: number; x?: number; y?: number; tone?: Tone }> = ({ text, at, out, x = 96, y = 104, tone = "paper" }) => {
  const { t } = useTime();
  const p = ease(t, at, 12 / 30, BACK);
  const o = out === undefined ? 0 : ease(t, out, 14 / 30, QUAD_IN);
  if (p <= 0 || o >= 1) return null;
  return (
    <div style={{ position: "absolute", left: x, top: y, clipPath: "inset(-40px -40px -40px -40px)", transform: `translateY(${(1 - p) * -80 - o * 120}px) rotate(-2deg)`, opacity: 1 - o }}>
      <div style={{ fontFamily: CHUNK, fontSize: 40, color: INK, background: TONE[tone].bg, border: `6px solid ${INK}`, borderRadius: 999, padding: "8px 30px", boxShadow: `7px 7px 0 ${INK}`, whiteSpace: "nowrap" }}>{text}</div>
    </div>
  );
};

// Running magnification readout for dives, e.g. "ZOOM ×2,744".
export const ZoomCounter: FC<{ zoom: number; x?: number; y?: number }> = ({ zoom, x = W - 96, y = H - 96 }) => (
  <div style={{ position: "absolute", right: W - x, bottom: H - y, fontFamily: CHUNK, fontSize: 40, color: SUN, background: INK, border: `5px solid ${SUN}`, borderRadius: 16, padding: "6px 24px", fontVariantNumeric: "tabular-nums", boxShadow: `6px 6px 0 ${FLESH}` }}>
    ZOOM ×{Math.round(zoom).toLocaleString("en-US")}
  </div>
);
