import { promises as fs } from 'fs';
import path from 'path';

async function generateMiddleware(): Promise<void> {
  // Auth Middleware
  const authMiddleware = `
import { Request, Response, NextFunction } from 'express';
import { JWTUtil } from '../utils/jwt.util';
import { AppError } from './error.middleware';

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

export const auth = () => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        throw new AppError('No token provided', 401);
      }

      const token = authHeader.split(' ')[1];
      const decoded = JWTUtil.verifyToken(token);
      req.user = decoded;

      next();
    } catch (error) {
      next(error);
    }
  };
};
`;

  // Error Middleware
  const errorMiddleware = `
import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  statusCode: number;
  status: string;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.status = \`\${statusCode}\`.startsWith('4') ? 'fail' : 'error';
    Error.captureStackTrace(this, this.constructor);
  }
}
`;

  // Validation Middleware
  const validateMiddleware = `
import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { AppError } from './error.middleware';

export const validate = (schema: AnyZodObject) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          status: 'error',
          message: 'Validation failed',
          errors: error.errors,
        });
      }
      next(new AppError('Invalid input', 400));
    }
  };
};
`;

  // Async Handler Middleware
  const asyncMiddleware = `
import { Request, Response, NextFunction } from 'express';
import { AppError } from './error.middleware';

type AsyncFunction = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<any>;

export const catchAsync = (fn: AsyncFunction) => {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch((error) => {
      if (error instanceof AppError) {
        next(error);
      } else {
        next(new AppError(error.message || 'Something went wrong', 500));
      }
    });
  };
};
`;

  // Base Validation
  const baseValidation = `
import { z } from 'zod';

export class BaseValidation {
  static generateCreateSchema(fields: Array<{ name: string; type: string; isRequired: boolean }>) {
    const schemaObject: { [key: string]: any } = {};
    
    fields.forEach(field => {
      let zodType;
      switch (field.type) {
        case 'string':
          zodType = z.string();
          break;
        case 'number':
          zodType = z.number();
          break;
        case 'boolean':
          zodType = z.boolean();
          break;
        case 'date':
          zodType = z.string().datetime();
          break;
        case 'object':
          zodType = z.object({}).passthrough();
          break;
        default:
          zodType = z.string();
      }
      
      schemaObject[field.name] = field.isRequired ? zodType : zodType.optional();
    });

    return z.object({
      body: z.object(schemaObject),
    });
  }

  static generateUpdateSchema(fields: Array<{ name: string; type: string; isRequired: boolean }>) {
    const createSchema = this.generateCreateSchema(fields);
    return z.object({
      params: z.object({
        id: z.string().transform(Number),
      }),
      body: createSchema.shape.body.partial(),
    });
  }

  static idParamSchema = z.object({
    params: z.object({
      id: z.string().transform(Number),
    }),
  });
}
`;

  // Common Validation
  const commonValidation = `
import { z } from 'zod';

export const paginationSchema = z.object({
  query: z.object({
    page: z.string().optional().transform(Number).default('1'),
    limit: z.string().optional().transform(Number).default('10'),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
    search: z.string().optional(),
    status: z.string().optional().transform(Number),
  }),
});
`;

  // Upload Utility
  const uploadUtilContent = `
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
  const uploadMiddlewareContent = `
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
  const validationDir = path.join(process.cwd(), 'src', 'validation');
  const utilsDir = path.join(process.cwd(), 'src', 'utils');

  await fs.mkdir(middlewareDir, { recursive: true });
  await fs.mkdir(validationDir, { recursive: true });

  // Write all files
  await Promise.all([
    fs.writeFile(path.join(middlewareDir, 'auth.middleware.ts'), authMiddleware),
    fs.writeFile(path.join(middlewareDir, 'error.middleware.ts'), errorMiddleware),
    fs.writeFile(path.join(middlewareDir, 'validate.middleware.ts'), validateMiddleware),
    fs.writeFile(path.join(middlewareDir, 'async.middleware.ts'), asyncMiddleware),
    fs.writeFile(path.join(validationDir, 'base.validation.ts'), baseValidation),
    fs.writeFile(path.join(validationDir, 'common.validation.ts'), commonValidation),
    fs.writeFile(path.join(utilsDir, 'upload.util.ts'), uploadUtilContent),
    fs.writeFile(path.join(middlewareDir, 'upload.middleware.ts'), uploadMiddlewareContent)
  ]);
}

export { generateMiddleware };