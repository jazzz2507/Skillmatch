import { Link } from "@tanstack/react-router";
import { CheckCircle2, CircleDashed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SkillBadge } from "@/components/SkillBadge";
import { MatchRing } from "@/components/MatchRing";
import type { Match } from "@/services";

export function MatchCard({
  match,
  onRequest,
  pending,
}: {
  match: Match;
  onRequest?: () => void;
  pending?: boolean;
}) {
  return (
    <article className="surface-card flex flex-col gap-4 p-5">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold">{match.projectTitle}</h3>
          <p className="mt-1 text-xs text-muted-foreground">Owner · {match.owner}</p>
        </div>
        <MatchRing value={match.matchPercentage} />
      </div>

      <div>
        <p className="flex items-center gap-1.5 text-xs font-semibold text-success">
          <CheckCircle2 className="size-3.5" /> Matching skills
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {match.matchingSkills.map((s) => (
            <SkillBadge key={s} skill={s} tone="match" />
          ))}
        </div>
      </div>

      <div>
        <p className="flex items-center gap-1.5 text-xs font-semibold text-warning">
          <CircleDashed className="size-3.5" /> Missing skills
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {match.missingSkills.length ? (
            match.missingSkills.map((s) => <SkillBadge key={s} skill={s} tone="missing" />)
          ) : (
            <span className="text-xs text-muted-foreground">You cover every requirement 🎉</span>
          )}
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-muted-foreground">Required skills</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {match.requiredSkills.map((s) => (
            <SkillBadge key={s} skill={s} tone="outline" />
          ))}
        </div>
      </div>

      <div className="mt-auto flex flex-wrap gap-2 border-t border-border pt-4">
        <Button size="sm" variant="hero" onClick={onRequest} disabled={pending}>
          {pending ? "Sending…" : "Request to Join"}
        </Button>
        <Button asChild size="sm" variant="ghost">
          <Link to="/projects/$projectId" params={{ projectId: match.projectId }}>
            View project
          </Link>
        </Button>
      </div>
    </article>
  );
}