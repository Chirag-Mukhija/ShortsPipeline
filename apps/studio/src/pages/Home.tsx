// Home page: start a new short, watch videos in production, browse finished shorts and launch ideas from the backlog.
import { STEP_LABELS, type ProjectSummary } from "@clipforge/schema";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { api } from "../api";
import { Button, Empty, Panel, Progress, StatusBadge } from "../components/ui";
import { navigate } from "../hooks";

function open(project: ProjectSummary) {
  navigate({ page: "project", id: project.id });
}

function InProduction({ projects }: { projects: ProjectSummary[] }) {
  if (projects.length === 0) return <Empty>Nothing in production. Type a topic above or pick an idea below.</Empty>;
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {projects.map((project) => (
        <button
          key={project.id}
          onClick={() => open(project)}
          className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4 text-left transition hover:border-accent/60"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="font-semibold leading-snug">{project.title ?? project.topic}</div>
            <StatusBadge status={project.status} />
          </div>
          <Progress value={project.progress} />
          <div className="text-xs text-muted">
            {project.status === "failed"
              ? project.error
              : project.currentStep
                ? `${STEP_LABELS[project.currentStep]}…`
                : "Queued"}
          </div>
        </button>
      ))}
    </div>
  );
}

function Finished({ projects }: { projects: ProjectSummary[] }) {
  if (projects.length === 0) return <Empty>Finished shorts will appear here.</Empty>;
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
      {projects.map((project) => (
        <button key={project.id} onClick={() => open(project)} className="group text-left">
          <div className="aspect-[9/16] overflow-hidden rounded-2xl border border-line bg-surface transition group-hover:border-accent/60">
            {project.posterUrl ? (
              <img src={project.posterUrl} alt="" className="size-full object-cover transition group-hover:scale-[1.03]" />
            ) : null}
          </div>
          <div className="mt-2 line-clamp-2 text-sm font-medium leading-snug">{project.title ?? project.topic}</div>
        </button>
      ))}
    </div>
  );
}

function Backlog({ projects }: { projects: ProjectSummary[] }) {
  const client = useQueryClient();
  const [idea, setIdea] = useState("");
  const refresh = () => void client.invalidateQueries({ queryKey: ["projects"] });
  const start = useMutation({ mutationFn: (id: string) => api.start(id), onSuccess: refresh });
  const remove = useMutation({ mutationFn: (id: string) => api.remove(id), onSuccess: refresh });
  const add = useMutation({
    mutationFn: (topic: string) => api.create(topic, false),
    onSuccess: () => {
      setIdea("");
      refresh();
    },
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (idea.trim().length >= 3) add.mutate(idea.trim());
  };
  return (
    <div className="flex flex-col gap-3">
      <form onSubmit={submit} className="flex gap-2">
        <input
          value={idea}
          onChange={(event) => setIdea(event.target.value)}
          placeholder="Add an idea for later…"
          className="flex-1 rounded-xl border border-line bg-bg px-3 py-2 text-sm outline-none transition placeholder:text-dim focus:border-accent"
        />
        <Button type="submit" disabled={add.isPending || idea.trim().length < 3}>
          Add
        </Button>
      </form>
      {projects.length === 0 ? <Empty>The idea backlog is empty.</Empty> : <BacklogList projects={projects} onStart={(id) => start.mutate(id)} onRemove={(id) => remove.mutate(id)} starting={start.isPending} />}
    </div>
  );
}

function BacklogList({
  projects,
  onStart,
  onRemove,
  starting,
}: {
  projects: ProjectSummary[];
  onStart: (id: string) => void;
  onRemove: (id: string) => void;
  starting: boolean;
}) {
  return (
    <ul className="divide-y divide-line">
      {projects.map((project) => (
        <li key={project.id} className="flex items-center justify-between gap-4 py-2.5">
          <span className="text-sm">{project.topic}</span>
          <span className="flex shrink-0 gap-2">
            <Button tone="primary" className="!px-3 !py-1" disabled={starting} onClick={() => onStart(project.id)}>
              Make it
            </Button>
            <Button className="!px-3 !py-1" onClick={() => onRemove(project.id)} aria-label="Remove idea">
              ✕
            </Button>
          </span>
        </li>
      ))}
    </ul>
  );
}

export function Home() {
  const client = useQueryClient();
  const [topic, setTopic] = useState("");
  const { data: projects = [], isLoading } = useQuery({ queryKey: ["projects"], queryFn: api.projects });
  const create = useMutation({
    mutationFn: (value: string) => api.create(value),
    onSuccess: (project) => {
      setTopic("");
      void client.invalidateQueries({ queryKey: ["projects"] });
      navigate({ page: "project", id: project.id });
    },
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (topic.trim().length >= 3) create.mutate(topic.trim());
  };
  const active = projects.filter((p) => p.status === "queued" || p.status === "running" || p.status === "paused" || p.status === "failed");
  const done = projects.filter((p) => p.status === "done");
  const ideas = projects.filter((p) => p.status === "idea");

  return (
    <main className="flex flex-col gap-8">
      <form onSubmit={submit} className="rounded-3xl border border-line bg-gradient-to-br from-surface to-panel p-6 md:p-8">
        <h1 className="font-display text-3xl font-extrabold tracking-tight md:text-4xl">What should today's short explain?</h1>
        <p className="mt-2 text-sm text-muted">
          Fully automatic: angle → script → critic → storyboard → Indian-English voice → animation → render → titles &amp; hashtags.
        </p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <input
            value={topic}
            onChange={(event) => setTopic(event.target.value)}
            placeholder="e.g. Why does my phone get slower after an update?"
            className="flex-1 rounded-xl border border-line bg-bg px-4 py-3 text-base outline-none transition placeholder:text-dim focus:border-accent"
          />
          <Button tone="primary" type="submit" className="!px-6 !py-3 text-base" disabled={create.isPending || topic.trim().length < 3}>
            {create.isPending ? "Starting…" : "Make short"}
          </Button>
        </div>
        {create.error ? <p className="mt-3 text-sm text-bad">{create.error.message}</p> : null}
      </form>

      {isLoading ? null : (
        <>
          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">In production</h2>
            <InProduction projects={active} />
          </section>
          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">Finished shorts</h2>
            <Finished projects={done} />
          </section>
          <Panel title={`Idea backlog (${ideas.length})`}>
            <Backlog projects={ideas} />
          </Panel>
        </>
      )}
    </main>
  );
}
