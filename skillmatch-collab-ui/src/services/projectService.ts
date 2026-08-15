import { request, unwrap } from "./apiClient";
import { asArray, toProject } from "./mappers";
import type { CreateProjectPayload, Project, UpdateProjectPayload } from "./types";

export interface ProjectQuery {
  search?: string;
  skills?: string[];
  sort?: "match" | "newest" | "team";
}

export const projectService = {
  /** GET /api/projects */
  async listProjects(query: ProjectQuery = {}): Promise<Project[]> {
    const payload = await request<unknown>({
      path: "/api/projects",
      params: {
        search: query.search?.trim() || undefined,
        skills: query.skills?.length ? query.skills.join(",") : undefined,
        sort: query.sort,
      },
    });

    const projects = asArray(unwrap(payload, "projects")).map(toProject);

    // Client-side refinement so filters keep working regardless of what the
    // backend chooses to filter server-side.
    const search = (query.search ?? "").trim().toLowerCase();
    const filtered = projects.filter((p) => {
      const matchesSearch =
        !search ||
        p.title.toLowerCase().includes(search) ||
        p.description.toLowerCase().includes(search) ||
        p.owner.toLowerCase().includes(search);
      const matchesSkills =
        !query.skills?.length || query.skills.every((s) => p.requiredSkills.includes(s));
      return matchesSearch && matchesSkills;
    });

    return [...filtered].sort((a, b) => {
      if (query.sort === "team") return b.teamSize - a.teamSize;
      if (query.sort === "newest") return b.createdAt.localeCompare(a.createdAt);
      return b.matchPercentage - a.matchPercentage;
    });
  },

  /** GET /api/projects/<project_id> */
  async getProject(id: string): Promise<Project> {
    const payload = await request<unknown>({ path: `/api/projects/${encodeURIComponent(id)}` });
    return toProject(unwrap(payload, "project"));
  },

  /** POST /api/projects */
  async createProject(payload: CreateProjectPayload): Promise<Project> {
    const response = await request<unknown>({
      path: "/api/projects",
      method: "POST",
      body: {
        title: payload.title,
        description: payload.description,
        team_size: payload.teamSize,
        skill_ids: payload.requiredSkills,
      },
    });
    return toProject(unwrap(response, "project"));
  },

  /** PATCH /api/projects/<project_id> */
  async updateProject(id: string, payload: UpdateProjectPayload): Promise<Project> {
    const body: Record<string, unknown> = {};
    if (payload.title !== undefined) body["title"] = payload.title;
    if (payload.description !== undefined) body["description"] = payload.description;
    if (payload.teamSize !== undefined) body["team_size"] = payload.teamSize;
    if (payload.requiredSkills !== undefined) body["required_skills"] = payload.requiredSkills;
    const response = await request<unknown>({
      path: `/api/projects/${encodeURIComponent(id)}`,
      method: "PATCH",
      body,
    });
    return toProject(unwrap(response, "project"));
  },

  /** DELETE /api/projects/<project_id> */
  async deleteProject(id: string): Promise<void> {
    await request({ path: `/api/projects/${encodeURIComponent(id)}`, method: "DELETE" });
  },
};
