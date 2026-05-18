import multer from 'multer';

const MAX_FILE_BYTES = 4 * 1024 * 1024; // 4 MB

const storage = multer.memoryStorage();

function pdfFileFilter(_req: unknown, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  if (!file) return cb(null, true);

  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    // reject non-pdf files silently (no file will be available)
    cb(null, false);
  }
}

const upload = multer({ storage, limits: { fileSize: MAX_FILE_BYTES }, fileFilter: pdfFileFilter });

export default upload.single('file');
