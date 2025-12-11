/**
 * Gestion des permissions utilisateur pour l'assistant
 * SÉCURITÉ : Seuls les ADMIN peuvent accéder aux projets d'autres utilisateurs
 */
import { extractUserNameFromQuery, findUserByName } from '../parsers/user-extractor';

export interface UserPermissionsParams {
  currentUserId: string;
  currentUserName: string | null;
  isAdmin: boolean;
}

/**
 * Obtient l'ID utilisateur cible (par nom ou utilisateur connecté)
 * SÉCURITÉ : Seuls les ADMIN peuvent accéder aux projets d'autres utilisateurs
 */
export function createGetTargetUserId({
  currentUserId,
  currentUserName,
  isAdmin,
}: UserPermissionsParams) {
  return async function getTargetUserId(query?: string): Promise<string> {
    // Essayer d'extraire un nom d'utilisateur de la requête
    if (query) {
      const extractedUserName = extractUserNameFromQuery(query);
      if (extractedUserName) {
        // Vérifier si l'utilisateur connecté est ADMIN
        if (!isAdmin) {
          // Si l'utilisateur n'est pas admin, vérifier si le nom mentionné correspond à l'utilisateur connecté
          if (extractedUserName.toLowerCase() !== currentUserName?.toLowerCase()) {
            // L'utilisateur essaie d'accéder aux projets d'un autre utilisateur sans être admin
            // Forcer l'utilisation de son propre ID
            console.warn(
              `[Assistant] Sécurité : Utilisateur non-admin (${currentUserName}) a tenté d'accéder aux projets de ${extractedUserName}. Accès refusé.`
            );
            return currentUserId; // Forcer l'utilisation de l'utilisateur connecté
          }
        }

        // Si admin OU si le nom correspond à l'utilisateur connecté, chercher l'utilisateur
        const targetUser = await findUserByName(extractedUserName);
        if (targetUser) {
          // Double vérification : si pas admin, s'assurer que c'est bien l'utilisateur connecté
          if (!isAdmin && targetUser.id !== currentUserId) {
            console.warn(
              `[Assistant] Sécurité : Tentative d'accès non autorisée aux projets de ${extractedUserName}.`
            );
            return currentUserId;
          }
          return targetUser.id;
        }
      }
    }

    // Par défaut, utiliser l'utilisateur connecté
    return currentUserId;
  };
}
