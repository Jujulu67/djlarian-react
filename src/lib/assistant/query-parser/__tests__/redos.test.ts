import { describe, it, expect } from '@jest/globals';
import { parseQuery } from '../index';
import { MAX_ASSISTANT_INPUT_LENGTH } from '../../security/input-limits';
import { generateNoteFromContent } from '../../parsers/note-generator';
import { detectProgressFromQuery } from '../../parsers/progress-detector';
import { prepareConversationContext } from '../../conversational/memory-manager';
import { getActionParser } from '../../memory/ActionParser';
import { isCapabilitiesQuestion } from '../../router/handlers/capabilities';

/**
 * Garde-fou ReDoS : plusieurs regex du parseur ont un coût super-linéaire en théorie
 * (sonarjs/super-linear-regex). Les messages étant limités à MAX_ASSISTANT_INPUT_LENGTH
 * caractères, on vérifie qu'aucune entrée piégée de cette taille ne bloque le serveur.
 */
const fill = (motif: string) =>
  motif
    .repeat(Math.ceil(MAX_ASSISTANT_INPUT_LENGTH / motif.length))
    .slice(0, MAX_ASSISTANT_INPUT_LENGTH);

const ENTREES_PIEGEES = [
  '1',
  ' ',
  'a',
  '1 ',
  'a ',
  '- ',
  "l'",
  'de ',
  'avec ',
  'projet ',
  'collab ',
  'le ',
  'à ',
  'est mon ',
  'en ',
  'pour ',
  'deadline ',
  'dans 1 ',
  '50 %',
  'ghost ',
  'prod ',
  'note ',
  'mets ',
  'à 1',
  'le 1',
  'semaine ',
  'jour ',
  'mois ',
  'x, ',
  'et ',
  'feat ',
  'tous les ',
  'todo: ',
  'reste ',
  'ça fait ',
  'puis ',
  'est ma ',
  'car ',
  '0.',
  'projets ',
  'tu ',
];

describe('Analyse des messages : pas de ReDoS sur des entrées de taille maximale', () => {
  it.each(ENTREES_PIEGEES)('motif %p répété', (motif) => {
    const debut = performance.now();
    for (const texte of [fill(motif), fill(motif).slice(1) + '!']) {
      parseQuery(texte, ['TOTO'], ['House']);
      generateNoteFromContent(texte);
      detectProgressFromQuery(texte);
      isCapabilitiesQuestion(texte);
      getActionParser().parse(texte);
      prepareConversationContext([
        { role: 'user', content: texte },
        { role: 'assistant', content: texte },
      ]);
    }
    const duree = performance.now() - debut;
    // eslint-disable-next-line no-console
    if (duree > 500) console.log(`${JSON.stringify(motif)} : ${Math.round(duree)} ms`);
    expect(duree).toBeLessThan(2000);
  });
});
