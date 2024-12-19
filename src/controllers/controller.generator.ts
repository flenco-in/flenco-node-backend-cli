// src/controllers/controller.generator.ts
import { promises as fs } from 'fs';
import path from 'path';

interface ControllerOptions {
  tableName: string;
}

export async function generateController({ tableName }: ControllerOptions): Promise<void> {
  const controllerContent = `
import { Request, Response } from 'express';
import { ${tableName}Service } from '../services/${tableName.toLowerCase()}.service';

export class ${tableName}Controller {
  private service: ${tableName}Service;

  constructor() {
    this.service = new ${tableName}Service();
  }

  getAll = async (req: Request, res: Response) => {
    try {
      const { 
        page, 
        limit, 
        sortBy, 
        sortOrder,
        search,
        status 
      } = req.query;

      const result = await this.service.findAll({
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc',
        search: search as string,
        status: status ? parseInt(status as string) : undefined
      });

      res.status(200).json({
        status: 'success',
        ...result
      });
    } catch (error: any) {
      res.status(400).json({
        status: 'error',
        message: error.message
      });
    }
  };

  getOne = async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const item = await this.service.findById(id);

      res.status(200).json({
        status: 'success',
        data: item
      });
    } catch (error: any) {
      res.status(404).json({
        status: 'error',
        message: error.message
      });
    }
  };

  create = async (req: Request, res: Response) => {
    try {
      const item = await this.service.create(req.body);

      res.status(201).json({
        status: 'success',
        data: item
      });
    } catch (error: any) {
      res.status(400).json({
        status: 'error',
        message: error.message
      });
    }
  };

  update = async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const item = await this.service.update(id, req.body);

      res.status(200).json({
        status: 'success',
        data: item
      });
    } catch (error: any) {
      res.status(404).json({
        status: 'error',
        message: error.message
      });
    }
  };

  delete = async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await this.service.delete(id);

      res.status(204).send();
    } catch (error: any) {
      res.status(404).json({
        status: 'error',
        message: error.message
      });
    }
  };

  // Example: Status update endpoint
  updateStatus = async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;

      const item = await this.service.updateStatus(id, status);

      res.status(200).json({
        status: 'success',
        data: item
      });
    } catch (error: any) {
      res.status(404).json({
        status: 'error',
        message: error.message
      });
    }
  };

  // Example: Bulk delete endpoint
  bulkDelete = async (req: Request, res: Response) => {
    try {
      const { ids } = req.body;
      await this.service.bulkDelete(ids);

      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({
        status: 'error',
        message: error.message
      });
    }
  };
}
`;

  const filePath = path.join(process.cwd(), 'src', 'controllers', `${tableName.toLowerCase()}.controller.ts`);
  await fs.writeFile(filePath, controllerContent);
}