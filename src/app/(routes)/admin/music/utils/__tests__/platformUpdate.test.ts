import { extractPlatformId } from '@/lib/utils/music-service';

import { updatePlatformUrl } from '../platformUpdate';

jest.mock('@/lib/utils/music-service', () => ({
  extractPlatformId: jest.fn((url: string) => (url ? `id:${url}` : null)),
}));

describe('updatePlatformUrl', () => {
  beforeEach(() => {
    (extractPlatformId as jest.Mock).mockClear();
  });

  it('sets the url and the extracted embed id for the platform', () => {
    const result = updatePlatformUrl({}, 'spotify', 'https://open.spotify.com/x');

    expect(extractPlatformId).toHaveBeenCalledWith('https://open.spotify.com/x', 'spotify');
    expect(result).toEqual({
      spotify: { url: 'https://open.spotify.com/x', embedId: 'id:https://open.spotify.com/x' },
    });
  });

  it('keeps the other platforms untouched', () => {
    const existing = { youtube: { url: 'https://yt/1', embedId: 'yt1' } };
    const result = updatePlatformUrl(existing, 'spotify', 'https://sp/1');

    expect(result.youtube).toEqual({ url: 'https://yt/1', embedId: 'yt1' });
    expect(result.spotify).toEqual({ url: 'https://sp/1', embedId: 'id:https://sp/1' });
  });

  it('removes the platform when the url is empty', () => {
    const existing = { youtube: { url: 'https://yt/1', embedId: 'yt1' } };
    const result = updatePlatformUrl(existing, 'youtube', '');

    expect(result.youtube).toBeUndefined();
  });

  it('handles undefined platforms', () => {
    expect(updatePlatformUrl(undefined, 'youtube', '')).toEqual({ youtube: undefined });
  });
});
