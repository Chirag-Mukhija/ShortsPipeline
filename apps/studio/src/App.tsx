// Studio shell: passcode gate, header with navigation and the Pro usage meter, live updates, and hash-routed pages behind error boundaries.
import { useQuery } from "@tanstack/react-query";
import { studio } from "./api";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Login } from "./components/Login";
import { SystemBar } from "./components/SystemBar";
import { UsageMeter } from "./components/UsageMeter";
import { Empty } from "./components/ui";
import { navigate, useLiveUpdates, useRoute, type Route } from "./hooks";
import { Board } from "./pages/Board";
import { Home } from "./pages/Home";
import { ProjectPage } from "./pages/ProjectPage";
import { VideoPage } from "./pages/VideoPage";

function Page({ route }: { route: Route }) {
  switch (route.page) {
    case "video":
      return <VideoPage id={route.id} />;
    case "shorts":
      return <Home />;
    case "project":
      return <ProjectPage id={route.id} />;
    default:
      return <Board />;
  }
}

function Studio() {
  const route = useRoute();
  useLiveUpdates();
  const shorts = route.page === "shorts" || route.page === "project";
  const tab = (active: boolean) => `rounded-lg px-3 py-1.5 text-sm transition ${active ? "bg-surface-hi text-ink" : "text-muted hover:text-ink"}`;
  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-4 py-5">
        <div className="flex flex-wrap items-center gap-4">
          <button className="flex items-baseline gap-2 text-left" onClick={() => navigate({ page: "board" })}>
            <span className="font-display text-2xl font-extrabold tracking-tight">
              ClipForge<span className="text-accent">.</span>
            </span>
            <span className="text-xs text-dim">studio</span>
          </button>
          <nav className="flex gap-1 rounded-xl border border-line bg-surface p-1">
            <button className={tab(!shorts)} onClick={() => navigate({ page: "board" })}>
              Videos
            </button>
            <button className={tab(shorts)} onClick={() => navigate({ page: "shorts" })}>
              Quick Shorts
            </button>
          </nav>
        </div>
        <ErrorBoundary label="status bar">{shorts ? <SystemBar /> : <UsageMeter />}</ErrorBoundary>
      </header>
      <ErrorBoundary key={"id" in route ? route.id : route.page} label={`${route.page} page`}>
        <Page route={route} />
      </ErrorBoundary>
    </>
  );
}

export function App() {
  const { data: auth, error } = useQuery({ queryKey: ["auth"], queryFn: studio.auth, retry: false });
  return (
    <div className="mx-auto flex min-h-full max-w-[1480px] flex-col px-4 pb-16 sm:px-6">
      {error ? <Empty>{error.message}</Empty> : !auth ? null : auth.required && !auth.ok ? <Login /> : <Studio />}
    </div>
  );
}
