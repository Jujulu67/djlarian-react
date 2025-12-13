/**
 * Factory déterministe pour créer des projets de test avec IDs uniques
 *
 * Objectif : Éviter les conflits d'IDs entre tests et garantir un comportement déterministe.
 * Les IDs sont générés de manière séquentielle : TestProject-0001, TestProject-0002, etc.
 */

import type { Project } from '@/components/projects/types';

/**
 * Compteur global pour générer des IDs uniques
 */
let nextProjectId = 1;

/**
 * Réinitialise le compteur de projets (à appeler dans beforeEach)
 */
export function resetTestProjectFactory(): void {
  nextProjectId = 1;
}

/**
 * Génère un ID unique déterministe pour un projet de test
 */
function generateUniqueProjectId(): string {
  const id = `TestProject-${String(nextProjectId).padStart(4, '0')}`;
  nextProjectId += 1;
  return id;
}

/**
 * Crée un projet de test avec un ID unique déterministe
 *
 * @param overrides - Valeurs à surcharger pour ce projet spécifique
 * @returns Un projet avec tous les champs remplis et un ID unique
 */
export function createTestProject(overrides: Partial<Project> = {}): Project {
  const now = new Date();
  const id = generateUniqueProjectId();

  return {
    id,
    name: overrides.name || `Projet ${id}`,
    status: overrides.status || 'EN_COURS',
    progress: overrides.progress ?? 50,
    collab: overrides.collab ?? null,
    style: overrides.style ?? null,
    deadline: overrides.deadline ?? null,
    createdAt: overrides.createdAt || now,
    updatedAt: overrides.updatedAt || now,
    order: overrides.order ?? 0,
    userId: overrides.userId || 'user1',
    label: overrides.label ?? null,
    labelFinal: overrides.labelFinal ?? null,
    releaseDate: overrides.releaseDate ?? null,
    externalLink: overrides.externalLink ?? null,
    streamsJ7: overrides.streamsJ7 ?? null,
    streamsJ14: overrides.streamsJ14 ?? null,
    streamsJ21: overrides.streamsJ21 ?? null,
    streamsJ28: overrides.streamsJ28 ?? null,
    streamsJ56: overrides.streamsJ56 ?? null,
    streamsJ84: overrides.streamsJ84 ?? null,
    streamsJ180: overrides.streamsJ180 ?? null,
    streamsJ365: overrides.streamsJ365 ?? null,
    note: overrides.note ?? null,
  };
}

/**
 * Crée un dataset complet de projets de test pour différents cas d'usage
 *
 * @returns Un objet contenant différents groupes de projets pour les tests
 */
export function createProjectsDataset() {
  const projects: Project[] = [];

  // 5 projets EN_COURS avec progress 30
  for (let i = 0; i < 5; i++) {
    projects.push(
      createTestProject({
        status: 'EN_COURS',
        progress: 30,
      })
    );
  }

  // 3 projets TERMINE avec progress 100
  for (let i = 0; i < 3; i++) {
    projects.push(
      createTestProject({
        status: 'TERMINE',
        progress: 100,
      })
    );
  }

  // 2 projets EN_COURS avec collab 'hoho' et progress 50
  for (let i = 0; i < 2; i++) {
    projects.push(
      createTestProject({
        status: 'EN_COURS',
        collab: 'hoho',
        progress: 50,
      })
    );
  }

  // 4 projets EN_COURS avec style 'afro' et progress 40
  for (let i = 0; i < 4; i++) {
    projects.push(
      createTestProject({
        status: 'EN_COURS',
        style: 'afro',
        progress: 40,
      })
    );
  }

  // 3 projets EN_COURS avec deadline et progress 60
  for (let i = 0; i < 3; i++) {
    projects.push(
      createTestProject({
        status: 'EN_COURS',
        deadline: '2024-12-31',
        progress: 60,
      })
    );
  }

  // 2 projets EN_COURS sans deadline et progress 70
  for (let i = 0; i < 2; i++) {
    projects.push(
      createTestProject({
        status: 'EN_COURS',
        deadline: null,
        progress: 70,
      })
    );
  }

  return {
    all: projects,
    enCours: projects.filter((p) => p.status === 'EN_COURS'),
    termines: projects.filter((p) => p.status === 'TERMINE'),
    withCollabHoho: projects.filter((p) => p.collab === 'hoho'),
    withStyleAfro: projects.filter((p) => p.style === 'afro'),
    withDeadline: projects.filter((p) => p.deadline !== null),
    withoutDeadline: projects.filter((p) => p.deadline === null),
  };
}

/**
 * Vérifie que tous les projets ont des IDs uniques
 *
 * @param projects - Liste de projets à vérifier
 * @throws Error si des IDs dupliqués sont détectés
 */
export function expectUniqueProjectIds(projects: Project[]): void {
  const ids = projects.map((p) => p.id);
  const uniqueIds = new Set(ids);

  if (ids.length !== uniqueIds.size) {
    const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
    throw new Error(
      `IDs dupliqués détectés dans les projets de test: ${duplicates.join(', ')}. ` +
        `Total: ${ids.length}, Uniques: ${uniqueIds.size}`
    );
  }
}
