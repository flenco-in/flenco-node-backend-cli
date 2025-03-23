import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

interface PostmanRequest {
  id: string;
  name: string;
  request: {
    method: string;
    header: any[];
    url: {
      raw: string;
      host: string[];
      port?: string;
      path: string[];
      query?: any[];
      variable?: {
        key: string;
        value: string;
      }[];
    };
    body?: {
      mode: string;
      raw: string;
      options?: {
        raw: {
          language: string;
        };
      };
    };
    description?: string;
  };
  response: any[];
}

interface PostmanCollection {
  info: {
    _postman_id: string;
    name: string;
    description: string;
    schema: string;
  };
  variable: {
    key: string;
    value: string;
  }[];
  item: {
    name: string;
    item: PostmanRequest[];
  }[];
}

export async function generatePostmanCollection(projectName: string) {
  try {
    // Check if existing collection file exists and read it
    let collection: PostmanCollection;
    const collectionFilePath = path.join(process.cwd(), 'api-collection.json');
    
    // Clean up old collection files
    await cleanupOldCollectionFiles(projectName);
    
    try {
      // Try to read existing collection
      const existingCollection = await fs.readFile(collectionFilePath, 'utf8');
      collection = JSON.parse(existingCollection);
      
      // Update collection name and description if project name changed
      collection.info.name = `${projectName} API`;
      collection.info.description = `API collection for ${projectName}`;
      
      // Clear existing items (we'll rebuild them)
      collection.item = [];
    } catch (error) {
      // No existing collection, create a new one
      collection = {
        info: {
          _postman_id: uuidv4(),
          name: `${projectName} API`,
          description: `API collection for ${projectName}`,
          schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
        },
        variable: [
          {
            key: "url",
            value: "http://localhost:3000"
          }
        ],
        item: []
      };
    }

    // Get all route files to analyze
    const routeFiles = await getRouteFiles();
    
    // Analyze each route file and add to collection
    for (const routeFile of routeFiles) {
      // Skip non-route files
      if (routeFile === 'index.ts' || routeFile === 'route.generator.ts' || routeFile === 'routes.json') {
        continue;
      }

      const tableName = routeFile.replace('.route.ts', '');
      const folderItem = {
        name: capitalizeFirstLetter(tableName),
        item: await createRequestsForTable(tableName)
      };
      
      collection.item.push(folderItem);
    }

    // Add Authentication folder
    collection.item.push({
      name: "Authentication",
      item: [
        createAuthRequest("Register", "POST", "auth/register", {
          email: "user@example.com",
          password: "password123",
          name: "John Doe"
        }),
        createAuthRequest("Login", "POST", "auth/login", {
          email: "user@example.com",
          password: "password123"
        })
      ]
    });

    // Add Metadata API
    collection.item.push({
      name: "Metadata",
      item: [
        {
          id: uuidv4(),
          name: "Get API Metadata",
          request: {
            method: "GET",
            header: [],
            url: {
              raw: "{{url}}/api/metadata",
              host: ["{{url}}"],
              path: ["api", "metadata"]
            },
            description: "Retrieve metadata about all available API endpoints"
          },
          response: []
        }
      ]
    });

    // Save the collection with standardized name
    await fs.writeFile(collectionFilePath, JSON.stringify(collection, null, 2));

    return collectionFilePath;
  } catch (error) {
    console.error('Error generating Postman collection:', error);
    throw error;
  }
}

async function getRouteFiles(): Promise<string[]> {
  const routesDir = path.join(process.cwd(), 'src', 'routes');
  const files = await fs.readdir(routesDir);
  return files.filter(file => file.endsWith('.ts'));
}

function capitalizeFirstLetter(string: string): string {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

async function createRequestsForTable(tableName: string): Promise<PostmanRequest[]> {
  const requests: PostmanRequest[] = [];
  const fields = await getTableFields(tableName);
  
  // Create a sample body based on fields
  const sampleBody: any = {};
  fields.forEach(field => {
    if (field.name !== 'id' && field.name !== 'createdAt' && field.name !== 'updatedAt') {
      sampleBody[field.name] = getSampleValueForType(field.type);
    }
  });
  
  // GET all items (with pagination)
  requests.push({
    id: uuidv4(),
    name: `Get All ${capitalizeFirstLetter(tableName)}`,
    request: {
      method: "GET",
      header: getAuthHeader(),
      url: {
        raw: `{{url}}/api/${tableName.toLowerCase()}?page=1&limit=10`,
        host: ["{{url}}"],
        path: ["api", tableName.toLowerCase()],
        query: [
          {
            key: "page",
            value: "1"
          },
          {
            key: "limit",
            value: "10"
          }
        ]
      },
      description: `Get all ${tableName} records with pagination`
    },
    response: []
  });
  
  // GET single item
  requests.push({
    id: uuidv4(),
    name: `Get ${capitalizeFirstLetter(tableName)} by ID`,
    request: {
      method: "GET",
      header: getAuthHeader(),
      url: {
        raw: `{{url}}/api/${tableName.toLowerCase()}/1`,
        host: ["{{url}}"],
        path: ["api", tableName.toLowerCase(), "1"]
      },
      description: `Get a single ${tableName} record by ID`
    },
    response: []
  });
  
  // POST create item
  requests.push({
    id: uuidv4(),
    name: `Create ${capitalizeFirstLetter(tableName)}`,
    request: {
      method: "POST",
      header: [...getAuthHeader(), getJsonHeader()],
      url: {
        raw: `{{url}}/api/${tableName.toLowerCase()}`,
        host: ["{{url}}"],
        path: ["api", tableName.toLowerCase()]
      },
      body: {
        mode: "raw",
        raw: JSON.stringify(sampleBody, null, 2),
        options: {
          raw: {
            language: "json"
          }
        }
      },
      description: `Create a new ${tableName} record`
    },
    response: []
  });
  
  // PATCH update item
  requests.push({
    id: uuidv4(),
    name: `Update ${capitalizeFirstLetter(tableName)}`,
    request: {
      method: "PATCH",
      header: [...getAuthHeader(), getJsonHeader()],
      url: {
        raw: `{{url}}/api/${tableName.toLowerCase()}/1`,
        host: ["{{url}}"],
        path: ["api", tableName.toLowerCase(), "1"]
      },
      body: {
        mode: "raw",
        raw: JSON.stringify(sampleBody, null, 2),
        options: {
          raw: {
            language: "json"
          }
        }
      },
      description: `Update an existing ${tableName} record`
    },
    response: []
  });
  
  // DELETE item
  requests.push({
    id: uuidv4(),
    name: `Delete ${capitalizeFirstLetter(tableName)}`,
    request: {
      method: "DELETE",
      header: getAuthHeader(),
      url: {
        raw: `{{url}}/api/${tableName.toLowerCase()}/1`,
        host: ["{{url}}"],
        path: ["api", tableName.toLowerCase(), "1"]
      },
      description: `Delete a ${tableName} record`
    },
    response: []
  });
  
  return requests;
}

function getAuthHeader() {
  return [
    {
      key: "Authorization",
      value: "Bearer {{authToken}}",
      type: "text"
    }
  ];
}

function getJsonHeader() {
  return {
    key: "Content-Type",
    value: "application/json",
    type: "text"
  };
}

function createAuthRequest(name: string, method: string, path: string, body: any): PostmanRequest {
  return {
    id: uuidv4(),
    name,
    request: {
      method,
      header: [getJsonHeader()],
      url: {
        raw: `{{url}}/api/${path}`,
        host: ["{{url}}"],
        path: ["api", ...path.split('/')]
      },
      body: {
        mode: "raw",
        raw: JSON.stringify(body, null, 2),
        options: {
          raw: {
            language: "json"
          }
        }
      }
    },
    response: []
  };
}

function getSampleValueForType(type: string): any {
  switch (type) {
    case 'string':
      return "sample text";
    case 'number':
      return 123;
    case 'boolean':
      return true;
    case 'date':
      return new Date().toISOString();
    case 'object':
      return { key: "value" };
    default:
      return "sample value";
  }
}

async function getTableFields(tableName: string): Promise<Array<{ name: string; type: string; isRequired: boolean }>> {
  try {
    const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');
    const schemaContent = await fs.readFile(schemaPath, 'utf8');
    
    const modelMatch = schemaContent.match(new RegExp(`model\\s+${tableName}\\s+{([^}]+)}`));
    
    if (!modelMatch) {
      return [];
    }

    const fieldLines = modelMatch[1].trim().split('\n');
    return fieldLines
      .map(line => {
        const parts = line.trim().split(/\s+/);
        if (parts.length < 2) return null;

        return {
          name: parts[0],
          type: mapPrismaTypeToJs(parts[1]),
          isRequired: !line.includes('?')
        };
      })
      .filter((field): field is { name: string; type: string; isRequired: boolean } => 
        field !== null && !field.name.startsWith('@')
      );
  } catch (error) {
    console.error('Error reading schema:', error);
    return [];
  }
}

function mapPrismaTypeToJs(prismaType: string): string {
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

// Function to clean up old collection files
async function cleanupOldCollectionFiles(projectName: string): Promise<void> {
  try {
    const dir = process.cwd();
    const files = await fs.readdir(dir);
    
    // Find old pattern collection files
    const oldCollectionPattern = /-api-collection\.json$/;
    
    for (const file of files) {
      if (oldCollectionPattern.test(file)) {
        try {
          await fs.unlink(path.join(dir, file));
          console.log(`🧹 Cleaned up old collection file: ${file}`);
        } catch (error) {
          // Ignore error if file cannot be deleted
          console.warn(`⚠️ Could not remove old collection file: ${file}`);
        }
      }
    }
  } catch (error) {
    // Ignore errors in cleanup
    console.warn('⚠️ Error during old collection file cleanup:', error);
  }
} 