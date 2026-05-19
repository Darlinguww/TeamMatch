/**
 * Límites de procesamiento del ai-service (RNF1: timeout ≤ 20 s en llamadas IA).
 */
const DEFAULT_AZURE_TIMEOUT_MS = 20_000;
const DEFAULT_MAX_FILE_SIZE_MB = 5;

function readPositiveInt(raw: string | undefined, fallback: number): number {
  if (!raw?.trim()) {
    return fallback;
  }

  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/** Tamaño máximo en bytes para documentos PDF/TXT enviados a Azure OpenAI */
export function getMaxFileSizeBytes(): number {
  return readPositiveInt(process.env.MAX_FILE_SIZE_MB, DEFAULT_MAX_FILE_SIZE_MB) * 1024 * 1024;
}

/** Tamaño máximo en MB (mensajes al usuario) */
export function getMaxFileSizeMb(): number {
  return readPositiveInt(process.env.MAX_FILE_SIZE_MB, DEFAULT_MAX_FILE_SIZE_MB);
}

/** Timeout explícito por llamada a Azure OpenAI en milisegundos (RNF1: 20 s) */
export function getAzureTimeoutMs(): number {
  return readPositiveInt(process.env.PROCESSING_TIMEOUT_MS, DEFAULT_AZURE_TIMEOUT_MS);
}

/** @deprecated Usar getters; se mantiene por compatibilidad interna */
export const processingConfig = {
  get maxFileSizeBytes(): number {
    return getMaxFileSizeBytes();
  },
  get maxFileSizeMb(): number {
    return getMaxFileSizeMb();
  },
  get azureTimeoutMs(): number {
    return getAzureTimeoutMs();
  },
};
