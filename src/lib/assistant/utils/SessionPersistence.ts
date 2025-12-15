/**
 * SessionPersistence.ts - Gestion de la persistance de session côté client
 *
 * O10: Stabiliser la session côté client
 *
 * Le sessionId doit survivre à:
 * - Refresh de la page
 * - Navigation entre pages
 * - Multi-tab (isolation par onglet)
 *
 * STRATÉGIE:
 * - sessionId stocké en sessionStorage (survit au refresh, isolé par onglet)
 * - userId stocké en localStorage (persistant entre sessions)
 * - tabId généré au runtime pour identifier l'onglet unique
 * - sessionKey = composition de userId + tabId si nécessaire
 */

const SESSION_STORAGE_KEY = 'assistant_session_id';
const USER_STORAGE_KEY = 'assistant_user_id';
const TAB_ID_KEY = 'assistant_tab_id';

/**
 * Génère un ID unique
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Vérifie si on est côté client (window disponible)
 */
function isClient(): boolean {
  return typeof window !== 'undefined';
}

/**
 * Récupère ou crée le sessionId persistant
 *
 * - Survit au refresh (sessionStorage)
 * - Isolé par onglet (sessionStorage est per-tab)
 *
 * @returns sessionId stable pour cet onglet
 */
export function getOrCreateSessionId(): string {
  if (!isClient()) {
    // Côté serveur, générer un ID temporaire
    return `ssr-${generateId()}`;
  }

  // Vérifier si on a déjà un sessionId pour cet onglet
  let sessionId = sessionStorage.getItem(SESSION_STORAGE_KEY);

  if (!sessionId) {
    sessionId = `session-${generateId()}`;
    sessionStorage.setItem(SESSION_STORAGE_KEY, sessionId);
  }

  return sessionId;
}

/**
 * Récupère ou crée le tabId (identifiant unique de l'onglet)
 *
 * Le tabId est généré au premier accès et stocké en mémoire + sessionStorage
 * Il permet d'identifier de manière unique chaque onglet du navigateur
 *
 * @returns tabId unique pour cet onglet
 */
let cachedTabId: string | null = null;

export function getOrCreateTabId(): string {
  if (!isClient()) {
    return `ssr-tab-${generateId()}`;
  }

  // Retourner le cache mémoire si disponible
  if (cachedTabId) {
    return cachedTabId;
  }

  // Vérifier sessionStorage (survit au refresh)
  let tabId = sessionStorage.getItem(TAB_ID_KEY);

  if (!tabId) {
    tabId = `tab-${generateId()}`;
    sessionStorage.setItem(TAB_ID_KEY, tabId);
  }

  cachedTabId = tabId;
  return tabId;
}

/**
 * Récupère ou crée le userId persistant
 *
 * Le userId persiste entre les sessions (localStorage)
 * Il peut être remplacé par un vrai userId après authentification
 *
 * @returns userId persistant
 */
export function getOrCreateUserId(): string {
  if (!isClient()) {
    return `ssr-user-${generateId()}`;
  }

  let userId = localStorage.getItem(USER_STORAGE_KEY);

  if (!userId) {
    userId = `anon-${generateId()}`;
    localStorage.setItem(USER_STORAGE_KEY, userId);
  }

  return userId;
}

/**
 * Définit le userId (après authentification par exemple)
 *
 * @param userId Nouvel userId à persister
 */
export function setUserId(userId: string): void {
  if (!isClient()) return;
  localStorage.setItem(USER_STORAGE_KEY, userId);
}

/**
 * Construit une clé de session composite
 *
 * Utile pour identifier de manière unique une "session de travail":
 * userId + tabId = isolation complète par utilisateur et par onglet
 *
 * @returns sessionKey composite
 */
export function getSessionKey(): string {
  const userId = getOrCreateUserId();
  const tabId = getOrCreateTabId();
  return `${userId}:${tabId}`;
}

/**
 * Réinitialise la session pour l'onglet courant
 *
 * Génère un nouveau sessionId tout en conservant userId et tabId
 * Utile pour "Nouveau chat" sans perdre l'identité utilisateur
 */
export function resetSession(): string {
  if (!isClient()) {
    return `ssr-${generateId()}`;
  }

  const newSessionId = `session-${generateId()}`;
  sessionStorage.setItem(SESSION_STORAGE_KEY, newSessionId);
  return newSessionId;
}

/**
 * Récupère toutes les informations de session
 *
 * @returns Objet contenant sessionId, tabId, userId et sessionKey
 */
export function getSessionInfo(): {
  sessionId: string;
  tabId: string;
  userId: string;
  sessionKey: string;
  isClient: boolean;
} {
  return {
    sessionId: getOrCreateSessionId(),
    tabId: getOrCreateTabId(),
    userId: getOrCreateUserId(),
    sessionKey: getSessionKey(),
    isClient: isClient(),
  };
}

/**
 * Vérifie si deux sessions sont du même utilisateur mais d'onglets différents
 *
 * @param sessionKey1 Première clé de session
 * @param sessionKey2 Deuxième clé de session
 * @returns true si même utilisateur, false sinon
 */
export function isSameUser(sessionKey1: string, sessionKey2: string): boolean {
  const userId1 = sessionKey1.split(':')[0];
  const userId2 = sessionKey2.split(':')[0];
  return userId1 === userId2;
}

/**
 * Vérifie si deux sessions sont du même onglet
 *
 * @param sessionKey1 Première clé de session
 * @param sessionKey2 Deuxième clé de session
 * @returns true si même onglet, false sinon
 */
export function isSameTab(sessionKey1: string, sessionKey2: string): boolean {
  const tabId1 = sessionKey1.split(':')[1];
  const tabId2 = sessionKey2.split(':')[1];
  return tabId1 === tabId2;
}
