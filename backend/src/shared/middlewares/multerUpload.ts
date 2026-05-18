import { randomUUID } from 'crypto';
import { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { fileTypeFromBuffer } from 'file-type';
import { BadRequestError } from '../errors/HttpErrors.js';

const MAX_FILE_BYTES = 4 * 1024 * 1024; // 4 MB

const storage = multer.memoryStorage();

function pdfFileFilter(_req: unknown, file: Express.Multer.File, cb: multer.FileFilterCallback): void {
  if (!file) {
    cb(null, true);
    return;
  }

  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(null, false);
  }
}

export interface UploadedPdfFile extends Express.Multer.File {
  fileId?: string;
}

export async function validatePdfFile(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const file = (req as Request & { file?: UploadedPdfFile }).file;

  if (!file) {
    next();
    return;
  }

  const detectedType = await fileTypeFromBuffer(file.buffer);

  if (!detectedType || detectedType.mime !== 'application/pdf' || detectedType.ext !== 'pdf') {
    next(new BadRequestError('Invalid PDF file'));
    return;
  }

  const fileId = randomUUID();
  file.fileId = fileId;
  file.originalname = `${fileId}.pdf`;
  next();
}

const uploadSingleFile = multer({
  storage,
  limits: { fileSize: MAX_FILE_BYTES },
  fileFilter: pdfFileFilter
}).single('file');

export { uploadSingleFile };
export default uploadSingleFile;
