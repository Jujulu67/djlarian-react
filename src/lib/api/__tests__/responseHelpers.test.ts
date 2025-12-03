/**
 * Tests for responseHelpers
 * @jest-environment node
 */
import {
  createSuccessResponse,
  createErrorResponse,
  createCreatedResponse,
  createBadRequestResponse,
  createUnauthorizedResponse,
  createForbiddenResponse,
  createNotFoundResponse,
  createConflictResponse,
  createInternalErrorResponse,
} from '../responseHelpers';

describe('responseHelpers', () => {
  describe('createSuccessResponse', () => {
    it('should create success response with data', async () => {
      const response = createSuccessResponse({ id: '1', name: 'Test' });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toEqual({ id: '1', name: 'Test' });
    });

    it('should include message when provided', async () => {
      const response = createSuccessResponse({ id: '1' }, 200, 'Success message');
      const data = await response.json();

      expect(data.message).toBe('Success message');
    });

    it('should allow custom status code', async () => {
      const response = createSuccessResponse({ id: '1' }, 201);
      expect(response.status).toBe(201);
    });
  });

  describe('createErrorResponse', () => {
    it('should create error response', async () => {
      const response = createErrorResponse('Error message');
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Error message');
    });

    it('should include details when provided', async () => {
      const response = createErrorResponse('Error', 400, { field: 'value' });
      const data = await response.json();

      expect(data.details).toEqual({ field: 'value' });
    });

    it('should include code when provided', async () => {
      const response = createErrorResponse('Error', 400, undefined, 'ERROR_CODE');
      const data = await response.json();

      expect(data.code).toBe('ERROR_CODE');
    });
  });

  describe('createCreatedResponse', () => {
    it('should create 201 response', async () => {
      const response = createCreatedResponse({ id: '1' }, 'Created');
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.data).toEqual({ id: '1' });
      expect(data.message).toBe('Created');
    });
  });

  describe('createBadRequestResponse', () => {
    it('should create 400 response with BAD_REQUEST code', async () => {
      const response = createBadRequestResponse('Bad request');
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Bad request');
      expect(data.code).toBe('BAD_REQUEST');
    });
  });

  describe('createUnauthorizedResponse', () => {
    it('should create 401 response with UNAUTHORIZED code', async () => {
      const response = createUnauthorizedResponse('Unauthorized');
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
      expect(data.code).toBe('UNAUTHORIZED');
    });

    it('should use default message when not provided', async () => {
      const response = createUnauthorizedResponse();
      const data = await response.json();

      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('createForbiddenResponse', () => {
    it('should create 403 response with FORBIDDEN code', async () => {
      const response = createForbiddenResponse('Forbidden');
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Forbidden');
      expect(data.code).toBe('FORBIDDEN');
    });
  });

  describe('createNotFoundResponse', () => {
    it('should create 404 response with NOT_FOUND code', async () => {
      const response = createNotFoundResponse('Not found');
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Not found');
      expect(data.code).toBe('NOT_FOUND');
    });
  });

  describe('createConflictResponse', () => {
    it('should create 409 response with CONFLICT code', async () => {
      const response = createConflictResponse('Conflict', { field: 'value' });
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toBe('Conflict');
      expect(data.code).toBe('CONFLICT');
      expect(data.details).toEqual({ field: 'value' });
    });
  });

  describe('createInternalErrorResponse', () => {
    it('should create 500 response with INTERNAL_ERROR code', async () => {
      const response = createInternalErrorResponse('Internal error', { stack: 'trace' });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal error');
      expect(data.code).toBe('INTERNAL_ERROR');
      expect(data.details).toEqual({ stack: 'trace' });
    });

    it('should use default message when not provided', async () => {
      const response = createInternalErrorResponse();
      const data = await response.json();

      expect(data.error).toBe('Internal server error');
    });
  });
});
