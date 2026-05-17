export interface ProjectRoleInput {
  role: string;
  skills: string[];
}

export interface CreateProjectInput {
  title: string;
  description: string;
  roles: ProjectRoleInput[];
}

export interface ProjectSummary {
  id: string;
  title: string;
  summary: string;
  createdAt: string;
  leader: {
    userId: string | null;
    email: string | null;
  };
  roles: ProjectRoleInput[];
}

export interface ProjectDetails extends ProjectSummary {
  description: string;
}
