// src/controllers/controller.generator.ts
import { promises as fs } from 'fs';
import path from 'path';

export async function generateController(tableName: string) {
  const controllerContent = `
import { BaseController } from './base.controller';
import { ${tableName}Service } from '../services/${tableName.toLowerCase()}.service';

export class ${tableName}Controller extends BaseController {
  private service: ${tableName}Service;

  constructor() {
    super('${tableName.toLowerCase()}');
    this.service = new ${tableName}Service();
  }
  
  // Add custom controller methods here
}
`;

  const filePath = path.join(process.cwd(), 'src', 'controllers', `${tableName.toLowerCase()}.controller.ts`);
  await fs.writeFile(filePath, controllerContent);
}