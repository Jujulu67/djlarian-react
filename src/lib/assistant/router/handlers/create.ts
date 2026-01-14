/**
 * Handler pour la création de projets
 */

import type { Project } from '@/lib/domain/projects';
import { ProjectCommandType, type ProjectCommandResult } from './types';
import { extractCreateData } from '../../query-parser/creates';

/**
 * Gère la création d'un projet
 */
export function handleCreateCommand(
  userMessage: string,
  lowerQuery: string,
  availableCollabs: string[],
  availableStyles: string[],
  requestId?: string
): ProjectCommandResult {
  console.warn('[Router] ➕ Routing vers Création');

  const createData = extractCreateData(userMessage, lowerQuery, availableCollabs, availableStyles);

  if (!createData || !createData.name) {
    return {
      type: ProjectCommandType.GENERAL,
      response: "Je n'ai pas pu extraire le nom du projet à créer. Pouvez-vous reformuler ?",
      requestId,
    };
  }

  // La création nécessite un appel serveur pour persister
  // On retourne les données de création qui seront utilisées par le hook
  // pour appeler l'API de création
  return {
    type: ProjectCommandType.CREATE,
    project: {
      // Structure minimale pour indiquer la création
      // Le vrai projet sera créé côté serveur via l'API
      id: 'pending',
      name: createData.name,
      status:
        (createData.status as
          | 'EN_COURS'
          | 'TERMINE'
          | 'ANNULE'
          | 'A_REWORK'
          | 'GHOST_PRODUCTION'
          | 'ARCHIVE') || 'EN_COURS',
      progress: createData.progress || null,
      collab: createData.collab || null,
      style: createData.style || null,
      deadline: createData.deadline || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      order: 0,
      userId: '',
      label: null,
      labelFinal: null,
      releaseDate: null,
      externalLink: null,
      streamsJ7: null,
      streamsJ14: null,
      streamsJ21: null,
      streamsJ28: null,
      streamsJ56: null,
      streamsJ84: null,
      streamsJ180: null,
      streamsJ365: null,
      note: null,
    } as Project,
    message: `Création du projet "${createData.name}" en cours...`,
    createData, // Inclure les données brutes pour l'API
    requestId,
  };
}
