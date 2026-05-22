import { ApiError, getStoredToken } from './apiClient';
import { parseAvailabilityHeuristic } from './availabilityHeuristic';
import { profileApi, suggestedToUiSkills, type ApiAvailabilityDay } from './profileApi';
import { extractSkillsHeuristic, payloadsToUiSkills } from './skillHeuristic';
import type { Skill } from './mockData';

export function hasBackendSession(): boolean {
  return Boolean(getStoredToken());
}

export async function suggestSkillsFromInput(
  text: string,
  file?: File
): Promise<{ skills: Skill[]; source: 'api' | 'heuristic' }> {
  const trimmed = text.trim();

  if (file) {
    if (hasBackendSession()) {
      try {
        const fromFile = await profileApi.suggestSkillsFromFile(file, trimmed);
        if (fromFile.length > 0) {
          return { skills: suggestedToUiSkills(fromFile), source: 'api' };
        }
      } catch (err) {
        if (err instanceof ApiError && (err.status === 400 || err.status === 422)) {
          throw err;
        }
      }
    }
    if (file.type === 'text/plain') {
      const fileText = await file.text();
      const combined = [trimmed, fileText].filter(Boolean).join('\n');
      const skills = extractSkillsHeuristic(combined);
      if (skills.length > 0) return { skills, source: 'heuristic' };
    }
    throw new Error(
      'No se detectaron habilidades en el archivo. Prueba pegar el contenido en "Texto libre" o inicia sesión con el backend activo.'
    );
  }

  if (!trimmed) {
    throw new Error('Escribe o sube contenido para analizar habilidades.');
  }

  if (hasBackendSession()) {
    try {
      const res = await profileApi.suggestSkillsFromText(trimmed);
      const payloads = res.skills ?? (res.suggestions ?? []).map((name) => ({ name }));
      if (payloads.length > 0) {
        return { skills: payloadsToUiSkills(payloads), source: 'api' };
      }
    } catch (err) {
      if (err instanceof ApiError && (err.status === 400 || err.status === 422)) {
        throw err;
      }
    }
  }

  const skills = extractSkillsHeuristic(trimmed);
  if (skills.length === 0) {
    throw new Error(
      'No se detectaron habilidades en el texto. Menciona tecnologías, herramientas o competencias de forma explícita (ej. Java, React, liderazgo).'
    );
  }

  return { skills, source: 'heuristic' };
}

export async function parseAvailabilityFromInput(
  text: string
): Promise<{ availability: ApiAvailabilityDay[]; source: 'api' | 'heuristic' }> {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error('Ingresa una descripción de tu disponibilidad para analizarla.');
  }

  if (hasBackendSession()) {
    try {
      const result = await profileApi.parseAvailability(trimmed);
      if (result.availability?.length > 0) {
        return { availability: result.availability, source: 'api' };
      }
    } catch (err) {
      if (err instanceof ApiError && (err.status === 400 || err.status === 422)) {
        throw err;
      }
    }
  }

  const availability = parseAvailabilityHeuristic(trimmed);
  if (availability.length === 0) {
    throw new Error(
      'No se pudo interpretar la disponibilidad. Prueba con días y horarios explícitos (ej. Lunes 9-11 y miércoles 18-20).'
    );
  }

  return { availability, source: 'heuristic' };
}
