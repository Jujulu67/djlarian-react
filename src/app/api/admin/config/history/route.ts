import { NextRequest, NextResponse } from 'next/server';

import { logger } from '@/lib/logger';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/api/requireAuth';

// Récupère l'historique des modifications
export async function GET(req: NextRequest) {
  try {
    // Vérifier que l'utilisateur est admin
    const { error: authError } = await requireAdmin({ nonAdminStatus: 401 });
    if (authError) return authError;

    // Récupérer les paramètres
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'changes'; // 'changes' ou 'snapshots'

    if (type === 'changes') {
      // Récupérer l'historique des modifications
      const history = await prisma.configHistory.findMany({
        include: {
          config: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 50, // Limiter pour des raisons de performance
      });

      return NextResponse.json(history, { status: 200 });
    } else if (type === 'snapshots') {
      // Récupérer les snapshots
      const snapshots = await prisma.configSnapshot.findMany({
        orderBy: { createdAt: 'desc' },
      });

      return NextResponse.json(snapshots, { status: 200 });
    }

    return NextResponse.json({ error: 'Type non valide' }, { status: 400 });
  } catch (error) {
    logger.error("Erreur lors de la récupération de l'historique:", error);
    return NextResponse.json(
      { error: "Erreur serveur lors de la récupération de l'historique" },
      { status: 500 }
    );
  }
}

type ConfigHistoryWithConfig = {
  configId: string;
  previousValue: string;
  newValue: string;
  createdAt: Date;
  config: { section: string; key: string };
};

/**
 * Écrit une valeur dans la configuration de l'historique : la recrée si elle n'existe plus
 * (renvoie alors une réponse d'erreur si la recréation échoue), sinon la met à jour.
 */
async function setConfigValue(
  historyItem: ConfigHistoryWithConfig,
  value: string
): Promise<NextResponse | null> {
  const configExists = await prisma.siteConfig.findUnique({
    where: { id: historyItem.configId },
  });

  if (configExists) {
    // Mettre à jour la configuration avec la valeur demandée
    await prisma.siteConfig.update({
      where: { id: historyItem.configId },
      data: { value },
    });
    return null;
  }

  // Si la config n'existe plus (peut arriver après une réinitialisation), la recréer
  try {
    await prisma.siteConfig.create({
      data: {
        id: historyItem.configId,
        section: historyItem.config.section,
        key: historyItem.config.key,
        value,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    return null;
  } catch (error) {
    logger.error('Erreur lors de la recréation de la configuration:', error);
    return NextResponse.json(
      { error: "La configuration n'existe plus et ne peut pas être recréée" },
      { status: 500 }
    );
  }
}

/** Annule une modification : remet l'ancienne valeur. */
async function revertChange(id: string, createdBy: string | undefined): Promise<NextResponse> {
  const historyItem = await prisma.configHistory.findUnique({
    where: { id },
    include: { config: true },
  });

  if (!historyItem) {
    return NextResponse.json({ error: 'Modification non trouvée' }, { status: 404 });
  }

  const failure = await setConfigValue(historyItem, historyItem.previousValue);
  if (failure) return failure;

  // Marquer cette modification comme annulée
  await prisma.configHistory.update({
    where: { id },
    data: { reverted: true },
  });

  // Ajouter une nouvelle entrée dans l'historique pour cette annulation
  await prisma.configHistory.create({
    data: {
      configId: historyItem.configId,
      previousValue: historyItem.newValue,
      newValue: historyItem.previousValue,
      createdBy,
      description: `Annulation de la modification du ${new Date(historyItem.createdAt).toLocaleString()}`,
    },
  });

  return NextResponse.json({ success: true }, { status: 200 });
}

/** Rétablit une modification annulée : remet la nouvelle valeur. */
async function restoreReverted(id: string, createdBy: string | undefined): Promise<NextResponse> {
  const historyItem = await prisma.configHistory.findUnique({
    where: { id },
    include: { config: true },
  });

  if (!historyItem) {
    return NextResponse.json({ error: 'Modification non trouvée' }, { status: 404 });
  }

  if (!historyItem.reverted) {
    return NextResponse.json({ error: "Cette modification n'est pas annulée" }, { status: 400 });
  }

  const failure = await setConfigValue(historyItem, historyItem.newValue);
  if (failure) return failure;

  // Marquer cette modification comme non-annulée
  await prisma.configHistory.update({
    where: { id },
    data: { reverted: false },
  });

  // Ajouter une nouvelle entrée dans l'historique pour ce rétablissement
  await prisma.configHistory.create({
    data: {
      configId: historyItem.configId,
      previousValue: historyItem.previousValue,
      newValue: historyItem.newValue,
      createdBy,
      description: `Rétablissement de la modification du ${new Date(historyItem.createdAt).toLocaleString()}`,
    },
  });

  return NextResponse.json({ success: true }, { status: 200 });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SnapshotValues = Record<string, Record<string, any>>;

/** Valeur stockée : les booléens et nombres sont convertis en chaîne. */
function toStoredValue(value: unknown): string {
  return typeof value === 'boolean' || typeof value === 'number'
    ? value.toString()
    : (value as string);
}

/** Applique les valeurs d'un snapshot à toutes les configurations qu'il contient. */
async function applySnapshotValues(
  snapshotName: string,
  snapshotData: SnapshotValues,
  createdBy: string | undefined
): Promise<void> {
  for (const section in snapshotData) {
    for (const key in snapshotData[section]) {
      const stringValue = toStoredValue(snapshotData[section][key]);

      // Chercher si cette config existe déjà
      const existingConfig = await prisma.siteConfig.findUnique({
        where: {
          section_key: {
            section,
            key,
          },
        },
      });

      if (!existingConfig) {
        // Créer une nouvelle configuration
        await prisma.siteConfig.create({
          data: {
            section,
            key,
            value: stringValue,
          },
        });
      } else if (existingConfig.value !== stringValue) {
        // Ne mettre à jour que si la valeur a changé
        // Créer une entrée dans l'historique
        await prisma.configHistory.create({
          data: {
            configId: existingConfig.id,
            previousValue: existingConfig.value,
            newValue: stringValue,
            createdBy,
            description: `Restauré depuis le snapshot: ${snapshotName}`,
          },
        });

        // Mettre à jour la configuration
        await prisma.siteConfig.update({
          where: { id: existingConfig.id },
          data: { value: stringValue },
        });
      }
    }
  }
}

/** Restaure la configuration depuis un snapshot enregistré. */
async function applySnapshot(id: string, createdBy: string | undefined): Promise<NextResponse> {
  const snapshot = await prisma.configSnapshot.findUnique({
    where: { id },
  });

  if (!snapshot) {
    return NextResponse.json({ error: 'Snapshot non trouvé' }, { status: 404 });
  }

  await applySnapshotValues(snapshot.name, snapshot.data as SnapshotValues, createdBy);

  return NextResponse.json({ success: true }, { status: 200 });
}

// Restaure une configuration depuis un snapshot ou annule une modification
export async function POST(req: NextRequest) {
  try {
    // Vérifier que l'utilisateur est admin
    const { session, error: authError } = await requireAdmin({ nonAdminStatus: 401 });
    if (authError) return authError;

    const data = await req.json();
    const { action, id } = data;
    const createdBy = session.user.email || undefined;

    if (action === 'revert-change') {
      return await revertChange(id, createdBy);
    }
    if (action === 'restore-reverted') {
      return await restoreReverted(id, createdBy);
    }
    if (action === 'apply-snapshot') {
      return await applySnapshot(id, createdBy);
    }

    return NextResponse.json({ error: 'Action non valide' }, { status: 400 });
  } catch (error) {
    logger.error('Erreur lors de la restauration de la configuration:', error);
    return NextResponse.json(
      { error: 'Erreur serveur lors de la restauration de la configuration' },
      { status: 500 }
    );
  }
}
