import { Project as PrismaProject } from '@prisma/client';

import { Project, ProjectStatus } from '@/components/projects/types';

/**
 * Serialize a Prisma Project to a client-safe Project type
 * Converts Date objects to ISO strings for JSON serialization
 */
export function serializeProject(
  project: PrismaProject & { User?: { id: string; name: string | null; email: string | null } }
): Project {
  return {
    ...project,
    status: project.status as ProjectStatus,
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
