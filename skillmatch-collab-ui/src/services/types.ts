export interface Skill {
  id: string;
  name: string;
}

export interface User {
  id: string;
  fullName: string;
  email: string;
  bio: string;
  githubUrl: string;
  avatarInitials: string;
  /** Skill names, used across the UI. */
  skills: string[];
  /** Skill records with their backend ids (needed for DELETE /api/profile/skills/<id>). */
  skillItems: Skill[];
  profileCompletion: number;
}

export interface ProjectMember {
  id: string;
  name: string;
  role: string;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  owner: string;
  ownerId: string;
  teamSize: number;
  members: ProjectMember[];
  memberCount: number;
  requiredSkills: string[];
  matchPercentage: number;
  createdAt: string;
  isOwner: boolean;
  isMember: boolean;
  hasPendingRequest: boolean;
}

export interface Match {
  projectId: string;
  projectTitle: string;
  owner: string;
  matchPercentage: number;
  matchingSkills: string[];
  missingSkills: string[];
  requiredSkills: string[];
  numMatching: number;
  numRequired: number;
  teamSize: number;
  currentTeamCount: number;
  isMember: boolean;
  hasPendingRequest: boolean;
}

export type RequestStatus = "pending" | "accepted" | "rejected";

export interface TeamRequest {
  id: string;
  projectId: string;
  projectTitle: string;
  userName: string;
  userSkills: string[];
  message: string;
  status: RequestStatus;
  createdAt: string;
  direction: "incoming" | "sent";
}

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface RegisterPayload extends AuthCredentials {
  fullName: string;
  confirmPassword: string;
}

export interface CreateProjectPayload {
  title: string;
  description: string;
  teamSize: number;
  requiredSkills: string[];
}

export type UpdateProjectPayload = Partial<CreateProjectPayload>;
