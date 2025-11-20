/**
 * Service pour récupérer les statistiques depuis Umami Analytics
 */

import {
  subDays,
  subMonths,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
} from 'date-fns';
import { logger } from '@/lib/logger';

// Types pour les données Umami
interface UmamiPageView {
  value: number;
  change: number;
}

export interface UmamiMetrics {
  pageviews: UmamiPageView;
  uniques: UmamiPageView;
  bounces: UmamiPageView;
  totalTime: UmamiPageView;
}

// Exporter ce type
export interface UmamiPageViewsData {
  x: string;
  y: number;
}

// Exporter ce type
export interface UmamiTopPage {
  x: string;
  y: number;
}

interface UmamiReferrer {
  x: string;
  y: number;
}

interface UmamiBrowser {
  x: string;
  y: number;
}

interface UmamiOS {
  x: string;
  y: number;
}

interface UmamiDevice {
  x: string;
  y: number;
}

interface UmamiCountry {
  x: string;
  y: number;
}

interface UmamiStats {
  metrics: UmamiMetrics;
  pageviews: UmamiPageViewsData[];
  pages: UmamiTopPage[];
  referrers: UmamiReferrer[];
  browsers: UmamiBrowser[];
  os: UmamiOS[];
  devices: UmamiDevice[];
  countries: UmamiCountry[];
}

// Configuration Umami
const UMAMI_URL = process.env.NEXT_PUBLIC_UMAMI_URL || 'https://analytics.umami.is';
const UMAMI_WEBSITE_ID = (process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID || '').trim();
const UMAMI_USERNAME = process.env.NEXT_PUBLIC_UMAMI_USERNAME || '';
const UMAMI_PASSWORD = process.env.NEXT_PUBLIC_UMAMI_PASSWORD || '';

// Cache pour le token Umami
interface TokenCache {
  token: string;
  expiresAt: number;
}

let tokenCache: TokenCache | null = null;
const TOKEN_CACHE_DURATION = 23 * 60 * 60 * 1000; // 23 heures en millisecondes

/**
 * Obtient un token d'authentification Umami
 */
export async function getUmamiToken(): Promise<string> {
  // Vérification des identifiants
  if (!UMAMI_USERNAME || !UMAMI_PASSWORD) {
    logger.warn('Les identifiants Umami ne sont pas configurés');
    return '';
  }

  // Vérifier si le token en cache est valide
  const now = Date.now();
  if (tokenCache && tokenCache.expiresAt > now) {
    logger.debug('Utilisation du token Umami en cache');
    return tokenCache.token;
  }

  try {
    logger.debug(
      `Tentative d'authentification Umami sur ${UMAMI_URL}/api/auth/login avec l'utilisateur ${UMAMI_USERNAME}`
    );

    const response = await fetch(`${UMAMI_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: UMAMI_USERNAME,
        password: UMAMI_PASSWORD,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`Erreur d'authentification Umami (${response.status}): ${errorText}`);
      throw new Error(`Erreur d'authentification Umami: ${response.statusText}`);
    }

    const data = await response.json();
    logger.debug('Authentification Umami réussie, token obtenu');

    // Mettre en cache le token
    tokenCache = {
      token: data.token,
      expiresAt: now + TOKEN_CACHE_DURATION,
    };

    return data.token;
  } catch (error) {
    logger.error("Erreur lors de l'authentification Umami:", error);
    return ''; // Retourner une chaîne vide au lieu de lancer une erreur
  }
}

/**
 * Récupère les statistiques depuis Umami
 * @param startAt Date de début (timestamp)
 * @param endAt Date de fin (timestamp)
 * @param unit Unité temporelle (day, month, year)
 */
export async function getUmamiStats(
  startAt: number = getTimestamp(30), // 30 jours par défaut
  endAt: number = Date.now(),
  unit: 'day' | 'month' | 'year' = 'day'
): Promise<UmamiStats | null> {
  if (!UMAMI_WEBSITE_ID) {
    logger.warn('UMAMI_WEBSITE_ID non configuré');
    return null;
  }

  try {
    // Obtenir le token (cette fonction devrait utiliser un système de cache pour éviter trop d'appels)
    const token = await getUmamiToken();

    // URL pour la requête API
    const url = `${UMAMI_URL}/api/websites/${UMAMI_WEBSITE_ID.trim()}/stats?startAt=${startAt}&endAt=${endAt}&unit=${unit}`;
    logger.debug(`Appel API Umami: ${url}`);

    // Headers de base
    const headers: HeadersInit = {};

    // Ajouter le token d'authentification si disponible
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Appel à l'API Umami
    const response = await fetch(url, { headers });

    if (!response.ok) {
      logger.error(`Erreur API Umami (${response.status}): ${response.statusText}`);
      throw new Error(`Erreur lors de la récupération des statistiques: ${response.statusText}`);
    }

    const data = await response.json();
    logger.debug('Données Umami reçues:', {
      hasMetrics: !!data.metrics,
      hasPageviews: !!data.pageviews,
      isPageviewsArray: Array.isArray(data.pageviews),
      dataKeys: Object.keys(data),
      dataStructure:
        JSON.stringify(data).slice(0, 500) + (JSON.stringify(data).length > 500 ? '...' : ''),
    });

    // Structure pour les résultats
    let result: UmamiStats = {
      metrics: {
        pageviews: { value: 0, change: 0 },
        uniques: { value: 0, change: 0 },
        bounces: { value: 0, change: 0 },
        totalTime: { value: 0, change: 0 },
      },
      pageviews: [],
      pages: [],
      referrers: [],
      browsers: [],
      os: [],
      devices: [],
      countries: [],
    };

    // Vérifier si les données sont valides et les fusionner avec notre structure
    if (data) {
      // Essayer de récupérer/reconstruire l'objet metrics principal
      if (data.metrics) {
        result.metrics = { ...result.metrics, ...data.metrics };
      } else {
        logger.warn('Champ "metrics" manquant, tentative de reconstruction.');
        // Reconstruire à partir des champs racine si disponibles
        if (
          data.pageviews &&
          typeof data.pageviews === 'object' &&
          !Array.isArray(data.pageviews)
        ) {
          result.metrics.pageviews = data.pageviews;
          logger.debug(
            'Reconstruction métriques: pageviews (objet) récupéré depuis la racine',
            data.pageviews
          );
        }
        if (data.uniques && typeof data.uniques === 'object') {
          result.metrics.uniques = data.uniques;
          logger.debug('Reconstruction métriques: uniques récupéré depuis la racine', data.uniques);
        }
        if (data.bounces && typeof data.bounces === 'object') {
          result.metrics.bounces = data.bounces;
          logger.debug('Reconstruction métriques: bounces récupéré depuis la racine', data.bounces);
        }
        if (data.totalTime && typeof data.totalTime === 'object') {
          result.metrics.totalTime = data.totalTime;
          logger.debug(
            'Reconstruction métriques: totalTime récupéré depuis la racine',
            data.totalTime
          );
        }
      }

      // Gérer les données pour le graphique pageviews (doit être un tableau)
      if (data.pageviews && Array.isArray(data.pageviews) && data.pageviews.length > 0) {
        result.pageviews = data.pageviews;
        // Recalculer la valeur totale des pageviews si elle n'a pas été trouvée dans metrics
        if (result.metrics.pageviews.value === 0 && result.metrics.pageviews.change === 0) {
          const totalPageviews = result.pageviews.reduce((sum, item) => sum + item.y, 0);
          // Note: Nous n'avons pas d'info sur 'change' ici, on le laisse à 0.
          result.metrics.pageviews = { value: totalPageviews, change: 0 };
          logger.debug(
            `Reconstruction de metrics.pageviews.value à partir des données de pageviews: ${totalPageviews}`
          );
        }
      } else {
        logger.warn("Données pour le graphique 'pageviews' (tableau) manquantes ou invalides");
      }

      // Gérer les autres tableaux (top pages, referrers, etc.) - Utiliser les données réelles si présentes
      if (data.pages && Array.isArray(data.pages)) result.pages = data.pages;
      if (data.referrers && Array.isArray(data.referrers)) result.referrers = data.referrers;
      if (data.browsers && Array.isArray(data.browsers)) result.browsers = data.browsers;
      if (data.os && Array.isArray(data.os)) result.os = data.os;
      if (data.devices && Array.isArray(data.devices)) result.devices = data.devices;
      if (data.countries && Array.isArray(data.countries)) result.countries = data.countries;
    } else {
      // Aucune donnée reçue de l'API
      logger.warn("Aucune donnée reçue de l'API Umami /stats");
      return null;
    }

    return result;
  } catch (error) {
    logger.error('Erreur lors de la récupération des statistiques Umami:', error);
    return null;
  }
}

/**
 * Récupère les pages les plus visitées
 */
export async function getTopPages(
  startAt: number = getTimestamp(30),
  endAt: number = Date.now()
): Promise<UmamiTopPage[]> {
  // Si pas de configuration, renvoyer un tableau vide
  if (!UMAMI_WEBSITE_ID) {
    return [];
  }

  try {
    // Obtenir le token
    const token = await getUmamiToken();

    // Headers de base
    const headers: HeadersInit = {};

    // Ajouter le token d'authentification si disponible
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const url = `${UMAMI_URL}/api/websites/${UMAMI_WEBSITE_ID.trim()}/metrics?type=url&startAt=${startAt}&endAt=${endAt}`;
    logger.debug(`Appel API pour top pages: ${url}`);

    // Appel à l'API Umami pour obtenir les pages les plus visitées
    const response = await fetch(url, { headers });

    if (!response.ok) {
      logger.error(`Erreur API Top Pages (${response.status}): ${response.statusText}`);
      throw new Error(`Erreur lors de la récupération des top pages: ${response.statusText}`);
    }

    const data = await response.json();

    logger.debug('Données top pages reçues:', {
      isArray: Array.isArray(data),
      length: Array.isArray(data) ? data.length : 0,
      firstItem: Array.isArray(data) && data.length > 0 ? data[0] : null,
    });

    // Transformer les données au format attendu
    if (data && Array.isArray(data)) {
      if (data.length === 0) {
        logger.warn('Aucune donnée de top pages disponible');
        return [];
      }

      return data.map((item: { x?: string; y?: number }) => ({
        x: item.x || '/',
        y: item.y || 0,
      }));
    }

    logger.warn('Format de données top pages inattendu');
    return [];
  } catch (error) {
    logger.error('Erreur lors de la récupération des top pages:', error);
    return [];
  }
}

/**
 * Récupère les sources de trafic
 */
export async function getTrafficSources(
  startAt: number = getTimestamp(30),
  endAt: number = Date.now()
): Promise<{ source: string; percentage: number; color: string }[]> {
  // Si pas de configuration, renvoyer un tableau vide
  if (!UMAMI_WEBSITE_ID) {
    return [];
  }

  try {
    // Obtenir le token
    const token = await getUmamiToken();

    // Headers de base
    const headers: HeadersInit = {};

    // Ajouter le token d'authentification si disponible
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const url = `${UMAMI_URL}/api/websites/${UMAMI_WEBSITE_ID.trim()}/metrics?type=referrer&startAt=${startAt}&endAt=${endAt}`;
    logger.debug(`Appel API pour sources de trafic: ${url}`);

    // Appel à l'API Umami pour obtenir les référents
    const response = await fetch(url, { headers });

    if (!response.ok) {
      logger.error(`Erreur API Sources de trafic (${response.status}): ${response.statusText}`);
      throw new Error(`Erreur lors de la récupération des référents: ${response.statusText}`);
    }

    const data = await response.json();

    logger.debug('Données sources de trafic reçues:', {
      isArray: Array.isArray(data),
      length: Array.isArray(data) ? data.length : 0,
      firstItem: Array.isArray(data) && data.length > 0 ? data[0] : null,
    });

    if (!data || !Array.isArray(data)) {
      logger.warn('Format de données sources de trafic inattendu');
      return [];
    }

    if (data.length === 0) {
      logger.warn('Aucune donnée de sources de trafic disponible');
      return [];
    }

    // Calculer le total pour les pourcentages
    const total = data.reduce((sum, item) => sum + (item.y || 0), 0);

    if (total === 0) {
      logger.warn('Total des visites nul');
      return [];
    }

    // Définir des couleurs pour chaque source
    const colors: Record<string, string> = {
      google: 'from-purple-600 to-indigo-600',
      direct: 'from-blue-600 to-teal-600',
      facebook: 'from-pink-600 to-purple-600',
      twitter: 'from-pink-600 to-purple-600',
      instagram: 'from-pink-600 to-purple-600',
      youtube: 'from-pink-600 to-purple-600',
      other: 'from-orange-600 to-yellow-600',
    };

    // Mapper les données
    return data.map((referrer: { x?: string; y?: number }) => {
      // Déterminer le type de source
      let source = (referrer.x || '').toLowerCase();
      let displayName = referrer.x || '(unknown)';
      let colorKey = 'other';

      if (source === '(direct)' || source === 'direct' || source === '') {
        displayName = 'Accès direct';
        colorKey = 'direct';
      } else if (source.includes('google')) {
        displayName = 'Google';
        colorKey = 'google';
      } else if (
        source.includes('facebook') ||
        source.includes('instagram') ||
        source.includes('twitter') ||
        source.includes('linkedin')
      ) {
        displayName = 'Réseaux sociaux';
        colorKey = source.includes('facebook')
          ? 'facebook'
          : source.includes('twitter')
            ? 'twitter'
            : source.includes('instagram')
              ? 'instagram'
              : 'other';
      }

      return {
        source: displayName,
        percentage: Math.round(((referrer.y || 0) / total) * 100) || 1, // Minimum 1%
        color: colors[colorKey],
      };
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération des sources de trafic:', error);
    return [];
  }
}

/**
 * Génère un timestamp pour une date passée
 * @param daysAgo Nombre de jours dans le passé
 */
function getTimestamp(daysAgo: number): number {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.getTime();
}

/**
 * Helper pour obtenir les timestamps de début/fin en fonction de la période
 */
function getPeriodTimestamps(period: 'daily' | 'weekly' | 'monthly'): {
  startAt: number;
  endAt: number;
  unitForChart: 'day' | 'hour';
} {
  const now = new Date();
  let start: Date;
  let end: Date = endOfDay(now); // Fin de la journée actuelle par défaut
  let unitForChart: 'day' | 'hour' = 'hour'; // Utiliser 'hour' pour le graphique daily

  switch (period) {
    case 'daily':
      start = startOfDay(now);
      end = endOfDay(now); // Fin de journée
      unitForChart = 'hour'; // Afficher par heure pour le graphique du jour
      break;
    case 'weekly':
      start = startOfWeek(now, { weekStartsOn: 1 }); // Commence le lundi
      end = endOfWeek(now, { weekStartsOn: 1 });
      unitForChart = 'day'; // Afficher par jour pour le graphique de la semaine
      break;
    case 'monthly':
    default: // Par défaut, mensuel si période inconnue
      start = startOfMonth(now);
      end = endOfMonth(now);
      unitForChart = 'day'; // Afficher par jour pour le graphique du mois
      break;
  }
  // Retourner le unit spécifique pour le graphique, l'API Stats utilisera 'day'
  return { startAt: start.getTime(), endAt: end.getTime(), unitForChart };
}

/**
 * Récupère les métriques générales depuis Umami
 * @param startAt Date de début (timestamp)
 * @param endAt Date de fin (timestamp)
 */
async function getUmamiMetrics(
  startAt: number,
  endAt: number,
  token: string
): Promise<UmamiMetrics | null> {
  if (!UMAMI_WEBSITE_ID || !token) return null;

  const url = `${UMAMI_URL}/api/websites/${UMAMI_WEBSITE_ID}/stats?startAt=${startAt}&endAt=${endAt}`;
  logger.debug(`Appel API Umami (Metrics): ${url}`);

  try {
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) {
      logger.error(`Erreur API Umami [Metrics] (${response.status}): ${response.statusText}`);
      return null;
    }
    const data = await response.json();
    // L'API /stats retourne les métriques directement à la racine
    return {
      pageviews: data.pageviews || { value: 0, change: 0 },
      uniques: data.uniques || { value: 0, change: 0 },
      bounces: data.bounces || { value: 0, change: 0 },
      totalTime: data.totaltime || { value: 0, change: 0 }, // Note: API retourne totaltime
    };
  } catch (error) {
    logger.error('Erreur lors de la récupération des métriques Umami:', error);
    return null;
  }
}

/**
 * Récupère les données temporelles d'une statistique Umami (pour les graphiques)
 * @param stat La statistique à récupérer (ex: 'pageviews')
 * @param startAt Date de début (timestamp)
 * @param endAt Date de fin (timestamp)
 * @param unit Unité temporelle ('hour' ou 'day')
 */
async function getUmamiStatData(
  stat: string = 'pageviews',
  startAt: number,
  endAt: number,
  unit: 'hour' | 'day',
  token: string
): Promise<UmamiPageViewsData[] | null> {
  // Utilise le type existant
  if (!UMAMI_WEBSITE_ID || !token) return null;

  const url = `${UMAMI_URL}/api/websites/${UMAMI_WEBSITE_ID}/stats?stat=${stat}&startAt=${startAt}&endAt=${endAt}&unit=${unit}`;
  logger.debug(`Appel API Umami (Stat Data - ${stat}): ${url}`);

  try {
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) {
      logger.error(
        `Erreur API Umami [Stat Data - ${stat}] (${response.status}): ${response.statusText}`
      );
      return null;
    }
    const data = await response.json();
    // L'API /stats?stat=... retourne directement le tableau
    return Array.isArray(data) ? data : null;
  } catch (error) {
    logger.error(`Erreur lors de la récupération des données Umami pour ${stat}:`, error);
    return null;
  }
}

/**
 * Récupère toutes les statistiques nécessaires pour le tableau de bord admin
 * @param period Période à récupérer ('daily', 'weekly', 'monthly')
 */
export async function getStatistics(period: 'daily' | 'weekly' | 'monthly' = 'daily') {
  if (!UMAMI_WEBSITE_ID) {
    logger.warn('UMAMI_WEBSITE_ID non configuré');
    return { umami: null };
  }

  const { startAt, endAt, unitForChart } = getPeriodTimestamps(period);
  const token = await getUmamiToken(); // Obtenir le token une seule fois

  if (!token) {
    logger.error("Impossible d'obtenir le token Umami.");
    return { umami: null };
  }

  logger.debug(
    `Récupération des statistiques Umami pour la période: ${period} (start: ${startAt}, end: ${endAt}, unit: ${unitForChart})`
  );

  try {
    // Utiliser Promise.all pour lancer les requêtes en parallèle
    const [metricsData, pageviewsChartData, pagesData, referrersData] = await Promise.all([
      getUmamiMetrics(startAt, endAt, token), // Récupère les métriques globales
      getUmamiStatData('pageviews', startAt, endAt, unitForChart, token), // Récupère les données pour le graphique
      getTopPages(startAt, endAt), // Celle-ci utilise déjà /metrics
      getTrafficSources(startAt, endAt), // Celle-ci utilise déjà /metrics
    ]);

    // On retourne un objet structuré pour faciliter l'accès
    return {
      umami: {
        metrics: metricsData, // Métriques globales récupérées
        pageviews: pageviewsChartData || [], // Données pour le graphique d'évolution
        pages: pagesData || [], // Top pages
        referrers: referrersData || [], // Sources de trafic déjà formatées
        periodUnit: unitForChart, // Unité pour le formatage du graphique
      },
    };
  } catch (error) {
    logger.error('Erreur lors de la récupération groupée des statistiques Umami:', error);
    return { umami: null };
  }
}
