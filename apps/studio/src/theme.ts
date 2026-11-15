// Light or dark: your saved choice, else the system's; index.html applies it before first paint so there's no flash.
import { useEffect, useState } from "react";

export type Theme = "light" | "dark";
const KEY = "studio.theme";

export function currentTheme(): Theme {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

function apply(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "light" ? "#f6f6f4" : "#0a0a0a");
  window.dispatchEvent(new CustomEvent(EVENT, { detail: theme }));
}

const EVENT = "studio-theme";

export function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>(currentTheme);
  // Until you pick one, the studio follows the system setting live.
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: light)");
    const follow = () => {
      let saved: string | null = null;
      try {
        saved = localStorage.getItem(KEY);
      } catch {
        // storage blocked: just follow the system
      }
      if (saved) return;
      apply(media.matches ? "light" : "dark");
    };
    // Every toggle on the page (sidebar and top bar) shows the same theme.
    const sync = (event: Event) => setTheme((event as CustomEvent<Theme>).detail);
    media.addEventListener("change", follow);
    window.addEventListener(EVENT, sync);
    return () => {
      media.removeEventListener("change", follow);
      window.removeEventListener(EVENT, sync);
    };
  }, []);
  const toggle = () => {
    const next: Theme = theme === "light" ? "dark" : "light";
    apply(next);
    try {
      localStorage.setItem(KEY, next);
    } catch {
      // storage blocked: the choice lasts for this visit
    }
  };
  return [theme, toggle];
}
