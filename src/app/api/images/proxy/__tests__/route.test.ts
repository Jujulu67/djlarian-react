/**
 * Tests for /api/images/proxy route
 * @jest-environment node
 */
import { NextRequest } from 'next/server';

import { GET } from '../route';

// Mock fetch
global.fetch = jest.fn();

describe('/api/images/proxy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should proxy image from allowed domain', async () => {
    const mockImageData = new Uint8Array([1, 2, 3, 4, 5]);
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      headers: {
        get: jest.fn().mockReturnValue('image/jpeg'),
      },
      arrayBuffer: jest.fn().mockResolvedValue(mockImageData.buffer),
    });

    const request = new NextRequest(
      'http://localhost/api/images/proxy?url=https://lh3.googleusercontent.com/image.jpg',
      {
        method: 'GET',
      }
    );

    const response = await GET(request);
    const buffer = await response.arrayBuffer();

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('image/jpeg');
    expect(new Uint8Array(buffer)).toEqual(mockImageData);
  });

  it.each([
    [
      'should return 400 if url is missing',
      'http://localhost/api/images/proxy',
      400,
      'URL manquante',
    ],
    [
      'should return 400 if url is invalid',
      'http://localhost/api/images/proxy?url=invalid-url',
      400,
      'URL invalide',
    ],
    [
      'should return 403 for unauthorized domain',
      'http://localhost/api/images/proxy?url=https://evil.com/image.jpg',
      403,
      'Domaine non autorisé',
    ],
  ])('%s', async (_label, url, status, error) => {
    const request = new NextRequest(url, {
      method: 'GET',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(status);
    expect(data.error).toBe(error);
  });

  it('should handle fetch errors', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 404,
    });

    const request = new NextRequest(
      'http://localhost/api/images/proxy?url=https://lh3.googleusercontent.com/image.jpg',
      {
        method: 'GET',
      }
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toContain('Erreur lors du téléchargement');
  });
});
