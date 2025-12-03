/**
 * Tests for /api/images/[imageId] route
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import fs from 'fs';

import { GET } from '../route';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    image: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('@/lib/utils/getStorageConfig', () => ({
  shouldUseBlobStorage: jest.fn(() => false),
}));

jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('/api/images/[imageId]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 400 if imageId is missing', async () => {
    const request = new NextRequest('http://localhost/api/images/');
    const response = await GET(request, { params: Promise.resolve({ imageId: '' }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Image ID manquant');
  });

  it('should return image from local storage', async () => {
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue(Buffer.from('image-data'));

    const request = new NextRequest('http://localhost/api/images/test-id');
    const response = await GET(request, { params: Promise.resolve({ imageId: 'test-id' }) });

    expect(response.status).toBe(200);
  });

  it('should return 404 if image not found locally', async () => {
    (fs.existsSync as jest.Mock).mockReturnValue(false);

    const request = new NextRequest('http://localhost/api/images/test-id');
    const response = await GET(request, { params: Promise.resolve({ imageId: 'test-id' }) });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Image non trouvée');
  });

  it('should return image from database when using blob storage', async () => {
    const { shouldUseBlobStorage } = await import('@/lib/utils/getStorageConfig');
    const { default: prisma } = await import('@/lib/prisma');

    (shouldUseBlobStorage as jest.Mock).mockReturnValue(true);
    process.env.BLOB_READ_WRITE_TOKEN = 'test-token';

    (prisma.image.findUnique as jest.Mock).mockResolvedValue({
      blobUrl: 'https://blob.vercel-storage.com/test-id.webp',
      blobUrlOriginal: null,
    });

    const request = new NextRequest('http://localhost/api/images/test-id');
    const response = await GET(request, { params: Promise.resolve({ imageId: 'test-id' }) });

    expect(response.status).toBe(302);
  });

  it('should return original image when original=true', async () => {
    const { shouldUseBlobStorage } = await import('@/lib/utils/getStorageConfig');
    const { default: prisma } = await import('@/lib/prisma');

    (shouldUseBlobStorage as jest.Mock).mockReturnValue(true);
    process.env.BLOB_READ_WRITE_TOKEN = 'test-token';

    (prisma.image.findUnique as jest.Mock).mockResolvedValue({
      blobUrl: 'https://blob.vercel-storage.com/test-id.webp',
      blobUrlOriginal: 'https://blob.vercel-storage.com/test-id-ori.webp',
    });

    const request = new NextRequest('http://localhost/api/images/test-id?original=true');
    const response = await GET(request, { params: Promise.resolve({ imageId: 'test-id' }) });

    expect(response.status).toBe(302);
  });
});
