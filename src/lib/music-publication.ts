import type { Prisma } from '@prisma/client';

/**
 * Condition Prisma des morceaux visibles par un visiteur : publiés, ou dont la date de
 * publication programmée est passée (ils sont alors publiés à la lecture).
 */
export function publicTrackWhere(now: Date = new Date()): Prisma.TrackWhereInput {
  return { OR: [{ isPublished: true }, { publishAt: { lte: now } }] };
}

/** Vrai si la publication est programmée plus tard (le morceau ne doit pas être publié). */
export function isScheduledInFuture(
  publishAt: Date | null | undefined,
  now: Date = new Date()
): boolean {
  return publishAt instanceof Date && publishAt.getTime() > now.getTime();
}
