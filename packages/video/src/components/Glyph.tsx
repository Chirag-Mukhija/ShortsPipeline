// Renders an icon token — an emoji or a Lucide icon written as 'lucide:<name>' — at a given size and color.
import { icons } from "lucide-react";
import type { FC } from "react";
import { useTheme } from "../ThemeContext";

type LucideName = keyof typeof icons;

function toPascal(name: string): string {
  return name
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

function lookupLucide(name: string) {
  const key = toPascal(name);
  return key in icons ? icons[key as LucideName] : null;
}

export const Glyph: FC<{ icon?: string; size: number; color?: string; strokeWidth?: number }> = ({
  icon,
  size,
  color,
  strokeWidth = 2,
}) => {
  const { palette } = useTheme();
  const resolvedColor = color ?? palette.text;
  if (!icon) return null;
  const trimmed = icon.trim();
  const lucideName = trimmed.startsWith("lucide:") ? trimmed.slice(7) : /^[a-z0-9-]+$/i.test(trimmed) ? trimmed : null;
  if (lucideName !== null) {
    const Icon = lookupLucide(lucideName);
    if (!Icon) return null;
    return <Icon size={size} color={resolvedColor} strokeWidth={strokeWidth} />;
  }
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        fontSize: size * 0.86,
        lineHeight: 1,
      }}
    >
      {trimmed}
    </span>
  );
};
