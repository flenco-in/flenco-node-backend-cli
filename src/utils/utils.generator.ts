// src/utils/utils.generator.ts
import { promises as fs } from 'fs';
import path from 'path';

async function generateUtils(): Promise<void> {
  // JWT Utility
  const jwtUtil = `
import jwt from 'jsonwebtoken';
import { AppError } from '../middleware/error.middleware';

export class JWTUtil {
  private static readonly SECRET_KEY = process.env.JWT_SECRET || 'your-secret-key';
  private static readonly EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d';

  static generateToken(payload: any): string {
    return jwt.sign(payload, this.SECRET_KEY, {
      expiresIn: this.EXPIRES_IN,
    });
  }

  static verifyToken(token: string): any {
    try {
      return jwt.verify(token, this.SECRET_KEY);
    } catch (error) {
      throw new AppError('Invalid token', 401);
    }
  }
}
`;

  // Response Utility
  const responseUtil = `
import { Response } from 'express';

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
    totalItems: number;
  };
}

export class ResponseUtil {
  static success<T>(res: Response, data: T, statusCode = 200) {
    return res.status(statusCode).json({
      status: 'success',
      data
    });
  }

  static error(res: Response, message: string, statusCode = 500) {
    return res.status(statusCode).json({
      status: 'error',
      message
    });
  }

  static paginate<T>(
    res: Response,
    data: T[],
    page: number,
    limit: number,
    total: number
  ) {
    const totalPages = Math.ceil(total / limit);

    return res.status(200).json({
      status: 'success',
      data,
      pagination: {
        page,
        limit,
        totalPages,
        totalItems: total
      }
    });
  }
}
`;

  // Write files
  const utilsDir = path.join(process.cwd(), 'src', 'utils');
  await Promise.all([
    fs.writeFile(path.join(utilsDir, 'jwt.util.ts'), jwtUtil),
    fs.writeFile(path.join(utilsDir, 'response.util.ts'), responseUtil)
  ]);
}

export { generateUtils };