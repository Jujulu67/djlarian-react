import { cutTaskTail } from '../note-generator';

// Anciennes regex (référence) et libellés équivalents utilisés maintenant
const CASES: Array<[RegExp, RegExp]> = [
  [/reste\s+à\s+faire[:\s]+.+$/i, /reste\s+à\s+faire[:\s]/gi],
  [/à\s+faire[:\s]+.+$/i, /à\s+faire[:\s]/gi],
  [/reste[:\s]+.+$/i, /reste[:\s]/gi],
  [/prochaines?\s+étapes?[:\s]+.+$/i, /prochaines?\s+étapes?[:\s]/gi],
  [/todo[:\s]+.+$/i, /todo[:\s]/gi],
];
const PIECES = ['reste', 'à', 'faire', 'todo', 'prochaine', 'étapes', ':', ' ', '\n', 'mix', 'x'];

function randomText(seed: number): string {
  let state = seed;
  const next = () => (state = (state * 1103515245 + 12345) % 2 ** 31);
  return Array.from({ length: 1 + (next() % 10) }, () => PIECES[next() % PIECES.length]).join(
    next() % 2 ? ' ' : ''
  );
}

describe('cutTaskTail', () => {
  it('coupe comme les anciennes regex « libellé[:\\s]+.+$ »', () => {
    for (let i = 1; i <= 4000; i++) {
      const text = randomText(i);
      for (const [old, label] of CASES) {
        expect({ text, out: cutTaskTail(text, label) }).toEqual({
          text,
          out: text.replace(old, ''),
        });
      }
    }
  });
});
