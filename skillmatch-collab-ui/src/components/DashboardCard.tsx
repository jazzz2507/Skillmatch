import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function DashboardCard({
  title,
  description,
  icon,
  action,
  children,
  className,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("surface-card p-5", className)}>
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="flex min-w-0 items-start gap-3">
          {icon && (
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
              {icon}
            </span>
          )}
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold">{title}</h3>
            {description && (
              <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
            )}
          </div>
        </div>
        {action}
      </header>
      {children && <div className="mt-4">{children}</div>}
    </section>
  );
}