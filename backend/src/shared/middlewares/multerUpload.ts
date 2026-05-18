import { randomUUID } from 'crypto';
import { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { fileTypeFromBuffer } from 'file-type';
import { BadRequestError } from '../errors/HttpErrors.js';

const MAX_FILE_BYTES = 4 * 1024 * 1024; // 4 MB

const storage = multer.memoryStorage();

function pdfFileFilter(_req: unknown, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  if (!file) return cb(null, true);

  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(null, false);
  }
}

async function validatePdfFile(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const file = (req as any).file as Express.Multer.File | undefined;

  if (!file) {
    next();
    return;
  }

  const fileType = await fileTypeFromBuffer(file.buffer);

  if (!fileType || fileType.mime !== 'application/pdf' || fileType.ext !== 'pdf') {
    next(new BadRequestError('Invalid PDF file'));
    return;
  }

  const fileId = randomUUID();
  (file as any).fileId = fileId;
  (file as any).originalname = `${fileId}.pdf`;
  next();
}

const uploadSingleFile = multer({ storage, limits: { fileSize: MAX_FILE_BYTES }, fileFilter: pdfFileFilter }).single('file');

export { validatePdfFile, uploadSingleFile };
export default uploadSingleFile;
