export interface Skill {
  skillId: string;
  name: string;
  normalizedName: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSkillInput {
  name: string;
}

export interface UpdateSkillInput {
  name: string;
}
