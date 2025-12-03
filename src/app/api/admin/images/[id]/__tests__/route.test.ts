/**
 * Tests for /api/admin/images/[id] route
 * @jest-environment node
 */
import { NextRequest } from 'next/server';

import { DELETE } from '../route';

// Mock dependencies
jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
  },
}));

jest.mock('../../images/shared', () => ({
  removeImage: jest.fn(),
}));

describe('/api/admin/images/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should delete image successfully', async () => {
    const { removeImage } = await import('../../images/shared');
    (removeImage as jest.Mock).mockReturnValue(true);

    const request = new NextRequest('http://localhost/api/admin/images/img1', {
      method: 'DELETE',
    });

    const response = await DELETE(request, { params: Promise.resolve({ id: 'img1' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe('Image supprimée');
    expect(removeImage).toHaveBeenCalledWith('img1');
  });

  it('should return 404 if image not found', async () => {
    const { removeImage } = await import('../../images/shared');
    (removeImage as jest.Mock).mockReturnValue(false);

    const request = new NextRequest('http://localhost/api/admin/images/img1', {
      method: 'DELETE',
    });

    const response = await DELETE(request, { params: Promise.resolve({ id: 'img1' }) });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Image non trouvée');
  });

  it('should return 400 if id is missing', async () => {
    const request = new NextRequest('http://localhost/api/admin/images/', {
      method: 'DELETE',
    });

    const response = await DELETE(request, { params: Promise.resolve({ id: '' }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("ID d'image manquant");
  });

  it('should handle errors', async () => {
    const { removeImage } = await import('../../images/shared');
    (removeImage as jest.Mock).mockImplementation(() => {
      throw new Error('Database error');
    });

    const { logger } = await import('@/lib/logger');

    const request = new NextRequest('http://localhost/api/admin/images/img1', {
      method: 'DELETE',
    });

    const response = await DELETE(request, { params: Promise.resolve({ id: 'img1' }) });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Erreur serveur');
    expect(logger.error).toHaveBeenCalled();
  });
});
