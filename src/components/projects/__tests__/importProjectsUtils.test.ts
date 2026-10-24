import { calculateColumnWidths, formatTitleCase, parseCsvLine } from '../importProjectsUtils';

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
