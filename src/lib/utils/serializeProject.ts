import { Project as PrismaProject } from '@prisma/client';

import type { Project, ProjectStatus } from '@/lib/domain/projects';

/**
 * Serialize a Prisma Project to a client-safe Project type
 * Converts Date objects to ISO strings for JSON serialization
 * Normalizes TERMINE projects to ensure progress = 100
 */
export function serializeProject(
  project: PrismaProject & { User?: { id: string; name: string | null; email: string | null } }
): Project {
  // Normaliser les projets TERMINE : garantir que progress = 100
  const normalizedProgress =
    project.status === 'TERMINE' && project.progress === null ? 100 : project.progress;

  return {
    ...project,
    status: project.status as ProjectStatus,
    progress: normalizedProgress,
    deadline: project.deadline?.toISOString() ?? null,
    releaseDate: project.releaseDate?.toISOString() ?? null,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
    User: project.User
      ? {
          id: project.User.id,
          name: project.User.name,
          email: project.User.email,
        }
      : undefined,
  };
}

/**
 * Serialize an array of Prisma Projects to client-safe Project types
 */
export function serializeProjects(
  projects: Array<
    PrismaProject & { User?: { id: string; name: string | null; email: string | null } }
  >
): Project[] {
  return projects.map(serializeProject);
}
