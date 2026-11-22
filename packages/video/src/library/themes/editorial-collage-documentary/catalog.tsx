// Catalog of the editorial collage documentary theme: one entry and one self-explaining demo per reusable piece, drawn stand-ins in place of photos.
import type { FC } from "react";
import type { LibraryEntry, LibraryTheme } from "../../core/catalog";
import { useTime } from "../../core/time";
import { COND, INK, MUTED, YELLOW } from "./theme";
import { Caption, Cutout, FullStage, PaperDesk, Slip, TypeLine } from "./paper";
import { Hi, MarkerArrow, MarkerCircle } from "./marks";
import { BigNumber, Claim, ClippingList, CollageTitle, DateStamp, LowerThird, PullQuote, Ticker, Versus } from "./pieces";
import { EvidenceBoard, NewsClip, Redaction, SourceLine } from "./documents";
import { ChapterCard, TornWipe } from "./transitions";

const ORIGIN = "editorial-collage-documentary board (library build, no video yet)";

const PaperDemo: FC = () => (
  <Caption style={{ position: "absolute", left: 96, bottom: 96 }} size={32} color={INK}>
    NEWSPRINT DESK · #EDE6D6 · grain flickers at 8 fps
  </Caption>
);

const CutoutDemo: FC = () => {
  const { t } = useTime();
  const items = [
    { x: 400, subject: "portrait" as const, treatment: "news" as const, label: "NEWSPRINT", rot: -3, at: 0.2 },
    { x: 960, subject: "server" as const, treatment: "plate" as const, label: "PLATE DUOTONE", rot: 2, at: 0.45 },
    { x: 1520, subject: "chip" as const, treatment: "red" as const, label: "RED PLATE", rot: -1.5, at: 0.7 },
  ];
  return (
    <>
      {items.map((it, i) => (
        <div key={i}>
          <Cutout x={it.x} y={470} w={480} h={560} rot={it.rot} seed={31 + i * 6} at={it.at} subject={it.subject} treatment={it.treatment} edges={i === 1 ? { top: 2, right: 2, bottom: 2, left: 10 } : undefined} />
          {t > it.at + 0.4 && (
            <div style={{ position: "absolute", left: it.x, top: 800, transform: "translateX(-50%)" }}>
              <Caption size={32} color={INK}>{it.label}</Caption>
            </div>
          )}
        </div>
      ))}
    </>
  );
};

const AnnotateDemo: FC = () => (
  <>
    <Cutout x={760} y={545} w={1000} h={700} rot={-1.5} seed={51} at={0} from="none" subject="server" treatment="plate" push={[0, 3, 0.05]} tape="corners" />
    <FullStage>
      <MarkerCircle cx={762} cy={478} rx={170} ry={105} at={0.5} />
      <MarkerArrow x1={1440} y1={330} x2={960} y2={430} at={1.0} bow={-0.15} />
    </FullStage>
    <div style={{ position: "absolute", left: 1340, top: 190 }}>
      <Slip seed={57} bg={YELLOW} rot={3} style={{ fontFamily: COND, fontWeight: 700, fontSize: 56, padding: "6px 30px", opacity: 1 }}>
        <TypeLine text="WHERE IT ALL RUNS" at={1.25} size={46} cursor={false} style={{ fontFamily: COND, fontWeight: 700 }} />
      </Slip>
    </div>
  </>
);

const NewsDemo: FC = () => (
  <>
    <NewsClip
      at={0.1}
      zoomAt={1.1}
      hiAt={2.4}
      headline="Pocket computer sells out on its first morning"
      dek="Queues formed overnight outside stores in four cities."
      quote="Analysts had expected the device to struggle beyond a small circle of enthusiasts."
      col1={[
        "By mid-morning the shelves were bare. Staff at several stores said the first deliveries had been smaller than promised, and many buyers left with a paper voucher instead of a box.",
        "The company declined to say how many units it had shipped, saying only that demand had been higher than its own forecasts.",
      ]}
      col2={[
        "Instead, the earliest buyers were students, nurses and taxi drivers, people who had never owned a computer of any kind and saw no reason to start.",
        "Rivals were quick to dismiss the launch as a novelty that would fade before the winter.",
      ]}
    />
    <SourceLine text="The Morning Ledger (demo page)" at={3.1} x={96} y={940} />
  </>
);

const WipeFrom: FC = () => <ChapterCard n="01" title="The chip" kicker="where the money came from" bg="plate" />;
const WipeTo: FC = () => <ChapterCard n="02" title="The phone" kicker="where it went" kickerAt={1.6} bg="red" />;

const entries: LibraryEntry[] = [
  {
    id: "paper",
    kind: "background",
    title: "Newsprint desk",
    useFor: "The surface every collage scene sits on: warm newsprint, mottling, paper fibres and three grain tiles that flicker at 8 fps so holds never freeze. GrainOverlay puts the same flicker over full-frame plates or footage.",
    api: "<PaperDesk /> · <GrainOverlay opacity? />",
    seconds: 1.5,
    origin: ORIGIN,
    Demo: PaperDemo,
  },
  {
    id: "photo-cutout",
    kind: "primitive",
    title: "Photo cutout (halftone / duotone)",
    useFor: "Any photo, screenshot or footage still: cut out with a paper rim, torn or scissored edges, hard 6 px shadow, tilt and tape; drops in on 12 fps steps with a rotation settle. Pass `src` for a real image; without it a drawn stand-in subject prints through the same filters.",
    api: "<Cutout x y w h rot seed at from=drop|left|right|pop src? subject=portrait|laptop|skyline|chip|server|phone|crowd treatment=news|plate|red|mono tape edges push? />",
    seconds: 2.5,
    origin: ORIGIN,
    Demo: CutoutDemo,
  },
  {
    id: "collage-title",
    kind: "piece",
    title: "Ransom-note hook card",
    useFor: "The video's hook or title: cutouts assemble around a headline of mismatched cut-out words, each landing on its spoken time, while the camera pushes 5 % with foreground parallax.",
    api: "<CollageTitle lines={[[{ w, at, look, font, size? }]]} kicker={{ text, at }} cutouts={CutoutProps[]} push={[a, b]} />",
    seconds: 4,
    origin: ORIGIN,
    Demo: () => (
      <CollageTitle
        kicker={{ text: "PART 1 — THE ORIGIN STORY", at: 0.7 }}
        push={[0, 4]}
        cutouts={[
          { x: 330, y: 250, w: 520, h: 360, rot: -4, seed: 61, at: 0.1, subject: "skyline", treatment: "plate" },
          { x: 1600, y: 240, w: 460, h: 340, rot: 3, seed: 62, at: 0.23, subject: "chip", treatment: "red", tape: "corners" },
          { x: 300, y: 850, w: 420, h: 380, rot: 2.5, seed: 63, at: 0.37, subject: "portrait", treatment: "news" },
          { x: 1630, y: 850, w: 440, h: 360, rot: -3, seed: 64, at: 0.5, subject: "phone", treatment: "mono" },
        ]}
        lines={[
          [
            { w: "How", at: 0.9, look: "sheet", font: "serif" },
            { w: "one", at: 1.1, look: "news", font: "italic" },
            { w: "tiny", at: 1.3, look: "yellow", font: "cond" },
          ],
          [
            { w: "chip", at: 1.6, look: "red", font: "serif", size: 1.2 },
            { w: "ate", at: 1.85, look: "sheet", font: "type" },
            { w: "the", at: 2.0, look: "plate", font: "italic" },
            { w: "world", at: 2.2, look: "ink", font: "cond" },
          ],
        ]}
      />
    ),
  },
  {
    id: "highlight-claim",
    kind: "piece",
    title: "Claim with highlighter",
    useFor: "The key claim of a beat, word by word on the narration; the word that matters gets the yellow highlighter wipe (10 f) or a red marker underline / loop on its beat.",
    api: "<Claim kicker lines={[[{ w, t, mark?: 'hi'|'underline'|'circle', red? }]]} size? /> · inline: <Hi at>…</Hi> <Marked at kind>…</Marked>",
    seconds: 3.5,
    origin: ORIGIN,
    Demo: () => (
      <>
        <Cutout x={1520} y={560} w={520} h={660} rot={3} seed={71} at={0.1} subject="phone" treatment="plate" />
        <Claim
          kicker="The claim"
          kickerAt={0.2}
          style={{ position: "absolute", left: 140, top: 270 }}
          lines={[
            [{ w: "Nobody", t: 0.4, mark: "underline" }, { w: "bought", t: 0.7 }],
            [{ w: "the", t: 0.9 }, { w: "phone", t: 1.05 }, { w: "for", t: 1.25 }],
            [{ w: "the", t: 1.4 }, { w: "hardware.", t: 1.6, mark: "hi" }],
          ]}
        />
      </>
    ),
  },
  {
    id: "marker-annotate",
    kind: "primitive",
    title: "Marker loop and arrow",
    useFor: "Pointing at the detail in a photo or screenshot as it's named: a rough red loop draws on in 12 f, an arrow flicks in from a label; both boil at 12 fps.",
    api: "<FullStage><MarkerCircle cx cy rx ry at /><MarkerArrow x1 y1 x2 y2 at bow? /><MarkerUnderline x1 x2 y at double? /></FullStage>",
    seconds: 3,
    origin: ORIGIN,
    Demo: AnnotateDemo,
  },
  {
    id: "clipping-list",
    kind: "piece",
    title: "Clipping list",
    useFor: "Steps, reasons or a short agenda: strips torn from different pages slide in on their cue; `focus` highlights the row being discussed and dims the rest.",
    api: "<ClippingList items={[{ text, at, n?, note? }]} focus={[s…]} x y gap />",
    seconds: 4,
    origin: ORIGIN,
    Demo: () => (
      <>
        <Claim kicker="How it won" kickerAt={0} size={88} style={{ position: "absolute", left: 140, top: 110 }} lines={[[{ w: "Three", t: 0.1 }, { w: "moves", t: 0.2 }]]} />
        <ClippingList
          x={140}
          y={350}
          gap={190}
          focus={[2.0, 2.7, 3.3]}
          items={[
            { text: "Make it cheap", at: 0.5 },
            { text: "Make it small", at: 0.8 },
            { text: "Put it everywhere", at: 1.1 },
          ]}
        />
        <Cutout x={1480} y={560} w={620} h={560} rot={2.5} seed={81} at={0.3} subject="laptop" treatment="news" />
      </>
    ),
  },
  {
    id: "big-number",
    kind: "piece",
    title: "Stamped number on a clipping",
    useFor: "The one stat of a beat: a torn newsprint clipping drops, the number hits 1.15 → 1 in 6 f on the spoken number, a red marker loop circles it, the label types on a yellow strip.",
    api: "<BigNumber value at label kicker? circleAt? labelAt? x y size? />",
    seconds: 3,
    origin: ORIGIN,
    Demo: () => <BigNumber value="$4.7B" at={0.7} kicker="FIG. 2 · DEMO FIGURE" label="spent before the first sale" />,
  },
  {
    id: "date-stamp",
    kind: "piece",
    title: "Date stamp",
    useFor: "Pinning the story to a date: a big typewriter date slammed on like a rubber stamp (worn ink, bleed, faint double strike, a 2 px table thump), the caption typed after.",
    api: "<DateStamp date at line? caption? captionAt? x y rot? /> · <RubberStamp at w h>svg text</RubberStamp>",
    seconds: 3,
    origin: ORIGIN,
    Demo: () => (
      <>
        <Cutout x={470} y={300} w={600} h={400} rot={-3} seed={91} at={0} from="none" subject="crowd" treatment="mono" tape="corners" />
        <DateStamp date="29 JUNE 2007" at={0.8} caption="the morning the queues formed" captionAt={1.4} x={1090} y={640} />
      </>
    ),
  },
  {
    id: "versus",
    kind: "piece",
    title: "Versus",
    useFor: "A vs B, then vs now, rumour vs reality: two cutouts slide in from opposite sides on torn label plates, a yellow 'vs.' slip slams between them, the winner gets underlined.",
    api: "<Versus left={{ label, sub?, subject|src, treatment?, at }} right={…} vsAt winner? winAt? />",
    seconds: 2.5,
    origin: ORIGIN,
    Demo: () => (
      <Versus
        left={{ label: "Desktop", sub: "plugged into a wall", subject: "laptop", at: 0.2 }}
        right={{ label: "Mobile", sub: "in every pocket", subject: "phone", at: 0.5 }}
        vsAt={0.9}
        winner="right"
        winAt={1.5}
      />
    ),
  },
  {
    id: "pull-quote",
    kind: "piece",
    title: "Pull quote with portrait",
    useFor: "Quoting a person or a document: halftone portrait cutout, the quote on a torn clipping with a giant red mark, the line that matters highlighted on its beat, attribution typed.",
    api: "<PullQuote quote={<>…<Hi at>key line</Hi></>} by at byAt? subject|src />",
    seconds: 3.5,
    origin: ORIGIN,
    Demo: () => (
      <PullQuote
        at={0.2}
        byAt={1.9}
        by="Guest Name, design lead · demo"
        quote={
          <>
            We weren't building a phone. We were building <Hi at={1.6}>the thing you'd never put down.</Hi>
          </>
        }
      />
    ),
  },
  {
    id: "evidence-board",
    kind: "piece",
    title: "Red-string evidence board",
    useFor: "A diagram of how things connect (who funded what, which part led to which): photos and index cards pin in, red string sags from pin to pin as the narrator links them.",
    api: "<EvidenceBoard nodes={[{ x, y, w, h, label, at, rot?, subject|src|note }]} links={[{ from, to, at }]} />",
    seconds: 3.6,
    origin: ORIGIN,
    Demo: () => (
      <EvidenceBoard
        nodes={[
          { x: 330, y: 320, w: 380, h: 290, label: "the chip", at: 0.1, rot: -3, subject: "chip", treatment: "red" },
          { x: 880, y: 290, w: 400, h: 290, label: "the data centre", at: 0.3, rot: 2, subject: "server", treatment: "plate" },
          { x: 1500, y: 330, w: 400, h: 290, label: "the users", at: 0.5, rot: -2, subject: "crowd" },
          { x: 640, y: 770, w: 400, h: 250, label: "", at: 0.7, rot: 2.5, note: "who paid for it?" },
          { x: 1270, y: 760, w: 400, h: 290, label: "the phone", at: 0.9, rot: -1.5, subject: "phone", treatment: "mono" },
        ]}
        links={[
          { from: 0, to: 3, at: 1.3 },
          { from: 3, to: 1, at: 1.7 },
          { from: 1, to: 4, at: 2.1 },
          { from: 4, to: 2, at: 2.5 },
        ]}
      />
    ),
  },
  {
    id: "lower-third",
    kind: "piece",
    title: "Stepped lower third",
    useFor: "Naming a speaker, a company or a place: stacked torn plates revealed by a jagged mask in 2–3 frame steps, text arriving 4 f later; swipes off in 8 f at `out`.",
    api: "<LowerThird name role at out? x? y? />",
    seconds: 2.5,
    origin: ORIGIN,
    Demo: () => (
      <>
        <Cutout x={1240} y={470} w={880} h={720} rot={1.5} seed={111} at={0} from="none" subject="portrait" treatment="plate" push={[0, 2.5, 0.05]} focus={[0.5, 0.35]} />
        <LowerThird name="Guest Name" role="former chip designer · demo" at={0.6} />
      </>
    ),
  },
  {
    id: "news-clip",
    kind: "piece",
    title: "Newspaper clip zoom",
    useFor: "Showing evidence from an article or screenshot: the page drops onto the desk, the camera pushes in to one sentence and the highlighter wipes across it; a typed SOURCE strip follows.",
    api: "<NewsClip at zoomAt hiAt headline dek quote col1 col2 | src focus={{ x, y, s }} hiBox /> · <SourceLine text at x y />",
    seconds: 4.5,
    origin: ORIGIN,
    Demo: NewsDemo,
  },
  {
    id: "redaction",
    kind: "piece",
    title: "Redacted memo",
    useFor: "Secrets, leaks, 'what they didn't say': a typed memo where black bars stamp over phrases in stepped frames, a CONFIDENTIAL stamp hits, then one bar peels away to reveal the word.",
    api: "<Redaction fields lines={[['text', { r, at, reveal? }]]} at stampAt? stampText? />",
    seconds: 3.4,
    origin: ORIGIN,
    Demo: () => (
      <Redaction
        at={0.1}
        stampAt={1.9}
        fields={[
          ["TO:   ", { r: "All regional managers", at: 0.6 }],
          ["FROM: ", { r: "Office of the CEO", at: 0.75 }],
          ["RE:   Project ", { r: "LANTERN", at: 0.9, reveal: 2.5 }],
        ]}
        lines={[
          ["The device ships in ", { r: "eleven weeks", at: 1.1 }, "."],
          ["Do not discuss the ", { r: "price", at: 1.3 }, " with anyone."],
          ["First run: ", { r: "40,000 units", at: 1.5 }, " (demo memo)."],
        ]}
      />
    ),
  },
  {
    id: "ticker",
    kind: "piece",
    title: "News ticker",
    useFor: "A run of supporting stats under a scene (or under a music-only montage): a torn ink band with a red label block, items scrolling on a frame-driven translateX.",
    api: "<Ticker items={[{ value, label }]} at title? speed? y? />",
    seconds: 3,
    origin: ORIGIN,
    Demo: () => (
      <>
        <Cutout x={960} y={410} w={1320} h={620} rot={-1} seed={121} at={0} from="none" subject="skyline" treatment="plate" push={[0, 3, 0.05]} tape="corners" />
        <Ticker
          at={0.4}
          title="BY THE NUMBERS"
          items={[
            { value: "4.2M", label: "units in year one" },
            { value: "+38%", label: "share of market" },
            { value: "$499", label: "launch price" },
            { value: "11", label: "countries" },
          ]}
        />
        <Caption size={28} color={MUTED} style={{ position: "absolute", right: 110, top: 990 }}>demo figures</Caption>
      </>
    ),
  },
  {
    id: "torn-wipe",
    kind: "transition",
    title: "Paper-rip wipe + chapter plate",
    useFor: "The punctuation transition between chapters: the outgoing scene tears down a jagged line and both halves pull apart with white fibre edges, revealing the next. ChapterCard is the halftone-numeral plate it usually reveals.",
    api: "<TornWipe at dur? from={<SceneA />} to={<SceneB />} seed? /> · <ChapterCard n title kicker? bg=plate|red|ink />",
    seconds: 2.4,
    origin: ORIGIN,
    Demo: () => <TornWipe at={0.7} dur={0.7} from={<WipeFrom />} to={<WipeTo />} />,
  },
];

export const editorialCollageDocumentary: LibraryTheme = {
  slug: "editorial-collage-documentary",
  name: "Editorial collage documentary",
  summary: "Vox-style explainer collage: halftone and duotone photo cutouts with torn edges and tape on flickering newsprint, red marker loops, yellow highlighter, ransom-note headlines and stepped 12 fps assembly.",
  feel: ["editorial", "tactile", "urgent", "credible", "slightly gritty"],
  status: "draft",
  board: "data/references/themes/editorial-collage-documentary.md",
  Background: PaperDesk,
  entries,
};

export default editorialCollageDocumentary;
