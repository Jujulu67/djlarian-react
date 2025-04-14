/**
 * Service pour récupérer les statistiques depuis Umami Analytics
 */

// Types pour les données Umami
interface UmamiPageView {
  value: number;
  change: number;
}

interface UmamiMetrics {
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

/**
 * Obtient un token d'authentification Umami
 */
export async function getUmamiToken(): Promise<string> {
  if (!UMAMI_USERNAME || !UMAMI_PASSWORD) {
    console.warn('Les identifiants Umami ne sont pas configurés, utilisation des données de démo');
    return '';
  }

  try {
    console.log(
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
      console.error(`Erreur d'authentification Umami (${response.status}): ${errorText}`);
      throw new Error(`Erreur d'authentification Umami: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Authentification Umami réussie, token obtenu');
    return data.token;
  } catch (error) {
    console.error("Erreur lors de l'authentification Umami:", error);
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
    console.warn('UMAMI_WEBSITE_ID non configuré, utilisation des données de démo');
    return generateDemoStats(); // Renvoie des données de démo en l'absence de configuration
  }

  try {
    // Obtenir le token (cette fonction devrait utiliser un système de cache pour éviter trop d'appels)
    const token = await getUmamiToken();

    // URL pour la requête API
    const url = `${UMAMI_URL}/api/websites/${UMAMI_WEBSITE_ID.trim()}/stats?startAt=${startAt}&endAt=${endAt}&unit=${unit}`;
    console.log(`Appel API Umami: ${url}`);

    // Headers de base
    const headers: HeadersInit = {};

    // Ajouter le token d'authentification si disponible
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Appel à l'API Umami
    const response = await fetch(url, { headers });

    if (!response.ok) {
      console.error(`Erreur API Umami (${response.status})`);
      throw new Error(`Erreur lors de la récupération des statistiques: ${response.statusText}`);
    }

    const data = await response.json();

    // Vérifiez si les données contiennent ce que nous attendons
    if (!data.metrics || !data.pageviews || !Array.isArray(data.pageviews)) {
      console.warn('Format de données Umami inattendu, utilisation des données de démo');
      return generateDemoStats();
    }

    return data;
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques Umami:', error);
    // En cas d'erreur, générer des données de démonstration
    return generateDemoStats();
  }
}

/**
 * Récupère les pages les plus visitées
 */
export async function getTopPages(
  startAt: number = getTimestamp(30),
  endAt: number = Date.now()
): Promise<UmamiTopPage[]> {
  // Si pas de configuration, renvoyer des données de démo
  if (!UMAMI_WEBSITE_ID) {
    return generateDemoTopPages();
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
    console.log(`Appel API pour top pages: ${url}`);

    // Appel à l'API Umami pour obtenir les pages les plus visitées
    const response = await fetch(url, { headers });

    if (!response.ok) {
      console.error(`Erreur API Top Pages (${response.status})`);
      throw new Error(`Erreur lors de la récupération des top pages: ${response.statusText}`);
    }

    const data = await response.json();

    // Transformer les données au format attendu
    if (data && Array.isArray(data)) {
      return data.map((item: any) => ({
        x: item.x,
        y: item.y,
      }));
    }

    console.warn('Format de données top pages inattendu, utilisation des données de démo');
    return generateDemoTopPages();
  } catch (error) {
    console.error('Erreur lors de la récupération des top pages:', error);
    return generateDemoTopPages();
  }
}

/**
 * Récupère les sources de trafic
 */
export async function getTrafficSources(
  startAt: number = getTimestamp(30),
  endAt: number = Date.now()
): Promise<{ source: string; percentage: number; color: string }[]> {
  // Si pas de configuration, renvoyer des données de démo
  if (!UMAMI_WEBSITE_ID) {
    return generateDemoTrafficSources();
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
    console.log(`Appel API pour sources de trafic: ${url}`);

    // Appel à l'API Umami pour obtenir les référents
    const response = await fetch(url, { headers });

    if (!response.ok) {
      console.error(`Erreur API Sources de trafic (${response.status})`);
      throw new Error(`Erreur lors de la récupération des référents: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data || !Array.isArray(data) || data.length === 0) {
      console.warn(
        'Format de données sources de trafic inattendu ou vide, utilisation des données de démo'
      );
      return generateDemoTrafficSources();
    }

    // Calculer le total pour les pourcentages
    const total = data.reduce((sum, item) => sum + item.y, 0);

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
    return data.map((referrer: any) => {
      // Déterminer le type de source
      let source = referrer.x.toLowerCase();
      let displayName = referrer.x;
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
        percentage: Math.round((referrer.y / total) * 100),
        color: colors[colorKey],
      };
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des sources de trafic:', error);
    return generateDemoTrafficSources();
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
 * Génère des statistiques de démonstration en l'absence de configuration Umami
 */
export function generateDemoStats(): UmamiStats {
  const now = Date.now();
  const startDate = getTimestamp(30);

  // Générer des données de pageviews quotidiennes sur 30 jours
  const pageviews = [];
  for (let i = 0; i < 30; i++) {
    const date = new Date(startDate + i * 86400000); // 86400000 = 1 jour en ms
    pageviews.push({
      x: date.toISOString().split('T')[0],
      y: Math.floor(Math.random() * 500) + 100,
    });
  }

  return {
    metrics: {
      pageviews: { value: 12458, change: 8.5 },
      uniques: { value: 4567, change: 5.2 },
      bounces: { value: 38, change: -5 },
      totalTime: { value: 222, change: 12 },
    },
    pageviews,
    pages: generateDemoTopPages(),
    referrers: [
      { x: 'Google', y: 6520 },
      { x: '(direct)', y: 3504 },
      { x: 'Facebook', y: 1872 },
      { x: 'Twitter', y: 562 },
    ],
    browsers: [
      { x: 'Chrome', y: 7250 },
      { x: 'Safari', y: 3120 },
      { x: 'Firefox', y: 1540 },
      { x: 'Edge', y: 548 },
    ],
    os: [
      { x: 'Windows', y: 5280 },
      { x: 'Mac', y: 3870 },
      { x: 'iOS', y: 2340 },
      { x: 'Android', y: 968 },
    ],
    devices: [
      { x: 'Desktop', y: 8420 },
      { x: 'Mobile', y: 3562 },
      { x: 'Tablet', y: 476 },
    ],
    countries: [
      { x: 'France', y: 8256 },
      { x: 'United States', y: 1452 },
      { x: 'Germany', y: 865 },
      { x: 'United Kingdom', y: 743 },
      { x: 'Canada', y: 532 },
      { x: 'Belgium', y: 410 },
      { x: 'Switzerland', y: 200 },
    ],
  };
}

/**
 * Génère des données de démo pour les pages les plus visitées
 */
export function generateDemoTopPages(): UmamiTopPage[] {
  return [
    { x: '/', y: 5428 },
    { x: '/events', y: 3721 },
    { x: '/music', y: 2865 },
    { x: '/profile', y: 1532 },
    { x: '/admin', y: 450 },
  ];
}

/**
 * Génère des données de démo pour les sources de trafic
 */
export function generateDemoTrafficSources(): {
  source: string;
  percentage: number;
  color: string;
}[] {
  return [
    { source: 'Google', percentage: 52, color: 'from-purple-600 to-indigo-600' },
    { source: 'Accès direct', percentage: 28, color: 'from-blue-600 to-teal-600' },
    { source: 'Réseaux sociaux', percentage: 15, color: 'from-pink-600 to-purple-600' },
    { source: 'Autres', percentage: 5, color: 'from-orange-600 to-yellow-600' },
  ];
}
