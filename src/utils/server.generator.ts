// src/utils/server.generator.ts
import { promises as fs } from 'fs';
import path from 'path';

export async function generateServerFile(): Promise<void> {
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