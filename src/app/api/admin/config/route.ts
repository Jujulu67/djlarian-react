import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';

// Valeurs par défaut pour les configurations (en cas d'erreur ou de première visite)
const defaultConfigs = {
  general: {
    siteName: 'DJ Larian',
    siteDescription: 'Site officiel de DJ Larian - Musique électronique et événements.',
    contactEmail: 'contact@djlarian.com',
    timeZone: 'Europe/Paris',
    dateFormat: 'DD/MM/YYYY',
  },
  appearance: {
    primaryColor: '#8B5CF6',
    secondaryColor: '#3B82F6',
    darkMode: true,
    animationsEnabled: true,
    logoUrl: '/images/logo.png',
    faviconUrl: '/favicon.ico',
  },
  homepage: {
    heroTitle: 'DJ LARIAN',
    heroSubtitle: 'Electronic Music Producer & Innovative Performer',
    heroExploreButtonText: 'Explore Music',
    heroExploreButtonUrl: '/music',
    heroEventsButtonText: 'Upcoming Events',
    heroEventsButtonUrl: '/events',
    heroBackgroundVideo: '/videos/hero-background.mp4',
    heroPosterImage: '/images/hero-poster.jpg',
    sectionsOrder: 'hero,releases,visualizer,events,stream',
    releasesEnabled: true,
    releasesTitle: 'Latest Releases',
    releasesCount: 3,
    visualizerEnabled: true,
    visualizerTitle: 'Experience the Sound',
    eventsEnabled: true,
    eventsTitle: 'Upcoming Events',
    eventsCount: 3,
    eventsViewAllText: 'View All Events',
    eventsViewAllUrl: '/events',
    streamEnabled: true,
    streamTitle: 'Live Stream',
    streamSubtitle: 'Join the Live Experience',
    streamDescription:
      'Tune in to my live streams where I share my creative process, perform exclusive sets, and interact with the community in real-time.',
    twitchUsername: 'djlarian',
    twitchFollowButtonText: 'Follow on Twitch',
    twitchFollowButtonUrl: 'https://twitch.tv/djlarian',
    streamNotifyButtonText: 'Get Notified',
    streamStatsEnabled: true,
    streamFollowers: '24K+',
    streamHoursStreamed: '150+',
    streamTracksPlayed: '500+',
  },
  notifications: {
    emailNotifications: true,
    adminAlerts: true,
    newUserNotifications: true,
    eventReminders: true,
    marketingEmails: false,
  },
  security: {
    twoFactorAuth: false,
    passwordExpiration: 90,
    ipRestriction: false,
    failedLoginLimit: 5,
    sessionTimeout: 60,
  },
  api: {
    apiEnabled: true,
    rateLimit: 100,
    webhookUrl: '',
    umamiEnabled: true,
    umamiSiteId: 'your-umami-site-id',
  },
};

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

    // Vérifier si les tables nécessaires existent et sont accessibles
    let areTablesReady = true;
    try {
      // Tenter de compter les entrées pour vérifier que la table existe et est accessible
      await prisma.siteConfig.count();
    } catch (tableError) {
      console.error('Erreur lors de la vérification des tables:', tableError);
      areTablesReady = false;
    }

    let configObject = {};

    if (areTablesReady) {
      // Tables prêtes, on récupère les données normalement
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
      configObject = {};

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

      // Si aucune config n'est trouvée, utiliser les valeurs par défaut
      if (Object.keys(configObject).length === 0) {
        console.log('Aucune configuration trouvée, utilisation des valeurs par défaut');
        configObject = { ...defaultConfigs };
      }
    } else {
      // Tables non prêtes, on utilise les valeurs par défaut
      console.log('Tables non prêtes, utilisation des valeurs par défaut');
      configObject = { ...defaultConfigs };
    }

    return NextResponse.json(configObject, { status: 200 });
  } catch (error) {
    console.error('Erreur lors de la récupération des configurations:', error);

    // En cas d'erreur, retourner les valeurs par défaut
    console.log('Erreur, utilisation des valeurs par défaut');
    return NextResponse.json(defaultConfigs, { status: 200 });
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

    // Vérifier si les tables nécessaires existent et sont accessibles
    let areTablesReady = true;
    try {
      // Tenter de compter les entrées pour vérifier que la table existe et est accessible
      await prisma.siteConfig.count();
      await prisma.configHistory.count();
      if (areTablesReady) {
        console.log('Tables prêtes pour la sauvegarde');
      }
    } catch (tableError) {
      console.error('Erreur lors de la vérification des tables:', tableError);
      areTablesReady = false;
    }

    // Si les tables ne sont pas prêtes, simuler un succès (pour le développement)
    if (!areTablesReady) {
      console.log('Tables non prêtes, simulation de succès pour le développement');
      return NextResponse.json({ success: true, status: 'SIMULATED' }, { status: 200 });
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

        try {
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
        } catch (configError) {
          console.error(`Erreur lors du traitement de la config ${section}.${key}:`, configError);
          // Continuer avec les autres configurations
        }
      }
    }

    // Si on veut créer un snapshot des configurations
    if (snapshot) {
      try {
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
      } catch (snapshotError) {
        console.error('Erreur lors de la création du snapshot:', snapshotError);
      }
    }

    // Exécuter toutes les promesses
    try {
      await Promise.all(updatePromises);
    } catch (promiseError) {
      console.error("Erreur lors de l'exécution des mises à jour:", promiseError);
      return NextResponse.json(
        { error: 'Erreur lors de la sauvegarde de certaines configurations', partialSuccess: true },
        { status: 207 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Erreur lors de la sauvegarde des configurations:', error);
    return NextResponse.json(
      { error: 'Erreur serveur lors de la sauvegarde des configurations' },
      { status: 500 }
    );
  }
}
