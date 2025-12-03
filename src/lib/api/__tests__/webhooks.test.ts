/**
 * Tests for webhooks
 * @jest-environment node
 */
import { sendWebhook } from '../webhooks';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    siteConfig: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock fetch
global.fetch = jest.fn();

describe('webhooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should send webhook when URL is configured', async () => {
    const { default: prisma } = await import('@/lib/prisma');
    (prisma.siteConfig.findUnique as jest.Mock).mockResolvedValue({
      value: 'https://webhook.example.com',
    });

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
    });

    await sendWebhook('music.created', { id: 'track-1' });

    expect(global.fetch).toHaveBeenCalledWith(
      'https://webhook.example.com',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
      })
    );
  });

  it('should not send webhook when URL is not configured', async () => {
    const { default: prisma } = await import('@/lib/prisma');
    (prisma.siteConfig.findUnique as jest.Mock).mockResolvedValue(null);

    await sendWebhook('music.created', { id: 'track-1' });

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should not send webhook when URL is empty', async () => {
    const { default: prisma } = await import('@/lib/prisma');
    (prisma.siteConfig.findUnique as jest.Mock).mockResolvedValue({
      value: '',
    });

    await sendWebhook('music.created', { id: 'track-1' });

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should handle webhook errors gracefully', async () => {
    const { default: prisma } = await import('@/lib/prisma');
    (prisma.siteConfig.findUnique as jest.Mock).mockResolvedValue({
      value: 'https://webhook.example.com',
    });

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      text: async () => 'Error message',
    });

    await sendWebhook('music.created', { id: 'track-1' });

    expect(global.fetch).toHaveBeenCalled();
  });

  it('should include metadata in webhook payload', async () => {
    const { default: prisma } = await import('@/lib/prisma');
    (prisma.siteConfig.findUnique as jest.Mock).mockResolvedValue({
      value: 'https://webhook.example.com',
    });

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
    });

    await sendWebhook('music.created', { id: 'track-1' }, { userId: 'user-1', ip: '127.0.0.1' });

    const callArgs = (global.fetch as jest.Mock).mock.calls[0];
    const body = JSON.parse(callArgs[1].body);

    expect(body.metadata).toBeDefined();
    expect(body.metadata.userId).toBe('user-1');
  });
});
