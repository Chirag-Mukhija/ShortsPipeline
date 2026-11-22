// Code-explainer pieces: title card, keyword pops, big stat and corner ticker, A-vs-B panes, the doc-comment quote, tool lower third, stack chips and the meme slot.
import type { FC, ReactNode } from "react";
import { Img, interpolateColors } from "remotion";
import { W } from "../../core/video";
import { OUT, clamp01, ramp, useTime } from "../../core/time";
import { BACK15, BACK17, BG, BLUE, BORDER, GREEN, HEAD, MONO, MUTED, ORANGE, PANEL, POPF, PURPLE, RED, SNAP, SYN, TEXT, fr, rng } from "./theme";
import { Caret, Chip, Glyph, Monogram, Win, shake, typed, typedEnd } from "./chrome";

// Colour one substring of a line (the accent word) without splitting the font run elsewhere.
const accentRun = (s: string, accent: string | undefined, color: string): ReactNode => {
  if (!accent) return s;
  const i = s.indexOf(accent);
  if (i < 0) return s;
  return (
    <>
      {s.slice(0, i)}
      <span style={{ color }}>{accent}</span>
      {s.slice(i + accent.length)}
    </>
  );
};

// The hook card: a shell command types itself, Enter, then the title types out in Space Grotesk with a block caret, an orange bar wipes under it and chips rise.
export const TitleCard: FC<{ cmd: string; title: string[]; at: number; accent?: string; chips?: { k: string; v?: string; color?: string }[]; x?: number; y?: number; size?: number; out?: number }> = ({
  cmd,
  title,
  at,
  accent,
  chips = [],
  x = 150,
  y = 250,
  size = 150,
  out,
}) => {
  const { t } = useTime();
  if (out !== undefined && t >= out) return null;
  const cmdEnd = typedEnd(at, cmd.length, 45);
  const tAt = cmdEnd + 0.25;
  const total = title.join("").length;
  const n = typed(t, tAt, 55);
  const tEnd = typedEnd(tAt, total, 55);
  const bar = ramp(t, tEnd + fr(2), fr(6), SNAP);
  let used = 0;
  return (
    <div style={{ position: "absolute", left: x, top: y }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, fontFamily: MONO, fontWeight: 500, fontSize: 38, color: MUTED, whiteSpace: "pre", opacity: t >= at - 0.2 ? 1 : 0 }}>
        <Glyph kind="chevron" size={38} color={t > cmdEnd + 0.2 ? GREEN : PURPLE} />
        <span style={{ color: SYN.fn }}>{cmd.slice(0, typed(t, at, 45)).split(" ")[0]}</span>
        <span style={{ color: SYN.string, marginLeft: -14 }}>{cmd.slice(0, typed(t, at, 45)).replace(/^\S+/, "")}</span>
        {t < tAt && <Caret size={38} typing={t < cmdEnd} color={TEXT} block />}
      </div>
      <div style={{ marginTop: 34, fontFamily: HEAD, fontWeight: 700, fontSize: size, lineHeight: 1.02, letterSpacing: -size * 0.03, color: TEXT }}>
        {title.map((line, i) => {
          const shown = Math.max(0, Math.min(line.length, n - used));
          const last = n - used <= line.length && n - used >= 0;
          used += line.length;
          if (shown <= 0 && i > 0) return <div key={i} style={{ height: size * 1.02 }} />;
          return (
            <div key={i} style={{ whiteSpace: "pre" }}>
              {accentRun(line.slice(0, shown), accent, ORANGE)}
              {t >= tAt && (last || (i === title.length - 1 && n >= total)) && <Caret size={size * 0.8} typing={n < total} block color={ORANGE} />}
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 28, height: 12, width: 520 * bar, backgroundColor: ORANGE, borderRadius: 2, boxShadow: `0 0 24px ${ORANGE}99` }} />
      <div style={{ marginTop: 40, display: "flex", gap: 20 }}>
        {chips.map((c, i) => {
          const e = ramp(t, tEnd + 0.2 + i * fr(3), fr(16), BACK15);
          return (
            <div key={i} style={{ transform: `translateY(${(1 - e) * 40}px)`, opacity: clamp01(e * 2) }}>
              <Chip k={c.k} v={c.v} color={c.color} size={32} />
            </div>
          );
        })}
      </div>
    </div>
  );
};

// One big word slamming in at `at`: scale 0.6 → 1 with back-out(1.7) over 8 frames, a short seeded shake, and a hard cut at `out`. "slab" puts it on a tilted colour block.
export const KeywordPop: FC<{ text: string; at: number; out?: number; x?: number; y?: number; size?: number; color?: string; variant?: "slab" | "glow"; shakeAmp?: number; rotate?: number; seed?: number }> = ({
  text,
  at,
  out,
  x = W / 2,
  y = 540,
  size = 210,
  color = ORANGE,
  variant = "slab",
  shakeAmp = 14,
  rotate = -3,
  seed = 7,
}) => {
  const { t } = useTime();
  if (t < at || (out !== undefined && t >= out)) return null;
  const e = ramp(t, at, fr(8), BACK17);
  const [sx, sy] = shake(t, at + fr(6), shakeAmp, 6, seed);
  const slab = variant === "slab";
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: `translate(-50%, -50%) translate(${sx}px, ${sy}px) rotate(${rotate}deg) scale(${0.6 + 0.4 * e})`, opacity: clamp01(e * 3) }}>
      <div
        style={{
          fontFamily: POPF,
          fontWeight: 800,
          fontSize: size,
          lineHeight: 1,
          letterSpacing: -size * 0.04,
          whiteSpace: "pre",
          padding: slab ? `${size * 0.12}px ${size * 0.22}px ${size * 0.16}px` : 0,
          backgroundColor: slab ? color : "transparent",
          color: slab ? BG : color,
          borderRadius: slab ? size * 0.08 : 0,
          boxShadow: slab ? `${size * 0.05}px ${size * 0.05}px 0 ${TEXT}` : undefined,
          textShadow: slab ? undefined : `0 0 ${size * 0.25}px ${color}aa, ${size * 0.03}px ${size * 0.03}px 0 ${BG}`,
        }}
      >
        {text}
      </div>
    </div>
  );
};

export type PopWord = { w: string; at: number; color?: string; big?: boolean };

// A claim built word by word on the narration's word times: each word pops in 6 frames; coloured words land bigger.
export const PopLine: FC<{ words: PopWord[]; y: number; size?: number; out?: number }> = ({ words, y, size = 120, out }) => {
  const { t } = useTime();
  if (out !== undefined && t >= out) return null;
  return (
    <div style={{ position: "absolute", left: 96, right: 96, top: y, display: "flex", justifyContent: "center", alignItems: "baseline", flexWrap: "wrap", columnGap: size * 0.28, fontFamily: POPF, fontWeight: 800, fontSize: size, lineHeight: 1.1, letterSpacing: -size * 0.03 }}>
      {words.map((wd, i) => {
        const e = ramp(t, wd.at, fr(6), BACK17);
        return (
          <span key={i} style={{ display: "inline-block", color: wd.color ?? TEXT, fontSize: wd.big ? size * 1.35 : size, transform: `scale(${0.6 + 0.4 * e})`, opacity: e > 0 ? 1 : 0, textShadow: wd.color ? `0 0 40px ${wd.color}66` : undefined }}>
            {wd.w}
          </span>
        );
      })}
    </div>
  );
};

const fmt = (v: number, decimals: number) => v.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

// A big number counting up with ease-out under a `// comment` label, a rising mini bar chart and an optional delta chip.
export const BigStat: FC<{ to: number; from?: number; at: number; dur?: number; prefix?: string; suffix?: string; decimals?: number; label: string; delta?: { text: string; good?: boolean }; y?: number; size?: number; bars?: boolean }> = ({
  to,
  from = 0,
  at,
  dur = 1.3,
  prefix = "",
  suffix = "",
  decimals = 0,
  label,
  delta,
  y = 200,
  size = 260,
  bars = true,
}) => {
  const { t } = useTime();
  const p = ramp(t, at, dur, OUT);
  const v = from + (to - from) * p;
  const labelIn = ramp(t, at - 0.3, fr(8), SNAP);
  const r = rng(Math.round(to) + 5);
  const hs = Array.from({ length: 14 }, (_, i) => 0.18 + 0.82 * Math.pow(i / 13, 1.6) * (0.75 + 0.25 * r()));
  return (
    <div style={{ position: "absolute", left: 96, right: 96, top: y, display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ fontFamily: MONO, fontWeight: 500, fontSize: 40, color: MUTED, opacity: labelIn, transform: `translateY(${(1 - labelIn) * 8}px)` }}>{`// ${label}`}</div>
      <div style={{ fontFamily: POPF, fontWeight: 800, fontSize: size, lineHeight: 1.05, letterSpacing: -size * 0.04, color: TEXT, fontVariantNumeric: "tabular-nums", opacity: t >= at ? 1 : 0 }}>
        <span style={{ color: MUTED, fontSize: size * 0.6 }}>{prefix}</span>
        {fmt(v, decimals)}
        <span style={{ color: ORANGE }}>{suffix}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 40, marginTop: 10 }}>
        {bars && (
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 90 }}>
            {hs.map((hh, i) => {
              const g = ramp(t, at + i * fr(2), fr(10), SNAP);
              return <div key={i} style={{ width: 22, height: 90 * hh * g, borderRadius: 3, backgroundColor: i === hs.length - 1 ? ORANGE : BLUE, opacity: i === hs.length - 1 ? 1 : 0.45 + 0.4 * (i / hs.length) }} />;
            })}
          </div>
        )}
        {delta && (
          <div style={{ opacity: ramp(t, at + dur * 0.8, fr(6)), transform: `scale(${0.7 + 0.3 * ramp(t, at + dur * 0.8, fr(8), BACK17)})` }}>
            <Chip k={delta.good === false ? "down" : "up"} v={delta.text} color={delta.good === false ? RED : GREEN} size={40} />
          </div>
        )}
      </div>
    </div>
  );
};

// A corner counter for running stats (stars, tokens, dollars) with a blinking live dot; digits roll as it counts.
export const StatTicker: FC<{ label: string; to: number; from?: number; at: number; dur?: number; prefix?: string; suffix?: string; x?: number; y?: number; color?: string }> = ({
  label,
  to,
  from = 0,
  at,
  dur = 2,
  prefix = "",
  suffix = "",
  x = W - 96 - 420,
  y = 96,
  color = ORANGE,
}) => {
  const { t, f } = useTime();
  const e = ramp(t, at - 0.25, fr(8), SNAP);
  if (e <= 0) return null;
  const v = from + (to - from) * ramp(t, at, dur, OUT);
  return (
    <div style={{ position: "absolute", left: x, top: y, width: 420, padding: "18px 26px", borderRadius: 14, backgroundColor: `${PANEL}ee`, border: `1.5px solid ${BORDER}`, transform: `translateX(${(1 - e) * 40}px)`, opacity: e, boxShadow: "0 16px 40px rgba(0,0,0,0.5)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, fontFamily: MONO, fontWeight: 500, fontSize: 28, color: MUTED }}>
        <div style={{ width: 13, height: 13, borderRadius: 7, backgroundColor: RED, opacity: Math.floor(f / 15) % 2 ? 0.3 : 1 }} />
        {label}
      </div>
      <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 62, color, fontVariantNumeric: "tabular-nums", marginTop: 4 }}>
        {prefix}
        {fmt(v, 0)}
        {suffix}
      </div>
    </div>
  );
};

export type Side = { name: string; logo: string; color: string };
export type VsRow = { k: string; a: string; b: string; win?: "a" | "b" };

// A vs B: two editor panes rise, a VS badge slams between them, rows type in side by side with the winning value in green, and the verdict glows the winner and dims the loser.
export const Versus: FC<{ a: Side; b: Side; rows: VsRow[]; at: number; rowGap?: number; verdict?: { at: number; side: "a" | "b" } }> = ({ a, b, rows, at, rowGap = 0.55, verdict }) => {
  const { t } = useTime();
  const pw = 760;
  const rowH = 96;
  const h = 58 + 150 + rows.length * rowH + 40;
  const y = Math.round((1080 - h) / 2);
  const vs = ramp(t, at + 0.35, fr(8), BACK17);
  const v = verdict ? ramp(t, verdict.at, fr(8), SNAP) : 0;
  const pane = (side: Side, which: "a" | "b", x: number, enter: number) => {
    const won = verdict?.side === which;
    return (
      <Win x={x} y={y} w={pw} h={h} title={`${side.name.toLowerCase().replace(/\s+/g, "-")}.config`} enter={enter} glow={won && v > 0 ? GREEN : undefined} dim={!won && verdict ? v : 0}>
        <div style={{ display: "flex", alignItems: "center", gap: 26, padding: "34px 40px 30px", borderBottom: `1.5px solid ${BORDER}` }}>
          <Monogram text={side.logo} color={side.color} size={86} />
          <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 68, color: TEXT, letterSpacing: -1.5 }}>{side.name}</div>
          {won && v > 0 && (
            <div style={{ marginLeft: "auto", transform: `scale(${ramp(t, verdict!.at, fr(8), BACK17)})` }}>
              <Chip k="pick" v="winner" color={GREEN} size={30} />
            </div>
          )}
        </div>
        {rows.map((r, i) => {
          const rt = at + 0.8 + i * rowGap;
          if (t < rt) return null;
          const val = which === "a" ? r.a : r.b;
          const n = typed(t, rt, 45);
          const good = r.win === which;
          const bad = r.win !== undefined && !good;
          const mark = ramp(t, rt + 0.3, fr(6), BACK17);
          return (
            <div key={i} style={{ height: rowH, display: "flex", alignItems: "center", padding: "0 40px", fontFamily: MONO, fontSize: 40, whiteSpace: "pre" }}>
              <span style={{ color: SYN.prop, fontWeight: 500 }}>{`${r.k}:`}</span>
              <span style={{ marginLeft: "auto", fontWeight: 700, color: good && mark > 0 ? GREEN : bad && mark > 0 ? "#C9D1D9" : TEXT }}>{val.slice(0, n)}</span>
              <span style={{ width: 56, display: "flex", justifyContent: "flex-end", transform: `scale(${mark})` }}>
                {good && <Glyph kind="check" size={40} color={GREEN} />}
                {bad && <Glyph kind="cross" size={34} color={RED} />}
              </span>
            </div>
          );
        })}
      </Win>
    );
  };
  return (
    <>
      {pane(a, "a", 96, at)}
      {pane(b, "b", W - 96 - pw, at + fr(4))}
      {vs > 0 && (
        <div style={{ position: "absolute", left: W / 2, top: y + h / 2, transform: `translate(-50%, -50%) rotate(-6deg) scale(${0.6 + 0.4 * vs})`, opacity: clamp01(vs * 3) }}>
          <div style={{ fontFamily: POPF, fontWeight: 800, fontSize: 96, color: BG, backgroundColor: ORANGE, padding: "4px 22px 10px", borderRadius: 14, boxShadow: `6px 6px 0 ${TEXT}` }}>VS</div>
        </div>
      )}
    </>
  );
};

// A quote framed as a doc comment: /** types in, the words arrive at the narration's pace, the key phrase turns orange, then @author and @see tags land.
export const CommentQuote: FC<{ quote: string; author: string; source?: string; at: number; wps?: number; wordTimes?: number[]; highlight?: string; size?: number }> = ({ quote, author, source, at, wps = 6, wordTimes, highlight, size = 76 }) => {
  const { t } = useTime();
  const words = quote.split(" ");
  const wt = (i: number) => wordTimes?.[i] ?? at + 0.35 + i / wps;
  const end = wt(words.length - 1) + 0.3;
  const hl = highlight ? highlight.split(" ") : [];
  const hlStart = hl.length ? words.findIndex((_, i) => words.slice(i, i + hl.length).join(" ").replace(/[.,!?”"]/g, "") === highlight) : -1;
  const hlOn = ramp(t, end + 0.1, fr(8));
  const comment = { fontFamily: MONO, fontWeight: 500, fontSize: 52, color: SYN.comment };
  const tag = (k: string, v: string, c: string, d: number) => {
    const e = ramp(t, end + d, fr(8), SNAP);
    return (
      <div style={{ ...comment, fontSize: 42, opacity: e, transform: `translateY(${(1 - e) * 8}px)`, display: "flex", gap: 18, whiteSpace: "pre" }}>
        <span>{" * "}</span>
        <span style={{ color: PURPLE }}>{k}</span>
        <span style={{ color: c }}>{v}</span>
      </div>
    );
  };
  return (
    <div style={{ position: "absolute", left: 170, right: 170, top: 190 }}>
      <div style={{ ...comment, opacity: t >= at ? 1 : 0 }}>{"/**".slice(0, typed(t, at, 20))}</div>
      <div style={{ display: "flex", gap: 26, margin: "20px 0 26px" }}>
        <div style={{ width: 6, flex: "none", borderRadius: 3, background: `linear-gradient(${ORANGE}, ${PURPLE})`, opacity: ramp(t, at + 0.2, fr(8)) }} />
        <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: size, lineHeight: 1.18, letterSpacing: -1.5, color: TEXT }}>
          {words.map((w, i) => {
            const e = ramp(t, wt(i), fr(4), SNAP);
            const lit = hlStart >= 0 && i >= hlStart && i < hlStart + hl.length;
            return (
              <span key={i} style={{ opacity: e, color: lit ? interpolateColors(hlOn, [0, 1], [TEXT, ORANGE]) : TEXT }}>
                {w}
                {i < words.length - 1 ? " " : ""}
              </span>
            );
          })}
        </div>
      </div>
      {tag("@author", author, BLUE, 0.15)}
      {source && tag("@see", source, MUTED, 0.35)}
      <div style={{ ...comment, opacity: ramp(t, end + 0.5, fr(6)) }}>{" */"}</div>
    </div>
  );
};

// The lower third naming a tool: a monogram chip, the name, a mono line (version · site) and a blinking caret; wipes in from the left in 8 frames and slides out at `out`.
export const ToolTag: FC<{ name: string; sub: string; logo: string; color: string; at: number; out?: number; x?: number; y?: number }> = ({ name, sub, logo, color, at, out, x = 96, y = 1080 - 96 - 140 }) => {
  const { t } = useTime();
  const e = ramp(t, at, fr(8), SNAP);
  const o = out !== undefined ? ramp(t, out, fr(8), SNAP) : 0;
  if (e <= 0 || o >= 1) return null;
  const n = typed(t, at + fr(6), 50);
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        height: 140,
        display: "flex",
        alignItems: "center",
        gap: 28,
        padding: "0 44px 0 30px",
        borderRadius: 18,
        backgroundColor: `${PANEL}f2`,
        border: `1.5px solid ${BORDER}`,
        borderLeft: `8px solid ${color}`,
        boxShadow: "0 20px 50px rgba(0,0,0,0.55)",
        clipPath: `inset(-40px ${(1 - e) * 100}% -40px -40px)`,
        transform: `translateX(${-o * 140}px)`,
        opacity: 1 - o,
      }}
    >
      <Monogram text={logo} color={color} size={82} />
      <div>
        <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 56, lineHeight: 1.05, color: TEXT, letterSpacing: -1 }}>{name}</div>
        <div style={{ fontFamily: MONO, fontWeight: 500, fontSize: 30, color: MUTED, whiteSpace: "pre", marginTop: 6 }}>
          {sub.slice(0, n)}
          <Caret size={30} typing={n < sub.length} color={color} />
        </div>
      </div>
    </div>
  );
};

export type StackItem = { name: string; logo: string; color: string };

// A row of tool chips rising with back-out(1.5) on a 3-frame stagger; `focus` lifts one to 1.15 and dims the rest to 40 %.
export const StackBadges: FC<{ items: StackItem[]; at: number; y?: number; focus?: { i: number; at: number } }> = ({ items, at, y = 470, focus }) => {
  const { t } = useTime();
  const fe = focus ? ramp(t, focus.at, fr(8), SNAP) : 0;
  return (
    <div style={{ position: "absolute", left: 96, right: 96, top: y, display: "flex", justifyContent: "center", gap: 28, flexWrap: "wrap" }}>
      {items.map((it, i) => {
        const e = ramp(t, at + i * fr(3), fr(16), BACK15);
        const isF = focus?.i === i;
        const s = isF ? 1 + 0.15 * fe : 1;
        return (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 20,
              padding: "18px 30px 18px 18px",
              borderRadius: 18,
              backgroundColor: PANEL,
              border: `1.5px solid ${isF && fe > 0 ? it.color : BORDER}`,
              boxShadow: isF && fe > 0 ? `0 0 40px ${it.color}55` : "0 14px 34px rgba(0,0,0,0.45)",
              transform: `translateY(${(1 - e) * 40}px) scale(${s})`,
              opacity: clamp01(e * 2) * (focus && !isF ? 1 - 0.6 * fe : 1),
            }}
          >
            <Monogram text={it.logo} color={it.color} size={66} />
            <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 40, color: TEXT }}>{it.name}</span>
          </div>
        );
      })}
    </div>
  );
};

// A meme or screenshot slot: snaps in at `at` (scale 1.12 → 1 in 4 frames, a 2-frame shake) with an impact-style caption. Without `src` it draws a labelled placeholder.
export const MemeFrame: FC<{ x: number; y: number; w: number; h: number; at: number; src?: string; caption?: string; label?: string; rotate?: number; out?: number }> = ({ x, y, w, h, at, src, caption, label = "meme / screenshot", rotate = 2, out }) => {
  const { t } = useTime();
  if (t < at || (out !== undefined && t >= out)) return null;
  const e = ramp(t, at, fr(4), SNAP);
  const [sx, sy] = shake(t, at + fr(4), 12, 2, 31);
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        transform: `translate(${sx}px, ${sy}px) rotate(${rotate}deg) scale(${1.12 - 0.12 * e})`,
        borderRadius: 16,
        overflow: "hidden",
        border: `6px solid ${TEXT}`,
        boxShadow: "0 30px 70px rgba(0,0,0,0.6)",
        backgroundColor: "#1F2633",
      }}
    >
      {src ? (
        <Img src={src} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <div style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(45deg, rgba(255,255,255,0.04) 0 18px, transparent 18px 36px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18 }}>
          <svg width={150} height={120} viewBox="0 0 150 120">
            <rect x={4} y={4} width={142} height={112} rx={12} fill="none" stroke={MUTED} strokeWidth={6} />
            <circle cx={106} cy={38} r={13} fill={ORANGE} />
            <path d="M14 104 L56 54 L84 84 L102 66 L136 104 Z" fill={MUTED} />
          </svg>
          <div style={{ fontFamily: MONO, fontWeight: 500, fontSize: 30, color: MUTED }}>{label}</div>
        </div>
      )}
      {caption && (
        <div style={{ position: "absolute", left: 20, right: 20, bottom: 26, textAlign: "center", fontFamily: POPF, fontWeight: 800, fontSize: 60, lineHeight: 1.05, color: "#FFFFFF", textTransform: "uppercase", WebkitTextStroke: `3px ${BG}`, paintOrder: "stroke fill", textShadow: `0 4px 0 ${BG}` }}>
          {caption}
        </div>
      )}
    </div>
  );
};
