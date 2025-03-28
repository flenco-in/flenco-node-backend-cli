#!/usr/bin/env node
import { promises as fs } from 'fs';
import path from 'path';
import inquirer from 'inquirer';
import { exec } from 'child_process';
import { promisify } from 'util';

// Update imports to use relative paths
import { generateUtils } from '../utils/utils.generator';
import { generateAppFile } from '../utils/app.generator';
import { generateServerFile } from '../utils/server.generator';
import { generateMiddleware } from '../middleware/middleware.generator';
import { generateValidationFiles } from '../utils/validation.generator';
import { generatePostmanCollection } from '../utils/postman.generator';

const execAsync = promisify(exec);

interface DBConfig {
  type: 'postgresql' | 'mysql';
  host: string;
  port: string;
  database: string;
  username: string;
  password: string;
  projectName: string;
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
    'uploads',
    'src/templates',
  ];

  for (const dir of directories) {
    await createDirectoryIfNotExists(dir);
  }
}

interface DBAnswers {
  type: 'postgresql' | 'mysql';
  host: string;
  port: string;
  database: string;
  username: string;
  password: string;
  projectName: string;
}

async function promptDBCredentials(): Promise<DBConfig> {
  const questions = [
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
      message: (answers: any) => `Enter database port (default ${answers.type === 'postgresql' ? '5432' : '3306'}):`,
      default: (answers: any) => answers.type === 'postgresql' ? '5432' : '3306'
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
    },
    {
      type: 'input',
      name: 'projectName',
      message: 'Enter project name:',
      validate: (input: string) => input.length > 0 || 'Project name is required'
    }
  ];

  // Use prompt method with proper casting
  const dbConfig = await inquirer.prompt(questions) as unknown as DBAnswers;
  return dbConfig;
}

async function generatePrismaSchema(dbConfig: DBConfig): Promise<void> {
  const prismaSchema = `
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "${dbConfig.type}"
  url      = env("DATABASE_URL")
}
`;

  await fs.writeFile('prisma/schema.prisma', prismaSchema);
}

async function createPackageJson(dbConfig: DBConfig): Promise<void> {
  const packageJson = {
    "name": "backend-generator",
    "version": "1.0.0",
    "description": "Generated backend project with authentication and file upload",
    "main": "src/server.ts",
    "scripts": {
      "build": "tsc",
      "start": "node dist/server.js",
      "dev": "ts-node-dev --respawn --transpile-only src/server.ts",
      "prisma:generate": "prisma generate",
      "prisma:push": "prisma db push",
      "setup": "npm install && npx prisma generate"
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

async function generateTsConfig(): Promise<void> {
  const tsConfig = {
    "compilerOptions": {
      "target": "es2017",
      "module": "commonjs",
      "lib": ["es2017", "es7", "es6"],
      "declaration": true,
      "outDir": "dist",
      "strict": true,
      "esModuleInterop": true,
      "skipLibCheck": true,
      "forceConsistentCasingInFileNames": true,
      "moduleResolution": "node",
      "resolveJsonModule": true,
      "rootDir": "src",
      "baseUrl": "src",
      "paths": {
        "@/*": ["./*"]
      }
    },
    "include": ["src/**/*"],
    "exclude": ["node_modules", "dist"]
  };

  await fs.writeFile('tsconfig.json', JSON.stringify(tsConfig, null, 2));
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

function getPrismaConnectionString(dbConfig: DBConfig): string {
  const { type, username, password, host, port, database } = dbConfig;
  
  if (type === 'postgresql') {
    return `postgresql://${username}:${password}@${host}:${port}/${database}?schema=public`;
  } else {
    return `mysql://${username}:${password}@${host}:${port}/${database}`;
  }
}

async function generateInitialRouteIndex(): Promise<void> {
  const routeIndexContent = `
import { Router } from 'express';
import metadataRoute from './metadata.route';

const router = Router();

// System routes
router.use('/metadata', metadataRoute);

export default router;
`;

  await fs.writeFile(path.join(process.cwd(), 'src', 'routes', 'index.ts'), routeIndexContent);
}

async function createMetadataRouteFile(): Promise<void> {
  // Define the content for the metadata route file directly instead of trying to read it
  const metadataContent = `
import { Router, Request, Response, NextFunction } from 'express';
import { promises as fs } from 'fs';
import path from 'path';

const router = Router();

// Helper function to catch async errors
const catchAsync = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

interface RouteInfo {
  path: string;
  method: string;
  description: string;
  requiresAuth: boolean;
  parameters?: Record<string, {
    type: string;
    description: string;
    required: boolean;
    example?: any;
  }>;
  queryParams?: Record<string, {
    type: string;
    description: string;
    required: boolean;
    example?: any;
  }>;
  requestBody?: {
    type: string;
    required: boolean;
    properties: Record<string, {
      type: string;
      description: string;
      required: boolean;
      format?: string;
      enum?: string[];
      example?: any;
      minLength?: number;
      maxLength?: number;
      minimum?: number;
      maximum?: number;
    }>;
  };
  responses: Record<string, {
    description: string;
    schema?: any;
    example?: any;
  }>;
}

interface MetadataInfo {
  apiName: string;
  version: string;
  description: string;
  basePath: string;
  endpoints: Record<string, RouteInfo[]>;
  models: Record<string, any>;
  lastUpdated: string;
}

// Global metadata cache
let metadataCache: MetadataInfo | null = null;
let cacheLastUpdated: number = 0;
const CACHE_TTL = 1000 * 60 * 5; // 5 minutes

/**
 * Handler for GET /api/metadata
 * Returns metadata information about all API endpoints
 */
async function getMetadata(req: Request, res: Response) {
  // Return from cache if it's still valid
  const now = Date.now();
  if (metadataCache && (now - cacheLastUpdated < CACHE_TTL)) {
    return res.json(metadataCache);
  }

  // Read package.json for API details
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));

  // Get all route files to analyze
  const routesDir = path.join(process.cwd(), 'src', 'routes');
  const routeFiles = await fs.readdir(routesDir);
  
  // Prepare metadata structure
  const metadata: MetadataInfo = {
    apiName: packageJson.name || 'Backend API',
    version: packageJson.version || '1.0.0',
    description: packageJson.description || 'Backend API created with Flenco Node Backend CLI',
    basePath: '/api',
    endpoints: {},
    models: await getModels(),
    lastUpdated: new Date().toISOString()
  };
  
  // Add our route
  metadata.endpoints['metadata'] = [
    {
      path: '/api/metadata',
      method: 'GET',
      description: 'Get API metadata information',
      requiresAuth: false,
      responses: {
        "200": {
          description: "API metadata information",
          schema: {
            type: "object",
            properties: {
              apiName: { type: "string" },
              version: { type: "string" },
              description: { type: "string" },
              basePath: { type: "string" },
              endpoints: { type: "object" },
              models: { type: "object" },
              lastUpdated: { type: "string" }
            }
          }
        }
      }
    }
  ];
  
  // Scan all route files to extract endpoint information
  for (const routeFile of routeFiles) {
    // Skip non-route files and our own file
    if (routeFile === 'index.ts' || routeFile === 'route.generator.ts' || 
        routeFile === 'routes.json' || routeFile === 'metadata.route.ts') {
      continue;
    }
    
    // Determine resource name from file name (remove .route.ts)
    const resourceName = routeFile.replace('.route.ts', '');
    
    // Read the route file content
    const routeFilePath = path.join(routesDir, routeFile);
    const routeContent = await fs.readFile(routeFilePath, 'utf8');
    
    // Try to get validation rules for this resource
    const validationRules = await getValidationRules(resourceName);
    
    // Extract route information
    const requiresAuth = routeContent.includes('authMiddleware');
    const endpoints: RouteInfo[] = [
      {
        path: \`/api/\${resourceName}\`,
        method: 'GET',
        description: \`Get all \${resourceName} records with pagination\`,
        requiresAuth,
        queryParams: {
          page: {
            type: "number",
            description: "Page number for pagination",
            required: false,
            example: 1
          },
          limit: {
            type: "number",
            description: "Number of items per page",
            required: false,
            example: 10
          },
          sortBy: {
            type: "string",
            description: "Field to sort by",
            required: false,
            example: "createdAt"
          },
          sortOrder: {
            type: "string",
            description: "Sort direction (asc or desc)",
            required: false,
            example: "desc"
          },
          search: {
            type: "string",
            description: "Search term to filter results",
            required: false,
            example: "search term"
          }
        },
        responses: {
          "200": {
            description: \`List of \${resourceName} records\`,
            schema: { type: "array", items: { type: "object" } }
          },
          "401": {
            description: "Unauthorized"
          }
        }
      },
      {
        path: \`/api/\${resourceName}/:id\`,
        method: 'GET',
        description: \`Get single \${resourceName} by ID\`,
        requiresAuth,
        parameters: {
          id: {
            type: "string",
            description: "The ID of the record to retrieve",
            required: true,
            example: "123"
          }
        },
        responses: {
          "200": {
            description: \`\${resourceName} record\`
          },
          "404": {
            description: "Not found"
          },
          "401": {
            description: "Unauthorized"
          }
        }
      },
      {
        path: \`/api/\${resourceName}\`,
        method: 'POST',
        description: \`Create a new \${resourceName}\`,
        requiresAuth,
        requestBody: {
          type: "object",
          required: true,
          properties: validationRules.create || metadata.models[resourceName] || {}
        },
        responses: {
          "201": {
            description: \`Created \${resourceName}\`
          },
          "400": {
            description: "Validation error"
          },
          "401": {
            description: "Unauthorized"
          }
        }
      },
      {
        path: \`/api/\${resourceName}/:id\`,
        method: 'PATCH',
        description: \`Update an existing \${resourceName}\`,
        requiresAuth,
        parameters: {
          id: {
            type: "string",
            description: "The ID of the record to update",
            required: true,
            example: "123"
          }
        },
        requestBody: {
          type: "object",
          required: false,
          properties: validationRules.update || metadata.models[resourceName] || {}
        },
        responses: {
          "200": {
            description: \`Updated \${resourceName}\`
          },
          "400": {
            description: "Validation error"
          },
          "404": {
            description: "Not found"
          },
          "401": {
            description: "Unauthorized"
          }
        }
      },
      {
        path: \`/api/\${resourceName}/:id\`,
        method: 'DELETE',
        description: \`Delete a \${resourceName}\`,
        requiresAuth,
        parameters: {
          id: {
            type: "string",
            description: "The ID of the record to delete",
            required: true,
            example: "123"
          }
        },
        responses: {
          "204": {
            description: "No content"
          },
          "404": {
            description: "Not found"
          },
          "401": {
            description: "Unauthorized"
          }
        }
      }
    ];
    
    metadata.endpoints[resourceName] = endpoints;
  }
  
  // Update cache
  metadataCache = metadata;
  cacheLastUpdated = now;
  
  return res.json(metadata);
}

/**
 * Extract validation rules from validation files
 */
async function getValidationRules(resourceName: string): Promise<Record<string, any>> {
  try {
    const validationDir = path.join(process.cwd(), 'src', 'validation');
    const validationFile = path.join(validationDir, \`\${resourceName}.validation.ts\`);
    
    // Check if validation file exists
    try {
      await fs.access(validationFile);
    } catch (error) {
      return { create: {}, update: {} };
    }
    
    // Read validation file
    const content = await fs.readFile(validationFile, 'utf8');
    
    // Extract validation rules
    const createRules = extractValidationDetails(content, 'create');
    const updateRules = extractValidationDetails(content, 'update');
    
    return {
      create: createRules,
      update: updateRules
    };
  } catch (error) {
    console.error(\`Error extracting validation rules for \${resourceName}:\`, error);
    return { create: {}, update: {} };
  }
}

/**
 * Extract validation details from validation file content
 */
function extractValidationDetails(content: string, schemaType: 'create' | 'update'): Record<string, any> {
  const properties: Record<string, any> = {};
  
  // Look for the schema definition
  const schemaRegex = new RegExp(\`export\\\\s+const\\\\s+\${schemaType}Schema\\\\s*=\\\\s*Joi\\\\.object\\\\(\\\\{([^}]+)\\\\}\\\\)\`, 's');
  const schemaMatch = schemaRegex.exec(content);
  
  if (!schemaMatch || !schemaMatch[1]) return properties;
  
  const schemaContent = schemaMatch[1];
  const lines = schemaContent.split('\\n');
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith('//')) continue;
    
    // Parse field definition
    const fieldMatch = /(\\w+):\\s*Joi\\.(\\w+)\\(\\)(.*)/.exec(trimmedLine);
    if (!fieldMatch) continue;
    
    const [, fieldName, fieldType, validations] = fieldMatch;
    
    // Create base property
    const property: any = {
      type: mapJoiTypeToJsonSchema(fieldType),
      description: \`\${fieldName} field\`,
      required: validations.includes('.required()'),
    };
    
    // Add additional validations
    if (validations.includes('.min(')) {
      const minMatch = /\\.min\\((\\d+)\\)/.exec(validations);
      if (minMatch) {
        if (fieldType === 'string') {
          property.minLength = parseInt(minMatch[1], 10);
        } else {
          property.minimum = parseInt(minMatch[1], 10);
        }
      }
    }
    
    if (validations.includes('.max(')) {
      const maxMatch = /\\.max\\((\\d+)\\)/.exec(validations);
      if (maxMatch) {
        if (fieldType === 'string') {
          property.maxLength = parseInt(maxMatch[1], 10);
        } else {
          property.maximum = parseInt(maxMatch[1], 10);
        }
      }
    }
    
    if (validations.includes('.email()')) {
      property.format = 'email';
    }
    
    if (validations.includes('.valid(')) {
      const validMatch = /\\.valid\\(([^)]+)\\)/.exec(validations);
      if (validMatch) {
        property.enum = validMatch[1].split(',').map(v => v.trim().replace(/['"\`]/g, ''));
      }
    }
    
    // Add example based on type
    switch (fieldType) {
      case 'string':
        property.example = fieldName === 'email' ? 'user@example.com' : 'example text';
        break;
      case 'number':
        property.example = 123;
        break;
      case 'boolean':
        property.example = true;
        break;
      case 'date':
        property.example = new Date().toISOString();
        break;
    }
    
    properties[fieldName] = property;
  }
  
  return properties;
}

/**
 * Map Joi types to JSON Schema types
 */
function mapJoiTypeToJsonSchema(joiType: string): string {
  const typeMap: { [key: string]: string } = {
    'string': 'string',
    'number': 'number',
    'boolean': 'boolean',
    'date': 'string',
    'object': 'object',
    'array': 'array'
  };
  
  return typeMap[joiType] || 'string';
}

// Define routes
router.get('/', catchAsync(getMetadata));

/**
 * Extract model information from Prisma schema
 */
async function getModels(): Promise<Record<string, any>> {
  try {
    const models: Record<string, any> = {};
    const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');
    const schemaContent = await fs.readFile(schemaPath, 'utf8');
    
    // Extract all models
    const modelRegex = /model\\s+(\\w+)\\s+{([^}]+)}/g;
    let modelMatch;
    
    while ((modelMatch = modelRegex.exec(schemaContent)) !== null) {
      const modelName = modelMatch[1].toLowerCase();
      const modelContent = modelMatch[2];
      
      // Process fields
      const fields: Record<string, any> = {};
      const fieldLines = modelContent.trim().split('\\n');
      
      for (const line of fieldLines) {
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith('@') || trimmedLine === '') continue;
        
        const parts = trimmedLine.split(/\\s+/);
        if (parts.length < 2) continue;
        
        const fieldName = parts[0];
        const fieldType = mapPrismaTypeToJsonSchema(parts[1]);
        const isRequired = !trimmedLine.includes('?');
        
        fields[fieldName] = {
          type: fieldType,
          required: isRequired
        };
      }
      
      models[modelName] = {
        type: 'object',
        properties: fields
      };
    }
    
    return models;
  } catch (error) {
    console.error('Error extracting models from schema:', error);
    return {};
  }
}

/**
 * Map Prisma types to JSON Schema types
 */
function mapPrismaTypeToJsonSchema(prismaType: string): string {
  const typeMap: { [key: string]: string } = {
    'String': 'string',
    'Int': 'integer',
    'Float': 'number',
    'Boolean': 'boolean',
    'DateTime': 'string',
    'Json': 'object'
  };
  
  return typeMap[prismaType] || 'string';
}

export default router;
`;
  
  // Write it to the new project
  await fs.writeFile(path.join(process.cwd(), 'src', 'routes', 'metadata.route.ts'), metadataContent);
}

async function initProject() {
  try {
    console.log('🚀 Welcome to Flenco Backend Generator!');
    console.log('Initializing new project...');
    
    // Get database credentials
    const answers = await promptDBCredentials();
    
    // Create project structure
    await generateProjectStructure();
    console.log('✅ Project structure created');

    // Generate all base files
    await Promise.all([
      createPackageJson(answers),
      generateAppFile(),
      generateServerFile(),
      generateMiddleware(),
      generateUtils(),
      generateValidationFiles(),
      createEnvFile(answers),
      generatePrismaSchema(answers),
      generateTsConfig(),
      generateInitialRouteIndex(),
      createMetadataRouteFile()
    ]);
    console.log('✅ Configuration files generated');

    // Install dependencies
    console.log('📦 Installing dependencies...');
    await execAsync('npm install');
    console.log('✅ Dependencies installed');

    // Generate Postman collection
    console.log('📬 Generating Postman collection for API testing...');
    const postmanPath = await generatePostmanCollection(answers.projectName);
    console.log(`✅ Postman collection generated at: ${postmanPath}`);
    console.log('   Using a single, unified collection file for all your APIs');
    
    console.log('\n📦 Project initialized successfully!');
    console.log('\nNext steps:');
    console.log('1. Configure your database and update schema.prisma');
    console.log('2. Run "flenco-generate" to generate API for your tables');
    console.log('3. Run "npm run dev" to start the development server');
    console.log('4. Import the Postman collection to test your APIs');
    console.log('5. Use `flenco-refresh` to update APIs when your schema changes');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

initProject();