/**
 * Tests for /api/live/submissions/upload-token route
 * @jest-environment node
 */
import { NextRequest } from 'next/server';

import { POST } from '../route';

jest.mock('@/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), debug: jest.fn(), info: jest.fn() },
}));

// handleUpload simulé : appelle onBeforeGenerateToken avec le pathname du body et renvoie son résultat
jest.mock('@vercel/blob/client', () => ({
  handleUpload: jest.fn(async ({ body, onBeforeGenerateToken }: any) => {
    const options = await onBeforeGenerateToken(body.payload.pathname, null, false);
    return { type: 'blob.generate-client-token', clientToken: 'client-token-xyz', options };
  }),
}));

const SECRET = 'vercel_blob_rw_SECRET_STORE_TOKEN';

function makeRequest(pathname: string) {
  return new NextRequest('http://localhost/api/live/submissions/upload-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'blob.generate-client-token',
      payload: {
        pathname,
        callbackUrl: 'http://localhost/cb',
        multipart: false,
        clientPayload: null,
      },
    }),
  });
}

describe('/api/live/submissions/upload-token', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    process.env.BLOB_READ_WRITE_TOKEN = SECRET;
    const { auth } = await import('@/auth');
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user1' } });
  });

  afterAll(() => {
    delete process.env.BLOB_READ_WRITE_TOKEN;
  });

  it('renvoie 401 pour un utilisateur non authentifié', async () => {
    const { auth } = await import('@/auth');
    (auth as jest.Mock).mockResolvedValue(null);

    const response = await POST(makeRequest('live-audio/live-audio-user1-1700000000000-abc.mp3'));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Non authentifié');
    expect(JSON.stringify(data)).not.toContain(SECRET);
  });

  it('renvoie 503 si Blob Storage n est pas configuré', async () => {
    delete process.env.BLOB_READ_WRITE_TOKEN;

    const response = await POST(makeRequest('live-audio/live-audio-user1-1700000000000-abc.mp3'));
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.error).toBe('Blob Storage non configuré');
  });

  it('renvoie 400 pour un JSON invalide', async () => {
    const request = new NextRequest('http://localhost/api/live/submissions/upload-token', {
      method: 'POST',
      body: 'pas du json',
    });
    const response = await POST(request);

    expect(response.status).toBe(400);
  });

  it("renvoie 400 pour le chemin d'un autre utilisateur", async () => {
    const response = await POST(makeRequest('live-audio/live-audio-user2-1700000000000-abc.mp3'));

    expect(response.status).toBe(400);
  });

  it('renvoie 400 pour un chemin hors du dossier live-audio', async () => {
    const response = await POST(makeRequest('avatars/live-audio-user1-1700000000000-abc.mp3'));

    expect(response.status).toBe(400);
  });

  it('renvoie 400 pour un chemin avec sous-dossier ou ..', async () => {
    expect((await POST(makeRequest('live-audio/live-audio-user1-/../x.mp3'))).status).toBe(400);
    expect((await POST(makeRequest('live-audio/live-audio-user1-a/b.mp3'))).status).toBe(400);
  });

  it('renvoie 400 pour une extension .svg', async () => {
    const response = await POST(makeRequest('live-audio/live-audio-user1-1700000000000-abc.svg'));

    expect(response.status).toBe(400);
  });

  it('renvoie 200 avec les restrictions pour un chemin valide, sans fuite du token du store', async () => {
    const response = await POST(makeRequest('live-audio/live-audio-user1-1700000000000-abc.mp3'));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.options.maximumSizeInBytes).toBe(128 * 1024 * 1024);
    expect(data.options.allowedContentTypes).toEqual(
      expect.arrayContaining(['audio/mpeg', 'audio/wav'])
    );
    expect(data.options.allowedContentTypes).not.toContain('image/svg+xml');
    expect(data.options.addRandomSuffix).toBe(false);
    expect(data.options.allowOverwrite).toBe(false);
    expect(JSON.stringify(data)).not.toContain(SECRET);
  });

  it('accepte une extension .wav', async () => {
    const response = await POST(makeRequest('live-audio/live-audio-user1-1700000000000-abc.wav'));

    expect(response.status).toBe(200);
  });
});
