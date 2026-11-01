import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const KEYWORDS = new Set([
  'optional', 'match', 'with', 'where', 'return', 'order', 'by', 'skip', 'limit', 'call',
  'as', 'and', 'or', 'not', 'in', 'is', 'null', 'true', 'false', 'case', 'when', 'then',
  'else', 'end', 'distinct', 'xor', 'asc', 'desc', 'create', 'merge', 'set', 'delete',
  'detach', 'foreach', 'union', 'all', 'unwind', 'on', 'yield'
]);

const CLAUSE_KEYWORDS = [
  'OPTIONAL MATCH',
  'ORDER BY',
  'DETACH DELETE',
  'WITH',
  'WHERE',
  'RETURN',
  'MATCH',
  'CALL',
  'UNWIND',
  'SKIP',
  'LIMIT',
  'CREATE',
  'MERGE',
  'DELETE',
  'FOREACH',
  'UNION'
];

function stripCommentsAndStrings(query: string): string {
  let out = '';
  let i = 0;

  while (i < query.length) {
    if (query.startsWith('//', i)) {
      const nextLine = query.indexOf('\n', i);
      i = nextLine === -1 ? query.length : nextLine;
      continue;
    }

    const quote = query[i];
    if (quote === "'" || quote === '"') {
      i += 1;
      while (i < query.length && query[i] !== quote) {
        i += query[i] === '\\' ? 2 : 1;
      }
      out += ' ';
      i += 1;
      continue;
    }

    out += query[i];
    i += 1;
  }

  return out;
}

function isIdentChar(char: string | undefined): boolean {
  return Boolean(char && /[A-Za-z0-9_]/.test(char));
}

function readIdentifier(source: string, index: number): { name: string; next: number } | null {
  if (!/[A-Za-z_]/.test(source[index] ?? '')) {
    return null;
  }

  let next = index + 1;
  while (isIdentChar(source[next])) {
    next += 1;
  }

  return { name: source.slice(index, next), next };
}

function precededByAs(source: string, index: number): boolean {
  return /\bAS$/i.test(source.slice(0, index).trimEnd());
}

function clauseKeywordAt(source: string, index: number, paren: number, bracket: number, brace: number): string | null {
  if (paren !== 0 || bracket !== 0 || brace !== 0 || precededByAs(source, index)) {
    return null;
  }

  for (const keyword of CLAUSE_KEYWORDS) {
    if (source.slice(index, index + keyword.length).toUpperCase() !== keyword) {
      continue;
    }

    const before = index === 0 ? ' ' : source[index - 1];
    const after = source[index + keyword.length] ?? ' ';
    if (!isIdentChar(before) && !isIdentChar(after)) {
      return keyword;
    }
  }

  return null;
}

function splitClauses(query: string): Array<{ keyword: string; text: string }> {
  const clauses: Array<{ keyword: string; text: string }> = [];
  let paren = 0;
  let bracket = 0;
  let brace = 0;
  let currentStart = 0;
  let currentKeyword = 'START';
  let index = 0;

  while (index < query.length) {
    const keyword = clauseKeywordAt(query, index, paren, bracket, brace);
    if (keyword) {
      const leadingGap = query.slice(currentStart, index).trim() === '';
      if (currentKeyword === 'START' && leadingGap) {
        currentKeyword = keyword;
        currentStart = index;
        index += keyword.length;
        continue;
      }

      if (index !== currentStart) {
        clauses.push({ keyword: currentKeyword, text: query.slice(currentStart, index) });
        currentKeyword = keyword;
        currentStart = index;
        index += keyword.length;
        continue;
      }
    }

    const char = query[index];
    if (char === '(') paren += 1;
    else if (char === ')') paren -= 1;
    else if (char === '[') bracket += 1;
    else if (char === ']') bracket -= 1;
    else if (char === '{') brace += 1;
    else if (char === '}') brace -= 1;
    index += 1;
  }

  clauses.push({ keyword: currentKeyword, text: query.slice(currentStart) });
  return clauses;
}

function splitAtDepthZero(text: string, separator: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '(' || char === '[' || char === '{') depth += 1;
    else if (char === ')' || char === ']' || char === '}') depth -= 1;
    else if (depth === 0 && text.slice(index, index + separator.length) === separator) {
      parts.push(text.slice(start, index));
      start = index + separator.length;
      index += separator.length - 1;
    }
  }

  parts.push(text.slice(start));
  return parts;
}

function boundNames(expression: string): Set<string> {
  const bound = new Set<string>();
  const patterns = [
    /reduce\s*\(\s*([A-Za-z_]\w*)\s*=/gi,
    /\[\s*([A-Za-z_]\w*)\s+IN\b/gi,
    /,\s*([A-Za-z_]\w*)\s+IN\b/gi
  ];

  for (const pattern of patterns) {
    for (const match of expression.matchAll(pattern)) {
      bound.add(match[1]);
    }
  }

  return bound;
}

function freeIdentifiers(expression: string, bound: Set<string>): string[] {
  const names: string[] = [];

  for (let index = 0; index < expression.length; index += 1) {
    const char = expression[index];
    if (char === '$' || char === '.') {
      index += 1;
      while (isIdentChar(expression[index])) index += 1;
      index -= 1;
      continue;
    }

    const identifier = readIdentifier(expression, index);
    if (!identifier) {
      continue;
    }

    const after = expression.slice(identifier.next);
    const isFunction = /^\s*\(/.test(after);
    const isMapKey = /^\s*:/.test(after);
    if (
      !isFunction
      && !isMapKey
      && !KEYWORDS.has(identifier.name.toLowerCase())
      && !bound.has(identifier.name)
    ) {
      names.push(identifier.name);
    }

    index = identifier.next - 1;
  }

  return names;
}

function projectionOutputs(body: string): { outputs: string[]; references: string[] } {
  const withoutKeyword = body.replace(/^\s*WITH\s+/i, '').replace(/^\s*RETURN\s+/i, '');
  const outputs: string[] = [];
  const references: string[] = [];

  for (const part of splitAtDepthZero(withoutKeyword, ',')) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    const asParts = splitAtDepthZero(trimmed, ' AS ');
    const hasAlias = asParts.length > 1;
    const expression = hasAlias ? asParts.slice(0, -1).join(' AS ') : trimmed;
    const alias = hasAlias
      ? (asParts[asParts.length - 1].trim().match(/^[A-Za-z_]\w*/)?.[0] ?? '')
      : (trimmed.match(/^[A-Za-z_]\w*$/)?.[0] ?? '');

    if (!alias) {
      throw new Error(`No se pudo leer el alias de la proyeccion: ${trimmed.slice(0, 80)}`);
    }

    outputs.push(alias);
    references.push(...freeIdentifiers(expression, boundNames(expression)));
  }

  return { outputs, references };
}

function patternVariables(body: string): string[] {
  const names: string[] = [];
  const pattern = /[[(]\s*([A-Za-z_]\w*)\s*(?=[:)\]]|\{)/g;

  for (const match of body.matchAll(pattern)) {
    if (!KEYWORDS.has(match[1].toLowerCase())) {
      names.push(match[1]);
    }
  }

  return names;
}

function returnedAliases(callBody: string): string[] {
  return [...callBody.matchAll(/\bAS\s+([A-Za-z_]\w*)/gi)].map((match) => match[1]);
}

export function assertCypherWithScope(query: string): void {
  const clauses = splitClauses(stripCommentsAndStrings(query));
  let scope = new Set<string>();

  for (const clause of clauses) {
    const keyword = clause.keyword.toUpperCase();

    if (keyword === 'MATCH' || keyword === 'OPTIONAL MATCH' || keyword === 'MERGE' || keyword === 'CREATE') {
      for (const name of patternVariables(clause.text)) {
        scope.add(name);
      }
      continue;
    }

    if (keyword === 'CALL') {
      for (const name of returnedAliases(clause.text)) {
        scope.add(name);
      }
      continue;
    }

    if (keyword === 'WHERE' || keyword === 'ORDER BY') {
      const missing = freeIdentifiers(clause.text, boundNames(clause.text)).filter((name) => !scope.has(name));
      if (missing.length > 0) {
        throw new Error(`${keyword} usa variables fuera de alcance: ${[...new Set(missing)].join(', ')}`);
      }
      continue;
    }

    if (keyword === 'WITH' || keyword === 'RETURN') {
      const projection = projectionOutputs(clause.text);
      const missing = projection.references.filter((name) => !scope.has(name));
      if (missing.length > 0) {
        throw new Error(`${keyword} usa variables fuera de alcance: ${[...new Set(missing)].join(', ')}`);
      }

      if (keyword === 'WITH') {
        scope = new Set(projection.outputs);
      }
    }
  }
}

function searchPublicProfilesQuery(): string {
  const source = readFileSync(new URL('./repositories/profile.repository.ts', import.meta.url), 'utf8');
  const methodStart = source.indexOf('public async searchPublicProfiles');
  const queryStart = source.indexOf('`MATCH (u:Usuario)', methodStart);
  const queryEnd = source.indexOf('LIMIT $limit`', queryStart);

  if (methodStart < 0 || queryStart < 0 || queryEnd < 0) {
    throw new Error('No se encontro la consulta de searchPublicProfiles');
  }

  return source.slice(queryStart + 1, queryEnd + 'LIMIT $limit'.length);
}

describe('searchPublicProfiles Cypher scope', () => {
  it('falla cuando un WITH deja caer una variable que la clausula siguiente usa', () => {
    const broken = `
      MATCH (u:Usuario)
      WITH u, confirmedSkills
      WITH u
      RETURN confirmedSkills AS skills
    `;

    expect(() => assertCypherWithScope(broken)).toThrow(/confirmedSkills/);
  });

  it('mantiene confirmedSkills, redundancyPenalty y matchingExperience hasta el RETURN', () => {
    expect(() => assertCypherWithScope(searchPublicProfilesQuery())).not.toThrow();
  });
});
