import jwt from 'jsonwebtoken';
import { AppError } from '../middleware/error.middleware';

export class JWTUtil {
  private static readonly SECRET_KEY = process.env.JWT_SECRET || 'your-secret-key';
  private static readonly EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d';

  static generateToken(payload: any): string {
    try {
      return jwt.sign(
        payload, 
        this.SECRET_KEY
      );
    } catch (error) {
      throw new Error(`Failed to generate token: ${error}`);
    }
  }

  static verifyToken(token: string): any {
    try {
      return jwt.verify(token, this.SECRET_KEY);
    } catch (error) {
      throw new AppError('Invalid token', 401);
    }
  }
}
