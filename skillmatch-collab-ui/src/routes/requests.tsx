import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Inbox, Send } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { RequestCard } from "@/components/RequestCard";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState, ErrorState, LoadingGrid } from "@/components/StateViews";
import { teamRequestService } from "@/services";

export const Route = createFileRoute("/requests")({
  head: () => ({
    meta: [
      { title: "Team requests — SkillMatch" },
      {
        name: "description",
        content: "Manage incoming join requests for your projects and track the status of requests you've sent.",
      },
      { property: "og:title", content: "Team requests — SkillMatch" },
      { property: "og:description", content: "Accept, reject and track project join requests." },
    ],
  }),
  component: RequestsPage,
});

function RequestsPage() {
  const queryClient = useQueryClient();
  const [busyId, setBusyId] = useState<string | null>(null);
  const requests = useQuery({ queryKey: ["requests"], queryFn: () => teamRequestService.listRequests() });

  const respond = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "accepted" | "rejected" }) =>
      teamRequestService.respondToRequest(id, status),
    onSuccess: (all, variables) => {
      queryClient.setQueryData(["requests"], all);
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["matches"] });
      setBusyId(null);
      if (variables.status === "accepted") toast.success("Request accepted — they're on the team!");
      else toast.success("Request rejected");
    },
    onError: (error) => {
      setBusyId(null);
      toast.error(error instanceof Error ? error.message : "Couldn't update the request.");
    },
  });

  const incoming = (requests.data ?? []).filter((r) => r.direction === "incoming");
  const sent = (requests.data ?? []).filter((r) => r.direction === "sent");

  return (
    <AppShell
      title="Team requests"
      description="Everything waiting on you, and everything you're waiting on."
    >
      {requests.isLoading ? (
        <LoadingGrid count={4} />
      ) : requests.isError ? (
        <ErrorState
          message={requests.error instanceof Error ? requests.error.message : "We couldn't load your requests."}
          onRetry={() => requests.refetch()}
        />
      ) : (
        <Tabs defaultValue="incoming">
          <TabsList className="rounded-xl bg-secondary/60">
            <TabsTrigger value="incoming" className="rounded-lg">
              Incoming ({incoming.length})
            </TabsTrigger>
            <TabsTrigger value="sent" className="rounded-lg">
              Sent ({sent.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="incoming" className="mt-6">
            {incoming.length ? (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {incoming.map((r) => (
                  <RequestCard
                    key={r.id}
                    request={r}
                    busy={busyId === r.id}
                    onAccept={() => {
                      setBusyId(r.id);
                      respond.mutate({ id: r.id, status: "accepted" });
                    }}
                    onReject={() => {
                      setBusyId(r.id);
                      respond.mutate({ id: r.id, status: "rejected" });
                    }}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<Inbox className="size-6" />}
                title="No incoming requests"
                description="When students ask to join one of your projects, you'll review them here."
              />
            )}
          </TabsContent>

          <TabsContent value="sent" className="mt-6">
            {sent.length ? (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {sent.map((r) => (
                  <RequestCard key={r.id} request={r} />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<Send className="size-6" />}
                title="No sent requests"
                description="Browse your matches and ask to join a project that needs your skills."
                action={
                  <Button asChild variant="hero">
                    <Link to="/matches">View matches</Link>
                  </Button>
                }
              />
            )}
          </TabsContent>
        </Tabs>
      )}
    </AppShell>
  );
}