// Palette catalog id and a deterministic per-project picker, so consecutive shorts in the backlog don't repeat.
export const PALETTE_IDS = ["amberBlack", "cyanNavy", "magentaViolet", "emeraldTeal", "crimsonCharcoal"] as const;
export type PaletteId = (typeof PALETTE_IDS)[number];

export function pickPalette(seed: string): PaletteId {
  const hash = [...seed].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0, 7);
  return PALETTE_IDS[hash % PALETTE_IDS.length]!;
}
