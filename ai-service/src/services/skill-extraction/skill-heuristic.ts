import { SKILL_CATALOG } from '../../data/skill-catalog.js';
import type { NormalizedSkill } from '../../types/ai.types.js';

/**
 * Extrae habilidades por catálogo (técnicas, blandas, dominio, idiomas) cuando Azure no está disponible.
 */
export function extractSkillsHeuristic(text: string): NormalizedSkill[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const seen = new Set<string>();
  const results: NormalizedSkill[] = [];

  for (const entry of SKILL_CATALOG) {
    if (!entry.pattern.test(trimmed)) continue;
    const key = entry.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    results.push({
      original: entry.name,
      normalized: entry.name,
      category: entry.category,
    });
  }

  return results;
}

export function extractSkillNamesHeuristic(text: string): string[] {
  return extractSkillsHeuristic(text).map((s) => s.normalized);
}
