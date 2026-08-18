import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Save } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { TextAreaField, TextField } from "@/components/FormField";
import { SkillSelector } from "@/components/SkillSelector";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/StateViews";
import { profileService, projectService } from "@/services";
import type { Skill } from "@/services/types";

export const Route = createFileRoute("/projects/$projectId/edit")({
  head: () => ({
    meta: [
      { title: "Edit project — SkillMatch" },
      {
        name: "description",
        content: "Update your SkillMatch project brief, team size and the skills your team still needs.",
      },
      { property: "og:title", content: "Edit project — SkillMatch" },
      { property: "og:description", content: "Update your project details and required skills." },
    ],
  }),
  component: EditProjectPage,
});

function EditProjectPage() {
  const { projectId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const project = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => projectService.getProject(projectId),
  });
  const catalog = useQuery({ queryKey: ["skills"], queryFn: () => profileService.getSkillCatalog() });

  const [form, setForm] = useState({ title: "", description: "", teamSize: "4" });
  const [skills, setSkills] = useState<Skill[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (project.data) {
      setForm({
        title: project.data.title,
        description: project.data.description,
        teamSize: String(project.data.teamSize || 4),
      });
    }
  }, [project.data]);

  // Required skills come back from the API as names only; resolve them
  // against the skill catalog (which has ids) once both have loaded.
  useEffect(() => {
    if (project.data && catalog.data) {
      const matched = project.data.requiredSkills
        .map((name) => catalog.data.find((s) => s.name === name))
        .filter((s): s is Skill => Boolean(s));
      setSkills(matched);
    }
  }, [project.data, catalog.data]);

  const save = useMutation({
    mutationFn: () =>
      projectService.updateProject(projectId, {
        title: form.title,
        description: form.description,
        teamSize: Number(form.teamSize),
        requiredSkills: skills.map((skill) => skill.id),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      toast.success("Project updated");
      navigate({ to: "/projects/$projectId", params: { projectId } });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Couldn't update the project."),
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (form.title.trim().length < 4) next["title"] = "Give your project a clear title.";
    if (form.description.trim().length < 20) next["description"] = "Add at least 20 characters.";
    const size = Number(form.teamSize);
    if (!size || size < 2 || size > 12) next["teamSize"] = "Team size must be between 2 and 12.";
    if (skills.length === 0) next["skills"] = "Add at least one required skill.";
    setErrors(next);
    if (Object.keys(next).length) return;
    save.mutate();
  };

  if (project.isError) {
    return (
      <AppShell title="Edit project">
        <ErrorState
          message={
            project.error instanceof Error ? project.error.message : "Couldn't load this project."
          }
          onRetry={() => project.refetch()}
        />
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Edit project"
      description="Update the brief so the right teammates can find you."
      actions={
        <Button asChild variant="subtle">
          <Link to="/projects/$projectId" params={{ projectId }}>
            <ArrowLeft /> Back to project
          </Link>
        </Button>
      }
    >
      {project.isLoading ? (
        <Skeleton className="h-96 max-w-2xl rounded-2xl" />
      ) : (
        <form onSubmit={onSubmit} className="surface-card max-w-2xl space-y-5 p-6 sm:p-8" noValidate>
          <TextField
            label="Project title"
            name="title"
            value={form.title}
            error={errors["title"]}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <TextAreaField
            label="Description"
            name="description"
            value={form.description}
            error={errors["description"]}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <TextField
            label="Team size"
            name="teamSize"
            type="number"
            min={2}
            max={12}
            value={form.teamSize}
            error={errors["teamSize"]}
            onChange={(e) => setForm({ ...form, teamSize: e.target.value })}
          />
          <div className="space-y-2">
            <p className="text-sm font-medium">Required skills</p>
            <SkillSelector
              selected={skills}
              catalog={catalog.data ?? []}
              onAdd={(skill) =>
                setSkills((prev) => (prev.some((s) => s.id === skill.id) ? prev : [...prev, skill]))
              }
              onRemove={(skill) => setSkills((prev) => prev.filter((s) => s.id !== skill.id))}
            />
            {errors["skills"] && <p className="text-xs text-destructive">{errors["skills"]}</p>}
          </div>
          <Button type="submit" variant="hero" size="lg" disabled={save.isPending}>
            <Save /> {save.isPending ? "Saving…" : "Save changes"}
          </Button>
        </form>
      )}
    </AppShell>
  );
}