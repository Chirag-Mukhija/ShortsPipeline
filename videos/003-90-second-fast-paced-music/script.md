# Cue sheet: Why Broken QR Codes Still Work

Music only. No voice, nobody on camera, `GRAPHIC` cues only. 128 BPM: 1 beat = 0.46875 s, 1 bar = 1.875 s, 48 bars = 192 beats = 90.0 s. Every start and duration below is a whole number of beats; `b` = beat index (time = b x 0.46875 s). Facts come from `research/facts.md`; `[src: n]` points at `research/sources.md`.

Palette: void #0B0B0F, paper #F5F2EA, ink #111111, white #FFFFFF, red #FF3B2F (damage or scan beam only), lime #D7FF3A (a successful read only). Type: Inter 900 for hits, Inter 500 for support, JetBrains Mono 500 for numbers and tags. Hold rule per card: 1.5 s + 0.3 s per word, rounded up to the half second. "10^7,089" and "1,000" count as one word. The text-card register at the end proves every hold.

## Hooks (first ~3 s)

Five written, scored with `hookscore.py`. The scorer only reads words and rates every short, visual-led line as WEAK, so the frame does the work.

| # | Hook line | Score | Formula |
|---|---|---|---|
| 1 | A QR code can lose up to 30% of its codewords and still scan. | 42 | The Statistic |
| 2 | Up to 30% of its codewords can go missing. It still scans. | 39 | The Statistic |
| 3 | Partly missing. Why does it still read? | 36 | The Question |
| 4 | Why does a broken QR code still work? | 37 | The Question |
| 5 | Partly missing. It still reads. | 29 | Unclassified (the anchor, from the plan) |

Kept two, chosen for the film and not only the score. Lines 1 and 2 would force "codewords" before the viewer has any picture for it. Line 4 repeats the title. So the two kept are the anchor and its question form. Both open on the same frame, so the plan's beat 7 answers either one.

**Option A (default, used in the cues below): "Partly missing." then "It still reads."** Score 29 (WEAK; Unclassified; brevity 56 is the only soft spot, it is two short cards). Why the frame stops a scroll: a perfect QR code fills the frame, a red beam tears a hole in it, and a lime line reads it anyway, so the viewer sees the impossible thing before any word explains it.

**Option B: "Partly missing." then "Why does it still read?"** Score 36 (WEAK; The Question; curiosity 59). Same frame and timing. Swap card T2 only (5 words, min hold 3.0 s, the 8-beat slot holds 3.75 s). It opens the question outright, and beat 7 answers it.

## Beat 1: It still reads (0:00.000 to 0:07.500, b0 to b16, 4 bars)
Music: intro, a hit. Void #0B0B0F.

**Cue 1. 0:00.000, 0.9375 s (b0 to b2).**
[ON SCREEN: GRAPHIC: a real, scannable QR code (29 x 29 modules, version 3), white #FFFFFF modules, 820 px wide, centred on void #0B0B0F. It is already full frame on frame 1. A 3% push-in. No type.] [src: 2, 3]
[MUSIC: intro] [CUT: on the beat (b2, the snare)]

**Cue 2. 0:00.9375, 0.9375 s (b2 to b4).**
[ON SCREEN: GRAPHIC: a red #FF3B2F beam punches in from the upper left. It tears a ragged hole, about 20% of the code's width, at the lower right of centre. Whole modules fly out up and right. The hole's edges burn red with a soft bloom.]
[TEXT: card T1 "Partly missing." starts here and holds to b8] [src: 26]
[MUSIC: intro] [CUT: on the beat]

**Cue 3. 0:01.875, 1.875 s (b4 to b8).**
[ON SCREEN: GRAPHIC: the picture goes dead still for one bar. The hole hangs open, loose white modules frozen mid-flight. Nothing moves.]
[MUSIC: breathe, a one-bar drop] [CUT: on the beat]

**Cue 4. 0:03.750, 1.875 s (b8 to b12).**
[ON SCREEN: GRAPHIC: a 6 px lime #D7FF3A scan line sweeps left to right across the wound. Every remaining module flashes lime in a wave that follows the line, then settles back to white.]
[TEXT: card T2 "It still reads." starts here and holds to b16] [src: 26]
[MUSIC: build, the drop returns as a drum fill] [CUT: on the beat]

**Cue 5. 0:05.625, 1.875 s (b12 to b16).**
[ON SCREEN: GRAPHIC: a fast push-in straight through the hole into black, the lime line trailing off the edge.]
[MUSIC: build] [CUT: colour-block cut to paper on the downbeat (b16)]

## Beat 2: Why it had to exist (0:07.500 to 0:18.750, b16 to b40, 6 bars)
Music: build, tense, low. Paper #F5F2EA, ink #111111.

**Cue 6. 0:07.500, 2.8125 s (b16 to b22).**
[ON SCREEN: GRAPHIC: a paper block wipes in. The card's own "1994." is built from ink modules that stack up and stamp down, then "DENSO." snaps in under it, Inter 900, ink. The stamp and the card are one object.]
[TEXT: card T3 "1994. DENSO." holds b16 to b22] [src: 1, 26]
[MUSIC: build] [CUT: on the beat]

**Cue 7. 0:10.3125, 1.875 s (b22 to b26).**
[ON SCREEN: GRAPHIC: a long ink barcode fills the frame. Both ends are squeezed in until the bars buckle, red #FF3B2F cracks running along them.]
[TEXT: card T4 "A barcode held about 20 characters." starts here and holds to b30] [src: 1, 26]
[MUSIC: build] [CUT: on the beat]

**Cue 8. 0:12.1875, 1.875 s (b26 to b30).**
[ON SCREEN: GRAPHIC: the barcode bursts. Exactly 20 square chips of abstract glyph shapes (no readable letters) spill out and hang in a loose cloud. Count them: 20, no more.]
[MUSIC: build] [CUT: on the beat]

**Cue 9. 0:14.0625, 4.6875 s (b30 to b40).**
[ON SCREEN: GRAPHIC: a worker's-eye view. Identical barcode slips stack in a tower on paper, one per beat, then faster, the camera climbing the stack. No numerals in the picture.]
[TEXT: card T5 "Some workers scanned up to about 1,000 barcodes daily." holds b30 to b40] [src: 26]
[MUSIC: build, snare roll in the last bar] [CUT: hard cut (still paper, new chapter)]

## Beat 3: The rarest ratio (0:18.750 to 0:35.625, b40 to b76, 9 bars)
Music: build to a small peak on the ratio. Paper, ink, red beam, lime on found.

**Cue 10. 0:18.750, 2.8125 s (b40 to b46).**
[ON SCREEN: GRAPHIC: a faint empty 9 x 9 grid in ink on paper. One module fills solid on b40, a second on b43. Two modules, alone.]
[TEXT: card T6 "It started with two people." holds b40 to b47] [src: 1, 26]
[MUSIC: build] [CUT: on the beat]

**Cue 11. 0:21.5625, 4.6875 s (b46 to b56).**
[ON SCREEN: GRAPHIC: a conveyor of printed matter, drawn as blocks of type and bars: a leaflet, a magazine, a corrugated carton, repeating, sliding left under a fixed red #FF3B2F beam. A pattern meter (a tick strip with no numerals) ticks up with every item. Only these three kinds of item.]
[TEXT: card T7 "They searched print for the rarest pattern." starts b47, holds to b56] [src: 26]
[MUSIC: build] [CUT: on the beat]

**Cue 12. 0:26.250, 1.875 s (b56 to b60).**
[ON SCREEN: GRAPHIC: the beam stops. Five ink bars rise from the floor in the ratio 1 : 1 : 3 : 1 : 1, alternating black, paper-white, black, paper-white, black.]
[TEXT: card T8 "1 : 1 : 3 : 1 : 1" in JetBrains Mono, starts here, holds to b64] [src: 1, 26]
[MUSIC: build, small peak] [CUT: on the beat]

**Cue 13. 0:28.125, 1.875 s (b60 to b64).**
[ON SCREEN: GRAPHIC: the five bars fold inward on themselves into a finder square (7 x 7 modules).] [src: 27]
[MUSIC: peak (small)] [CUT: on the beat]

**Cue 14. 0:30.000, 2.8125 s (b64 to b70).**
[ON SCREEN: GRAPHIC: the finder square lands at three corners of an empty code, one on each of b64, b66, b68, each with a hard snap.]
[TEXT: card T9 "Found at any angle." starts here, holds to b76] [src: 1, 26]
[MUSIC: driving] [CUT: on the beat]

**Cue 15. 0:32.8125, 2.8125 s (b70 to b76).**
[ON SCREEN: GRAPHIC: the whole code spins to a different angle on every beat, ending on 30 degrees. The three finder squares stay lit: lime #D7FF3A fill, ink outline. Lime is only ever a fill here, never type, because it has no contrast on paper.]
[MUSIC: driving] [CUT: colour-block cut to void on the downbeat (b76)]

## Beat 4: How it grew (0:35.625 to 0:52.500, b76 to b112, 9 bars)
Music: driving. Void, white. This beat is one bar longer than the plan so card T10 and card T13 meet their holds.

**Cue 16. 0:35.625, 1.875 s (b76 to b80).**
[ON SCREEN: GRAPHIC: a small 21 x 21 code, centred, 300 px wide, on void, white modules.]
[TEXT: card T10 "21 x 21 to 177 x 177" in JetBrains Mono starts here, holds to b85. The "177 x 177" half ticks up as the code grows] [src: 2, 3]
[MUSIC: driving] [CUT: on the beat]

**Cue 17. 0:37.500, 2.34375 s (b80 to b85).**
[ON SCREEN: GRAPHIC: the square grows ring by ring, +4 modules per side per step, accelerating, until a 177 x 177 code fills the frame (modules a few pixels each, crisp).]
[MUSIC: driving] [CUT: on the beat]

**Cue 18. 0:39.84375, 3.75 s (b85 to b93).**
[ON SCREEN: GRAPHIC: the full code slides to the left third. Three ink-on-white slabs stamp down on the right, one every two beats (b85, b87, b89), each a hard snap. The words of the card are the slabs.]
[TEXT: card T11 "AIM 1997. JIS 1999. ISO 2000." holds b85 to b93] [src: 2]
[MUSIC: driving] [CUT: on the beat]

**Cue 19. 0:43.59375, 1.40625 s (b93 to b96).**
[ON SCREEN: GRAPHIC: a tiny 11 x 11 Micro QR lands beside the full 177 x 177 code, at true proportion, with one finder square only.]
[TEXT: card T12 "Micro QR 2004. rMQR 2022." starts here, holds to b100] [src: 22, 17]
[MUSIC: driving] [CUT: on the beat]

**Cue 20. 0:45.000, 1.875 s (b96 to b100).**
[ON SCREEN: GRAPHIC: a long thin 7 x 43 rMQR code slams in below the others. The family now sits in true proportion.] [src: 17]
[MUSIC: driving] [CUT: on the beat]

**Cue 21. 0:46.875, 3.75 s (b100 to b108).**
[ON SCREEN: GRAPHIC: a white boom-gate bar lies across the full code. On b100 it swings up through 90 degrees and locks vertical, the code beneath released. Nothing else moves.]
[TEXT: card T13 "Free to use, if you follow the standard." starts here, holds to b109] [src: 24, 25]
[MUSIC: driving, last bar of the beat] [CUT: on the beat]

**Cue 22. 0:50.625, 1.875 s (b108 to b112).**
[ON SCREEN: GRAPHIC: a finder square grows from the centre of the code and fills the whole frame in paper #F5F2EA. The one finder-fill transition of the film.]
[MUSIC: driving to breathe] [CUT: lands on paper]

## Beat 5: Barcode vs QR (0:52.500 to 1:00.000, b112 to b128, 4 bars)
Music: breathe, then a race. Paper, ink. This beat is one bar shorter than the plan, and the beat 6 start (1:00.000) does not move.

**Cue 23. 0:52.500, 3.75 s (b112 to b120).**
[ON SCREEN: GRAPHIC: a UPC barcode (ink bars) stands centred. Under it a row of exactly twelve square tiles, each holding an abstract dot-matrix digit (no readable numerals), fills two per beat from b112 to b117, then holds.]
[TEXT: card T14 "UPC barcode: 12 digits." holds b112 to b120] [src: 18]
[MUSIC: breathe] [CUT: on the beat]

**Cue 24. 0:56.250, 3.75 s (b120 to b128).**
[ON SCREEN: GRAPHIC: the camera tracks along the row of tiles and out of frame. The same row continues. A train of tiles (7,089 of them, mostly motion blur) pours past, the camera racing after it, faster each beat.]
[TEXT: card T15 "Biggest QR: 7,089 digits." holds b120 to b128; mono tag "version 40, level L" in the lower left, same hold] [src: 2, 6]
[MUSIC: build, snare roll] [CUT: colour-block cut to void on the downbeat (b128)]

## Beat 6: How many can exist (1:00.000 to 1:15.000, b128 to b160, 8 bars)
Music: peak. Void, white, a faint grey (white at 12%) for the zero grid. Red and lime stay out, nothing here is damage or a read.

**Cue 25. 1:00.000, 1.875 s (b128 to b132).**
[ON SCREEN: GRAPHIC: one digit wheel, centred, 0 to 9, ten notches. It spins and snaps to a new digit on each beat.]
[TEXT: card T16 "7,089 digits. 10 choices each." starts here, holds to b135] [src: 2, 6]
[MUSIC: peak] [CUT: on the beat]

**Cue 26. 1:01.875, 1.40625 s (b132 to b135).**
[ON SCREEN: GRAPHIC: the wheel doubles into a row of 2, then 4, then 8 wheels, each doubling on its own beat.]
[MUSIC: peak] [CUT: on the beat]

**Cue 27. 1:03.28125, 4.21875 s (b135 to b144).**
[ON SCREEN: GRAPHIC: the row stacks into a wall of wheels, 10 x 10 x 10. The camera pulls back fast and wide, the one fully wide moment of the film. The working runs up the left side.]
[TEXT: card T17 "10 x 10 x 10 ... 7,089 times" in JetBrains Mono holds b135 to b144] [src: 2, 6]
[MUSIC: peak] [CUT: on the beat]

**Cue 28. 1:07.500, 3.28125 s (b144 to b151).**
[ON SCREEN: GRAPHIC: the wall collapses into one number. A white "10" at 520 px, left of centre, and "7,089" as the raised exponent at 260 px slams in. A grid of mono zeros at 40 px in faint grey scrolls off all four edges.]
[TEXT: card T18 "10^7,089 codes. At least." holds b144 to b151; mono tag "digits only", lower left, same hold] [src: 2, 6]
[MUSIC: peak] [CUT: on the beat]

**Cue 29. 1:10.78125, 4.21875 s (b151 to b160).**
[ON SCREEN: GRAPHIC: next to the giant number, a grid of dots (atoms) at 10^80 is shrunk on each beat until it is one dot, beside the number.]
[TEXT: card T19 "Atoms in the visible universe: about 10^80." holds b151 to b160; mono tag "estimate: 10^78 to 10^82", lower left, from b153 to b160] [src: 12]
[MUSIC: peak to breathe] [CUT: on the beat]

## Beat 7: Why it survives (1:15.000 to 1:30.000, b160 to b192, 8 bars)
Music: breathe at 1:15, then the closing hit on the last downbeat (b188). Void until b188.

**Cue 30. 1:15.000, 1.875 s (b160 to b164).**
[ON SCREEN: GRAPHIC: the hook's code returns, the same composition and the same hole as Cue 3. Its modules lift off the grid in groups of 8, each group boxed by a 2 px white frame, alternating 100% and 70% white. No new colour: red and lime stay reserved. A flat shadow under each lifted group.]
[TEXT: card T20 "8 bits = 1 codeword" starts here, holds to b167] [src: 4]
[MUSIC: breathe] [CUT: on the beat]

**Cue 31. 1:16.875, 1.875 s (b164 to b168).**
[ON SCREEN: GRAPHIC: the groups touched by the hole turn red #FF3B2F, one per beat, and are tallied as red tick marks along the edge (no numerals). The groups outside the hole stay white.]
[MUSIC: breathe] [CUT: on the beat]

**Cue 32. 1:18.75, 1.875 s (b168 to b172).**
[ON SCREEN: GRAPHIC: four white bars rise at heights in the ratio 7 : 15 : 25 : 30, left to right, the tallest outlined. No labels.]
[TEXT: card T21 "Level H restores about 30% of codewords." starts at b167, holds to b176] [src: 2, 4]
[MUSIC: build] [CUT: on the beat]

**Cue 33. 1:20.625, 1.875 s (b172 to b176).**
[ON SCREEN: GRAPHIC: one beat at a time, the red groups flip to lime: their data is restored. (A metaphor for "restores", not a claim about the mechanism.)] [src: 4]
[MUSIC: build] [CUT: on the beat]

**Cue 34. 1:22.500, 4.21875 s (b176 to b185).**
[ON SCREEN: GRAPHIC: a CD drawn as concentric rings of modules, rotating slowly. A red #FF3B2F scratch is drawn across it on b176. A lime #D7FF3A scan line then reads past the scratch, and the rings under it go lime.]
[TEXT: card T22 "Reed-Solomon. CDs use the same family." holds b176 to b185] [src: 4, 14]
[MUSIC: build] [CUT: on the beat]

**Cue 35. 1:26.71875, 1.40625 s (b185 to b188).**
[ON SCREEN: GRAPHIC: the hook's torn code returns on void, 29 x 29, white, the hook's frame and the same hole. A lime line reads it once more and the missing modules come up in lime, filling the hole: what was lost is read back. This is the answer to the hook.] [src: 2, 3]
[TEXT: card T23 "Partly missing. It still reads." starts here, holds to b192] [src: 26]
[MUSIC: peak, the closing build] [CUT: colour-block cut to paper on the last downbeat (b188)]

**Cue 36. 1:28.125, 1.875 s (b188 to b192).**
[ON SCREEN: GRAPHIC: on paper, the code in ink, 860 px wide, with its missing patch still filled in lime, so the card stays true. The card persists, now in ink, Inter 900, 120 px. No logo, no ask.]
[MUSIC: out, the final hit and a 2 to 3 s tail] [CUT: hold to the end]

## Text-card register (hold check)

| Card | Text | Words | Min hold | Start to end | Hold | src |
|---|---|---|---|---|---|---|
| T1 | Partly missing. | 2 | 2.5 s | b2 to b8 (0:00.9375 to 0:03.75) | 2.8125 s | 26 |
| T2 | It still reads. (B: Why does it still read?) | 3 (B: 5) | 2.5 s (B: 3.0 s) | b8 to b16 (0:03.75 to 0:07.5) | 3.75 s | 26 |
| T3 | 1994. DENSO. | 2 | 2.5 s | b16 to b22 (0:07.5 to 0:10.3125) | 2.8125 s | 1, 26 |
| T4 | A barcode held about 20 characters. | 6 | 3.5 s | b22 to b30 (0:10.3125 to 0:14.0625) | 3.75 s | 1, 26 |
| T5 | Some workers scanned up to about 1,000 barcodes daily. | 9 | 4.5 s | b30 to b40 (0:14.0625 to 0:18.75) | 4.6875 s | 26 |
| T6 | It started with two people. | 5 | 3.0 s | b40 to b47 (0:18.75 to 0:22.03125) | 3.28 s | 1, 26 |
| T7 | They searched print for the rarest pattern. | 7 | 4.0 s | b47 to b56 (0:22.03125 to 0:26.25) | 4.22 s | 26 |
| T8 | 1 : 1 : 3 : 1 : 1 | 5 | 3.0 s | b56 to b64 (0:26.25 to 0:30.0) | 3.75 s | 1, 26 |
| T9 | Found at any angle. | 4 | 3.0 s | b64 to b76 (0:30.0 to 0:35.625) | 5.625 s | 1, 26 |
| T10 | 21 x 21 to 177 x 177 | 7 | 4.0 s | b76 to b85 (0:35.625 to 0:39.84375) | 4.22 s | 2, 3 |
| T11 | AIM 1997. JIS 1999. ISO 2000. | 6 | 3.5 s | b85 to b93 (0:39.84375 to 0:43.59375) | 3.75 s | 2 |
| T12 | Micro QR 2004. rMQR 2022. | 5 | 3.0 s | b93 to b100 (0:43.59375 to 0:46.875) | 3.28 s | 22, 17 |
| T13 | Free to use, if you follow the standard. | 8 | 4.0 s | b100 to b109 (0:46.875 to 0:51.09375) | 4.22 s | 24, 25 |
| T14 | UPC barcode: 12 digits. | 4 | 3.0 s | b112 to b120 (0:52.5 to 0:56.25) | 3.75 s | 18 |
| T15 | Biggest QR: 7,089 digits. | 4 | 3.0 s | b120 to b128 (0:56.25 to 1:00.0) | 3.75 s | 2, 6 |
| tag | version 40, level L | 4 | 3.0 s | b120 to b128 | 3.75 s | 2, 6 |
| T16 | 7,089 digits. 10 choices each. | 5 | 3.0 s | b128 to b135 (1:00.0 to 1:03.28125) | 3.28 s | 2, 6 |
| T17 | 10 x 10 x 10 ... 7,089 times | 7 | 4.0 s | b135 to b144 (1:03.28125 to 1:07.5) | 4.22 s | 2, 6 |
| T18 | 10^7,089 codes. At least. | 4 | 3.0 s | b144 to b151 (1:07.5 to 1:10.78125) | 3.28 s | 2, 6 |
| tag | digits only | 2 | 2.5 s | b144 to b151 | 3.28 s | 2, 6 |
| T19 | Atoms in the visible universe: about 10^80. | 7 | 4.0 s | b151 to b160 (1:10.78125 to 1:15.0) | 4.22 s | 12 |
| tag | estimate: 10^78 to 10^82 | 4 | 3.0 s | b153 to b160 (1:11.71875 to 1:15.0) | 3.28 s | 12 |
| T20 | 8 bits = 1 codeword | 5 | 3.0 s | b160 to b167 (1:15.0 to 1:18.28125) | 3.28 s | 4 |
| T21 | Level H restores about 30% of codewords. | 7 | 4.0 s | b167 to b176 (1:18.28125 to 1:22.5) | 4.22 s | 2, 4 |
| T22 | Reed-Solomon. CDs use the same family. | 6 | 3.5 s | b176 to b185 (1:22.5 to 1:26.71875) | 4.22 s | 4, 14 |
| T23 | Partly missing. It still reads. | 5 | 3.0 s | b185 to b192 (1:26.71875 to 1:30.0) | 3.28 s | 26 |

Most words on screen at once: 10 (T19 with its tag). The limit is 12. Every card is at least its minimum hold.

## Sketch notes
No sketches in the inbox, so nothing to follow or push back on. Choices made where the plan left room:
- **Beat boundaries:** beat 4 runs 9 bars and beat 5 runs 4 bars. T10 and T13 need those holds. Beat 6 still starts at 1:00.000.
- **Paper and void:** beats 2 and 3 on paper, beat 4 on void, beat 5 on paper (the finder-fill cut at Cue 22 lands on it), beat 6 and beat 7 on void, then paper at the final hit.
- **Lime on paper** (Cues 15, 34 as the scan line, 36) is a fill behind ink outlines, never type, because lime has no contrast on paper.
- **Repeats on purpose:** Cue 30 and Cue 35 return to the hook's frame (Cues 1 to 4). That is the loop the plan asks for, and it is the only repeated image.
- **"Coloured groups of 8"** in the plan became white groups at 100% and 70%, so red and lime keep their meaning.
- **Closing card** is the anchor line in full, not only "It still reads.", so the film ends on the words it opened with. It can drop to "It still reads." in the edit if the creator prefers.

## Dropped or softened
- "1994. DENSO, Japan." became "1994. DENSO." because "Japan" was not confirmed in the opened pages.
- "Workers scanned about 1,000 a day" became "Some workers scanned up to about 1,000 barcodes daily." because [26] says "as many as approximately 1,000 barcodes per day", for the workers it describes.
- "Level H: about 30% of codewords can be lost" became "Level H restores about 30% of codewords." to fit the hold and match [4]'s "restoration rate".
- The first-QR "about 7,000" card, 2^23,648, "30% of area", speed claims, Toyota, Go, Voyager and Reed-Solomon dates are not used.
- Graphic-internal items (the 20 chips, the 12 tiles, the tick marks) carry no readable text and are not counted as words.

---
Cues: 36 picture cues, 23 cards and 3 tags (26 text items). On-screen words: 133 (cards 123, tags 10), counted per the register after the fact-check fixes. Runtime summed from cue durations: 90.0 s (192 beats at 128 BPM, 48 bars).
