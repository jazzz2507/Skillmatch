import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search, FolderKanban } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ProjectCard } from "@/components/ProjectCard";
import { SkillBadge } from "@/components/SkillBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState, ErrorState, LoadingGrid } from "@/components/StateViews";
import { profileService, projectService } from "@/services";
import type { ProjectQuery } from "@/services/projectService";

export const Route = createFileRoute("/projects/")({
  head: () => ({
    meta: [
      { title: "Browse projects — SkillMatch" },
      {
        name: "description",
        content: "Search student projects, filter by required skills and sort by match percentage on SkillMatch.",
      },
      { property: "og:title", content: "Browse projects — SkillMatch" },
      { property: "og:description", content: "Find student projects that need your skills." },
    ],
  }),
  component: ProjectsPage,
});

function ProjectsPage() {
  const [search, setSearch] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [sort, setSort] = useState<NonNullable<ProjectQuery["sort"]>>("match");

  const catalog = useQuery({ queryKey: ["skills"], queryFn: () => profileService.getSkillCatalog() });
  const projects = useQuery({
    queryKey: ["projects", search, skills, sort],
    queryFn: () => projectService.listProjects({ search, skills, sort }),
  });

  const toggleSkill = (skill: string) =>
    setSkills((prev) => (prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]));

  return (
    <AppShell
      title="Projects"
      description="Every open student project, ranked by how well it fits your skills."
      actions={
        <Button asChild variant="hero">
          <Link to="/projects/new">
            <Plus /> Create Project
          </Link>
        </Button>
      }
    >
      <div className="surface-card mb-6 space-y-4 p-5 hover:translate-y-0 hover:shadow-[var(--shadow-card)]">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_200px]">
          <div className="relative min-w-0">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title, description or owner"
              className="h-11 rounded-xl bg-background/50 pl-9"
              aria-label="Search projects"
            />
          </div>
          <Select value={sort} onValueChange={(v) => setSort(v as ProjectQuery["sort"] & string)}>
            <SelectTrigger className="h-11 rounded-xl bg-background/50">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="match">Match percentage</SelectItem>
              <SelectItem value="newest">Newest first</SelectItem>
              <SelectItem value="team">Largest team</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <p className="text-xs text-muted-foreground">Filter by required skill</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {(catalog.data ?? []).map((skill) => (
              <SkillBadge
                key={skill}
                skill={skill}
                tone="outline"
                active={skills.includes(skill)}
                onClick={() => toggleSkill(skill)}
              />
            ))}
          </div>
        </div>
      </div>

      {projects.isLoading ? (
        <LoadingGrid />
      ) : projects.isError ? (
        <ErrorState
          message={projects.error instanceof Error ? projects.error.message : "We couldn't load projects right now."}
          onRetry={() => projects.refetch()}
        />
      ) : projects.data?.length ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {projects.data.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<FolderKanban className="size-6" />}
          title="No projects found"
          description="Try clearing a filter or searching for something else — or start your own project."
          action={
            <Button asChild variant="hero">
              <Link to="/projects/new">Create Project</Link>
            </Button>
          }
        />
      )}
    </AppShell>
  );
}