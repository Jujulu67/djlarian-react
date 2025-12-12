/**
 * Extraction des données de mise à jour depuis les requêtes
 *
 * Ce module réexporte les fonctions du fichier updates.ts original
 * pour maintenir la compatibilité arrière tout en préparant
 * une modularisation future.
 */

// Réexporter depuis le fichier original
export { extractUpdateData } from '../updates';
export type { UpdateData } from './types';
