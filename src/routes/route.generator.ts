// src/routes/route.generator.ts
import { promises as fs } from 'fs';
import path from 'path';
import { ZodType, z } from 'zod';

interface RouteOptions {
  tableName: string;
  fields: Array<{ name: string; type: string; isRequired: boolean }>;
  requiresAuth: boolean;
  hasFileUploads: boolean;
}

// Ensure metadata route file exists
async function ensureMetadataRouteExists(): Promise<void> {
  const routesDir = path.join(process.cwd(), 'src', 'routes');
  const metadataFile = path.join(routesDir, 'metadata.route.ts');
  
  try {
    await fs.access(metadataFile);
    // File exists, no need to recreate
  } catch (error) {
    // File doesn't exist, need to create it
    console.log('🔍 Metadata route file not found, creating it...');
    
    // Get content for metadata file from template
    const metadataContent = await getMetadataRouteContent();
    
    // Write file
    await fs.writeFile(metadataFile, metadataContent);
    console.log('✅ Created metadata.route.ts file');
  }
}

// Get the content for the metadata route file
async function getMetadataRouteContent(): Promise<string> {
  // This could be read from a template file in the future
  return `
import { Router, Request, Response, NextFunction } from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import { ZodType, z } from 'zod';

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
  const schemaRegex = new RegExp(\`export\\\\s+const\\\\s+\${schemaType}Schema\\\\s*=\\\\s*z\\\\.object\\\\(\\\\{([^}]+)\\\\}\\\\)\`, 's');
  const schemaMatch = schemaRegex.exec(content);
  
  if (!schemaMatch || !schemaMatch[1]) return properties;
  
  const schemaContent = schemaMatch[1];
  const lines = schemaContent.split('\\n');
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith('//')) continue;
    
    // Parse field definition for Zod
    const fieldMatch = /(\\w+):\\s*z\\.(\\w+)\\(\\)(.*)/.exec(trimmedLine);
    if (!fieldMatch) continue;
    
    const [, fieldName, fieldType, validations] = fieldMatch;
    
    // Create base property
    const property: any = {
      type: mapZodTypeToJsonSchema(fieldType),
      description: \`\${fieldName} field\`,
      required: !validations.includes('.optional()'),
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
    
    if (validations.includes('.enum([')) {
      const enumMatch = /\\.enum\\(\\[([^\\]]+)\\]\\)/.exec(validations);
      if (enumMatch) {
        try {
          const enumValues = enumMatch[1].split(',').map(v => v.trim().replace(/['"]/g, ''));
          property.enum = enumValues;
        } catch (error) {
          console.warn(\`Failed to parse enum values for \${fieldName}\`);
        }
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
 * Map Zod types to JSON Schema types
 */
function mapZodTypeToJsonSchema(zodType: string): string {
  const typeMap: { [key: string]: string } = {
    'string': 'string',
    'number': 'number',
    'boolean': 'boolean',
    'date': 'string',
    'object': 'object',
    'array': 'array'
  };
  
  return typeMap[zodType] || 'string';
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
    
    try {
      await fs.access(schemaPath);
    } catch (error) {
      console.log('⚠️ Prisma schema not found, skipping model extraction');
      return models;
    }
    
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
}

async function generateRouteIndexFile(): Promise<void> {
  // Ensure metadata route exists first
  await ensureMetadataRouteExists();
  
  // First, read all route files in the directory
  const routesDir = path.join(process.cwd(), 'src', 'routes');
  const files = await fs.readdir(routesDir);
  
  // Filter for route files (exclude index.ts and generator files)
  const routeFiles = files.filter(file => 
    file.endsWith('.route.ts') && file !== 'index.ts' && file !== 'route.generator.ts'
  );

  // Create a Set to track unique route names and avoid duplicates
  const uniqueRoutes = new Set();
  
  // Generate imports for all routes
  const imports = routeFiles
    .map(file => {
      const routeName = file.replace('.route.ts', '');
      uniqueRoutes.add(routeName);
      return `import ${routeName}Route from './${routeName}.route';`;
    })
    .filter((line, index, self) => self.indexOf(line) === index) // Remove duplicate imports
    .join('\n');

  // Generate route registrations without duplicates
  const routeRegistrations = Array.from(uniqueRoutes)
    .map(routeName => {
      if (routeName === 'metadata') {
        return `// System routes\nrouter.use('/${routeName}', ${routeName}Route);`;
      } else {
        return `router.use('/${routeName}', ${routeName}Route);`;
      }
    })
    .join('\n');

  const indexContent = `
import { Router } from 'express';
${imports}

const router = Router();

// Register routes
${routeRegistrations}

export default router;
`;

  await fs.writeFile(path.join(routesDir, 'index.ts'), indexContent);
  
  console.log('✅ Updated routes/index.ts with all API routes');
}

export async function generateRoute(options: RouteOptions) {
  const { tableName, fields, requiresAuth, hasFileUploads } = options;
  
  // Ensure validation directory exists
  const validationDir = path.join(process.cwd(), 'src', 'validation');
  await createDirectoryIfNotExists(validationDir);
  
  // Generate validation schema file if it doesn't exist
  await generateValidationFile(tableName, fields);
  
  // Generate individual route file
  const routeContent = `
import { Router } from 'express';
import { ${tableName}Controller } from '../controllers/${tableName.toLowerCase()}.controller';
import { validate } from '../middleware/validate.middleware';
import { BaseValidation } from '../validation/base.validation';
import { paginationSchema } from '../validation/common.validation';
import { catchAsync } from '../middleware/async.middleware';
${requiresAuth ? "import { auth } from '../middleware/auth.middleware';" : ''}
${hasFileUploads ? "import { uploadFile, uploadFiles } from '../middleware/upload.middleware';" : ''}
import { createSchema, updateSchema } from '../validation/${tableName.toLowerCase()}.validation';

const router = Router();
const controller = new ${tableName}Controller();

// Routes
router.get(
  '/',
  ${requiresAuth ? 'auth(),' : ''}
  validate(paginationSchema),
  catchAsync(controller.getAll)
);

router.get(
  '/:id',
  ${requiresAuth ? 'auth(),' : ''}
  validate(BaseValidation.idParamSchema),
  catchAsync(controller.getOne)
);

router.post(
  '/',
  ${requiresAuth ? 'auth(),' : ''}
  ${hasFileUploads ? 'uploadFile("file"),' : ''}
  validate(createSchema),
  catchAsync(controller.create)
);

router.patch(
  '/:id',
  ${requiresAuth ? 'auth(),' : ''}
  ${hasFileUploads ? 'uploadFile("file"),' : ''}
  validate(updateSchema),
  catchAsync(controller.update)
);

router.delete(
  '/:id',
  ${requiresAuth ? 'auth(),' : ''}
  validate(BaseValidation.idParamSchema),
  catchAsync(controller.delete)
);

export default router;
`;

  // Write the route file
  const routeFilePath = path.join(process.cwd(), 'src', 'routes', `${tableName.toLowerCase()}.route.ts`);
  await fs.writeFile(routeFilePath, routeContent);

  // Update routes index file
  await generateRouteIndexFile();
}

// Helper to create directory if it doesn't exist
async function createDirectoryIfNotExists(dirPath: string): Promise<void> {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
  }
}

// Generate validation file for the table
async function generateValidationFile(tableName: string, fields: Array<{ name: string; type: string; isRequired: boolean }>): Promise<void> {
  const validationPath = path.join(process.cwd(), 'src', 'validation', `${tableName.toLowerCase()}.validation.ts`);
  
  try {
    await fs.access(validationPath);
    console.log(`✅ Validation file for ${tableName} already exists, skipping creation`);
    return;
  } catch {
    // File doesn't exist, create it
  }
  
  // Create validation rules for each field
  const fieldValidations = fields.map(field => {
    let validation = `z.${mapTypeToZod(field.type)}()`;
    
    // Add appropriate validators based on field type
    if (field.type === 'string') {
      validation += '.min(1).max(255)';
    } else if (field.type === 'number') {
      validation += '.min(0)';
    } else if (field.type === 'email') {
      validation += '.email()';
    }
    
    // If field is required, use as is, otherwise make it optional
    if (!field.isRequired) {
      validation += '.optional()';
    }
    
    return `  ${field.name}: ${validation}`;
  }).join(',\n');
  
  const validationContent = `
import { z } from 'zod';

// Create schema - used for POST requests
export const createSchema = z.object({
${fieldValidations}
});

// Update schema - make all fields optional
export const updateSchema = createSchema.partial();

// Type definitions
export type CreateInput = z.infer<typeof createSchema>;
export type UpdateInput = z.infer<typeof updateSchema>;
`;

  await fs.writeFile(validationPath, validationContent);
  console.log(`✅ Created validation file for ${tableName}`);
}

// Map database types to Zod validator types
function mapTypeToZod(dbType: string): string {
  const typeMap: Record<string, string> = {
    'string': 'string',
    'text': 'string',
    'number': 'number',
    'int': 'number',
    'integer': 'number',
    'float': 'number',
    'decimal': 'number',
    'boolean': 'boolean',
    'date': 'date',
    'datetime': 'date',
    'timestamp': 'date',
    'uuid': 'string',
    'email': 'string'
  };
  
  return typeMap[dbType.toLowerCase()] || 'string';
}