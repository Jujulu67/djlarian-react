import { isScheduledInFuture, publicTrackWhere } from '../music-publication';

describe('music-publication', () => {
  const now = new Date('2026-11-04T12:00:00Z');

  it('publicTrackWhere : publiés ou date de publication passée', () => {
    expect(publicTrackWhere(now)).toEqual({
      OR: [{ isPublished: true }, { publishAt: { lte: now } }],
    });
  });

  it('isScheduledInFuture', () => {
    expect(isScheduledInFuture(new Date('2026-11-05T00:00:00Z'), now)).toBe(true);
    expect(isScheduledInFuture(new Date('2026-11-03T00:00:00Z'), now)).toBe(false);
    expect(isScheduledInFuture(null, now)).toBe(false);
    expect(isScheduledInFuture(undefined, now)).toBe(false);
  });
});
