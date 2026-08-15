import { Check, X, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SkillBadge } from "@/components/SkillBadge";
import type { TeamRequest } from "@/services";
import { cn } from "@/lib/utils";

const statusStyles: Record<TeamRequest["status"], string> = {
  pending: "border-warning/40 bg-warning/12 text-warning",
  accepted: "border-success/40 bg-success/12 text-success",
  rejected: "border-destructive/40 bg-destructive/12 text-destructive",
};

export function RequestCard({
  request,
  onAccept,
  onReject,
  busy,
}: {
  request: TeamRequest;
  onAccept?: () => void;
  onReject?: () => void;
  busy?: boolean;
}) {
  return (
    <article className="surface-card flex flex-col gap-4 p-5">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-sm font-semibold text-primary">
            {request.userName
              .split(" ")
              .map((n) => n[0])
              .join("")}
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold">{request.userName}</h3>
            <p className="truncate text-xs text-muted-foreground">{request.projectTitle}</p>
          </div>
        </div>
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium capitalize",
            statusStyles[request.status],
          )}
        >
          {request.status === "pending" && <Clock className="size-3" />}
          {request.status}
        </span>
      </div>

      <p className="text-sm text-muted-foreground">{request.message}</p>

      <div className="flex flex-wrap gap-1.5">
        {request.userSkills.map((s) => (
          <SkillBadge key={s} skill={s} tone="outline" />
        ))}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
        <span className="text-xs text-muted-foreground">{request.createdAt}</span>
        {request.direction === "incoming" && request.status === "pending" && (
          <div className="flex gap-2">
            <Button size="sm" variant="hero" onClick={onAccept} disabled={busy}>
              <Check /> Accept
            </Button>
            <Button size="sm" variant="subtle" onClick={onReject} disabled={busy}>
              <X /> Reject
            </Button>
          </div>
        )}
      </div>
    </article>
  );
}