import { aiConfig } from '../../config/ai.config.js';

export interface AzureOpenAIFailureContext {
  operation: string;
  endpoint?: string;
}

/**
 * Registra fallos de Azure OpenAI con tipo de error, endpoint y marca temporal.
 */
export function logAzureOpenAIFailure(
  context: AzureOpenAIFailureContext,
  error: unknown,
): void {
  const endpoint = context.endpoint ?? aiConfig.azureOpenAI.endpoint ?? 'no-configurado';
  const errorType = error instanceof Error ? error.name : 'ErrorDesconocido';
  const message = error instanceof Error ? error.message : String(error);
  const timestamp = new Date().toISOString();

  console.error(
    `[ai-service][AzureOpenAI] operación=${context.operation} tipo=${errorType} endpoint=${endpoint} timestamp=${timestamp} mensaje=${message}`,
  );
}
