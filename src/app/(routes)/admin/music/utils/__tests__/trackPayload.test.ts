import { buildPlatformsArray, buildTrackRequestBody } from '../trackPayload';

type Form = Parameters<typeof buildTrackRequestBody>[0];

const baseForm = (overrides: Partial<Form> = {}): Form =>
  ({
    id: 'track-1',
    title: 'Titre',
    artist: 'Artiste',
    type: 'original',
    releaseDate: '2024-01-15',
    genre: ['Techno'],
    platforms: {},
    isPublished: true,
    featured: false,
    imageId: 'img-form',
    user: { id: 'u1' },
    createdAt: '2024-01-01',
    updatedAt: '2024-01-02',
    ...overrides,
  }) as unknown as Form;

describe('buildPlatformsArray', () => {
  it('keeps only platforms with a non-empty url and maps them to the API shape', () => {
    const result = buildPlatformsArray({
      youtube: { url: 'https://yt/1', embedId: 'yt1' },
      spotify: { url: '', embedId: null },
      deezer: undefined,
    } as Parameters<typeof buildPlatformsArray>[0]);

    expect(result).toEqual([{ platform: 'youtube', url: 'https://yt/1', embedId: 'yt1' }]);
  });

  it('returns an empty array for missing platforms', () => {
    expect(buildPlatformsArray(undefined)).toEqual([]);
  });
});

describe('buildTrackRequestBody', () => {
  const platforms = [{ platform: 'youtube' as const, url: 'https://yt/1', embedId: 'yt1' }];

  it('excludes fields that are not valid for Prisma and uses the given imageId', () => {
    const body = buildTrackRequestBody(baseForm(), 'img-new', platforms);

    expect(body).not.toHaveProperty('id');
    expect(body).not.toHaveProperty('user');
    expect(body).not.toHaveProperty('createdAt');
    expect(body).not.toHaveProperty('updatedAt');
    expect(body).not.toHaveProperty('genre');
    expect(body.imageId).toBe('img-new');
    expect(body.title).toBe('Titre');
  });

  it('maps genres to genreNames and platforms to the array', () => {
    const body = buildTrackRequestBody(baseForm(), 'img', platforms);

    expect(body.genreNames).toEqual(['Techno']);
    expect(body.platforms).toBe(platforms);
  });

  it('defaults genreNames to an empty array', () => {
    const body = buildTrackRequestBody(baseForm({ genre: undefined }), 'img', platforms);
    expect(body.genreNames).toEqual([]);
  });

  it('converts publishAt to an ISO string and leaves it undefined when absent', () => {
    const scheduled = buildTrackRequestBody(
      baseForm({ publishAt: '2030-05-01T10:00:00.000Z' as unknown as Date }),
      'img',
      platforms
    );
    expect(scheduled.publishAt).toBe('2030-05-01T10:00:00.000Z');

    const draft = buildTrackRequestBody(baseForm({ publishAt: undefined }), 'img', platforms);
    expect(draft.publishAt).toBeUndefined();
  });

  it('includes collectionId only when a collection is set', () => {
    const withCollection = buildTrackRequestBody(
      baseForm({ collection: { id: 'col-1' } } as unknown as Partial<Form>),
      'img',
      platforms
    );
    expect(withCollection.collectionId).toBe('col-1');

    const without = buildTrackRequestBody(baseForm(), 'img', platforms);
    expect(without).not.toHaveProperty('collectionId');
  });
});
