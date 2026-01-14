/**
 * Wrapper client pour le routeur de commandes projets
 *
 * Cette fonction peut être appelée côté client avec les projets en mémoire
 * Elle utilise le routeur central pour classifier et router les commandes
 */

import { routeProjectCommand } from './router';
import type { RouterContext, RouterOptions, ProjectCommandResult } from './types';
import type { Project } from '@/lib/domain/projects';

/**
 * Route une commande utilisateur côté client avec les projets en mémoire
 *
 * @param userMessage - Message de l'utilisateur
 * @param projects - Tous les projets en mémoire côté client
 * @param options - Options optionnelles (historique, filtres précédents, mémoire de travail)
 * @returns Résultat de la commande
 */
export async function routeProjectCommandClient(
  userMessage: string,
  projects: Project[],
  options?: {
    conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string; timestamp: Date }>;
    lastFilters?: Record<string, unknown>;
    lastAppliedFilter?: import('./types').ProjectFilter;
    lastListedProjectIds?: string[];
    requestId?: string;
  }
): Promise<ProjectCommandResult> {
  // Extraire les collabs et styles disponibles depuis les projets
  const availableCollabs = [...new Set(projects.filter((p) => p.collab).map((p) => p.collab!))];
  const availableStyles = [...new Set(projects.filter((p) => p.style).map((p) => p.style!))];

  const context: RouterContext = {
    projects,
    availableCollabs,
    availableStyles,
    projectCount: projects.length,
    lastAppliedFilter: options?.lastAppliedFilter,
    lastListedProjectIds: options?.lastListedProjectIds,
  };

  const routerOptions: RouterOptions = {
    context,
    conversationHistory: options?.conversationHistory,
    lastFilters: options?.lastFilters,
    requestId: options?.requestId,
  };

  return await routeProjectCommand(userMessage, routerOptions);
}
