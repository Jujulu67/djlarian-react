/**
 * Cache temporaire pour les tokens de fusion de comptes
 * Utilise la base de données Prisma pour stocker les tokens (partagé entre tous les workers)
 */

import prisma from '@/lib/prisma';

// Nettoyer les tokens expirés toutes les 5 minutes
setInterval(
  async () => {
    try {
      await prisma.mergeToken.deleteMany({
        where: {
          expiresAt: {
            lt: new Date(),
          },
        },
      });
    } catch (error) {
      console.error('[MergeTokenCache] Erreur nettoyage tokens expirés:', error);
    }
  },
  5 * 60 * 1000
);

/**
 * Stocker un token de fusion dans la base de données
 */
export async function storeMergeToken(email: string, token: string): Promise<void> {
  const expiresAt = new Date(Date.now() + 3600 * 1000); // 1 heure
  const key = email.toLowerCase();

  try {
    // Supprimer l'ancien token s'il existe
    await prisma.mergeToken.deleteMany({
      where: { email: key },
    });

    // Créer le nouveau token
    await prisma.mergeToken.create({
      data: {
        email: key,
        token,
        expiresAt,
      },
    });
  } catch (error) {
    console.error(`[MergeTokenCache] Erreur stockage token pour ${email}:`, error);
    throw error;
  }
}

/**
 * Récupérer un token de fusion depuis la base de données
 */
export async function getMergeToken(email: string): Promise<string | null> {
  const key = email.toLowerCase();

  try {
    const tokenData = await prisma.mergeToken.findFirst({
      where: {
        email: key,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (!tokenData) {
      return null;
    }

    // Supprimer le token après récupération (one-time use)
    await prisma.mergeToken.delete({
      where: { id: tokenData.id },
    });

    return tokenData.token;
  } catch (error) {
    console.error(`[MergeTokenCache] Erreur récupération token pour ${email}:`, error);
    return null;
  }
}

/**
 * Vérifier s'il y a un token disponible dans la base de données (sans le supprimer)
 * Utile pour vérifier avant de récupérer
 */
export async function peekAnyMergeToken(): Promise<{ token: string; email: string } | null> {
  try {
    const tokenData = await prisma.mergeToken.findFirst({
      where: {
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (tokenData) {
      return {
        token: tokenData.token,
        email: tokenData.email,
      };
    }

    return null;
  } catch (error) {
    console.error(`[MergeTokenCache] Erreur peekAnyMergeToken:`, error);
    return null;
  }
}

/**
 * Récupérer un token de fusion depuis la base de données (sans email, récupère le premier disponible)
 * Utile quand on n'a pas l'email mais qu'on sait qu'il y a un token en attente
 */
export async function getAnyMergeToken(): Promise<{ token: string; email: string } | null> {
  try {
    const tokenData = await prisma.mergeToken.findFirst({
      where: {
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (tokenData) {
      // Supprimer le token après récupération (one-time use)
      await prisma.mergeToken.delete({
        where: { id: tokenData.id },
      });

      return {
        token: tokenData.token,
        email: tokenData.email,
      };
    }

    return null;
  } catch (error) {
    console.error(`[MergeTokenCache] Erreur getAnyMergeToken:`, error);
    return null;
  }
}

/**
 * Vérifier si un token existe pour un email
 */
export async function hasMergeToken(email: string): Promise<boolean> {
  const key = email.toLowerCase();

  try {
    const tokenData = await prisma.mergeToken.findFirst({
      where: {
        email: key,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    return !!tokenData;
  } catch (error) {
    console.error(`[MergeTokenCache] Erreur hasMergeToken pour ${email}:`, error);
    return false;
  }
}
