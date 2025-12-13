/**
 * Extracteur de noms d'utilisateurs depuis les requêtes
 */
import prisma from '@/lib/prisma';

/**
 * Trouve un utilisateur par nom
 */
export async function findUserByName(userName: string) {
  if (!userName) return null;
  return await prisma.user.findFirst({
    where: { name: userName },
    select: { id: true, name: true },
  });
}

/**
 * Extrait le nom d'utilisateur de la requête si mentionné
 * Cherche des patterns comme "pour Larian67", "de Larian67", "Larian67", etc.
 */
export function extractUserNameFromQuery(query: string): string | null {
  // Chercher des patterns comme "pour Larian67", "de Larian67", "Larian67", etc.
  const patterns = [
    /(?:pour|de|à|avec|les projets de)\s+([A-Za-z0-9_]+)/i,
    /^([A-Za-z0-9_]+)\s+(?:a|à|possède)/i,
    /utilisateur\s+([A-Za-z0-9_]+)/i,
  ];

  for (const pattern of patterns) {
    const match = query.match(pattern);
    if (match && match[1]) {
      const extracted = match[1];
      // Ignorer les mots communs
      if (
        !['projets', 'projet', 'deadline', 'statut', 'progression'].includes(
          extracted.toLowerCase()
        )
      ) {
        return extracted;
      }
    }
  }

  return null;
}
