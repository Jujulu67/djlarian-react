import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import prisma from '@/lib/prisma';
import { defaultConfigs } from '@/config/defaults';

// Types pour les sections de configuration
type GeneralConfig = {
  siteName: string;
  siteDescription: string;
  contactEmail: string;
  timeZone: string;
  dateFormat: string;
};

type AppearanceConfig = {
  primaryColor: string;
  secondaryColor: string;
  darkMode: string;
  animationsEnabled: string;
  logoUrl: string;
  faviconUrl: string;
};

type NotificationsConfig = {
  emailNotifications: string;
  adminAlerts: string;
  newUserNotifications: string;
  eventReminders: string;
  marketingEmails: string;
};

type SecurityConfig = {
  twoFactorAuth: string;
  passwordExpiration: string;
  ipRestriction: string;
  failedLoginLimit: string;
  sessionTimeout: string;
};

type ApiConfig = {
  apiEnabled: string;
  rateLimit: string;
  webhookUrl: string;
  umamiEnabled: string;
  umamiSiteId: string;
};

type HomepageConfig = {
  heroTitle: string;
  heroSubtitle: string;
  heroExploreButtonText: string;
  heroExploreButtonUrl: string;
  heroEventsButtonText: string;
  heroEventsButtonUrl: string;
  heroBackgroundVideo: string;
  heroPosterImage: string;
  sectionsOrder: string;
  releasesEnabled: string;
  releasesTitle: string;
  releasesCount: string;
  visualizerEnabled: string;
  visualizerTitle: string;
  eventsEnabled: string;
  eventsTitle: string;
  eventsCount: string;
  eventsViewAllText: string;
  eventsViewAllUrl: string;
  streamEnabled: string;
  streamTitle: string;
  streamSubtitle: string;
  streamDescription: string;
  twitchUsername: string;
  twitchFollowButtonText: string;
  twitchFollowButtonUrl: string;
  streamNotifyButtonText: string;
  streamStatsEnabled: string;
  streamFollowers: string;
  streamHoursStreamed: string;
  streamTracksPlayed: string;
};

type DefaultConfigs = {
  general: GeneralConfig;
  appearance: AppearanceConfig;
  notifications: NotificationsConfig;
  security: SecurityConfig;
  api: ApiConfig;
  homepage: HomepageConfig;
};

// Endpoint pour réinitialiser les configurations
export async function POST(req: NextRequest) {
  try {
    // Vérifier que l'utilisateur est admin
    const session = await getServerSession(authOptions);
    if (!session?.user?.role || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const updatePromises = [];

    // Pour chaque section de configuration
    for (const section in defaultConfigs) {
      const sectionKey = section as keyof DefaultConfigs;
      const sectionConfig = defaultConfigs[sectionKey];

      for (const key in sectionConfig) {
        const value = sectionConfig[key as keyof typeof sectionConfig];

        // Chercher si cette config existe déjà
        const existingConfig = await prisma.$queryRaw`
          SELECT * FROM "SiteConfig" 
          WHERE section = ${section} AND key = ${key}
        `;

        if (existingConfig && Array.isArray(existingConfig) && existingConfig.length > 0) {
          const config = existingConfig[0];
          // Ne mettre à jour que si la valeur a changé
          if (config.value !== value) {
            // Créer une entrée dans l'historique
            await prisma.$executeRaw`
              INSERT INTO "ConfigHistory" ("id", "configId", "previousValue", "newValue", "createdBy", "description", "createdAt")
              VALUES (gen_random_uuid(), ${config.id}, ${config.value}, ${value}, ${session.user.email || null}, 'Réinitialisation aux valeurs par défaut', NOW())
            `;

            // Mettre à jour la configuration
            await prisma.$executeRaw`
              UPDATE "SiteConfig" 
              SET value = ${value}
              WHERE id = ${config.id}
            `;
          }
        } else {
          // Créer une nouvelle configuration
          await prisma.$executeRaw`
            INSERT INTO "SiteConfig" (section, key, value, "createdAt", "updatedAt")
            VALUES (${section}, ${key}, ${value}, NOW(), NOW())
          `;
        }
      }
    }

    // Créer un snapshot automatique avant la réinitialisation
    const currentConfigs = await fetchCurrentConfigs();
    try {
      // Utiliser prisma.configSnapshot.create au lieu de $executeRaw pour éviter les erreurs de type
      await prisma.configSnapshot.create({
        data: {
          name: 'Avant réinitialisation - ' + new Date().toLocaleString(),
          description: 'Snapshot automatique créé avant la réinitialisation aux valeurs par défaut',
          data: currentConfigs,
          createdBy: session.user.email || undefined,
        },
      });
    } catch (snapshotError) {
      console.error(
        'Erreur lors de la création du snapshot avant réinitialisation:',
        snapshotError
      );
      // Continuer même si la création du snapshot a échoué
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Erreur lors de la réinitialisation des configurations:', error);
    return NextResponse.json(
      { error: 'Erreur serveur lors de la réinitialisation des configurations' },
      { status: 500 }
    );
  }
}

// Fonction utilitaire pour récupérer les configurations actuelles
async function fetchCurrentConfigs() {
  const configs = await prisma.$queryRaw`SELECT * FROM "SiteConfig"`;
  const configObject: Record<string, Record<string, any>> = {};

  if (Array.isArray(configs)) {
    configs.forEach((config: any) => {
      if (!configObject[config.section]) {
        configObject[config.section] = {};
      }

      // Convertir les valeurs en types appropriés
      let value: any = config.value;
      if (value === 'true' || value === 'false') {
        value = value === 'true';
      } else if (!isNaN(Number(value)) && value !== '') {
        value = Number(value);
      }

      configObject[config.section][config.key] = value;
    });
  }

  return configObject;
}
