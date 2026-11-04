/**
 * Tests for /api/user/game-stats route
 * @jest-environment node
 */
import { POST } from '../route';

jest.mock('@/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: { error: jest.fn(), debug: jest.fn(), warn: jest.fn() },
}));

const request = (body: unknown) =>
  new Request('http://localhost/api/user/game-stats', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

describe('POST /api/user/game-stats', () => {
  let prisma: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    const { auth } = await import('@/auth');
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1', role: 'USER' } });
    prisma = (await import('@/lib/prisma')).default;
    prisma.user.findUnique.mockResolvedValue({ gameHighScore: 1000 });
    prisma.user.update.mockImplementation(({ data }: any) =>
      Promise.resolve({ gameHighScore: data.gameHighScore ?? 1000, hasDiscoveredCasino: false })
    );
  });

  it('returns 401 for a visitor', async () => {
    const { auth } = await import('@/auth');
    (auth as jest.Mock).mockResolvedValue(null);

    const response = await POST(request({ gameHighScore: 5000 }));

    expect(response.status).toBe(401);
  });

  it('saves a plausible new high score', async () => {
    const response = await POST(request({ gameHighScore: 5000 }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.updated).toBe(true);
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { gameHighScore: 5000 } })
    );
  });

  it('accepts the upper bound (10 000 000)', async () => {
    const response = await POST(request({ gameHighScore: 10_000_000 }));

    expect(response.status).toBe(200);
    expect(prisma.user.update).toHaveBeenCalled();
  });

  it.each([10_000_001, 1e12, -1, 12.5, '5000', null, Number.MAX_SAFE_INTEGER])(
    'rejects gameHighScore=%p with 400',
    async (gameHighScore) => {
      const response = await POST(request({ gameHighScore }));

      expect(response.status).toBe(400);
      expect(prisma.user.update).not.toHaveBeenCalled();
    }
  );

  it('rejects an invalid JSON body with 400', async () => {
    const response = await POST(request('not json'));

    expect(response.status).toBe(400);
  });

  it('still tracks casino discovery', async () => {
    const response = await POST(request({ hasDiscoveredCasino: true }));

    expect(response.status).toBe(200);
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { hasDiscoveredCasino: true } })
    );
  });
});
