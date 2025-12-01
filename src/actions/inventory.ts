'use server';

import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function getInventory(userId: string) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'ADMIN') {
      throw new Error('Unauthorized');
    }

    const inventory = await prisma.userLiveItem.findMany({
      where: { userId },
      include: {
        LiveItem: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return { success: true, data: inventory };
  } catch (error) {
    console.error('Error fetching inventory:', error);
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
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'ADMIN') {
      throw new Error('Unauthorized');
    }

    // Check if user already has this item
    const existingItem = await prisma.userLiveItem.findUnique({
      where: {
        userId_itemId: {
          userId,
          itemId,
        },
      },
    });

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

    revalidatePath('/admin/live');
    return { success: true };
  } catch (error) {
    console.error('Error adding item:', error);
    return { success: false, error: 'Failed to add item' };
  }
}

export async function removeItemFromUser(userId: string, itemId: string, quantity: number = 1) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'ADMIN') {
      throw new Error('Unauthorized');
    }

    const existingItem = await prisma.userLiveItem.findUnique({
      where: {
        userId_itemId: {
          userId,
          itemId,
        },
      },
    });

    if (!existingItem) {
      return { success: false, error: 'Item not found in user inventory' };
    }

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

    revalidatePath('/admin/live');
    return { success: true };
  } catch (error) {
    console.error('Error removing item:', error);
    return { success: false, error: 'Failed to remove item' };
  }
}

export async function toggleItemActivation(userItemId: string) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'ADMIN') {
      throw new Error('Unauthorized');
    }

    const item = await prisma.userLiveItem.findUnique({
      where: { id: userItemId },
    });

    if (!item) {
      return { success: false, error: 'Item not found' };
    }

    await prisma.userLiveItem.update({
      where: { id: userItemId },
      data: {
        isActivated: !item.isActivated,
        activatedAt: !item.isActivated ? new Date() : null,
      },
    });

    revalidatePath('/admin/live');
    return { success: true };
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
