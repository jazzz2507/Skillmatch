import { request, unwrap } from "./apiClient";
import { asArray, toMatch } from "./mappers";
import type { Match } from "./types";

export const matchService = {
  /** GET /api/matches — percentages come straight from Flask. */
  async listMatches(): Promise<Match[]> {
    const payload = await request<unknown>({ path: "/api/matches" });
    return asArray(unwrap(payload, "matches"))
      .map(toMatch)
      .sort((a, b) => b.matchPercentage - a.matchPercentage);
  },

  async topMatches(limit = 3): Promise<Match[]> {
    const all = await matchService.listMatches();
    return all.slice(0, limit);
  },
};
