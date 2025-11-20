import { renderHook, act, waitFor } from '@testing-library/react';

import { logger } from '@/lib/logger';

import { useEditEvent } from '../useEditEvent';

// Mock dependencies
jest.mock('@/lib/logger', () => ({
  logger: {
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
  }),
}));

// Mock fetch
global.fetch = jest.fn();

describe('useEditEvent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  describe('saveEvent', () => {
    it('should create a new event when eventId is undefined', async () => {
      const mockResponse = { id: '1', title: 'Test Event' };
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const { result } = renderHook(() => useEditEvent());

      const eventData = {
        title: 'Test Event',
        description: 'Test Description',
        location: 'Test Location',
        startDate: '2024-01-01',
        status: 'UPCOMING' as const,
      };

      let savedResult;
      await act(async () => {
        savedResult = await result.current.saveEvent(undefined, eventData);
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData),
      });

      expect(savedResult).toEqual(mockResponse);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should update an existing event when eventId is provided', async () => {
      const mockResponse = { id: '1', title: 'Updated Event' };
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const { result } = renderHook(() => useEditEvent());

      const eventData = {
        title: 'Updated Event',
        description: 'Updated Description',
        location: 'Updated Location',
        startDate: '2024-01-01',
        status: 'UPCOMING' as const,
      };

      let savedResult;
      await act(async () => {
        savedResult = await result.current.saveEvent('1', eventData);
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/events/1', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData),
      });

      expect(savedResult).toEqual(mockResponse);
      expect(result.current.loading).toBe(false);
    });

    it('should handle API errors', async () => {
      const errorResponse = { error: 'Validation failed' };
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => errorResponse,
      });

      const { result } = renderHook(() => useEditEvent());

      const eventData = {
        title: 'Test Event',
        description: 'Test Description',
        location: 'Test Location',
        startDate: '2024-01-01',
        status: 'UPCOMING' as const,
      };

      await act(async () => {
        try {
          await result.current.saveEvent(undefined, eventData);
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
        }
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe('Validation failed');
    });

    it('should handle network errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useEditEvent());

      const eventData = {
        title: 'Test Event',
        description: 'Test Description',
        location: 'Test Location',
        startDate: '2024-01-01',
        status: 'UPCOMING' as const,
      };

      await act(async () => {
        try {
          await result.current.saveEvent(undefined, eventData);
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
        }
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe('Network error');
    });

    it('should set loading state during save', async () => {
      let resolveFetch: (value: any) => void;
      const fetchPromise = new Promise((resolve) => {
        resolveFetch = resolve;
      });

      (global.fetch as jest.Mock).mockReturnValueOnce(fetchPromise);

      const { result } = renderHook(() => useEditEvent());

      const eventData = {
        title: 'Test Event',
        description: 'Test Description',
        location: 'Test Location',
        startDate: '2024-01-01',
        status: 'UPCOMING' as const,
      };

      act(() => {
        result.current.saveEvent(undefined, eventData).catch(() => {});
      });

      expect(result.current.loading).toBe(true);

      await act(async () => {
        resolveFetch!({
          ok: true,
          json: async () => ({ id: '1' }),
        });
        await fetchPromise;
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });
  });

  describe('uploadImage', () => {
    it('should upload an image successfully', async () => {
      const mockResponse = { imageId: 'img-123' };
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const { result } = renderHook(() => useEditEvent());

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      let imageId;
      await act(async () => {
        imageId = await result.current.uploadImage(file);
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/upload', {
        method: 'POST',
        body: expect.any(FormData),
      });

      expect(imageId).toBe('img-123');
    });

    it('should handle upload errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 413,
        statusText: 'Payload Too Large',
        text: async () => 'File too large',
      });

      const { result } = renderHook(() => useEditEvent());

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      await act(async () => {
        try {
          await result.current.uploadImage(file);
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toContain('Payload Too Large');
        }
      });
    });

    it('should handle network errors during upload', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useEditEvent());

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      await act(async () => {
        try {
          await result.current.uploadImage(file);
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
        }
      });
    });
  });
});
