import { promises as fs } from 'fs';
import path from 'path';

export async function generateValidationFiles(): Promise<void> {
  // Generate base validation
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
}`;

  // Generate common validation
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
});`;

  // Generate async middleware
  const asyncMiddleware = `
import { Request, Response, NextFunction } from 'express';

type AsyncFunction = (req: Request, res: Response, next: NextFunction) => Promise<any>;

export const catchAsync = (fn: AsyncFunction) => {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
};`;

  // Create the files
  await fs.writeFile(
    path.join(process.cwd(), 'src', 'validation', 'base.validation.ts'),
    baseValidation
  );

  await fs.writeFile(
    path.join(process.cwd(), 'src', 'validation', 'common.validation.ts'),
    commonValidation
  );

  await fs.writeFile(
    path.join(process.cwd(), 'src', 'middleware', 'async.middleware.ts'),
    asyncMiddleware
  );
}