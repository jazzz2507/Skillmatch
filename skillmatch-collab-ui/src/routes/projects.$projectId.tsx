import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Users, CalendarDays, Pencil, Trash2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { SkillBadge } from "@/components/SkillBadge";
import { MatchRing } from "@/components/MatchRing";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/StateViews";
import { projectService, teamRequestService } from "@/services";

export const Route = createFileRoute("/projects/$projectId")({
  head: () => ({
    meta: [
      { title: "Project details — SkillMatch" },
      {
        name: "description",
        content: "See the project brief, required skills, current members and your match score before requesting to join.",
      },
      { property: "og:title", content: "Project details — SkillMatch" },
      { property: "og:description", content: "Required skills, team members and your match score." },
    ],
  }),
  component: ProjectDetailsPage,
});

function ProjectDetailsPage() {
  const { projectId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");

  const project = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => projectService.getProject(projectId),
  });

  const join = useMutation({
    mutationFn: () =>
      teamRequestService.createRequest(
        projectId,
        project.data?.title ?? "",
        message || "I'd like to join this project.",
      ),
    onSuccess: () => {
      setOpen(false);
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["requests"] });
      queryClient.invalidateQueries({ queryKey: ["matches"] });
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      toast.success("Request sent", { description: "You'll be notified when the owner responds." });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Couldn't send your request."),
  });

  const remove = useMutation({
    mutationFn: () => projectService.deleteProject(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Project deleted");
      navigate({ to: "/projects" });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Couldn't delete the project."),
  });

  if (project.isLoading) {
    return (
      <AppShell title="Loading project…">
        <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
          <Skeleton className="h-72 w-full rounded-2xl" />
          <Skeleton className="h-72 w-full rounded-2xl" />
        </div>
      </AppShell>
    );
  }

  if (project.isError || !project.data) {
    return (
      <AppShell title="Project">
        <ErrorState
          message={
            project.error instanceof Error
              ? project.error.message
              : "This project could not be found or failed to load."
          }
          onRetry={() => project.refetch()}
        />
      </AppShell>
    );
  }

  const p = project.data;

  return (
    <AppShell
      title={p.title}
      description={`Owned by ${p.owner}`}
      actions={
        <>
          {p.isOwner ? (
            <>
              <Button asChild variant="hero">
                <Link to="/projects/$projectId/edit" params={{ projectId }}>
                  <Pencil /> Edit project
                </Link>
              </Button>
              <Button
                variant="subtle"
                onClick={() => {
                  if (window.confirm("Delete this project? This cannot be undone.")) remove.mutate();
                }}
                disabled={remove.isPending}
              >
                <Trash2 /> {remove.isPending ? "Deleting…" : "Delete"}
              </Button>
            </>
          ) : (
            <Button variant="hero" onClick={() => setOpen(true)} disabled={p.isMember || p.hasPendingRequest}>
              {p.isMember ? "You're on this team" : p.hasPendingRequest ? "Request pending" : "Request to Join"}
            </Button>
          )}
          <Button asChild variant="subtle">
            <Link to="/projects">
              <ArrowLeft /> All projects
            </Link>
          </Button>
        </>
      }
    >
      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <article className="surface-card space-y-6 p-6 hover:translate-y-0">
          <div>
            <h2 className="text-lg font-semibold">About this project</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.description}</p>
          </div>

          <div>
            <h3 className="text-sm font-semibold">Required skills</h3>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {p.requiredSkills.map((s) => (
                <SkillBadge key={s} skill={s} />
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold">Current members</h3>
            {p.members.length === 0 && (
              <p className="mt-2 text-sm text-muted-foreground">No members listed yet.</p>
            )}
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {p.members.map((m) => (
                <li
                  key={m.id}
                  className="flex min-w-0 items-center gap-3 rounded-xl border border-border bg-background/40 p-3"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/15 text-xs font-semibold text-primary">
                    {m.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{m.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{m.role}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </article>

        <aside className="space-y-5">
          <section className="surface-card grid place-items-center p-6 text-center hover:translate-y-0">
            <MatchRing value={p.matchPercentage} size={104} />
            <h3 className="mt-4 text-base font-semibold">Your match score</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Based on the overlap between your profile skills and this project's stack.
            </p>
            {!p.isOwner && (
              <Button
                variant="hero"
                className="mt-5 w-full"
                onClick={() => setOpen(true)}
                disabled={p.isMember || p.hasPendingRequest}
              >
                {p.isMember
                  ? "You're on this team"
                  : p.hasPendingRequest
                    ? "Request pending"
                    : "Request to Join"}
              </Button>
            )}
          </section>

          <section className="surface-card space-y-3 p-6 text-sm hover:translate-y-0">
            <div className="flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2 text-muted-foreground">
                <Users className="size-4" /> Team size
              </span>
              <span className="font-medium">
                {p.memberCount}/{p.teamSize}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2 text-muted-foreground">
                <CalendarDays className="size-4" /> Posted
              </span>
              <span className="font-medium">{p.createdAt}</span>
            </div>
          </section>
        </aside>
      </div>

      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Request to join"
        description={`Send a short note to ${p.owner} explaining how you can help.`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="hero" onClick={() => join.mutate()} disabled={join.isPending}>
              {join.isPending ? "Sending…" : "Send request"}
            </Button>
          </>
        }
      >
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="I've built Flask + MySQL APIs before and can own the backend."
          className="min-h-28 rounded-xl bg-background/50"
        />
      </Modal>
    </AppShell>
  );
}