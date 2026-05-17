import {
  AvailabilityDay,
  ProfileSearchMatch,
  PublicProfile,
  PublicProfileSearchResult,
  SkillExperience,
  TimeSlot,
  WEEKDAYS,
  Weekday
} from '../types/profile.types.js';

export interface PublicProfileRecord {
  userId: unknown;
  user: unknown;
  experience: unknown;
  availability?: unknown;
}

export interface PublicProfileSearchRecord extends PublicProfileRecord {
  match: unknown;
}

function serializeExperienceItem(item: unknown): SkillExperience | null {
  if (typeof item !== 'object' || item === null || Array.isArray(item)) {
    return null;
  }

  const rawItem = item as Record<string, unknown>;
  const skillName = typeof rawItem.skillName === 'string' ? rawItem.skillName : '';

  if (!skillName) {
    return null;
  }

  return {
    skillName,
    yearsOfExperience: Number(rawItem.yearsOfExperience ?? 0),
    level: typeof rawItem.level === 'string' && rawItem.level ? rawItem.level : null
  };
}

function isWeekday(value: string): value is Weekday {
  return WEEKDAYS.includes(value as Weekday);
}

function serializeTimeSlot(item: unknown): TimeSlot | null {
  if (typeof item !== 'object' || item === null || Array.isArray(item)) {
    return null;
  }

  const rawItem = item as Record<string, unknown>;

  if (typeof rawItem.start !== 'string' || typeof rawItem.end !== 'string') {
    return null;
  }

  return {
    start: rawItem.start,
    end: rawItem.end
  };
}

function serializeAvailabilityDay(item: unknown): AvailabilityDay | null {
  if (typeof item !== 'object' || item === null || Array.isArray(item)) {
    return null;
  }

  const rawItem = item as Record<string, unknown>;
  const day = typeof rawItem.day === 'string' ? rawItem.day : '';

  if (!isWeekday(day) || !Array.isArray(rawItem.timeSlots)) {
    return null;
  }

  const timeSlots = rawItem.timeSlots
    .map(serializeTimeSlot)
    .filter((slot): slot is TimeSlot => slot !== null);

  return { day, timeSlots };
}

export function serializePublicProfile(record: PublicProfileRecord): PublicProfile {
  const experience = Array.isArray(record.experience)
    ? record.experience
      .map(serializeExperienceItem)
      .filter((item): item is SkillExperience => item !== null)
    : [];
  const availability = Array.isArray(record.availability)
    ? record.availability
      .map(serializeAvailabilityDay)
      .filter((item): item is AvailabilityDay => item !== null)
    : [];

  return {
    userId: String(record.userId),
    user: typeof record.user === 'string' ? record.user : '',
    experience,
    availability
  };
}

function serializeSearchMatch(match: unknown): ProfileSearchMatch {
  if (typeof match !== 'object' || match === null || Array.isArray(match)) {
    return {
      matchingSkills: 0,
      totalMatchingYears: 0,
      availabilityMatched: false,
      score: 0
    };
  }

  const rawMatch = match as Record<string, unknown>;

  return {
    matchingSkills: Number(rawMatch.matchingSkills ?? 0),
    totalMatchingYears: Number(rawMatch.totalMatchingYears ?? 0),
    availabilityMatched: rawMatch.availabilityMatched === true,
    score: Number(rawMatch.score ?? 0)
  };
}

export function serializePublicProfileSearchResult(record: PublicProfileSearchRecord): PublicProfileSearchResult {
  return {
    ...serializePublicProfile(record),
    match: serializeSearchMatch(record.match)
  };
}
