// Project page: live pipeline progress and log, the video preview, step outputs and controls to retry or re-run.
import { STEPS, STEP_LABELS, type Script, type Step, type Timeline } from "@clipforge/schema";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";
import { ArtifactTabs } from "../components/ArtifactTabs";
import { LogPanel } from "../components/LogPanel";
import { Preview } from "../components/Preview";
import { StepTrack } from "../components/StepTrack";
import { Button, Empty, Panel, StatusBadge } from "../components/ui";
import { navigate } from "../hooks";

export function ProjectPage({ id }: { id: string }) {
  const client = useQueryClient();
  const { data: project, error } = useQuery({
    queryKey: ["project", id],
    queryFn: () => api.project(id),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "running" || status === "queued" ? 5000 : false;
    },
  });
  const refresh = () => {
    void client.invalidateQueries({ queryKey: ["project", id] });
    void client.invalidateQueries({ queryKey: ["projects"] });
  };
  const start = useMutation({ mutationFn: (from?: Step) => api.start(id, from), onSuccess: refresh });
  const retry = useMutation({ mutationFn: () => api.retry(id), onSuccess: refresh });
  const approve = useMutation({ mutationFn: () => api.approve(id), onSuccess: refresh });
  const saveScript = useMutation({ mutationFn: (script: Script) => api.saveScript(id, script), onSuccess: refresh });
  const regenerateReview = useMutation({ mutationFn: (note: string) => api.regenerateReview(id, note), onSuccess: refresh });
  const remove = useMutation({
    mutationFn: () => api.remove(id),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["projects"] });
      navigate({ page: "home" });
    },
  });

  if (error) return <Empty>{error.message}</Empty>;
  if (!project) return <Empty>Loading…</Empty>;
  const busy = project.status === "running" || project.status === "queued";
  const timeline = project.artifacts.timeline as Timeline | undefined;

  return (
    <main className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <button className="self-start text-xs text-muted hover:text-ink" onClick={() => navigate({ page: "home" })}>
            ← All shorts
          </button>
          <h1 className="font-display text-2xl font-extrabold leading-tight tracking-tight md:text-3xl">{project.title ?? project.topic}</h1>
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted">
            <StatusBadge status={project.status} />
            {project.title ? <span>{project.topic}</span> : null}
            {project.spendInr > 0 ? <span>₹{project.spendInr.toFixed(2)} spent</span> : null}
          </div>
          {project.status === "failed" && project.error ? <p className="text-sm text-bad">{project.error}</p> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {project.status === "idea" ? (
            <Button tone="primary" onClick={() => start.mutate(undefined)} disabled={start.isPending}>
              Make it
            </Button>
          ) : null}
          {project.status === "failed" ? (
            <Button tone="primary" onClick={() => retry.mutate()} disabled={retry.isPending}>
              Retry failed step
            </Button>
          ) : null}
          {project.status === "paused" ? (
            <Button tone="primary" onClick={() => approve.mutate()} disabled={approve.isPending}>
              Approve &amp; continue
            </Button>
          ) : null}
          {project.status !== "idea" ? (
            <select
              className="rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink outline-none"
              value=""
              disabled={busy || start.isPending}
              onChange={(event) => {
                if (event.target.value) start.mutate(event.target.value as Step);
              }}
            >
              <option value="">Re-run from…</option>
              {STEPS.map((step) => (
                <option key={step} value={step}>
                  {STEP_LABELS[step]}
                </option>
              ))}
            </select>
          ) : null}
          <Button
            tone="danger"
            onClick={() => {
              if (window.confirm("Delete this short and all its files?")) remove.mutate();
            }}
          >
            Delete
          </Button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)_minmax(0,420px)]">
        <div className="flex flex-col gap-5">
          <Panel title="Pipeline">
            <StepTrack jobs={project.jobs} />
          </Panel>
          <Panel title="Log">
            <LogPanel logs={project.logs} />
          </Panel>
        </div>
        <div>
          <Preview videoUrl={project.videoUrl} posterUrl={project.posterUrl} timeline={timeline} />
        </div>
        <div>
          <ArtifactTabs
            project={project}
            onSaveScript={(script) => saveScript.mutate(script)}
            onRegenerateReview={(note) => regenerateReview.mutate(note)}
            savingScript={saveScript.isPending}
            regeneratingReview={regenerateReview.isPending}
            onRecordingChanged={refresh}
          />
        </div>
      </div>
    </main>
  );
}
