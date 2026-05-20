/** Error cuando Azure OpenAI no está disponible o la respuesta no es utilizable. */
export class AzureOpenAIUnavailableError extends Error {
  public constructor(message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = 'AzureOpenAIUnavailableError';
    if (options?.cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = options.cause;
    }
  }
}
