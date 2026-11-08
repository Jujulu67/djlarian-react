import {
  formatSpotifyCsv,
  calculateColumnWidths,
  formatTitleCase,
  parseCsvLine,
} from '../importProjectsUtils';

describe('formatTitleCase', () => {
  it('capitalizes each word and collapses spaces', () => {
    expect(formatTitleCase('  hello   WORLD ')).toBe('Hello World');
  });

  it('returns blank text unchanged', () => {
    expect(formatTitleCase('   ')).toBe('   ');
  });
});

describe('parseCsvLine', () => {
  it('splits non-comma separators and trims cells', () => {
    expect(parseCsvLine(' a \t b ', '\t')).toEqual(['a', 'b']);
  });

  it('handles quoted commas and escaped quotes', () => {
    expect(parseCsvLine('"a, b",c,"say ""hi"""', ',')).toEqual(['a, b', 'c', 'say "hi"']);
  });
});

describe('calculateColumnWidths', () => {
  it('uses the longest cell per column plus padding, capped at 50', () => {
    const long = 'x'.repeat(60);
    expect(calculateColumnWidths(`ab,c\nabcd,${long}`, ',')).toEqual([7, 50]);
  });

  it('returns no widths for empty text', () => {
    expect(calculateColumnWidths('\n  \n', ',')).toEqual([]);
  });
});

describe('formatSpotifyCsv', () => {
  it('reformate un CSV Spotify en deux colonnes séparées par des tabulations', () => {
    const csv =
      'song,artist,release_date\n"Hello, World",Larian,2024-03-01\nNight Drive,Larian,2023-12-25';
    expect(formatSpotifyCsv(csv)).toBe(
      'Nom Projet\tDate Sortie\nHello, World\t2024-03-01\nNight Drive\t2023-12-25'
    );
  });

  it('accepte l’en-tête « release date » et normalise les dates lisibles', () => {
    const csv = 'Song,Release Date\nTrack,March 5 2024\nOther,pas une date';
    expect(formatSpotifyCsv(csv)).toBe(
      'Nom Projet\tDate Sortie\nTrack\t2024-03-05\nOther\tpas une date'
    );
  });

  it('retourne null pour un contenu qui n’est pas un CSV Spotify', () => {
    expect(formatSpotifyCsv('Nom\tStatut\nA\tEN_COURS')).toBeNull();
    expect(formatSpotifyCsv('song,artist\nA,B')).toBeNull();
    expect(formatSpotifyCsv('   \n  ')).toBeNull();
  });
});
