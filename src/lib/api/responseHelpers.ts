import { NextResponse } from 'next/server';

/**
 * Standard API response helpers
 * Provides consistent response formatting across all API routes
 */

export interface ApiSuccessResponse<T = unknown> {
  data: T;
  message?: string;
}

export interface ApiErrorResponse {
  error: string;
  details?: Record<string, unknown>;
  code?: string;
}

/**
 * Create a successful API response
 */
export function createSuccessResponse<T>(
  data: T,
  status: number = 200,
  message?: string
): NextResponse<ApiSuccessResponse<T>> {
  const response: ApiSuccessResponse<T> = { data };
  if (message) {
    response.message = message;
  }
  return NextResponse.json(response, { status });
}

/**
 * Create an error API response
 */
export function createErrorResponse(
  error: string,
  status: number = 400,
  details?: Record<string, unknown>,
  code?: string
): NextResponse<ApiErrorResponse> {
  const response: ApiErrorResponse = { error };
  if (details) {
    response.details = details;
  }
  if (code) {
    response.code = code;
  }
  return NextResponse.json(response, { status });
}

/**
 * Create a 201 Created response
 */
export function createCreatedResponse<T>(
  data: T,
  message?: string
): NextResponse<ApiSuccessResponse<T>> {
  return createSuccessResponse(data, 201, message);
}

/**
 * Create a 400 Bad Request response
 */
export function createBadRequestResponse(
  error: string,
  details?: Record<string, unknown>
): NextResponse<ApiErrorResponse> {
  return createErrorResponse(error, 400, details, 'BAD_REQUEST');
}

/**
 * Create a 401 Unauthorized response
 */
export function createUnauthorizedResponse(
  error: string = 'Unauthorized'
): NextResponse<ApiErrorResponse> {
  return createErrorResponse(error, 401, undefined, 'UNAUTHORIZED');
}

/**
 * Create a 403 Forbidden response
 */
export function createForbiddenResponse(
  error: string = 'Forbidden'
): NextResponse<ApiErrorResponse> {
  return createErrorResponse(error, 403, undefined, 'FORBIDDEN');
}

/**
 * Create a 404 Not Found response
 */
export function createNotFoundResponse(
  error: string = 'Resource not found'
): NextResponse<ApiErrorResponse> {
  return createErrorResponse(error, 404, undefined, 'NOT_FOUND');
}

/**
 * Create a 409 Conflict response
 */
export function createConflictResponse(
  error: string,
  details?: Record<string, unknown>
): NextResponse<ApiErrorResponse> {
  return createErrorResponse(error, 409, details, 'CONFLICT');
}

/**
 * Create a 500 Internal Server Error response
 */
export function createInternalErrorResponse(
  error: string = 'Internal server error',
  details?: Record<string, unknown>
): NextResponse<ApiErrorResponse> {
  return createErrorResponse(error, 500, details, 'INTERNAL_ERROR');
}

