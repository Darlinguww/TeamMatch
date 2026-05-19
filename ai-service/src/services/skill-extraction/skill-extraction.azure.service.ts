import { aiConfig } from '../../config/ai.config.js';
import { getAzureOpenAIClient } from '../llm/azure-openai.client.js';
import { executeWithAzureOpenAIFallback } from '../llm/azure-openai.executor.js';
import { createEmptySkillExtractionResult } from '../llm/azure-openai.fallbacks.js';
import type { SkillExtractionResult } from '../llm/azure-fallback.types.js';
import {
  validateDocumentSize,
  validateDocumentTextSize,
} from '../llm/document-size.validator.js';

const SKILL_EXTRACTION_SYSTEM_PROMPT = `
Eres un asistente de TeamMatch. Extrae habilidades, experiencia y disponibilidad del texto proporcionado.
Responde ÚNICAMENTE con JSON válido sin markdown:
{
  "skills": [{ "name": "string", "level": "string", "category": "string" }],
  "experience": [{ "role": "string", "years": 0, "description": "string" }],
  "availability": [{ "schedule": "string", "hoursPerWeek": 0 }]
}
`.trim();

/**
 * Extrae perfil estructurado desde texto plano vía Azure OpenAI (gpt-4.1-mini).
 * Ante fallo devuelve { skills: [], experience: [], availability: [] } para registro manual.
 */
export async function extractProfileFromText(text: string): Promise<SkillExtractionResult> {
  validateDocumentTextSize(text);
  return callAzureForSkillExtraction(text);
}

/**
 * Extrae perfil desde un documento PDF/TXT en memoria.
 * Valida tamaño antes de llamar a Azure; no almacena el archivo.
 *
 * @throws {DocumentoDemasiadoGrandeError} Si el buffer supera MAX_FILE_SIZE_MB
 */
export async function extractProfileFromDocument(
  content: Buffer,
  mimeType: string,
): Promise<SkillExtractionResult> {
  validateDocumentSize(content);

  const normalizedMime = mimeType.toLowerCase();
  if (normalizedMime === 'text/plain') {
    return extractProfileFromText(content.toString('utf8'));
  }

  if (normalizedMime === 'application/pdf') {
    const text = content.toString('utf8');
    validateDocumentTextSize(text);
    return callAzureForSkillExtraction(
      `Analiza el siguiente contenido extraído de un CV en PDF:\n\n${text}`,
    );
  }

  throw new Error('Tipo de documento no soportado. Solo se permiten PDF y TXT.');
}

async function callAzureForSkillExtraction(userContent: string): Promise<SkillExtractionResult> {
  const client = getAzureOpenAIClient();
  const { deploymentName } = aiConfig.azureOpenAI;

  return executeWithAzureOpenAIFallback({
    operation: 'skill-extraction',
    fallback: createEmptySkillExtractionResult,
    isValid: (result) =>
      Array.isArray(result.skills) &&
      Array.isArray(result.experience) &&
      Array.isArray(result.availability),
    execute: async (signal) => {
      const response = await client.chat.completions.create(
        {
          model: deploymentName,
          messages: [
            { role: 'system', content: SKILL_EXTRACTION_SYSTEM_PROMPT },
            { role: 'user', content: userContent },
          ],
          temperature: 0.2,
          max_tokens: 3000,
          response_format: { type: 'json_object' },
        },
        { signal },
      );

      const rawContent = response.choices[0]?.message?.content;
      if (!rawContent) {
        throw new Error('Azure OpenAI no retornó contenido en la respuesta');
      }

      const parsed = JSON.parse(rawContent) as SkillExtractionResult;
      return {
        skills: Array.isArray(parsed.skills) ? parsed.skills : [],
        experience: Array.isArray(parsed.experience) ? parsed.experience : [],
        availability: Array.isArray(parsed.availability) ? parsed.availability : [],
      };
    },
  });
}
