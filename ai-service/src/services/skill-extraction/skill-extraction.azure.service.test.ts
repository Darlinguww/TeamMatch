import { describe, expect, it } from 'vitest';
import { extractProfileFromDocument } from './skill-extraction.azure.service.js';
import { DocumentoDemasiadoGrandeError } from '../llm/document-size.validator.js';

describe('extractProfileFromDocument', () => {
  it('rechaza documentos mayores a 5 MB antes de llamar a Azure', async () => {
    const oversized = Buffer.alloc(5 * 1024 * 1024 + 1);

    await expect(
      extractProfileFromDocument(oversized, 'application/pdf'),
    ).rejects.toBeInstanceOf(DocumentoDemasiadoGrandeError);
  });
});
