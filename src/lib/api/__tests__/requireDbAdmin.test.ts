/**
 * @jest-environment node
 */
import { auth } from '@/auth';
import prisma from '@/lib/prisma';

import { requireDbAdmin } from '../requireDbAdmin';

jest.mock('@/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: { user: { findUnique: jest.fn() } },
}));

const mockAuth = auth as unknown as jest.Mock;
const mockFindUnique = prisma.user.findUnique as unknown as jest.Mock;

describe('requireDbAdmin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects anonymous users with 401 Unauthorized without querying the database', async () => {
    mockAuth.mockResolvedValue(null);

    const { session, error } = await requireDbAdmin();

    expect(session).toBeNull();
    expect(error?.status).toBe(401);
    expect(await error?.json()).toEqual({ error: 'Unauthorized' });
    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  it('rejects users whose database role is not ADMIN with 403 Forbidden', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', email: 'u@test.com', role: 'ADMIN' } });
    mockFindUnique.mockResolvedValue({ role: 'USER' });

    const { error } = await requireDbAdmin();

    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { email: 'u@test.com' },
      select: { role: true },
    });
    expect(error?.status).toBe(403);
    expect(await error?.json()).toEqual({ error: 'Forbidden' });
  });

  it('rejects users missing from the database with 403', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', email: 'u@test.com' } });
    mockFindUnique.mockResolvedValue(null);

    const { error } = await requireDbAdmin();

    expect(error?.status).toBe(403);
  });

  it('accepts users whose database role is ADMIN, even if the session role is stale', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'a1', email: 'a@test.com', role: 'USER' } });
    mockFindUnique.mockResolvedValue({ role: 'ADMIN' });

    const { session, error } = await requireDbAdmin();

    expect(error).toBeNull();
    expect(session?.user.id).toBe('a1');
  });
});
