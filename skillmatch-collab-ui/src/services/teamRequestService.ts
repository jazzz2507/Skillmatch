import { request, unwrap } from "./apiClient";
import { asArray, asRow, toTeamRequest } from "./mappers";
import type { RequestStatus, TeamRequest } from "./types";

async function fetchRequests(): Promise<TeamRequest[]> {
  const payload = await request<unknown>({ path: "/api/team-requests" });
  const row = asRow(payload);
  const incoming = asArray(row["incoming"]).map((r) => ({
    ...toTeamRequest(r),
    direction: "incoming" as const,
  }));
  const sent = asArray(row["sent"]).map((r) => ({
    ...toTeamRequest(r),
    direction: "sent" as const,
  }));
  return [...incoming, ...sent];
}

export const teamRequestService = {
  /** GET /api/team-requests */
  listRequests(): Promise<TeamRequest[]> {
    return fetchRequests();
  },

  /** POST /api/team-requests/<request_id>/accept | /reject, then refetch. */
  async respondToRequest(
    id: string,
    status: Exclude<RequestStatus, "pending">,
  ): Promise<TeamRequest[]> {
    const action = status === "accepted" ? "accept" : "reject";
    await request({
      path: `/api/team-requests/${encodeURIComponent(id)}/${action}`,
      method: "POST",
    });
    return fetchRequests();
  },

  /** POST /api/projects/<project_id>/requests */
  async createRequest(
    projectId: string,
    projectTitle: string,
    message: string,
  ): Promise<TeamRequest> {
    const payload = await request<unknown>({
      path: `/api/projects/${encodeURIComponent(projectId)}/requests`,
      method: "POST",
      body: { message },
    });
    const created = toTeamRequest(unwrap(payload, "request"));
    return {
      ...created,
      projectId: created.projectId || projectId,
      projectTitle: created.projectTitle || projectTitle,
      direction: "sent",
    };
  },
};