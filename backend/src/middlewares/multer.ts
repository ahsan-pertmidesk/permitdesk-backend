import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import { Request } from 'express';
import { randomBytes } from 'crypto';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const allowedFileTypes = /jpeg|jpg|png|gif|mp4|mov|svg|mkv|pdf|doc|docx|xls|xlsx|txt|csv/;

const fileType = (
  file: Express.Multer.File,
  cb: FileFilterCallback
): void => {
  const extname = allowedFileTypes.test(
    path.extname(file.originalname).toLowerCase()
  );
  const mimetype = allowedFileTypes.test(file.mimetype);

  if (mimetype && extname) {
    cb(null, true);
  } else {
    cb(new Error('File type not allowed') as any, false);
  }
};

export const fileUploader = (
  fieldName: string,
  destination: string
) => {
  return multer({
    storage: multer.diskStorage({
      destination: (req: Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
        // Use absolute path to ensure directory is created correctly
        const dir = join('/tmp', destination);   // ✅ absolute
        // Create directory if it doesn't exist
        if (!existsSync(dir)) {
          mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
      },
      filename: (req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
        // Generate random strings using crypto instead of randomstring
        const p1 = randomBytes(6).toString('hex');
        const p2 = randomBytes(6).toString('hex');
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `${file.fieldname}_${p1}${p2}${ext}`);
      },
    }),
    fileFilter: (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
      fileType(file, cb);
    },
  }).single(fieldName);
};
