import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/error.middleware';
import { ResponseUtil } from '../utils/response.util';

export class BaseController {
  protected model: string;
  protected prisma: PrismaClient;

  constructor(model: string) {
    this.model = model;
    this.prisma = new PrismaClient();
  }

  getAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      const [data, total] = await Promise.all([
        (this.prisma[this.model as keyof PrismaClient] as any).findMany({
          skip,
          take: limit,
          orderBy: req.query.sortBy 
            ? { [req.query.sortBy as string]: req.query.sortOrder || 'asc' }
            : undefined,
        }),
        (this.prisma[this.model as keyof PrismaClient] as any).count(),
      ]);

      return ResponseUtil.paginate(res, data, page, limit, total);
    } catch (error) {
      next(error);
    }
  };

  getOne = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = Number(req.params.id);
      const item = await (this.prisma[this.model as keyof PrismaClient] as any).findUnique({
        where: { id },
      });

      if (!item) {
        throw new AppError('Item not found', 404);
      }

      return ResponseUtil.success(res, item);
    } catch (error) {
      next(error);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const item = await (this.prisma[this.model as keyof PrismaClient] as any).create({
        data: req.body,
      });

      return ResponseUtil.success(res, item, 201);
    } catch (error) {
      next(error);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = Number(req.params.id);
      const item = await (this.prisma[this.model as keyof PrismaClient] as any).update({
        where: { id },
        data: req.body,
      });

      return ResponseUtil.success(res, item);
    } catch (error) {
      next(error);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = Number(req.params.id);
      await (this.prisma[this.model as keyof PrismaClient] as any).delete({
        where: { id },
      });

      return ResponseUtil.success(res, null, 204);
    } catch (error) {
      next(error);
    }
  };
}