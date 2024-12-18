#!/usr/bin/env node
import inquirer from 'inquirer';
import { promises as fs } from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { generateService } from './services/service.generator';
import { generateRoute } from './routes/route.generator';
import { generateController } from './controllers/controller.generator';
import { generateMiddleware } from './middleware/middleware.generator';
import { RouteTracker } from './utils/route.tracker';
import { generateUtils } from './utils/utils.generator';

const execAsync = promisify(exec);

interface DBConfig {
  type: 'postgresql' | 'mysql';
  host: string;
  port: string;
  database: string;
  username: string;
  password: string;
}

interface TableInfo {
  tableName: string;
  requiresAuth: boolean;
  hasFileUploads: boolean;
  fields: Array<{
    name: string;
    type: string;
    isRequired: boolean;
  }>;
}

async function createDirectoryIfNotExists(dirPath: string): Promise<void> {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
  }
}

async function generateProjectStructure(): Promise<void> {
  const directories = [
    'src/routes',
    'src/middleware',
    'src/validation',
    'src/controllers',
    'src/services',
    'src/utils',
    'prisma',
    'uploads', // Added for file uploads
    'src/templates', // Added for email templates
  ];

  for (const dir of directories) {
    await createDirectoryIfNotExists(dir);
  }
}

async function promptDBCredentials(): Promise<DBConfig> {
  interface Answers {
    type: 'postgresql' | 'mysql';
    host: string;
    port: string;
    database: string;
    username: string;
    password: string;
  }
  const dbConfig = await inquirer.prompt([
    {
      type: 'list',
      name: 'type',
      message: 'Select your database type:',
      choices: [
        { name: 'PostgreSQL', value: 'postgresql' },
        { name: 'MySQL', value: 'mysql' }
      ]
    },
    {
      type: 'input',
      name: 'host',
      message: 'Enter database host:',
      default: 'localhost'
    },
    {
      type: 'input',
      name: 'port',
      message: (answers: Answers) =>
        `Enter database port (default ${answers.type === 'postgresql' ? '5432' : '3306'}):`,
      default: (answers: Answers) => answers.type === 'postgresql' ? '5432' : '3306'
    },
    {
      type: 'input',
      name: 'database',
      message: 'Enter database name:',
      validate: (input: string) => input.length > 0 || 'Database name is required'
    },
    {
      type: 'input',
      name: 'username',
      message: 'Enter database username:',
      validate: (input: string) => input.length > 0 || 'Username is required'
    },
    {
      type: 'password',
      name: 'password',
      message: 'Enter database password:',
      mask: '*'
    }
  ]);

  return dbConfig;
}

async function generatePrismaSchema(dbConfig: DBConfig): Promise<void> {
  const prismaSchema = `
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "${dbConfig.type}"  // This will match the selected database type
  url      = env("DATABASE_URL")
}
`;

  // Create .env file with the correct database URL first
  const envContent = `DATABASE_URL="${getPrismaConnectionString(dbConfig)}"`;
  await fs.writeFile('.env', envContent);

  // Then create the prisma schema
  await fs.writeFile('prisma/schema.prisma', prismaSchema);
}

function getPrismaConnectionString(dbConfig: DBConfig): string {
  const { type, username, password, host, port, database } = dbConfig;

  if (type === 'postgresql') {
    return `postgresql://${username}:${password}@${host}:${port}/${database}?schema=public`;
  } else if (type === 'mysql') {
    return `mysql://${username}:${password}@${host}:${port}/${database}`;
  }
  throw new Error('Unsupported database type');
}

async function introspectDatabase(): Promise<void> {
  console.log('🔍 Introspecting database schema...');
  try {
    await execAsync('npx prisma db pull');
    console.log('✅ Database schema introspected successfully');
  } catch (error) {
    console.error('❌ Failed to introspect database:', error);
    throw error;
  }
}

async function promptTableSelection(): Promise<string> {
  const schemaContent = await fs.readFile('prisma/schema.prisma', 'utf-8');
  const models = schemaContent
    .match(/model\s+(\w+)\s+{/g)
    ?.map(model => model.split(/\s+/)[1]) || [];

  if (models.length === 0) {
    throw new Error('No tables found in the database');
  }

  const { tableName } = await inquirer.prompt([
    {
      type: 'list',
      name: 'tableName',
      message: 'Select the table to generate CRUD for:',
      choices: models
    }
  ]);

  return tableName;
}

async function getTableFields(tableName: string): Promise<Array<{ name: string; type: string; isRequired: boolean }>> {
  const schemaContent = await fs.readFile('prisma/schema.prisma', 'utf-8');
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

async function createEnvFile(dbConfig: DBConfig): Promise<void> {
  const envContent = `
# Database Configuration
DATABASE_URL="${getPrismaConnectionString(dbConfig)}"
DB_TYPE="${dbConfig.type}"
DB_HOST="${dbConfig.host}"
DB_PORT="${dbConfig.port}"
DB_NAME="${dbConfig.database}"
DB_USER="${dbConfig.username}"
DB_PASSWORD="${dbConfig.password}"
PORT=3000

# JWT Configuration
JWT_SECRET=your-super-secret-key-change-this
JWT_EXPIRES_IN=1d

# Email Configuration
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@example.com
SMTP_PASS=your-email-password
EMAIL_FROM=noreply@example.com

# Frontend URL for password reset
FRONTEND_URL=http://localhost:3000

# File Upload Configuration
MAX_FILE_SIZE=5242880
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif,application/pdf
UPLOAD_PATH=uploads
`;
  await fs.writeFile('.env', envContent);
}

async function createPackageJson(dbConfig: DBConfig): Promise<void> {
  const packageJson = {
    "name": "backend-generator",
    "version": "1.0.0",
    "description": "Generated backend project with authentication and file upload",
    "main": "dist/index.js",
    "scripts": {
      "build": "tsc",
      "start": "node dist/index.js",
      "dev": "ts-node-dev --respawn --transpile-only src/server.ts",
      "prisma:generate": "prisma generate",
      "prisma:push": "prisma db push"
    },
    "dependencies": {
      "@prisma/client": "^5.8.0",
      "express": "^4.18.2",
      "cors": "^2.8.5",
      "dotenv": "^16.3.1",
      "helmet": "^7.1.0",
      "jsonwebtoken": "^9.0.2",
      "multer": "^1.4.5-lts.1",
      "nodemailer": "^6.9.8",
      "zod": "^3.22.4",
      ...(dbConfig.type === 'mysql' ? { "mysql2": "^3.6.5" } : {})
    },
    "devDependencies": {
      "@types/cors": "^2.8.17",
      "@types/express": "^4.17.21",
      "@types/jsonwebtoken": "^9.0.5",
      "@types/multer": "^1.4.11",
      "@types/node": "^20.10.6",
      "@types/nodemailer": "^6.4.14",
      "prisma": "^5.8.0",
      "ts-node-dev": "^2.0.0",
      "typescript": "^5.3.3"
    }
  };

  await fs.writeFile('package.json', JSON.stringify(packageJson, null, 2));
}

async function generateComponents(tableInfo: TableInfo) {
  const { tableName, fields, requiresAuth, hasFileUploads } = tableInfo;

  // Generate all components
  await Promise.all([
    generateService(tableName),
    generateRoute({ tableName, fields, requiresAuth, hasFileUploads }),
    generateController(tableName)
  ]);

  // Track the new route
  await RouteTracker.addRoute({
    name: tableName.toLowerCase(),
    path: `/api/${tableName.toLowerCase()}`,
    requiresAuth,
    hasFileUploads
  });
}

async function setupPrisma(dbConfig: DBConfig): Promise<void> {
  try {
    // Generate initial Prisma schema
    await generatePrismaSchema(dbConfig);
    console.log('✅ Initial Prisma schema created');

    // Run Prisma introspection
    console.log('🔍 Introspecting database schema...');
    await execAsync('npx prisma db pull');
    console.log('✅ Database schema introspected');

    // Generate Prisma Client
    console.log('🔧 Generating Prisma Client...');
    await execAsync('npx prisma generate');
    console.log('✅ Prisma Client generated');
  } catch (error) {
    console.error('❌ Error setting up Prisma:', error);
    throw error;
  }
}

async function main() {
  try {
    console.log('🚀 Welcome to Backend Project Generator!');

    // Create project structure
    await generateProjectStructure();
    console.log('✅ Project structure created');

    await generateMiddleware();
    console.log('✅ Middleware files generated');

    // Generate utility files
    await generateUtils();
    console.log('✅ Utility files generated');

    // Get database credentials with type selection
    const dbConfig = await promptDBCredentials();

    // Create package.json with database-specific dependencies
    await createPackageJson(dbConfig);
    console.log('✅ Package.json created');

    // Create initial .env file with database URL
    await createEnvFile(dbConfig);
    console.log('✅ Environment file created');

    // Generate Prisma schema
    await generatePrismaSchema(dbConfig);
    console.log('✅ Initial Prisma schema created');

    // Install dependencies before introspection
    console.log('📦 Installing dependencies...');
    await execAsync('npm install');
    console.log('✅ Dependencies installed');

    // Setup Prisma with schema generation and client generation
    await setupPrisma(dbConfig);

    // Introspect database
    await introspectDatabase();

    // Let user select table
    const tableName = await promptTableSelection();

    // Get table fields from Prisma schema
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
    console.log('✅ API components generated');

    // Create .env file with the provided database configuration
    await createEnvFile(dbConfig);
    console.log('✅ Environment file created');

    console.log('\n📦 Project has been generated successfully!');
    console.log('\nNext steps:');
    console.log('1. Run "npm install" to install dependencies');
    console.log(`2. Make sure you have the ${dbConfig.type} database running`);
    console.log('3. Update JWT_SECRET and other configuration in .env file');
    console.log('4. Run "npm run dev" to start the development server');
    console.log('\nHappy coding! 🎉');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();