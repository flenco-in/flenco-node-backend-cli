// In your middleware.generator.ts, add the upload middleware generation

import { promises as fs } from 'fs';
import path from 'path';

async function generateMiddleware(): Promise<void> {
  // Previous middleware definitions remain the same...

  // Upload Utility
  const uploadUtil = `
import multer from 'multer';
import path from 'path';
import { Request } from 'express';
import { AppError } from '../middleware/error.middleware';

export class UploadUtil {
  private static storage = multer.diskStorage({
    destination: (req: Request, file: Express.Multer.File, cb) => {
      cb(null, 'uploads/');
    },
    filename: (req: Request, file: Express.Multer.File, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
  });

  private static fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedMimes = process.env.ALLOWED_FILE_TYPES?.split(',') || 
      ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError('Invalid file type', 400));
    }
  };

  static upload = multer({
    storage: this.storage,
    fileFilter: this.fileFilter,
    limits: {
      fileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880') // 5MB default
    }
  });
}`;

  // Upload Middleware
  const uploadMiddleware = `
import { Request, Response, NextFunction } from 'express';
import { UploadUtil } from '../utils/upload.util';

export const uploadFile = (fieldName: string) => {
  return UploadUtil.upload.single(fieldName);
};

export const uploadFiles = (fieldName: string, maxCount: number = 5) => {
  return UploadUtil.upload.array(fieldName, maxCount);
};`;

  // Create directories if they don't exist
  const middlewareDir = path.join(process.cwd(), 'src', 'middleware');
  const utilsDir = path.join(process.cwd(), 'src', 'utils');
  const uploadsDir = path.join(process.cwd(), 'uploads');

  await Promise.all([
    fs.mkdir(middlewareDir, { recursive: true }),
    fs.mkdir(utilsDir, { recursive: true }),
    fs.mkdir(uploadsDir, { recursive: true })
  ]);

  // Write all files
  await Promise.all([
    fs.writeFile(path.join(utilsDir, 'upload.util.ts'), uploadUtil),
    fs.writeFile(path.join(middlewareDir, 'upload.middleware.ts'), uploadMiddleware),
  ]);
}

export { generateMiddleware };