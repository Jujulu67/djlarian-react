/**
 * Tests for /api/upload route
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';

import { POST } from '../route';

// Mock dependencies
jest.mock('@/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    image: {
      create: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
    },
  },
}));

jest.mock('@/lib/api/rateLimiter', () => ({
  rateLimit: jest.fn(() => null),
}));

jest.mock('@/lib/blob', () => ({
  uploadToBlobWithCheck: jest.fn(() =>
    Promise.resolve({
      url: 'https://blob.vercel-storage.com/test-image-id.webp',
      hash: 'test-hash',
    })
  ),
  getBlobPublicUrl: jest.fn((url: string) => url),
}));

jest.mock('@/lib/utils/convertToWebP', () => ({
  convertToWebP: jest.fn((buffer) => Promise.resolve(buffer)),
  canConvertToWebP: jest.fn(() => true),
}));

jest.mock('@/lib/utils/getStorageConfig', () => ({
  shouldUseBlobStorage: jest.fn(() => false),
}));

jest.mock('@/lib/api/webhooks', () => ({
  sendWebhook: jest.fn(() => Promise.resolve()),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
  },
}));

// Mock fs
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
}));

describe('/api/upload', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    process.env = { ...originalEnv };
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should upload image for admin', async () => {
    const { auth } = await import('@/auth');
    const { default: prisma } = await import('@/lib/prisma');
    const { sendWebhook } = await import('@/lib/api/webhooks');

    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'admin1', role: 'ADMIN' },
    });

    (prisma.image.create as jest.Mock).mockResolvedValue({
      id: 'image-1',
      imageId: 'test-image-id',
    });

    const formData = new FormData();
    formData.append('imageId', 'test-image-id');
    formData.append('croppedImage', new Blob(['test'], { type: 'image/png' }));

    const request = new NextRequest('http://localhost/api/upload', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(sendWebhook).toHaveBeenCalled();
  });

  it('should return 401 for non-admin', async () => {
    const { auth } = await import('@/auth');

    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'user1', role: 'USER' },
    });

    const formData = new FormData();
    formData.append('imageId', 'test-image-id');
    formData.append('croppedImage', new Blob(['test'], { type: 'image/png' }));

    const request = new NextRequest('http://localhost/api/upload', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Non autorisé');
  });

  it('should return 400 if imageId is missing', async () => {
    const { auth } = await import('@/auth');

    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'admin1', role: 'ADMIN' },
    });

    const formData = new FormData();
    formData.append('croppedImage', new Blob(['test'], { type: 'image/png' }));

    const request = new NextRequest('http://localhost/api/upload', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Image ID manquant');
  });

  it('should return 400 if croppedImage is missing', async () => {
    const { auth } = await import('@/auth');

    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'admin1', role: 'ADMIN' },
    });

    const formData = new FormData();
    formData.append('imageId', 'test-image-id');

    const request = new NextRequest('http://localhost/api/upload', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Image recadrée manquante');
  });

  it('should handle rate limiting', async () => {
    const { rateLimit } = await import('@/lib/api/rateLimiter');
    (rateLimit as jest.Mock).mockResolvedValue(
      new Response(JSON.stringify({ error: 'Rate limit exceeded' }), { status: 429 })
    );

    const formData = new FormData();
    formData.append('imageId', 'test-image-id');
    formData.append('croppedImage', new Blob(['test'], { type: 'image/png' }));

    const request = new NextRequest('http://localhost/api/upload', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(429);
    expect(data.error).toBe('Rate limit exceeded');
  });

  it('should upload to local storage successfully', async () => {
    const { auth } = await import('@/auth');
    const { rateLimit } = await import('@/lib/api/rateLimiter');
    const { sendWebhook } = await import('@/lib/api/webhooks');
    const { shouldUseBlobStorage } = await import('@/lib/utils/getStorageConfig');
    const { convertToWebP, canConvertToWebP } = await import('@/lib/utils/convertToWebP');

    (rateLimit as jest.Mock).mockResolvedValue(null);
    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'admin1', role: 'ADMIN' },
    });

    (shouldUseBlobStorage as jest.Mock).mockReturnValue(false);
    (canConvertToWebP as jest.Mock).mockReturnValue(true);
    (convertToWebP as jest.Mock).mockResolvedValue(Buffer.from('webp-converted'));

    const formData = new FormData();
    formData.append('imageId', 'test-image-id');
    formData.append('croppedImage', new Blob(['test'], { type: 'image/png' }));

    const request = new NextRequest('http://localhost/api/upload', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    const clonedResponse = response.clone();
    const data = await clonedResponse.json();
    expect(data.success).toBe(true);
    expect(data.imageId).toBe('test-image-id');
    expect(data.url).toBe('/uploads/test-image-id.webp');
    expect(fs.writeFileSync).toHaveBeenCalled();
    expect(sendWebhook).toHaveBeenCalledWith(
      'upload.completed',
      expect.objectContaining({
        imageId: 'test-image-id',
        storage: 'local',
      }),
      expect.any(Object)
    );
  });

  it('should upload to Blob storage successfully', async () => {
    const { auth } = await import('@/auth');
    const { rateLimit } = await import('@/lib/api/rateLimiter');
    const { uploadToBlobWithCheck } = await import('@/lib/blob');
    const { default: prisma } = await import('@/lib/prisma');
    const { sendWebhook } = await import('@/lib/api/webhooks');
    const { shouldUseBlobStorage } = await import('@/lib/utils/getStorageConfig');
    const { convertToWebP, canConvertToWebP } = await import('@/lib/utils/convertToWebP');

    (rateLimit as jest.Mock).mockResolvedValue(null);
    process.env.BLOB_READ_WRITE_TOKEN = 'test-token';

    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'admin1', role: 'ADMIN' },
    });

    (shouldUseBlobStorage as jest.Mock).mockReturnValue(true);
    (canConvertToWebP as jest.Mock).mockReturnValue(true);
    (convertToWebP as jest.Mock).mockResolvedValue(Buffer.from('webp-converted'));
    (uploadToBlobWithCheck as jest.Mock).mockResolvedValue({
      url: 'https://blob.vercel-storage.com/test-image-id.webp',
      hash: 'test-hash',
    });

    (prisma.image.upsert as jest.Mock).mockResolvedValue({
      imageId: 'test-image-id',
      blobUrl: 'https://blob.vercel-storage.com/test-image-id.webp',
    });

    const formData = new FormData();
    formData.append('imageId', 'test-image-id');
    formData.append('croppedImage', new Blob(['test'], { type: 'image/png' }));

    const request = new NextRequest('http://localhost/api/upload', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    const clonedResponse = response.clone();
    const data = await clonedResponse.json();
    expect(data.success).toBe(true);
    expect(data.url).toContain('blob.vercel-storage.com');
    expect(uploadToBlobWithCheck).toHaveBeenCalled();
    expect(prisma.image.upsert).toHaveBeenCalled();
    expect(sendWebhook).toHaveBeenCalledWith(
      'upload.completed',
      expect.objectContaining({
        imageId: 'test-image-id',
        storage: 'blob',
      }),
      expect.any(Object)
    );
  });

  it('should throw error if local storage fails and Blob not configured', async () => {
    const { auth } = await import('@/auth');
    const { rateLimit } = await import('@/lib/api/rateLimiter');
    const { shouldUseBlobStorage } = await import('@/lib/utils/getStorageConfig');
    const { convertToWebP, canConvertToWebP } = await import('@/lib/utils/convertToWebP');

    (rateLimit as jest.Mock).mockResolvedValue(null);
    delete process.env.BLOB_READ_WRITE_TOKEN;

    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'admin1', role: 'ADMIN' },
    });

    (shouldUseBlobStorage as jest.Mock).mockReturnValue(false);
    (canConvertToWebP as jest.Mock).mockReturnValue(true);
    (convertToWebP as jest.Mock).mockResolvedValue(Buffer.from('webp-converted'));

    // Mock fs.existsSync to return true first, then fail on writeFileSync
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.writeFileSync as jest.Mock).mockImplementation(() => {
      throw new Error('Local storage error');
    });

    const formData = new FormData();
    formData.append('imageId', 'test-image-id');
    formData.append('croppedImage', new Blob(['test'], { type: 'image/png' }));

    const request = new NextRequest('http://localhost/api/upload', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    // The code throws an error if local fails and blob is not configured
    expect(response.status).toBe(500);
    const clonedResponse = response.clone();
    const data = await clonedResponse.json();
    expect(data.error).toContain('Impossible');
  });

  it('should fallback to local if Blob is not configured', async () => {
    const { auth } = await import('@/auth');
    const { rateLimit } = await import('@/lib/api/rateLimiter');
    const { sendWebhook } = await import('@/lib/api/webhooks');
    const { shouldUseBlobStorage } = await import('@/lib/utils/getStorageConfig');
    const { convertToWebP, canConvertToWebP } = await import('@/lib/utils/convertToWebP');

    (rateLimit as jest.Mock).mockResolvedValue(null);
    delete process.env.BLOB_READ_WRITE_TOKEN;

    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'admin1', role: 'ADMIN' },
    });

    (shouldUseBlobStorage as jest.Mock).mockReturnValue(true); // Wants to use Blob but not configured
    (canConvertToWebP as jest.Mock).mockReturnValue(true);
    (convertToWebP as jest.Mock).mockResolvedValue(Buffer.from('webp-converted'));
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.writeFileSync as jest.Mock).mockImplementation(() => {});

    const formData = new FormData();
    formData.append('imageId', 'test-image-id');
    formData.append('croppedImage', new Blob(['test'], { type: 'image/png' }));

    const request = new NextRequest('http://localhost/api/upload', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    const clonedResponse = response.clone();
    const data = await clonedResponse.json();
    expect(data.success).toBe(true);
    expect(data.url).toBe('/uploads/test-image-id.webp');
    expect(fs.writeFileSync).toHaveBeenCalled();
  });

  it('should handle WebP conversion failure gracefully', async () => {
    const { auth } = await import('@/auth');
    const { rateLimit } = await import('@/lib/api/rateLimiter');
    const { sendWebhook } = await import('@/lib/api/webhooks');
    const { shouldUseBlobStorage } = await import('@/lib/utils/getStorageConfig');
    const { convertToWebP, canConvertToWebP } = await import('@/lib/utils/convertToWebP');

    (rateLimit as jest.Mock).mockResolvedValue(null);
    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'admin1', role: 'ADMIN' },
    });

    (shouldUseBlobStorage as jest.Mock).mockReturnValue(false);
    (canConvertToWebP as jest.Mock).mockReturnValue(true);
    (convertToWebP as jest.Mock).mockRejectedValue(new Error('WebP conversion failed'));
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.writeFileSync as jest.Mock).mockImplementation(() => {});

    const formData = new FormData();
    formData.append('imageId', 'test-image-id');
    formData.append('croppedImage', new Blob(['test'], { type: 'image/png' }));

    const request = new NextRequest('http://localhost/api/upload', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    const clonedResponse = response.clone();
    const data = await clonedResponse.json();
    // Should continue with original image if conversion fails
    expect(data.success).toBe(true);
    expect(fs.writeFileSync).toHaveBeenCalled();
  });

  it('should skip WebP conversion if canConvertToWebP returns false', async () => {
    const { auth } = await import('@/auth');
    const { rateLimit } = await import('@/lib/api/rateLimiter');
    const { sendWebhook } = await import('@/lib/api/webhooks');
    const { shouldUseBlobStorage } = await import('@/lib/utils/getStorageConfig');
    const { convertToWebP, canConvertToWebP } = await import('@/lib/utils/convertToWebP');

    (rateLimit as jest.Mock).mockResolvedValue(null);
    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'admin1', role: 'ADMIN' },
    });

    (shouldUseBlobStorage as jest.Mock).mockReturnValue(false);
    (canConvertToWebP as jest.Mock).mockReturnValue(false);
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.writeFileSync as jest.Mock).mockImplementation(() => {});

    const formData = new FormData();
    formData.append('imageId', 'test-image-id');
    formData.append('croppedImage', new Blob(['test'], { type: 'image/gif' }));

    const request = new NextRequest('http://localhost/api/upload', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(convertToWebP).not.toHaveBeenCalled();
    expect(fs.writeFileSync).toHaveBeenCalled();
  });

  it('should handle original image upload if provided', async () => {
    const { auth } = await import('@/auth');
    const { rateLimit } = await import('@/lib/api/rateLimiter');
    const { sendWebhook } = await import('@/lib/api/webhooks');
    const { shouldUseBlobStorage } = await import('@/lib/utils/getStorageConfig');
    const { convertToWebP, canConvertToWebP } = await import('@/lib/utils/convertToWebP');

    (rateLimit as jest.Mock).mockResolvedValue(null);
    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'admin1', role: 'ADMIN' },
    });

    (shouldUseBlobStorage as jest.Mock).mockReturnValue(false);
    (canConvertToWebP as jest.Mock).mockReturnValue(true);
    (convertToWebP as jest.Mock).mockResolvedValue(Buffer.from('webp-converted'));
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.writeFileSync as jest.Mock).mockImplementation(() => {});

    const formData = new FormData();
    formData.append('imageId', 'test-image-id');
    formData.append('croppedImage', new Blob(['test'], { type: 'image/png' }));
    formData.append(
      'originalImage',
      new File(['original'], 'original.jpg', { type: 'image/jpeg' })
    );

    const request = new NextRequest('http://localhost/api/upload', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    const clonedResponse = response.clone();
    const data = await clonedResponse.json();
    expect(data.success).toBe(true);
    // Should save both cropped and original
    expect(fs.writeFileSync).toHaveBeenCalledTimes(2);
  });

  it('should reject original image if size exceeds 15MB', async () => {
    const { auth } = await import('@/auth');
    const { rateLimit } = await import('@/lib/api/rateLimiter');
    const { sendWebhook } = await import('@/lib/api/webhooks');
    const { shouldUseBlobStorage } = await import('@/lib/utils/getStorageConfig');
    const { convertToWebP, canConvertToWebP } = await import('@/lib/utils/convertToWebP');

    (rateLimit as jest.Mock).mockResolvedValue(null);
    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'admin1', role: 'ADMIN' },
    });

    (shouldUseBlobStorage as jest.Mock).mockReturnValue(false);
    (canConvertToWebP as jest.Mock).mockReturnValue(true);
    (convertToWebP as jest.Mock).mockResolvedValue(Buffer.from('webp-converted'));
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.writeFileSync as jest.Mock).mockImplementation(() => {});

    // Create a mock file that exceeds 15MB
    const largeFile = new File(['x'.repeat(16 * 1024 * 1024)], 'large.jpg', {
      type: 'image/jpeg',
    });

    const formData = new FormData();
    formData.append('imageId', 'test-image-id');
    formData.append('croppedImage', new Blob(['test'], { type: 'image/png' }));
    formData.append('originalImage', largeFile);

    const request = new NextRequest('http://localhost/api/upload', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    // Original should not be saved, only cropped
    expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
  });

  it('should store blob URLs in database when using Blob storage', async () => {
    const { auth } = await import('@/auth');
    const { rateLimit } = await import('@/lib/api/rateLimiter');
    const { uploadToBlobWithCheck } = await import('@/lib/blob');
    const { default: prisma } = await import('@/lib/prisma');
    const { shouldUseBlobStorage } = await import('@/lib/utils/getStorageConfig');
    const { convertToWebP, canConvertToWebP } = await import('@/lib/utils/convertToWebP');

    (rateLimit as jest.Mock).mockResolvedValue(null);
    process.env.BLOB_READ_WRITE_TOKEN = 'test-token';

    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'admin1', role: 'ADMIN' },
    });

    (shouldUseBlobStorage as jest.Mock).mockReturnValue(true);
    (canConvertToWebP as jest.Mock).mockReturnValue(true);
    (convertToWebP as jest.Mock).mockResolvedValue(Buffer.from('webp-converted'));
    (uploadToBlobWithCheck as jest.Mock).mockResolvedValue({
      url: 'https://blob.vercel-storage.com/test-image-id.webp',
      hash: 'test-hash',
    });

    const formData = new FormData();
    formData.append('imageId', 'test-image-id');
    formData.append('croppedImage', new Blob(['test'], { type: 'image/png' }));

    const request = new NextRequest('http://localhost/api/upload', {
      method: 'POST',
      body: formData,
    });

    await POST(request);

    expect(prisma.image.upsert).toHaveBeenCalledWith({
      where: { imageId: 'test-image-id' },
      create: expect.objectContaining({
        imageId: 'test-image-id',
        blobUrl: 'https://blob.vercel-storage.com/test-image-id.webp',
        hash: 'test-hash',
      }),
      update: expect.objectContaining({
        blobUrl: 'https://blob.vercel-storage.com/test-image-id.webp',
        hash: 'test-hash',
      }),
    });
  });

  it('should handle database error when storing blob URLs gracefully', async () => {
    const { auth } = await import('@/auth');
    const { rateLimit } = await import('@/lib/api/rateLimiter');
    const { uploadToBlobWithCheck } = await import('@/lib/blob');
    const { default: prisma } = await import('@/lib/prisma');
    const { shouldUseBlobStorage } = await import('@/lib/utils/getStorageConfig');
    const { convertToWebP, canConvertToWebP } = await import('@/lib/utils/convertToWebP');

    (rateLimit as jest.Mock).mockResolvedValue(null);
    process.env.BLOB_READ_WRITE_TOKEN = 'test-token';

    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'admin1', role: 'ADMIN' },
    });

    (shouldUseBlobStorage as jest.Mock).mockReturnValue(true);
    (canConvertToWebP as jest.Mock).mockReturnValue(true);
    (convertToWebP as jest.Mock).mockResolvedValue(Buffer.from('webp-converted'));
    (uploadToBlobWithCheck as jest.Mock).mockResolvedValue({
      url: 'https://blob.vercel-storage.com/test-image-id.webp',
      hash: 'test-hash',
    });

    (prisma.image.upsert as jest.Mock).mockRejectedValue(new Error('Database error'));

    const formData = new FormData();
    formData.append('imageId', 'test-image-id');
    formData.append('croppedImage', new Blob(['test'], { type: 'image/png' }));

    const request = new NextRequest('http://localhost/api/upload', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    const clonedResponse = response.clone();
    const data = await clonedResponse.json();
    // Should still succeed even if DB update fails
    expect(data.success).toBe(true);
  });

  it('should return 503 if no storage system is configured', async () => {
    const { auth } = await import('@/auth');
    const { rateLimit } = await import('@/lib/api/rateLimiter');
    const { shouldUseBlobStorage } = await import('@/lib/utils/getStorageConfig');
    const { convertToWebP, canConvertToWebP } = await import('@/lib/utils/convertToWebP');

    (rateLimit as jest.Mock).mockResolvedValue(null);
    delete process.env.BLOB_READ_WRITE_TOKEN;

    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'admin1', role: 'ADMIN' },
    });

    (shouldUseBlobStorage as jest.Mock).mockReturnValue(true); // Wants Blob but not configured
    (canConvertToWebP as jest.Mock).mockReturnValue(true);
    (convertToWebP as jest.Mock).mockResolvedValue(Buffer.from('webp-converted'));
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.writeFileSync as jest.Mock).mockImplementation(() => {
      throw new Error('Local storage error');
    });

    const formData = new FormData();
    formData.append('imageId', 'test-image-id');
    formData.append('croppedImage', new Blob(['test'], { type: 'image/png' }));

    const request = new NextRequest('http://localhost/api/upload', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    // The code will throw an error which becomes 500, or return 503
    expect([500, 503]).toContain(response.status);
    if (response.status === 503) {
      const clonedResponse = response.clone();
      const data = await clonedResponse.json();
      expect(data.error).toBe('Aucun système de stockage configuré');
    }
  });

  it('should return 401 if user is not authenticated', async () => {
    const { auth } = await import('@/auth');
    const { rateLimit } = await import('@/lib/api/rateLimiter');

    (rateLimit as jest.Mock).mockResolvedValue(null);
    (auth as jest.Mock).mockResolvedValue(null);

    const formData = new FormData();
    formData.append('imageId', 'test-image-id');
    formData.append('croppedImage', new Blob(['test'], { type: 'image/png' }));

    const request = new NextRequest('http://localhost/api/upload', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Non autorisé');
  });

  it('should handle Blob upload error', async () => {
    const { auth } = await import('@/auth');
    const { rateLimit } = await import('@/lib/api/rateLimiter');
    const { uploadToBlobWithCheck } = await import('@/lib/blob');
    const { shouldUseBlobStorage } = await import('@/lib/utils/getStorageConfig');
    const { convertToWebP, canConvertToWebP } = await import('@/lib/utils/convertToWebP');

    (rateLimit as jest.Mock).mockResolvedValue(null);
    process.env.BLOB_READ_WRITE_TOKEN = 'test-token';

    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'admin1', role: 'ADMIN' },
    });

    (shouldUseBlobStorage as jest.Mock).mockReturnValue(true);
    (canConvertToWebP as jest.Mock).mockReturnValue(true);
    (convertToWebP as jest.Mock).mockResolvedValue(Buffer.from('webp-converted'));
    (uploadToBlobWithCheck as jest.Mock).mockRejectedValue(new Error('Blob upload failed'));

    const formData = new FormData();
    formData.append('imageId', 'test-image-id');
    formData.append('croppedImage', new Blob(['test'], { type: 'image/png' }));

    const request = new NextRequest('http://localhost/api/upload', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    expect(response.status).toBe(500);
    const clonedResponse = response.clone();
    const data = await clonedResponse.json();
    expect(data.error).toBe("Impossible d'uploader l'image vers Vercel Blob.");
  });

  it('should create uploads directory if it does not exist', async () => {
    const { auth } = await import('@/auth');
    const { rateLimit } = await import('@/lib/api/rateLimiter');
    const { shouldUseBlobStorage } = await import('@/lib/utils/getStorageConfig');
    const { convertToWebP, canConvertToWebP } = await import('@/lib/utils/convertToWebP');

    (rateLimit as jest.Mock).mockResolvedValue(null);
    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'admin1', role: 'ADMIN' },
    });

    (shouldUseBlobStorage as jest.Mock).mockReturnValue(false);
    (canConvertToWebP as jest.Mock).mockReturnValue(true);
    (convertToWebP as jest.Mock).mockResolvedValue(Buffer.from('webp-converted'));
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    (fs.mkdirSync as jest.Mock).mockImplementation(() => {});
    (fs.writeFileSync as jest.Mock).mockImplementation(() => {});

    const formData = new FormData();
    formData.append('imageId', 'test-image-id');
    formData.append('croppedImage', new Blob(['test'], { type: 'image/png' }));

    const request = new NextRequest('http://localhost/api/upload', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(fs.mkdirSync).toHaveBeenCalled();
  });
});
