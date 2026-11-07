import { describe, it, expect } from '@jest/globals';
import { classifyQuery } from '../classifier';
import { detectFilters } from '../filters';

const classify = (query: string) => {
  const lowerQuery = query.toLowerCase();
  const { filters } = detectFilters(query, lowerQuery, [], ['House']);
  return { filters, ...classifyQuery(query, lowerQuery, filters) };
};

describe('Demandes de conseil (pas des listes)', () => {
  it.each([
    'peux-tu me donner une idée pour mieux organiser mes sorties de morceaux ?',
    'donne-moi des conseils pour mes sorties',
    'tu peux me donner ton avis sur mes projets ?',
    'donne moi quelques astuces pour finir mes projets',
    'conseille-moi pour organiser mes projets',
  ])('« %s » part vers l’IA', (query) => {
    const c = classify(query);
    expect(c.isList).toBe(false);
    expect(c.isConversationalQuestion).toBe(true);
    expect(c.understood).toBe(false);
  });

  it.each([
    'donne-moi la liste des projets',
    'donne moi mes projets en cours',
    'liste mes projets',
  ])('« %s » reste une liste', (query) => {
    const c = classify(query);
    expect(c.isList).toBe(true);
    expect(c.understood).toBe(true);
  });
});
