import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';

export interface BaseController {
  create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
  getById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
  getAll(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
  update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
  delete(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
}

export interface SearchController {
  search(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
}

export interface ExportController {
  export(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
}