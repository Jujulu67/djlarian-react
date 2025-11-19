import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';

import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';

// Récupère l'historique des modifications
export async function GET(req: NextRequest) {
  try {
    // Vérifier que l'utilisateur est admin
    const session = await auth();
    if (!session?.user?.role || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

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

// Restaure une configuration depuis un snapshot ou annule une modification
export async function POST(req: NextRequest) {
  try {
    // Vérifier que l'utilisateur est admin
    const session = await auth();
    if (!session?.user?.role || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const data = await req.json();
    const { action, id } = data;

    if (action === 'revert-change') {
      // Annuler une modification spécifique
      const historyItem = await prisma.configHistory.findUnique({
        where: { id },
        include: { config: true },
      });

      if (!historyItem) {
        return NextResponse.json({ error: 'Modification non trouvée' }, { status: 404 });
      }

      // Vérifier si la configuration existe toujours
      const configExists = await prisma.siteConfig.findUnique({
        where: { id: historyItem.configId },
      });

      if (!configExists) {
        // Si la config n'existe plus (peut arriver après une réinitialisation), la recréer
        try {
          // Récupérer les infos de section/key à partir de l'historique
          await prisma.siteConfig.create({
            data: {
              id: historyItem.configId,
              section: historyItem.config.section,
              key: historyItem.config.key,
              value: historyItem.previousValue,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          });
        } catch (error) {
          logger.error('Erreur lors de la recréation de la configuration:', error);
          return NextResponse.json(
            { error: "La configuration n'existe plus et ne peut pas être recréée" },
            { status: 500 }
          );
        }
      } else {
        // Mettre à jour la configuration avec l'ancienne valeur
        await prisma.siteConfig.update({
          where: { id: historyItem.configId },
          data: { value: historyItem.previousValue },
        });
      }

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
          createdBy: session.user.email || undefined,
          description: `Annulation de la modification du ${new Date(historyItem.createdAt).toLocaleString()}`,
        },
      });

      return NextResponse.json({ success: true }, { status: 200 });
    } else if (action === 'restore-reverted') {
      // Rétablir une modification qui a été annulée
      const historyItem = await prisma.configHistory.findUnique({
        where: { id },
        include: { config: true },
      });

      if (!historyItem) {
        return NextResponse.json({ error: 'Modification non trouvée' }, { status: 404 });
      }

      if (!historyItem.reverted) {
        return NextResponse.json(
          { error: "Cette modification n'est pas annulée" },
          { status: 400 }
        );
      }

      // Chercher si la configuration existe
      const configExists = await prisma.siteConfig.findUnique({
        where: { id: historyItem.configId },
      });

      // Créer ou mettre à jour la configuration avec la nouvelle valeur (qui était la valeur après la modif)
      if (!configExists) {
        try {
          // Recréer la configuration si elle n'existe plus
          await prisma.siteConfig.create({
            data: {
              id: historyItem.configId,
              section: historyItem.config.section,
              key: historyItem.config.key,
              value: historyItem.newValue,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          });
        } catch (error) {
          logger.error('Erreur lors de la recréation de la configuration:', error);
          return NextResponse.json(
            { error: "La configuration n'existe plus et ne peut pas être recréée" },
            { status: 500 }
          );
        }
      } else {
        // Mettre à jour la configuration avec la nouvelle valeur
        await prisma.siteConfig.update({
          where: { id: historyItem.configId },
          data: { value: historyItem.newValue },
        });
      }

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
          createdBy: session.user.email || undefined,
          description: `Rétablissement de la modification du ${new Date(historyItem.createdAt).toLocaleString()}`,
        },
      });

      return NextResponse.json({ success: true }, { status: 200 });
    } else if (action === 'apply-snapshot') {
      // Restaurer depuis un snapshot
      const snapshot = await prisma.configSnapshot.findUnique({
        where: { id },
      });

      if (!snapshot) {
        return NextResponse.json({ error: 'Snapshot non trouvé' }, { status: 404 });
      }

      const snapshotData = snapshot.data as Record<string, Record<string, any>>;

      // Pour chaque configuration dans le snapshot
      for (const section in snapshotData) {
        for (const key in snapshotData[section]) {
          const value = snapshotData[section][key];

          // Convertir les valeurs en chaînes pour le stockage
          const stringValue =
            typeof value === 'boolean' || typeof value === 'number' ? value.toString() : value;

          // Chercher si cette config existe déjà
          const existingConfig = await prisma.siteConfig.findUnique({
            where: {
              section_key: {
                section,
                key,
              },
            },
          });

          if (existingConfig) {
            // Ne mettre à jour que si la valeur a changé
            if (existingConfig.value !== stringValue) {
              // Créer une entrée dans l'historique
              await prisma.configHistory.create({
                data: {
                  configId: existingConfig.id,
                  previousValue: existingConfig.value,
                  newValue: stringValue,
                  createdBy: session.user.email || undefined,
                  description: `Restauré depuis le snapshot: ${snapshot.name}`,
                },
              });

              // Mettre à jour la configuration
              await prisma.siteConfig.update({
                where: { id: existingConfig.id },
                data: { value: stringValue },
              });
            }
          } else {
            // Créer une nouvelle configuration
            await prisma.siteConfig.create({
              data: {
                section,
                key,
                value: stringValue,
              },
            });
          }
        }
      }

      return NextResponse.json({ success: true }, { status: 200 });
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
