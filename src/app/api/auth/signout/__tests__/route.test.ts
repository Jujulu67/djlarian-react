/**
 * Tests for /api/auth/signout route
 * @jest-environment node
 */
import { NextRequest } from 'next/server';

import * as route from '../route';

const { POST } = route;

describe('/api/auth/signout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should sign out user with POST', async () => {
    const request = new NextRequest('http://localhost/api/auth/signout', {
      method: 'POST',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    // Ne vide pas le localStorage (préférences) à la déconnexion
    expect(response.headers.get('Clear-Site-Data')).toBe('"cookies"');
  });

  it("n'expose pas de GET (déconnexion par simple lien)", () => {
    expect('GET' in route).toBe(false);
  });
});
