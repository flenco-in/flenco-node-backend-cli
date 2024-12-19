// src/services/service.generator.ts
import { promises as fs } from 'fs';
import path from 'path';

interface ServiceOptions {
  tableName: string;
}

export async function generateService({ tableName }: ServiceOptions): Promise<void> {
  const serviceContent = `
import { PrismaClient } from '@prisma/client';

export class ${tableName}Service {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async findAll(options: {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    // Add any filters you want
    search?: string;
    status?: number;
  }) {
    const { 
      page = 1, 
      limit = 10, 
      sortBy = 'id', 
      sortOrder = 'desc',
      search,
      status 
    } = options;
    
    const skip = (page - 1) * limit;

    // Build where condition
    const where: any = {};
    
    if (search) {
      where.OR = [
        // Add searchable fields
        // Example: { name: { contains: search } }
      ];
    }

    if (status !== undefined) {
      where.status = status;
    }

    const [data, total] = await Promise.all([
      this.prisma.${tableName.toLowerCase()}.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          [sortBy]: sortOrder
        }
      }),
      this.prisma.${tableName.toLowerCase()}.count({ where })
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages
      }
    };
  }

  async findById(id: number) {
    const item = await this.prisma.${tableName.toLowerCase()}.findUnique({
      where: { id }
    });

    if (!item) {
      throw new Error('${tableName} not found');
    }

    return item;
  }

  async create(data: any) {
    return this.prisma.${tableName.toLowerCase()}.create({
      data
    });
  }

  async update(id: number, data: any) {
    try {
      return await this.prisma.${tableName.toLowerCase()}.update({
        where: { id },
        data
      });
    } catch (error) {
      throw new Error('${tableName} not found');
    }
  }

  async delete(id: number) {
    try {
      await this.prisma.${tableName.toLowerCase()}.delete({
        where: { id }
      });
    } catch (error) {
      throw new Error('${tableName} not found');
    }
  }

  // Add custom methods here
  // Example: Status update method
  async updateStatus(id: number, status: number) {
    return this.update(id, { status });
  }

  // Example: Bulk operations
  async bulkDelete(ids: number[]) {
    return this.prisma.${tableName.toLowerCase()}.deleteMany({
      where: {
        id: { in: ids }
      }
    });
  }
}
`;

  const filePath = path.join(process.cwd(), 'src', 'services', `${tableName.toLowerCase()}.service.ts`);
  await fs.writeFile(filePath, serviceContent);
}