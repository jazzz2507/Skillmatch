import type { Match, Project, ProjectMember, RequestStatus, Skill, TeamRequest, User } from "./types";

type Row = Record<string, unknown>;

export const asRow = (value: unknown): Row =>
  value && typeof value === "object" ? (value as Row) : {};

export function pick(row: Row, keys: string[]): unknown {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null) return value;
  }
  return undefined;
}

const str = (row: Row, keys: string[], fallback = ""): string => {
  const value = pick(row, keys);
  return value === undefined ? fallback : String(value);
};

const num = (row: Row, keys: string[], fallback = 0): number => {
  const value = pick(row, keys);
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const bool = (row: Row, keys: string[]): boolean => Boolean(pick(row, keys));

export const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

/** Skills come back either as strings or as { id, name } rows. */
export function toSkillList(value: unknown): Skill[] {
  return asArray(value).map((entry, index) => {
    if (typeof entry === "string") return { id: entry, name: entry };
    const row = asRow(entry);
    const name = str(row, ["name", "skill_name", "skill", "title"]);
    return { id: str(row, ["skill_id", "id"], name || String(index)), name };
  });
}

export const toSkillNames = (value: unknown): string[] =>
  toSkillList(value)
    .map((s) => s.name)
    .filter(Boolean);

export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function profileCompletion(user: Omit<User, "profileCompletion">): number {
  const checks = [
    Boolean(user.fullName),
    Boolean(user.email),
    user.bio.length > 30,
    Boolean(user.githubUrl),
    user.skills.length >= 3,
    user.skills.length >= 6,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

export function toUser(payload: unknown, skillsPayload?: unknown): User {
  const row = asRow(payload);
  const fullName = str(row, ["full_name", "fullName", "name", "username"]);
  const skillItems = toSkillList(skillsPayload ?? pick(row, ["skills"]));
  const base = {
    id: str(row, ["id", "user_id"]),
    fullName,
    email: str(row, ["email"]),
    bio: str(row, ["bio", "about"]),
    githubUrl: str(row, ["github_url", "githubUrl", "github"]),
    avatarInitials: initials(fullName),
    skills: skillItems.map((s) => s.name),
    skillItems,
  };
  const completionFromApi = pick(row, ["profile_completion", "profileCompletion"]);
  return {
    ...base,
    profileCompletion:
      completionFromApi === undefined ? profileCompletion(base) : Number(completionFromApi),
  };
}

function toMembers(value: unknown): ProjectMember[] {
  return asArray(value).map((entry, index) => {
    const row = asRow(entry);
    const name = str(row, ["full_name", "fullName", "name", "user_name"]);
    return {
      id: str(row, ["user_id", "id"], String(index)),
      name,
      role: str(row, ["role"], "Member"),
    };
  });
}

export function toProject(payload: unknown): Project {
  const row = asRow(payload);
  const members = toMembers(pick(row, ["members", "team_members"]));
  const memberCount = (pick(row, ["current_team_count", "member_count", "team_count"]) ??
    undefined) as number | undefined;
  const created = str(row, ["created_at", "createdAt", "date_created"]);
  return {
    id: str(row, ["id", "project_id"]),
    title: str(row, ["title", "name"]),
    description: str(row, ["description"]),
    owner: str(row, ["owner_name", "owner", "ownerName", "created_by_name"]),
    ownerId: str(row, ["owner_id", "ownerId", "created_by"]),
    teamSize: num(row, ["team_size", "teamSize"]),
    members,
    memberCount: memberCount === undefined ? members.length : Number(memberCount),
    requiredSkills: toSkillNames(pick(row, ["required_skills", "requiredSkills", "skills"])),
    matchPercentage: num(row, ["match_percentage", "matchPercentage"]),
    createdAt: created ? created.slice(0, 10) : "",
    isOwner: bool(row, ["is_owner", "isOwner"]),
    isMember: bool(row, ["is_member", "isMember"]),
    hasPendingRequest: bool(row, ["has_pending_request", "hasPendingRequest"]),
  };
}

export function toMatch(payload: unknown): Match {
  const row = asRow(payload);
  const matching = toSkillNames(pick(row, ["matching_skills", "matchingSkills"]));
  const required = toSkillNames(pick(row, ["required_skills", "requiredSkills", "skills"]));
  const missing = toSkillNames(pick(row, ["missing_skills", "missingSkills"]));
  return {
    projectId: str(row, ["project_id", "id", "projectId"]),
    projectTitle: str(row, ["project_title", "title", "projectTitle", "name"]),
    owner: str(row, ["owner_name", "owner", "ownerName"]),
    matchPercentage: num(row, ["match_percentage", "matchPercentage"]),
    matchingSkills: matching,
    missingSkills: missing,
    requiredSkills: required.length ? required : [...matching, ...missing],
    numMatching: num(row, ["num_matching", "numMatching"], matching.length),
    numRequired: num(row, ["num_required", "numRequired"], required.length),
    teamSize: num(row, ["team_size", "teamSize"]),
    currentTeamCount: num(row, ["current_team_count", "currentTeamCount"]),
    isMember: bool(row, ["is_member", "isMember"]),
    hasPendingRequest: bool(row, ["has_pending_request", "hasPendingRequest"]),
  };
}

export function toTeamRequest(payload: unknown, currentUserId?: string): TeamRequest {
  const row = asRow(payload);
  const status = String(pick(row, ["status"]) ?? "pending").toLowerCase();
  const normalizedStatus: RequestStatus =
    status === "accepted" || status === "approved"
      ? "accepted"
      : status === "rejected" || status === "declined"
        ? "rejected"
        : "pending";
  const userId = str(row, ["user_id", "requester_id", "userId"]);
  const apiDirection = str(row, ["direction"]).toLowerCase();
  const direction: TeamRequest["direction"] =
    apiDirection === "sent" || apiDirection === "incoming"
      ? (apiDirection as TeamRequest["direction"])
      : currentUserId && userId && userId === currentUserId
        ? "sent"
        : "incoming";
  const created = str(row, ["created_at", "createdAt"]);
  return {
    id: str(row, ["id", "request_id"]),
    projectId: str(row, ["project_id", "projectId"]),
    projectTitle: str(row, ["project_title", "projectTitle", "project"]),
    userName: str(row, ["user_name", "full_name", "userName", "requester_name"]),
    userSkills: toSkillNames(pick(row, ["user_skills", "skills", "userSkills"])),
    message: str(row, ["message", "note"]),
    status: normalizedStatus,
    createdAt: created ? created.slice(0, 10) : "",
    direction,
  };
}
