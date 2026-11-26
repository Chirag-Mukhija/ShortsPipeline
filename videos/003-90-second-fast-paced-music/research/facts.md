# Fact ledger for text cards (video 003), 2026-11-25, second pass

Cards are 12 words or fewer. [n] = sources.md, all opened unless the line says DROPPED. "Nuance" = what the wording must not break.

## Hook ranking (surprise x source strength)
1. "A QR code can lose up to 30% of its codewords and still scan." [2][4] Surprise 5, source 5. Say codewords, never area, and "level H".
2. "10^7,089 different codes, from digits alone." [2][6] Surprise 5, source 5 for the inputs, the sum is plain arithmetic (see count). Needs one caveat card.
3. "The team chose the print ratio that appeared least: 1:1:3:1:1." [26][1] Surprise 4, source 5.
4. "DENSO holds the patent. It declared it would not enforce it." [1][2] Surprise 4, source 5 (the "not exercise" wording is on [1] only; [25] does not repeat it).
5. "A barcode held about 20 characters. QR holds 7,089 digits." [26][1][2] Surprise 4, source 5. Different units: keep "about" and "digits".

## Who, where, when, why
- "1994. DENSO. Factories needed to read more." [26][1] Nuance: DENSO WAVE says manufacturing sites requested it, "codes of parts on manufacturing lines"; it does not say "car parts". "Car parts" is IEEE [7] (DENSO tracked car parts with UPCs). Use "factory parts" with [26], or "car parts" with [7]. Do not say Toyota.
- "A barcode held only about 20 characters." [26][1][10] Nuance: DENSO's own words "or so". Never generalise: UPC-A is 12 digits [18]; Hara said 13-digit [11]; they are different barcodes.
- "Workers scanned about 1,000 barcodes a day." [26] DENSO WAVE's own wording ("approximately 1,000 barcodes per day"). Nuance: that is the count for the workers the page describes, not per product. Replaces the "10 barcodes per product" idea, which stays attributed to Hara only [11].
- "Two engineers. About a year and a half." [26][1] Nuance: "with only two members". EPO lists five award inventors including Toyota Central R&D members (search snippet only, not opened), so "two" = the start of the project only; say "started with two".
- "The first code held about 7,000 digits." [26][1] Nuance: "about 7,000 figures" plus Kanji. The 7,089 figure belongs to Model 2, version 40 [21]. Model 1 held 1,167 numerals, max version 14, 73x73 [21]: so the "first QR" and "7,089" are NOT the same code. Do not say the 1994 code held 7,089.
- "They surveyed leaflets, magazines and cartons for the rarest ratio." [26] Nuance: the survey found the ratio that "least appeared": 1:1:3:1:1. Newspapers, thousands of items and "three months" are NOT on DENSO's page (the three months is IEEE [7] only): drop them.
- "Read 10 times faster than other codes." [26][1] Nuance: DENSO's claim, in 1994 terms. IEEE has Hara saying five times [7]. If used: "DENSO: 10x faster" with attribution, or drop. Default: DROP.
- "Hara credits the game of Go." [8] Nuance: [8] ties Go to ink blotches and "read roughly first, then fine-tune". Neither [26] nor [1] mentions Go. "Lunchtime game" is Wikipedia citing the Guardian (not opened). Never link Go to the three corner squares or to Reed-Solomon.

## Patent and trademark
- "DENSO WAVE holds the patents. Standard QR codes are free to use." [25][24] Exact: "Everyone can use the QR Code freely as long as following the standards for QR Codes in JIS or ISO."; for codes that deviate, "contact the patent holders". [2]: "waived the rights to a patent (Patent No. 2938338) for standardized QR Codes only."
- "It declared it would not exercise them." [1] only.
- Trademark: "QR Code" the word is a DENSO WAVE registered trademark, not the pattern [24]. Optional card: "The word is trademarked. The pattern is free." Nuance: "free" only for standard codes.

## Evolution
- 1994 announced [1]. Model 1 (up to version 14, 73x73) then Model 2 (up to version 40, 177x177, adds an alignment pattern for distortion) [21]; no dates on that page, so no year on a Model 2 card.
- Oct 1997 AIM, Jan 1999 JIS X 0510, Jun 2000 ISO/IEC 18004 [2]. Card: "Standardised by AIM, JIS and ISO in three years." [2] (Oct 1997 to Jun 2000 is under three years.)
- Micro QR: JIS Nov 2004; four sizes 11 to 17 modules; one finder pattern; max 35 numerals [22]. Card: "Micro QR: one finder, 11 x 11 modules." [22]
- rMQR: ISO approval May 2022; 7x43 to 17x139; "one and a half" finder patterns; up to 361 numerals [17]. ISO number NOT read: do not print "23941".
- iQR 2008 and FrameQR 2014: years on [1] only (the iQR page 404ed, the FrameQR page has no year). FrameQR = a central canvas for graphics [23]. SQRC = public plus private data with reading restriction, not a guarantee of security [23]; no date.
- Phones: "iOS 11 added system support to detect QR codes in Camera." [16] Opened Apple developer session. The year 2017 is hedged (session is fall 2017). "Phones started reading them in X" generally: DROPPED (no source read).
- Payments: [19] "used as a payment system"; no dates. Any dated payment card DROPPED.

## QR vs barcode
- "UPC-A: 12 digits. QR version 40-L: 7,089 digits." [18][2][6] Nuance: UPC-A is one symbology; Code 128 variable-length: DROPPED (snippet only).
- v40 capacities [2][6]: L 7,089 / 4,296 / 2,953 / 1,817; M 5,596 / 3,391 / 2,331 / 1,435; Q 3,993 / 2,420 / 1,663 / 1,024; H 3,057 / 1,852 / 1,273 / 784 (digits / alphanumeric / bytes / Kanji). A card with one number names its mode and level.
- "More correction, less room: 7,089 digits at L, 3,057 at H." [6]
- "100x / 350x more than a barcode": DROPPED.

## How many QR codes (counted this way)
Main figure, a floor, no bit conversion.
1. Version 40, level L holds 7,089 digits (numeric mode) [2][6].
2. Each digit is 0 to 9: 10 choices. 7,089 digits in a row: 10 x 10 x ... x 10, 7,089 times = 10^7,089 different all-digit messages (leading zeros count as digits). It is a 1 followed by 7,089 zeros, a 7,090-digit number.
3. Each different digit string encodes to a different set of data codewords, so it is a different symbol. These are valid messages: every one decodes to its digits.
4. It is a floor: digits only, one size, one level. Letters, bytes, Kanji, mixed modes, shorter lengths, other versions and levels all add more.
5. Comparison: about 10^80 atoms in the observable universe [12a, Stanford course notes]; estimates range 10^78 to 10^82 [12b, Universe Today, "rough"]. Against the top of the range, 10^82: 10^7,089 / 10^82 = 10^7,007 times more. Against 10^80: 10^7,009 times more. Card: "10^7,089 digit-only codes. Atoms in the universe: about 10^80."
6. Caveats a careful viewer will raise:
   - It counts codes by message, at one size and level. Say "at least".
   - 10^80 is an estimate; the range tops out at 10^82 [12b]. The comparison holds at either end.
   - "Possible" is not "printable and scannable": a real camera and printer limit practice. The count says nothing about which are readable at small sizes.
   - Version 40 is huge; most real QR codes are version 2 to 10.
Secondary note, an upper bound on the bit patterns at 40-L:
- 2,956 data codewords [5] x 8 bits = 23,648 free bits. 2^23,648: 23,648 x log10(2) = 23,648 x 0.30103 = 7,118.76, so about 5.7 x 10^7,118.
- Do NOT call each of those a valid message: the stream begins with a mode indicator and a length, so many bit strings are not valid messages (this replaces the earlier "a scanner would still read each one", which was wrong). It is the ceiling for data bit patterns, one size, one level.
- Check: 10^7,089 = 2^(7,089 x 3.3219) = 2^23,548, below 2^23,648, as it must be.
- Why not 2^(177 x 177) = 2^31,329, about 10^9,431? Modules are not free: 3,706 codewords in total (2,956 data + 25 blocks x 30 EC = 750) [5]; 3,706 x 8 = 29,648 data-area modules; the 750 EC codewords are computed from the data; the other 1,681 modules are finder, timing, alignment, format and version patterns. Only 23,648 bits are free.
- Cards for the working: "7,089 digits. Each digit: 10 choices." / "10 x 10 x 10 ... 7,089 times." / "= 10^7,089 codes." / "Atoms in the universe: about 10^80."

## Damage
- "Levels L 7%, M 15%, Q 25%, H 30%." [2] Nuance: approximate "restoration rate for total codewords" [4]; a codeword is 8 bits [4].
- DENSO WAVE's own words: "QR Code, with an error correction function, can be read accurately even if a code is partially stained/missing." [26]. Safe, area-free card: "Partly stained or missing? It still reads." [26]
- No DENSO page I opened says what damage does to the finder patterns or where data sits ([4], [20], [26] checked): it is silent. The only finder-pattern statements are that they let the code be found at any angle [1][26] and that Micro QR has one [22]. So "it cannot survive a destroyed finder pattern" is an INFERENCE: show it as a visual only, no card, no number.
- "The maths is Reed-Solomon." [4] mentions Reed-Solomon codewords. The year (1960), "June" and "MIT Lincoln Laboratory" are DROPPED [13] (not read). Say only "Reed-Solomon codes".
- "CDs use the same family: Cross Interleaved Reed-Solomon." [14] No burst-size figure.
- Voyager: DROPPED [15].

## Modules
- "Version 1: 21 x 21 modules. Version 40: 177 x 177." [2][3]; +4 per side per version (21 + 4 x 39 = 177). 40 versions [3].
- "Quiet zone: four empty modules on every side." [20] opened. (Micro QR needs only two [22].)
- "Eight mask patterns": Thonky masking page (opened, B) only. Usable; purpose of masks not read, omit.

## Repeated online, NOT verified or contradicted (do not use)
- "30% of the area can be destroyed" (IEEE quote [7], many blogs). DENSO says codewords [4].
- "Read 5x faster" vs "10x faster" vs "100x / 350x more data": conflicting.
- "Toyota invented QR" / "invented for Toyota". DENSO is the inventor; Toyota Central R&D members were on the award team (snippet).
- "Hara solved it at lunch playing Go" and "Go gave the finder pattern": not in any DENSO page; the lunch story is Wikipedia -> Guardian, not opened.
- "Newspapers", "thousands of items", "three months" for the ratio survey: not on DENSO's page [26].
- "Workers scanned 10 barcodes per box": only Hara's "sometimes" [11].
- "The first QR code held 7,089 digits": Model 1 held 1,167 [21].
- "Used on a Toyota line in 1994": no dated use read.
- "Voyager used Reed-Solomon from launch" and any Voyager card.
- "Reed-Solomon, 1960, MIT": not read here [13].
- "Code 128 holds N characters", "all barcodes hold 20": generalisations; DROPPED.
- "QR code inside iOS in 2017 / phones read QR since 2002": only "iOS 11" is verified [16].
- "Alipay / WeChat / pandemic made QR big": no source read.
- "2^(177 x 177) codes, 10^9,431": wrong.
- "Hara's 7,087 digits": spec says 7,089.
- "ISO/IEC 23941" as the rMQR number: not read.
- "Sudha Murty said he took no money" (NDTV title): a YouTube title, not a source.
