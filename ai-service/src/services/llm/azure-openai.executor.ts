import { getAzureTimeoutMs } from '../../config/processing.config.js';
import { aiConfig } from '../../config/ai.config.js';
import { logAzureOpenAIFailure, type AzureOpenAIFailureContext } from './azure-openai.logger.js';

export interface AzureOpenAIExecutorOptions<T> {
  /** Nombre de la operación (p. ej. matchmaking, skill-extraction) */
  operation: string;
  /** Función que ejecuta la llamada usando AbortSignal del timeout */
  execute: (signal: AbortSignal) => Promise<T>;
  /** Valor vacío tipado si la llamada falla o la respuesta es inválida */
  fallback: () => T;
  /** Valida el resultado; si devuelve false se usa fallback */
  isValid?: (result: T) => boolean;
}

/**
 * Ejecuta una llamada a Azure OpenAI con timeout (RNF1) y fallback tipado.
 * No relanza errores de red, cuota, timeout ni respuestas inválidas.
 */
export async function executeWithAzureOpenAIFallback<T>(
  options: AzureOpenAIExecutorOptions<T>,
): Promise<T> {
  const context: AzureOpenAIFailureContext = {
    operation: options.operation,
    endpoint: aiConfig.azureOpenAI.endpoint,
  };

  try {
    const signal = AbortSignal.timeout(getAzureTimeoutMs());
    const result = await options.execute(signal);

    if (options.isValid && !options.isValid(result)) {
      logAzureOpenAIFailure(context, new Error('Respuesta de Azure OpenAI inválida o vacía'));
      return options.fallback();
    }

    return result;
  } catch (error) {
    logAzureOpenAIFailure(context, error);
    return options.fallback();
  }
}
