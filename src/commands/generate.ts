#!/usr/bin/env node
import inquirer from 'inquirer';
import { generateRoute } from '../routes/route.generator';
import { generateController } from '../controllers/controller.generator';
import { generateService } from '../services/service.generator';
import { getTableFields, promptTableSelection } from '../utils/schema.utils';
import { promises as fs } from 'fs';
import path from 'path';

interface GenerateOptions {
  tableName: string;
  fields: Array<{ name: string; type: string; isRequired: boolean }>;
  requiresAuth: boolean;
  hasFileUploads: boolean;
}


async function generateComponents(options: GenerateOptions) {
  const { tableName, fields, requiresAuth, hasFileUploads } = options;
  
  try {
    // Pass objects to all generators to maintain consistency
    await Promise.all([
      generateService({ tableName }),
      generateRoute({ tableName, fields, requiresAuth, hasFileUploads }),
      generateController({ tableName })
    ]);

    // Add route to routes/index.ts
    await updateRouteIndex(tableName);
  } catch (error) {
    console.error('Error generating components:', error);
    throw error;
  }
}

async function updateRouteIndex(tableName: string) {
  const routeIndexPath = path.join(process.cwd(), 'src', 'routes', 'index.ts');
  let content: string;

  try {
    content = await fs.readFile(routeIndexPath, 'utf8');
  } catch (error) {
    // Create initial content if file doesn't exist
    content = `import { Router } from 'express';\n\nconst router = Router();\n\nexport default router;\n`;
  }

  // Check if route import already exists
  if (!content.includes(`import ${tableName}Route`)) {
    // Split content into sections
    const lines = content.split('\n');
    const importLines: string[] = [];
    const routerLines: string[] = [];
    const otherLines: string[] = [];
    
    let importSection = true;
    let routerSection = false;

    for (const line of lines) {
      if (line.trim() === '') continue;
      
      if (line.includes('const router = Router()')) {
        importSection = false;
        routerSection = true;
      }
      
      if (importSection && line.startsWith('import')) {
        importLines.push(line);
      } else if (routerSection && line.includes('router.use(')) {
        routerLines.push(line);
      } else {
        otherLines.push(line);
      }
    }

    // Add new import
    const newImport = `import ${tableName}Route from './${tableName.toLowerCase()}.route';`;
    importLines.push(newImport);

    // Add new route
    const newRoute = `router.use('/${tableName.toLowerCase()}', ${tableName}Route);`;
    routerLines.push(newRoute);

    // Reconstruct the file
    const newContent = [
      ...importLines,
      '',
      'const router = Router();',
      '',
      ...routerLines,
      '',
      ...otherLines.filter(line => line.includes('export default'))
    ].join('\n');

    await fs.writeFile(routeIndexPath, newContent);
  }
}

async function isProjectInitialized(): Promise<boolean> {
  try {
    await fs.access(path.join(process.cwd(), 'package.json'));
    await fs.access(path.join(process.cwd(), 'prisma', 'schema.prisma'));
    return true;
  } catch {
    return false;
  }
}

async function generateTableAPI() {
  try {
    console.log('🚀 Flenco Backend Generator - API Generation');

    // Check if project is initialized
    if (!await isProjectInitialized()) {
      console.error('❌ Project is not initialized. Please run "flenco-init" first.');
      process.exit(1);
    }

    // Let user select table
    const { tableName } = await inquirer.prompt([
      {
        type: 'input',
        name: 'tableName',
        message: 'Enter the name of the table to generate API for:',
        validate: (input: string) => {
          if (input.trim().length === 0) {
            return 'Table name cannot be empty';
          }
          return true;
        }
      }
    ]);
    
    // Get table fields
    const fields = await getTableFields(tableName);

    // Ask for additional configuration
    const { requiresAuth } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'requiresAuth',
        message: 'Should this table require authentication for CRUD operations?',
        default: true
      }
    ]);

    const { hasFileUploads } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'hasFileUploads',
        message: 'Will this table need file upload capabilities?',
        default: false
      }
    ]);

    // Generate components
    await generateComponents({
      tableName,
      fields,
      requiresAuth,
      hasFileUploads
    });

    console.log(`\n✨ API for table "${tableName}" generated successfully!`);
    console.log('\nAvailable endpoints:');
    console.log(`GET    /api/${tableName}          - Get all records (with pagination)`);
    console.log(`GET    /api/${tableName}/:id      - Get single record`);
    console.log(`POST   /api/${tableName}          - Create new record`);
    console.log(`PATCH  /api/${tableName}/:id      - Update record`);
    console.log(`DELETE /api/${tableName}/:id      - Delete record`);
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

generateTableAPI();