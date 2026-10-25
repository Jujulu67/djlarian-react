import { getNavLinks } from '../navigationConfig';
import { getAvatarSrc, hasArcadeAccess, isNavLinkActive } from '../navigationUtils';

describe('isNavLinkActive', () => {
  it('matches the root only on exact path', () => {
    expect(isNavLinkActive('/', '/')).toBe(true);
    expect(isNavLinkActive('/music', '/')).toBe(false);
  });

  it('matches exact paths and sub-routes for other links', () => {
    expect(isNavLinkActive('/music', '/music')).toBe(true);
    expect(isNavLinkActive('/music/track-1', '/music')).toBe(true);
    expect(isNavLinkActive('/events', '/music')).toBe(false);
  });

  it('does not match a sibling path that only shares a prefix', () => {
    expect(isNavLinkActive('/musicx', '/music')).toBe(false);
  });

  it('is false when there is no pathname', () => {
    expect(isNavLinkActive(null, '/music')).toBe(false);
    expect(isNavLinkActive(undefined, '/')).toBe(false);
  });
});

describe('hasArcadeAccess', () => {
  it('is false without user', () => {
    expect(hasArcadeAccess(null)).toBe(false);
    expect(hasArcadeAccess(undefined)).toBe(false);
  });

  it('is false with no high score and no casino discovery', () => {
    expect(hasArcadeAccess({ gameHighScore: 0, hasDiscoveredCasino: false })).toBe(false);
    expect(hasArcadeAccess({})).toBe(false);
  });

  it('is true with a positive high score', () => {
    expect(hasArcadeAccess({ gameHighScore: 5, hasDiscoveredCasino: false })).toBe(true);
  });

  it('is true when the casino has been discovered', () => {
    expect(hasArcadeAccess({ gameHighScore: 0, hasDiscoveredCasino: true })).toBe(true);
  });
});

describe('getAvatarSrc', () => {
  it('proxies Google-hosted avatars', () => {
    const image = 'https://lh3.googleusercontent.com/a/abc=s96-c';
    expect(getAvatarSrc(image)).toBe(`/api/images/proxy?url=${encodeURIComponent(image)}`);
  });

  it('keeps other absolute URLs as-is', () => {
    expect(getAvatarSrc('https://example.com/a.png')).toBe('https://example.com/a.png');
    expect(getAvatarSrc('http://example.com/a.png')).toBe('http://example.com/a.png');
  });

  it('keeps relative URLs as-is', () => {
    expect(getAvatarSrc('/images/avatar.png')).toBe('/images/avatar.png');
  });
});

describe('getNavLinks', () => {
  const hrefs = (shopEnabled: boolean, isAdmin: boolean) =>
    getNavLinks(shopEnabled, isAdmin).map((link) => link.href);

  it('shows the shop when enabled', () => {
    expect(hrefs(true, false)).toEqual([
      '/',
      '/music',
      '/events',
      '/live',
      '/gallery',
      '/shop',
      '/contact',
    ]);
  });

  it('hides the shop when disabled for non-admins', () => {
    expect(hrefs(false, false)).not.toContain('/shop');
  });

  it('keeps the shop visible for admins even when disabled', () => {
    expect(hrefs(false, true)).toContain('/shop');
  });
});
