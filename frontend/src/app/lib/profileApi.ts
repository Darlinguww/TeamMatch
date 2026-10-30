import { apiRequest, ApiError } from './apiClient';
import { levelToYears, mapApiCategory, type SuggestedSkillPayload } from './skillCatalog';
import type { Skill } from './mockData';

export interface ApiAvailabilityDay {
  day: string;
  timeSlots: Array<{ start: string; end: string }>;
}

export const profileApi = {
  getProfile: (userId: string) =>
    apiRequest<{ profile: { userId: string; user: string; skills: string[]; experience: Array<{
      skillName: string;
      yearsOfExperience: number;
      level: string | null;
    }> } }>(`/users/${userId}/profile`),

  updateSkills: (skills: string[]) =>
    apiRequest<{ profile: unknown }>('/profile/skills', {
      method: 'PUT',
      body: { skills },
    }),

  updateExperience: (
    experience: Array<{ skillName: string; yearsOfExperience: number; level?: string }>
  ) =>
    apiRequest<{ profile: unknown }>('/profile/experience', {
      method: 'PUT',
      body: { experience },
    }),

  updateAvailability: (availability: ApiAvailabilityDay[]) =>
    apiRequest<{ profile: unknown }>('/profile/availability', {
      method: 'PUT',
      body: { availability },
    }),

  parseAvailability: (text: string) =>
    apiRequest<{ availability: ApiAvailabilityDay[]; source: 'azure' | 'manual' }>('/availability/parse', {
      method: 'POST',
      body: { text },
    }),

  suggestSkillsFromText: (text: string) =>
    apiRequest<{ suggestions: string[]; skills?: SuggestedSkillPayload[] }>('/profile/skills', {
      method: 'POST',
      body: { text },
    }),

  suggestSkillsFromFile: async (file: File, text?: string): Promise<SuggestedSkillPayload[]> => {
    const form = new FormData();
    form.append('file', file);
    if (text?.trim()) {
      form.append('text', text.trim());
    }

    const base = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? 'http://localhost:3000/api';
    const token = localStorage.getItem('teammatch_token');

    const response = await fetch(`${base}/profile/skills`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = payload?.error?.message ?? 'No se pudo analizar el archivo';
      throw new ApiError(message, response.status, payload?.error?.code);
    }

    if (Array.isArray(payload.skills) && payload.skills.length > 0) {
      return payload.skills as SuggestedSkillPayload[];
    }

    return ((payload.suggestions ?? []) as string[]).map((name) => ({ name }));
  },
};

export function suggestedToUiSkills(items: SuggestedSkillPayload[]): Skill[] {
  return items.map((item, index) => ({
    id: `ai_${Date.now()}_${index}`,
    name: item.name,
    category: mapApiCategory(item.category),
    level: (['beginner', 'intermediate', 'advanced', 'expert'].includes(item.level ?? '')
      ? item.level
      : 'intermediate') as Skill['level'],
  }));
}

export function buildExperiencePayload(skills: Skill[], yearsExperience: number) {
  return skills.map((skill) => ({
    skillName: skill.name,
    yearsOfExperience:
      levelToYears(skill.level) || Math.max(1, Math.floor(yearsExperience / Math.max(skills.length, 1))),
    level: skill.level,
  }));
}
