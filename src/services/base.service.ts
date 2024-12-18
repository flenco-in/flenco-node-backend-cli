import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/error.middleware';

export class BaseService {
  protected model: string;
  protected prisma: PrismaClient;

  constructor(model: string) {
    this.model = model;
    this.prisma = new PrismaClient();
  }

  async findAll(options: {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const { page = 1, limit = 10, sortBy, sortOrder = 'asc' } = options;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      (this.prisma[this.model as keyof PrismaClient] as any).findMany({
        skip,
        take: limit,
        orderBy: sortBy ? { [sortBy]: sortOrder } : undefined,
      }),
      (this.prisma[this.model as keyof PrismaClient] as any).count(),
    ]);

    return { data, total };
  }

  async findById(id: number) {
    const item = await (this.prisma[this.model as keyof PrismaClient] as any).findUnique({
      where: { id },
    });

    if (!item) {
      throw new AppError('Item not found', 404);
    }

    return item;
  }

  async create(data: any) {
    return (this.prisma[this.model as keyof PrismaClient] as any).create({
      data,
    });
  }

  async update(id: number, data: any) {
    try {
      return await (this.prisma[this.model as keyof PrismaClient] as any).update({
        where: { id },
        data,
      });
    } catch (error) {
      throw new AppError('Item not found', 404);
    }
  }

  async delete(id: number) {
    try {
      await (this.prisma[this.model as keyof PrismaClient] as any).delete({
        where: { id },
      });
    } catch (error) {
      throw new AppError('Item not found', 404);
    }
  }
}