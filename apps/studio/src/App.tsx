// Studio shell: header with system status, live-update wiring and hash-routed pages, each behind an error boundary.
import { ErrorBoundary } from "./components/ErrorBoundary";
import { SystemBar } from "./components/SystemBar";
import { navigate, useLiveUpdates, useRoute } from "./hooks";
import { Home } from "./pages/Home";
import { ProjectPage } from "./pages/ProjectPage";

export function App() {
  const route = useRoute();
  useLiveUpdates();
  return (
    <div className="mx-auto flex min-h-full max-w-[1480px] flex-col px-6 pb-16">
      <header className="flex flex-wrap items-center justify-between gap-4 py-5">
        <button className="flex items-baseline gap-2 text-left" onClick={() => navigate({ page: "home" })}>
          <span className="font-display text-2xl font-extrabold tracking-tight">
            ClipForge<span className="text-accent">.</span>
          </span>
          <span className="text-xs text-dim">auto shorts studio</span>
        </button>
        <ErrorBoundary label="status bar">
          <SystemBar />
        </ErrorBoundary>
      </header>
      <ErrorBoundary key={route.page === "project" ? route.id : "home"} label={route.page === "project" ? "project page" : "home page"}>
        {route.page === "project" ? <ProjectPage id={route.id} /> : <Home />}
      </ErrorBoundary>
    </div>
  );
}
