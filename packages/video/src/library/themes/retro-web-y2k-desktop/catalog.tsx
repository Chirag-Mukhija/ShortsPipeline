// Catalog of the retro web / Y2K desktop theme: one entry and one small demo per reusable piece, all drawn from scratch for the motion library.
import type { FC } from "react";
import type { LibraryEntry, LibraryTheme } from "../../core/catalog";
import { Track } from "../../core/beat";
import { INK, NAVY, PIXEL, RED, TYPE, WHITE, WORD, YELLOW } from "./theme";
import { Blink, Desktop, Marquee, OsWindow, StarField, Taskbar, TypeOn } from "./chrome";
import { DOC, MAIL, Pix } from "./pixels";
import { HitCounter, SelectLine, WordArt } from "./type";
import { AddressBar, DeskIcon, Guestbook, NetworkMap, ProgressBlocks, SetupWizard, Versus } from "./pieces";
import { DialogCascade, DockOpen, GlitchCut, PlanetOrbitMenu, PlayerWindow } from "./signature";

const ORIGIN = "built for the motion library (retro-web-y2k-desktop board)";

// A 16-point starburst sticker, the era's "NEW!" badge.
const Burst: FC<{ x: number; y: number; text: string; r?: number }> = ({ x, y, text, r = 110 }) => {
  const pts = Array.from({ length: 32 }, (_, i) => {
    const a = (i / 32) * Math.PI * 2;
    const rr = i % 2 ? r * 0.72 : r;
    return `${Math.cos(a) * rr},${Math.sin(a) * rr}`;
  }).join(" ");
  return (
    <svg width={r * 2 + 20} height={r * 2 + 20} viewBox={`${-r - 10} ${-r - 10} ${r * 2 + 20} ${r * 2 + 20}`} style={{ position: "absolute", left: x - r - 10, top: y - r - 10, transform: "rotate(-12deg)" }}>
      <polygon points={pts} fill={YELLOW} stroke={INK} strokeWidth={6} strokeLinejoin="round" />
      <text textAnchor="middle" y={r * 0.17} fontFamily={WORD} fontSize={r * 0.5} fill={RED} stroke={INK} strokeWidth={3} paintOrder="stroke">{text}</text>
    </svg>
  );
};

const Page: FC = () => (
  <div>
    {[[70, NAVY], [100, "#BBB"], [86, "#BBB"], [60, "#BBB"]].map(([w, c], i) => (
      <div key={i} style={{ height: i ? 30 : 56, width: `${w}%`, background: c as string, marginBottom: 22 }} />
    ))}
  </div>
);

const entries: LibraryEntry[] = [
  {
    id: "starfield",
    kind: "background",
    title: "Drifting starfield",
    useFor: "The space-black page every hook, number and orbit sits on: tiled pixel stars drifting 1 px a frame, sparkles flipping between two states, a shooting star every 4 s, faint scanlines.",
    api: "<StarField seed? count? glow? />",
    seconds: 3,
    origin: ORIGIN,
    Demo: () => (
      <Marquee text="*** welcome to my homepage *** you are now surfing the information superhighway ***" width={1728} size={60} color={YELLOW} speed={7} style={{ position: "absolute", left: 96, top: 860 }} />
    ),
  },
  {
    id: "os-window",
    kind: "primitive",
    title: "Bevelled window: snap open, collapse to icon",
    useFor: "Any content that should live 'inside the computer': a window snaps from a one-line outline to full in 5 frames, or collapses to its title bar and zooms into an icon on exit.",
    api: '<OsWindow x y w h title icon? at? closeAt? closeTo? from? tone="chrome|pastel" menu? status? body? frozen?>…</OsWindow> · <Desktop tone> · <Taskbar> · <DeskIcon>',
    seconds: 3,
    origin: ORIGIN,
    Demo: () => (
      <Desktop tone="teal">
        <DeskIcon icon="computer" label="My Machine" x={210} y={140} />
        <DeskIcon icon="mail" label="Inbox" x={210} y={330} />
        <DeskIcon icon="trash" label="Trash" x={210} y={520} selected />
        <OsWindow x={940} y={150} w={820} h={520} title="old_page.htm" icon={DOC} closeAt={1.4} closeTo={{ x: 210, y: 560 }} body="white">
          <Page />
        </OsWindow>
        <OsWindow x={480} y={200} w={1080} h={560} title="readme.txt" icon={DOC} at={0.4} menu={["File", "Edit", "Search", "Help"]} status="Ln 2, Col 38">
          <div style={{ fontFamily: TYPE, fontWeight: 700, fontSize: 52, lineHeight: 1.35, color: INK }}>
            <TypeOn text="Hello, world." at={0.8} cps={22} caret={false} />
            <br />
            <TypeOn text="This window snapped open in 5 frames." at={1.5} cps={30} />
          </div>
        </OsWindow>
        <Taskbar tasks={["readme.txt", "old_page.htm"]} active={0} />
      </Desktop>
    ),
  },
  {
    id: "wordart-title",
    kind: "piece",
    title: "WordArt hook card",
    useFor: "The title or hook: extruded gradient WordArt whose letters pop in one by one and keep wobbling, a NEW! starburst and a marquee underneath.",
    api: '<WordArt text x y size at look="rainbow|chrome|sunset|lime" shape="arch|slant|wave|flat" wobble? />',
    seconds: 3.5,
    origin: ORIGIN,
    Demo: () => (
      <>
        <WordArt text="The Old Web" x={960} y={430} size={210} at={0.3} look="rainbow" shape="arch" />
        <div style={{ position: "absolute", left: "50%", top: 640, transform: "translateX(-50%)", padding: "10px 30px", background: NAVY, border: `4px solid ${WHITE}`, fontFamily: PIXEL, fontSize: 60, color: WHITE, whiteSpace: "nowrap" }}>
          <TypeOn text="EP. 01 - how the internet used to feel" at={1.3} cps={40} caretColor={YELLOW} />
        </div>
        <Blink at={1.9}>
          <Burst x={1690} y={215} r={100} text="NEW!" />
        </Blink>
        <Marquee text="*** best viewed at 1920x1080 *** sign the guestbook *** under construction ***" width={1728} size={50} color={YELLOW} speed={7} style={{ position: "absolute", left: 96, top: 880 }} />
      </>
    ),
  },
  {
    id: "select-keyword",
    kind: "primitive",
    title: "Keyword gets drag-selected",
    useFor: "A key word or claim landing on its spoken word: the line types on word by word, then an I-beam drags a navy selection over the key word, which blinks twice and stays selected.",
    api: "<SelectLine words={[{ w, t }]} keyIndex selAt size? />",
    seconds: 3,
    origin: ORIGIN,
    Demo: () => (
      <Desktop tone="teal">
        <OsWindow x={200} y={220} w={1520} h={560} title="claim.txt" icon={DOC} menu={["File", "Edit", "Format", "Help"]} pad={50}>
          <SelectLine words={["The", "web", "used", "to", "be", "weird."].map((w, i) => ({ w, t: 0.2 + i * 0.18 }))} keyIndex={5} selAt={1.5} size={150} />
        </OsWindow>
      </Desktop>
    ),
  },
  {
    id: "setup-wizard-steps",
    kind: "piece",
    title: "Setup wizard steps",
    useFor: "A list or step-by-step process: each step is ticked as it's said, the cursor clicks Next on the cue, chunky blocks fill the progress bar.",
    api: "<SetupWizard steps={[{ label, at }]} title? heading? doneAt? at? />",
    seconds: 4.6,
    origin: ORIGIN,
    Demo: () => (
      <Desktop tone="teal">
        <SetupWizard
          title="Setup Wizard"
          heading="Installing: your first project"
          steps={[{ label: "Pick a tiny idea", at: 0.4 }, { label: "Build the ugly version", at: 1.4 }, { label: "Show five real people", at: 2.4 }, { label: "Ship it anyway", at: 3.4 }]}
          doneAt={4.1}
        />
      </Desktop>
    ),
  },
  {
    id: "hit-counter",
    kind: "piece",
    title: "Visitor hit counter",
    useFor: "A big number or stat: an odometer of LED digits rolls up and lands with a punch, the context caption arrives after.",
    api: "<HitCounter value at dur? digits? x y cell? label? caption? digitColor? />",
    seconds: 3,
    origin: ORIGIN,
    Demo: () => <HitCounter value={1337042} at={0.3} dur={1.6} x={960} y={520} label="YOU ARE VISITOR NO." caption="people have seen this page since 1996" />,
  },
  {
    id: "versus-not-responding",
    kind: "piece",
    title: "A vs B: the loser stops responding",
    useFor: "Comparing two options: two windows open with their points, a WordArt VS lands, then the loser freezes (white wash, '(Not Responding)', hourglass cursor) and the winner gets a blinking badge.",
    api: '<Versus a={{ title, name, lines, icon }} b={…} at={{ a, b, vs, verdict }} winner="a|b" />',
    seconds: 4.4,
    origin: ORIGIN,
    Demo: () => (
      <Desktop tone="teal">
        <Versus
          a={{ title: "HOME.HTM", name: "Old web", lines: ["hand-made pages", "guestbooks", "weird on purpose"], icon: "globe" }}
          b={{ title: "FEED.APP", name: "New web", lines: ["endless scroll", "one template", "weird by accident"], icon: "computer" }}
          at={{ a: 0.2, b: 0.6, vs: 1.2, verdict: 2.6 }}
          winner="a"
        />
      </Desktop>
    ),
  },
  {
    id: "guestbook-quote",
    kind: "piece",
    title: "Guestbook quote",
    useFor: "A quote or callout: a pastel guestbook page whose entry types itself in typewriter face, signed with a heart; blue underlined links at the foot.",
    api: "<Guestbook quote author meta? at cps? entry? title? />",
    seconds: 4.4,
    origin: ORIGIN,
    Demo: () => (
      <Desktop tone="pink">
        <Guestbook quote="Your quote goes here, typed out one letter at a time like it's 1999." author="Guest Name" meta="03/14/1999 11:41 PM" at={0.6} cps={44} />
      </Desktop>
    ),
  },
  {
    id: "network-map",
    kind: "piece",
    title: "Network map with a hopping packet",
    useFor: "A diagram or flow: pixel machines pop in on their cues, marching dashed cables link them, and an envelope hops from node to node in 3-frame steps.",
    api: '<NetworkMap nodes={[{ label, icon, at }]} links? packetAt? hop? title? />',
    seconds: 4.5,
    origin: ORIGIN,
    Demo: () => (
      <Desktop tone="teal">
        <NetworkMap
          title="how a page got to you"
          nodes={[{ label: "your PC", icon: "computer", at: 0.3 }, { label: "the ISP", icon: "server", at: 0.7 }, { label: "the web", icon: "globe", at: 1.1 }, { label: "the page", icon: "doc", at: 1.5 }]}
          links={["56k", "phone line", "HTTP"]}
          packetAt={1.8}
        />
      </Desktop>
    ),
  },
  {
    id: "progress-blocks",
    kind: "piece",
    title: "Chunky download progress",
    useFor: "Waiting, loading, 'this takes forever', or a percentage: blocks fill in lurches, documents fly floppy-to-globe, the time remaining makes no sense.",
    api: "<ProgressBlocks file to? at dur? blocks? remaining? title? from? dest? />",
    seconds: 4,
    origin: ORIGIN,
    Demo: () => (
      <Desktop tone="teal">
        <ProgressBlocks file="the_whole_internet.zip" to={0.72} at={0.4} dur={2.6} />
      </Desktop>
    ),
  },
  {
    id: "address-bar-source",
    kind: "piece",
    title: "Address-bar source label",
    useFor: "A source label or lower third: a browser address bar rises in stepped jumps, the URL types itself, Go presses, the status bar says Done.",
    api: "<AddressBar url at label? status? x? w? />",
    seconds: 3,
    origin: ORIGIN,
    Demo: () => (
      <Desktop tone="teal">
        <OsWindow x={300} y={96} w={1320} h={560} title="homepage.htm" icon={DOC} body="white" pad={40}>
          <Page />
        </OsWindow>
        <AddressBar url="www.example.com/the-source" at={0.4} />
      </Desktop>
    ),
  },
  {
    id: "dialup-glitch-cut",
    kind: "transition",
    title: "Dial-up glitch cut",
    useFor: "Changing scene or chapter: the old scene tears into sliding horizontal bars, a Dial-Up Connection box dials through its statuses, then the new scene glitches in.",
    api: "<GlitchCut a={<SceneA/>} b={<SceneB/>} at hold? glitch? seed? /> · <GlitchBands scene seed amount />",
    seconds: 3.4,
    origin: ORIGIN,
    Demo: () => (
      <GlitchCut
        at={0.8}
        hold={1.0}
        a={
          <Desktop tone="teal">
            <OsWindow x={360} y={200} w={1200} h={560} title="part_1.htm" icon={DOC} pad={50}>
              <Page />
            </OsWindow>
          </Desktop>
        }
        b={
          <>
            <StarField seed={21} />
            <WordArt text="Part 2" x={960} y={520} size={230} look="lime" shape="slant" />
          </>
        }
      />
    ),
  },
  {
    id: "planet-orbit-menu",
    kind: "piece",
    title: "Planet orbit menu",
    useFor: "An agenda, a set of topics or 'everything that lived on the web': labelled planets pop in on their cues and orbit a WordArt logo; focus one and the rest dim.",
    api: "<PlanetOrbitMenu items={[{ label, at, look? }]} logo logoAt? rx? ry? r? speed? focus={{ index, at }} /> · <Planet r look />",
    seconds: 5,
    origin: ORIGIN,
    Demo: () => (
      <PlanetOrbitMenu
        logo="THE WEB"
        logoAt={0.1}
        items={["Search", "Email", "Chat rooms", "Guestbooks", "Homepages", "Forums", "Downloads"].map((label, i) => ({ label, at: 0.5 + i * 0.25 }))}
        focus={{ index: 3, at: 3.6 }}
      />
    ),
  },
  {
    id: "dialog-cascade",
    kind: "piece",
    title: "Frozen dialog trail",
    useFor: "Chaos, overload, 'everything broke' or an ironic claim: a warning dialog is dragged across a frozen screen leaving a copy every 2 frames; the last copy carries the line.",
    api: "<DialogCascade text sub? title? at count? from? to? w? h? clearAt? />",
    seconds: 3,
    origin: ORIGIN,
    Demo: () => (
      <Desktop tone="teal">
        <DialogCascade text="Everything is fine." sub="(it was not fine)" at={0.3} count={14} from={{ x: 110, y: 100 }} to={{ x: 700, y: 470 }} />
      </Desktop>
    ),
  },
  {
    id: "media-player",
    kind: "piece",
    title: "Vaporwave media player (music-only)",
    useFor: "Music-only loops and 'now playing' moments: a pastel player whose drawn sunset screen, LED clock and block spectrum all move to the beat clock; marquee track title, playlist with the current track lit.",
    api: "<Track spec={{ bpm, sections }}><PlayerWindow tracks={[{ title, artist, len }]} current? title? at? /></Track>",
    seconds: 6,
    origin: ORIGIN,
    Demo: () => (
      <Desktop tone="pink">
        <Track spec={{ bpm: 96, sections: [{ name: "build", start: 0, end: 3 }, { name: "peak", start: 3, end: 6 }] }}>
          <PlayerWindow
            at={0.2}
            tracks={[{ title: "Mall Fountain", artist: "Artist Name", len: "3:24" }, { title: "Dial Tone Dreams", artist: "Artist Name", len: "2:58" }, { title: "Screensaver", artist: "Artist Name", len: "4:10" }, { title: "Low Battery", artist: "Artist Name", len: "3:02" }, { title: "Modem Lullaby", artist: "Artist Name", len: "2:47" }]}
            current={1}
          />
        </Track>
      </Desktop>
    ),
  },
  {
    id: "dock-open",
    kind: "piece",
    title: "Cursor opens an app from the dock",
    useFor: "Introducing a tool, app or section: the cursor glides to a dock icon in 3-frame steps, the icon lifts, a click ripples and the window zooms out of the icon.",
    api: "<DockOpen items={[{ label, icon }]} open at win={{ x, y, w, h, title }}>…</DockOpen> · <DesktopDock> · <FakeCursor keys clicks kinds />",
    seconds: 4,
    origin: ORIGIN,
    Demo: () => (
      <Desktop tone="pink">
        <DockOpen
          items={[{ label: "Player", icon: "music" }, { label: "Mail", icon: "mail" }, { label: "Files", icon: "folder" }, { label: "Web", icon: "globe" }, { label: "Notes", icon: "doc" }, { label: "Trash", icon: "trash" }]}
          open={1}
          at={1.6}
          win={{ x: 420, y: 100, w: 1080, h: 600, title: "inbox" }}
        >
          <div style={{ padding: "36px 44px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 20, fontFamily: WORD, fontSize: 76, color: INK, marginBottom: 12 }}>
              <Pix sprite={MAIL} px={7} />
              New mail!
            </div>
            {["Re: your homepage", "FWD: FWD: this is hilarious", "Guestbook: new entry"].map((s, i) => (
              <div key={i} style={{ fontFamily: PIXEL, fontSize: 58, color: INK, borderBottom: `3px dashed ${INK}`, padding: "12px 0" }}>{s}</div>
            ))}
          </div>
        </DockOpen>
      </Desktop>
    ),
  },
];

export const retroWebY2kDesktop: LibraryTheme = {
  slug: "retro-web-y2k-desktop",
  name: "Retro web / Y2K desktop",
  summary: "A made-up 90s operating system on a drifting starfield: bevelled grey windows with navy-to-teal title bars, pastel pink and cream pop-ups, pixel icons and cursors, WordArt, planet menus and marquees, all stepped and clunky on purpose.",
  feel: ["nostalgic", "quirky", "chaotic", "warm", "humorous"],
  status: "draft",
  board: "data/references/themes/retro-web-y2k-desktop.md",
  Background: StarField,
  entries,
};

export default retroWebY2kDesktop;
