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
      const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
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
        fileSize: 5 * 1024 * 1024, // 5MB
      }
    });
  }