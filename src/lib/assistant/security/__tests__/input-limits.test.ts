import { isAssistantInputTooLong, MAX_ASSISTANT_INPUT_LENGTH } from '../input-limits';

describe('input-limits', () => {
  it('accepte un message jusqu’à la limite', () => {
    expect(isAssistantInputTooLong('a'.repeat(MAX_ASSISTANT_INPUT_LENGTH))).toBe(false);
  });

  it('refuse un message plus long', () => {
    expect(isAssistantInputTooLong('a'.repeat(MAX_ASSISTANT_INPUT_LENGTH + 1))).toBe(true);
  });

  it('ignore les valeurs qui ne sont pas des chaînes', () => {
    expect(isAssistantInputTooLong(undefined)).toBe(false);
  });
});
