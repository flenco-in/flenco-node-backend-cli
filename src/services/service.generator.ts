import { promises as fs } from 'fs';
import path from 'path';

export async function generateService(tableName: string) {
  const serviceContent = `
import { BaseService } from './base.service';

export class ${tableName}Service extends BaseService {
  constructor() {
    super('${tableName.toLowerCase()}');
  }
  
  // Add custom methods here
}
`;

  const filePath = path.join(process.cwd(), 'src', 'services', `${tableName.toLowerCase()}.service.ts`);
  await fs.writeFile(filePath, serviceContent);
}