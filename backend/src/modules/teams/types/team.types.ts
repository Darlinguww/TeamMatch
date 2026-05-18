export interface TeamMember {
  userId: string;
  user: string;
  joinedAt: string | null;
}

export interface TeamRole {
  roleId: string;
  name: string;
  skills: string[];
}

export interface TeamComposition {
  id: string;
  title: string;
  description: string;
  summary: string;
  createdAt: string | null;
  members: TeamMember[];
  roles: TeamRole[];
}

export interface ActiveTaskSummary {
  taskId: string;
  title: string;
  status: string | null;
}

export interface RemoveTeamMemberResult {
  teamId: string;
  memberId: string;
  removed: true;
}
