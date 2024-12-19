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
      next(error);
    }
  };
};
`;

  // Write files
  await Promise.all([
    fs.writeFile(path.join(process.cwd(), 'src', 'middleware', 'auth.middleware.ts'), authMiddleware),
    fs.writeFile(path.join(process.cwd(), 'src', 'middleware', 'error.middleware.ts'), errorMiddleware),
    fs.writeFile(path.join(process.cwd(), 'src', 'middleware', 'validate.middleware.ts'), validateMiddleware)
  ]);
}

export { generateMiddleware };