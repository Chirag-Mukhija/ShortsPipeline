// Catalog demos for the core motion packs (transitions, text doors, emphasis, slam, count-up, captions, beat pulse) on a small dusk-to-morning palette.
import type { CSSProperties, FC, ReactNode } from "react";
import { AbsoluteFill, random } from "remotion";
import { loadFont as loadDisplay } from "@remotion/google-fonts/BricolageGrotesque";
import { loadFont as loadSerif } from "@remotion/google-fonts/InstrumentSerif";
import { makeCircle, makeStar } from "@remotion/shapes";
import { getBoundingBox } from "@remotion/paths";
import type { LibraryEntry } from "./catalog";
import { ramp, useTime } from "./time";
import { Track } from "./beat";
import { cueWord, impactTransform, useBeatPulse, type NarrationWord } from "./cues";
import { Card3d, ColourFlash, LightSweep, MaskGrow, MatchCut, Overlap, PushThrough, TRANSITION_SPECS, WhipAt, transitionP, type TransitionKind } from "./transition-pack";
import { Caption, CountUp, Line, Slam, SlamFlash, type Door, type EmphasisKind } from "./text-pack";

const DISPLAY = loadDisplay("normal", { weights: ["500", "600", "800"], subsets: ["latin"] }).fontFamily;
const SERIF = loadSerif("italic", { weights: ["400"], subsets: ["latin"] }).fontFamily;

const INK = "#0F1218";
const NIGHT = "#0A0D13";
const CREAM = "#F4EEE3";
const CORAL = "#FF6B4A";
const TEAL = "#17A398";
const GOLD = "#FFC857";
const MUTED = "#8A8F9C";

const ORIGIN = "core motion pack (direction draft, sections 3, 5, 6)";
const big = (size = 120, weight = 600): CSSProperties => ({ fontFamily: DISPLAY, fontSize: size, fontWeight: weight, letterSpacing: "-0.035em", lineHeight: 1 });
const aside = (size = 46): CSSProperties => ({ fontFamily: SERIF, fontStyle: "italic", fontSize: size, lineHeight: 1 });
const at = (x: number, y: number, s: CSSProperties = {}): CSSProperties => ({ position: "absolute", left: x, top: y, ...s });

const SUN = { x: 1340, y: 470, r: 150 };
const STAR_AT = { x: 560, y: 520, size: 360 };
const CIRCLE_D = makeCircle({ radius: SUN.r }).path;
const STAR_D = makeStar({ points: 5, innerRadius: 100, outerRadius: 190, cornerRadius: 22 }).path;
const STAR_BB = getBoundingBox(STAR_D);

// Scene A: dusk. A coral sun over a horizon, slow rings, seeded stars; the camera drifts.
const Night: FC<{ sun?: boolean; title?: string }> = ({ sun = true, title = "The night shift" }) => {
  const { t } = useTime();
  const dx = Math.sin(t * 0.5) * 10;
  return (
    <AbsoluteFill style={{ background: `radial-gradient(circle at 70% 44%, #2A3350 0%, #151B2B 38%, ${NIGHT} 78%)`, overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: `translateX(${dx}px)` }}>
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
          {Array.from({ length: 46 }, (_, i) => (
            <circle key={i} cx={random(`sx${i}`) * 1920} cy={random(`sy${i}`) * 640} r={1 + random(`sr${i}`) * 2.2} fill={CREAM} opacity={0.15 + 0.5 * random(`so${i}`) * (0.6 + 0.4 * Math.sin(t * 2 + i))} />
          ))}
          {[260, 360, 470].map((r, i) => (
            <circle key={r} cx={SUN.x} cy={SUN.y} r={r} fill="none" stroke={CREAM} strokeOpacity={0.07 - i * 0.015} strokeWidth={2} strokeDasharray="4 14" transform={`rotate(${t * (6 - i * 2)} ${SUN.x} ${SUN.y})`} />
          ))}
          {sun ? (
            <>
              <circle cx={SUN.x} cy={SUN.y} r={SUN.r * 1.9} fill={CORAL} opacity={0.12} style={{ filter: "blur(40px)" }} />
              <circle cx={SUN.x} cy={SUN.y} r={SUN.r} fill={CORAL} />
              <circle cx={SUN.x - 40} cy={SUN.y - 46} r={SUN.r * 0.55} fill="#FF8F70" opacity={0.5} style={{ filter: "blur(30px)" }} />
            </>
          ) : null}
          <rect x={0} y={700} width={1920} height={380} fill={NIGHT} opacity={0.82} />
          <line x1={0} x2={1920} y1={700} y2={700} stroke={CREAM} strokeOpacity={0.18} strokeWidth={2} />
        </svg>
      </AbsoluteFill>
      <div style={at(160, 330, { ...aside(48), color: GOLD })}>02:14 am</div>
      <div style={at(160, 400, { ...big(128), color: CREAM, width: 900 })}>{title}</div>
    </AbsoluteFill>
  );
};

// Scene B: morning. Cream paper, a teal star on its contact shadow, ink headline that enters with a mask door at `textAt`.
// `flip` puts the star where the sun was (for the match cut) and the words on the left.
const Day: FC<{ star?: boolean; textAt?: number; title?: string; flip?: boolean }> = ({ star = true, textAt = -1, title = "Morning, finally", flip = false }) => {
  const { t } = useTime();
  const S = flip ? { x: SUN.x, y: SUN.y, size: 400 } : STAR_AT;
  const tx = flip ? 160 : 980;
  const s = S.size / Math.max(STAR_BB.width, STAR_BB.height);
  return (
    <AbsoluteFill style={{ background: `radial-gradient(circle at 30% 40%, #FFF9EF 0%, ${CREAM} 55%, #E9E0D0 100%)`, overflow: "hidden" }}>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        {Array.from({ length: 12 * 7 }, (_, i) => (
          <circle key={i} cx={120 + (i % 12) * 152} cy={110 + Math.floor(i / 12) * 150} r={3} fill={INK} opacity={0.07} />
        ))}
        <ellipse cx={S.x + 10} cy={S.y + S.size * 0.64} rx={190} ry={26} fill={INK} opacity={0.12} style={{ filter: "blur(14px)" }} />
        {star ? (
          <g transform={`translate(${S.x} ${S.y + Math.sin(t * 1.4) * 8}) rotate(${Math.sin(t * 0.7) * 4}) scale(${s}) translate(${-(STAR_BB.x1 + STAR_BB.x2) / 2} ${-(STAR_BB.y1 + STAR_BB.y2) / 2})`}>
            <path d={STAR_D} fill={TEAL} />
          </g>
        ) : null}
      </svg>
      <div style={at(tx, 360, { ...aside(48), color: CORAL })}>06:40 am</div>
      <div style={at(tx, 430, { width: 820 })}>
        <Line text={title} at={textAt} door="mask" font={big(128)} color={INK} />
      </div>
    </AbsoluteFill>
  );
};

// A transition demo: a holds, the transition runs so a mid-length still falls inside it, b holds.
const transitionDemo = (id: TransitionKind, title: string, useFor: string, api: string, seconds: number, render: (p: number, start: number) => ReactNode): LibraryEntry => {
  const dur = TRANSITION_SPECS[id].dur;
  const start = Math.max(0.5, 0.45 * seconds - 0.45 * dur);
  return {
    id: `t-${id}`,
    kind: "transition",
    title,
    useFor,
    api,
    seconds,
    origin: ORIGIN,
    Demo: () => {
      const { t } = useTime();
      return <AbsoluteFill>{render(transitionP(t, start, dur), start + dur * TRANSITION_SPECS[id].reveal)}</AbsoluteFill>;
    },
  };
};

const Label: FC<{ text: string; x: number; y: number; color?: string }> = ({ text, x, y, color = MUTED }) => (
  <div style={at(x, y, { fontFamily: DISPLAY, fontSize: 30, fontWeight: 500, letterSpacing: "0.02em", color })}>{text}</div>
);

const DOOR_LINES: [Door, string, CSSProperties?][] = [
  ["rise", "ideas arrive slowly"],
  ["mask", "then all at once"],
  ["words", "every word gets its moment"],
  ["depth", "from the back"],
  ["typed", "typing it out, letter by letter"],
  ["blur", "racking into focus"],
  ["slide", "sliding in from the left"],
  ["split", "split, then rejoined"],
];

const DoorsDemo: FC<{ from: number }> = ({ from }) => (
  <AbsoluteFill style={{ background: `linear-gradient(160deg, #151B2B 0%, ${NIGHT} 70%)` }}>
    {DOOR_LINES.slice(from, from + 4).map(([door, text], i) => (
      <div key={door}>
        <Label text={door} x={160} y={196 + i * 200} color={i % 2 ? GOLD : CORAL} />
        <div style={at(420, 168 + i * 200, { width: 1400 })}>
          <Line text={text} at={0.3 + i * 0.75} door={door} font={big(88, 600)} color={CREAM} />
        </div>
      </div>
    ))}
  </AbsoluteFill>
);

const EMPH: EmphasisKind[] = ["highlight", "pill", "underline", "colour", "weight", "circle", "box", "strike"];
const EMPH_COLOR: Partial<Record<EmphasisKind, string>> = { highlight: GOLD, pill: INK, underline: CORAL, colour: CORAL, circle: CORAL, box: TEAL, strike: CORAL };

const EmphasisDemo: FC = () => (
  <AbsoluteFill style={{ background: CREAM }}>
    {EMPH.map((k, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = 170 + col * 860;
      const y = 150 + row * 210;
      const land = 0.2 + row * 0.35;
      return (
        <div key={k}>
          <Label text={k} x={x} y={y} />
          <div style={at(x, y + 50, { width: 760 })}>
            <Line text="this is the *one* word" at={land} door="words" font={big(78, k === "weight" ? 500 : 600)} color={INK} emphasis={{ kind: k, at: land + 0.9, color: EMPH_COLOR[k], ink: CREAM }} />
          </div>
        </div>
      );
    })}
  </AbsoluteFill>
);

// Fake narration for the caption and cue demos: about 2.6 words a second with a breath after the first sentence.
const SAMPLE = "So here's the thing nobody tells you about learning to code. It's not the syntax, it's the habit.";
const FAKE: NarrationWord[] = (() => {
  let s = 0.3;
  return SAMPLE.split(" ").map((text, i) => {
    const len = 0.22 + Math.min(0.3, text.length * 0.03);
    const w = { text, start: s, end: s + len, idx: i };
    s += len + (/\.$/.test(text) ? 0.45 : 0.06);
    return w;
  });
})();

const BEAT_SPEC = { bpm: 120, sections: [{ name: "build" as const, start: 0, end: 2 }, { name: "peak" as const, start: 2, end: 4 }] };
// Downbeat of bar 2 at 120 BPM (2.0 s): the slam and the camera hit land on it.
const BAR2 = 2.0;

const BeatScene: FC = () => {
  const { t } = useTime();
  const pulse = useBeatPulse({ amount: 0.014 });
  const beat = Math.floor(t / 0.5);
  return (
    <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 42%, #2A2140 0%, #120F1C 70%)`, transform: `${pulse.transform} ${impactTransform(t, BAR2, { scale: 0.035, shake: 10 })}` }}>
      <div style={at(0, 300, { width: 1920, display: "flex", justifyContent: "center" })}>
        <Line text="and the bill came to" at={0.25} door="words" font={big(70, 500)} color={MUTED} align="center" />
      </div>
      <div style={at(0, 420, { width: 1920, display: "flex", justifyContent: "center" })}>
        <Slam text="Zero" at={BAR2} font={big(300, 800)} color={CORAL} ring={GOLD} />
      </div>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <circle key={i} cx={960 - 7 * 45 + i * 90} cy={900} r={i === beat % 8 ? 16 : 10} fill={i === beat % 8 ? GOLD : CREAM} opacity={i === beat % 8 ? 1 : 0.25} />
        ))}
      </svg>
      <SlamFlash at={BAR2} color={GOLD} strength={0.22} />
    </AbsoluteFill>
  );
};

// A battery-like object the number sits on, filling as it counts; lands on the word "about" from the fake narration.
const CountScene: FC = () => {
  const { t } = useTime();
  const land = cueWord(FAKE, "about");
  const dur = 1.6;
  const fill = 0.87 * (1 - Math.pow(1 - Math.min(1, Math.max(0, (t - (land - dur)) / dur)), 3));
  return (
    <AbsoluteFill style={{ background: `linear-gradient(170deg, #121826 0%, ${NIGHT} 80%)` }}>
      <div style={at(360, 330, { width: 1080, height: 380, borderRadius: 64, border: `10px solid ${CREAM}`, boxSizing: "border-box", padding: 22 })}>
        <div style={{ width: `${fill * 100}%`, height: "100%", borderRadius: 40, background: `linear-gradient(90deg, ${TEAL}, #3FD6C4)` }} />
      </div>
      <div style={at(1440, 445, { width: 36, height: 150, borderRadius: "0 18px 18px 0", background: CREAM })} />
      <div style={at(360, 380, { width: 1080, display: "flex", justifyContent: "center" })}>
        <CountUp to={87} land={land} dur={dur} suffix="%" font={big(230, 800)} color={CREAM} affixStyle={{ fontSize: "0.5em", marginLeft: "0.06em" }} />
      </div>
      <div style={at(360, 760, { ...aside(54), color: GOLD, opacity: ramp(t, land - 0.2, 0.4) })}>of the charge left after a year</div>
    </AbsoluteFill>
  );
};

export const motionEntries: LibraryEntry[] = [
  transitionDemo("maskGrow", "Mask grow from a motivated point", "Revealing the next scene from a thing in this one (the sun, a dot, an icon, a logo hole). Any SVG path works as the mask: a star here.", "<MaskGrow p a b origin={{x,y}} shape={'circle' | pathD} spin? edge? push? ease?>", 3, (p, reveal) => (
    <MaskGrow p={p} a={<Night />} b={<Day textAt={reveal} />} origin={{ x: SUN.x, y: SUN.y }} shape={STAR_D} spin={50} edge={GOLD} edgeWidth={12} />
  )),
  {
    id: "t-whip",
    kind: "transition",
    title: "Whip pan with motion blur",
    useFor: "Energetic cuts between sentences: both scenes travel as one strip with real sub-frame motion blur. Alternate `dir` between uses.",
    api: "<WhipAt at dur?=0.28 a b dir? samples?> (timed, motion-blurred) · <Whip p a b dir blur?> (p-driven, SVG blur)",
    seconds: 2,
    origin: ORIGIN,
    Demo: () => <WhipAt at={0.78} a={<Night />} b={<Day textAt={0.95} />} dir="left" />,
  },
  transitionDemo("card3d", "3D card turn", "Swapping two screens or posters with depth: a turns away and dims, b comes forward from the other side and flattens into the frame.", "<Card3d p a b bg? dir?={1|-1} angle? radius? perspective?>", 3, (p, reveal) => (
    <Card3d p={p} a={<Night />} b={<Day textAt={reveal} />} bg="#06070A" />
  )),
  transitionDemo("lightSweep", "Light sweep", "Gentle chapter changes: a warm blurred light drifts across and the cut hides in its glare.", "<LightSweep p a b tint? streak? from? to? strength?>", 3, (p, reveal) => (
    <LightSweep p={p} a={<Night />} b={<Day textAt={reveal} />} />
  )),
  {
    id: "t-overlap",
    kind: "transition",
    title: "Overlapping choreography",
    useFor: "The default in-chapter change: old elements leave fast while the new ones already arrive, no cut. Use overlapOut/overlapIn on your own elements or <Overlap> with layers.",
    api: "<Overlap p a={[layers]} b={[layers]} stage?> · overlapOut(p, i, n) / overlapIn(p, i, n) → style",
    seconds: 3,
    origin: ORIGIN,
    Demo: () => {
      const { t } = useTime();
      const p = transitionP(t, 1.0, TRANSITION_SPECS.overlap.dur);
      const stage = <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 40%, #232B42 0%, ${NIGHT} 75%)`, transform: `scale(${1 + t * 0.01})` }} />;
      const word = (x: number, y: number, text: string, color: string) => <div style={at(x, y, { ...big(150, 700), color })}>{text}</div>;
      return (
        <Overlap
          p={p}
          stage={stage}
          a={[word(240, 280, "Fast", CREAM), word(800, 470, "cheap", GOLD), word(1300, 640, "good", CORAL)]}
          b={[
            <div style={at(0, 380, { width: 1920, textAlign: "center", ...big(190, 800), color: CREAM })}>Pick two</div>,
            <div style={at(0, 620, { width: 1920, textAlign: "center", ...aside(64), color: GOLD })}>the oldest rule in the trade</div>,
          ]}
        />
      );
    },
  },
  transitionDemo("pushThrough", "Push through", "One special dive per video: the camera pushes into a subject of a (here the sun) and the next scene is born large and settles.", "<PushThrough p a b origin={{x,y}} depth?=10 swap?=0.5 aFront? fill?>", 3, (p, reveal) => (
    <PushThrough p={p} a={<Night />} b={<Day textAt={reveal} />} origin={{ x: SUN.x, y: SUN.y }} fill={CORAL} />
  )),
  transitionDemo("matchCut", "Match cut by shape", "Two scenes that share a shape: the sun travels, recolours and morphs into the star while the scenes hard-cut behind it. Render a and b without the shared shape.", "<MatchCut p a b from={{ d, x, y, size, fill, rotate? }} to={…} cut?=0.5 shadow?>", 3, (p) => (
    <MatchCut
      p={p}
      a={<Night sun={false} />}
      b={<Day star={false} flip textAt={1.75} />}
      from={{ d: CIRCLE_D, x: SUN.x, y: SUN.y, size: SUN.r * 2, fill: CORAL, rotate: -72 }}
      to={{ d: STAR_D, x: SUN.x, y: SUN.y, size: 400, fill: TEAL, rotate: 0 }}
      shadow={INK}
    />
  )),
  transitionDemo("colourFlash", "Chapter colour field", "Chapter changes (two per video at most): a palette colour field wipes in on a slanted edge with a lead band, holds the chapter label, passes on (or stays as the next background).", "<ColourFlash p a b color lead? dir? stay? mid? slant? band?>", 3, (p, reveal) => (
    <ColourFlash
      p={p}
      a={<Night />}
      b={<Day textAt={reveal} />}
      color={CORAL}
      lead={GOLD}
      mid={
        <AbsoluteFill style={{ justifyContent: "center", paddingLeft: 200 }}>
          <div style={{ ...aside(60), color: INK, opacity: 0.7 }}>chapter two</div>
          <div style={{ ...big(200, 800), color: INK }}>Sunrise</div>
        </AbsoluteFill>
      }
    />
  )),
  {
    id: "text-doors-a",
    kind: "primitive",
    title: "Text doors: rise, mask, words, depth",
    useFor: "Entering any line with a door chosen by meaning; never the same door on two consecutive beats. Font props come from the theme.",
    api: "<Line text at door='rise'|'mask'|'words'|'depth'|… font? color? align? case?='sentence' out? emphasis?>",
    seconds: 4,
    origin: ORIGIN,
    Demo: () => <DoorsDemo from={0} />,
  },
  {
    id: "text-doors-b",
    kind: "primitive",
    title: "Text doors: typed, blur, slide, split",
    useFor: "The other four doors. `slide` takes from='left'|'right'|'up'|'down'; `typed` runs at 26 chars/s with a zero-width cursor.",
    api: "<Line text at door='typed'|'blur'|'slide'|'split' from? stagger? dur? out?>",
    seconds: 4,
    origin: ORIGIN,
    Demo: () => <DoorsDemo from={4} />,
  },
  {
    id: "text-emphasis",
    kind: "primitive",
    title: "Emphasis forms (pick one per video)",
    useFor: "Marking the key word after the line has landed (0.4–0.6 s later). Wrap words in *asterisks* in <Line emphasis>, or use <Emphasis> around any inline text.",
    api: "<Emphasis kind='highlight'|'pill'|'underline'|'colour'|'weight'|'circle'|'box'|'strike'|'none' at color? ink?>…</Emphasis>",
    seconds: 4,
    origin: ORIGIN,
    Demo: EmphasisDemo,
  },
  {
    id: "text-slam-on-beat",
    kind: "primitive",
    title: "Slam on the downbeat, with beat pulse",
    useFor: "An impact word that lands on a beat or a punch word: under-damped scale slam, shock ring, a short flash and a camera hit on both layers; the whole frame breathes on every quarter note.",
    api: "<Slam text at font? ring? shake?> · <SlamFlash at> · useBeatPulse({ amount, every }) in <Track> · impactTransform(t, at, { scale, shake })",
    seconds: 3,
    origin: ORIGIN,
    Demo: () => (
      <Track spec={BEAT_SPEC}>
        <BeatScene />
      </Track>
    ),
  },
  {
    id: "text-countup",
    kind: "primitive",
    title: "Count-up that lands on the word",
    useFor: "A number that sits on an object and settles exactly on the spoken word (cueWord), digits in fixed cells so nothing jitters.",
    api: "<CountUp to land={cueWord(words, 'about')} dur? from? decimals? prefix? suffix? group? font?>",
    seconds: 3.8,
    origin: ORIGIN,
    Demo: CountScene,
  },
  {
    id: "text-caption",
    kind: "primitive",
    title: "Word-timed caption pill",
    useFor: "Captions on narrated videos from record/narration.json: 2–6 word chunks broken at punctuation and pauses, the word being said in the accent.",
    api: "<Caption words={wordsBetween(narration.words, from, to)} font? y? pill? ink? accent? min? max?>",
    seconds: 5,
    origin: ORIGIN,
    Demo: () => (
      <AbsoluteFill>
        <Day textAt={0.2} title="Learning to code" />
        <Caption words={FAKE} font={{ fontFamily: DISPLAY }} ink={INK} accent={CORAL} pill="#FFFFFF" />
      </AbsoluteFill>
    ),
  },
];
