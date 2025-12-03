/**
 * Tests for /api/admin/config/default route
 * @jest-environment node
 */
import { GET } from '../route';

// Mock dependencies
jest.mock('@/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
  },
}));

jest.mock('@/config/defaults', () => ({
  defaultConfigs: {
    general: {
      siteName: 'Test Site',
      siteDescription: 'Test Description',
      contactEmail: 'test@example.com',
      timeZone: 'UTC',
      dateFormat: 'YYYY-MM-DD',
    },
    appearance: {
      primaryColor: '#000000',
      secondaryColor: '#ffffff',
      darkMode: 'true',
      animationsEnabled: 'true',
      logoUrl: '',
      faviconUrl: '',
    },
  },
}));

describe('/api/admin/config/default', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return default configs for admin user', async () => {
    const { auth } = await import('@/auth');
    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'admin1', role: 'ADMIN' },
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toBeDefined();
    expect(data.general).toBeDefined();
    expect(data.appearance).toBeDefined();
    expect(data.appearance.darkMode).toBe(true);
    expect(data.appearance.animationsEnabled).toBe(true);
  });

  it('should return 401 for non-admin user', async () => {
    const { auth } = await import('@/auth');
    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'user1', role: 'USER' },
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Non autorisé');
  });

  it('should return 401 for unauthenticated user', async () => {
    const { auth } = await import('@/auth');
    (auth as jest.Mock).mockResolvedValue(null);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Non autorisé');
  });

  it('should handle errors', async () => {
    const { auth } = await import('@/auth');
    (auth as jest.Mock).mockRejectedValue(new Error('Auth error'));

    const { logger } = await import('@/lib/logger');

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain('Erreur serveur');
    expect(logger.error).toHaveBeenCalled();
  });
});
