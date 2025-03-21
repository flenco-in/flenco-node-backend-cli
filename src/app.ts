// src/app.ts
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

app.use('/api', routes);

// Health check route
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Global Error Handler - must have 4 parameters for Express to recognize as error handler
app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  
  if (err instanceof ZodError) {
    res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      errors: err.errors
    });
    return;
  }
  
  const error = err as CustomError;
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal server error';
  
  res.status(statusCode).json({
    status: 'error',
    message,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
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