// The studio's navigation: a left sidebar on a laptop (icons only on the record page), a top bar on narrow screens like an iPad in portrait.
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { studio } from "../api";
import { hrefOf, type Route } from "../hooks";
import { useTheme } from "../theme";
import { BoltIcon, GuideIcon, MicIcon, MoonIcon, SunIcon, VideosIcon } from "./icons";
import { UsageMeter } from "./UsageMeter";

type Item = { route: Route; label: string; icon: ReactNode; active: (route: Route) => boolean; badge?: boolean };

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <a href={hrefOf({ page: "board" })} className="flex items-center gap-2.5" aria-label="ClipForge studio home">
      <span className="grid size-7 shrink-0 place-items-center rounded-lg border border-line bg-surface">
        <span className="size-2.5 rounded-full bg-accent" />
      </span>
      {compact ? null : (
        <span className="text-[15px] font-semibold tracking-[-0.02em] text-ink">
          ClipForge <span className="font-normal text-dim">Studio</span>
        </span>
      )}
    </a>
  );
}

function ThemeToggle() {
  const [theme, toggle] = useTheme();
  const label = theme === "light" ? "Switch to dark mode" : "Switch to light mode";
  return (
    <button onClick={toggle} title={label} aria-label={label} className="grid size-8 shrink-0 place-items-center rounded-lg text-dim transition-colors hover:bg-surface hover:text-ink">
      {theme === "light" ? <MoonIcon size={15} /> : <SunIcon size={15} />}
    </button>
  );
}

export function Sidebar({ route, compact }: { route: Route; compact: boolean }) {
  const { data: voice } = useQuery({ queryKey: ["voice"], queryFn: studio.voice, staleTime: 60_000 });
  const items: Item[] = [
    { route: { page: "board" }, label: "Videos", icon: <VideosIcon />, active: (r) => r.page === "board" || r.page === "video" || r.page === "record" },
    { route: { page: "voice" }, label: "Voice practice", icon: <MicIcon />, active: (r) => r.page === "voice", badge: voice?.due },
    { route: { page: "guide" }, label: "How it works", icon: <GuideIcon />, active: (r) => r.page === "guide" },
  ];
  const legacy = route.page === "shorts" || route.page === "project";

  const link = (item: Item, mobile = false) => {
    const on = item.active(route);
    return (
      <a
        key={item.label}
        href={hrefOf(item.route)}
        title={compact ? item.label : undefined}
        aria-current={on ? "page" : undefined}
        className={`relative flex items-center gap-2.5 rounded-lg text-sm transition-colors ${compact && !mobile ? "size-9 justify-center" : "h-9 px-2.5"} ${
          on ? "bg-surface-hi text-ink" : "text-muted hover:bg-surface hover:text-ink"
        }`}
      >
        {item.icon}
        {compact && !mobile ? null : <span className={mobile ? "hidden sm:inline" : ""}>{item.label}</span>}
        {item.badge ? <span className={`size-1.5 rounded-full bg-accent ${compact && !mobile ? "absolute right-1.5 top-1.5" : "ml-auto"}`} title="A new voice sample is due" /> : null}
      </a>
    );
  };

  return (
    <>
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-line px-4 lg:hidden">
        <Logo />
        <nav className="flex items-center gap-1">
          {items.map((item) => link(item, true))}
          <ThemeToggle />
        </nav>
      </header>
      <aside className={`hidden shrink-0 flex-col border-r border-line bg-bg lg:flex ${compact ? "w-[60px] items-center px-2 py-4" : "w-[232px] px-3 py-5"}`}>
        <div className={compact ? "mb-6" : "mb-8 flex items-center justify-between pl-1.5"}>
          <Logo compact={compact} />
          {compact ? null : <ThemeToggle />}
        </div>
        {compact ? null : <div className="eyebrow mb-2 px-2.5">Studio</div>}
        <nav className="flex flex-col gap-0.5">{items.map((item) => link(item))}</nav>
        <div className={`mt-auto flex flex-col ${compact ? "items-center gap-4" : "gap-5 px-1.5"}`}>
          {compact ? <ThemeToggle /> : null}
          <UsageMeter compact={compact} />
          {compact ? null : (
            <a
              href={hrefOf({ page: "shorts" })}
              className={`flex items-center gap-2 border-t border-line pt-4 text-xs transition-colors ${legacy ? "text-ink" : "text-dim hover:text-muted"}`}
            >
              <BoltIcon size={14} /> Quick Shorts <span className="eyebrow ml-auto text-[10px]">Legacy</span>
            </a>
          )}
        </div>
      </aside>
    </>
  );
}
