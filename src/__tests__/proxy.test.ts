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

  it("mémorise ?ui=v2 dans un cookie et redirige vers l'URL sans le paramètre", async () => {
    const request = new NextRequest('http://localhost/music?ui=v2&page=2');
    const response = await proxy(request);

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost/music?page=2');
    expect(response.cookies.get('ui')?.value).toBe('v2');
  });

  it('ignore une valeur ?ui= inconnue', async () => {
    const request = new NextRequest('http://localhost/music?ui=foo');
    const response = await proxy(request);

    expect(response.status).toBe(200);
    expect(response.cookies.get('ui')).toBeUndefined();
  });
});
