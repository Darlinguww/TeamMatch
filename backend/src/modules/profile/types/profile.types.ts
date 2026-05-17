export interface SkillExperienceInput {
  skillName: string;
  yearsOfExperience: number;
  level?: string;
}

export interface SkillExperience {
  skillName: string;
  yearsOfExperience: number;
  level: string | null;
}

export interface PublicProfile {
  userId: string;
  user: string;
  experience: SkillExperience[];
}
