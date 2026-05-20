import { randomUUID } from 'crypto';
import { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { fileTypeFromBuffer } from 'file-type';
import { BadRequestError } from '../errors/HttpErrors.js';

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB

const storage = multer.memoryStorage();

function pdfFileFilter(_req: unknown, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  if (!file) {
    cb(null, true);
    return;
  }

  const name = (file.originalname ?? '').toLowerCase();
  const isPdfMime = file.mimetype === 'application/pdf' || file.mimetype === 'application/x-pdf';
  const isPdfExt = name.endsWith('.pdf');

  if (isPdfMime || isPdfExt) {
    cb(null, true);
  } else {
    cb(null, false);
  }
}

async function validatePdfFile(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const file = (req as Request & { file?: Express.Multer.File }).file;

  if (!file) {
    next();
    return;
  }

  const name = (file.originalname ?? '').toLowerCase();
  const declaredPdf =
    file.mimetype === 'application/pdf' ||
    file.mimetype === 'application/x-pdf' ||
    name.endsWith('.pdf');

  if (!declaredPdf) {
    next(new BadRequestError('Solo se permiten archivos PDF'));
    return;
  }

  try {
    const fileType = await fileTypeFromBuffer(file.buffer);
    if (fileType && fileType.mime !== 'application/pdf' && fileType.ext !== 'pdf') {
      console.warn('[multer] PDF magic bytes mismatch, accepting by extension/mimetype');
    }
  } catch {
    /* allow if mimetype/extension already PDF */
  }

  const fileId = randomUUID();
  (file as Express.Multer.File & { fileId?: string }).fileId = fileId;
  file.originalname = `${fileId}.pdf`;
  next();
}

const uploadSingleFile = multer({
  storage,
  limits: { fileSize: MAX_FILE_BYTES },
  fileFilter: pdfFileFilter,
}).single('file');

export { validatePdfFile, uploadSingleFile };
export default uploadSingleFile;
