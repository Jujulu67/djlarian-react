/**
 * Tests for /api/profile/upload-avatar route
 * @jest-environment node
 */
import { NextRequest } from 'next/server';

import { POST } from '../route';

// Mock dependencies
jest.mock('@/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    image: {
      upsert: jest.fn(),
    },
    user: {
      update: jest.fn(),
    },
  },
}));

jest.mock('@/lib/blob', () => ({
  uploadToBlobWithCheck: jest.fn(),
}));

jest.mock('@/lib/utils/convertToWebP', () => ({
  convertToWebP: jest.fn(),
  canConvertToWebP: jest.fn(() => true),
}));

jest.mock('@/lib/utils/getStorageConfig', () => ({
  shouldUseBlobStorage: jest.fn(() => false),
}));

jest.mock('fs', () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('/api/profile/upload-avatar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 401 for unauthenticated user', async () => {
    const { auth } = await import('@/auth');
    (auth as jest.Mock).mockResolvedValue(null);

    const formData = new FormData();
    const request = new NextRequest('http://localhost/api/profile/upload-avatar', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Non autorisé');
  });

  it('should return 400 if no image provided', async () => {
    const { auth } = await import('@/auth');
    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'user1', role: 'USER' },
    });

    const formData = new FormData();
    const request = new NextRequest('http://localhost/api/profile/upload-avatar', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Aucune image fournie');
  });
});
