import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Sparkles,
  FolderKanban,
  Users,
  Wrench,
  Plus,
  ArrowRight,
  UserRound,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { DashboardCard } from "@/components/DashboardCard";
import { SkillBadge } from "@/components/SkillBadge";
import { MatchRing } from "@/components/MatchRing";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/StateViews";
import { authService, matchService, profileService, projectService, teamRequestService } from "@/services";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — SkillMatch" },
      {
        name: "description",
        content: "Your SkillMatch dashboard: profile completion, recommended projects, top skill matches and pending team requests.",
      },
      { property: "og:title", content: "Dashboard — SkillMatch" },
      { property: "og:description", content: "Track your matches, projects and team requests." },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const me = useQuery({ queryKey: ["me"], queryFn: () => authService.me() });
  const profile = useQuery({ queryKey: ["profile"], queryFn: () => profileService.getProfile() });
  const projects = useQuery({
    queryKey: ["projects", "recommended"],
    queryFn: () => projectService.listProjects({ sort: "match" }),
  });
  const matches = useQuery({ queryKey: ["matches", "top"], queryFn: () => matchService.topMatches(3) });
  const requests = useQuery({ queryKey: ["requests"], queryFn: () => teamRequestService.listRequests() });

  const pendingIncoming = (requests.data ?? []).filter(
    (r) => r.direction === "incoming" && r.status === "pending",
  );

  return (
    <AppShell
      title={
        me.data?.fullName ? `Welcome back, ${me.data.fullName.split(" ")[0]}` : "Welcome back"
      }
      description="Here's what's happening across your projects and matches today."
      actions={
        <>
          <Button asChild variant="hero">
            <Link to="/projects/new">
              <Plus /> New project
            </Link>
          </Button>
          <Button asChild variant="subtle">
            <Link to="/matches">View matches</Link>
          </Button>
        </>
      }
    >
      <div className="grid gap-5 lg:grid-cols-3">
        <DashboardCard
          title="Profile completion"
          description="A complete profile gets better matches."
          icon={<UserRound className="size-4" />}
        >
          {profile.isLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : profile.data ? (
            <div className="space-y-3">
              <div className="flex items-baseline justify-between">
                <span className="font-display text-3xl font-bold">
                  {profile.data.profileCompletion}%
                </span>
                <Link to="/profile" className="text-xs text-primary hover:underline">
                  Complete profile
                </Link>
              </div>
              <Progress value={profile.data.profileCompletion} className="h-2" />
            </div>
          ) : null}
        </DashboardCard>

        <DashboardCard
          title="Current skills"
          description="Skills used for matching."
          icon={<Wrench className="size-4" />}
          action={
            <Button asChild size="sm" variant="ghost">
              <Link to="/profile">Edit</Link>
            </Button>
          }
        >
          {profile.isLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {profile.data?.skills.length ? (
                profile.data.skills.map((s) => <SkillBadge key={s} skill={s} />)
              ) : (
                <p className="text-sm text-muted-foreground">
                  No skills yet — add a few on your profile.
                </p>
              )}
            </div>
          )}
        </DashboardCard>

        <DashboardCard
          title="Quick actions"
          description="Jump straight into the work."
          icon={<Sparkles className="size-4" />}
        >
          <div className="grid gap-2">
            <Button asChild variant="subtle" className="justify-between">
              <Link to="/projects">Browse projects <ArrowRight /></Link>
            </Button>
            <Button asChild variant="subtle" className="justify-between">
              <Link to="/requests">Manage team requests <ArrowRight /></Link>
            </Button>
            <Button asChild variant="subtle" className="justify-between">
              <Link to="/profile">Update skills <ArrowRight /></Link>
            </Button>
          </div>
        </DashboardCard>

        <DashboardCard
          title="Recommended projects"
          description="Ranked by how well your skills fit."
          icon={<FolderKanban className="size-4" />}
          className="lg:col-span-2"
          action={
            <Button asChild size="sm" variant="ghost">
              <Link to="/projects">See all</Link>
            </Button>
          }
        >
          {projects.isLoading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : projects.isError ? (
            <ErrorState message="Couldn't load projects." onRetry={() => projects.refetch()} />
          ) : projects.data?.length === 0 ? (
            <EmptyState
              title="No projects yet"
              description="Create the first project and start finding teammates."
            />
          ) : (
            <ul className="space-y-3">
              {projects.data?.slice(0, 4).map((p) => (
                <li
                  key={p.id}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-border bg-background/40 p-3 transition-colors hover:border-primary/50"
                >
                  <div className="min-w-0">
                    <Link
                      to="/projects/$projectId"
                      params={{ projectId: p.id }}
                      className="block truncate text-sm font-medium hover:text-primary"
                    >
                      {p.title}
                    </Link>
                    <p className="truncate text-xs text-muted-foreground">
                      {p.owner} · {p.memberCount}/{p.teamSize} members
                    </p>
                  </div>
                  <MatchRing value={p.matchPercentage} size={44} />
                </li>
              ))}
            </ul>
          )}
        </DashboardCard>

        <DashboardCard
          title="Top skill matches"
          description="Your strongest overlaps."
          icon={<Sparkles className="size-4" />}
        >
          {matches.isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : matches.isError ? (
            <ErrorState message="Couldn't load matches." onRetry={() => matches.refetch()} />
          ) : matches.data?.length === 0 ? (
            <EmptyState
              title="No matches yet"
              description="Add skills to your profile to get matched with projects."
            />
          ) : (
            <ul className="space-y-3">
              {matches.data?.map((m) => (
                <li key={m.projectId} className="rounded-xl border border-border bg-background/40 p-3">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                    <p className="truncate text-sm font-medium">{m.projectTitle}</p>
                    <span className="text-gradient font-display shrink-0 text-sm font-bold">
                      {m.matchPercentage}%
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {m.matchingSkills.map((s) => (
                      <SkillBadge key={s} skill={s} tone="match" />
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </DashboardCard>

        <DashboardCard
          title="Pending team requests"
          description="People waiting on your reply."
          icon={<Users className="size-4" />}
          className="lg:col-span-3"
          action={
            <Button asChild size="sm" variant="ghost">
              <Link to="/requests">Open requests</Link>
            </Button>
          }
        >
          {requests.isLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : pendingIncoming.length === 0 ? (
            <EmptyState
              title="No pending requests"
              description="When students ask to join your projects, they'll show up here."
            />
          ) : (
            <ul className="grid gap-3 md:grid-cols-2">
              {pendingIncoming.map((r) => (
                <li
                  key={r.id}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-border bg-background/40 p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{r.userName}</p>
                    <p className="truncate text-xs text-muted-foreground">{r.projectTitle}</p>
                  </div>
                  <Button asChild size="sm" variant="subtle">
                    <Link to="/requests">Review</Link>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </DashboardCard>
      </div>
    </AppShell>
  );
}