import { Link } from "@tanstack/react-router";
import { Users, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SkillBadge } from "@/components/SkillBadge";
import { MatchRing } from "@/components/MatchRing";
import type { Project } from "@/services";

export function ProjectCard({ project }: { project: Project }) {
  return (
    <article className="surface-card flex flex-col gap-4 p-5">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold">{project.title}</h3>
          <p className="mt-1 text-xs text-muted-foreground">by {project.owner}</p>
        </div>
        <MatchRing value={project.matchPercentage} size={52} />
      </div>

      <p className="line-clamp-3 text-sm text-muted-foreground">{project.description}</p>

      <div className="flex flex-wrap gap-1.5">
        {project.requiredSkills.map((skill) => (
          <SkillBadge key={skill} skill={skill} />
        ))}
      </div>

      <div className="mt-auto flex items-center justify-between gap-3 border-t border-border pt-4">
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <Users className="size-3.5" />
          {project.memberCount}/{project.teamSize} members
        </span>
        <Button asChild size="sm" variant="subtle">
          <Link to="/projects/$projectId" params={{ projectId: project.id }}>
            View project <ArrowRight />
          </Link>
        </Button>
      </div>
    </article>
  );
}