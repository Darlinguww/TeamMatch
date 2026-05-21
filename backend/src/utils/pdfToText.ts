import { randomUUID } from 'crypto';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { createWorker, type Worker } from 'tesseract.js';

const MIN_EXTRACTED_CHARS = 50;
const EXTRACTION_ERROR =
  'Could not extract text from PDF: document may be corrupted or contain only unsupported content';

type PdfTextResult = {
  text?: string;
  pages?: Array<{ text?: string }>;
};

type PdfParser = {
  getText: () => Promise<PdfTextResult>;
  destroy?: () => Promise<void>;
};

type PdfParseModule = {
  default?: (buffer: Buffer) => Promise<{ text: string }>;
  PDFParse?: new (opts: { data: Buffer }) => PdfParser;
};

function cleanupText(raw: string): string {
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/\s*--\s*\d+\s+of\s+\d+\s*--\s*/gi, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function textFromPdfParseResult(result: PdfTextResult | { text: string }): string {
  if (typeof result.text === 'string' && result.text.trim()) {
    return cleanupText(result.text);
  }

  if ('pages' in result && Array.isArray(result.pages)) {
    const fromPages = result.pages
      .map((page) => (typeof page?.text === 'string' ? page.text.trim() : ''))
      .filter(Boolean)
      .join('\n');

    if (fromPages) {
      return cleanupText(fromPages);
    }
  }

  return '';
}

async function extractDigitalText(buffer: Buffer): Promise<string> {
  const pdfParseModule = (await import('pdf-parse')) as unknown as PdfParseModule;

  if (pdfParseModule.PDFParse) {
    const parser = new pdfParseModule.PDFParse({ data: buffer });

    try {
      const textResult = await parser.getText();
      const text = textFromPdfParseResult(textResult);
      if (text) return text;
    } finally {
      if (typeof parser.destroy === 'function') {
        await parser.destroy().catch(() => undefined);
      }
    }
  }

  const legacyParser =
    pdfParseModule.default ??
    (pdfParseModule as unknown as (data: Buffer) => Promise<{ text: string }>);

  if (typeof legacyParser === 'function') {
    const legacyResult = await legacyParser(buffer);
    return textFromPdfParseResult(legacyResult);
  }

  return '';
}

async function recognizePageImage(worker: Worker, image: Buffer | string): Promise<string> {
  const { data } = await worker.recognize(image);
  return typeof data.text === 'string' ? data.text : '';
}

async function extractTextWithOcr(pdfPath: string, imageDir: string): Promise<string> {
  const { fromPath } = await import('pdf2pic');

  const convertOptions = {
    density: 200,
    saveFilename: 'page',
    savePath: imageDir,
    format: 'png' as const,
    width: 2480,
    height: 3508,
  };

  const converter = fromPath(pdfPath, convertOptions);

  const pages = await converter.bulk(-1, { responseType: 'buffer' });
  const orderedPages = [...pages].sort((left, right) => (left.page ?? 0) - (right.page ?? 0));

  if (orderedPages.length === 0) {
    return '';
  }

  const worker = await createWorker('eng+spa');
  const pageTexts: string[] = [];

  try {
    for (const page of orderedPages) {
      if ('buffer' in page && page.buffer && page.buffer.length > 0) {
        pageTexts.push(await recognizePageImage(worker, page.buffer));
        continue;
      }

      if ('path' in page && typeof page.path === 'string' && page.path.length > 0) {
        pageTexts.push(await recognizePageImage(worker, page.path));
      }
    }
  } finally {
    await worker.terminate();
  }

  return cleanupText(pageTexts.filter(Boolean).join('\n\n'));
}

async function removeWorkDir(workDir: string): Promise<void> {
  await fs.rm(workDir, { recursive: true, force: true }).catch(() => undefined);
}

/**
 * Convierte un PDF (ruta o buffer) a texto plano.
 * 1) Extracción digital con pdf-parse
 * 2) OCR con pdf2pic + tesseract.js si el texto es insuficiente
 */
export async function convertPdfToText(input: Buffer | string): Promise<string> {
  const inputBytes =
    typeof input === 'string' ? (await fs.stat(input)).size : input.length;

  let buffer: Buffer;
  let pdfPath: string | null = null;
  let workDir: string | null = null;

  if (typeof input === 'string') {
    buffer = await fs.readFile(input);
    pdfPath = input;
  } else {
    buffer = input;
  }

  try {
    const digitalText = await extractDigitalText(buffer);

    if (digitalText.length >= MIN_EXTRACTED_CHARS) {
      console.info(
        `[pdfToText] method=digital inputBytes=${inputBytes} extractedChars=${digitalText.length}`
      );
      return digitalText;
    }

    console.info(
      `[pdfToText] digital text too short (${digitalText.length} chars), trying OCR inputBytes=${inputBytes}`
    );

    workDir = path.join(os.tmpdir(), `teammatch-pdf-${randomUUID()}`);
    const imageDir = path.join(workDir, 'pages');
    await fs.mkdir(imageDir, { recursive: true });

    if (!pdfPath) {
      pdfPath = path.join(workDir, 'document.pdf');
      await fs.writeFile(pdfPath, buffer);
    }

    const ocrText = await extractTextWithOcr(pdfPath, imageDir);
    const mergedText = cleanupText([digitalText, ocrText].filter(Boolean).join('\n\n'));

    if (mergedText.length >= MIN_EXTRACTED_CHARS) {
      console.info(
        `[pdfToText] method=ocr inputBytes=${inputBytes} extractedChars=${mergedText.length}`
      );
      return mergedText;
    }

    throw new Error(EXTRACTION_ERROR);
  } catch (error) {
    if (error instanceof Error && error.message === EXTRACTION_ERROR) {
      throw error;
    }

    console.error('[pdfToText] extraction failed', error);
    throw new Error(EXTRACTION_ERROR);
  } finally {
    if (workDir) {
      await removeWorkDir(workDir);
    }
  }
}
