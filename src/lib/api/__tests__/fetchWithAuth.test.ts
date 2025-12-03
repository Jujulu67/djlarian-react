/**
 * Tests for fetchWithAuth
 */
import { signOut } from 'next-auth/react';

import { fetchWithAuth, isAuthError, getErrorMessage } from '../fetchWithAuth';

// Mock dependencies
jest.mock('next-auth/react', () => ({
  signOut: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();

describe('fetchWithAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  it('should return response for successful request', async () => {
    const mockResponse = { ok: true, status: 200 };
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

    const response = await fetchWithAuth('/api/test');

    expect(response).toBe(mockResponse);
    expect(global.fetch).toHaveBeenCalledWith('/api/test', {
      credentials: 'include',
    });
  });

  it('should retry on 401 error', async () => {
    const mockSessionResponse = { ok: true, status: 200 };
    const mockRetryResponse = { ok: true, status: 200 };

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: false, status: 401 })
      .mockResolvedValueOnce(mockSessionResponse)
      .mockResolvedValueOnce(mockRetryResponse);

    const response = await fetchWithAuth('/api/test', {}, 1);

    expect(global.fetch).toHaveBeenCalledTimes(3);
    expect(response).toBe(mockRetryResponse);
  });

  it('should sign out if refresh fails', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: false, status: 401 })
      .mockResolvedValueOnce({ ok: false, status: 401 });

    await fetchWithAuth('/api/test', {}, 1);

    expect(signOut).toHaveBeenCalledWith({ callbackUrl: '/' });
  });

  it('should include credentials in options', async () => {
    const mockResponse = { ok: true, status: 200 };
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

    await fetchWithAuth('/api/test', { method: 'POST' });

    expect(global.fetch).toHaveBeenCalledWith('/api/test', {
      method: 'POST',
      credentials: 'include',
    });
  });
});

describe('isAuthError', () => {
  it('should return true for 401 status', () => {
    const response = { status: 401 } as Response;
    expect(isAuthError(response)).toBe(true);
  });

  it('should return true for 403 status', () => {
    const response = { status: 403 } as Response;
    expect(isAuthError(response)).toBe(true);
  });

  it('should return false for other statuses', () => {
    const response = { status: 200 } as Response;
    expect(isAuthError(response)).toBe(false);
  });
});

describe('getErrorMessage', () => {
  it('should extract error message from JSON response', async () => {
    const mockJson = jest.fn().mockResolvedValue({ error: 'Test error' });
    const response = {
      json: mockJson,
      statusText: 'Bad Request',
    } as unknown as Response;

    const error = await getErrorMessage(response);

    expect(error).toBe('Test error');
  });

  it('should fallback to default message if no error in JSON', async () => {
    const mockJson = jest.fn().mockResolvedValue({});
    const response = {
      json: mockJson,
      statusText: 'Unauthorized',
    } as unknown as Response;

    const error = await getErrorMessage(response);

    // Function returns default message when no error field in JSON
    expect(error).toBe("Erreur d'authentification");
  });

  it('should handle JSON parse errors', async () => {
    const mockJson = jest.fn().mockRejectedValue(new Error('Parse error'));
    const response = {
      json: mockJson,
      statusText: 'Server Error',
    } as unknown as Response;

    const error = await getErrorMessage(response);

    // Should fallback to statusText or default message
    expect(error).toBeTruthy();
    expect(typeof error).toBe('string');
  });
});
