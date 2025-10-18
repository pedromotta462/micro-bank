import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { Observable, throwError } from 'rxjs';

/**
 * Microservice Exception Filter
 * Handles errors in microservices and returns structured responses
 */
@Catch()
export class MicroserviceExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(MicroserviceExceptionFilter.name);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  catch(exception: unknown, host: ArgumentsHost): Observable<any> {
    const errorResponse = this.getErrorDetails(exception);

    // Log error with appropriate level
    this.logError(exception, errorResponse);

    // Return error to gateway (will be caught by RpcExceptionFilter there)
    return throwError(() => new RpcException(errorResponse));
  }

  /**
   * Extract error details from different exception types
   */
  private getErrorDetails(exception: unknown): {
    statusCode: number;
    message: string | string[];
    error: string;
    timestamp: string;
  } {
    const timestamp = new Date().toISOString();

    // Handle NestJS HttpException
    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      const status = exception.getStatus();

      if (typeof response === 'string') {
        return {
          statusCode: status,
          message: response,
          error: HttpStatus[status] || 'Error',
          timestamp,
        };
      }

      if (typeof response === 'object') {
        const resp = response as any;
        return {
          statusCode: status,
          message: resp.message || exception.message,
          error: resp.error || HttpStatus[status] || 'Error',
          timestamp,
        };
      }

      return {
        statusCode: status,
        message: exception.message,
        error: HttpStatus[status] || 'Error',
        timestamp,
      };
    }

    // Handle RpcException
    if (exception instanceof RpcException) {
      const error = exception.getError();
      if (typeof error === 'object') {
        return { ...(error as any), timestamp };
      }
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: String(error),
        error: 'RPC Error',
        timestamp,
      };
    }

    // Handle Prisma errors
    if (exception instanceof Error) {
      const prismaError = this.handlePrismaError(exception);
      if (prismaError) {
        return { ...prismaError, timestamp };
      }

      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: exception.message || 'Internal server error',
        error: exception.name || 'Error',
        timestamp,
      };
    }

    // Handle unknown errors
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'An unexpected error occurred',
      error: 'Unknown Error',
      timestamp,
    };
  }

  /**
   * Handle Prisma-specific errors
   */
  private handlePrismaError(error: Error): {
    statusCode: number;
    message: string;
    error: string;
  } | null {
    const errorName = error.constructor.name;

    // Prisma Client Known Request Error
    if (errorName === 'PrismaClientKnownRequestError') {
      const prismaError = error as any;
      
      // Extract field name from meta if available
      const fieldName = prismaError.meta?.target?.[0] || 'field';
      
      switch (prismaError.code) {
        case 'P2002':
          return {
            statusCode: HttpStatus.CONFLICT,
            message: `A record with this ${fieldName} already exists`,
            error: 'Conflict',
          };
        case 'P2025':
          return {
            statusCode: HttpStatus.NOT_FOUND,
            message: prismaError.meta?.cause || 'Record not found',
            error: 'Not Found',
          };
        case 'P2003':
          return {
            statusCode: HttpStatus.BAD_REQUEST,
            message: 'Foreign key constraint failed',
            error: 'Bad Request',
          };
        case 'P2014':
          return {
            statusCode: HttpStatus.BAD_REQUEST,
            message: 'Invalid relation constraint',
            error: 'Bad Request',
          };
        default:
          return {
            statusCode: HttpStatus.BAD_REQUEST,
            message: prismaError.message || 'Database operation failed',
            error: 'Database Error',
          };
      }
    }

    // Prisma Client Validation Error
    if (errorName === 'PrismaClientValidationError') {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Invalid data provided to database',
        error: 'Validation Error',
      };
    }

    // Prisma Client Initialization Error
    if (errorName === 'PrismaClientInitializationError') {
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Database connection error',
        error: 'Database Connection Error',
      };
    }

    return null;
  }

  /**
   * Log error with context
   */
  private logError(exception: unknown, errorResponse: any) {
    const { statusCode, message, error } = errorResponse;

    // Log based on severity
    if (statusCode >= 500) {
      this.logger.error(
        `💥 Microservice Error [${statusCode}]: ${message}`,
        JSON.stringify({ error, statusCode }, null, 2)
      );

      // Log stack trace for 5xx errors
      if (exception instanceof Error && process.env.NODE_ENV !== 'production') {
        this.logger.error(`Stack trace:\n${exception.stack}`);
      }
    } else if (statusCode >= 400) {
      this.logger.warn(
        `⚠️  Client Error [${statusCode}]: ${message}`,
        JSON.stringify({ error, statusCode }, null, 2)
      );
    } else {
      this.logger.log(`ℹ️  Exception [${statusCode}]: ${message}`);
    }
  }
}
