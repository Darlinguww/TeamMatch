export interface ProjectRoleInput {
  role: string;
  skills: string[];
  headcount?: number;
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

export interface ProjectKanbanState {
  sprintActive: boolean;
  currentSprint: number;
}

export interface ProjectDetails extends ProjectSummary {
  description: string;
  kanban: ProjectKanbanState;
}

export interface UpdateProjectKanbanInput {
  sprintActive: boolean;
  currentSprint: number;
}

export interface ProjectPhaseOneCandidate {
  userId: string;
  matchedSkills: string[];
}

export type MatchSkillType = 'exact' | 'similar' | 'complementary';

export interface ProjectMatchSkillContribution {
  requiredSkill: string;
  matchedSkill: string;
  matchType: MatchSkillType;
  semanticScore: number;
  level: number;
  score: number;
}

export interface ProjectPhaseTwoCandidate {
  userId: string;
  email: string | null;
  name: string | null;
  score: number;
  exactMatches: number;
  similarMatches: number;
  complementaryMatches: number;
  skills: ProjectMatchSkillContribution[];
}

export interface ProjectMatchWeights {
  exact: number;
  similar: number;
  complementary: number;
}

export interface SemanticIndexRebuildInput {
  similarityCutoff?: unknown;
  topK?: unknown;
}

export interface SemanticIndexRebuildResult {
  graphName: string;
  nodeCount: number;
  relationshipCount: number;
  relationshipsCreated: number;
  similarityCutoff: number;
  topK: number;
}
