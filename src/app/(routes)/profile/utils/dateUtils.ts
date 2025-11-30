/**
 * Utilitaires pour le formatage des dates dans le profil
 */

/**
 * Formate la date d'inscription de l'utilisateur
 * @param createdAt - Date de création au format ISO string
 * @returns Date formatée en français ou null si la date est invalide
 */
export function getMemberSince(createdAt?: string | Date | null): string | null {
  if (!createdAt) return null;

  try {
    const date = typeof createdAt === 'string' ? new Date(createdAt) : createdAt;
    // Vérifier que la date est valide
    if (isNaN(date.getTime())) {
      return null;
    }
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch (error) {
    console.error('Erreur lors du parsing de la date:', error);
    return null;
  }
}

/**
 * Calcule l'ancienneté de l'utilisateur en mois
 * @param createdAt - Date de création au format ISO string
 * @returns Nombre de mois depuis l'inscription
 */
export function getMemberMonths(createdAt?: string | Date | null): number {
  if (!createdAt) return 0;

  try {
    const created = typeof createdAt === 'string' ? new Date(createdAt) : createdAt;
    // Vérifier que la date est valide
    if (isNaN(created.getTime())) {
      return 0;
    }
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - created.getTime());
    const diffMonths = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 30));
    return diffMonths;
  } catch (error) {
    console.error("Erreur lors du calcul de l'ancienneté:", error);
    return 0;
  }
}
