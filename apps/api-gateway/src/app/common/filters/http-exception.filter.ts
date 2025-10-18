import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { RpcException } from '@nestjs/microservices';

/**
 * Global HTTP Exception Filter
 * Centralizes error handling and provides consistent error responses
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Determine status code and error message
    const { status, message, error, errors } = this.getErrorDetails(exception);

    // Prepare error response
    const errorResponse: any = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message,
      // Include validation errors if present
      ...(errors && { errors }),
      ...(process.env.NODE_ENV !== 'production' && {
        error: error || 'Internal Server Error',
        ...(exception instanceof Error && { stack: exception.stack }),
      }),
    };

    // Log error with appropriate level
    this.logError(exception, request, status, errorResponse);

    response.status(status).json(errorResponse);
  }

  /**
   * Extract error details from different exception types
   */
  private getErrorDetails(exception: unknown): {
    status: number;
    message: string | string[];
    error?: string;
    errors?: any[];
  } {
    // Handle NestJS HttpException
    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      const status = exception.getStatus();

      if (typeof response === 'string') {
        return { status, message: response };
      }

      if (typeof response === 'object') {
        const resp = response as any;
        
        // Log para debug
        this.logger.debug('Response object:', JSON.stringify(resp));
        
        // Handle Zod validation errors (from ZodValidationPipe)
        if (resp.errors && Array.isArray(resp.errors)) {
          this.logger.debug('Zod errors detected:', resp.errors);
          return {
            status,
            message: resp.message || 'Validation failed',
            error: resp.error || 'Bad Request',
            errors: resp.errors, // Preserve validation errors array
          };
        }
        
        return {
          status,
          message: resp.message || exception.message,
          error: resp.error,
        };
      }

      return { status, message: exception.message };
    }

    // Handle RPC Exception from microservices
    if (exception instanceof RpcException) {
      const error = exception.getError();
      if (typeof error === 'string') {
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: error,
        };
      }

      if (typeof error === 'object') {
        const err = error as any;
        return {
          status: err.statusCode || HttpStatus.INTERNAL_SERVER_ERROR,
          message: err.message || 'Microservice error',
          error: err.error,
        };
      }
    }

    // Handle standard Error
    if (exception instanceof Error) {
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: exception.message || 'Internal server error',
        error: exception.name,
      };
    }

    // Handle unknown errors
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'An unexpected error occurred',
      error: 'Unknown Error',
    };
  }

  /**
   * Log error with context
   */
  private logError(
    exception: unknown,
    request: Request,
    status: number,
    errorResponse: any
  ) {
    const user = (request as any).user;
    const context = {
      method: request.method,
      url: request.url,
      statusCode: status,
      userId: user?.userId,
      userEmail: user?.email,
      ip: request.ip,
      userAgent: request.headers['user-agent'],
    };

    // Log based on severity
    if (status >= 500) {
      this.logger.error(
        `💥 Server Error: ${errorResponse.message}`,
        JSON.stringify({ ...context, error: errorResponse }, null, 2)
      );
    } else if (status >= 400) {
      this.logger.warn(
        `⚠️  Client Error: ${errorResponse.message}`,
        JSON.stringify(context, null, 2)
      );
    } else {
      this.logger.log(
        `ℹ️  Exception: ${errorResponse.message}`,
        JSON.stringify(context, null, 2)
      );
    }

    // Log stack trace for 5xx errors in development
    if (status >= 500 && exception instanceof Error && process.env.NODE_ENV !== 'production') {
      this.logger.error(`Stack trace:\n${exception.stack}`);
    }
  }
}
