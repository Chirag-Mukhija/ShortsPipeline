// Per-render theme (palette, tones, layout): provided once at the composition root from the timeline's chosen
// palette, so every template reads colors/geometry through useTheme() instead of importing a fixed global.
import { PALETTES, resolveLayout, tonesFor, type Layout, type Palette, type ToneName } from "./brand";
import { createContext, useContext, useMemo, type FC, type ReactNode } from "react";
import type { PaletteId } from "@clipforge/schema";

type ThemeValue = { palette: Palette; tones: Record<ToneName, string>; layout: Layout };

const ThemeContext = createContext<ThemeValue | null>(null);

export const ThemeProvider: FC<{ paletteId: PaletteId; hasBackground: boolean; children: ReactNode }> = ({
  paletteId,
  hasBackground,
  children,
}) => {
  const value = useMemo<ThemeValue>(() => {
    const palette = PALETTES[paletteId];
    return { palette, tones: tonesFor(palette), layout: resolveLayout(hasBackground) };
  }, [paletteId, hasBackground]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export function useTheme(): ThemeValue {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useTheme() called outside a ThemeProvider");
  return value;
}
