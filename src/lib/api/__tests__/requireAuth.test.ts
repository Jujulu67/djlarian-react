/**
 * @jest-environment node
 */
import { auth } from '@/auth';

import { INTERNAL_AUTH_HEADER, internalAuthHeaders } from '../internalAuth';
import { isInternalRequest, requireAdmin, requireAuth } from '../requireAuth';

jest.mock('@/auth', () => ({
  auth: jest.fn(),
}));

const mockAuth = auth as unknown as jest.Mock;

describe('requireAuth / requireAdmin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects anonymous users with 401', async () => {
    mockAuth.mockResolvedValue(null);

    const { session, error } = await requireAuth();

    expect(session).toBeNull();
    expect(error?.status).toBe(401);
  });

  it('accepts any logged-in user for requireAuth', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'USER' } });

    const { session, error } = await requireAuth();

    expect(error).toBeNull();
    expect(session?.user.id).toBe('u1');
  });

  it('rejects non-admin users with 403 for requireAdmin', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'USER' } });

    const { error } = await requireAdmin();

    expect(error?.status).toBe(403);
  });

  it('lets callers keep 401 for non-admin users', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'USER' } });

    const { error } = await requireAdmin({ nonAdminStatus: 401 });

    expect(error?.status).toBe(401);
  });

  it('lets callers keep their own status codes and message', async () => {
    mockAuth.mockResolvedValue(null);

    const { error } = await requireAdmin({ anonymousStatus: 403, message: 'Accès refusé' });

    expect(error?.status).toBe(403);
    await expect(error?.json()).resolves.toEqual({ error: 'Accès refusé' });
  });

  it('rejects anonymous users with 401 for requireAdmin', async () => {
    mockAuth.mockResolvedValue(null);

    const { error } = await requireAdmin();

    expect(error?.status).toBe(401);
  });

  it('accepts admins for requireAdmin', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'a1', role: 'ADMIN' } });

    const { session, error } = await requireAdmin();

    expect(error).toBeNull();
    expect(session?.user.role).toBe('ADMIN');
  });
});

describe('internal requests', () => {
  const originalSecret = process.env.NEXTAUTH_SECRET;

  beforeEach(() => {
    process.env.NEXTAUTH_SECRET = 'test-secret';
  });

  afterAll(() => {
    process.env.NEXTAUTH_SECRET = originalSecret;
  });

  it('accepts requests carrying the internal header', () => {
    const request = new Request('http://localhost/api/x', { headers: internalAuthHeaders() });

    expect(isInternalRequest(request)).toBe(true);
  });

  it('rejects requests with a wrong or missing header', () => {
    const wrong = new Request('http://localhost/api/x', {
      headers: { [INTERNAL_AUTH_HEADER]: 'nope' },
    });
    const missing = new Request('http://localhost/api/x');

    expect(isInternalRequest(wrong)).toBe(false);
    expect(isInternalRequest(missing)).toBe(false);
  });
});
