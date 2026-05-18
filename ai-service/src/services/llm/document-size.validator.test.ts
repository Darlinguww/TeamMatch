import { describe, expect, it } from 'vitest';
import {
  DocumentoDemasiadoGrandeError,
  validateDocumentSize,
  validateDocumentTextSize,
} from './document-size.validator.js';

describe('validateDocumentSize', () => {
  it('acepta documentos dentro del límite de 5 MB', () => {
    const content = Buffer.alloc(4 * 1024 * 1024);
    expect(() => validateDocumentSize(content)).not.toThrow();
  });

  it('rechaza documentos mayores a 5 MB con mensaje en español', () => {
    const oversized = Buffer.alloc(5 * 1024 * 1024 + 1);

    expect(() => validateDocumentSize(oversized)).toThrow(DocumentoDemasiadoGrandeError);
    expect(() => validateDocumentSize(oversized)).toThrow(
      /supera el tamaño máximo permitido de 5 MB/i,
    );
  });

  it('rechaza texto UTF-8 que excede el límite', () => {
    const hugeText = 'a'.repeat(5 * 1024 * 1024 + 1);
    expect(() => validateDocumentTextSize(hugeText)).toThrow(DocumentoDemasiadoGrandeError);
  });
});
