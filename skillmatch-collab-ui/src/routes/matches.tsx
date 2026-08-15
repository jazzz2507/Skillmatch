import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { MatchCard } from "@/components/MatchCard";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, LoadingGrid } from "@/components/StateViews";
import { matchService, teamRequestService } from "@/services";

export const Route = createFileRoute("/matches")({
  head: () => ({
    meta: [
      { title: "Your matches — SkillMatch" },
      {
        name: "description",
        content: "See which student projects match your skills, which skills overlap and which ones you're missing.",
      },
      { property: "og:title", content: "Your matches — SkillMatch" },
      { property: "og:description", content: "Ranked project matches based on your skill set." },
    ],
  }),
  component: MatchesPage,
});

function MatchesPage() {
  const queryClient = useQueryClient();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const matches = useQuery({ queryKey: ["matches"], queryFn: () => matchService.listMatches() });

  const join = useMutation({
    mutationFn: ({ projectId, title }: { projectId: string; title: string }) =>
      teamRequestService.createRequest(projectId, title, "I'd like to join this project."),
    onSuccess: (r) => {
      queryClient.invalidateQueries({ queryKey: ["requests"] });
      queryClient.invalidateQueries({ queryKey: ["matches"] });
      toast.success("Request sent", { description: `Your request for ${r.projectTitle} is pending.` });
      setPendingId(null);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Couldn't send your request.");
      setPendingId(null);
    },
  });

  return (
    <AppShell
      title="Your matches"
      description="Projects ranked by how much of their required stack you already cover."
    >
      {matches.isLoading ? (
        <LoadingGrid count={4} />
      ) : matches.isError ? (
        <ErrorState
          message={matches.error instanceof Error ? matches.error.message : "We couldn't load your matches."}
          onRetry={() => matches.refetch()}
        />
      ) : matches.data?.length ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {matches.data.map((m) => (
            <MatchCard
              key={m.projectId}
              match={m}
              pending={pendingId === m.projectId}
              onRequest={() => {
                setPendingId(m.projectId);
                join.mutate({ projectId: m.projectId, title: m.projectTitle });
              }}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Sparkles className="size-6" />}
          title="No matches yet"
          description="Add a few more skills to your profile and we'll start recommending projects."
          action={
            <Button asChild variant="hero">
              <Link to="/profile">Update your skills</Link>
            </Button>
          }
        />
      )}
    </AppShell>
  );
}