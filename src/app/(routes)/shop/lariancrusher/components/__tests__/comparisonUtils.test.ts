import { getComparisonFileName } from '../comparisonUtils';

describe('getComparisonFileName', () => {
  it('uses the dry file for the original signal', () => {
    expect(getComparisonFileName('original', 'hard', false)).toBe('dry.wav');
  });

  it('uses the dry normalised file for the original when gain match is on', () => {
    expect(getComparisonFileName('original', 'hard', true)).toBe('dry_norm.wav');
  });

  it('uses the active mode for the processed signal', () => {
    expect(getComparisonFileName('processed', 'very_hard', false)).toBe('very_hard.wav');
  });

  it('adds the _norm suffix to the processed file when gain match is on', () => {
    expect(getComparisonFileName('processed', 'creative', true)).toBe('creative_norm.wav');
  });
});
