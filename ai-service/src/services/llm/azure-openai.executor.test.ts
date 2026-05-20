import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { executeWithAzureOpenAIFallback } from './azure-openai.executor.js';
import { createEmptyMatchmakingResult } from './azure-openai.fallbacks.js';

describe('executeWithAzureOpenAIFallback', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('devuelve el resultado cuando la llamada a Azure tiene éxito', async () => {
    const result = await executeWithAzureOpenAIFallback({
      operation: 'test-exito',
      fallback: () => createEmptyMatchmakingResult('proyecto-fallback'),
      execute: async () => ({
        projectId: 'proyecto-1',
        proposals: [{ proposalId: 'p1' } as never],
        generatedAt: '2026-05-18T00:00:00.000Z',
      }),
    });

    expect(result.projectId).toBe('proyecto-1');
    expect(result.proposals).toHaveLength(1);
  });

  it('devuelve estructura vacía cuando la API de Azure falla', async () => {
    const result = await executeWithAzureOpenAIFallback({
      operation: 'test-fallo-api',
      fallback: () => createEmptyMatchmakingResult('proyecto-2'),
      execute: async () => {
        throw new Error('Quota exceeded');
      },
    });

    // `generatedAt` sale de `new Date()` en el fallback: no comparar igualdad estricta entre dos instantes.
    expect(result).toMatchObject({ projectId: 'proyecto-2', proposals: [] });
    expect(result.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    expect(console.error).toHaveBeenCalled();
  });

  it('devuelve estructura vacía cuando se supera el timeout', async () => {
    const result = await executeWithAzureOpenAIFallback({
      operation: 'test-timeout',
      fallback: () => createEmptyMatchmakingResult('proyecto-3'),
      execute: async () => {
        throw new DOMException('La operación superó el tiempo de espera.', 'TimeoutError');
      },
    });

    expect(result.proposals).toEqual([]);
    expect(console.error).toHaveBeenCalled();
  });

  it('devuelve fallback cuando isValid rechaza la respuesta', async () => {
    const result = await executeWithAzureOpenAIFallback({
      operation: 'test-respuesta-invalida',
      fallback: () => createEmptyMatchmakingResult('proyecto-4'),
      isValid: () => false,
      execute: async () => ({
        projectId: 'proyecto-4',
        proposals: [],
        generatedAt: '2026-05-18T00:00:00.000Z',
      }),
    });

    expect(result.proposals).toEqual([]);
  });
});
