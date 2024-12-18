
import { Response } from 'express';

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
    totalItems: number;
  };
}

export class ResponseUtil {
  static success<T>(res: Response, data: T, statusCode = 200) {
    return res.status(statusCode).json({
      status: 'success',
      data
    });
  }

  static error(res: Response, message: string, statusCode = 500) {
    return res.status(statusCode).json({
      status: 'error',
      message
    });
  }

  static paginate<T>(
    res: Response,
    data: T[],
    page: number,
    limit: number,
    total: number
  ) {
    const totalPages = Math.ceil(total / limit);

    return res.status(200).json({
      status: 'success',
      data,
      pagination: {
        page,
        limit,
        totalPages,
        totalItems: total
      }
    });
  }
}
