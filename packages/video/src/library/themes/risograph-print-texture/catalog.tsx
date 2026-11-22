// Catalog of the risograph theme: one entry and one demo per reusable item, built from the theme board (no video has used it yet).
import type { FC } from "react";
import { AbsoluteFill } from "remotion";
import type { LibraryEntry, LibraryTheme } from "../../core/catalog";
import { BLACK, BLUE, DISPLAY, PINK, SHOUT, YELLOW } from "./theme";
import { Plate, Stage, blobD } from "./press";
import { RisoPaper } from "./halftone";
import { MisregisterText, PrintWords } from "./type";
import { StampLabel } from "./marks";
import { BigStat, Kicker, PullQuote, SourceSlug, Versus, ZineCover, ZineList } from "./pieces";
import { HalftoneBars, OverprintVenn } from "./diagrams";
import { HalftoneSunset, OverprintChart, Separations, laptopPlates } from "./signature";
import { PaperFeed, RollerWipe } from "./transitions";

const ORIGIN = "theme board (data/references/themes/risograph-print-texture.md)";

const Background: FC = () => <RisoPaper />;

const ChapterOne: FC = () => (
  <Stage>
    <Kicker x={180} y={420} text="PART 01" at={-1} />
    <MisregisterText text="The idea" x={176} y={600} size={170} anchor="start" inks={[BLACK]} at={-1} />
  </Stage>
);

const ChapterTwo: FC<{ at: number }> = ({ at }) => (
  <Stage>
    <MisregisterText text="PART 02" x={182} y={420} size={40} font={DISPLAY} weight={800} anchor="start" inks={[BLACK]} at={at} spacing={6} />
    <MisregisterText text="THE BUILD" x={176} y={610} size={170} font={SHOUT} weight={400} anchor="start" inks={[BLUE, YELLOW]} reg={6} at={at + 0.15} />
  </Stage>
);

const PinkField: FC = () => (
  <>
    <Stage>
      <Plate ink={PINK} at={-1}>
        <rect x={-20} y={-20} width={1960} height={1120} />
      </Plate>
    </Stage>
    <ChapterTwo at={-1} />
  </>
);

const ChapterThree: FC<{ at: number }> = ({ at }) => (
  <Stage>
    <Plate ink={YELLOW} at={at}>
      <path d={blobD(1380, 560, 330, 260, 81, 0.12)} />
    </Plate>
    <Kicker x={180} y={420} text="PART 03" at={at + 0.1} ink={BLUE} />
    <MisregisterText text="Shipping it" x={176} y={610} size={170} anchor="start" inks={[BLACK, PINK]} reg={5} at={at + 0.25} />
  </Stage>
);

const entries: LibraryEntry[] = [
  {
    id: "paper",
    kind: "background",
    title: "Riso paper",
    useFor: "The sheet every riso scene prints on: cream stock with fibres and specks, crop marks and side registration targets, a pale yellow halftone bleeding in from a corner that breathes, 1 px paper jitter every 3 frames.",
    api: "<RisoPaper marks? corner? color? />",
    seconds: 1,
    origin: ORIGIN,
    Demo: () => <AbsoluteFill />,
  },
  {
    id: "plates",
    kind: "primitive",
    title: "Spot-ink plates overprint",
    useFor: "The theme's base layer for everything: one pass per ink that multiplies onto what's already printed, lands 4 f after the previous plate with a 6 px → 3 px misregistration spring, kicks wide for emphasis and screens out in halftone dots. Demo is the overprint test sheet.",
    api: "<Plate ink at k? reg? kick? out? tex='ink'|'type'|'stamp'|'none'>svg…</Plate> · <Ink …> for HTML · <OverprintChart at />",
    seconds: 2.6,
    origin: ORIGIN,
    Demo: () => <OverprintChart at={0.15} />,
  },
  {
    id: "zine-cover",
    kind: "piece",
    title: "Zine cover title card",
    useFor: "The hook or title card: a pink kicker strip, a Rubik Mono headline printed in pink and blue over a yellow blob, a rubber stamp and the press-check colour bar.",
    api: "<ZineCover at kicker lines={[…]} sub? stamp? size? out? />",
    seconds: 3,
    origin: ORIGIN,
    Demo: () => <ZineCover at={0.2} kicker="ISSUE 01 · A TECH ZINE" lines={["PRINT IT", "BEFORE IT'S", "PERFECT"]} sub="Shipping ugly, on purpose" stamp="NEW!" size={130} />,
  },
  {
    id: "keyword-print",
    kind: "primitive",
    title: "Words print on their spoken times",
    useFor: "A claim word by word on the narration's word times (each word lands 0.12 s early); the key word prints in pink + blue off-register over a yellow block, and can kick its misregistration on a later mention.",
    api: "<PrintWords words={[{ w, t, key?, block?, kick?, size?, font? }]} size? ink? style={{ top }} out? />",
    seconds: 3.2,
    origin: ORIGIN,
    Demo: () => (
      <>
        <PrintWords style={{ top: 290 }} size={92} words={[{ w: "The", t: 0.3 }, { w: "secret", t: 0.5 }, { w: "isn't", t: 0.8 }, { w: "talent.", t: 1.0 }]} />
        <PrintWords style={{ top: 470 }} size={110} words={[{ w: "It's", t: 1.5 }, { w: "just", t: 1.7 }, { w: "REPS.", t: 2.0, key: true, block: true, kick: 2.5, size: 190, font: SHOUT }]} />
      </>
    ),
  },
  {
    id: "zine-list",
    kind: "piece",
    title: "Numbered zine list",
    useFor: "Steps or a short list (3–4 items): Rubik Mono numerals in pink + blue on yellow dots, each row printing on its cue, dotted rules between, zine art on the right.",
    api: "<ZineList title items={[{ label, note?, t }]} at art? out? />",
    seconds: 3.2,
    origin: ORIGIN,
    Demo: () => (
      <ZineList
        title="THREE THINGS THAT HELPED"
        at={0.2}
        items={[
          { label: "Build something ugly", note: "the first version is a sketch", t: 0.6 },
          { label: "Show five real people", note: "not your friends", t: 1.3 },
          { label: "Ship it anyway", note: "then print the next issue", t: 2.0 },
        ]}
      />
    ),
  },
  {
    id: "big-stat",
    kind: "piece",
    title: "Big number in two passes",
    useFor: "A stat that lands on the spoken number: counts up from `at`, finishes and punches on `land`, pink solid over a blue halftone shadow, inside a yellow halftone burst; the label prints after.",
    api: "<BigStat value at land label note? prefix? suffix? decimals? size? out? />",
    seconds: 2.8,
    origin: ORIGIN,
    Demo: () => <BigStat value={73} suffix="%" at={0.3} land={1.3} label="of the zines I asked were made in a weekend" note="(DEMO FIGURE)" />,
  },
  {
    id: "versus",
    kind: "piece",
    title: "Overprinted A vs B cards",
    useFor: "Comparing two options: a pink card printed with black, a blue card whose words are knocked out to paper, overlapping into violet, a yellow VS dot between.",
    api: "<Versus left={{ tag, title, notes }} right={…} at={{ left, right, vs }} out? />",
    seconds: 2.4,
    origin: ORIGIN,
    Demo: () => (
      <Versus
        left={{ tag: "OPTION A", title: "Tutorials", notes: ["feels productive", "nothing to show"] }}
        right={{ tag: "OPTION B", title: "Projects", notes: ["slow, messy start", "you keep it"] }}
        at={{ left: 0.2, right: 0.6, vs: 1.2 }}
      />
    ),
  },
  {
    id: "pull-quote",
    kind: "piece",
    title: "Pull quote with ink highlight",
    useFor: "A quote or definition held on screen: a giant yellow + pink-halftone quote mark, lines printed in black, one line highlighted by a pink ink stroke on its cue, attribution in blue Courier.",
    api: "<PullQuote lines={[…]} hl? hlAt? who role? at out? />",
    seconds: 2.6,
    origin: ORIGIN,
    Demo: () => <PullQuote at={0.2} lines={["The fastest way to learn", "is to make something", "you actually want to use."]} hl={2} hlAt={1.5} who="Guest Name" role="indie developer · demo" />,
  },
  {
    id: "halftone-bars",
    kind: "piece",
    title: "Halftone bar chart",
    useFor: "Comparing a few values: bars rise uncovering a blue halftone screen, the one that matters is solid pink with a yellow pass that kicks off-register on its cue.",
    api: "<HalftoneBars title bars={[{ label, value }]} max hi? at hiAt? out? />",
    seconds: 2.6,
    origin: ORIGIN,
    Demo: () => (
      <HalftoneBars
        title="ISSUES PRINTED PER MONTH · DEMO"
        at={0.15}
        hiAt={1.6}
        max={10}
        hi={3}
        bars={[{ label: "JAN", value: 3 }, { label: "FEB", value: 5 }, { label: "MAR", value: 4 }, { label: "APR", value: 9 }, { label: "MAY", value: 6 }]}
      />
    ),
  },
  {
    id: "overprint-venn",
    kind: "piece",
    title: "Overprint Venn",
    useFor: "Where things overlap: one circle per ink, so every overlap is a real ink mix and the triple overlap goes nearly black; a leader line names the centre.",
    api: "<OverprintVenn sets={[{ label, ink }×3]} center at centerAt? out? />",
    seconds: 2.6,
    origin: ORIGIN,
    Demo: () => (
      <OverprintVenn at={0.15} centerAt={1.5} center="the sweet spot" sets={[{ label: "Skills", ink: PINK }, { label: "Interest", ink: BLUE }, { label: "Demand", ink: YELLOW }]} />
    ),
  },
  {
    id: "source-slug",
    kind: "piece",
    title: "Rolled-on source slug",
    useFor: "A source label or a name lower third: a yellow ink strip rolls on left to right, the words print over it, a pink tab carries the tag. Hold 2 s+.",
    api: "<SourceSlug tag? title detail? at out? x? bottom? />",
    seconds: 1.8,
    origin: ORIGIN,
    Demo: () => <SourceSlug at={0.3} title="Stack Overflow Developer Survey" detail="survey.stackoverflow.co · 2025 (demo)" />,
  },
  {
    id: "stamp",
    kind: "piece",
    title: "Rubber stamp punch",
    useFor: "A verdict landing on a claim (MYTH, TRUE, SOLD OUT): punches from 1.3× to 1× in 5 frames, blotchy stamp ink, an off-register echo in a second ink.",
    api: "<StampLabel x y text at ink? echo? r? size? w? out? />",
    seconds: 2,
    origin: ORIGIN,
    Demo: () => (
      <>
        <PrintWords style={{ top: 380 }} size={96} words={[{ w: "“You", t: 0.2 }, { w: "need", t: 0.35 }, { w: "a", t: 0.5 }, { w: "CS", t: 0.6 }, { w: "degree.”", t: 0.75 }]} />
        <Stage>
          <StampLabel x={1250} y={600} text="MYTH" ink={PINK} echo={BLUE} size={120} r={-9} at={1.1} />
        </Stage>
      </>
    ),
  },
  {
    id: "roller-wipe",
    kind: "transition",
    title: "Roller wipe to a new ink field",
    useFor: "Chapter changes: a roller sweeps the next colour field across in 14 frames, wet dark band and halftone spray at its edge; the old scene disappears under it and the next prints onto the field.",
    api: "<RollerWipe at ink? frames? before={<Scene/>} after={<Scene/>} /> · rollerEdge(f, fps, at)",
    seconds: 2.6,
    origin: ORIGIN,
    Demo: () => <RollerWipe at={0.9} ink={PINK} before={<ChapterOne />} after={<ChapterTwo at={1.5} />} />,
  },
  {
    id: "paper-feed",
    kind: "transition",
    title: "Paper feed",
    useFor: "Back to clean paper after a colour field, or any 'next page' beat: the printed sheet is pulled up and out, skewed, with a fresh sheet feeding in right behind it.",
    api: "<PaperFeed at frames? before={<Scene/>} after={<Scene/>} />",
    seconds: 2.7,
    origin: ORIGIN,
    Demo: () => <PaperFeed at={0.85} before={<PinkField />} after={<ChapterThree at={1.5} />} />,
  },
  {
    id: "halftone-sunset",
    kind: "piece",
    title: "Three-drum halftone sunset",
    useFor: "Signature art for music-only holds, intros and chapter openers: yellow sun and glow, pink sky screen and blue sea screen print one by one; dots keep breathing ±5 %.",
    api: "<HalftoneSunset at caption? out? /> · <Halftone x y w h tone={linearTone|radialTone} cell ink grow breathe clip />",
    seconds: 2.5,
    origin: ORIGIN,
    Demo: () => <HalftoneSunset at={0.15} />,
  },
  {
    id: "separations",
    kind: "piece",
    title: "Colour separations come together",
    useFor: "How the parts make the whole: each ink plate shown alone, then all slide together and land in register as one print. Pass your own plates (art in local coords around 0,0).",
    api: "<Separations plates={laptopPlates() | [{ ink, name, art }]} at join caption? out? />",
    seconds: 3.4,
    origin: ORIGIN,
    Demo: () => <Separations plates={laptopPlates()} at={0.2} join={1.6} caption="3 DRUMS → 1 PRINT" />,
  },
];

export const risographPrintTexture: LibraryTheme = {
  slug: "risograph-print-texture",
  name: "Risograph print",
  summary: "Cream stock and three fluorescent spot inks (pink, blue, yellow) plus riso black, each printed as its own off-register pass that multiplies where it overlaps, with ink grain, halftone screens and zine layouts.",
  feel: ["handmade", "warm", "indie", "zine", "imperfect"],
  status: "draft",
  board: "data/references/themes/risograph-print-texture.md",
  Background,
  entries,
};

export default risographPrintTexture;
