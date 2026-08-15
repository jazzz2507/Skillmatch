import { request, unwrap } from "./apiClient";
import { asArray, toTeamRequest } from "./mappers";
import { authService } from "./authService";
import type { RequestStatus, TeamRequest } from "./types";

async function fetchRequests(): Promise<TeamRequest[]> {
  const [payload, me] = await Promise.all([
    request<unknown>({ path: "/api/team-requests" }),
    authService.currentUserOrNull(),
  ]);
  return asArray(unwrap(payload, "requests", "team_requests")).map((row) =>
    toTeamRequest(row, me?.id),
  );
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
