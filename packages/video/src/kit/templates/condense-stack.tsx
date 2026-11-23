// Condense stack: a pile of pages deals in and fans out, a scan line highlights what matters, then on a spoken word the whole pile is crushed into one glowing bar that unfolds into a summary card whose takeaways land on their words.
import type { FC } from "react";
import { AbsoluteFill, Easing, interpolate } from "remotion";
import { z } from "zod";
import { type Cue, defineTemplate, type Style } from "../contract";
import { clamp01, cueAt, enter, useT } from "../motion";

const pointSchema = z.object({
  text: z.string().min(1).max(36).describe("One takeaway, sentence case, ≤ 36 characters"),
  word: z.string().optional().describe("Spoken word this takeaway lands on"),
});

const schema = z.object({
  source: z.string().min(1).max(32).describe("What gets condensed, shown big over the pile and then as a small line above the card, ≤ 32 characters (e.g. 'A two-hour cooking class', '40 pages of notes')"),
  sourceWord: z.string().optional().describe("Spoken word the source line lands on; default right at the start"),
  condenseWord: z.string().optional().describe("Spoken word the pile is crushed on ('short', 'boils down', 'basically')"),
  kicker: z.string().max(24).optional().describe("Small accent label at the top of the card, ≤ 24 characters (e.g. 'The short version')"),
  title: z.string().min(1).max(40).describe("The card's headline, ≤ 40 characters"),
  points: z.array(pointSchema).max(4).default([]).describe("0–4 takeaways that land one by one on the card, numbered. Give each ~0.8 s or more"),
});

type Props = z.infer<typeof schema>;

const mix = (c: string, pct: number, base = "transparent") => `color-mix(in srgb, ${c} ${Math.round(clamp01(pct / 100) * 1000) / 10}%, ${base})`;
const lin = (v: number) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const lum = (c: string) => {
  const m = /^#([0-9a-f]{6})$/i.exec(c.trim());
  if (!m) return 0.5;
  const n = parseInt(m[1]!, 16);
  return 0.2126 * lin(((n >> 16) & 255) / 255) + 0.7152 * lin(((n >> 8) & 255) / 255) + 0.0722 * lin((n & 255) / 255);
};
const contrast = (a: string, b: string) => {
  const [x, y] = [lum(a), lum(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};
const onColor = (fill: string, s: Style) => (contrast(fill, s.bg) >= contrast(fill, s.ink) ? s.bg : s.ink);
const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};
const range = (t: number, a: number, b: number, ease = Easing.inOut(Easing.cubic)) => (b <= a ? (t >= b ? 1 : 0) : interpolate(t, [a, b], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease }));

// A rectangle's outline as jittered points, so the hand style boils the line (never the frame).
const boilRect = (w: number, h: number, t: number, amp: number, seed: number) => {
  const N = 40;
  const tick = Math.floor(t * 8);
  const per = 2 * (w + h);
  const pts: string[] = [];
  for (let i = 0; i < N; i++) {
    let d = (i / N) * per;
    let x: number;
    let y: number;
    if (d < w) [x, y] = [d, 0];
    else if ((d -= w) < h) [x, y] = [w, d];
    else if ((d -= h) < w) [x, y] = [w - d, h];
    else [x, y] = [0, h - (d - w)];
    pts.push(`${(x + (hash(i * 7.1 + tick * 13.7 + seed) - 0.5) * amp).toFixed(1)},${(y + (hash(i * 3.3 + tick * 5.9 + seed + 50) - 0.5) * amp).toFixed(1)}`);
  }
  return `M${pts.join(" L")} Z`;
};

const CondenseStack: FC<{ props: Props; style: Style; W: number; H: number; duration: number; cues: Cue[] }> = ({ props, style, W, H, duration, cues }) => {
  const { t, frame, fps } = useT();
  const u = H / 1080;
  const split = W < 1400;
  const hand = style.motion === "hand";
  const light = lum(style.bg) > 0.5;
  const k = hand ? 0.46 : 0.55;
  const zf = hand ? 1.12 : 1;
  const points = props.points ?? [];
  const np = points.length;

  // ---- Timing: source line, fan-out, scan, crush on the condense word, card unfold, then one takeaway per word; settled 0.6 s before the end.
  const sourceAt = cueAt(cues, props.sourceWord, 0.35) - 0.1;
  const FAN_END = 1.35;
  const cMax = duration - (1.6 + 0.55 * np + 0.6);
  const C = Math.max(1.5, Math.min(cMax, cueAt(cues, props.condenseWord, Math.max(2, duration * 0.32)) - 0.1));
  const pEnd = duration - 1.2;
  const pStart = C + 1.4;
  const P: number[] = [];
  points.forEach((p, j) => {
    const fb = np === 1 ? pStart : pStart + (j * (pEnd - pStart)) / (np - 1);
    const want = cueAt(cues, p.word, fb + 0.1) - 0.1;
    const lo = j === 0 ? C + 1.15 : P[j - 1]! + 0.5;
    const hi = pEnd - (np - 1 - j) * 0.5;
    P.push(Math.max(lo, Math.min(hi, want)));
  });
  const IMPACT = C + 0.3;

  // ---- The pile.
  const n = split ? 5 : 7;
  const sheetH = (split ? 500 : 560) * u;
  const sheetW = sheetH * 0.74;
  const spread = split ? Math.min(W * 0.22, 210 * u) : 330 * u;
  const cx = W / 2;
  const cy = H * 0.585;
  const barH = 16 * u;
  const PAD = 34 * u;
  const LINE0 = 96 * u;
  const LSTEP = 34 * u;
  const nLines = Math.floor((sheetH - LINE0 - 40 * u) / LSTEP);
  const pile = Array.from({ length: n }, (_, i) => {
    const kk = n > 1 ? (i - (n - 1) / 2) / ((n - 1) / 2) : 0;
    const lines = Array.from({ length: nLines }, (_, l) => {
      const endOfPara = hash(i * 31 + l * 7) < 0.18;
      return endOfPara ? 0.3 + 0.3 * hash(i * 13 + l) : 0.78 + 0.2 * hash(i * 17 + l * 3);
    });
    const m1 = 1 + Math.floor(hash(i * 9.3 + 2) * (nLines - 3));
    const m2 = Math.min(nLines - 1, m1 + 2 + Math.floor(hash(i * 4.1 + 8) * 4));
    return { kk, lines, marks: i % 2 === 0 ? [m1, m2] : [m1] };
  });

  const deck = enter(style, frame, fps, 0.05, 0.65);
  const antic = range(t, C - 0.42, C - 0.12, Easing.out(Easing.cubic));
  const spreadMul = 1 + 0.07 * antic;
  const stackTop = cy - sheetH / 2;
  const scanA = FAN_END;
  const scanB = C - 0.5;
  const scanning = scanB - scanA >= 0.6;
  const beamY = stackTop + (sheetH + 20 * u) * range(t, scanA, scanB, Easing.inOut(Easing.sin));
  const beamA = scanning ? range(t, scanA - 0.2, scanA + 0.1) * (1 - range(t, scanB - 0.15, scanB + 0.15)) : 0;
  const markAt = (line: number, i: number) => {
    const y = stackTop + LINE0 + line * LSTEP;
    return scanning ? scanA + ((y - stackTop) / (sheetH + 20 * u)) * (scanB - scanA) : FAN_END - 0.2 + i * 0.05;
  };

  // ---- Camera: push in while the pile tenses and crushes, pull back as the card opens (every push has a back).
  const cam = 1 + 0.13 * range(t, C - 0.45, C + 0.28, Easing.inOut(Easing.sin)) - 0.13 * range(t, C + 0.38, C + 1.25, Easing.out(Easing.cubic));

  // ---- The card, laid out at its final size.
  const cardW = split ? W - 110 * u : Math.min(1180 * u, W * 0.6);
  const pad = (split ? 50 : 60) * u;
  const inner = cardW - 2 * pad;
  const kickFs = 30 * u * zf;
  const titleFs = (split ? 54 : 66) * u * zf;
  const titleLines = Math.min(2, Math.max(1, Math.ceil((props.title.length * titleFs * k) / inner)));
  const ptFs = (split ? 40 : 44) * u * zf;
  const CHIP = 56 * u;
  const CGAP = 24 * u;
  const rows = points.map((p) => {
    const lines = Math.min(2, Math.max(1, Math.ceil((p.text.length * ptFs * k) / (inner - CHIP - CGAP))));
    return Math.max(CHIP, lines * ptFs * 1.2);
  });
  const ROWGAP = 22 * u;
  const kickH = props.kicker ? kickFs * 1.3 + 16 * u : 0;
  const titleH = titleLines * titleFs * 1.1;
  const listTop = pad + kickH + titleH + 36 * u;
  const cardH = pad + kickH + titleH + (np ? 36 * u + rows.reduce((a, r) => a + r, 0) + (np - 1) * ROWGAP : 0) + pad;

  // Source line: big over the pile, then shrinks into a muted line above the card.
  const srcFs0 = Math.min((split ? 64 : 84) * u * zf, (W - 160 * u) / Math.max(1, props.source.length * k));
  const srcFs1 = Math.max(31 * u, Math.min(38 * u * zf, srcFs0 * 0.5));
  const srcScale1 = srcFs1 / srcFs0;
  const srcH1 = srcFs1 * 1.25;
  const group = srcH1 + 28 * u + cardH;
  const groupTop = Math.max(30 * u, (H - group) / 2);
  const cardTop = groupTop + srcH1 + 28 * u;
  const cardCy = cardTop + cardH / 2;
  const move = enter({ ...style, motion: "calm" }, frame, fps, C + 0.35, 0.8);
  const srcTop = 78 * u + (groupTop - 78 * u) * move;
  const srcScale = 1 + (srcScale1 - 1) * move;

  const wP = enter(style, frame, fps, IMPACT, 0.55);
  const hP = enter(style, frame, fps, IMPACT + 0.16, 0.75);
  const cw = sheetW + (cardW - sheetW) * wP;
  const ch = Math.max(barH, barH + (cardH - barH) * hP);
  const ccy = cy + (cardCy - cy) * hP;
  const cardFill = mix(style.accent, (1 - clamp01(hP * 1.8)) * 100, style.surface);
  const contentIn = range(t, C + 0.72, C + 1.0);
  const showCard = t >= IMPACT;
  const sheetLine = mix(style.ink, light ? 13 : 18);
  const shadowA = light ? 0.16 : 0.5;
  const accentOn = onColor(style.accent, style);

  // Impact: two streaks shoot from the bar's ends and a ring of dashes bursts outward (local, never the whole frame).
  const iu = (t - IMPACT) / 0.55;
  const burst = iu >= 0 && iu <= 1 ? Easing.out(Easing.cubic)(iu) : -1;

  const words = props.source.split(" ");
  const kickA = enter(style, frame, fps, C + 0.75, 0.5);
  const titleA = enter(style, frame, fps, C + 0.85, 0.7);

  return (
    <AbsoluteFill style={{ background: style.bg, overflow: "hidden" }}>
      {/* Surface: a lamp from above on the pile, faint ruled lines like a desk pad, and a bloom that wakes on the crush (its trigger). */}
      <AbsoluteFill style={{ background: `radial-gradient(70% 75% at 50% 52%, ${style.surface} 0%, transparent 70%)`, opacity: light ? 0.95 : 0.55 }} />
      <AbsoluteFill
        style={{
          backgroundImage: `repeating-linear-gradient(to bottom, transparent 0 ${58 * u}px, ${mix(style.ink, light ? 5 : 6)} ${58 * u}px ${60 * u}px)`,
          maskImage: "radial-gradient(ellipse at center, black 20%, transparent 75%)",
        }}
      />
      {[0, 1].map((b) => (
        <div
          key={b}
          style={{
            position: "absolute",
            left: cx - 560 * u + (b ? 260 : -260) * u + Math.sin(t * 0.6 + b * 2) * 50 * u,
            top: cy - 560 * u + Math.cos(t * 0.5 + b) * 40 * u,
            width: 1120 * u,
            height: 1120 * u,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${b ? style.accent2 : style.accent} 0%, transparent 62%)`,
            opacity: (light ? 0.07 : 0.09) + 0.08 * range(t, C - 0.1, IMPACT + 0.2) * (b ? 0.5 : 1),
          }}
        />
      ))}

      {/* Camera rig. */}
      <AbsoluteFill style={{ transform: `scale(${cam})`, transformOrigin: `${cx}px ${cy}px` }}>
        {/* Contact shadow under the pile. */}
        {!showCard ? (
          <div style={{ position: "absolute", left: cx - (spread + sheetW) * 0.8, top: cy + sheetH / 2 - 40 * u, width: (spread + sheetW) * 1.6, height: 90 * u, borderRadius: "50%", background: `radial-gradient(ellipse, rgba(0,0,0,${shadowA}) 0%, transparent 70%)`, opacity: clamp01(deck) * (1 - range(t, C - 0.1, IMPACT)) }} />
        ) : null}

        {!showCard
          ? pile.map((s, i) => {
              const a = Math.abs(s.kk);
              const fan = enter(style, frame, fps, 0.5 + 0.06 * a, 0.75);
              const q = range(t, C - 0.12 + 0.05 * (1 - a), IMPACT, Easing.in(Easing.cubic));
              const x = cx + s.kk * spread * fan * spreadMul * (1 - q) + (i - (n - 1) / 2) * 4 * u * (1 - fan);
              const y = cy + (1 - deck) * 640 * u + s.kk * s.kk * 38 * u * fan * (1 - q) - 18 * u * antic * (1 - q) - i * 3 * u * (1 - fan);
              const rot = (s.kk * 12 * fan + (1 - deck) * (s.kk * 4 - 6)) * (1 - q);
              const sy = 1 - q * (1 - barH / sheetH);
              return (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    left: x - sheetW / 2,
                    top: y - sheetH / 2,
                    width: sheetW,
                    height: sheetH,
                    transform: `rotate(${rot}deg) scale(${1 + 0.02 * antic * (1 - q)}, ${sy})`,
                    transformOrigin: "50% 50%",
                    background: style.surface,
                    borderRadius: Math.min(style.radius, 14) * u,
                    overflow: "hidden",
                    opacity: clamp01(deck * 2.5),
                    boxShadow: hand ? undefined : `0 ${14 * u}px ${36 * u}px rgba(0,0,0,${shadowA * 0.9}), 0 0 0 ${1.5 * u}px ${mix(style.ink, light ? 8 : 14)}`,
                  }}
                >
                  <div style={{ position: "absolute", left: PAD, top: 44 * u, width: sheetW * 0.5, height: 18 * u, borderRadius: 9 * u, background: mix(style.ink, light ? 26 : 32) }} />
                  {s.lines.map((w, l) => {
                    const mk = s.marks.includes(l);
                    const mp = mk ? range(t, markAt(l, i), markAt(l, i) + 0.3, Easing.out(Easing.cubic)) : 0;
                    const lw = (sheetW - 2 * PAD) * w;
                    return (
                      <div key={l} style={{ position: "absolute", left: PAD, top: LINE0 + l * LSTEP, width: lw, height: 10 * u }}>
                        {mk ? <div style={{ position: "absolute", left: -6 * u, top: -7 * u, width: (lw + 12 * u) * mp, height: 24 * u, borderRadius: 5 * u, background: mix(style.accent, 55), transform: hand ? "rotate(-1.2deg)" : undefined }} /> : null}
                        <div style={{ position: "absolute", inset: 0, borderRadius: 5 * u, background: mk && mp > 0.5 ? mix(style.ink, 55) : sheetLine }} />
                      </div>
                    );
                  })}
                  {hand ? (
                    <svg width={sheetW} height={sheetH} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
                      <path d={boilRect(sheetW, sheetH, t, 3 * u, i * 11)} fill="none" stroke={style.ink} strokeWidth={3 * u} strokeLinejoin="round" />
                    </svg>
                  ) : null}
                  {/* Heat: the sheet glows to the accent as it is crushed. */}
                  <div style={{ position: "absolute", inset: 0, background: style.accent, opacity: q }} />
                </div>
              );
            })
          : null}

        {/* Scan line: reads the pile top to bottom and highlights what matters as it passes. */}
        {beamA > 0.001 ? (
          <div style={{ position: "absolute", left: cx - spread - sheetW * 0.62, top: beamY - 60 * u, width: (spread + sheetW * 0.62) * 2, height: 64 * u, opacity: beamA }}>
            <div style={{ position: "absolute", inset: 0, background: `linear-gradient(to bottom, transparent, ${mix(style.accent, 20)})` }} />
            <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 5 * u, borderRadius: 3 * u, background: `linear-gradient(to right, transparent, ${style.accent} 12%, ${style.accent} 88%, transparent)` }} />
          </div>
        ) : null}

        {burst >= 0 ? (
          <svg width={W} height={H} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
            {[-1, 1].map((d) => (
              <line key={d} x1={cx + d * (sheetW / 2 + 20 * u + 60 * u * burst)} x2={cx + d * (sheetW / 2 + 20 * u + 360 * u * burst)} y1={cy} y2={cy} stroke={style.accent} strokeWidth={6 * u * (1 - iu)} strokeLinecap="round" opacity={1 - iu} />
            ))}
            {Array.from({ length: 10 }, (_, j) => {
              const ang = (j / 10) * Math.PI * 2 + hash(j + 3) * 0.4;
              const r0 = sheetW * 0.45 + 80 * u * burst;
              const r1 = r0 + 46 * u * (1 - iu);
              return <line key={j} x1={cx + Math.cos(ang) * r0} y1={cy + Math.sin(ang) * r0 * 0.55} x2={cx + Math.cos(ang) * r1} y2={cy + Math.sin(ang) * r1 * 0.55} stroke={j % 3 ? style.accent : style.accent2} strokeWidth={5 * u} strokeLinecap="round" opacity={1 - iu} />;
            })}
          </svg>
        ) : null}

        {showCard ? (
          <div
            style={{
              position: "absolute",
              left: cx - cw / 2,
              top: ccy - ch / 2,
              width: cw,
              height: ch,
              borderRadius: Math.min(ch / 2, style.radius * 1.3 * u),
              background: cardFill,
              overflow: "hidden",
              boxShadow: hand ? undefined : `0 ${22 * u}px ${60 * u}px rgba(0,0,0,${shadowA}), 0 0 0 ${1.5 * u}px ${mix(style.ink, light ? 8 : 14)}`,
            }}
          >
            {/* Content keeps its final layout and is revealed by the opening card, so nothing reflows mid-unfold. */}
            <div style={{ position: "absolute", left: (cw - cardW) / 2, top: (ch - cardH) / 2, width: cardW, height: cardH, opacity: contentIn }}>
              {props.kicker ? (
                <div style={{ position: "absolute", left: pad, top: pad, display: "flex", alignItems: "center", gap: 14 * u, opacity: clamp01(kickA), transform: `translateX(${(1 - kickA) * -24 * u}px)` }}>
                  <div style={{ width: 14 * u, height: 14 * u, borderRadius: style.radius >= 8 ? "50%" : 2 * u, background: style.accent }} />
                  <span style={{ fontFamily: hand ? style.display : style.body, fontWeight: 700, fontSize: kickFs, lineHeight: 1.3, color: style.accent, letterSpacing: hand ? 0 : "0.02em", whiteSpace: "nowrap" }}>{props.kicker}</span>
                </div>
              ) : null}
              <div style={{ position: "absolute", left: pad, top: pad + kickH, width: inner, overflow: "hidden", paddingBottom: 6 * u }}>
                <div style={{ fontFamily: style.display, fontWeight: 700, fontSize: titleFs, lineHeight: 1.1, color: style.ink, letterSpacing: hand ? 0 : "-0.022em", textWrap: "balance", transform: `translateY(${(1 - Math.min(1, titleA)) * 105}%)` }}>{props.title}</div>
              </div>
              {np ? <div style={{ position: "absolute", left: pad, top: listTop - 20 * u, width: inner * range(t, C + 1.0, C + 1.5, Easing.out(Easing.cubic)), height: 2 * u, background: mix(style.ink, hand ? 40 : 12) }} /> : null}
              {points.map((p, j) => {
                const top = listTop + rows.slice(0, j).reduce((a, r) => a + r, 0) + j * ROWGAP;
                const chip = enter(style, frame, fps, P[j]!, 0.45);
                const txt = enter(style, frame, fps, P[j]! + 0.06, 0.6);
                const dim = j < np - 1 ? range(t, P[j + 1]!, P[j + 1]! + 0.35) : 0;
                return (
                  <div key={j} style={{ position: "absolute", left: pad, top, width: inner, height: rows[j], display: "flex", alignItems: "center", gap: CGAP }}>
                    <div style={{ width: CHIP, height: CHIP, flexShrink: 0, borderRadius: Math.min(style.radius, 14) * u, background: style.accent, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${chip})`, opacity: clamp01(chip * 3) }}>
                      <span style={{ fontFamily: style.mono, fontWeight: 600, fontSize: 30 * u, color: accentOn }}>{j + 1}</span>
                    </div>
                    <div style={{ overflow: "hidden", flex: 1, padding: `${4 * u}px 0` }}>
                      <div style={{ fontFamily: hand ? style.display : style.body, fontWeight: hand ? 700 : 600, fontSize: ptFs, lineHeight: 1.2, color: mix(style.ink, 100 - 28 * dim, style.surface), letterSpacing: hand ? 0 : "-0.01em", transform: `translateY(${(1 - Math.min(1, txt)) * 110}%)` }}>{p.text}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            {hand && hP > 0.3 ? (
              <svg width={cw} height={ch} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
                <path d={boilRect(cw, ch, t, 3.5 * u, 99)} fill="none" stroke={style.ink} strokeWidth={3.5 * u} strokeLinejoin="round" opacity={clamp01((hP - 0.3) * 3)} />
              </svg>
            ) : null}
          </div>
        ) : null}
      </AbsoluteFill>

      {/* HUD: the source line never zooms. */}
      <div style={{ position: "absolute", left: 0, right: 0, top: srcTop, display: "flex", justifyContent: "center", transform: `scale(${srcScale})`, transformOrigin: "50% 0" }}>
        <div style={{ fontFamily: style.display, fontWeight: 700, fontSize: srcFs0, lineHeight: 1.1, color: mix(style.ink, 100 - 45 * move, style.muted), letterSpacing: hand ? 0 : "-0.025em", whiteSpace: "nowrap" }}>
          {words.map((w, j) => {
            const a = enter(style, frame, fps, sourceAt + j * 0.08, 0.7);
            return (
              <span key={j} style={{ display: "inline-block", overflow: "hidden", verticalAlign: "top", padding: "0.16em 0.08em 0.14em", margin: `-0.16em ${j < words.length - 1 ? 0.2 : -0.08}em -0.14em -0.08em` }}>
                <span style={{ display: "inline-block", transform: `translateY(${(1 - Math.min(1, a)) * 105}%)` }}>{w}</span>
              </span>
            );
          })}
        </div>
      </div>

      <AbsoluteFill style={{ background: `radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,${light ? 0.12 : 0.42}) 100%)`, pointerEvents: "none" }} />
    </AbsoluteFill>
  );
};

export default defineTemplate({
  id: "condense-stack",
  title: "Condense stack",
  mode: "graphic",
  layouts: ["full", "split"],
  useFor:
    "Turning something long into its essence: a pile of pages deals in and fans out under a big source line ('A two-hour cooking class', '40 pages of notes', 'Every review I read'), a scan line reads it and highlights lines, then on the condense word the pile is crushed into one glowing bar that bursts open into a summary card. The source line shrinks above the card, a kicker and title land, and 0–4 numbered takeaways arrive on their words. Good for 'the short version', book or course summaries, 'what I learned from…', meeting recaps, a product that summarises things, and music-only recap beats. As a split panel it sits beside face cam. No media.",
  avoid:
    "Takeaways that need explaining at length (follow with list-tick or a graphic per point), more than 4 points, segments under ~5 s (the pile needs ~1.5 s before the crush), using it twice in a video, and real book covers, documents or brand screens (the pages are abstract on purpose).",
  schema,
  example: {
    source: "A two-hour cooking class",
    sourceWord: "two",
    condenseWord: "short",
    kicker: "The short version",
    title: "Three habits worth keeping",
    points: [
      { text: "Salt the pasta water well", word: "salt" },
      { text: "Rest meat before you slice it", word: "rest" },
      { text: "Taste as you go", word: "taste" },
    ],
  },
  exampleMedia: [],
  exampleCues: [
    { at: 0.2, end: 0.35, word: "I" },
    { at: 0.35, end: 0.6, word: "took" },
    { at: 0.6, end: 0.7, word: "a" },
    { at: 0.7, end: 0.95, word: "two" },
    { at: 0.95, end: 1.2, word: "hour" },
    { at: 1.2, end: 1.55, word: "cooking" },
    { at: 1.55, end: 1.95, word: "class" },
    { at: 2.5, end: 2.7, word: "here's" },
    { at: 2.7, end: 2.85, word: "the" },
    { at: 2.85, end: 3.3, word: "short" },
    { at: 3.3, end: 3.7, word: "version" },
    { at: 4.6, end: 4.95, word: "salt" },
    { at: 4.95, end: 5.1, word: "the" },
    { at: 5.1, end: 5.5, word: "water" },
    { at: 6.2, end: 6.55, word: "rest" },
    { at: 6.55, end: 6.7, word: "the" },
    { at: 6.7, end: 7.0, word: "meat" },
    { at: 7.8, end: 8.2, word: "taste" },
    { at: 8.2, end: 8.35, word: "as" },
    { at: 8.35, end: 8.5, word: "you" },
    { at: 8.5, end: 8.8, word: "go" },
  ],
  seconds: { min: 5, max: 14, demo: 10 },
  mediaSlots: 0,
  credit: { name: "'Distilbook product video' (prompt-motion.com)", url: "https://prompt-motion.com/ajith-io-c52e09" },
  status: "draft",
  Component: ({ props, style, width, height, duration, cues }) => <CondenseStack props={props} style={style} W={width} H={height} duration={duration} cues={cues} />,
});
