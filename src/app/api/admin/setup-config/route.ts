import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { PrismaClient } from '@prisma/client';

// Initialiser Prisma
const prisma = new PrismaClient();

// Valeurs par défaut pour les configurations
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
    darkMode: 'true',
    animationsEnabled: 'true',
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
    releasesEnabled: 'true',
    releasesTitle: 'Latest Releases',
    releasesCount: '3',
    visualizerEnabled: 'true',
    visualizerTitle: 'Experience the Sound',
    eventsEnabled: 'true',
    eventsTitle: 'Upcoming Events',
    eventsCount: '3',
    eventsViewAllText: 'View All Events',
    eventsViewAllUrl: '/events',
    streamEnabled: 'true',
    streamTitle: 'Live Stream',
    streamSubtitle: 'Join the Live Experience',
    streamDescription:
      'Tune in to my live streams where I share my creative process, perform exclusive sets, and interact with the community in real-time.',
    twitchUsername: 'djlarian',
    twitchFollowButtonText: 'Follow on Twitch',
    twitchFollowButtonUrl: 'https://twitch.tv/djlarian',
    streamNotifyButtonText: 'Get Notified',
    streamStatsEnabled: 'true',
    streamFollowers: '24K+',
    streamHoursStreamed: '150+',
    streamTracksPlayed: '500+',
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

// Point d'entrée pour initialiser les configurations
export async function GET(req: NextRequest) {
  try {
    // Vérifier que l'utilisateur est admin
    const session = await getServerSession(authOptions);
    if (!session?.user?.role || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const results = {
      tablesCreated: false,
      defaultConfigsInserted: false,
      errors: [] as string[],
    };

    // Vérifier si les tables existent déjà
    let tablesExist = false;
    try {
      // Tester avec une requête SQL brute pour vérifier si les tables existent
      await prisma.$queryRaw`SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'SiteConfig'
      )`;
      tablesExist = true;
    } catch (error) {
      console.error('Erreur lors de la vérification des tables:', error);
      results.errors.push('Impossible de vérifier si les tables existent');
    }

    if (tablesExist) {
      return NextResponse.json(
        {
          message: 'Les tables de configuration existent déjà.',
          tablesExist,
        },
        { status: 200 }
      );
    }

    // Initialiser les configurations par défaut
    for (const section in defaultConfigs) {
      for (const key in defaultConfigs[section as keyof typeof defaultConfigs]) {
        const value = defaultConfigs[section as keyof typeof defaultConfigs][key];

        try {
          // Utiliser des requêtes SQL brutes pour créer les entrées
          await prisma.$executeRaw`
            INSERT INTO "SiteConfig" (id, section, key, value, "createdAt", "updatedAt")
            VALUES (gen_random_uuid(), ${section}, ${key}, ${value}, NOW(), NOW())
            ON CONFLICT (section, key) DO NOTHING
          `;
        } catch (error) {
          console.error(`Erreur lors de l'insertion de ${section}.${key}:`, error);
          results.errors.push(`Échec de l'insertion de ${section}.${key}`);
        }
      }
    }

    results.defaultConfigsInserted = true;

    return NextResponse.json(
      {
        message: 'Configuration initialisée avec succès!',
        results,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Erreur lors de l'initialisation des configurations:", error);
    return NextResponse.json(
      {
        error: "Erreur serveur lors de l'initialisation des configurations",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
