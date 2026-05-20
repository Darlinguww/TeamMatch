import { SKILL_CATALOG } from '../data/skill-catalog.js';

export interface SuggestedSkill {
  name: string;
  category: 'technical' | 'soft' | 'domain' | 'language';
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  yearsOfExperience: number;
}

export type SkillSuggestionSource = 'azure' | 'heuristic';



const LEVEL_FROM_YEARS = (years: number): SuggestedSkill['level'] => {

  if (years >= 8) return 'expert';

  if (years >= 4) return 'advanced';

  if (years >= 2) return 'intermediate';

  return 'beginner';

};



function mapCategory(category?: string): SuggestedSkill['category'] {

  const c = (category ?? '').toLowerCase();

  if (c.includes('bland') || c === 'soft') return 'soft';

  if (c.includes('idioma') || c === 'language') return 'language';

  if (c.includes('dominio') || c === 'domain') return 'domain';

  if (c.includes('tecnic') || c === 'technical') return 'technical';

  return 'technical';

}



type AiSkillPayload =

  | string

  | {

      original?: string;

      normalized?: string;

      name?: string;

      category?: string;

      confidence?: number;

      yearsOfExperience?: number;

    };



/** Convierte la respuesta del ai-service en habilidades para el perfil (sin catálogo heurístico). */

export function parseSuggestedSkillsFromAiResponse(body: unknown): SuggestedSkill[] {

  if (!body || typeof body !== 'object') return [];



  const skills = (body as { skills?: AiSkillPayload[] }).skills;

  if (!Array.isArray(skills)) return [];



  return skills

    .map((item) => {

      if (typeof item === 'string') {

        const name = item.trim();

        if (!name) return null;

        return {

          name,

          category: 'technical' as const,

          level: 'intermediate' as const,

          yearsOfExperience: 0,

        };

      }



      if (item && typeof item === 'object') {

        const name = String(item.normalized ?? item.name ?? item.original ?? '').trim();

        if (!name) return null;

        const years = Math.min(80, Math.max(0, Number(item.yearsOfExperience) || 0));

        return {

          name,

          category: mapCategory(item.category),

          level: LEVEL_FROM_YEARS(years),

          yearsOfExperience: years,

        };

      }



      return null;

    })

    .filter((s): s is SuggestedSkill => s !== null);

}



export function parseSkillNamesFromAiResponse(body: unknown): string[] {
  return parseSuggestedSkillsFromAiResponse(body).map((s) => s.name);
}

/** Extracción local por catálogo (respaldo cuando el ai-service o Azure no están disponibles). */
export function extractSkillsHeuristic(text: string): SuggestedSkill[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const seen = new Set<string>();
  const results: SuggestedSkill[] = [];

  for (const entry of SKILL_CATALOG) {
    if (!entry.pattern.test(trimmed)) continue;
    const key = entry.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    results.push({
      name: entry.name,
      category: entry.category,
      level: 'intermediate',
      yearsOfExperience: 0,
    });
  }

  return results;
}

export function parseSkillSuggestionSource(body: unknown): SkillSuggestionSource {
  if (body && typeof body === 'object' && (body as { source?: unknown }).source === 'heuristic') {
    return 'heuristic';
  }
  return 'azure';
}

