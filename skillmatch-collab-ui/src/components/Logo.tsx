import { Link } from "@tanstack/react-router";
import { Blocks } from "lucide-react";

export function Logo({ withTagline = false }: { withTagline?: boolean }) {
  return (
    <Link to="/" className="flex min-w-0 items-center gap-2.5">
      <span className="bg-gradient-brand grid size-9 shrink-0 place-items-center rounded-xl shadow-[var(--shadow-glow)]">
        <Blocks className="size-5 text-primary-foreground" />
      </span>
      <span className="min-w-0">
        <span className="font-display block truncate text-lg leading-tight font-bold">
          Skill<span className="text-gradient">Match</span>
        </span>
        {withTagline && (
          <span className="block truncate text-xs text-muted-foreground">
            Find the right skills.
          </span>
        )}
      </span>
    </Link>
  );
}