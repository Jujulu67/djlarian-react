/**
 * Détecteurs en temps linéaire pour remplacer des regex du type /A[\s\S]*B[\s\S]*C/ :
 * sur un long texte, le moteur de regex essaie toutes les découpes possibles (plus de 60 s
 * pour 5 000 caractères). Ici chaque morceau est cherché une seule fois, à la suite du
 * précédent : même résultat, coût proportionnel à la longueur du texte.
 */
export interface TextPattern {
  test(text: string): boolean;
}

type Piece = string | RegExp;

/** Position juste après la première occurrence de `piece` à partir de `from`, ou -1. */
function findAfter(text: string, piece: Piece, from: number): number {
  if (typeof piece === 'string') {
    const i = text.indexOf(piece, from);
    return i === -1 ? -1 : i + piece.length;
  }
  const re = new RegExp(piece.source, piece.flags.replace('g', '') + 'g');
  re.lastIndex = from;
  const m = re.exec(text);
  return m ? m.index + m[0].length : -1;
}

/**
 * Vrai si les morceaux apparaissent dans cet ordre, sans chevauchement.
 * `gap: 1` impose au moins un caractère entre deux morceaux (équivalent de [\s\S]+).
 */
export function inOrder(pieces: Piece[], { gap = 0 } = {}): TextPattern {
  return {
    test(text: string) {
      let pos = 0;
      for (const [i, piece] of pieces.entries()) {
        pos = findAfter(text, piece, i === 0 ? 0 : pos + gap);
        if (pos === -1) return false;
      }
      return true;
    },
  };
}

/** Texte entier (espaces autour ignorés) de la forme `[{ … "id" … }]`. */
export const jsonArrayWithId: TextPattern = {
  test(text: string) {
    const t = text.trim();
    const start = /^\[\s*\{/.exec(t);
    const end = /\}\s*\]$/.exec(t);
    if (!start || !end) return false;
    const id = t.indexOf('"id"', start[0].length);
    return id !== -1 && id + 4 <= end.index;
  },
};
