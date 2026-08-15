import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "default" | "match" | "missing" | "outline";

const tones: Record<Tone, string> = {
  default: "border-primary/30 bg-primary/12 text-foreground",
  match: "border-success/40 bg-success/12 text-success",
  missing: "border-warning/40 bg-warning/12 text-warning",
  outline: "border-border bg-secondary/50 text-muted-foreground",
};

export function SkillBadge({
  skill,
  tone = "default",
  onRemove,
  onClick,
  active,
  className,
}: {
  skill: string;
  tone?: Tone;
  onRemove?: () => void;
  onClick?: () => void;
  active?: boolean;
  className?: string;
}) {
  const content = (
    <>
      {skill}
      {onRemove && (
        <span
          role="button"
          tabIndex={0}
          aria-label={`Remove ${skill}`}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          onKeyDown={(e) => e.key === "Enter" && onRemove()}
          className="ml-0.5 rounded-full p-0.5 transition-colors hover:bg-destructive/20 hover:text-destructive"
        >
          <X className="size-3" />
        </span>
      )}
    </>
  );

  const classes = cn(
    "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
    tones[tone],
    active && "border-primary bg-primary/25 text-foreground",
    onClick && "cursor-pointer hover:border-primary/60",
    className,
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={classes} aria-pressed={active}>
        {content}
      </button>
    );
  }
  return <span className={classes}>{content}</span>;
}