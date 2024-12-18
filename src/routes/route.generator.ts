// src/routes/route.generator.ts
import { promises as fs } from 'fs';
import path from 'path';

interface RouteOptions {
  tableName: string;
  fields: Array<{ name: string; type: string; isRequired: boolean }>;
  requiresAuth: boolean;
  hasFileUploads: boolean;
}

async function generateRouteIndexFile(): Promise<void> {
  // First, read all route files in the directory
  const routesDir = path.join(process.cwd(), 'src', 'routes');
  const files = await fs.readdir(routesDir);
  
  // Filter for route files (exclude index.ts and non-route files)
  const routeFiles = files.filter(file => 
    file.endsWith('.route.ts') && file !== 'index.ts'
  );

  // Generate imports and route registrations
  const imports = routeFiles.map(file => {
    const routeName = file.replace('.route.ts', '');
    // Remove .ts extension from import path
    return `import ${routeName}Route from './${routeName}.route';`;
  }).join('\n');

  const routeRegistrations = routeFiles.map(file => {
    const routeName = file.replace('.route.ts', '');
    return `router.use('/${routeName}', ${routeName}Route);`;
  }).join('\n');

  const indexContent = `
import { Router } from 'express';
${imports}

const router = Router();

// Register routes
${routeRegistrations}

export default router;
`;

  await fs.writeFile(path.join(routesDir, 'index.ts'), indexContent);
}

export async function generateRoute(options: RouteOptions) {
  const { tableName, fields, requiresAuth, hasFileUploads } = options;
  
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

const router = Router();
const controller = new ${tableName}Controller();

// Define field validation schemas
const fields = ${JSON.stringify(fields, null, 2)};
const createSchema = BaseValidation.generateCreateSchema(fields);
const updateSchema = BaseValidation.generateUpdateSchema(fields);

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