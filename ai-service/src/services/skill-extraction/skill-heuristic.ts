import type { NormalizedSkill } from '../../types/ai.types.js';

/** Catálogo para extracción local cuando Azure no está disponible. */
const KNOWN_SKILLS: Array<{
  pattern: RegExp;
  normalized: string;
  category: 'technical' | 'soft' | 'domain' | 'language';
}> = [
  { pattern: /\btypescript\b/i, normalized: 'TypeScript', category: 'technical' },
  { pattern: /\bjavascript\b/i, normalized: 'JavaScript', category: 'technical' },
  { pattern: /\bjava\b(?!script)/i, normalized: 'Java', category: 'technical' },
  { pattern: /\bpython\b/i, normalized: 'Python', category: 'technical' },
  { pattern: /\breact\b/i, normalized: 'React', category: 'technical' },
  { pattern: /\bnode\.?js\b/i, normalized: 'Node.js', category: 'technical' },
  { pattern: /\bvue\.?js?\b/i, normalized: 'Vue', category: 'technical' },
  { pattern: /\bangular\b/i, normalized: 'Angular', category: 'technical' },
  { pattern: /\bspring\s*boot\b/i, normalized: 'Spring Boot', category: 'technical' },
  { pattern: /\bmongodb\b/i, normalized: 'MongoDB', category: 'technical' },
  { pattern: /\bpostgresql\b|\bpostgres\b/i, normalized: 'PostgreSQL', category: 'technical' },
  { pattern: /\bsql\b/i, normalized: 'SQL', category: 'technical' },
  { pattern: /\bdocker\b/i, normalized: 'Docker', category: 'technical' },
  { pattern: /\bkubernetes\b|\bk8s\b/i, normalized: 'Kubernetes', category: 'technical' },
  { pattern: /\baws\b/i, normalized: 'AWS', category: 'technical' },
  { pattern: /\bazure\b/i, normalized: 'Azure', category: 'technical' },
  { pattern: /\bgraphql\b/i, normalized: 'GraphQL', category: 'technical' },
  { pattern: /\bflutter\b/i, normalized: 'Flutter', category: 'technical' },
  { pattern: /\breact\s*native\b/i, normalized: 'React Native', category: 'technical' },
  { pattern: /\bc#\b|\bc\s*sharp\b/i, normalized: 'C#', category: 'technical' },
  { pattern: /\bgo\b|\bgolang\b/i, normalized: 'Go', category: 'technical' },
  { pattern: /\brust\b/i, normalized: 'Rust', category: 'technical' },
  { pattern: /\bfigma\b/i, normalized: 'Figma', category: 'technical' },
  { pattern: /\bmachine\s*learning\b|\bml\b/i, normalized: 'Machine Learning', category: 'technical' },
  { pattern: /\bscrum\b/i, normalized: 'Scrum', category: 'soft' },
  { pattern: /\bagile\b|\bágil\b|\bagiles\b/i, normalized: 'Metodologías Ágiles', category: 'soft' },
  { pattern: /\bliderazgo\b/i, normalized: 'Liderazgo', category: 'soft' },
  { pattern: /\bcomunicaci[oó]n\b/i, normalized: 'Comunicación', category: 'soft' },
  { pattern: /\bgesti[oó]n\s+de\s+proyectos\b/i, normalized: 'Gestión de Proyectos', category: 'soft' },
  { pattern: /\bux\b|\bui\b|\bux\/ui\b/i, normalized: 'UX/UI', category: 'technical' },
  { pattern: /\bciberseguridad\b|\bseguridad\s+inform[aá]tica\b/i, normalized: 'Ciberseguridad', category: 'technical' },
  { pattern: /\bredes\s+de\s+computadoras?\b|\bnetworking\b/i, normalized: 'Redes de computadoras', category: 'technical' },
  { pattern: /\b(?:[eé]rea\s+de\s+)?redes\b/i, normalized: 'Redes', category: 'technical' },
  { pattern: /\bcontabilidad\b/i, normalized: 'Contabilidad', category: 'domain' },
  { pattern: /\bfinanzas\b/i, normalized: 'Finanzas', category: 'domain' },
  { pattern: /\bexcel\b/i, normalized: 'Excel', category: 'technical' },
  { pattern: /\bsap\b/i, normalized: 'SAP', category: 'technical' },
  { pattern: /\bpentesting\b/i, normalized: 'Pentesting', category: 'technical' },
  { pattern: /\bpower\s*bi\b/i, normalized: 'Power BI', category: 'technical' },
  { pattern: /\bmarketing\s+digital\b/i, normalized: 'Marketing digital', category: 'domain' },
  { pattern: /\brecursos\s+humanos\b/i, normalized: 'Recursos Humanos', category: 'domain' },
  { pattern: /\bnegociaci[oó]n\b/i, normalized: 'Negociación', category: 'soft' },
  { pattern: /\btrabajo\s+en\s+equipo\b/i, normalized: 'Trabajo en equipo', category: 'soft' },
  { pattern: /\bqa\b|quality\s+assurance/i, normalized: 'QA', category: 'technical' },
  { pattern: /\bselenium\b/i, normalized: 'Selenium', category: 'technical' },
  { pattern: /\bproduct\s+management\b/i, normalized: 'Product Management', category: 'domain' },
];

/**
 * Extrae habilidades por patrones conocidos (degradación sin Azure).
 */
export function extractSkillsHeuristic(text: string): NormalizedSkill[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const seen = new Set<string>();
  const results: NormalizedSkill[] = [];

  for (const entry of KNOWN_SKILLS) {
    if (!entry.pattern.test(trimmed)) continue;
    const key = entry.normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    results.push({
      original: entry.normalized,
      normalized: entry.normalized,
      category: entry.category,
    });
  }

  return results;
}

/** Nombres normalizados para respuestas del backend. */
export function extractSkillNamesHeuristic(text: string): string[] {
  return extractSkillsHeuristic(text).map((s) => s.normalized);
}
