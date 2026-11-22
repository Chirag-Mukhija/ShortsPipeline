// Neo-brutalism composed scenes: the hero hook card, checklist, A-vs-B cards, quote card, bar chart, step flow and the illustration stage with a flat character and popping speech bubbles.
import type { FC } from "react";
import { Easing, interpolate, spring } from "remotion";
import { FPS, H, W } from "../../core/video";
import { BODY, BORDER, GREEN, INK, MONO, PAPER, PINK, SHADOW, SHOUT, TEAL, WHITE, YELLOW, border } from "./theme";
import { Box, BrutalCard, Chip, drop, fr, idle, jiggle, pop, punch, useF } from "./primitives";
import { StickerAt, StickerBurst, StickerSvg, type StickerShape } from "./stickers";
import { HighlightWord, LabelTag, PressButton, WinDots } from "./pieces";

const C = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// ---------- TitleCard ----------
export type TitleCardProps = { text: string; hitWord: string; at: number; times?: number[]; hitAt?: number; kicker?: string; sub?: string; button?: string; pressAt?: number; color?: string; stickers?: StickerShape[]; seed?: number };

// The hero hook: stickers pop around the frame edge, a kicker chip drops, the headline snaps in with its keyword in outlined accent type between two bursts, then a button gets pressed.
export const TitleCard: FC<TitleCardProps> = ({ text, hitWord, at, times, hitAt, kicker, sub, button, pressAt, color = GREEN, stickers = ["star", "blob", "spark", "star", "asterisk", "spark"], seed = 3 }) => {
  const f = useF();
  const lines = text.split("\n").length;
  const headTop = kicker ? 300 : 260;
  const headH = lines * 154;
  const subAt = (times?.[times.length - 1] ?? at + text.split(/\s+/).length * 0.12) + 0.2;
  const subP = pop(f, subAt, 6);
  return (
    <>
      <StickerBurst shapes={stickers} palette={[color]} seed={seed} count={9} at={at} />
      {kicker && (
        <div style={{ position: "absolute", left: 0, right: 0, top: 190, display: "flex", justifyContent: "center", transform: `translateY(${drop(f, at).y}px)`, opacity: drop(f, at).on ? 1 : 0 }}>
          <Chip text={kicker} bg={WHITE} size={30} shadow={5} />
        </div>
      )}
      <HighlightWord text={text} hitWord={hitWord} at={at + 0.15} times={times} hitAt={hitAt} color={color} mode="outline" size={132} y={headTop} flank="burst" />
      {sub && subP > 0 && (
        <div style={{ position: "absolute", left: 300, right: 300, top: headTop + headH + 44, textAlign: "center", fontFamily: BODY, fontWeight: 500, fontSize: 46, lineHeight: 1.3, color: INK, transform: `translateY(${(1 - subP) * 20}px)` }}>{sub}</div>
      )}
      {button && pressAt !== undefined && <PressButton label={button} pressAt={pressAt} at={subAt + 0.2} x={960} y={headTop + headH + (sub ? 230 : 120)} />}
    </>
  );
};

// ---------- Checklist ----------
export type CheckItem = { text: string; at: number; checkAt?: number };
export type ChecklistProps = { title: string; items: CheckItem[]; at: number; x?: number; y?: number; w?: number; color?: string; checkColor?: string; label?: string };

// A window-style card with a coloured header; rows slide in on their times, and each checkbox flips to green with a thick check drawn in 4 frames.
export const Checklist: FC<ChecklistProps> = ({ title, items, at, x = 460, y = 170, w = 1000, color = YELLOW, checkColor = GREEN, label }) => {
  const f = useF();
  const rowH = 118;
  return (
    <BrutalCard at={at} x={x} y={y} w={w} radius={12} style={{ overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: color, borderBottom: border(BORDER), padding: "22px 32px" }}>
        <div style={{ fontFamily: BODY, fontWeight: 800, fontSize: 48, letterSpacing: "-0.02em", color: INK }}>{title}</div>
        {label ? <Chip text={label} size={28} /> : <WinDots />}
      </div>
      {items.map((it, i) => {
        const d = f - fr(it.at);
        const slide = interpolate(d, [0, 6], [-40, 0], { ...C, easing: Easing.out(Easing.back(2)) });
        const cd = it.checkAt === undefined ? -1 : f - fr(it.checkAt);
        const checked = cd >= 0;
        const draw = Math.min(1, (cd + 1) / 4);
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 30, height: rowH, padding: "0 32px", borderTop: i ? border(3) : undefined, boxSizing: "border-box" }}>
            {d >= 0 && (
              <>
                <div style={{ transform: `translateX(${slide}px) rotate(${jiggle(f, (it.checkAt ?? 0) + 4 / FPS, 6, 4)}deg)`, flex: "none" }}>
                  <Box bg={checked ? checkColor : WHITE} shadow={checked ? 0 : 5} radius={8} style={{ width: 64, height: 64, transform: checked ? "translate(5px, 5px)" : undefined }}>
                    {checked && (
                      <svg width={56} height={56} viewBox="0 0 56 56" style={{ position: "absolute", inset: 0 }}>
                        <path d="M12 29 L24 41 L45 15" fill="none" stroke={INK} strokeWidth={9} strokeLinecap="square" strokeDasharray={60} strokeDashoffset={60 * (1 - draw)} />
                      </svg>
                    )}
                  </Box>
                </div>
                <div style={{ transform: `translateX(${slide}px)`, fontFamily: BODY, fontWeight: 700, fontSize: 46, letterSpacing: "-0.015em", color: INK }}>{it.text}</div>
              </>
            )}
          </div>
        );
      })}
    </BrutalCard>
  );
};

// ---------- Versus ----------
export type Side = { label: string; title: string; points?: string[]; color: string };
export type VersusProps = { left: Side; right: Side; at: { left: number; right: number; vs: number; win?: number }; winner?: "left" | "right"; winLabel?: string };

// Two cards drop side by side, a VS sunburst slams between them, and on `at.win` the loser squashes flat while the winner punches and gets a tag.
export const Versus: FC<VersusProps> = ({ left, right, at, winner, winLabel = "Winner!" }) => {
  const f = useF();
  const cardW = 680;
  const cardH = 500;
  const top = 300;
  const card = (s: Side, side: "left" | "right", t: number) => {
    const x = side === "left" ? 140 : W - 140 - cardW;
    const lose = winner && at.win !== undefined && winner !== side ? interpolate(f - fr(at.win), [0, 6], [0, 1], { ...C, easing: Easing.in(Easing.cubic) }) : 0;
    const won = winner === side && at.win !== undefined ? punch(f, at.win) : 1;
    return (
      <div style={{ position: "absolute", inset: 0, transform: `scale(${(1 - 0.08 * lose) * won})`, transformOrigin: `${x + cardW / 2}px ${top + cardH / 2}px` }}>
        <BrutalCard at={t} x={x} y={top} w={cardW} h={cardH} bg={lose >= 1 ? PAPER : s.color} shadowSize={SHADOW * 1.5 * (1 - lose)} rotate={side === "left" ? -1.5 : 1.5} style={{ padding: "40px 48px", display: "flex", flexDirection: "column", gap: 26 }}>
          <div><Chip text={s.label} size={28} /></div>
          <div style={{ fontFamily: SHOUT, fontSize: 92, lineHeight: 0.98, letterSpacing: "-0.02em", color: INK }}>{s.title}</div>
          {s.points?.map((p, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 20, fontFamily: BODY, fontWeight: 700, fontSize: 40, color: INK }}>
              <div style={{ width: 22, height: 22, background: INK, flex: "none" }} />
              {p}
            </div>
          ))}
        </BrutalCard>
      </div>
    );
  };
  const vs = pop(f, at.vs, 8);
  const winX = winner === "left" ? 140 + cardW - 60 : W - 140 - 40;
  return (
    <>
      {card(left, "left", at.left)}
      {card(right, "right", at.right)}
      {vs > 0 && (
        <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
          <g transform={`translate(960 ${top + cardH / 2}) rotate(${jiggle(f, at.vs + 8 / FPS, 6, 4) - 8}) scale(${0.4 + 0.6 * vs})`}>
            <g transform="translate(10 10)"><StickerSvg shape="burst" r={128} color={INK} /></g>
            <StickerSvg shape="burst" r={128} color={YELLOW} />
            <text x={0} y={30} textAnchor="middle" fontFamily={SHOUT} fontSize={86} fill={INK}>VS</text>
          </g>
        </svg>
      )}
      {winner && at.win !== undefined && <LabelTag text={winLabel} at={at.win + 0.1} x={winX} y={top - 40} rotate={8} bg={WHITE} tail={winner === "left" ? "left" : "right"} />}
    </>
  );
};

// ---------- QuoteCard ----------
export type QuoteCardProps = { quote: string; who: string; role?: string; at: number; hit?: string; hitAt?: number; color?: string };

// A big white card with an accent quote-mark block cropped over its corner; one phrase gets a marker block flipped on when it's said.
export const QuoteCard: FC<QuoteCardProps> = ({ quote, who, role, at, hit, hitAt, color = PINK }) => {
  const f = useF();
  const parts = hit && quote.includes(hit) ? quote.split(hit) : [quote];
  const hd = hitAt === undefined ? -1 : f - fr(hitAt);
  const flip = hd >= 0 ? Math.min(1, (hd + 1) / 4) : 0;
  const mark = pop(f, at + 0.2, 10);
  return (
    <>
      <BrutalCard at={at} x={260} y={190} w={1400} h={640} radius={14} shadowSize={14} style={{ padding: "110px 110px 70px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        <div style={{ fontFamily: BODY, fontWeight: 700, fontSize: 72, lineHeight: 1.18, letterSpacing: "-0.02em", color: INK }}>
          {parts[0]}
          {parts.length > 1 && (
            <span style={{ position: "relative", display: "inline-block", padding: "0 6px 0 10px", margin: "0 4px 0 -10px", isolation: "isolate" }}>
              {flip > 0 && <span style={{ position: "absolute", left: 0, right: 0, top: 6, bottom: 0, background: YELLOW, border: border(3), borderRadius: 6, transform: `scaleY(${flip}) rotate(-1deg)`, zIndex: -1 }} />}
              <span style={{ position: "relative" }}>{hit}</span>
            </span>
          )}
          {parts[1]}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 26 }}>
          <svg width={92} height={92} viewBox="-46 -46 92 92">
            <circle r={42} fill={color} stroke={INK} strokeWidth={4} />
            <circle cx={-13} cy={-6} r={5} fill={INK} />
            <circle cx={13} cy={-6} r={5} fill={INK} />
            <path d="M -14 12 Q 0 24 14 12" fill="none" stroke={INK} strokeWidth={4} strokeLinecap="round" />
          </svg>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ fontFamily: BODY, fontWeight: 800, fontSize: 42, color: INK }}>{who}</div>
            {role && <div style={{ fontFamily: MONO, fontSize: 28, color: INK }}>{role}</div>}
          </div>
        </div>
      </BrutalCard>
      {mark > 0 && (
        <div style={{ position: "absolute", left: 200, top: 120, transform: `rotate(-8deg) scale(${mark})` }}>
          <Box bg={color} shadow={8} radius={12} style={{ width: 170, height: 170, display: "flex", justifyContent: "center", overflow: "hidden" }}>
            <div style={{ fontFamily: SHOUT, fontSize: 260, lineHeight: 1.05, color: INK }}>“</div>
          </Box>
        </div>
      )}
    </>
  );
};

// ---------- BarChart ----------
export type Bar = { label: string; value: number; tag?: string };
export type BarChartProps = { bars: Bar[]; at: number; stagger?: number; highlight?: number; color?: string; max?: number; title?: string; x?: number; y?: number; w?: number; h?: number };

// Bordered bars spring up from a thick baseline one after another, each with a value chip; the highlighted bar is the only one in colour.
export const BarChart: FC<BarChartProps> = ({ bars, at, stagger = 0.18, highlight, color = PINK, max, title, x = 260, y = 230, w = 1400, h = 560 }) => {
  const f = useF();
  const top = max ?? Math.max(...bars.map((b) => b.value));
  const slot = w / bars.length;
  const bw = Math.min(220, slot * 0.6);
  const base = pop(f, at, 6);
  return (
    <>
      {title && base > 0 && <div style={{ position: "absolute", left: x, top: y - 130, fontFamily: BODY, fontWeight: 800, fontSize: 54, letterSpacing: "-0.02em", color: INK }}>{title}</div>}
      {bars.map((b, i) => {
        const t0 = at + 0.15 + i * stagger;
        const d = f - fr(t0);
        if (d < 0) return null;
        const g = spring({ frame: d, fps: FPS, config: { stiffness: 220, damping: 14 } });
        const bh = (b.value / top) * h;
        const cx = x + slot * (i + 0.5);
        const hi = i === highlight;
        const chip = pop(f, t0 + 0.3, 8);
        return (
          <div key={i}>
            <div style={{ position: "absolute", left: cx - bw / 2, top: y + h - bh, width: bw, height: bh, transform: `scaleY(${g})`, transformOrigin: "50% 100%" }}>
              <Box bg={hi ? color : WHITE} shadow={SHADOW} radius={6} style={{ width: "100%", height: "100%", borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }} />
            </div>
            {chip > 0 && (
              <div style={{ position: "absolute", left: cx, top: y + h - bh * g - 44, transform: `translate(-50%, -100%) scale(${chip})` }}>
                <Chip text={b.tag ?? String(b.value)} bg={hi ? YELLOW : WHITE} size={32} shadow={4} />
              </div>
            )}
            <div style={{ position: "absolute", left: cx - slot / 2, width: slot, top: y + h + 30, textAlign: "center", fontFamily: BODY, fontWeight: 700, fontSize: 38, color: INK }}>{b.label}</div>
          </div>
        );
      })}
      {base > 0 && <div style={{ position: "absolute", left: x - 30, top: y + h, width: (w + 60) * base, height: 8, background: INK }} />}
    </>
  );
};

// ---------- Flow ----------
export type FlowNode = { label: string; sub?: string; at: number; color?: string; icon?: StickerShape };
export type FlowProps = { nodes: FlowNode[]; y?: number; boxW?: number; boxH?: number };

// Step boxes drop in on their times, each joined to the last by a fat black arrow that shoots across in 2-frame steps.
export const Flow: FC<FlowProps> = ({ nodes, y = 380, boxW = 460, boxH = 320 }) => {
  const f = useF();
  const n = nodes.length;
  const gap = (W - 192 - n * boxW) / Math.max(1, n - 1);
  const xs = nodes.map((_, i) => 96 + i * (boxW + gap));
  const accents = [YELLOW, PINK, TEAL, GREEN];
  return (
    <>
      {nodes.slice(1).map((nd, i) => {
        const x1 = xs[i]! + boxW + 22;
        const x2 = xs[i + 1]! - 22;
        const d = f - fr(nd.at - 0.3);
        if (d < 0) return null;
        const grow = Math.min(1, Math.floor(d / 2) / 4);
        const len = (x2 - x1) * grow;
        return (
          <svg key={`a${i}`} width={W} height={H} style={{ position: "absolute", inset: 0 }}>
            <g transform={`translate(${x1} ${y + boxH / 2})`}>
              <rect x={0} y={-9} width={Math.max(0, len - 30)} height={18} fill={INK} />
              {grow > 0 && <path d={`M ${len - 34} -26 L ${len} 0 L ${len - 34} 26 Z`} fill={INK} />}
            </g>
          </svg>
        );
      })}
      {nodes.map((nd, i) => (
        <div key={i}>
          <BrutalCard at={nd.at} x={xs[i]!} y={y} w={boxW} h={boxH} bg={nd.color ?? accents[i % accents.length]} style={{ padding: "34px 34px", display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 10 }}>
            <div style={{ position: "absolute", left: 24, top: -26 }}><Chip text={`0${i + 1}`} size={30} shadow={4} /></div>
            <div style={{ fontFamily: SHOUT, fontSize: 66, lineHeight: 1, letterSpacing: "-0.02em", color: INK }}>{nd.label}</div>
            {nd.sub && <div style={{ fontFamily: MONO, fontSize: 32, lineHeight: 1.2, color: INK }}>{nd.sub}</div>}
          </BrutalCard>
          {nd.icon && (
            <svg width={W} height={H} style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
              <StickerAt at={nd.at + 0.25} item={{ shape: nd.icon, x: xs[i]! + boxW - 30, y: y + 26, r: 62, color: WHITE, rot: 12, seed: 40 + i }} />
            </svg>
          )}
        </div>
      ))}
    </>
  );
};

// ---------- IllustrationStage ----------
export type Bubble = { text: string; at: number; side: "left" | "right" };
export type StageProps = { at: number; bubbles?: Bubble[]; color?: string; shirt?: string; head?: string; tag?: { text: string; at: number }; cx?: number; cy?: number; r?: number };

const headPath = (() => {
  const pts = Array.from({ length: 90 }, (_, i) => {
    const a = (i / 90) * 2 * Math.PI;
    const r = 108 * (1 + 0.1 * Math.cos(2 * a + 0.6) + 0.07 * Math.cos(3 * a + 1.4) - 0.05 * Math.sin(a));
    return `${(r * Math.cos(a) * 0.86).toFixed(1)} ${(r * Math.sin(a)).toFixed(1)}`;
  });
  return `M ${pts.join(" L ")} Z`;
})();

// A flat character at a laptop inside a bordered circle; it bobs, blinks and types on stepped frames while speech bubbles pop in on their cue times.
export const IllustrationStage: FC<StageProps> = ({ at, bubbles = [], color = TEAL, shirt = YELLOW, head = PINK, tag, cx = 960, cy = 560, r = 330 }) => {
  const f = useF();
  const d = drop(f, at, -80);
  if (!d.on) return null;
  const id = idle(f, 4);
  const blink = f % 96 < 4;
  const typing = Math.floor(f / 4) % 2;
  const s = r / 300;
  let li = 0;
  let ri = 0;
  return (
    <>
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <clipPath id="nbp-stage-clip">
            <circle cx={0} cy={0} r={300} />
          </clipPath>
        </defs>
        <g transform={`translate(${cx} ${cy + d.y}) scale(${s * d.sx} ${s * d.sy})`}>
          <circle cx={14 * d.shadow} cy={14 * d.shadow} r={300} fill={INK} />
          <circle r={300} fill={color} />
          <g clipPath="url(#nbp-stage-clip)">
            <g transform={`translate(0 ${id.bob * 0.6})`}>
              <path d="M -190 330 L -165 170 Q -150 105 -80 100 L 80 100 Q 150 105 165 170 L 190 330 Z" fill={shirt} stroke={INK} strokeWidth={5} strokeLinejoin="round" />
              <g transform={`translate(0 ${id.bob * 0.5 - 40})`}>
                <path d={headPath} fill={head} stroke={INK} strokeWidth={5} strokeLinejoin="round" />
                <ellipse cx={-34} cy={-18} rx={10} ry={blink ? 2 : 15} fill={INK} />
                <ellipse cx={34} cy={-18} rx={10} ry={blink ? 2 : 15} fill={INK} />
                <path d="M -24 30 Q 0 52 24 30" fill="none" stroke={INK} strokeWidth={6} strokeLinecap="round" />
              </g>
              <g transform="translate(0 196) rotate(-4)">
                <rect x={-150} y={-70} width={300} height={170} rx={10} fill={WHITE} stroke={INK} strokeWidth={5} />
                <g transform="translate(0 15) scale(0.9)"><StickerSvg shape="spark" r={40} color={GREEN} /></g>
              </g>
              <circle cx={-150} cy={130 + (typing ? -6 : 2)} r={26} fill={head} stroke={INK} strokeWidth={5} />
              <circle cx={150} cy={130 + (typing ? 2 : -6)} r={26} fill={head} stroke={INK} strokeWidth={5} />
            </g>
          </g>
          <circle r={300} fill="none" stroke={INK} strokeWidth={5} />
        </g>
      </svg>
      {bubbles.map((b, i) => {
        const k = b.side === "left" ? li++ : ri++;
        const p = pop(f, b.at);
        if (p <= 0) return null;
        const by = cy - 190 + k * 230;
        const left = b.side === "left";
        return (
          <div key={i} style={{ position: "absolute", top: by, left: left ? undefined : cx + r - 40, right: left ? W - (cx - r + 40) : undefined, transform: `scale(${p}) rotate(${left ? -3 : 3}deg)`, transformOrigin: left ? "100% 100%" : "0% 100%" }}>
            <Box bg={WHITE} shadow={6} radius={14} style={{ padding: "20px 30px", fontFamily: BODY, fontWeight: 700, fontSize: 40, lineHeight: 1.15, color: INK, whiteSpace: "nowrap" }}>
              {b.text}
              <svg width={60} height={50} viewBox="0 0 60 50" style={{ position: "absolute", top: "100%", marginTop: -BORDER, [left ? "right" : "left"]: 30, overflow: "visible" }}>
                <path d={left ? "M 10 0 L 54 40 L 40 0 Z" : "M 50 0 L 6 40 L 20 0 Z"} fill={WHITE} />
                <path d={left ? "M 10 0 L 54 40 L 40 0" : "M 50 0 L 6 40 L 20 0"} fill="none" stroke={INK} strokeWidth={4} strokeLinejoin="round" />
              </svg>
            </Box>
          </div>
        );
      })}
      {tag && <LabelTag text={tag.text} at={tag.at} x={cx + r * 0.62} y={cy - r * 0.95} rotate={7} tail="bolt" />}
    </>
  );
};
