import { ApiResponse } from '../types';

export class ResponseHelper {
  /**
   * Creates a successful API response
   */
  public static success<T>(data?: T, message: string = 'Success'): ApiResponse<T> {
    return {
      success: true,
      data,
      message
    };
  }

  /**
   * Creates an error API response
   */
  public static error(message: string, error?: string): ApiResponse<never> {
    return {
      success: false,
      message,
      error
    };
  }

  /**
   * Creates a paginated response
   */
  public static paginated<T>(
    data: T[],
    page: number,
    limit: number,
    total: number
  ): ApiResponse<T[]> {
    const hasMore = (page * limit) < total;
    const totalPages = Math.ceil(total / limit);

    return {
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        hasMore,
        totalPages
      }
    };
  }

  /**
   * Standardizes error responses with proper HTTP status codes
   */
  public static standardError(
    error: any,
    defaultMessage: string = 'An error occurred'
  ): ApiResponse<never> {
    const message = error.message || defaultMessage;
    const statusCode = this.getStatusCode(error);

    return {
      success: false,
      message,
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    };
  }

  private static getStatusCode(error: any): number {
    // Common error types and their HTTP status codes
    if (error.name === 'ValidationError') return 400;
    if (error.code === 'UNIQUE constraint failed') return 409;
    if (error.name === 'UnauthorizedError') return 401;
    if (error.name === 'ForbiddenError') return 403;
    if (error.name === 'NotFoundError') return 404;

    return 500; // Default to 500 for unknown errors
  }
}