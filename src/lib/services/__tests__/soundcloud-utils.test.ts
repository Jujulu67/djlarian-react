import { describe, it, expect, jest, afterEach } from '@jest/globals';
import { extractProfileName, parseTrackUrl } from '../soundcloud/urls';
import { normalizeThumbnailUrl, extractArtworkUrlFromScript } from '../soundcloud/artwork';
import { toSoundCloudTrack } from '../soundcloud/trackMapper';
import { toScrapeError } from '../soundcloud/errors';
import { jitter, sleep } from '../soundcloud/humanBehavior';
import { buildLaunchOptions } from '../soundcloud/browser';

describe('SoundCloud urls', () => {
  describe('extractProfileName', () => {
    it('extracts the profile from a full URL', () => {
      expect(extractProfileName('https://soundcloud.com/larian')).toBe('larian');
    });

    it('extracts the profile without protocol', () => {
      expect(extractProfileName('soundcloud.com/larian')).toBe('larian');
    });

    it('ignores query parameters', () => {
      expect(extractProfileName('https://soundcloud.com/larian?si=abc')).toBe('larian');
    });

    it('returns null for a non-SoundCloud URL', () => {
      expect(extractProfileName('https://example.com/larian')).toBeNull();
    });
  });

  describe('parseTrackUrl', () => {
    it('splits a track URL into profile and slug', () => {
      expect(parseTrackUrl('https://soundcloud.com/larian67/kirikou-flip')).toEqual({
        profile: 'larian67',
        slug: 'kirikou-flip',
      });
    });

    it('stops the slug at the query string', () => {
      expect(parseTrackUrl('https://soundcloud.com/larian67/track1?in=set')).toEqual({
        profile: 'larian67',
        slug: 'track1',
      });
    });

    it('returns null when there is no track slug', () => {
      expect(parseTrackUrl('https://soundcloud.com/larian67')).toBeNull();
    });
  });
});

describe('SoundCloud artwork', () => {
  describe('normalizeThumbnailUrl', () => {
    it('upgrades -large to -t500x500 and strips the query string', () => {
      expect(normalizeThumbnailUrl('https://i1.sndcdn.com/artworks-abc-large.jpg?foo=1')).toBe(
        'https://i1.sndcdn.com/artworks-abc-t500x500.jpg'
      );
    });

    it('leaves a URL without size suffix untouched (apart from the query string)', () => {
      expect(normalizeThumbnailUrl('https://i1.sndcdn.com/artworks-abc.jpg')).toBe(
        'https://i1.sndcdn.com/artworks-abc.jpg'
      );
    });
  });

  describe('extractArtworkUrlFromScript', () => {
    it('reads artwork_url from embedded JSON and normalizes it', () => {
      const content =
        '{"title":"x","artwork_url":"https://i1.sndcdn.com/artworks-abc-large.jpg?x=1"}';
      expect(extractArtworkUrlFromScript(content)).toBe(
        'https://i1.sndcdn.com/artworks-abc-t500x500.jpg'
      );
    });

    it('returns null when the script does not mention artwork', () => {
      expect(extractArtworkUrlFromScript('window.__data = {"title":"x"};')).toBeNull();
    });

    it('returns null when the word artwork is present without an artwork_url value', () => {
      expect(extractArtworkUrlFromScript('var artwork = null;')).toBeNull();
    });
  });
});

describe('toSoundCloudTrack', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('builds the track id, embed id and parsed artist/title from the DOM data', () => {
    const track = toSoundCloudTrack(
      {
        url: 'https://soundcloud.com/larian67/kirikou-larian-flip',
        title: "Youssou N'Dour - KIRIKOU (LARIAN FLIP)",
        imageUrl: 'https://i1.sndcdn.com/artworks-abc-t500x500.jpg',
        releaseDate: '2025-08-01',
      },
      'larian67'
    );

    expect(track).toMatchObject({
      id: 'sc_larian67_kirikou_larian_flip',
      embedId: 'larian67/kirikou-larian-flip',
      url: 'https://soundcloud.com/larian67/kirikou-larian-flip',
      artist: "Youssou N'Dour (LARIAN FLIP)",
      // Comportement actuel de parseSoundCloudTitle : le titre est normalisé en casse "Titre"
      title: 'Kirikou',
      releaseDate: '2025-08-01',
      imageUrl: 'https://i1.sndcdn.com/artworks-abc-t500x500.jpg',
    });
  });

  it("uses today's date when the DOM gave no release date", () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-03-05T12:00:00Z'));

    const track = toSoundCloudTrack(
      { url: 'https://soundcloud.com/larian67/track1', title: 'Track 1' },
      'larian67'
    );

    expect(track.releaseDate).toBe('2026-03-05');
  });

  it('throws when the track URL is not a SoundCloud track URL', () => {
    expect(() =>
      toSoundCloudTrack({ url: 'https://soundcloud.com/larian67', title: 'x' }, 'larian67')
    ).toThrow('URL invalide: https://soundcloud.com/larian67');
  });
});

describe('toScrapeError', () => {
  it('turns a timeout into an explicit error naming the profile', () => {
    const result = toScrapeError(new Error('Navigation timeout of 10000 ms exceeded'), 'larian67');
    expect(result).toBeInstanceOf(Error);
    expect((result as Error).message).toBe(
      'Timeout lors du scraping SoundCloud pour larian67. Le scraping a pris trop de temps.'
    );
  });

  it('turns a Chromium launch failure into a configuration error', () => {
    const result = toScrapeError(new Error('Failed to launch the browser process'), 'larian67');
    expect((result as Error).message).toBe(
      'Erreur lors du lancement de Chromium: Failed to launch the browser process. Vérifiez la configuration de Puppeteer sur Vercel.'
    );
  });

  it('returns other errors unchanged', () => {
    const original = new Error('net::ERR_NAME_NOT_RESOLVED');
    expect(toScrapeError(original, 'larian67')).toBe(original);
  });

  it('returns non-Error values unchanged', () => {
    expect(toScrapeError('boom', 'larian67')).toBe('boom');
  });
});

describe('human behaviour helpers', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('jitter returns base plus floor(random * range)', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.5);
    expect(jitter(500, 1000)).toBe(1000);
  });

  it('jitter stays within [base, base + range)', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.999999);
    expect(jitter(200, 400)).toBe(599);
  });

  it('sleep resolves once the delay has elapsed', async () => {
    jest.useFakeTimers();
    let resolved = false;
    const promise = sleep(300).then(() => {
      resolved = true;
    });

    jest.advanceTimersByTime(299);
    await Promise.resolve();
    expect(resolved).toBe(false);

    jest.advanceTimersByTime(1);
    await promise;
    expect(resolved).toBe(true);
  });
});

describe('buildLaunchOptions', () => {
  it('only sets headless outside local development', () => {
    expect(buildLaunchOptions(false)).toEqual({ headless: true });
  });

  it('adds the local sandbox-free args when running locally', () => {
    expect(buildLaunchOptions(true)).toEqual({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
      ],
    });
  });
});
