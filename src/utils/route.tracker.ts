// src/utils/route.tracker.ts
import { promises as fs } from 'fs';
import path from 'path';

interface RouteInfo {
  name: string;
  path: string;
  requiresAuth: boolean;
  hasFileUploads: boolean;
}

export class RouteTracker {
  private static configPath = path.join(process.cwd(), 'src', 'routes', 'routes.json');

  static async addRoute(info: RouteInfo): Promise<void> {
    let routes: RouteInfo[] = [];
    
    try {
      const existing = await fs.readFile(this.configPath, 'utf8');
      routes = JSON.parse(existing);
    } catch (error) {
      // File doesn't exist yet, start with empty array
    }

    // Add new route if it doesn't exist
    if (!routes.find(r => r.name === info.name)) {
      routes.push(info);
      await fs.writeFile(this.configPath, JSON.stringify(routes, null, 2));
    }
  }

  static async getRoutes(): Promise<RouteInfo[]> {
    try {
      const content = await fs.readFile(this.configPath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      return [];
    }
  }
}