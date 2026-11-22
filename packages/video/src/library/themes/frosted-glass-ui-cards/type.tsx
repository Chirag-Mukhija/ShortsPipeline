// Glass typography: masked word rise with one Instrument Serif italic word, the hero title slab, the key-claim glass capsule, the quote card and the frosted lower thirds.
import type { CSSProperties, FC, ReactNode } from "react";
import { Easing } from "remotion";
import { H } from "../../core/video";
import { OUT, clamp01, ramp, useTime } from "../../core/time";
import { CORAL, CYAN, INK, MUTE, PEACH, SANS, SERIF, SOFT, TEXT_SHADOW, fr, rgba, sp } from "./theme";
import { Chip, GlassCard, GlintBand, Rim, glintAt } from "./glass";
import { Icon, IconTile, type IconName } from "./icons";
import { Sphere } from "./field";

export const ACCENT_FILL = `linear-gradient(95deg, #FFFFFF 0%, #D4FAFF 40%, ${CYAN} 100%)`;
export const SERIF_FILL = `linear-gradient(95deg, #FFFFFF 0%, ${PEACH} 55%, ${CORAL} 120%)`;
export const fillText = (fill: string): CSSProperties => ({ backgroundImage: fill, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" });

export type Word = { w: string; t: number; serif?: boolean; accent?: boolean; br?: boolean };

// One word sliding up from behind its own floor (18 f, out-cubic) with a short blur; serif words switch to the italic display face.
export const RiseWord: FC<{ word: Word; size: number; weight?: number; color?: string; out?: number }> = ({ word, size, weight = 700, color = INK, out }) => {
  const { t } = useTime();
  const p = ramp(t, word.t - fr(3), fr(18), OUT);
  const ex = out === undefined ? 0 : ramp(t, out, fr(10), Easing.in(Easing.cubic));
  const style: CSSProperties = word.serif
    ? { fontFamily: SERIF, fontWeight: 400, fontSize: size * 1.14, letterSpacing: "-0.01em", ...fillText(SERIF_FILL) }
    : word.accent
      ? { ...fillText(ACCENT_FILL), fontWeight: 800 }
      : { color };
  return (
    <span style={{ display: "inline-block", overflow: "hidden", verticalAlign: "bottom", padding: "0.06em 0.1em 0.16em 0.04em", margin: "-0.06em 0.12em -0.16em -0.04em" }}>
      <span style={{ display: "inline-block", fontWeight: weight, transform: `translateY(${(1 - p) * 110 - ex * 30}%)`, opacity: 1 - ex, filter: p < 1 ? `blur(${(1 - p) * 6}px)` : undefined, textShadow: word.serif || word.accent ? undefined : TEXT_SHADOW, ...style }}>
        {word.w}
      </span>
    </span>
  );
};

export const Words: FC<{ words: Word[]; size: number; weight?: number; color?: string; align?: "left" | "center"; lh?: number; out?: number; style?: CSSProperties }> = ({ words, size, weight, color, align = "left", lh = 1.08, out, style }) => (
  <div style={{ fontFamily: SANS, fontSize: size, lineHeight: lh, letterSpacing: "-0.025em", textAlign: align, ...style }}>
    {words.map((w, i) => (
      <span key={i}>
        <RiseWord word={w} size={size} weight={weight} color={color} out={out} />
        {w.br && <br />}
      </span>
    ))}
  </div>
);

// Helper: a sentence as words that land evenly from `at`, `every` seconds apart; *word* marks the serif word, _word_ the accent.
export const say = (text: string, at: number, every = 0.16): Word[] =>
  text.split(" ").map((raw, i) => {
    const br = raw.endsWith("/");
    const s = br ? raw.slice(0, -1) : raw;
    const serif = s.startsWith("*") && s.endsWith("*");
    const accent = s.startsWith("_") && s.endsWith("_");
    return { w: serif || accent ? s.slice(1, -1) : s, t: at + i * every, serif, accent, br };
  });

// ---------- hero title slab ----------
export type FloatChip = { x: number; y: number; at: number; icon: IconName; text: string; color?: string; depth?: number };

export const HeroTitle: FC<{ eyebrow?: string; words: Word[]; sub?: string; at?: number; out?: number; chips?: FloatChip[]; size?: number }> = ({ eyebrow, words, sub, at = 0, out, chips = [], size = 104 }) => {
  const { t } = useTime();
  const last = words[words.length - 1]?.t ?? at;
  return (
    <>
      <Sphere x={1590} y={250} r={150} tone="coral" at={at} seed={4} />
      <Sphere x={590} y={870} r={105} tone="cyan" at={at + 0.2} seed={5} />
      <GlassCard x={250} y={200} w={1420} h={640} at={at} out={out} r={44} tint="clear" glint={[last + 0.3]} depth={6} pad="76px 96px">
        {eyebrow && (
          <div style={{ opacity: ramp(t, at + 0.25, 0.4), transform: `translateY(${(1 - ramp(t, at + 0.25, 0.5)) * 14}px)`, marginBottom: 40 }}>
            <Chip pad="10px 24px 10px 14px">
              <span style={{ width: 14, height: 14, borderRadius: 7, background: CYAN, boxShadow: `0 0 14px ${CYAN}` }} />
              <span style={{ fontFamily: SANS, fontWeight: 600, fontSize: 30, color: INK, letterSpacing: "0.01em" }}>{eyebrow}</span>
            </Chip>
          </div>
        )}
        <Words words={words} size={size} weight={700} out={out} />
        {sub && <div style={{ marginTop: 40, fontFamily: SANS, fontWeight: 500, fontSize: 40, color: SOFT, opacity: ramp(t, last + 0.2, 0.5), transform: `translateY(${(1 - ramp(t, last + 0.2, 0.6)) * 16}px)` }}>{sub}</div>}
      </GlassCard>
      {chips.map((c, i) => (
        <GlassCard key={i} x={c.x} y={c.y} w={c.text.length * 19 + 150} h={96} r={48} at={c.at} out={out} enter="pop" tint="milk" depth={c.depth ?? 22} float={i + 2} idleGlint={i * 1.1} pad="0 30px 0 16px" contentStyle={{ flexDirection: "row", alignItems: "center", gap: 18 }}>
          <IconTile name={c.icon} size={64} color={c.color ?? CYAN} />
          <span style={{ fontFamily: SANS, fontWeight: 700, fontSize: 32, color: INK, whiteSpace: "nowrap" }}>{c.text}</span>
        </GlassCard>
      ))}
    </>
  );
};

// ---------- key claim: a glass capsule pops behind the spoken key word ----------
export const KeyClaim: FC<{ words: Word[]; keyIndex: number; size?: number; y?: number; sub?: string; subAt?: number; out?: number }> = ({ words, keyIndex, size = 112, y = 400, sub, subAt, out }) => {
  const { t } = useTime();
  const k = words[keyIndex]!;
  const s = sp(t, k.t, { damping: 11, stiffness: 160, mass: 0.8 });
  const ex = out === undefined ? 0 : ramp(t, out, fr(10), Easing.in(Easing.cubic));
  const g = glintAt(t, [k.t + 0.35], false);
  const lift = ramp(t, k.t, fr(12), OUT);
  return (
    <div style={{ position: "absolute", left: 120, right: 120, top: y, display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ fontFamily: SANS, fontSize: size, lineHeight: 1.15, letterSpacing: "-0.03em", textAlign: "center" }}>
        {words.map((w, i) =>
          i !== keyIndex ? (
            <span key={i}>
              <RiseWord word={w} size={size} out={out} />
              {w.br && <br />}
            </span>
          ) : (
            <span key={i} style={{ position: "relative", display: "inline-block", margin: "0 0.42em 0 0.36em" }}>
              {/* The bead: a small lit sphere tucked behind the capsule so its frost has something to bend. */}
              <span style={{ position: "absolute", right: -size * 0.32, top: -size * 0.34, width: size * 0.78, height: size * 0.78, borderRadius: "50%", opacity: clamp01(s) * (1 - ex), transform: `scale(${0.5 + 0.5 * s})`, background: `radial-gradient(circle at 32% 28%, #E9FDFF 0%, ${CYAN} 40%, #2A5BD8 100%)`, boxShadow: `0 0 50px ${rgba(CYAN, 0.6)}` }} />
              <span style={{ position: "absolute", left: -size * 0.5, top: size * 0.62, width: size * 0.46, height: size * 0.46, borderRadius: "50%", opacity: clamp01(s) * (1 - ex), transform: `scale(${0.5 + 0.5 * s})`, background: `radial-gradient(circle at 32% 28%, #FFD3B8 0%, ${CORAL} 45%, #C2366B 100%)` }} />
              <span
                style={{
                  position: "absolute",
                  inset: `${-0.1 * size}px ${-0.3 * size}px ${-0.12 * size}px`,
                  borderRadius: 999,
                  opacity: clamp01(s * 2) * (1 - ex),
                  transform: `scale(${0.4 + 0.6 * s}, ${0.75 + 0.25 * s})`,
                  background: "linear-gradient(170deg, rgba(255,255,255,0.24), rgba(255,255,255,0.08))",
                  backdropFilter: "blur(18px) saturate(170%)",
                  WebkitBackdropFilter: "blur(18px) saturate(170%)",
                  boxShadow: "0 30px 60px -20px rgba(10,5,40,0.55), inset 0 1px 0 rgba(255,255,255,0.5)",
                }}
              >
                <Rim r={999} angle={160} glow={0.6 * lift} />
                <GlintBand u={g.u} strength={g.s} r={999} />
              </span>
              <span style={{ position: "relative", display: "inline-block", transform: `scale(${1 + 0.06 * lift})` }}>
                <RiseWord word={{ ...k, accent: !k.serif }} size={size} weight={800} out={out} />
              </span>
            </span>
          ),
        )}
      </div>
      {sub && (
        <div style={{ marginTop: 56, fontFamily: SANS, fontWeight: 500, fontSize: 42, color: SOFT, textShadow: TEXT_SHADOW, opacity: ramp(t, subAt ?? k.t + 0.5, 0.5) * (1 - ex) }}>{sub}</div>
      )}
    </div>
  );
};

// ---------- quote ----------
export const QuoteCard: FC<{ quote: Word[]; name: string; role: string; initials: string; at?: number; out?: number; x?: number; y?: number; w?: number; h?: number }> = ({ quote, name, role, initials, at = 0, out, x = 300, y = 220, w = 1320, h = 600 }) => {
  const { t } = useTime();
  const last = quote[quote.length - 1]?.t ?? at;
  const by = ramp(t, last + 0.25, 0.5);
  const mark = sp(t, at + 0.15);
  return (
    <>
      <Sphere x={x + w - 50} y={y + h - 30} r={140} tone="rose" at={at} seed={7} />
      <Sphere x={x + 150} y={y - 10} r={80} tone="cyan" at={at + 0.1} seed={8} />
      <GlassCard x={x} y={y} w={w} h={h} at={at} out={out} r={40} glint={[last + 0.5]} pad="70px 90px 60px 90px">
        <div style={{ position: "absolute", left: 76, top: -30, fontFamily: SERIF, fontSize: 380, lineHeight: 1, transform: `scale(${mark}) rotate(${(1 - mark) * -20}deg)`, transformOrigin: "30% 60%", ...fillText(SERIF_FILL) }}>“</div>
        <div style={{ marginTop: 130 }}>
          <Words words={quote} size={62} weight={600} lh={1.2} out={out} />
        </div>
        <div style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: 24, opacity: by, transform: `translateY(${(1 - by) * 14}px)` }}>
          <div style={{ width: 76, height: 76, borderRadius: 38, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: SANS, fontWeight: 800, fontSize: 30, color: INK, background: `linear-gradient(140deg, ${CORAL}, #9B5CFF)`, boxShadow: "inset 0 1.5px 0 rgba(255,255,255,0.5), 0 0 0 3px rgba(255,255,255,0.25)" }}>{initials}</div>
          <div style={{ fontFamily: SANS }}>
            <div style={{ fontWeight: 700, fontSize: 36, color: INK }}>{name}</div>
            <div style={{ fontWeight: 500, fontSize: 30, color: SOFT }}>{role}</div>
          </div>
        </div>
      </GlassCard>
    </>
  );
};

// ---------- lower thirds ----------
// A source credit on a glass pill, bottom-left by default: icon tile, small caps kind, title and the address.
export const SourceLabel: FC<{ title: string; detail: string; kind?: string; icon?: IconName; at?: number; out?: number; x?: number; y?: number; w?: number }> = ({ title, detail, kind = "Source", icon = "book", at = 0, out, x = 96, y = H - 96 - 150, w = 760 }) => {
  const { t } = useTime();
  const slide = ramp(t, at, fr(22), OUT);
  return (
    <div style={{ position: "absolute", left: 0, top: 0, transform: `translateX(${(1 - slide) * -70}px)` }}>
      <GlassCard x={x} y={y} w={w} h={150} r={36} at={at} out={out} enter="frost" glint={[at + 0.5]} depth={4} pad="0 36px 0 24px" contentStyle={{ flexDirection: "row", alignItems: "center", gap: 26 }}>
        <IconTile name={icon} size={92} color={CYAN} p={ramp(t, at + 0.15, 0.6)} />
        <div style={{ fontFamily: SANS, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 28, color: CYAN, letterSpacing: "0.14em", textTransform: "uppercase" }}>{kind}</div>
          <div style={{ fontWeight: 700, fontSize: 38, color: INK, whiteSpace: "nowrap" }}>{title}</div>
          <div style={{ fontWeight: 500, fontSize: 28, color: MUTE, whiteSpace: "nowrap" }}>{detail}</div>
        </div>
      </GlassCard>
    </div>
  );
};

// A name lower third: a frosted bar with an accent spine, for who is speaking or what the beat is about.
export const FrostedCaption: FC<{ title: string; line: string; at?: number; out?: number; x?: number; y?: number; w?: number; tag?: ReactNode }> = ({ title, line, at = 0, out, x = 96, y = H - 96 - 170, w = 740, tag }) => {
  const { t } = useTime();
  const spine = ramp(t, at + 0.1, fr(16), OUT);
  return (
    <GlassCard x={x} y={y} w={w} h={170} r={30} at={at} out={out} enter="rise" glint={[at + 0.45]} depth={4} pad="28px 40px 28px 64px">
      <div style={{ position: "absolute", left: 30, top: 34, bottom: 34, width: 8, borderRadius: 4, background: `linear-gradient(${CYAN}, ${CORAL})`, transform: `scaleY(${spine})`, transformOrigin: "top", boxShadow: `0 0 16px ${rgba(CYAN, 0.6)}` }} />
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <span style={{ fontFamily: SANS, fontWeight: 800, fontSize: 52, color: INK, letterSpacing: "-0.02em" }}>{title}</span>
        {tag}
      </div>
      <div style={{ fontFamily: SANS, fontWeight: 500, fontSize: 34, color: SOFT, display: "flex", alignItems: "center", gap: 12 }}>
        <Icon name="mic" size={30} color={SOFT} />
        {line}
      </div>
    </GlassCard>
  );
};
