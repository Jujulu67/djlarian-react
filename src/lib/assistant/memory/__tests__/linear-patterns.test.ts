import { describe, it, expect } from '@jest/globals';
import { inOrder, jsonArrayWithId } from '../linear-patterns';

const ANCIENNES = {
  liste: /\[[\s\S]*\{[\s\S]*"id"[\s\S]*"name"[\s\S]*\}[\s\S]*\]/,
  bloc: /```json[\s\S]*"(id|projectId|affectedProjectIds)"[\s\S]*```/i,
  tableau: /\|[-=]+\|[\s\S]+\|[-=]+\|/,
  injection: /^\s*\[\s*\{[\s\S]*"id"[\s\S]*\}\s*\]\s*$/,
};
const NOUVELLES = {
  liste: inOrder(['[', '{', '"id"', '"name"', '}', ']']),
  bloc: inOrder([/```json/i, /"(id|projectId|affectedProjectIds)"/i, '```']),
  tableau: inOrder([/\|[-=]+\|/, /\|[-=]+\|/], { gap: 1 }),
  injection: jsonArrayWithId,
};

const EXEMPLES = [
  '',
  'Explique-moi Prisma',
  '[{"id": 1, "name": "A"}]',
  'voici [ {"name": "A", "id": 1} ]',
  '```json\n{"projectId": 3}\n```',
  '```JSON "id" sans fin',
  '|--|--|',
  '|--| x |==|',
  '  [ { "id": 2 } ]  ',
  '[{"id": 2}] et du texte',
  '}{ "id" [ ]',
];

describe('linear-patterns', () => {
  it.each(Object.keys(ANCIENNES) as (keyof typeof ANCIENNES)[])(
    '%s donne le même résultat que la regex d’origine',
    (nom) => {
      for (const texte of EXEMPLES) {
        expect([texte, NOUVELLES[nom].test(texte)]).toEqual([texte, ANCIENNES[nom].test(texte)]);
      }
    }
  );

  it('reste rapide sur une entrée piégée de 50 000 caractères', () => {
    const piege = '[{"id"|-|```json'.repeat(3200);
    const debut = performance.now();
    for (const p of Object.values(NOUVELLES)) p.test(piege);
    expect(performance.now() - debut).toBeLessThan(200);
  });
});
