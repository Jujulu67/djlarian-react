/**
 * Tests for /api/images route
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import fs from 'fs';

import { GET } from '../route';

// Mock dependencies
jest.mock('@/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    image: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock('@/lib/utils/getStorageConfig', () => ({
  shouldUseBlobStorage: jest.fn(() => false),
}));

jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readdirSync: jest.fn(),
  statSync: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('/api/images', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return images from local storage', async () => {
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readdirSync as jest.Mock).mockReturnValue(['test.webp']);
    (fs.statSync as jest.Mock).mockReturnValue({
      size: 1024,
      mtime: new Date('2024-01-01'),
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    // Response format: { images: [...] }
    expect(data.images).toBeDefined();
    expect(Array.isArray(data.images)).toBe(true);
  });

  it('should return empty array if uploads directory does not exist', async () => {
    (fs.existsSync as jest.Mock).mockReturnValue(false);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.images).toBeDefined();
    expect(Array.isArray(data.images)).toBe(true);
  });

  it('should return images from database when using blob storage', async () => {
    const { shouldUseBlobStorage } = await import('@/lib/utils/getStorageConfig');
    const { default: prisma } = await import('@/lib/prisma');

    (shouldUseBlobStorage as jest.Mock).mockReturnValue(true);
    process.env.BLOB_READ_WRITE_TOKEN = 'test-token';

    (prisma.image.findMany as jest.Mock).mockResolvedValue([
      {
        imageId: 'test-1',
        blobUrl: 'https://blob.vercel-storage.com/test-1.webp',
        blobUrlOriginal: null,
        size: 1024,
        contentType: 'image/webp',
        updatedAt: new Date(),
      },
    ]);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    // Response format: { images: [...] }
    expect(data.images).toBeDefined();
    expect(Array.isArray(data.images)).toBe(true);
  });
});
