// src/utils/schema.utils.ts
import { promises as fs } from 'fs';
import path from 'path';

export async function getTableFields(tableName: string): Promise<Array<{ name: string; type: string; isRequired: boolean }>> {
  try {
    const schemaContent = await fs.readFile('prisma/schema.prisma', 'utf8');
    const modelMatch = schemaContent.match(new RegExp(`model\\s+${tableName}\\s+{([^}]+)}`));
    
    if (!modelMatch) {
      throw new Error(`Model ${tableName} not found in schema`);
    }

    const fieldLines = modelMatch[1].trim().split('\n');
    return fieldLines
      .map(line => {
        const parts = line.trim().split(/\s+/);
        if (parts.length < 2) return null;

        return {
          name: parts[0],
          type: mapPrismaTypeToGeneratorType(parts[1]),
          isRequired: !line.includes('?')
        };
      })
      .filter((field): field is { name: string; type: string; isRequired: boolean } => 
        field !== null && !field.name.startsWith('@')
      );
  } catch (error) {
    console.error('Error reading schema:', error);
    throw new Error('Failed to read schema file');
  }
}

function mapPrismaTypeToGeneratorType(prismaType: string): string {
  const typeMap: { [key: string]: string } = {
    'String': 'string',
    'Int': 'number',
    'Float': 'number',
    'Boolean': 'boolean',
    'DateTime': 'date',
    'Json': 'object'
  };

  return typeMap[prismaType] || 'string';
}

export async function promptTableSelection(): Promise<string> {
  try {
    const schemaContent = await fs.readFile('prisma/schema.prisma', 'utf8');
    const models = schemaContent
      .match(/model\s+(\w+)\s+{/g)
      ?.map(model => model.split(/\s+/)[1]) || [];

    if (models.length === 0) {
      throw new Error('No tables found in the database schema');
    }

    return models[0]; // For now returning first model, you'll need to implement actual selection logic
  } catch (error) {
    console.error('Error reading schema:', error);
    throw new Error('Failed to read schema file');
  }
}