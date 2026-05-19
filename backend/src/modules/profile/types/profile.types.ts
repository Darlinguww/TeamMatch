export interface SkillExperienceInput {
  skillName: string;
  yearsOfExperience: number;
  level?: string;
}

export const SKILL_CATEGORIES = [
  'frontend',
  'backend',
  'mobile',
  'devops',
  'data',
  'design',
  'humanities',
  'social-work',
  'management',
  'marketing',
  'qa',
  'other'
] as const;

export type SkillCategory = typeof SKILL_CATEGORIES[number];

export interface SkillExperience {
  skillName: string;
  category: SkillCategory;
  yearsOfExperience: number;
  level: string | null;
}

export const WEEKDAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday'
] as const;

export type Weekday = typeof WEEKDAYS[number];

export interface TimeSlotInput {
  start: string;
  end: string;
}

export interface AvailabilityDayInput {
  day: Weekday;
  timeSlots: TimeSlotInput[];
}

export interface TimeSlot {
  start: string;
  end: string;
}

export interface AvailabilityDay {
  day: Weekday;
  timeSlots: TimeSlot[];
}

export interface PublicProfile {
  userId: string;
  user: string;
  experience: SkillExperience[];
  availability: AvailabilityDay[];
  skills: string[];
}

export interface ProfileSearchAvailabilityFilter {
  day: Weekday;
  start: string;
  end: string;
}

export interface SearchUsersFilters {
  skills: string[];
  minYears: number | null;
  availability: ProfileSearchAvailabilityFilter | null;
  limit: number;
  offset: number;
}

export type ProfileSearchDomainWeights = Record<string, number>;

export interface ProfileSearchMatch {
  matchingSkills: number;
  totalMatchingYears: number;
  availabilityMatched: boolean;
  redundancyPenalty: number;
  score: number;
  matchingCategories: SkillCategory[];
  categoryWeightApplied: number;
  reputationScore: number;
  reputationWeightApplied: number;
  isNeutralScore: boolean;
  domainWeights: ProfileSearchDomainWeights;
}

export interface ReputationBreakdown {
  skillsCount: number;
  skillsScore: number;
  totalExperienceYears: number;
  experienceScore: number;
  availabilityDays: number;
  availabilityScore: number;
  experienceAlignmentScore: number;
}

export interface UserReputation {
  userId: string;
  user: string;
  reputationScore: number;
  breakdown: ReputationBreakdown;
}

export interface PublicProfileSearchResult extends PublicProfile {
  match: ProfileSearchMatch;
}
