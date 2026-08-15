import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Rocket } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { TextAreaField, TextField } from "@/components/FormField";
import { SkillSelector } from "@/components/SkillSelector";
import { Button } from "@/components/ui/button";
import { profileService, projectService } from "@/services";
import type { Skill } from "@/services/types";



export const Route = createFileRoute("/projects/new")({
  head: () => ({
    meta: [
      { title: "Create a project — SkillMatch" },
      {
        name: "description",
        content: "Post a new student project on SkillMatch: describe it, set your team size and list the skills you need.",
      },
      { property: "og:title", content: "Create a project — SkillMatch" },
      { property: "og:description", content: "Describe your project and find teammates by skill." },
    ],
  }),
  component: CreateProjectPage,
});

function CreateProjectPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const catalog = useQuery({ queryKey: ["skills"], queryFn: () => profileService.getSkillCatalog() });

  const [form, setForm] = useState({ title: "", description: "", teamSize: "4" });
  const [skills, setSkills] = useState<Skill[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const create = useMutation({
    mutationFn: () =>
      projectService.createProject({
        title: form.title,
        description: form.description,
        teamSize: Number(form.teamSize),
        requiredSkills: skills.map((skill) => skill.id),
 	
      }),
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Project created", { description: `${project.title} is now live.` });
      navigate({ to: "/projects/$projectId", params: { projectId: project.id } });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Couldn't create the project."),
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
    create.mutate();
  };

  return (
    <AppShell
      title="Create a project"
      description="Describe what you're building and the skills your team is missing."
    >
      <form onSubmit={onSubmit} className="surface-card max-w-2xl space-y-5 p-6 sm:p-8" noValidate>
        <TextField
          label="Project title"
          name="title"
          placeholder="CampusHire — Placement Portal"
          value={form.title}
          error={errors["title"]}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />
        <TextAreaField
          label="Description"
          name="description"
          placeholder="What are you building, and what will the team work on?"
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
              setSkills((prev) =>
                prev.some((s) => s.id === skill.id) ? prev : [...prev,skill]
              )
            }
            onRemove={(skill) =>
              setSkills((prev) => prev.filter((s) => s.id !== skill.id))
            }
          />
          {errors["skills"] && <p className="text-xs text-destructive">{errors["skills"]}</p>}
        </div>
        <Button type="submit" variant="hero" size="lg" disabled={create.isPending}>
          <Rocket /> {create.isPending ? "Creating…" : "Create Project"}
        </Button>
      </form>
    </AppShell>
  );
}
