import { request, unwrap } from "./apiClient";
import { toSkillList, toSkillNames, toUser } from "./mappers";
import type { Skill, User } from "./types";

export const profileService = {
  /** GET /api/profile + GET /api/profile/skills */
  async getProfile(): Promise<User> {
    const [profilePayload, skills] = await Promise.all([
      request<unknown>({ path: "/api/profile" }),
      profileService.getMySkills(),
    ]);
    return toUser(unwrap(profilePayload, "profile", "user"), skills);
  },

  /** PATCH /api/profile */
  async updateProfile(payload: Partial<User>): Promise<User> {
    const body: Record<string, unknown> = {};
    if (payload.fullName !== undefined) body["full_name"] = payload.fullName;
    if (payload.email !== undefined) body["email"] = payload.email;
    if (payload.bio !== undefined) body["bio"] = payload.bio;
    if (payload.githubUrl !== undefined) body["github_url"] = payload.githubUrl;
    await request<unknown>({ path: "/api/profile", method: "PATCH", body });
    return profileService.getProfile();
    
  },

  /** GET /api/profile/skills */
  async getMySkills(): Promise<Skill[]> {
    const payload = await request<unknown>({ path: "/api/profile/skills" });
    return toSkillList(unwrap(payload, "skills"));
  },

  /** POST /api/profile/skills */
  async addSkill(skill: Skill): Promise<User> {
    await request({
      path: "/api/profile/skills",
      method: "POST",
      body: { 

        skill_id: skill.id,
        custom_skill: skill.id.startsWith("custom:")
          ? skill.name
          : undefined,  
      },
    });
    return profileService.getProfile();
  },

  /** DELETE /api/profile/skills/<skill_id> */
  async removeSkill(skill: string): Promise<User> {
    const skills = await profileService.getMySkills();
    const match = skills.find((s) => s.name === skill);
    if (match) {
      await request({ path: `/api/profile/skills/${encodeURIComponent(match.id)}`, method: "DELETE" });
    }
    return profileService.getProfile();
  },

  /** GET /api/skills — the global skill catalog. */
async getSkillCatalog(): Promise<Skill[]> {
  const payload = await request<unknown>({ path: "/api/skills" });
  return toSkillList(unwrap(payload, "skills"));
},  


};
