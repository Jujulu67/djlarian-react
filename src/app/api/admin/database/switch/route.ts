import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/auth';
import {
  getActiveDatabaseTarget,
  getBlobTokenForTarget,
  setActiveDatabaseTarget,
} from '@/lib/database-target';
import { getPrismaClient, updateDefaultPrismaClient } from '@/lib/prisma';
import { logger } from '@/lib/logger';

/**
 * Route pour basculer entre base locale et production (HOT SWAP)
 *
 * ⚠️ IMPORTANT: Ne modifie plus .env.local ni ne redémarre le serveur.
 * Le switch se fait en runtime via le système de DatabaseTarget.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // Vérifier l'authentification
    const session = await auth();
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { useProduction } = await req.json();

    // Vérifier que nous sommes en développement
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: "Le switch de base de données n'est pas disponible en production" },
        { status: 403 }
      );
    }

    // Protection anti-prod: vérifier les garde-fous
    if (useProduction) {
      const isAdmin = session?.user?.role === 'ADMIN';
      const allowProdDbEnv =
        process.env.ALLOW_PROD_DB === '1' || process.env.ALLOW_PROD_DB === 'true';
      const allowProdDb = isAdmin || allowProdDbEnv;

      // Vérifier si DATABASE_URL_PRODUCTION pointe vers un environnement de production
      const prodDbUrl = process.env.DATABASE_URL_PRODUCTION;
      const isProdUrl =
        prodDbUrl &&
        (prodDbUrl.includes('neon.tech') ||
          prodDbUrl.includes('vercel') ||
          prodDbUrl.includes('production') ||
          prodDbUrl.includes('prod'));

      if (isProdUrl && !allowProdDb) {
        throw new Error(
          '⚠️  PROTECTION: Tentative de pointer vers une base de données de production.\n' +
            '   Accès refusé. Seuls les administrateurs authentifiés peuvent accéder à la production.\n' +
            '   Alternative: définissez ALLOW_PROD_DB=1 dans .env.local pour les scripts automatisés.'
        );
      }

      // Logger l'accès à la production pour traçabilité
      if (isProdUrl && isAdmin) {
        logger.warn(
          `[DB SWITCH] ⚠️  Switch vers base de production autorisé pour admin: ${session.user.email || session.user.id}`
        );
      }
    }

    // Vérifier que les variables d'environnement nécessaires sont définies
    const target = useProduction ? 'production' : 'local';

    if (useProduction && !process.env.DATABASE_URL_PRODUCTION) {
      throw new Error(
        "DATABASE_URL_PRODUCTION n'est pas définie dans les variables d'environnement"
      );
    }

    if (!useProduction && !process.env.DATABASE_URL_LOCAL) {
      // Utiliser l'URL par défaut si DATABASE_URL_LOCAL n'est pas définie
      logger.warn(
        "[DB SWITCH] DATABASE_URL_LOCAL non défini, utilisation de l'URL par défaut (Docker Compose)"
      );
    }

    // ⚠️ HOT SWAP: Changer la cible DB en runtime (sans redémarrage)
    const userId = session.user.email || session.user.id;
    await setActiveDatabaseTarget(target, userId);

    // Mettre à jour le client Prisma pour la nouvelle cible
    try {
      await updateDefaultPrismaClient();

      // Tester la connexion avec une requête simple
      const prisma = await getPrismaClient();
      await prisma.$queryRaw`SELECT 1`;

      logger.info(`[DB SWITCH] ✅ Switch vers ${target} réussi (hot swap)`);
    } catch (error) {
      logger.error(`[DB SWITCH] ❌ Erreur lors du switch vers ${target}:`, error);

      // Revenir à l'ancienne cible en cas d'erreur
      const previousTarget = useProduction ? 'local' : 'production';
      await setActiveDatabaseTarget(previousTarget, userId);
      await updateDefaultPrismaClient();

      return NextResponse.json(
        {
          error: `Erreur lors du switch vers ${target}. Vérifiez que la base de données est accessible.`,
          details: error instanceof Error ? error.message : String(error),
        },
        { status: 500 }
      );
    }

    // ⚠️ IMPORTANT: Mettre à jour process.env.BLOB_READ_WRITE_TOKEN pour que @vercel/blob l'utilise
    // Le SDK @vercel/blob lit directement process.env.BLOB_READ_WRITE_TOKEN
    const blobToken = await getBlobTokenForTarget(target);
    if (blobToken) {
      process.env.BLOB_READ_WRITE_TOKEN = blobToken;
      logger.info(`[DB SWITCH] BLOB_READ_WRITE_TOKEN mis à jour pour la cible: ${target}`);
    } else {
      // Si pas de token pour cette cible, supprimer la variable (Blob ne sera pas disponible)
      delete process.env.BLOB_READ_WRITE_TOKEN;
      logger.warn(`[DB SWITCH] Aucun token Blob pour la cible: ${target}`);
    }

    return NextResponse.json({
      success: true,
      message: useProduction
        ? 'Base de données de production activée (hot swap).'
        : 'Base de données locale activée (hot swap).',
      useProduction,
      requiresRestart: false, // Plus besoin de redémarrage !
      restarting: false,
      hotSwap: true,
    });
  } catch (error) {
    logger.error('Erreur lors du switch de base de données', error);
    return NextResponse.json(
      {
        error: 'Erreur lors du changement de base de données',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * Route pour récupérer l'état actuel de la cible DB
 */
export async function GET(_req: NextRequest): Promise<NextResponse> {
  try {
    // Vérifier l'authentification
    const session = await auth();
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // Vérifier que nous sommes en développement
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ useProduction: true, locked: true });
    }

    // Récupérer la cible active
    const target = await getActiveDatabaseTarget();
    const useProduction = target === 'production';

    return NextResponse.json({
      useProduction,
      locked: false,
      hotSwap: true, // Indique que le hot swap est activé
    });
  } catch (error) {
    logger.error("Erreur lors de la récupération de l'état", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération de l'état" },
      { status: 500 }
    );
  }
}
