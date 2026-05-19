import { getMaxFileSizeBytes, getMaxFileSizeMb } from '../../config/processing.config.js';

/**
 * Error de validación cuando un PDF/TXT supera el límite configurado.
 * Debe mapearse a HTTP 400 para mostrarse en el frontend.
 */
export class DocumentoDemasiadoGrandeError extends Error {
  public readonly statusCode = 400;

  public constructor(maxSizeMb: number) {
    super(
      `El documento supera el tamaño máximo permitido de ${maxSizeMb} MB. ` +
        'Reduce el archivo o ingresa las habilidades manualmente.',
    );
    this.name = 'DocumentoDemasiadoGrandeError';
  }
}

/**
 * Valida el tamaño de un documento (buffer en memoria) antes de enviarlo a Azure OpenAI.
 *
 * @param content - Contenido del archivo PDF o TXT
 * @throws {DocumentoDemasiadoGrandeError} Si supera `MAX_FILE_SIZE_MB`
 */
export function validateDocumentSize(content: Buffer | Uint8Array): void {
  const byteLength = content.byteLength;

  if (byteLength > getMaxFileSizeBytes()) {
    throw new DocumentoDemasiadoGrandeError(getMaxFileSizeMb());
  }
}

/**
 * Valida tamaño a partir de texto plano extraído de un TXT o PDF.
 *
 * @param text - Texto del documento
 * @throws {DocumentoDemasiadoGrandeError} Si el UTF-8 del texto supera el límite
 */
export function validateDocumentTextSize(text: string): void {
  validateDocumentSize(Buffer.from(text, 'utf8'));
}
