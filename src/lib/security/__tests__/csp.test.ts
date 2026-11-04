import { buildCsp, sentryCspReportUri } from '../csp';

const directive = (csp: string, name: string) =>
  csp
    .split('; ')
    .find((d) => d.startsWith(`${name} `))
    ?.slice(name.length + 1)
    .split(' ') ?? [];

describe('sentryCspReportUri', () => {
  it('dérive l’adresse de rapport du DSN', () => {
    expect(sentryCspReportUri('https://abc123@o42.ingest.de.sentry.io/7')).toBe(
      'https://o42.ingest.de.sentry.io/api/7/security/?sentry_key=abc123'
    );
  });

  it('renvoie null sans DSN ou avec un DSN invalide', () => {
    expect(sentryCspReportUri(undefined)).toBeNull();
    expect(sentryCspReportUri('pas-une-url')).toBeNull();
    expect(sentryCspReportUri('https://o42.ingest.sentry.io/7')).toBeNull();
  });
});

describe('buildCsp', () => {
  it('autorise les lecteurs intégrés utilisés par le site', () => {
    const frames = directive(buildCsp(), 'frame-src');
    expect(frames).toEqual(
      expect.arrayContaining([
        'https://www.youtube.com',
        'https://w.soundcloud.com',
        'https://open.spotify.com',
        'https://player.twitch.tv',
      ])
    );
  });

  it('autorise Vercel Web Analytics et Speed Insights', () => {
    const csp = buildCsp();
    expect(directive(csp, 'script-src')).toContain('https://va.vercel-scripts.com');
    expect(directive(csp, 'connect-src')).toContain('https://vitals.vercel-insights.com');
  });

  it('interdit plugins et changement de base', () => {
    const csp = buildCsp();
    expect(directive(csp, 'object-src')).toEqual(["'none'"]);
    expect(directive(csp, 'base-uri')).toEqual(["'self'"]);
  });

  it('ajoute report-uri seulement avec un DSN', () => {
    expect(buildCsp()).not.toContain('report-uri');
    expect(buildCsp({ sentryDsn: 'https://k@o1.ingest.sentry.io/2' })).toContain(
      'report-uri https://o1.ingest.sentry.io/api/2/security/?sentry_key=k'
    );
  });
});
