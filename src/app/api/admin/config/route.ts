import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';

// Récupère toutes les configurations
export async function GET(req: NextRequest) {
  try {
    // Vérifier que l'utilisateur est admin
    const session = await getServerSession(authOptions);
    if (!session?.user?.role || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // Récupérer le paramètre de section s'il existe
    const { searchParams } = new URL(req.url);
    const section = searchParams.get('section');

    let configs;
    if (section) {
      configs = await prisma.siteConfig.findMany({
        where: { section },
        orderBy: { createdAt: 'asc' },
      });
    } else {
      configs = await prisma.siteConfig.findMany({
        orderBy: { createdAt: 'asc' },
      });
    }

    // Transformer les configurations en objet structuré
    const configObject: Record<string, Record<string, string>> = {};

    configs.forEach((config) => {
      if (!configObject[config.section]) {
        configObject[config.section] = {};
      }
      // Convertir les valeurs en types appropriés si nécessaire
      let value = config.value;
      if (value === 'true' || value === 'false') {
        value = value === 'true';
      } else if (!isNaN(Number(value)) && value !== '') {
        value = Number(value);
      }
      configObject[config.section][config.key] = value;
    });

    return NextResponse.json(configObject, { status: 200 });
  } catch (error) {
    console.error('Erreur lors de la récupération des configurations:', error);
    return NextResponse.json(
      { error: 'Erreur serveur lors de la récupération des configurations' },
      { status: 500 }
    );
  }
}

// Sauvegarde les configurations
export async function POST(req: NextRequest) {
  try {
    // Vérifier que l'utilisateur est admin
    const session = await getServerSession(authOptions);
    if (!session?.user?.role || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const data = await req.json();
    const { configs, snapshot, snapshotName, snapshotDescription } = data;

    const updatePromises = [];

    // Parcourir chaque section de configuration
    for (const section in configs) {
      for (const key in configs[section]) {
        const value = configs[section][key];

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
            updatePromises.push(
              prisma.configHistory.create({
                data: {
                  configId: existingConfig.id,
                  previousValue: existingConfig.value,
                  newValue: stringValue,
                  createdBy: session.user.email || undefined,
                  description: 'Mise à jour manuelle',
                },
              })
            );

            // Mettre à jour la configuration
            updatePromises.push(
              prisma.siteConfig.update({
                where: { id: existingConfig.id },
                data: { value: stringValue },
              })
            );
          }
        } else {
          // Créer une nouvelle configuration
          updatePromises.push(
            prisma.siteConfig.create({
              data: {
                section,
                key,
                value: stringValue,
              },
            })
          );
        }
      }
    }

    // Si on veut créer un snapshot des configurations
    if (snapshot) {
      updatePromises.push(
        prisma.configSnapshot.create({
          data: {
            name: snapshotName || `Snapshot ${new Date().toISOString()}`,
            description: snapshotDescription,
            data: configs,
            createdBy: session.user.email || undefined,
          },
        })
      );
    }

    await Promise.all(updatePromises);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Erreur lors de la sauvegarde des configurations:', error);
    return NextResponse.json(
      { error: 'Erreur serveur lors de la sauvegarde des configurations' },
      { status: 500 }
    );
  }
}
