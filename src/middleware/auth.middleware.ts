
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
