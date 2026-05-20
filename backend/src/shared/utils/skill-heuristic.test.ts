import { describe, expect, it } from 'vitest';
import {
  extractSkillsHeuristic,
  parseSkillSuggestionSource,
  parseSuggestedSkillsFromAiResponse,
} from './skill-heuristic.js';

describe('parseSuggestedSkillsFromAiResponse', () => {
  it('mapea skills del ai-service con categoría y años sin forzar catálogo', () => {
    const result = parseSuggestedSkillsFromAiResponse({
      skills: [
        {
          original: '5 años en redes y comunicación con clientes',
          normalized: 'Redes de computadoras',
          category: 'technical',
          yearsOfExperience: 5,
        },
        {
          original: 'liderazgo de equipos',
          normalized: 'Liderazgo',
          category: 'soft',
          confidence: 0.9,
        },
        {
          original: 'inglés fluido',
          normalized: 'Inglés',
          category: 'language',
        },
      ],
    });

    expect(result).toHaveLength(3);
    expect(result[0]).toMatchObject({
      name: 'Redes de computadoras',
      category: 'technical',
      level: 'advanced',
      yearsOfExperience: 5,
    });
    expect(result[1]).toMatchObject({ name: 'Liderazgo', category: 'soft' });
    expect(result[2]).toMatchObject({ name: 'Inglés', category: 'language' });
  });

  it('acepta habilidades no presentes en catálogo local', () => {
    const result = parseSuggestedSkillsFromAiResponse({
      skills: [{ normalized: 'Pentesting avanzado', category: 'technical' }],
    });
    expect(result[0]?.name).toBe('Pentesting avanzado');
  });

  it('lee source heuristic del ai-service', () => {
    expect(parseSkillSuggestionSource({ source: 'heuristic', skills: [] })).toBe('heuristic');
    expect(parseSkillSuggestionSource({ source: 'azure', skills: [] })).toBe('azure');
  });
});

describe('extractSkillsHeuristic', () => {
  it('extrae habilidades conocidas del catálogo local', () => {
    const result = extractSkillsHeuristic(
      'Perfil con Python, Docker, finanzas y liderazgo en equipos ágiles'
    );
    const names = result.map((s) => s.name);
    expect(names).toEqual(expect.arrayContaining(['Python', 'Docker', 'Finanzas', 'Liderazgo']));
  });
});
