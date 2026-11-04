/**
 * Tests for /api/auth/signout route
 * @jest-environment node
 */
import { NextRequest } from 'next/server';

import * as route from '../route';

const { POST } = route;

const signOut = (cookie: string) =>
  POST(
    new NextRequest('http://localhost/api/auth/signout', {
      method: 'POST',
      headers: { cookie },
    })
  );

describe('/api/auth/signout', () => {
  it('supprime les cookies Auth.js, y compris un jeton découpé', async () => {
    const response = await signOut(
      'authjs.session-token.0=a; authjs.session-token.1=b; __Secure-authjs.csrf-token=c; ui=v3'
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });

    const cleared = response.cookies.getAll().map((c) => c.name);
    expect(cleared).toEqual(
      expect.arrayContaining([
        'authjs.session-token.0',
        'authjs.session-token.1',
        '__Secure-authjs.csrf-token',
      ])
    );
    expect(cleared).not.toContain('ui');
    expect(response.cookies.get('__Secure-authjs.csrf-token')?.secure).toBe(true);
  });

  it('garde les préférences (pas de Clear-Site-Data)', async () => {
    const response = await signOut('ui=v3');
    expect(response.headers.get('Clear-Site-Data')).toBeNull();
    expect(response.cookies.get('ui')).toBeUndefined();
  });

  it("n'expose pas de GET (déconnexion par simple lien)", () => {
    expect('GET' in route).toBe(false);
  });
});
