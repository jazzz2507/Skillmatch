import { cn } from "@/lib/utils";

export function MatchRing({ value, size = 64 }: { value: number; size?: number }) {
  return (
    <div
      className="relative grid shrink-0 place-items-center rounded-full"
      style={{
        width: size,
        height: size,
        background: `conic-gradient(var(--primary) ${value * 3.6}deg, color-mix(in oklab, var(--muted) 80%, transparent) 0deg)`,
      }}
      role="img"
      aria-label={`${value} percent match`}
    >
      <div className="absolute inset-[4px] grid place-items-center rounded-full bg-card">
        <span className={cn("font-display font-bold", size > 56 ? "text-base" : "text-xs")}>
          {value}%
        </span>
      </div>
    </div>
  );
}