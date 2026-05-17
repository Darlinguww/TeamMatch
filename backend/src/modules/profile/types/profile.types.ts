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

export interface ProfileSearchMatch {
  matchingSkills: number;
  totalMatchingYears: number;
  availabilityMatched: boolean;
  score: number;
}

export interface PublicProfileSearchResult extends PublicProfile {
  match: ProfileSearchMatch;
}
