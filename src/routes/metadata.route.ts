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
        path: `/api/${resourceName}`,
        method: 'GET',
        description: `Get all ${resourceName} records with pagination`,
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
            description: `List of ${resourceName} records`,
            schema: { type: "array", items: { type: "object" } }
          },
          "401": {
            description: "Unauthorized"
          }
        }
      },
      {
        path: `/api/${resourceName}/:id`,
        method: 'GET',
        description: `Get single ${resourceName} by ID`,
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
            description: `${resourceName} record`
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
        path: `/api/${resourceName}`,
        method: 'POST',
        description: `Create a new ${resourceName}`,
        requiresAuth,
        requestBody: {
          type: "object",
          required: true,
          properties: validationRules.create || metadata.models[resourceName] || {}
        },
        responses: {
          "201": {
            description: `Created ${resourceName}`
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
        path: `/api/${resourceName}/:id`,
        method: 'PATCH',
        description: `Update an existing ${resourceName}`,
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
            description: `Updated ${resourceName}`
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
        path: `/api/${resourceName}/:id`,
        method: 'DELETE',
        description: `Delete a ${resourceName}`,
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
    const validationFile = path.join(validationDir, `${resourceName}.validation.ts`);
    
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
    console.error(`Error extracting validation rules for ${resourceName}:`, error);
    return { create: {}, update: {} };
  }
}

/**
 * Extract validation details from validation file content
 */
function extractValidationDetails(content: string, schemaType: 'create' | 'update'): Record<string, any> {
  const properties: Record<string, any> = {};
  
  // Look for the schema definition
  const schemaRegex = new RegExp(`export\\s+const\\s+${schemaType}Schema\\s*=\\s*Joi\\.object\\(\\{([^}]+)\\}\\)`, 's');
  const schemaMatch = schemaRegex.exec(content);
  
  if (!schemaMatch || !schemaMatch[1]) return properties;
  
  const schemaContent = schemaMatch[1];
  const lines = schemaContent.split('\n');
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith('//')) continue;
    
    // Parse field definition
    const fieldMatch = /(\w+):\s*Joi\.(\w+)\(\)(.*)/.exec(trimmedLine);
    if (!fieldMatch) continue;
    
    const [, fieldName, fieldType, validations] = fieldMatch;
    
    // Create base property
    const property: any = {
      type: mapJoiTypeToJsonSchema(fieldType),
      description: `${fieldName} field`,
      required: validations.includes('.required()'),
    };
    
    // Add additional validations
    if (validations.includes('.min(')) {
      const minMatch = /\.min\((\d+)\)/.exec(validations);
      if (minMatch) {
        if (fieldType === 'string') {
          property.minLength = parseInt(minMatch[1], 10);
        } else {
          property.minimum = parseInt(minMatch[1], 10);
        }
      }
    }
    
    if (validations.includes('.max(')) {
      const maxMatch = /\.max\((\d+)\)/.exec(validations);
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
      const validMatch = /\.valid\(([^)]+)\)/.exec(validations);
      if (validMatch) {
        property.enum = validMatch[1].split(',').map(v => v.trim().replace(/['"`]/g, ''));
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
    const modelRegex = /model\s+(\w+)\s+{([^}]+)}/g;
    let modelMatch;
    
    while ((modelMatch = modelRegex.exec(schemaContent)) !== null) {
      const modelName = modelMatch[1].toLowerCase();
      const modelContent = modelMatch[2];
      
      // Process fields
      const fields: Record<string, any> = {};
      const fieldLines = modelContent.trim().split('\n');
      
      for (const line of fieldLines) {
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith('@') || trimmedLine === '') continue;
        
        const parts = trimmedLine.split(/\s+/);
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