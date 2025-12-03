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
    },
  },
}));

jest.mock('@/lib/api/rateLimiter', () => ({
  rateLimit: jest.fn(() => null),
}));

jest.mock('@/lib/blob', () => ({
  uploadToBlobWithCheck: jest.fn(),
  getBlobPublicUrl: jest.fn(),
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
  beforeEach(() => {
    jest.clearAllMocks();
    (fs.existsSync as jest.Mock).mockReturnValue(true);
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
});
