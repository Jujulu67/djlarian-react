import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

import { logger } from '@/lib/logger';

import {
  createErrorResponse as createErrorResponseHelper,
  createBadRequestResponse,
  createConflictResponse,
  createInternalErrorResponse,
} from './responseHelpers';

/**
 * Standard error codes for API responses
 */
export enum ApiErrorCode {
  BAD_REQUEST = 'BAD_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
}

/**
 * Handle and format API errors consistently
 */
export function handleApiError(error: unknown, context?: string): NextResponse {
  const errorContext = context ? `[${context}]` : '';

  // Zod validation errors
  if (error instanceof ZodError) {
    logger.error(`${errorContext} Validation error:`, error.flatten());
    return createBadRequestResponse('Validation failed', {
      fieldErrors: error.flatten().fieldErrors,
      formErrors: error.flatten().formErrors,
    });
  }

  // Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return handlePrismaError(error, errorContext);
  }

  if (error instanceof Prisma.PrismaClientUnknownRequestError) {
    logger.error(`${errorContext} Unknown Prisma error:`, error);
    return createInternalErrorResponse('Database error occurred', {
      message: (error as Error).message,
    });
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    logger.error(`${errorContext} Prisma validation error:`, error);
    return createBadRequestResponse('Invalid data provided', {
      message: (error as Error).message,
    });
  }

  // Standard Error objects
  if (error instanceof Error) {
    logger.error(`${errorContext} Error:`, error);
    return createInternalErrorResponse(error.message, {
      name: error.name,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }

  // Unknown error type
  logger.error(`${errorContext} Unknown error:`, error);
  return createInternalErrorResponse('An unexpected error occurred', {
    type: typeof error,
  });
}

/**
 * Handle Prisma-specific errors
 */
function handlePrismaError(
  error: Prisma.PrismaClientKnownRequestError,
  context: string
): NextResponse {
  switch (error.code) {
    case 'P2002': {
      // Unique constraint violation
      const fields = (error.meta?.target as string[]) ?? ['unknown field'];
      const fieldNames = fields.join(', ');
      logger.warn(`${context} Unique constraint violation on: ${fieldNames}`);
      return createConflictResponse(`A record with this ${fieldNames} already exists`, { fields });
    }

    case 'P2003': {
      // Foreign key constraint violation
      const field = (error.meta?.field_name as string) ?? 'unknown relation';
      logger.warn(`${context} Foreign key constraint violation on: ${field}`);

      // Provide user-friendly messages for common fields
      let userFriendlyMessage = `Invalid reference: ${field}`;
      if (field.includes('collectionId')) {
        userFriendlyMessage = 'The selected music collection does not exist.';
      } else if (field.includes('imageId')) {
        userFriendlyMessage = 'The selected image does not exist.';
      } else if (field.includes('userId')) {
        userFriendlyMessage = 'The selected user does not exist.';
      }

      return createBadRequestResponse(userFriendlyMessage, { field });
    }

    case 'P2025': {
      // Record not found
      logger.warn(`${context} Record not found`);
      return createErrorResponseHelper('Record not found', 404, undefined, ApiErrorCode.NOT_FOUND);
    }

    case 'P2014': {
      // Required relation violation
      const field = (error.meta?.field_name as string) ?? 'unknown field';
      logger.warn(`${context} Required relation violation on: ${field}`);
      return createBadRequestResponse(`Required relation missing: ${field}`, { field });
    }

    default: {
      logger.error(`${context} Prisma error (code ${error.code}):`, error);
      return createInternalErrorResponse('Database operation failed', {
        code: error.code,
        meta: error.meta,
      });
    }
  }
}
