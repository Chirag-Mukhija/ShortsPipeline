// Catalog of the kinetic type film theme: one entry and one demo per reusable item, each demo built to read as a still.
import type { FC } from "react";
import type { LibraryEntry, LibraryTheme } from "../../core/catalog";
import { INK, M, RED } from "./theme";
import { EchoTrail, Void, WordHit } from "./type";
import { NumberSlam, PhraseBuilder, PullQuote, SourceTag, StepStack, TitleCard, TypeBars, VersusSplit, type Spoken } from "./pieces";
import { BlockCut, MeaningGag, TextMorph, TypeBeatGrid, ZBreak } from "./signature";

const ORIGIN = "kinetic-type-film board (data/references/themes/kinetic-type-film.md)";

// Demo words with evenly spaced fake timings, shaped like narration.json.
const said = (text: string, from: number, gap = 0.2): Spoken[] => text.split(" ").map((w, i) => ({ text: w, start: from + i * gap, end: from + (i + 1) * gap }));

const entry = (e: Omit<LibraryEntry, "origin">): LibraryEntry => ({ ...e, origin: ORIGIN });

const entries: LibraryEntry[] = [
  entry({
    id: "void",
    kind: "background",
    title: "Void with grain and ghost word",
    useFor: "The film's frame: flat near-black (or paper, red, lime) with 2 % grain dancing at 15 fps; add an outline ghost word that bleeds off the edge and drifts in tracking to keep a hold alive.",
    api: '<Void bg?="void|paper|red|lime" ghost?="WORD" grain? />',
    seconds: 2,
    Demo: () => <Void ghost="QUIET" />,
  }),
  entry({
    id: "title-card",
    kind: "piece",
    title: "Title card: words rise from the mask",
    useFor: "Chapter breaks, the hook card, a cold-open statement. Words rise from a mask line, a red rule cuts in, an outline numeral bleeds off the right edge; drops back into the mask on `out`.",
    api: "<TitleCard title={lines} at kicker? num? sub? accentWord? out? />  ·  <MaskRise lines at by='lines|words|chars' stagger? out? />",
    seconds: 3,
    Demo: () => <TitleCard kicker="CHAPTER 02" num="02" title={["What should", "I learn next?"]} at={0.3} sub="the honest answer" accentWord={3} />,
  }),
  entry({
    id: "word-hit",
    kind: "primitive",
    title: "Word hit with weight morph",
    useFor: "One key word landing on its spoken time: snaps in (7 f, 10 % overshoot), then on the stressed syllable punches 130 → 110 %, morphs weight 400 → 900 and flips to red. Leaves by sliding off the frame or a hard cut.",
    api: '<WordHit text at size? v?="hit|support|emo|tech" emphAt? accent? weight?={[400, 900]} out? exitTo? echo? x? y? align? />',
    seconds: 2.5,
    Demo: () => (
      <>
        <WordHit text="it's" v="emo" size={130} at={0.3} x={M + 30} y={330} align="left" color="#C9C9D1" />
        <WordHit text="BROKEN." at={0.6} size={300} y={580} emphAt={1.3} accent={RED} weight={[400, 900]} echo={2} />
      </>
    ),
  }),
  entry({
    id: "phrase-builder",
    kind: "piece",
    title: "Phrase built word by word",
    useFor: "A punchline or claim (up to ~8 words) straight from narration.json: build (words snap in and stay), karaoke (line waits at 15 % and lights up) or replace (one huge word at a time, Don't Blink style). Stressed words morph to black weight and turn red.",
    api: '<PhraseBuilder words={narration.words.slice(a, b)} emphasisIdx mode?="build|karaoke|replace" size? align? emphVoice?="hit|emo" out? />',
    seconds: 3.2,
    Demo: () => <PhraseBuilder words={said("AI writes the code. You own the idea.", 0.3)} emphasisIdx={7} size={170} />,
  }),
  entry({
    id: "echo-trail",
    kind: "primitive",
    title: "Echo trail",
    useFor: "A word on the move with stroke-only copies trailing 3 f apart; on a hold they fan into an outline stack. Entrances that need speed, 'again and again', repetition, momentum.",
    api: "<EchoTrail text keys={[{ t, x, y, s? }]} count? lag? rest?={[dx, dy]} size? />",
    seconds: 2.5,
    Demo: () => <EchoTrail text="REPEAT" keys={[{ t: 0.2, x: -700, y: 280 }, { t: 1.0, x: 960, y: 280 }]} count={4} rest={[0, 132]} size={180} echoColor={RED} />,
  }),
  entry({
    id: "step-stack",
    kind: "piece",
    title: "Step stack: land big, file away",
    useFor: "A list or steps said one after another: each step lands huge in red at the bottom, then files up into its numbered row when the next one is said. Up to 5 short steps.",
    api: "<StepStack steps={[{ text, at }]} end? label? />",
    seconds: 3.6,
    Demo: () => <StepStack label="THE CHAIN" steps={[{ text: "Idea", at: 0.3 }, { text: "Research", at: 1.1 }, { text: "Script", at: 1.9 }, { text: "Record", at: 2.7 }]} />,
  }),
  entry({
    id: "number-slam",
    kind: "piece",
    title: "Number slam",
    useFor: "The one stat of a beat: counts up in tabular figures, hits on the spoken number with a 6 f sine shake, outline shockwaves and a red flip; the label rises 8 f later. count={0} slams it in from 170 % instead.",
    api: "<NumberSlam value at from? count? decimals? prefix? suffix? label? />",
    seconds: 2.4,
    Demo: () => <NumberSlam value={90} suffix="%" at={1.1} count={0.8} label="of the frame is the number" />,
  }),
  entry({
    id: "versus-split",
    kind: "piece",
    title: "Versus split",
    useFor: "A vs B: paper drops in from the top, void rises from the bottom, words land on their times, a serif 'vs.' sits on the seam; on the verdict the winner shoves the split over and goes red, the loser is struck through.",
    api: '<VersusSplit a b at aAt bAt vsAt? aSub? bSub? winner?="a|b" winAt? aBg? bBg? />',
    seconds: 3,
    Demo: () => <VersusSplit a="LEARN" b="COPY" aSub="you own it" bSub="you borrow it" at={0.2} aAt={0.45} bAt={0.95} vsAt={0.7} winner="a" winAt={1.8} />,
  }),
  entry({
    id: "pull-quote",
    kind: "piece",
    title: "Pull quote, read along",
    useFor: "A quote or callout read aloud: serif italic lighting up word by word under a giant outline quote mark, the key word in red, attribution in mono after the last word.",
    api: "<PullQuote words={narration.words.slice(a, b)} who? source? emphasis?={[i]} size? out? />",
    seconds: 3.2,
    Demo: () => <PullQuote words={said("Words are the picture, timed to the voice and acting out what they mean.", 0.4, 0.15)} emphasis={[3]} who="THE BOARD" source="kinetic-type-film.md" />,
  }),
  entry({
    id: "type-bars",
    kind: "piece",
    title: "Type bars",
    useFor: "A small comparison chart (2–6 rows): slabs grow on the cue with the value riding each bar end; on the spoken highlight the one that matters goes red and punches, the rest dim.",
    api: "<TypeBars rows={[{ label, value, display? }]} at highlight? highlightAt? max? title? />",
    seconds: 2.8,
    Demo: () => (
      <TypeBars
        title="FRAMES PER MOVE, THIS THEME"
        rows={[{ label: "Snap-in", value: 7 }, { label: "Settle", value: 6 }, { label: "Exit", value: 6 }, { label: "Wipe", value: 10 }, { label: "Flash", value: 2 }]}
        at={0.3}
        highlight={3}
        highlightAt={1.6}
      />
    ),
  }),
  entry({
    id: "source-tag",
    kind: "piece",
    title: "Source tag / lower third",
    useFor: "Where a claim comes from, or who is speaking: a red square, the line in heavy type and the source in mono, each revealed by a block that sweeps over and retracts.",
    api: "<SourceTag title source? at out? x? y? />",
    seconds: 2.4,
    Demo: () => (
      <>
        <WordHit text="DON'T BLINK." at={0.2} size={200} y={420} />
        <SourceTag title="Words held for 5 to 7 frames" source="SOURCE · motionographer.com, 2016" at={0.8} />
      </>
    ),
  }),
  entry({
    id: "block-cut",
    kind: "transition",
    title: "Colour-block cut",
    useFor: "The theme's scene change: a full-frame colour block per beat with its word pinned, wiped on in 10 f with an accent edge riding the wipe, or hard cut on the beat with a 2 f flash.",
    api: '<BlockCut cuts={[{ at, bg: "red|paper|lime|void", text?, kind?: "wipe|cut", from? }]} />  ·  <Flash at frames? />',
    seconds: 2.6,
    Demo: () => (
      <BlockCut
        cuts={[
          { at: 0.3, bg: "red", text: "CUT", kind: "cut" },
          { at: 0.95, bg: "paper", text: "ON THE", kind: "wipe" },
          { at: 1.8, bg: "lime", text: "BEAT.", kind: "wipe", from: "bottom" },
        ]}
      />
    ),
  }),
  entry({
    id: "z-break",
    kind: "transition",
    title: "Z-break into a letter",
    useFor: "Once per film: the camera pushes into one letter (pick one with ink at its centre, like I, H or T) until its red fills the frame and becomes the next scene. The big chapter turn.",
    api: "<ZBreak text letter inAt at dur? ink? peak?>{next scene}</ZBreak>",
    seconds: 2.8,
    Demo: () => (
      <ZBreak text="DIVE" letter={1} inAt={0.2} at={1.0} dur={0.7}>
        <WordHit text="INSIDE." at={1.8} size={280} color={INK} />
      </ZBreak>
    ),
  }),
  entry({
    id: "text-morph",
    kind: "piece",
    title: "Text morph",
    useFor: "One word becoming the next on the beat (idea → script → film, 'plan' → 'ship'): the old letters sink and shear into the baseline while the new ones rise out of it, 1 f apart.",
    api: "<TextMorph words={[...]} at={[...]} size? accentLast? />",
    seconds: 3.2,
    Demo: () => <TextMorph words={["IDEA", "SCRIPT", "VOICE", "FILM."]} at={[0.2, 1.0, 1.7, 2.4]} size={300} />,
  }),
  entry({
    id: "meaning-gag",
    kind: "piece",
    title: "Meaning gag",
    useFor: "One per video: a word whose shape acts out what it means as it's said. shrink, stretch, heavy (drops, thickens, lands with a shake), split, fast (whips in with smears).",
    api: '<MeaningGag word behavior="shrink|stretch|heavy|split|fast" at x? y? size? max? />',
    seconds: 2.8,
    Demo: () => (
      <>
        <MeaningGag word="shrink" behavior="shrink" at={0.3} y={230} size={190} />
        <MeaningGag word="stretch" behavior="stretch" at={0.9} y={540} size={170} max={1.8} />
        <MeaningGag word="HEAVY" behavior="heavy" at={1.5} y={850} size={190} />
      </>
    ),
  }),
  entry({
    id: "type-beat-grid",
    kind: "piece",
    title: "Type beat grid (music-only)",
    useFor: "Lyric-style lines for music-only films: each word lands on a beat from the BPM, each bar hard-cuts to its own colour block with a 2 f flash, a mono bar/beat counter ticks along the bottom. '*word' = accent, '~word' = serif, '_' = rest.",
    api: '<TypeBeatGrid bpm start lines={["WORDS *ON ~the BEAT", ...]} blocks? beatsPerBar? counter? />',
    seconds: 4.3,
    Demo: () => <TypeBeatGrid bpm={120} start={0.2} lines={["WORDS *ON ~the BEAT", "EACH BAR ~a *NEW BLOCK"]} />,
  }),
];

const Background: FC = () => <Void />;

export const kineticTypeFilm: LibraryTheme = {
  slug: "kinetic-type-film",
  name: "Kinetic type film",
  summary: "Words are the picture: one to three words at a time on a void or a flat colour block, snapping in on the spoken word with Inter at black weight, a serif italic for feeling, mono for tech, and one red accent.",
  feel: ["punchy", "rhythmic", "confident", "loud", "precise"],
  status: "draft",
  board: "data/references/themes/kinetic-type-film.md",
  Background,
  entries,
};

export default kineticTypeFilm;
