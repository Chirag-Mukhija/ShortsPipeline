// Studio shell: passcode gate, the sidebar, live updates, and hash-routed pages behind error boundaries.
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { studio } from "./api";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Login } from "./components/Login";
import { Sidebar } from "./components/Sidebar";
import { SystemBar } from "./components/SystemBar";
import { Empty } from "./components/ui";
import { useLiveUpdates, useRoute, type Route } from "./hooks";
import { Board } from "./pages/Board";
import { Guide } from "./pages/Guide";
import { Home } from "./pages/Home";
import { ProjectPage } from "./pages/ProjectPage";
import { RecordPage } from "./pages/RecordPage";
import { VideoPage } from "./pages/VideoPage";
import { VoicePage } from "./pages/VoicePage";
import { Library } from "./pages/Library";
import { EditPage } from "./pages/EditPage";

function Page({ route }: { route: Route }) {
  switch (route.page) {
    case "video":
      return <VideoPage id={route.id} />;
    case "record":
      return <RecordPage id={route.id} />;
    case "edit":
      return <EditPage id={route.id} />;
    case "voice":
      return <VoicePage />;
    case "guide":
      return <Guide />;
    case "library":
      return <Library />;
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
  const scroller = useRef<HTMLElement>(null);
  const key = "id" in route ? `${route.page}:${route.id}` : route.page;
  const focus = route.page === "record";
  const legacy = route.page === "shorts" || route.page === "project";
  // Each page starts at the top; the main column, not the window, is what scrolls.
  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
  }, [key]);
  return (
    <div className="flex h-full flex-col lg:flex-row">
      <Sidebar route={route} compact={focus} />
      <main ref={scroller} className="scrollbar-thin min-h-0 min-w-0 flex-1 overflow-y-auto">
        <div key={key} className={`rise ${focus ? "h-full p-3 md:p-4" : "mx-auto w-full max-w-[1280px] px-5 py-7 md:px-10 md:py-10"}`}>
          {legacy ? (
            <div className="mb-6">
              <ErrorBoundary label="status bar">
                <SystemBar />
              </ErrorBoundary>
            </div>
          ) : null}
          <ErrorBoundary key={key} label={`${route.page} page`}>
            <Page route={route} />
          </ErrorBoundary>
        </div>
      </main>
    </div>
  );
}

export function App() {
  const { data: auth, error } = useQuery({ queryKey: ["auth"], queryFn: studio.auth, retry: false });
  if (error) {
    return (
      <div className="mx-auto max-w-md p-10">
        <Empty>{error.message}</Empty>
      </div>
    );
  }
  if (!auth) return null;
  return auth.required && !auth.ok ? <Login /> : <Studio />;
}
