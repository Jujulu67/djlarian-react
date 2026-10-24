import { addGenreToList, removeGenreFromList } from '../genreList';

describe('addGenreToList', () => {
  it('appends the trimmed genre', () => {
    expect(addGenreToList(['Techno'], '  House  ')).toEqual(['Techno', 'House']);
  });

  it('returns null for an empty or blank input', () => {
    expect(addGenreToList(['Techno'], '')).toBeNull();
    expect(addGenreToList(['Techno'], '   ')).toBeNull();
  });

  it('returns null when the genre is already present (after trimming)', () => {
    expect(addGenreToList(['Techno'], ' Techno ')).toBeNull();
  });

  it('does not mutate the original list', () => {
    const genres = ['Techno'];
    addGenreToList(genres, 'House');
    expect(genres).toEqual(['Techno']);
  });
});

describe('removeGenreFromList', () => {
  it('removes the given genre', () => {
    expect(removeGenreFromList(['Techno', 'House'], 'Techno')).toEqual(['House']);
  });

  it('returns a copy unchanged when the genre is absent', () => {
    expect(removeGenreFromList(['Techno'], 'Jazz')).toEqual(['Techno']);
  });
});
