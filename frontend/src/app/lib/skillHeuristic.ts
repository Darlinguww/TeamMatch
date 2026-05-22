import { mapApiCategory, type SuggestedSkillPayload } from './skillCatalog';
import type { Skill } from './mockData';

type SkillCategory = Skill['category'];
type SkillLevel = Skill['level'];

interface CatalogEntry {
  pattern: RegExp;
  name: string;
  category: SkillCategory;
}

const CATALOG: CatalogEntry[] = [
  { pattern: /\btypescript\b/i, name: 'TypeScript', category: 'technical' },
  { pattern: /\bjavascript\b/i, name: 'JavaScript', category: 'technical' },
  { pattern: /\bjava\b(?!script)/i, name: 'Java', category: 'technical' },
  { pattern: /\bpython\b/i, name: 'Python', category: 'technical' },
  { pattern: /\bc\+\+\b/i, name: 'C++', category: 'technical' },
  { pattern: /\bc#\b|\bc\s*sharp\b/i, name: 'C#', category: 'technical' },
  { pattern: /\bphp\b/i, name: 'PHP', category: 'technical' },
  { pattern: /\bruby\b/i, name: 'Ruby', category: 'technical' },
  { pattern: /\bgo\b|\bgolang\b/i, name: 'Go', category: 'technical' },
  { pattern: /\brust\b/i, name: 'Rust', category: 'technical' },
  { pattern: /\breact\b/i, name: 'React', category: 'technical' },
  { pattern: /\bnext\.?js\b/i, name: 'Next.js', category: 'technical' },
  { pattern: /\bvue\.?js?\b/i, name: 'Vue', category: 'technical' },
  { pattern: /\bangular\b/i, name: 'Angular', category: 'technical' },
  { pattern: /\bnode\.?js\b/i, name: 'Node.js', category: 'technical' },
  { pattern: /\bexpress\b/i, name: 'Express', category: 'technical' },
  { pattern: /\bspring\s*boot\b|\bspringboot\b/i, name: 'Spring Boot', category: 'technical' },
  { pattern: /\bdjango\b/i, name: 'Django', category: 'technical' },
  { pattern: /\bfastapi\b/i, name: 'FastAPI', category: 'technical' },
  { pattern: /\bgraphql\b/i, name: 'GraphQL', category: 'technical' },
  { pattern: /\bsql\b/i, name: 'SQL', category: 'technical' },
  { pattern: /\bpostgresql\b|\bpostgres\b/i, name: 'PostgreSQL', category: 'technical' },
  { pattern: /\bmysql\b/i, name: 'MySQL', category: 'technical' },
  { pattern: /\bmongodb\b/i, name: 'MongoDB', category: 'technical' },
  { pattern: /\bredis\b/i, name: 'Redis', category: 'technical' },
  { pattern: /\bneo4j\b/i, name: 'Neo4j', category: 'technical' },
  { pattern: /\bdocker\b/i, name: 'Docker', category: 'technical' },
  { pattern: /\bkubernetes\b|\bk8s\b/i, name: 'Kubernetes', category: 'technical' },
  { pattern: /\baws\b/i, name: 'AWS', category: 'technical' },
  { pattern: /\bazure\b/i, name: 'Azure', category: 'technical' },
  { pattern: /\bmachine\s*learning\b/i, name: 'Machine Learning', category: 'technical' },
  { pattern: /\bciberseguridad\b/i, name: 'Ciberseguridad', category: 'technical' },
  { pattern: /\bfigma\b/i, name: 'Figma', category: 'technical' },
  { pattern: /\bux\b|\bui\b/i, name: 'UX/UI', category: 'technical' },
  { pattern: /\bliderazgo\b/i, name: 'Liderazgo', category: 'soft' },
  { pattern: /\bcomunicaci[oó]n\b/i, name: 'Comunicación', category: 'soft' },
  { pattern: /\btrabajo\s+en\s+equipo\b/i, name: 'Trabajo en equipo', category: 'soft' },
  { pattern: /\bscrum\b/i, name: 'Scrum', category: 'soft' },
  { pattern: /\bgesti[oó]n\s+de\s+proyectos\b/i, name: 'Gestión de Proyectos', category: 'soft' },
  { pattern: /\bingl[eé]s\b/i, name: 'Inglés', category: 'language' },
  { pattern: /\bfranc[eé]s\b/i, name: 'Francés', category: 'language' },
  { pattern: /\bfintech\b/i, name: 'FinTech', category: 'domain' },
  { pattern: /\bsalud\s+digital\b/i, name: 'Salud Digital', category: 'domain' },
  { pattern: /\be-?commerce\b/i, name: 'E-commerce', category: 'domain' },
  { pattern: /\bblockchain\b/i, name: 'Blockchain', category: 'domain' },
  { pattern: /\biot\b/i, name: 'IoT', category: 'domain' },
];

function levelFromYears(years: number): SkillLevel {
  if (years >= 8) return 'expert';
  if (years >= 4) return 'advanced';
  if (years >= 2) return 'intermediate';
  return 'beginner';
}

function detectYears(text: string): number {
  const match = text.match(/(\d+)\s*(?:años?|years?)\s+(?:de\s+)?experiencia/i);
  return match ? Math.min(80, Number(match[1])) : 0;
}

export function extractSkillsHeuristic(text: string): Skill[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const years = detectYears(trimmed);
  const level = years > 0 ? levelFromYears(years) : 'intermediate';
  const seen = new Set<string>();
  const results: Skill[] = [];

  for (const entry of CATALOG) {
    if (!entry.pattern.test(trimmed)) continue;
    const key = entry.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    results.push({
      id: `heur_${Date.now()}_${results.length}`,
      name: entry.name,
      category: entry.category,
      level,
    });
  }

  return results;
}

export function payloadsToUiSkills(items: SuggestedSkillPayload[]): Skill[] {
  return items.map((item, index) => {
    const years = Number(item.yearsOfExperience) || 0;
    const level = (['beginner', 'intermediate', 'advanced', 'expert'].includes(item.level ?? '')
      ? item.level
      : years > 0
        ? levelFromYears(years)
        : 'intermediate') as Skill['level'];
    return {
      id: `ai_${Date.now()}_${index}`,
      name: item.name,
      category: mapApiCategory(item.category),
      level,
    };
  });
}
