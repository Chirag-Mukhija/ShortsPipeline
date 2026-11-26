# Plan: the square that survives

Music only. Every shot is drawn (`GRAPHIC` cues only). Facts come from `research/facts.md`; numbers in [brackets] are entries in `research/sources.md`. Cards that do not carry a `[n]` state no fact.

## Angle and promise
- **Angle:** damage first. Open on a QR code with a hole in it that still reads, then spend 80 seconds earning the answer. (Angle A of the brief, with the count from angle B as the peak.)
- **Promise:** in 90 seconds you see where the QR code came from, how big it can get, and why a broken one still works.

## For
A curious builder or tech student who scans codes every day and has never asked how they work. No prior knowledge needed.

## Length
90 seconds: 48 bars at 128 BPM is exactly 90.0 s (one bar is 1.875 s). The edit may move cues to the chosen track's real beats.

## Structure
Each shot is one visual fact. A shot is 1–3 bars. A picture can change on every bar while its card holds, so the film feels fast but every card meets the hold rule (1.5 s + 0.3 s per word).

**Beat 1: It still reads (~00:00–00:07.5, 4 bars)**
- **Shows:** a real QR code, white modules on void black, fills the frame cold on frame 1. Downbeat: a red beam of light punches a ragged hole through it, whole modules flying out. One bar of silence in the picture. A lime scan line crosses the wound and every remaining module flashes lime in a wave: it read.
- **Text:** "Partly missing." then "It still reads." [26]
- **Feel:** hit. No intro, no title card.

**Beat 2: Why it had to exist (~00:07.5–00:18.75, 6 bars)**
- **Shows:** 1) hard cut to paper. "1994" built from modules, stacked like a stamp. 2) A barcode fills the frame and is squeezed until it bursts, with about 20 characters spilling out of it as the only contents. 3) A worker's-eye pile of barcodes: 1,000 little bars stacking up like a counter.
- **Text:** "1994. DENSO, Japan." [1][26] · "A barcode held about 20 characters." [1][26] · "Workers scanned about 1,000 a day." [26]
- **Feel:** build, tense.

**Beat 3: The rarest ratio (~00:18.75–00:35.6, 9 bars)**
- **Shows:** 1) two figures as two modules, lighting up alone in an empty grid. 2) Printed matter (a leaflet, a magazine, a carton, drawn as blocks of type and bars) streams under a red beam like a conveyor, a pattern meter counting. 3) The beam stops; five bars rise, 1 : 1 : 3 : 1 : 1, black/white/black/white/black, then fold into a finder square. 4) The square lands at three corners and the whole code spins to any angle while the finders stay lit.
- **Text:** "Two people started it." [1][26] · "They searched print for the rarest pattern." [1][26] · "1 : 1 : 3 : 1 : 1" [1][26] · "Found at any angle." [1][26]
- **Feel:** build to a small peak on the ratio.

**Beat 4: How it grew (~00:35.6–00:50.6, 8 bars)**
- **Shows:** 1) a small 21 x 21 square on void. 2) The square grows ring by ring until 177 x 177 fills the frame, the module count clicking as it goes. 3) The standards land as three stamped blocks, one per bar. 4) A tiny 11 x 11 and a long thin 7 x 43 arrive beside the full one: the family in true proportion.
- **Text:** "21 x 21" to "177 x 177" [2][3] · "AIM 1997. JIS 1999. ISO 2000." [2] · "Micro QR, 2004. rMQR, 2022." [17][22] · "Free to use, if you follow the standard." [24][25]
- **Feel:** driving; a run of hard cuts on the bars.

**Beat 5: Barcode vs QR (~00:50.6–01:00.0, 5 bars)**
- **Shows:** a barcode of twelve digits stands in a row of twelve tiles; the same strip of road continues, out of frame, as 7,089 digits of a QR's contents pour past like a train, the camera racing after it.
- **Text:** "UPC barcode: 12 digits." [18] · "Biggest QR: 7,089 digits." [2][6] · "Version 40, level L" as a small mono tag
- **Feel:** breathe, then a race.

**Beat 6: How many can exist (~01:00.0–01:15.0, 8 bars), the peak**
- **Shows:** 1) one digit wheel, 0–9, ten choices. 2) The wheel doubles into a row, then a wall of wheels, 10 x 10 x 10, and the working runs up the side. 3) The wall collapses into one number, 10 with the exponent 7,089 slamming in, and the zeros scroll off both edges. 4) A grid of atoms, 10^80, shrinks to a dot beside it.
- **Text:** "7,089 digits. 10 choices each." [2][6] · "10 x 10 x 10 … 7,089 times" · "10^7,089 codes. At least." [2][6] · "Atoms in the universe: about 10^80." [12] · small mono tag "estimate: 10^78 to 10^82"
- **Feel:** peak. The one moment the film goes fully wide.

**Beat 7: Why it survives (~01:15.0–01:30.0, 8 bars)**
- **Shows:** 1) the hook's code returns, damaged. Its modules lift off in coloured groups of 8, each group one codeword. 2) The damaged groups go red and are counted; the spare groups slide in from the other side and the missing ones are rebuilt, module by module. 3) The four levels as four bars of protection, then the code snaps whole and the lime wave runs through it again, to black.
- **Text:** "8 modules = 1 codeword" [4] · "Level H: about 30% of codewords can be lost." [2][4] · "Reed-Solomon codes. Music CDs use the same family." [4][14] · "Partly missing. It still reads." [26]
- **Feel:** breathe, then the closing hit on the last downbeat. The final frame is the whole code and one closing card ("Now you know why." or none).

### Text the film will never say
"30% of the area", any "X times faster", "Toyota invented it", "the first QR held 7,089 digits", Voyager, a Reed-Solomon year, or "Go inspired the corners". See `research/facts.md`.

## Look and feel (the centerpiece)

### Visual direction
"Kinetic type film": words and modules are the picture. Every drawn object is made from the QR code's own parts (a square module, a finder square, a bar, a scan line), so type and code feel like one printed system. No paper texture, no pencil, no rounded hand-drawn lines: video 001's look is out. References: the theme board `data/references/themes/kinetic-type-film.md`, and the outliers' "How do QR Codes Work?" structure, but compressed into 90 seconds.

### Palette
| Hex | Role |
|---|---|
| #0B0B0F | Void: background |
| #F5F2EA | Paper: background of the history beats |
| #111111 | Ink: modules and type on paper |
| #FFFFFF | White: modules and type on void |
| #FF3B2F | Red: damage, the beam, the tension |
| #D7FF3A | Lime: "it read": the only colour that means success |

Red means damage or scan beam, lime means a successful read. Never use either as decoration.

### Type
Inter, variable, 900 for hits and 500 for support, and JetBrains Mono 500 for numbers, working and source tags. Nothing else: Instrument Serif stays out, because no card states a feeling. On-screen size: a hit word is 150–300 px on a 1920 x 1080 frame, and a supporting card at least 56 px, so it reads on a phone. Modules snap to a pixel grid.

### Motion language
- **Enter:** type snaps in on the beat in 6–8 frames with a small overshoot; modules fly in as whole squares, never fade.
- **Leave:** hard cut on the beat, or fly out of frame at speed. No cross-fades.
- **Easing:** `snappy` (fast out, slow in). Holds are dead still for at least 10 frames.
- **Camera:** pushes and pans on bars; a fast pull-back for beat 6.
- **Transitions:** a colour-block cut between chapters (void, paper, void), one per chapter change, and one finder square that fills the frame. Nothing else.
- Every beat's picture is one action. A repeat of any idea is a bug.

### Texture and light
A 2% grain over everything; no glow except a soft bloom on the beam and on the lime read wave. Flat shadows only where a module lifts off the grid (beat 7). Modules stay crisp.

## Style frames
Three stills. Sketches of these three are welcome before or after approval.

1. **Opening (0:00.6):** void black. A real QR code (29 x 29 modules, version 3) 820 px wide, centred, white modules. A ragged hole about 20% of the code's width is torn at the lower right of centre, its edges burning red, loose white modules frozen mid-flight up and to the right. A 6 px lime line about to cross the wound from the left. No type.
2. **Peak (about 1:08):** void black, full bleed. "10" in Inter 900, 520 px, left of centre, with "7,089" in Inter 900 as the raised exponent at 260 px. Behind them a faint grid of hundreds of zeros in JetBrains Mono at 40 px, running off all four edges. Small mono tag at the bottom left: "version 40, level L, digits only". No other type.
3. **Last (about 1:29):** paper. The whole code, ink modules, 860 px wide, centred, perfectly complete, one lime wave crossing it left to right. The closing card "It still reads." sits underneath in Inter 900, 120 px, ink. No logo.

## Music brief
- **Mood:** curious, then driving, then triumphant. Electronic, percussive, no vocals.
- **Tempo:** 120–130 BPM (128 preferred: 48 bars = 90 s).
- **Energy arc:** hit at 0:00, low tension in beat 2, building through 3, driving in 4, breathe in beat 5, peak at 1:00–1:15, breathe at 1:15, a final hit at about 1:28. Cold start, so no long intro: use `musicStart` to enter near the first drum.
- **Length:** 90 s, with a 2–3 s tail. Free or open-licensed. **No track is picked yet**; the edit stage picks one from the local library and records its license.

## What the creator captures
Nothing. Every shot is drawn. If the creator wants, they can sketch any style frame on the iPad and add it to the inbox as "for a beat".

## Custom scenes
At most 5 (the creator's cap). Candidates: beat 1 (the tear and read), beat 3 (the ratio in print), beat 4 (the growth from 21 to 177), beat 6 (the count), beat 7 (the rebuild). Beats 2 and 5 adapt templates.

## Out of scope
How to make a code, how to scan safely (QR scams), phone history and dates, payments, SQRC and FrameQR and iQR, colour or artistic codes, the Go story (unverified link to the corners), any comparison of speed, and the author's opinion.
