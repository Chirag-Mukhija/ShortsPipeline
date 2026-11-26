# Fact-check: Why Broken QR Codes Still Work (video 003, music only)

Checked 2026-11-25 against `script.md` (cue sheet), `research/sources.md` and `research/facts.md`. Verdicts: PASS, FLAG (overstated / wrong source / uncited), FIX (arithmetic or timing error to correct; no source needed). Every text card and mono tag was checked, plus each visual that states or implies a number.

Sources opened in this check (WebFetch, page text read): [1] history, [2] standards, [4] error correction, [17] rMQR, [22] Micro QR, [24] FAQ, [26] development story, [12a] Stanford notes. The rest ([6], [14], [18], [25], [12b], [3]) are verified only against the quotes recorded in sources.md. Hook scores (hookscore.py) were not re-run.

Arithmetic checked by hand: all 36 cue starts and durations sit on the beat grid (b x 0.46875 s) and sum to 192 beats = 90.0 s; beat ranges are contiguous; every card's hold is at or above 1.5 s + 0.3 s per word, rounded up to the half second; the on-screen word total is 131 (121 cards + 10 tags); the most words on screen at once is 10 (T19 with its tag); 21 + 4 x 2 = 29 (version 3); 21 + 4 x 39 = 177; 1 + 1 + 3 + 1 + 1 = 7; 2,956 x 8 = 23,648 bits; 2,363 groups x 10 bits + 18 header bits = 23,648; 2,363 x 3 = 7,089.

| Beat | Claim (cue or card) | Verdict | Reason |
|---|---|---|---|
| 1 | Cue 1 and cue 35: code is 29 x 29 modules, version 3 | FLAG uncited | Size is right (21 + 4 x 2 = 29) and [2][3] give the rule, but neither cue carries a [src]. Add [src: 2, 3] to cues 1 and 35. |
| 1 | Cue 2–3: red beam tears a hole about 20% of the code's width | PASS | No number on screen. Do not caption it as an area figure: sources give codewords, not area ([4]). |
| 1 | T1 "Partly missing." | PASS | [26] (opened): code "can be read accurately even if a code is partially stained/missing." |
| 1 | T2 "It still reads." (B: "Why does it still read?") | PASS | [26] as above. Option B asks a question, so no claim. |
| 2 | T3 "1994. DENSO." | PASS | [1] and [26] (both opened): announced 1994, DENSO WAVE. |
| 2 | T4 "A barcode held about 20 characters." | PASS | [26] "20 alphabetic characters or so"; [1] "20 alphanumeric characters or so". |
| 2 | Cue 8: exactly 20 chips | PASS | Illustrates T4 only; no separate claim. |
| 2 | T5 "Some workers scanned about 1,000 barcodes a day." | FLAG overstated | Opened [26] reads "had to scan as many as approximately 1,000 barcodes per day": a ceiling. sources.md dropped "as many as". Use "Some workers scanned as many as about 1,000 barcodes a day." (10 words, hold 4.5 s, fits the 4.6875 s slot). |
| 2 | T6 "It started with two people." | PASS | [26] "with only two members"; [1] "only one other person". |
| 3 | Cue 10: faint 9 x 9 grid | PASS | Abstract graphic, no claim. Do not caption it as a code size. |
| 3 | T7 "They searched print for the rarest pattern." and cue 11 (leaflet, magazine, carton) | PASS | [26] surveyed printed matter for the ratio that "least appeared"; sources.md lists leaflets, magazines, corrugated cartons. |
| 3 | T8 and cue 12: ratio 1 : 1 : 3 : 1 : 1 | PASS | [26] (opened): "It was 1:1:3:1:1." Bars match the ratio. |
| 3 | Cue 13: finder square is 7 x 7 modules | FLAG uncited | Sum 1+1+3+1+1 = 7 is correct, but no opened page gives 7 x 7 ([26], [1], [4] all checked: not found). Add a source or drop the number. |
| 3 | T9 "Found at any angle." | PASS | [1] (opened): orientation "regardless of the angle of scanning"; [26] "regardless of the scanning angle". |
| 3 | Cue 14: finder squares at three corners | PASS | [26] (opened): position detection pattern "located at three corners of each code." |
| 4 | T10 "21 x 21 to 177 x 177" and cues 16–17 (+4 per side) | PASS | [2] "21 x 21 - 177 x 177 modules (size grows by 4 modules/side)"; [3]. Arithmetic checks. |
| 4 | T11 "AIM 1997. JIS 1999. ISO 2000." and cue 18 (three slabs) | PASS | [2] (opened): AIM Oct 1997; JIS X 0510 Jan 1999; ISO/IEC 18004 Jun 2000. Three standards, three slabs. |
| 4 | T12 "Micro QR 2004. rMQR 2022." and cue 19 (11 x 11, one finder) | PASS | [22] (opened): Micro QR approved Nov 2004; M1 = 11 x 11; "only one position detection pattern." [17] (opened): ISO approval 05.2022. |
| 4 | Cue 20: 7 x 43 rMQR | FLAG uncited | Value is correct per [17] (opened: smallest rMQR 7 x 43 modules), but cue 20 has no [src]. Add [src: 17]. |
| 4 | T13 "Free to use, if you follow the standard." and cue 21 | PASS | [24] (opened): "You can use the code freely as long as you follow the standards for QR Codes in JIS or ISO." Keep the condition on screen; never "free" alone. |
| 4 | Cue 22: finder fills the frame | PASS | Transition, no claim. |
| 5 | Cue 23: twelve tiles fill "one per beat from b112 to b119" | FIX | b112 to b119 is 8 beats, not 12. Twelve tiles at one per beat need b112 to b123, past cue 23 and the T14 hold (both end b120). Either fill two per beat over b112–b117, or extend the fill and move the next cue. |
| 5 | T14 "UPC barcode: 12 digits." | PASS | [18] (opened quote): UPC-A is "the flagship 12-digit format." |
| 5 | T15 "Biggest QR: 7,089 digits." and tag "version 40, level L" | PASS | [2] (opened): "Max. 7,089 characters" at the top version (177 x 177). "Biggest" is the top of the range, not a quoted word. [6] matches at L. |
| 5 | Cue 24: train of 7,089 tiles | PASS | Count is the T15 figure, mostly motion blur, so not countable on screen. |
| 6 | T16 "7,089 digits. 10 choices each." and cue 25 (ten notches) | PASS | Digits 0 to 9 = 10 choices; [2][6]. |
| 6 | Cues 26–27 and T17 "10 x 10 x 10 ... 7,089 times" | PASS | Wall of wheels is illustrative; the card reads as the product 10 multiplied 7,089 times. |
| 6 | T18 "10^7,089 codes. At least." and tag "digits only" | PASS | Product of 10 choices over 7,089 digits. Leading zeros count; "at least" covers other modes, sizes and levels. Checked: 7,089 x log2(10) = 23,548 bits, below the 23,648-bit ceiling. |
| 6 | T19 "Atoms in the universe: about 10^80." | FLAG overstated | [12a] (opened): "somewhere around 10^80 atoms in the visible universe." The card drops "visible". Use "Atoms in the visible universe: about 10^80." |
| 6 | T19 tag "estimate: 10^78 to 10^82" | PASS | [12b] (quote in sources.md): range 10^78 to 10^82, "rough". Keep "estimate" on screen. Caveat: that page's own sum gives 10^86 and it does not reconcile. |
| 6 | Cue 29: dot grid shrinks to one dot beside 10^7,089 | PASS | Comparison with no ratio on screen. |
| 7 | Cue 30 and T20 "8 modules = 1 codeword" | FLAG wrong source | [4] (opened): "One codeword of QR Code is equal to 8 bits." "Modules" is on no opened page. Boxed 8-module groups also show each codeword as a contiguous block, which the zigzag placement does not do. Use "8 bits = 1 codeword" [4], or label the groups as bits. |
| 7 | Cue 31: groups touched by the hole turn red | PASS | Illustrative; no number. |
| 7 | T21 "Level H restores about 30% of codewords." and cue 32 (bars 7 : 15 : 25 : 30) | PASS | [2] (opened): L 7%, M 15%, Q 25%, H 30% "can be restored"; [4] (opened): "data restoration rate for total codewords." Bar ratio matches. |
| 7 | Cue 33: each red group rebuilt "module by module" from spare groups | FLAG overstated | No opened source describes how damaged codewords are restored. [4] gives only the rate and that Reed-Solomon is used. Keep it as a metaphor, drop "module by module", and cite [4] for "restored". |
| 7 | T22 "Reed-Solomon. CDs use the same family." and cue 34 | PASS | [4] (opened): "Reed-Solomon Code is a mathematical error correction method used for music CDs etc."; [14] CIRC. |
| 7 | Cue 34: red scratch, lime scan reads past | PASS | No number. [14] gives no burst size, so the scratch must not imply one. |
| 7 | T23 "Partly missing. It still reads." and cue 35 | PASS | [26] as in T1 and T2. |

Not counted (not facts): cue 36 (no claim). Timing note: card T6 holds to b47, but cue 10 ends at b46 and cue 11 starts T7 at b47. The card overhangs the cue. Fix in the cue sheet if the creator wants them to match.

Source note: sources.md's quote for [26] drops "as many as", so the T5 line needs a rewrite. Update facts.md before the next pass.

## Resolved by the showrunner (2026-11-25)
All 7 FLAGs and the FIX are closed in script.md:
- Cues 1 and 35 cite [2, 3]; cue 20 cites [17]; cue 13 cites [27] (Thonky module placement, opened: "7 modules by 7 modules").
- T5 is now "Some workers scanned up to about 1,000 barcodes daily." ([26]: "as many as approximately 1,000 barcodes per day").
- T19 is now "Atoms in the visible universe: about 10^80." ([12a]).
- T20 is now "8 bits = 1 codeword" ([4]). The picture may still group modules, since data bits go into 2-module-wide columns ([27]), but no card says "modules".
- Cue 33 no longer says "rebuilt module by module"; the red groups flip to lime, a metaphor for [4]'s "restore data".
- Cue 23 fills two tiles per beat.
- Cues 35 and 36 keep the patch visible (lime), so the closing card "Partly missing. It still reads." is true of the picture.
- T6 may overhang its cue by one beat: cards may outlast pictures.

## Totals
- PASS: 30
- FLAG: 7 (uncited 3, overstated 3, wrong source 1)
- FIX: 1
