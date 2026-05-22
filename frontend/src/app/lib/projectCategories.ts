/** Categorías sugeridas para proyectos (el usuario puede agregar otras). */
export const PROJECT_CATEGORY_SUGGESTIONS = [
  'Web Platform',
  'Mobile App',
  'AI/ML',
  'Data Science',
  'DevOps',
  'Blockchain',
  'IoT',
  'Education',
  'Educación',
  'FinTech',
  'Salud Digital',
  'Música',
  'Derecho',
  'Arte y cultura',
  'Emprendimiento',
  'Investigación',
  'Cocina',
  'Sostenibilidad',
] as const;

export function normalizeProjectCategory(value: string): string {
  const trimmed = value.trim().replace(/\s+/g, ' ');
  if (!trimmed) return '';
  return trimmed
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export function normalizeProjectCategories(values?: string[] | null): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of values ?? []) {
    const normalized = normalizeProjectCategory(raw);
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(normalized);
  }
  return result;
}

/** Infiere categorías desde título/descripción cuando la API no las devuelve. */
export function inferProjectCategories(title: string, description: string): string[] {
  const text = `${title} ${description}`.toLowerCase();
  const rules: Array<{ pattern: RegExp; category: string }> = [
    { pattern: /educaci[oó]n|e-learning|aula|curso|estudiantil|acad[eé]mic/i, category: 'Educación' },
    { pattern: /jur[ií]dic|legal|cl[ií]nica\s+jur/i, category: 'Derecho' },
    { pattern: /m[uú]sica|festival|audio|sonido/i, category: 'Música' },
    { pattern: /salud|telemedicina|cl[ií]nica|hospital/i, category: 'Salud Digital' },
    { pattern: /finanz|fintech|banca|contabil/i, category: 'FinTech' },
    { pattern: /mobile|android|ios|flutter/i, category: 'Mobile App' },
    { pattern: /machine\s*learning|inteligencia\s+artificial|\bai\b|ml\b/i, category: 'AI/ML' },
    { pattern: /datos|data\s*science|analytics|bi\b/i, category: 'Data Science' },
    { pattern: /devops|kubernetes|docker|infra/i, category: 'DevOps' },
    { pattern: /blockchain|web3|cripto/i, category: 'Blockchain' },
    { pattern: /iot|internet\s+de\s+las\s+cosas/i, category: 'IoT' },
    { pattern: /web|plataforma|frontend|backend|full\s*stack/i, category: 'Web Platform' },
  ];

  const found = new Set<string>();
  for (const rule of rules) {
    if (rule.pattern.test(text)) {
      found.add(rule.category);
    }
  }
  return [...found];
}

export function resolveProjectCategories(
  apiCategories: string[] | undefined,
  title: string,
  description: string,
  fallback?: string[]
): string[] {
  const fromApi = normalizeProjectCategories(apiCategories ?? []);
  if (fromApi.length > 0) return fromApi;

  const fromFallback = normalizeProjectCategories(fallback ?? []);
  if (fromFallback.length > 0) return fromFallback;

  const inferred = inferProjectCategories(title, description);
  if (inferred.length > 0) return inferred;

  return ['General'];
}

export function projectMatchesCategoryFilter(
  categories: string[],
  filter: string
): boolean {
  if (filter === 'all') return true;
  const normalizedFilter = filter.trim().toLowerCase();
  return categories.some((c) => c.trim().toLowerCase() === normalizedFilter);
}

export function collectFilterCategoryOptions(projects: { categories: string[] }[]): string[] {
  const seen = new Set<string>();
  const options: string[] = [];
  for (const project of projects) {
    for (const category of project.categories) {
      const key = category.trim().toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      options.push(category);
    }
  }
  return options.sort((a, b) => a.localeCompare(b, 'es'));
}
