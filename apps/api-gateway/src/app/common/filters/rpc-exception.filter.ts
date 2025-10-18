import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { Observable, throwError } from 'rxjs';

/**
 * RPC Exception Filter for Microservices
 * Handles errors from RabbitMQ microservices
 */
@Catch(RpcException)
export class RpcExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(RpcExceptionFilter.name);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  catch(exception: RpcException, host: ArgumentsHost): Observable<any> {
    const error = exception.getError();

    // Parse error from microservice
    const errorResponse = this.parseRpcError(error);

    // Log the RPC error
    this.logger.error(
      `🔴 RPC Error: ${errorResponse.message}`,
      JSON.stringify(errorResponse, null, 2)
    );

    // Return formatted error to gateway
    return throwError(() => errorResponse);
  }

  /**
   * Parse RPC error into structured format
   */
  private parseRpcError(error: any): {
    statusCode: number;
    message: string;
    error: string;
  } {
    if (typeof error === 'string') {
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error,
        error: 'RPC Error',
      };
    }

    if (typeof error === 'object') {
      return {
        statusCode: error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message || 'Microservice error',
        error: error.error || 'RPC Error',
      };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Unknown RPC error',
      error: 'RPC Error',
    };
  }
}
