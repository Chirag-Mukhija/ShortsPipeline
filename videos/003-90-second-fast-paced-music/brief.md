# Brief: QR code, 90 s, music only (researched 2026-11-25, second pass done)

Full working: `research/sources.md` (26 sources, all opened or marked dropped), `research/facts.md` (card phrasings, nuances, hook ranking, unverified list), `research/niche.json`.

## The idea in one line
A 90-second kinetic-type film where every shot is one sourced fact about the QR code, ending on why a damaged square still scans.

## What already works
Public listings only (yt-dlp metadata); retention is unknown.

| Multiple | Views | Channel | Title | Angle |
|---|---|---|---|---|
| 254x | 457,785 | NDTV India | Who invented QR code? (Hindi/English) | Human story: the inventor who "took no money"; 5:11 |
| 194x | 1,365,290 | History of Simple Things | How Do QR Codes Work? | Plain mechanism explainer; 8:09 |
| 185x | 185,478 | Scanova | How do QR Codes Work: Explained in Minutes | Quick "explained"; 3:45 |
| 57x | 10,980 | European Patent Office | Masahiro Hara et al - the QR code | Inventor award profile |
| 56x | 168,760 | Explaining Tech Like You're Five | The Secret Behind QR Codes | Secret-behind-it explainer |

Shared pattern: all are narrated, 3 to 8 minutes, and promise "how it works" or "who invented it". Damage tolerance appears only in tiny channels (5x or less). The visual-only searches returned no QR outlier (only meditation and "ASMR coding" videos), so there is no benchmark for first frame, cut speed or text. A music-only QR film is an open lane, not a proven one.

## The gap
Everyone tells the story or the mechanism in minutes with a voice. Nobody does the facts as 90 seconds of one-fact shots, shows the working behind a big number, or separates "30% of codewords" from the "30% of area" many pages repeat (including an IEEE Spectrum quote of Hara). Common sources also disagree (7,087 vs 7,089 digits; 5x vs 10x faster; 12-, 13- or 20-character barcodes). Precision is the edge. The creator captures nothing: every shot is drawn from modules, finder patterns, quiet zone, scan lines, Go stones, parts on a line.

## Three angles

**A. The Square That Survives** (damage first)
- Visual hook: a clean QR on black; a hole is torn through it and the scan line still turns green. Card: "Up to 30% of its codewords can be lost." [2][4]
- Promise: why it works, then how it was made.
- Why it wins: damage is the only angle small channels touch, and it is the most surprising claim with a maker-grade source. Echoes the idea's "leave with" line.
- Show: nothing. Risk: "30%" mistaken for area. Wording stays "codewords, level H".

**B. 10^7,089** (the number first)
- Visual hook: a counter spins digits until it fills the frame, then a tiny "10^80 atoms" bar appears beside it. [12]
- Promise: how many QR codes can exist, with the working line by line: 7,089 digits, 10 choices each, 10 x 10 x ... 7,089 times.
- Why it wins: "show the working behind big numbers" is the creator's rule and no outlier does it. The sum needs only the capacity figure from DENSO [2], no bit conversion. Strongest curiosity-to-amazement arc.
- Show: nothing. Risk: it is a floor (digits only, version 40), and 10^80 is an estimate (range 10^78 to 10^82). Needs one caveat card.

**C. The Rarest Ratio** (origin first)
- Visual hook: a scan line sweeps across leaflets, magazines and cartons, stops on 1:1:3:1:1. Card: "The ratio that appeared least in print." [26]
- Promise: why a two-person start built it, how it grew, then the numbers.
- Why it wins: matches the biggest outliers' human angle (NDTV 254x, EPO 57x) in 90 seconds. Strongest sources.
- Show: nothing. Risk: the least "amazed" arc, and Go cannot be tied to the finder pattern (see facts.md).

## Facts the script can use (one line each; wording and nuance in facts.md)
- DENSO announced it in 1994; a barcode held "about 20" characters [26][1].
- DENSO WAVE: started "with only two members"; about a year and a half [26][1].
- 1:1:3:1:1 was found by surveying leaflets, magazines and cartons for the ratio that least appeared [26].
- Hara credits Go for blur-then-refine reading; not for the finder pattern [8].
- Patent retained, "would not exercise" [1]; free for standardized codes [2][25].
- AIM Oct 1997, JIS Jan 1999, ISO/IEC 18004 June 2000 [2]. Micro QR Nov 2004 [22]. rMQR ISO approval May 2022 [17]. Model 1 held 1,167 numerals, Model 2 7,089 [21].
- Version 1 is 21x21; version 40 is 177x177; +4 per side [2][3]. Quiet zone: four modules [20]. iOS 11 added Camera QR detection [16].
- Version 40-L holds 7,089 digits, 4,296 alphanumeric, 2,953 bytes [2][6]. UPC-A holds 12 digits [18].
- 7,089 digits, each 0-9, give 10^7,089 digit-only codes (a floor); atoms about 10^80, range 10^78 to 10^82, so 10^7,007 times the top [2][6][12].
- Upper bound on 40-L bit patterns: 2,956 codewords x 8 = 23,648 bits, 2^23,648 about 5.7 x 10^7,118; not every pattern is a valid message [5]. Not 2^31,329: 750 of 3,706 codewords are computed error correction [5].
- Levels L/M/Q/H about 7/15/25/30% of codewords [2][4]. Stained or missing, it still reads [26]. CDs use CIRC, two interleaved Reed-Solomon codes [14].

## Hook ranking (surprise and source)
1. 30% of codewords at level H. 2. 10^7,089 codes vs atoms. 3. Rarest print ratio. 4. Patent never enforced. 5. 20 characters vs 7,089 digits.

## Open questions for the creator
1. Is the 10^7,089 floor (digits only, version 40) acceptable as the hero, with its caveat card?
2. Voyager and the Reed-Solomon year are dropped (not verified). Keep the CD link only?
3. Model 1 vs Model 2 is verified but undated: show it without a year?
