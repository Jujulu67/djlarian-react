/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { proxy } from '../proxy';

describe('proxy', () => {
  it('should return NextResponse.next()', async () => {
    const request = new NextRequest('http://localhost/admin/test');
    const response = await proxy(request);

    // NextResponse.next() returns a response that continues the request
    expect(response).toBeDefined();
    expect(response.status).toBe(200);
  });

  it('should handle different paths', async () => {
    const request1 = new NextRequest('http://localhost/admin/test');
    const request2 = new NextRequest('http://localhost/some/path');

    const response1 = await proxy(request1);
    const response2 = await proxy(request2);

    expect(response1).toBeDefined();
    expect(response2).toBeDefined();
  });
});
