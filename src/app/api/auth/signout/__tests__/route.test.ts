/**
 * Tests for /api/auth/signout route
 * @jest-environment node
 */
import { NextRequest } from 'next/server';

import { GET, POST } from '../route';

describe('/api/auth/signout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should sign out user with GET', async () => {
    const request = new NextRequest('http://localhost/api/auth/signout', {
      method: 'GET',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('should sign out user with POST', async () => {
    const request = new NextRequest('http://localhost/api/auth/signout', {
      method: 'POST',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });
});
