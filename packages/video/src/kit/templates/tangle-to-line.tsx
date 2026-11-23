// Tangle to line: a mini explainer carried by one line. The problem is a tangled knot; on the fix word it is pulled taut into a straight path whose 2–4 stations light up as the steps are spoken, ending in a proof tag that slams on and a sign-off line.
import type { FC } from "react";
import { AbsoluteFill, Easing, interpolate } from "remotion";
import { z } from "zod";
import { type Cue, defineTemplate, type Style } from "../contract";
import { clamp01, cueAt, enter, useT } from "../motion";

const stepSchema = z.object({
  text: z.string().min(1).max(22).describe("One step, a few words, ≤ 22 characters"),
  word: z.string().optional().describe("Spoken word this step lights up on"),
});

const schema = z.object({
  problem: z.string().min(1).max(40).describe("The problem headline shown over the tangle, ≤ 40 characters (e.g. 'Your bike has sat broken for months')"),
  problemWord: z.string().optional().describe("Spoken word the problem line lands on; default right at the start"),
  fixWord: z.string().optional().describe("Spoken word the tangle is pulled straight on ('fix', 'so', 'instead')"),
  solution: z.string().min(1).max(40).describe("What fixes it, replaces the problem headline once the line is straight, ≤ 40 characters"),
  steps: z.array(stepSchema).min(2).max(4).describe("2–4 steps that light up along the straight line, in order. Give each ~1 s or more"),
  proof: z
    .object({
      value: z.string().min(1).max(6).describe("The proof figure, ≤ 6 characters ('1,200', '4.9★', '3x')"),
      label: z.string().min(1).max(24).describe("What the figure means, ≤ 24 characters"),
      word: z.string().optional().describe("Spoken word the tag slams on"),
    })
    .optional()
    .describe("One proof point: a tag that slams onto the end of the line"),
  signoff: z.string().max(28).optional().describe("Closing line that replaces the headline at the end, e.g. a name or a promise, ≤ 28 characters"),
  signoffWord: z.string().optional().describe("Spoken word the sign-off lands on"),
});

type Props = z.infer<typeof schema>;
type Pt = [number, number];

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
const lerp = (a: Pt, b: Pt, k: number): Pt => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];

// A headline that rises in word by word and leaves fast upward.
const Headline: FC<{ text: string; inAt: number; outAt?: number; fs: number; wrap: boolean; style: Style; underline?: number; u: number }> = ({ text, inAt, outAt, fs, wrap, style, underline, u }) => {
  const { t, frame, fps } = useT();
  if (t < inAt - 0.05 || (outAt !== undefined && t > outAt + 0.4)) return null;
  const out = outAt === undefined ? 0 : range(t, outAt, outAt + 0.32, Easing.in(Easing.cubic));
  const words = text.split(" ");
  const hand = style.motion === "hand";
  return (
    <div style={{ position: "relative", display: "inline-block", maxWidth: "100%", opacity: 1 - out, transform: `translateY(${-50 * u * out}px)` }}>
      <div style={{ fontFamily: style.display, fontWeight: 700, fontSize: fs, lineHeight: 1.15, color: style.ink, letterSpacing: hand ? 0 : "-0.025em", whiteSpace: wrap ? "normal" : "nowrap", textWrap: "balance", textAlign: "center" }}>
        {words.map((w, j) => {
          const a = enter(style, frame, fps, inAt + j * 0.08, 0.7);
          return (
            <span key={j} style={{ display: "inline-block", overflow: "hidden", verticalAlign: "top", padding: "0.12em 0.08em 0.16em", margin: `-0.12em ${j < words.length - 1 ? 0.2 : -0.08}em -0.16em -0.08em` }}>
              <span style={{ display: "inline-block", transform: `translateY(${(1 - Math.min(1, a)) * 108}%)` }}>{w}</span>
            </span>
          );
        })}
      </div>
      {underline !== undefined ? (
        <div style={{ position: "absolute", left: 0, right: 0, bottom: -6 * u, height: 10 * u, borderRadius: 5 * u, background: style.accent, transform: `scaleX(${underline}) ${hand ? "rotate(-0.8deg)" : ""}`, transformOrigin: "0 50%" }} />
      ) : null}
    </div>
  );
};

const TangleToLine: FC<{ props: Props; style: Style; W: number; H: number; duration: number; cues: Cue[] }> = ({ props, style, W, H, duration: D, cues }) => {
  const { t, frame, fps } = useT();
  const u = H / 1080;
  const split = W < 1400;
  const hand = style.motion === "hand";
  const light = lum(style.bg) > 0.5;
  const steps = props.steps;
  const n = steps.length;
  const proof = props.proof;
  const signoff = props.signoff;

  // ---- Timing, clamped back from the end so everything is settled for the last 0.6 s.
  const problemAt = Math.max(0, cueAt(cues, props.problemWord, 0.15) - 0.1);
  const sMax = D - 1.5;
  const pMax = signoff ? sMax - 0.7 : D - 1.0;
  const stepHi = (proof ? pMax : signoff ? sMax : D - 1.0) - 0.6;
  const F = Math.max(1.6, Math.min(stepHi - 1.3 - 0.5 * (n - 1), cueAt(cues, props.fixWord, D * 0.24) - 0.1));
  const stepLo = F + 1.3;
  const S: number[] = [];
  steps.forEach((s, i) => {
    const fb = stepLo + 0.1 + (i * (stepHi - stepLo - 0.1)) / Math.max(1, n - 1);
    const want = cueAt(cues, s.word, fb + 0.05) - 0.05;
    const lo = i === 0 ? stepLo : S[i - 1]! + 0.5;
    const hi = stepHi - (n - 1 - i) * 0.5;
    S.push(Math.max(lo, Math.min(hi, want)));
  });
  const lastStep = S[n - 1]!;
  const PF = proof ? Math.max(lastStep + 0.55, Math.min(pMax, cueAt(cues, proof.word, D * 0.7) - 0.05)) : lastStep;
  const SG = signoff ? Math.max(PF + 0.6, Math.min(sMax, cueAt(cues, props.signoffWord, D * 0.84) - 0.1)) : D + 1;

  // ---- Geometry: a horizontal line in full frame, a vertical one beside face cam.
  const tagW = 380 * u;
  const tagH = split ? 160 * u : 260 * u;
  const lineY = 610 * u;
  const Lx = 150 * u;
  const P0: Pt = split ? [Lx, 380 * u] : [120 * u, lineY];
  const P1: Pt = split ? [Lx, proof ? H - 70 * u - tagH : H - 90 * u] : [proof ? W - 120 * u - tagW : W - 120 * u, lineY];
  const K: Pt = split ? [W * 0.56, 680 * u] : [W / 2, lineY];
  const R = (split ? 175 : 235) * u;
  const tail = (split ? 290 : 560) * u;
  const axis: Pt = split ? [0, 1] : [1, 0];
  const normal: Pt = split ? [1, 0] : [0, 1];
  const TA: Pt = [K[0] - axis[0] * tail, K[1] - axis[1] * tail];
  const TB: Pt = [K[0] + axis[0] * tail, K[1] + axis[1] * tail];
  const rot = (x: number, y: number): Pt => (split ? [-y, x] : [x, y]);

  // The knot: 5.5 wandering loops that start on the near side and end on the far side, so both tails meet it cleanly.
  const antic = range(t, F - 0.4, F, Easing.out(Easing.cubic));
  const tight = 1 - 0.13 * antic;
  const sway = 0.18 * Math.sin(t * 0.9);
  const knot = (k: number): Pt => {
    const th = k * Math.PI * 11;
    // The wander fades out at both ends so the loops start and finish on the axis, where the tails join without a kink.
    const env = Math.sin(Math.PI * k);
    const cx = R * 0.32 * Math.sin(k * Math.PI * 2.6 + 1) * env;
    const cy = R * 0.26 * Math.cos(k * Math.PI * 1.8) * env;
    const r = R * (0.5 + 0.5 * Math.abs(Math.sin(k * Math.PI * 2.7 + 0.6)));
    let x = (cx + r * Math.cos(th + Math.PI)) * tight;
    let y = (cy + r * Math.sin(th) * 0.8) * tight;
    const c = Math.cos(sway * Math.sin(k * Math.PI));
    const s = Math.sin(sway * Math.sin(k * Math.PI));
    [x, y] = [x * c - y * s, x * s + y * c];
    const [rx, ry] = rot(x, y);
    return [K[0] + rx, K[1] + ry];
  };
  const A = 0.16;
  const kStart = knot(0);
  const kEnd = knot(1);
  const tangle = (s: number): Pt => (s < A ? lerp(TA, kStart, s / A) : s > 1 - A ? lerp(kEnd, TB, (s - (1 - A)) / A) : knot((s - A) / (1 - 2 * A)));
  const straight = (s: number): Pt => lerp(P0, P1, s);

  // Pulled from both ends: the ends go taut first, the middle last, then the line twangs once and settles.
  const N = 240;
  const tick = Math.floor(t * 8);
  const tw = t - (F + 0.9);
  const twang = tw > 0 && tw < 0.9 ? 16 * u * Math.sin(tw * Math.PI * 2 * 3.5) * Math.exp(-tw * 5) : 0;
  const pts: Pt[] = [];
  for (let i = 0; i <= N; i++) {
    const s = i / N;
    const d = 1 - 2 * Math.abs(s - 0.5);
    const e = range(t, F + 0.35 * d, F + 0.35 * d + 0.55);
    let p = lerp(tangle(s), straight(s), e);
    const tw1 = twang * Math.sin(Math.PI * s);
    p = [p[0] + normal[0] * tw1, p[1] + normal[1] * tw1];
    if (hand) p = [p[0] + (hash(i * 7.1 + tick * 13.7) - 0.5) * 3 * u, p[1] + (hash(i * 3.3 + tick * 5.9 + 50) - 0.5) * 3 * u];
    pts.push(p);
  }
  const path = `M${pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" L")}`;
  const draw = range(t, problemAt + 0.1, problemAt + 1.4, Easing.inOut(Easing.sin));
  const taut = range(t, F + 0.15, F + 0.9);
  const lineColor = `color-mix(in srgb, ${style.accent} ${Math.round(taut * 100)}%, ${style.ink})`;
  const shadowA = light ? 0.12 : 0.4;
  const accentOn = onColor(style.accent, style);

  // ---- Stations.
  const sLo = 0.14;
  const sHi = 0.86;
  const st = steps.map((_, i) => (n === 1 ? 0.5 : sLo + (i * (sHi - sLo)) / (n - 1)));
  const span = Math.hypot(P1[0] - P0[0], P1[1] - P0[1]);
  const spacing = ((sHi - sLo) * span) / Math.max(1, n - 1);
  const slotW = Math.min(400 * u, spacing * 0.94);
  const ringR = 30 * u;
  const labelFs = (split ? 42 : 40) * u;

  // ---- The bead travels station to station, then into the proof tag.
  const targets = [...st.map((s, i) => ({ s, at: S[i]! })), ...(proof ? [{ s: 1, at: PF }] : [])];
  let beadS = 0;
  for (const g of targets) beadS = beadS + (g.s - beadS) * range(t, g.at - 0.5, g.at - 0.08);
  const beadP = straight(beadS);
  const beadA = range(t, F + 0.85, F + 1.15) * (proof ? 1 - range(t, PF - 0.12, PF) : 1);

  // ---- Camera: push in on the knot while the problem sits, pull back as it goes taut, a gentle push on the sign-off.
  const cam = 1 + 0.06 * range(t, 0, F, Easing.inOut(Easing.sin)) - 0.06 * range(t, F + 0.05, F + 1.0, Easing.out(Easing.cubic)) + (signoff ? 0.03 * range(t, SG, SG + 1.1, Easing.inOut(Easing.sin)) : 0);
  const camO: Pt = split ? [W / 2, 680 * u] : [W / 2, lineY];

  // ---- Headline zone (HUD, outside the rig).
  const hlW = split ? W - 120 * u : W - 240 * u;
  const hlFs = (txt: string) => (split ? Math.min(62 * u, (hlW * 1.9) / Math.max(1, txt.length * 0.55)) : Math.min(84 * u, hlW / Math.max(1, txt.length * 0.55)));
  const ul = signoff ? range(t, SG + 0.55, SG + 1.0, Easing.out(Easing.cubic)) : 0;

  // ---- Proof tag slam.
  const sl = PF - 0.05;
  const slam = t < sl ? 0 : interpolate(t, [sl, sl + 0.17, sl + 0.35], [1.5, 0.94, 1], { extrapolateRight: "clamp" });
  const slamA = range(t, sl, sl + 0.08, Easing.linear);
  const bu = (t - sl) / 0.6;
  const tagBox = split ? { left: 70 * u, top: P1[1], width: W - 140 * u, height: tagH } : { left: P1[0], top: lineY - tagH / 2, width: tagW, height: tagH };
  const valFs = proof ? (split ? Math.min(84 * u, (W * 0.42) / Math.max(1, proof.value.length * 0.6)) : Math.min(104 * u, (tagW - 60 * u) / Math.max(1, proof.value.length * 0.6))) : 0;

  return (
    <AbsoluteFill style={{ background: style.bg, overflow: "hidden" }}>
      {/* Surface: a soft lamp, a faint dot grid and two slow colour blobs; the blobs warm up when the line goes taut (their trigger). */}
      <AbsoluteFill style={{ background: `radial-gradient(75% 70% at 50% 55%, ${style.surface} 0%, transparent 72%)`, opacity: light ? 0.95 : 0.55 }} />
      <AbsoluteFill
        style={{
          backgroundImage: `radial-gradient(circle, ${mix(style.ink, light ? 10 : 12)} ${1.6 * u}px, transparent ${2 * u}px)`,
          backgroundSize: `${44 * u}px ${44 * u}px`,
          maskImage: "radial-gradient(ellipse at center, black 15%, transparent 72%)",
        }}
      />
      {[0, 1].map((b) => (
        <div
          key={b}
          style={{
            position: "absolute",
            left: K[0] - 560 * u + (b ? 300 : -300) * u + Math.sin(t * 0.55 + b * 2) * 50 * u,
            top: K[1] - 560 * u + Math.cos(t * 0.45 + b) * 40 * u,
            width: 1120 * u,
            height: 1120 * u,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${b ? style.accent2 : style.accent} 0%, transparent 62%)`,
            opacity: (light ? 0.05 : 0.07) + 0.07 * taut * (b ? 0.6 : 1),
          }}
        />
      ))}

      {/* Camera rig. */}
      <AbsoluteFill style={{ transform: `scale(${cam})`, transformOrigin: `${camO[0]}px ${camO[1]}px` }}>
        <svg width={W} height={H} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
          <path d={path} transform={`translate(0 ${8 * u})`} fill="none" stroke="#000" strokeOpacity={shadowA} strokeWidth={14 * u} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} />
          <path d={path} fill="none" stroke={lineColor} strokeWidth={(hand ? 10 : 12) * u} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} />
          {/* Start cap: a ring that marks where the path begins once it is straight. */}
          <circle cx={P0[0]} cy={P0[1]} r={16 * u} fill={style.bg} stroke={style.accent} strokeWidth={6 * u} opacity={range(t, F + 0.6, F + 0.9)} />

          {steps.map((_, i) => {
            const [x, y] = straight(st[i]!);
            const deal = enter(style, frame, fps, F + 0.75 + i * 0.09, 0.45);
            const act = enter(style, frame, fps, S[i]! - 0.05, 0.4);
            if (deal <= 0.001) return null;
            return (
              <g key={i} transform={`translate(${x} ${y}) scale(${deal})`}>
                <circle r={ringR + 10 * u * clamp01(act)} fill={style.accent} opacity={0.18 * clamp01(act) * (1 - range(t, S[i]! + 0.2, S[i]! + 0.7))} />
                <circle r={ringR} fill={style.surface} stroke={style.accent} strokeWidth={5 * u} />
                <circle r={ringR * clamp01(act)} fill={style.accent} />
                <text y={10.5 * u} textAnchor="middle" fontFamily={style.mono} fontWeight={600} fontSize={30 * u} fill={accentOn} opacity={clamp01(act * 2 - 0.6)}>
                  {i + 1}
                </text>
              </g>
            );
          })}

          {beadA > 0.001 ? (
            <g transform={`translate(${beadP[0]} ${beadP[1]})`} opacity={beadA}>
              <circle r={24 * u} fill={style.accent} opacity={0.22} />
              <circle r={13 * u} fill={style.accent} stroke={style.surface} strokeWidth={4 * u} />
            </g>
          ) : null}

          {proof && bu >= 0 && bu <= 1 ? (
            <rect
              x={tagBox.left - 30 * u * Easing.out(Easing.cubic)(bu)}
              y={tagBox.top - 30 * u * Easing.out(Easing.cubic)(bu)}
              width={tagBox.width + 60 * u * Easing.out(Easing.cubic)(bu)}
              height={tagBox.height + 60 * u * Easing.out(Easing.cubic)(bu)}
              rx={style.radius * u + 20 * u}
              fill="none"
              stroke={style.accent}
              strokeWidth={6 * u * (1 - bu)}
              opacity={1 - bu}
            />
          ) : null}
        </svg>

        {steps.map((s, i) => {
          const [x, y] = straight(st[i]!);
          const a = enter(style, frame, fps, S[i]! + 0.02, 0.6);
          const dim = i < n - 1 ? range(t, S[i + 1]!, S[i + 1]! + 0.35) : 0;
          if (t < S[i]! - 0.05) return null;
          const box = split
            ? { left: Lx + 62 * u, top: y - labelFs * 0.75, width: W - Lx - 122 * u, textAlign: "left" as const }
            : { left: Math.max(50 * u, Math.min((proof ? P1[0] - 24 * u : W - 50 * u) - slotW, x - slotW / 2)), top: y + ringR + 26 * u, width: slotW, textAlign: "center" as const };
          return (
            <div key={i} style={{ position: "absolute", ...box, overflow: "hidden", padding: `${4 * u}px 0` }}>
              <div style={{ fontFamily: hand ? style.display : style.body, fontWeight: hand ? 700 : 600, fontSize: hand ? labelFs * 1.12 : labelFs, lineHeight: 1.18, color: mix(style.ink, 100 - 35 * dim, style.muted), letterSpacing: hand ? 0 : "-0.01em", textWrap: "balance", transform: split ? `translateX(${(1 - Math.min(1, a)) * -40 * u}px)` : `translateY(${(1 - Math.min(1, a)) * 110}%)`, opacity: split ? clamp01(a * 2) : 1 }}>
                {s.text}
              </div>
            </div>
          );
        })}

        {proof && t >= sl ? (
          <div
            style={{
              position: "absolute",
              ...tagBox,
              transform: `scale(${slam})`,
              opacity: slamA,
              borderRadius: style.radius * u,
              background: style.surface,
              border: `${4 * u}px solid ${style.accent}`,
              boxShadow: hand ? undefined : `0 ${18 * u}px ${48 * u}px rgba(0,0,0,${shadowA * 1.3})`,
              display: "flex",
              flexDirection: split ? "row" : "column",
              alignItems: "center",
              justifyContent: "center",
              gap: split ? 30 * u : 6 * u,
              padding: `0 ${30 * u}px`,
              boxSizing: "border-box",
            }}
          >
            <div style={{ fontFamily: style.display, fontWeight: 800, fontSize: valFs, lineHeight: 1, color: style.ink, letterSpacing: hand ? 0 : "-0.03em", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{proof.value}</div>
            <div style={{ fontFamily: hand ? style.display : style.body, fontWeight: 600, fontSize: (hand ? 42 : 34) * u, lineHeight: 1.2, color: style.muted, textAlign: split ? "left" : "center", textWrap: "balance" }}>{proof.label}</div>
          </div>
        ) : null}
      </AbsoluteFill>

      {/* HUD: the one headline slot swaps problem → solution → sign-off. */}
      <div style={{ position: "absolute", left: (W - hlW) / 2, width: hlW, top: (split ? 70 : 120) * u, display: "flex", justifyContent: "center" }}>
        <div style={{ position: "absolute", display: "flex", justifyContent: "center", width: "100%" }}>
          <Headline text={props.problem} inAt={problemAt} outAt={F + 0.05} fs={hlFs(props.problem)} wrap={split} style={style} u={u} />
        </div>
        <div style={{ position: "absolute", display: "flex", justifyContent: "center", width: "100%" }}>
          <Headline text={props.solution} inAt={F + 0.4} outAt={signoff ? SG - 0.1 : undefined} fs={hlFs(props.solution)} wrap={split} style={style} u={u} />
        </div>
        {signoff ? (
          <div style={{ position: "absolute", display: "flex", justifyContent: "center", width: "100%" }}>
            <Headline text={signoff} inAt={SG + 0.2} fs={hlFs(signoff)} wrap={split} style={style} underline={ul} u={u} />
          </div>
        ) : null}
      </div>

      <AbsoluteFill style={{ background: `radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,${light ? 0.12 : 0.42}) 100%)`, pointerEvents: "none" }} />
    </AbsoluteFill>
  );
};

export default defineTemplate({
  id: "tangle-to-line",
  title: "Tangle to line",
  mode: "graphic",
  layouts: ["full", "split"],
  useFor:
    "A problem → fix → how-it-works arc in one segment: the problem headline sits over a tangled knot of line; on the fix word the knot is pulled taut into a straight path, the headline swaps to the solution, and 2–4 numbered stations light up along the path as each step is spoken (a bead travels station to station). Optional proof tag (a figure + label) slams onto the end of the line, and an optional sign-off (a name, a promise) replaces the headline with an underline. Good for pitches and 'here's how I do it' explainers, a habit that fixes a mess, a recipe that rescues a disaster, opener/outro summaries, and music-only explainer beats. As a split panel the line runs vertically beside face cam. No media.",
  avoid:
    "Steps that need explaining one by one at length (follow with list-tick or flow-diagram), more than 4 steps, segments under ~7 s, using it twice in a video, and a proof figure that isn't in the research.",
  schema,
  example: {
    problem: "Your bike has sat broken for months",
    problemWord: "your",
    fixWord: "fix",
    solution: "We fix it at your door",
    steps: [
      { text: "Book a slot", word: "book" },
      { text: "We come to you", word: "come" },
      { text: "Ride the same day", word: "ride" },
    ],
    proof: { value: "1,200", label: "bikes back on the road", word: "twelve" },
    signoff: "Pedal Doctor",
    signoffWord: "pedal",
  },
  exampleMedia: [],
  exampleCues: [
    { at: 0.2, end: 0.4, word: "your" },
    { at: 0.4, end: 0.7, word: "bike" },
    { at: 0.7, end: 0.85, word: "has" },
    { at: 0.85, end: 1.1, word: "sat" },
    { at: 1.1, end: 1.5, word: "broken" },
    { at: 1.5, end: 1.7, word: "for" },
    { at: 1.7, end: 2.2, word: "months" },
    { at: 2.6, end: 2.8, word: "so" },
    { at: 2.8, end: 3.0, word: "we" },
    { at: 3.0, end: 3.35, word: "fix" },
    { at: 3.35, end: 3.5, word: "it" },
    { at: 3.5, end: 3.65, word: "at" },
    { at: 3.65, end: 3.85, word: "your" },
    { at: 3.85, end: 4.2, word: "door" },
    { at: 5.0, end: 5.3, word: "book" },
    { at: 5.3, end: 5.4, word: "a" },
    { at: 5.4, end: 5.8, word: "slot" },
    { at: 6.3, end: 6.6, word: "come" },
    { at: 6.6, end: 6.75, word: "to" },
    { at: 6.75, end: 7.0, word: "you" },
    { at: 7.6, end: 7.9, word: "ride" },
    { at: 7.9, end: 8.0, word: "the" },
    { at: 8.0, end: 8.25, word: "same" },
    { at: 8.25, end: 8.5, word: "day" },
    { at: 8.8, end: 9.15, word: "twelve" },
    { at: 9.15, end: 9.5, word: "hundred" },
    { at: 9.5, end: 9.8, word: "bikes" },
    { at: 10.0, end: 10.3, word: "pedal" },
    { at: 10.3, end: 10.7, word: "doctor" },
  ],
  seconds: { min: 7, max: 18, demo: 12 },
  mediaSlots: 0,
  credit: { name: "'Animated business explainer' (prompt-motion.com)", url: "https://prompt-motion.com/alex-prompter-1ea044" },
  status: "draft",
  Component: ({ props, style, width, height, duration, cues }) => <TangleToLine props={props} style={style} W={width} H={height} duration={duration} cues={cues} />,
});
