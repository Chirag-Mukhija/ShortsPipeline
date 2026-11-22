// Catalog of the pixel arcade 8-bit theme: one entry and one small demo per reusable piece, each shown under the CRT glass.
import type { FC, ReactNode } from "react";
import { AbsoluteFill } from "remotion";
import { Track } from "../../core/beat";
import type { LibraryEntry, LibraryTheme } from "../../core/catalog";
import { Place, SpriteAnim } from "./pixel";
import { ArcadeScreen, CRT, GROUND_Y } from "./screen";
import { BlinkPrompt, DialogueBox, HudBar, ItemGet, LevelCard, LevelSelect, ProgressRun, ScoreCounter, TitleScreen } from "./pieces";
import { PixelChart, PowerUp, StageClear, Versus } from "./moments";
import { BossBattle, ChipStage, GameOver, HighScore } from "./signature";
import { COIN, SPRITES } from "./sprites";
import { YELLOW } from "./theme";

const ORIGIN = "Motion library build (pixel-arcade-8bit board), not yet used in a video";

// Every demo sits under the same CRT scanlines a real scene would use.
const Screen: FC<{ children?: ReactNode }> = ({ children }) => (
  <AbsoluteFill>
    {children}
    <CRT />
  </AbsoluteFill>
);

const entries: LibraryEntry[] = [
  {
    id: "arcade-screen",
    kind: "background",
    title: "Arcade night screen",
    useFor: "The screen every arcade scene sits on: deep navy sky with stars twinkling between dot and plus on 2-state steps, a dithered horizon, two stepped mountain ranges and a brick floor. Put <CRT /> over the finished scene.",
    api: "<ArcadeScreen ground? mountains? />  ·  <CRT lines? vignette? />  ·  <Starfield n top bottom seed />",
    seconds: 2,
    origin: ORIGIN,
    Demo: () => (
      <Screen>
        <Place x={640} y={GROUND_Y} ay={1}>
          <SpriteAnim frames={SPRITES.bit} every={6} px={8} />
        </Place>
        <Place x={1280} y={GROUND_Y - 160}>
          <SpriteAnim frames={COIN} every={4} px={6} />
        </Place>
      </Screen>
    ),
  },
  {
    id: "title-screen",
    kind: "piece",
    title: "Attract-mode title screen",
    useFor: "The hook or episode title: a banded bitmap logo drops in letter by letter, the subtitle types, PRESS START blinks between spinning coins and the hero walks the floor. Up to ~13 characters per line.",
    api: '<TitleScreen title={["DEBUG", "QUEST"]} sub at prompt? px? hud? walker? />  ·  <BlinkPrompt text from hz />',
    seconds: 3.3,
    origin: ORIGIN,
    Demo: () => (
      <Screen>
        <TitleScreen title={["DEBUG", "QUEST"]} sub="EP.01 - MY FIRST GAME JAM" at={0} />
      </Screen>
    ),
  },
  {
    id: "hud-progress",
    kind: "piece",
    title: "HUD and progress run",
    useFor: "A video-long frame: score ticks up on a number, stage segments fill as sections are named, a heart blinks out on a setback; on the floor the hero walks START to GOAL with the video's progress and grabs a coin at each chapter.",
    api: "<HudBar at score={{ to, at, d }} level lives lose={[s]} stage={[s...]} />  ·  <ProgressRun from to marks={[{ p, label }]} />",
    seconds: 3,
    origin: ORIGIN,
    Demo: () => (
      <Screen>
        <ProgressRun from={0.3} to={6} marks={[{ p: 0.25, label: "+100" }, { p: 0.5 }, { p: 0.75 }]} />
        <BlinkPrompt text="READY!" y={480} from={0.4} hz={2} color={YELLOW} />
        <HudBar at={0} score={{ to: 4250, at: 0.4, d: 40 }} level="2-3" lose={[1.8]} stage={[0.6, 1.0, 1.4, 2.0, 2.4]} />
      </Screen>
    ),
  },
  {
    id: "score-counter",
    kind: "piece",
    title: "Score counter stat",
    useFor: "The big number: zero-padded arcade digits tick up in 2-frame steps (leading zeros stay dim), land with a punch and a coin burst; the context line types in after the number, never with it.",
    api: "<ScoreCounter at to from? d? pad? label sub unit px? />",
    seconds: 3,
    origin: ORIGIN,
    Demo: () => (
      <Screen>
        <ScoreCounter at={0.3} to={12480} label="LINES OF CODE" sub="WRITTEN IN ONE WEEKEND" />
      </Screen>
    ),
  },
  {
    id: "level-card",
    kind: "transition",
    title: "LEVEL card",
    useFor: "A chapter change: six neon stripes wipe across and away on 2s, revealing LEVEL n popping in and the chapter name typed under it. `out` collapses the band.",
    api: '<LevelCard at level="LEVEL 2" title out? />',
    seconds: 2.5,
    origin: ORIGIN,
    Demo: () => (
      <Screen>
        <LevelCard at={0.2} level="LEVEL 2" title="THE BACKEND" />
      </Screen>
    ),
  },
  {
    id: "level-select",
    kind: "piece",
    title: "Stage select list",
    useFor: "A list, roadmap or steps: rows wait locked, each unlocks on its spoken cue with the cursor hopping down to it, and finished rows get a flag. 3 to 5 rows of up to ~24 characters.",
    api: "<LevelSelect at items={[{ label, at, tag? }]} title? world? />",
    seconds: 3.2,
    origin: ORIGIN,
    Demo: () => (
      <Screen>
        <LevelSelect
          at={0.2}
          items={[
            { label: "LEARN THE BASICS", at: 0.8 },
            { label: "BUILD A CLONE", at: 1.5 },
            { label: "SHIP A TINY GAME", at: 2.2 },
            { label: "GET 10 PLAYERS", at: 9 },
          ]}
        />
      </Screen>
    ),
  },
  {
    id: "versus",
    kind: "piece",
    title: "Versus screen",
    useFor: "A vs B: two coloured halves slam in on a stair-stepped diagonal with speed lines, VS pops with an 8 px shake, and each side's stat bars fill a segment per 2 frames. Names up to 8 characters, stats 0-10.",
    api: '<Versus at left={{ name, sprite?, tag?, stats: [["SPD", 7]] }} right={...} vs? stats? />',
    seconds: 2.6,
    origin: ORIGIN,
    Demo: () => (
      <Screen>
        <Versus
          at={0}
          left={{ name: "TABS", sprite: "bit", stats: [["KEYS", 2], ["FLEX", 8], ["WARS", 9]] }}
          right={{ name: "SPACES", sprite: "glitch", stats: [["KEYS", 8], ["FLEX", 4], ["WARS", 9]] }}
        />
      </Screen>
    ),
  },
  {
    id: "dialogue-box",
    kind: "piece",
    title: "Dialogue box quote",
    useFor: "A quote, a mentor's advice or the narrator's aside: the box opens in three steps, the portrait talks while the text types a letter a frame, then the next-arrow bobs. Up to ~110 characters.",
    api: '<DialogueBox at text name? speaker?="sage"|"bit"|"glitch" x? y? w? h? per? />',
    seconds: 3.2,
    origin: ORIGIN,
    Demo: () => (
      <Screen>
        <DialogueBox at={0.2} y={304} name="SAGE" text={"“Ship the ugly version first. Polish is the reward, not the entry fee.”"} />
        <Place x={560} y={GROUND_Y} ay={1}>
          <SpriteAnim frames={SPRITES.bit} every={30} px={8} />
        </Place>
      </Screen>
    ),
  },
  {
    id: "pixel-chart",
    kind: "piece",
    title: "Stacked-brick chart",
    useFor: "Growth, comparison or any small bar chart (3-7 bars): bricks drop into each column on 2s at its cue, the value pops on top, the one that matters is yellow and the hero hops onto it.",
    api: "<PixelChart at data={[{ label, value, at? }]} max? rows? unit? title? highlight? base? hero? />",
    seconds: 3.6,
    origin: ORIGIN,
    Demo: () => (
      <Screen>
        <PixelChart
          at={0}
          title="PLAYERS PER WEEK"
          highlight={3}
          data={[
            { label: "WK1", value: 12 },
            { label: "WK2", value: 30 },
            { label: "WK3", value: 26 },
            { label: "WK4", value: 58 },
            { label: "WK5", value: 41 },
          ]}
        />
      </Screen>
    ),
  },
  {
    id: "power-up",
    kind: "piece",
    title: "Power-up key word",
    useFor: "The key word or claim landing on its spoken word: a power-up chip pops out with a spark burst and a colour ring, the word pops letter by letter cycling the four neons, then settles yellow.",
    api: '<PowerUp at word label?="POWER UP!" item?="chip"|"coin"|"trophy"|... y? px? />',
    seconds: 2.4,
    origin: ORIGIN,
    Demo: () => (
      <Screen>
        <PowerUp at={0.3} word="CACHING" />
      </Screen>
    ),
  },
  {
    id: "item-get",
    kind: "piece",
    title: "Item-get source tag",
    useFor: "Source label or lower third: an item box slides in on 2s with its icon and the source typed; on `out` it flickers away like a collected pickup.",
    api: '<ItemGet at text label?="SOURCE" icon?="scroll" out? y? />',
    seconds: 2,
    origin: ORIGIN,
    Demo: () => (
      <Screen>
        <ItemGet at={0.3} text="example.com/devlog, 2026" />
      </Screen>
    ),
  },
  {
    id: "stage-clear",
    kind: "transition",
    title: "Stage clear + pixel wipe",
    useFor: "Closing a section: the new screen opens with a column pixel-wipe (1 frame stagger per column), STAGE CLEAR drops in, the hero jumps by the trophy and a bonus tally counts up. PixelWipe and Iris also work alone.",
    api: '<StageClear at text? bonus={[{ label, value }]} wipe? />  ·  <PixelWipe at mode="cover"|"reveal" kind="columns"|"dissolve" />  ·  <Iris at cx cy to from? />',
    seconds: 3.6,
    origin: ORIGIN,
    Demo: () => (
      <Screen>
        <StageClear at={0} bonus={[{ label: "TIME BONUS", value: 3000 }, { label: "NO DEATHS", value: 5000 }]} />
      </Screen>
    ),
  },
  {
    id: "game-over",
    kind: "piece",
    title: "GAME OVER",
    useFor: "A failure, a dead idea or 'this is where it went wrong': the hero is knocked out, the iris closes on it in two stair-stepped stages, GAME OVER types in red and CONTINUE? counts down.",
    api: "<GameOver at text? cont? count? />",
    seconds: 5,
    origin: ORIGIN,
    Demo: () => (
      <Screen>
        <GameOver at={0.2} />
      </Screen>
    ),
  },
  {
    id: "boss-battle",
    kind: "piece",
    title: "Boss battle HP",
    useFor: "A big problem being beaten down fix by fix: each hit is a cue where the hero fires, the boss freezes 3 frames (hit-stop), flashes and the HP bar drains; the damage label names the fix. Total dmg 1 defeats it.",
    api: '<BossBattle at name hits={[{ at, dmg: 0..1, label? }]} boss?="glitch" tag? />',
    seconds: 3.1,
    origin: ORIGIN,
    Demo: () => (
      <Screen>
        <BossBattle at={0} name="MEMORY LEAK" hits={[{ at: 0.8, dmg: 0.3, label: "-30% HEAP" }, { at: 1.6, dmg: 0.25 }, { at: 2.4, dmg: 0.3, label: "LOOP FIXED" }]} />
      </Screen>
    ),
  },
  {
    id: "high-score",
    kind: "piece",
    title: "High-score table ranking",
    useFor: "A ranking or top-5: rows type in by rank colour, and the entry the video is about spells its name with scrolling letters, then flashes NEW!. Names up to 10 characters.",
    api: "<HighScore at rows={[{ name, score, at? }]} title? fresh={index} freshAt? />",
    seconds: 4.2,
    origin: ORIGIN,
    Demo: () => (
      <Screen>
        <HighScore
          at={0}
          title="TOP SIDE PROJECTS"
          fresh={2}
          freshAt={1.8}
          rows={[
            { name: "SHORTS BOT", score: 98200 },
            { name: "CLI TOOL", score: 75400 },
            { name: "GAME JAM", score: 61000 },
            { name: "PORTFOLIO", score: 40250 },
            { name: "BLOG", score: 12800 },
          ]}
        />
      </Screen>
    ),
  },
  {
    id: "chiptune-stage",
    kind: "piece",
    title: "Chiptune stage (music-only)",
    useFor: "Music-only videos: inside <Track>, a block equaliser steps on 2s with falling peak caps, floor lamps chase the 8ths, the hero hops every beat (higher with energy), a coin pops each bar and on-screen words hold by the music-only rule.",
    api: "<Track spec={{ bpm, sections }} from?><ChipStage words={[{ text, at: { bar, beat } }]} bins? hud? /></Track>",
    seconds: 5.6,
    origin: ORIGIN,
    Demo: () => (
      <Screen>
        <Track
          spec={{
            bpm: 128,
            sections: [
              { name: "intro", start: 0, end: 1.875 },
              { name: "build", start: 1.875, end: 3.75 },
              { name: "peak", start: 3.75, end: 8 },
            ],
          }}
        >
          <ChipStage words={[{ text: "PRESS PLAY", at: { bar: 1, beat: 2 } }, { text: "LEVEL UP!", at: { bar: 3 } }]} />
        </Track>
      </Screen>
    ),
  },
];

export const pixelArcade8bit: LibraryTheme = {
  slug: "pixel-arcade-8bit",
  name: "Pixel arcade 8-bit",
  summary: "Chunky original pixel sprites and a hand-made bitmap font on a night-sky arcade screen with CRT scanlines; everything moves on 2s in 8 px steps, with HUDs, blinking prompts, level cards, boss fights and GAME OVER energy.",
  feel: ["playful", "nostalgic", "punchy", "bright", "game-dev"],
  status: "draft",
  board: "data/references/themes/pixel-arcade-8bit.md",
  Background: ArcadeScreen,
  entries,
};

export default pixelArcade8bit;
