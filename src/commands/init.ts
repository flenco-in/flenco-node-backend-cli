#!/usr/bin/env node
import inquirer from 'inquirer';
import { promises as fs } from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface DBConfig {
  type: 'postgresql' | 'mysql';
  host: string;
  port: string;
  database: string;
  username: string;
  password: string;
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
}

async function promptDBCredentials(): Promise<DBConfig> {
  const dbConfig = await inquirer.prompt<DBAnswers>([
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
      message: (answers: DBAnswers) => `Enter database port (default ${answers.type === 'postgresql' ? '5432' : '3306'}):`,
      default: (answers: DBAnswers) => answers.type === 'postgresql' ? '5432' : '3306'
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

async function generateAppFile(): Promise<void> {
  const appContent = `
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { ZodError } from 'zod';
import routes from './routes';

// Load environment variables
dotenv.config();

// Initialize express app
const app = express();

// Global Types
export interface CustomError extends Error {
  statusCode?: number;
  status?: string;
}

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api', routes);

// Health check route
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Global Error Handler
app.use((err: CustomError, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);

  if (err instanceof ZodError) {
    return res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      errors: err.errors
    });
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  res.status(statusCode).json({
    status: 'error',
    message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// 404 Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    status: 'error',
    message: 'Route not found'
  });
});

export default app;
`;

  await fs.writeFile(path.join(process.cwd(), 'src', 'app.ts'), appContent);
}

async function generateServerFile(): Promise<void> {
  const serverContent = `
import app from './app';
import { PrismaClient } from '@prisma/client';

const PORT = process.env.PORT || 3000;

// Initialize Prisma Client
export const prisma = new PrismaClient();

const server = app.listen(PORT, () => {
  console.log(\`🚀 Server running on port \${PORT}\`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err: Error) => {
  console.error('UNHANDLED REJECTION! 💥 Shutting down...');
  console.error(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err: Error) => {
  console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.error(err.name, err.message);
  process.exit(1);
});
`;

  await fs.writeFile(path.join(process.cwd(), 'src', 'server.ts'), serverContent);
}

async function generateInitialRouteIndex(): Promise<void> {
  const routeIndexContent = `
import { Router } from 'express';

const router = Router();

export default router;
`;

  await fs.writeFile(path.join(process.cwd(), 'src', 'routes', 'index.ts'), routeIndexContent);
}

async function initProject() {
  try {
    console.log('🚀 Welcome to Flenco Backend Generator!');
    console.log('Initializing new project...');
    
    // Create project structure
    await generateProjectStructure();
    console.log('✅ Project structure created');

    // Get database credentials
    const dbConfig = await promptDBCredentials();
    
    // Generate configuration files
    await Promise.all([
      createPackageJson(dbConfig),
      generateTsConfig(),
      createEnvFile(dbConfig),
      generatePrismaSchema(dbConfig),
      generateAppFile(),
      generateServerFile(),
      generateInitialRouteIndex()
    ]);
    console.log('✅ Configuration files generated');

    console.log('\n📦 Project initialized successfully!');
    console.log('\nNext steps:');
    console.log('1. Run "npm install" to install dependencies');
    console.log('2. Verify database connection in .env file');
    console.log('3. Run "npx prisma generate" to generate Prisma Client');
    console.log('4. To generate API for a table, run:');
    console.log('   flenco-generate');
    console.log('\nHappy coding! 🎉');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

initProject();