#!/usr/bin/env node
import inquirer from 'inquirer';
import { promises as fs } from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { generateRoute } from '../routes/route.generator';
import { generateController } from '../controllers/controller.generator';
import { generateService } from '../services/service.generator';
import { getTableFields } from '../utils/schema.utils';

const execAsync = promisify(exec);

// Track created APIs to compare with schema
interface TableApiInfo {
  tableName: string;
  routePath: string;
  controllerPath: string;
  servicePath: string;
  fields: Array<{ name: string; type: string; isRequired: boolean }>;
  requiresAuth: boolean;
  hasFileUploads: boolean;
}

async function getExistingTableApis(): Promise<TableApiInfo[]> {
  const result: TableApiInfo[] = [];
  try {
    // Check if routes index exists
    const routeIndexPath = path.join(process.cwd(), 'src', 'routes', 'index.ts');
    const content = await fs.readFile(routeIndexPath, 'utf8');
    
    // Extract route imports
    const routeImports = content.match(/import\s+(\w+)Route\s+from\s+'\.\/([^']+)'/g) || [];
    
    for (const importLine of routeImports) {
      const matches = importLine.match(/import\s+(\w+)Route\s+from\s+'\.\/([^']+)'/);
      if (matches && matches.length > 2) {
        const tableName = matches[1];
        
        // Check if corresponding files exist
        const routePath = path.join(process.cwd(), 'src', 'routes', `${tableName.toLowerCase()}.route.ts`);
        const controllerPath = path.join(process.cwd(), 'src', 'controllers', `${tableName.toLowerCase()}.controller.ts`);
        const servicePath = path.join(process.cwd(), 'src', 'services', `${tableName}.service.ts`);
        
        try {
          // Check if files exist
          await fs.access(routePath);
          await fs.access(controllerPath);
          await fs.access(servicePath);
          
          // Get route content to check for authentication and file uploads
          const routeContent = await fs.readFile(routePath, 'utf8');
          const requiresAuth = routeContent.includes('authMiddleware');
          const hasFileUploads = routeContent.includes('upload.single') || routeContent.includes('upload.array');
          
          // Get current fields from schema
          const fields = await getTableFields(tableName);
          
          result.push({
            tableName,
            routePath,
            controllerPath,
            servicePath,
            fields,
            requiresAuth,
            hasFileUploads
          });
        } catch (error) {
          // Skip this table if any file is missing
          console.warn(`Warning: Some files for ${tableName} are missing, skipping...`);
        }
      }
    }
    
    return result;
  } catch (error) {
    console.warn('No existing APIs found or error reading routes');
    return [];
  }
}

async function refreshTableApis(): Promise<void> {
  try {
    // Get existing APIs
    const existingApis = await getExistingTableApis();
    
    if (existingApis.length === 0) {
      console.log('No existing APIs found to refresh. Use flenco-generate to create new APIs.');
      return;
    }
    
    console.log('🔄 Introspecting database schema...');
    await execAsync('npx prisma db pull');
    console.log('✅ Database schema updated');
    
    console.log('🔄 Generating Prisma Client...');
    await execAsync('npx prisma generate');
    console.log('✅ Prisma Client regenerated');
    
    // Let user select which tables to refresh
    const tableChoices = existingApis.map(api => ({
      name: api.tableName,
      value: api.tableName
    }));
    
    const { tablesToRefresh } = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'tablesToRefresh',
        message: 'Select tables to refresh:',
        choices: tableChoices,
        validate: (answer: string[]) => {
          if (answer.length < 1) {
            return 'You must choose at least one table';
          }
          return true;
        }
      }
    ]);
    
    const selectedApis = existingApis.filter(api => tablesToRefresh.includes(api.tableName));
    
    // Regenerate each selected API
    for (const api of selectedApis) {
      console.log(`🔄 Refreshing API for ${api.tableName}...`);
      
      // Get updated fields
      const updatedFields = await getTableFields(api.tableName);
      
      // Regenerate all components
      await generateService({ tableName: api.tableName });
      await generateController({ tableName: api.tableName });
      await generateRoute({
        tableName: api.tableName,
        fields: updatedFields,
        requiresAuth: api.requiresAuth,
        hasFileUploads: api.hasFileUploads
      });
      
      console.log(`✅ API for ${api.tableName} refreshed successfully`);
    }
    
    console.log('\n✨ All selected APIs have been refreshed successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Execute the refresh function
refreshTableApis(); 