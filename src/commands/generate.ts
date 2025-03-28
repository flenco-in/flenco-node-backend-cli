#!/usr/bin/env node
import inquirer from 'inquirer';
import { generateRoute } from '../routes/route.generator';
import { generateController } from '../controllers/controller.generator';
import { generateService } from '../services/service.generator';
import { getTableFields, promptTableSelection } from '../utils/schema.utils';
import { promises as fs } from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { generatePostmanCollection } from '../utils/postman.generator';

const execAsync = promisify(exec);


async function getTables(): Promise<string[]> {
  try {
    const schemaContent = await fs.readFile('prisma/schema.prisma', 'utf8');
    const models = schemaContent
      .match(/model\s+(\w+)\s+{/g)
      ?.map(model => model.split(/\s+/)[1]) || [];

    if (models.length === 0) {
      throw new Error('No tables found in the database schema');
    }

    return models;
  } catch (error) {
    console.error('Error reading schema:', error);
    throw new Error('Failed to read schema file');
  }
}

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

    // Run Prisma commands first
    console.log('🔄 Introspecting database schema...');
    await execAsync('npx prisma db pull');
    console.log('✅ Database schema introspected');

    console.log('🔄 Generating Prisma Client...');
    await execAsync('npx prisma generate');
    console.log('✅ Prisma Client generated');

    // Get available tables
    const tables = await getTables();

    // Let user select table
    const { tableName } = await inquirer.prompt([
      {
        type: 'list',
        name: 'tableName',
        message: 'Select a table to generate API for:',
        choices: tables
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
    
    // Update Postman collection
    console.log('\n🔄 Updating Postman collection...');
    
    // Get project name from package.json
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
    const projectName = packageJson.name || 'api';
    
    const postmanPath = await generatePostmanCollection(projectName);
    console.log(`✅ Postman collection updated at: ${postmanPath}`);
    console.log('   Using a single, unified collection file for all your APIs');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

generateTableAPI();