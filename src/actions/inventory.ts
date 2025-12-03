'use server';

import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { createDbPerformanceLogger } from '@/lib/db-performance';

export async function getInventory(userId: string) {
  const perf = createDbPerformanceLogger('getInventory');
  const t0 = perf.start();
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'ADMIN') {
      throw new Error('Unauthorized');
    }

    const t1 = Date.now();
    const inventory = await prisma.userLiveItem.findMany({
      where: { userId },
      include: {
        LiveItem: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    const t2 = Date.now();

    perf.logQuery(t1, t2, 'userLiveItem.findMany');
    perf.end(t0, {
      queryTime: t2 - t1,
      query: 'userLiveItem.findMany',
    });

    return { success: true, data: inventory };
  } catch (error) {
    console.error('Error fetching inventory:', error);
    perf.end(t0, { metadata: { error: error instanceof Error ? error.message : String(error) } });
    return { success: false, error: 'Failed to fetch inventory' };
  }
}

export async function getAllItems() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'ADMIN') {
      throw new Error('Unauthorized');
    }

    const items = await prisma.liveItem.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });

    return { success: true, data: items };
  } catch (error) {
    console.error('Error fetching items:', error);
    return { success: false, error: 'Failed to fetch items' };
  }
}

export async function addItemToUser(userId: string, itemId: string, quantity: number = 1) {
  const perf = createDbPerformanceLogger('addItemToUser');
  const t0 = perf.start();
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'ADMIN') {
      throw new Error('Unauthorized');
    }

    // Check if user already has this item
    const t1 = Date.now();
    const existingItem = await prisma.userLiveItem.findUnique({
      where: {
        userId_itemId: {
          userId,
          itemId,
        },
      },
    });
    const t2 = Date.now();
    perf.logQuery(t1, t2, 'userLiveItem.findUnique');

    const t3 = Date.now();
    if (existingItem) {
      await prisma.userLiveItem.update({
        where: { id: existingItem.id },
        data: { quantity: { increment: quantity } },
      });
    } else {
      await prisma.userLiveItem.create({
        data: {
          userId,
          itemId,
          quantity,
        },
      });
    }
    const t4 = Date.now();
    perf.logQuery(t3, t4, existingItem ? 'userLiveItem.update' : 'userLiveItem.create');

    // Plus de revalidatePath ici : l'UI admin gère déjà les mises à jour via optimistic update
    // et refresh manuel/automatique si nécessaire.
    perf.end(t0, {
      queryTime: t2 - t1 + (t4 - t3),
      query: existingItem ? 'findUnique+update' : 'findUnique+create',
      operation: 'addItemToUser',
    });

    return { success: true };
  } catch (error) {
    console.error('Error adding item:', error);
    perf.end(t0, { metadata: { error: error instanceof Error ? error.message : String(error) } });
    return { success: false, error: 'Failed to add item' };
  }
}

export async function removeItemFromUser(userId: string, itemId: string, quantity: number = 1) {
  const perf = createDbPerformanceLogger('removeItemFromUser');
  const t0 = perf.start();
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'ADMIN') {
      throw new Error('Unauthorized');
    }

    const t1 = Date.now();
    const existingItem = await prisma.userLiveItem.findUnique({
      where: {
        userId_itemId: {
          userId,
          itemId,
        },
      },
    });
    const t2 = Date.now();
    perf.logQuery(t1, t2, 'userLiveItem.findUnique');

    if (!existingItem) {
      perf.end(t0, { queryTime: t2 - t1, query: 'findUnique (not found)' });
      return { success: false, error: 'Item not found in user inventory' };
    }

    const t3 = Date.now();
    if (existingItem.quantity <= quantity) {
      await prisma.userLiveItem.delete({
        where: { id: existingItem.id },
      });
    } else {
      await prisma.userLiveItem.update({
        where: { id: existingItem.id },
        data: { quantity: { decrement: quantity } },
      });
    }
    const t4 = Date.now();
    perf.logQuery(
      t3,
      t4,
      existingItem.quantity <= quantity ? 'userLiveItem.delete' : 'userLiveItem.update'
    );

    // Plus de revalidatePath ici : l'UI admin gère déjà les mises à jour via optimistic update
    // et refresh manuel/automatique si nécessaire.
    perf.end(t0, {
      queryTime: t2 - t1 + (t4 - t3),
      query: existingItem.quantity <= quantity ? 'findUnique+delete' : 'findUnique+update',
      operation: 'removeItemFromUser',
    });

    return { success: true };
  } catch (error) {
    console.error('Error removing item:', error);
    perf.end(t0, { metadata: { error: error instanceof Error ? error.message : String(error) } });
    return { success: false, error: 'Failed to remove item' };
  }
}

/**
 * Active un item (incrémente activatedQuantity de 1)
 */
export async function activateItem(userItemId: string) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'ADMIN') {
      throw new Error('Unauthorized');
    }

    const item = await prisma.userLiveItem.findUnique({
      where: { id: userItemId },
      include: {
        LiveItem: true,
      },
    });

    if (!item) {
      return { success: false, error: 'Item not found' };
    }

    // Vérifier qu'on peut encore activer (activatedQuantity < quantity)
    if (item.activatedQuantity >= item.quantity) {
      return { success: false, error: 'Tous les items sont déjà activés' };
    }

    const itemType = item.LiveItem?.type || '';
    const itemName = item.LiveItem?.name || '';
    const isQueueSkip =
      itemType === 'SKIP_QUEUE' ||
      itemName.toLowerCase().includes('skip queue') ||
      itemName.toLowerCase().includes('queue skip');

    // Pour Skip_Queue: vérifier qu'aucun autre n'est activé
    if (isQueueSkip) {
      // Si on essaie d'activer (activatedQuantity va passer de 0 à 1)
      if (item.activatedQuantity === 0) {
        // Vérifier qu'aucun autre Queue Skip n'a activatedQuantity > 0
        const otherQueueSkips = await prisma.userLiveItem.findMany({
          where: {
            userId: item.userId,
            id: { not: userItemId },
            activatedQuantity: { gt: 0 },
          },
          include: {
            LiveItem: true,
          },
        });

        const existingActivatedQueueSkip = otherQueueSkips.find((userItem) => {
          const itemType = userItem.LiveItem?.type || '';
          const itemName = userItem.LiveItem?.name?.toLowerCase() || '';
          return (
            itemType === 'SKIP_QUEUE' ||
            itemName.includes('skip queue') ||
            itemName.includes('queue skip')
          );
        });

        if (existingActivatedQueueSkip) {
          return {
            success: false,
            error:
              "Un Queue Skip est déjà activé. Désactivez-le d'abord avant d'en activer un autre.",
          };
        }
      }

      // Pour Skip_Queue, limiter activatedQuantity à 1 max
      if (item.activatedQuantity >= 1) {
        return { success: false, error: 'Un seul Queue Skip peut être activé à la fois' };
      }
    }

    const wasInactive = item.activatedQuantity === 0;
    const newActivatedQuantity = item.activatedQuantity + 1;

    await prisma.userLiveItem.update({
      where: { id: userItemId },
      data: {
        activatedQuantity: newActivatedQuantity,
        isActivated: newActivatedQuantity > 0, // Mettre à jour pour compatibilité
        activatedAt: wasInactive ? new Date() : item.activatedAt,
      },
    });
    // Plus de revalidatePath ici : l'UI admin gère déjà les mises à jour via optimistic update
    // et refresh manuel/automatique si nécessaire.
    return { success: true };
  } catch (error) {
    console.error('Error activating item:', error);
    return { success: false, error: 'Failed to activate item' };
  }
}

/**
 * Désactive un item (décrémente activatedQuantity de 1)
 */
export async function deactivateItem(userItemId: string) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'ADMIN') {
      throw new Error('Unauthorized');
    }

    const item = await prisma.userLiveItem.findUnique({
      where: { id: userItemId },
      include: {
        LiveItem: true,
      },
    });

    if (!item) {
      return { success: false, error: 'Item not found' };
    }

    // Vérifier qu'on peut désactiver (activatedQuantity > 0)
    if (item.activatedQuantity <= 0) {
      return { success: false, error: "Aucun item n'est activé" };
    }

    const newActivatedQuantity = item.activatedQuantity - 1;
    const becomesInactive = newActivatedQuantity === 0;

    await prisma.userLiveItem.update({
      where: { id: userItemId },
      data: {
        activatedQuantity: newActivatedQuantity,
        isActivated: newActivatedQuantity > 0, // Mettre à jour pour compatibilité
        activatedAt: becomesInactive ? null : item.activatedAt,
      },
    });
    // Plus de revalidatePath ici : l'UI admin gère déjà les mises à jour via optimistic update
    // et refresh manuel/automatique si nécessaire.
    return { success: true };
  } catch (error) {
    console.error('Error deactivating item:', error);
    return { success: false, error: 'Failed to deactivate item' };
  }
}

/**
 * @deprecated Utiliser activateItem ou deactivateItem à la place
 */
export async function toggleItemActivation(userItemId: string) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'ADMIN') {
      throw new Error('Unauthorized');
    }

    const item = await prisma.userLiveItem.findUnique({
      where: { id: userItemId },
      include: {
        LiveItem: true,
      },
    });

    if (!item) {
      return { success: false, error: 'Item not found' };
    }

    // Utiliser activateItem ou deactivateItem selon l'état actuel
    if (item.activatedQuantity === 0) {
      return activateItem(userItemId);
    } else {
      return deactivateItem(userItemId);
    }
  } catch (error) {
    console.error('Error toggling item activation:', error);
    return { success: false, error: 'Failed to toggle item activation' };
  }
}

export async function searchUsers(query: string) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'ADMIN') {
      throw new Error('Unauthorized');
    }

    const whereClause =
      query && query.length >= 2
        ? {
            OR: [
              { name: { contains: query } }, // Case insensitive usually depends on DB collation
              { email: { contains: query } },
            ],
          }
        : {};

    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
      },
      take: 20,
      orderBy: {
        createdAt: 'desc',
      },
    });

    return { success: true, data: users };
  } catch (error) {
    console.error('Error searching users:', error);
    return { success: false, error: 'Failed to search users' };
  }
}
