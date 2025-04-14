import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';

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

type DefaultConfigs = {
  general: GeneralConfig;
  appearance: AppearanceConfig;
  notifications: NotificationsConfig;
  security: SecurityConfig;
  api: ApiConfig;
};

// Valeurs par défaut pour chaque section de configuration
const defaultConfigs: DefaultConfigs = {
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
    darkMode: 'true',
    animationsEnabled: 'true',
    logoUrl: '/images/logo.png',
    faviconUrl: '/favicon.ico',
  },
  notifications: {
    emailNotifications: 'true',
    adminAlerts: 'true',
    newUserNotifications: 'true',
    eventReminders: 'true',
    marketingEmails: 'false',
  },
  security: {
    twoFactorAuth: 'false',
    passwordExpiration: '90',
    ipRestriction: 'false',
    failedLoginLimit: '5',
    sessionTimeout: '60',
  },
  api: {
    apiEnabled: 'true',
    rateLimit: '100',
    webhookUrl: '',
    umamiEnabled: 'true',
    umamiSiteId: 'your-umami-site-id',
  },
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
              INSERT INTO "ConfigHistory" ("configId", "previousValue", "newValue", "createdBy", "description", "createdAt")
              VALUES (${config.id}, ${config.value}, ${value}, ${session.user.email || null}, 'Réinitialisation aux valeurs par défaut', NOW())
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
    await prisma.$executeRaw`
      INSERT INTO "ConfigSnapshot" (name, description, data, "createdBy", "createdAt")
      VALUES (
        ${'Avant réinitialisation - ' + new Date().toLocaleString()}, 
        ${'Snapshot automatique créé avant la réinitialisation aux valeurs par défaut'}, 
        ${JSON.stringify(currentConfigs)}, 
        ${session.user.email || null}, 
        NOW()
      )
    `;

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
