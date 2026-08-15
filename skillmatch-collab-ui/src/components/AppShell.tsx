import type { ReactNode } from "react";
import { Navbar } from "@/components/Navbar";

export function AppShell({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="aurora mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
        <header className="mb-8 grid gap-4 sm:flex sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
            {description && (
              <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
            )}
          </div>
          {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
        </header>
        {children}
      </main>
    </div>
  );
}