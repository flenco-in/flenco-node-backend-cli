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