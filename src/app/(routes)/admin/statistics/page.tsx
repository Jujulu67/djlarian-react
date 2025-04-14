'use client';

import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import Link from 'next/link';
import {
  BarChart3,
  Calendar,
  Users,
  Music2,
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Clock,
  Eye,
  User,
  Share2,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import prisma from '@/lib/prisma';
import { formatDistanceToNow, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  getUmamiStats,
  getTopPages,
  getTrafficSources,
  generateDemoStats,
  generateDemoTopPages,
  generateDemoTrafficSources,
  UmamiPageViewsData,
  UmamiTopPage,
} from '@/lib/analytics';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';

export default function StatisticsPage() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [useDemoData, setUseDemoData] = useState(false);
  const [dataAvailable, setDataAvailable] = useState(false);

  const [prismaStats, setPrismaStats] = useState({
    usersCount: 0,
    eventsCount: 0,
    tracksCount: 0,
    recentUsers: 0,
    recentEvents: 0,
    recentTracks: 0,
  });
  const [umamiData, setUmamiData] = useState<{
    stats: any | null;
    pagesVisited: UmamiTopPage[];
    trafficSources: any[];
  }>({ stats: null, pagesVisited: [], trafficSources: [] });
  const [demoUmamiData, setDemoUmamiData] = useState<{
    stats: any | null;
    pagesVisited: UmamiTopPage[];
    trafficSources: any[];
  }>({ stats: null, pagesVisited: [], trafficSources: [] });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      // Récupérer les données de Prisma via une API Route
      try {
        const prismaResponse = await fetch('/api/admin/stats');
        if (prismaResponse.ok) {
          const prismaData = await prismaResponse.json();
          setPrismaStats({
            usersCount: prismaData.usersCount || 0,
            eventsCount: prismaData.eventsCount || 0,
            tracksCount: prismaData.tracksCount || 0,
            recentUsers: prismaData.recentUsers || 0,
            recentEvents: prismaData.recentEvents || 0,
            recentTracks: prismaData.recentTracks || 0,
          });
        } else {
          console.error('Erreur lors de la récupération des statistiques Prisma');
        }
      } catch (error) {
        console.error('Erreur lors de la récupération des statistiques Prisma:', error);
      }

      // Préparer les données de démo
      const demoStats = generateDemoStats();
      const demoPages = generateDemoTopPages();
      const demoTraffic = generateDemoTrafficSources();
      setDemoUmamiData({ stats: demoStats, pagesVisited: demoPages, trafficSources: demoTraffic });

      // Récupérer les données réelles d'Umami
      try {
        console.log('Début de la récupération des données Umami');
        const realStats = await getUmamiStats();
        console.log('getUmamiStats terminé, données reçues:', realStats ? 'Oui' : 'Non');

        const realPages = await getTopPages();
        console.log('getTopPages terminé, nombre de pages:', realPages?.length || 0);

        const realTraffic = await getTrafficSources();
        console.log('getTrafficSources terminé, nombre de sources:', realTraffic?.length || 0);

        // Vérifier si les données sont valides
        const hasValidData: boolean =
          !!realStats &&
          !!realPages &&
          realPages.length > 0 &&
          !!realTraffic &&
          realTraffic.length > 0;

        console.log('Validation des données Umami:', {
          statsOk: !!realStats,
          pagesOk: !!realPages && realPages.length > 0,
          sourcesOk: !!realTraffic && realTraffic.length > 0,
          hasValidData,
        });

        // Définir l'état de disponibilité des données
        setDataAvailable(hasValidData);

        if (hasValidData) {
          console.log('Utilisation des données réelles Umami');
          setUmamiData({
            stats: realStats,
            pagesVisited: realPages,
            trafficSources: realTraffic,
          });
        } else {
          // Si les données ne sont pas valides, utiliser les données de démo
          console.info('Données Umami non disponibles, utilisation des données de démo.');
          setUseDemoData(true);
        }
      } catch (error) {
        console.error('Erreur de récupération des données Umami:', error);
        setUseDemoData(true);
      }

      setLoading(false);
    };

    fetchData();
  }, []);

  const displayData = useDemoData ? demoUmamiData : umamiData;
  const stats = displayData.stats;
  const pagesVisited = displayData.pagesVisited;
  const trafficSources = displayData.trafficSources;

  const visitData: UmamiPageViewsData[] = stats?.pageviews || [];
  const demoVisitDataFallback = {
    total: 12458,
    today: 432,
    yesterday: 398,
    growth: 8.5,
  };
  const activeVisitData = {
    total: stats?.metrics?.pageviews?.value ?? demoVisitDataFallback.total,
    growth: stats?.metrics?.pageviews?.change ?? demoVisitDataFallback.growth,
  };

  const { usersCount, eventsCount, tracksCount, recentUsers, recentEvents, recentTracks } =
    prismaStats;
  const userGrowthRate = usersCount > 0 ? (recentUsers / usersCount) * 100 : 0;
  const eventGrowthRate = eventsCount > 0 ? (recentEvents / eventsCount) * 100 : 0;
  const trackGrowthRate = tracksCount > 0 ? (recentTracks / tracksCount) * 100 : 0;

  const demoEngagementFallback = {
    avgDuration: 222,
    avgDurationChange: 12,
    bounceRate: 38,
    bounceRateChange: -5,
    pagesPerSession: 2.8,
    pagesPerSessionChange: 8,
  };
  const engagementData = {
    avgDuration: stats?.metrics?.totalTime?.value ?? demoEngagementFallback.avgDuration,
    avgDurationChange:
      stats?.metrics?.totalTime?.change ?? demoEngagementFallback.avgDurationChange,
    bounceRate: stats?.metrics?.bounces?.value ?? demoEngagementFallback.bounceRate,
    bounceRateChange: stats?.metrics?.bounces?.change ?? demoEngagementFallback.bounceRateChange,
    pagesPerSession: demoEngagementFallback.pagesPerSession,
    pagesPerSessionChange: demoEngagementFallback.pagesPerSessionChange,
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-[#0c0117] to-black">
        <p className="text-white text-xl">Chargement des statistiques...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-[#0c0117] to-black">
      <div className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <Link
            href="/admin"
            className="flex items-center text-purple-400 hover:text-purple-300 transition-colors mb-6"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour au panel admin
          </Link>

          <div className="flex justify-between items-center mb-4">
            <h1 className="text-4xl font-audiowide text-white">
              <span className="text-gradient">Statistiques</span>
            </h1>
            <Button
              variant="outline"
              size="sm"
              onClick={() => (dataAvailable ? setUseDemoData(!useDemoData) : undefined)}
              className={`flex items-center space-x-2 bg-black/30 border-purple-500/30 hover:bg-purple-500/10 text-purple-300 ${
                !dataAvailable ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              disabled={!dataAvailable}
            >
              {useDemoData ? (
                <ToggleLeft className="h-5 w-5" />
              ) : (
                <ToggleRight className="h-5 w-5 text-green-400" />
              )}
              <span>
                {dataAvailable
                  ? useDemoData
                    ? 'Données Fictives'
                    : 'Données Réelles'
                  : 'Données Fictives (uniquement)'}
              </span>
            </Button>
          </div>
          <div className="bg-purple-500/10 h-1 w-32 rounded-full"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="glass rounded-xl backdrop-blur-md overflow-hidden relative border border-purple-500/20 p-5">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-600/5 to-pink-600/5 opacity-70 group-hover:opacity-100 transition-opacity"></div>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-400 text-sm mb-1">Utilisateurs</p>
                <h3 className="text-3xl font-audiowide text-white">{usersCount}</h3>
                <p className="flex items-center text-xs mt-2">
                  {userGrowthRate > 0 ? (
                    <>
                      <TrendingUp className="h-3 w-3 mr-1 text-green-400" />
                      <span className="text-green-400">+{userGrowthRate.toFixed(1)}%</span>
                    </>
                  ) : (
                    <>
                      <TrendingDown className="h-3 w-3 mr-1 text-red-400" />
                      <span className="text-red-400">{userGrowthRate.toFixed(1)}%</span>
                    </>
                  )}
                  <span className="text-gray-500 ml-2">ce mois</span>
                </p>
              </div>
              <div className="bg-purple-500/20 p-3 rounded-lg">
                <Users className="text-purple-400 h-6 w-6" />
              </div>
            </div>
          </div>

          <div className="glass rounded-xl backdrop-blur-md overflow-hidden relative border border-purple-500/20 p-5">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-indigo-600/5 opacity-70 group-hover:opacity-100 transition-opacity"></div>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-400 text-sm mb-1">Événements</p>
                <h3 className="text-3xl font-audiowide text-white">{eventsCount}</h3>
                <p className="flex items-center text-xs mt-2">
                  {eventGrowthRate > 0 ? (
                    <>
                      <TrendingUp className="h-3 w-3 mr-1 text-green-400" />
                      <span className="text-green-400">+{eventGrowthRate.toFixed(1)}%</span>
                    </>
                  ) : (
                    <>
                      <TrendingDown className="h-3 w-3 mr-1 text-red-400" />
                      <span className="text-red-400">{eventGrowthRate.toFixed(1)}%</span>
                    </>
                  )}
                  <span className="text-gray-500 ml-2">ce mois</span>
                </p>
              </div>
              <div className="bg-blue-500/20 p-3 rounded-lg">
                <Calendar className="text-blue-400 h-6 w-6" />
              </div>
            </div>
          </div>

          <div className="glass rounded-xl backdrop-blur-md overflow-hidden relative border border-purple-500/20 p-5">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/5 to-blue-600/5 opacity-70 group-hover:opacity-100 transition-opacity"></div>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-400 text-sm mb-1">Morceaux</p>
                <h3 className="text-3xl font-audiowide text-white">{tracksCount}</h3>
                <p className="flex items-center text-xs mt-2">
                  {trackGrowthRate > 0 ? (
                    <>
                      <TrendingUp className="h-3 w-3 mr-1 text-green-400" />
                      <span className="text-green-400">+{trackGrowthRate.toFixed(1)}%</span>
                    </>
                  ) : (
                    <>
                      <TrendingDown className="h-3 w-3 mr-1 text-red-400" />
                      <span className="text-red-400">{trackGrowthRate.toFixed(1)}%</span>
                    </>
                  )}
                  <span className="text-gray-500 ml-2">ce mois</span>
                </p>
              </div>
              <div className="bg-indigo-500/20 p-3 rounded-lg">
                <Music2 className="text-indigo-400 h-6 w-6" />
              </div>
            </div>
          </div>

          <div className="glass rounded-xl backdrop-blur-md overflow-hidden relative border border-purple-500/20 p-5">
            <div className="absolute inset-0 bg-gradient-to-br from-teal-600/5 to-blue-600/5 opacity-70 group-hover:opacity-100 transition-opacity"></div>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-400 text-sm mb-1">Visites</p>
                <h3 className="text-3xl font-audiowide text-white">
                  {activeVisitData.total.toLocaleString()}
                </h3>
                <p className="flex items-center text-xs mt-2">
                  {activeVisitData.growth > 0 ? (
                    <>
                      <TrendingUp className="h-3 w-3 mr-1 text-green-400" />
                      <span className="text-green-400">+{activeVisitData.growth.toFixed(1)}%</span>
                    </>
                  ) : (
                    <>
                      <TrendingDown className="h-3 w-3 mr-1 text-red-400" />
                      <span className="text-red-400">{activeVisitData.growth.toFixed(1)}%</span>
                    </>
                  )}
                  <span className="text-gray-500 ml-2">
                    {useDemoData ? 'démo (30j)' : 'vs période préc.'}
                  </span>
                </p>
              </div>
              <div className="bg-teal-500/20 p-3 rounded-lg">
                <Eye className="text-teal-400 h-6 w-6" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="glass rounded-xl backdrop-blur-md overflow-hidden relative border border-purple-500/20 p-6">
            <div className="absolute inset-0 bg-gradient-to-b from-purple-900/5 to-black/20"></div>
            <div className="relative z-10">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-audiowide text-white">Évolution des visites</h3>
                <div className="flex space-x-2">
                  <button className="px-2 py-1 bg-purple-500/20 rounded-md text-xs text-purple-300">
                    Journalier
                  </button>
                  <button className="px-2 py-1 bg-black/30 rounded-md text-xs text-gray-400 hover:bg-purple-500/20 hover:text-purple-300 transition-all">
                    Hebdomadaire
                  </button>
                  <button className="px-2 py-1 bg-black/30 rounded-md text-xs text-gray-400 hover:bg-purple-500/20 hover:text-purple-300 transition-all">
                    Mensuel
                  </button>
                </div>
              </div>

              <div className="h-64 flex items-end justify-between space-x-1">
                {visitData.length > 0 ? (
                  visitData.map((data: UmamiPageViewsData, index: number) => {
                    const maxValue = Math.max(...visitData.map((d: UmamiPageViewsData) => d.y), 1);
                    const heightPercentage = maxValue > 0 ? (data.y / maxValue) * 100 : 0;
                    return (
                      <div key={index} className="flex flex-col items-center flex-1 min-w-0">
                        <div
                          className="w-4/5 bg-gradient-to-t from-purple-600/40 to-indigo-600/40 rounded-t-sm hover:from-purple-600/60 hover:to-indigo-600/60 transition-all hover:shadow-lg hover:shadow-purple-500/20 relative group"
                          style={{ height: `${heightPercentage}%` }}
                        >
                          <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-max px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                            {data.y}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-2 truncate">
                          {data.x.split('-')[2]}/{data.x.split('-')[1]}
                        </p>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-gray-400 text-center w-full">
                    Aucune donnée de visite disponible.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="glass rounded-xl backdrop-blur-md overflow-hidden relative border border-purple-500/20 p-6">
            <div className="absolute inset-0 bg-gradient-to-b from-purple-900/5 to-black/20"></div>
            <div className="relative z-10">
              <h3 className="text-xl font-audiowide text-white mb-6">Sources de trafic</h3>
              {trafficSources.length > 0 ? (
                <div className="space-y-4">
                  {trafficSources.map(
                    (
                      source: { source: string; percentage: number; color: string },
                      index: number
                    ) => (
                      <div key={index}>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm text-gray-300">{source.source}</span>
                          <span className="text-sm text-gray-400">{source.percentage}%</span>
                        </div>
                        <div className="w-full bg-black/30 rounded-full h-2">
                          <div
                            className={`bg-gradient-to-r ${source.color} h-2 rounded-full`}
                            style={{ width: `${source.percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    )
                  )}
                </div>
              ) : (
                <p className="text-gray-400">Aucune donnée de source de trafic disponible.</p>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="glass rounded-xl backdrop-blur-md overflow-hidden relative border border-purple-500/20 p-6">
            <div className="absolute inset-0 bg-gradient-to-b from-purple-900/5 to-black/20"></div>
            <div className="relative z-10">
              <h3 className="text-xl font-audiowide text-white mb-6">Pages les plus visitées</h3>
              {pagesVisited.length > 0 ? (
                <div className="space-y-4">
                  {pagesVisited.map((page: UmamiTopPage, index: number) => {
                    let icon = Eye;
                    let iconBgClass = 'bg-purple-500/20';
                    let iconTextClass = 'text-purple-400';

                    if (page.x.includes('events')) {
                      icon = Calendar;
                      iconBgClass = 'bg-blue-500/20';
                      iconTextClass = 'text-blue-400';
                    } else if (page.x.includes('music')) {
                      icon = Music2;
                      iconBgClass = 'bg-indigo-500/20';
                      iconTextClass = 'text-indigo-400';
                    } else if (page.x.includes('profile') || page.x.includes('user')) {
                      icon = User;
                      iconBgClass = 'bg-pink-500/20';
                      iconTextClass = 'text-pink-400';
                    }

                    const IconComponent = icon;

                    return (
                      <div
                        key={index}
                        className="bg-black/30 p-3 rounded-lg flex items-center justify-between"
                      >
                        <div className="flex items-center overflow-hidden mr-2">
                          <div className={`${iconBgClass} p-2 rounded-lg mr-3 flex-shrink-0`}>
                            <IconComponent className={`h-5 w-5 ${iconTextClass}`} />
                          </div>
                          <div className="overflow-hidden">
                            <p className="text-white font-medium truncate" title={page.x}>
                              {page.x === '/' ? "Page d'accueil" : page.x}
                            </p>
                          </div>
                        </div>
                        <span className="text-gray-400 text-sm flex-shrink-0">
                          {page.y.toLocaleString()} vues
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-gray-400">Aucune donnée sur les pages les plus visitées.</p>
              )}
            </div>
          </div>

          <div className="glass rounded-xl backdrop-blur-md overflow-hidden relative border border-purple-500/20 p-6">
            <div className="absolute inset-0 bg-gradient-to-b from-purple-900/5 to-black/20"></div>
            <div className="relative z-10">
              <h3 className="text-xl font-audiowide text-white mb-6">Engagement utilisateur</h3>

              <div className="space-y-6">
                <div>
                  <div className="flex justify-between mb-2">
                    <div>
                      <p className="text-gray-300">Temps moyen sur le site</p>
                      <p className="text-2xl font-audiowide text-white">
                        {Math.floor(engagementData.avgDuration / 60)}m{' '}
                        {engagementData.avgDuration % 60}s
                      </p>
                    </div>
                    <div className="bg-indigo-500/20 p-3 rounded-lg">
                      <Clock className="text-indigo-400 h-5 w-5" />
                    </div>
                  </div>
                  <div className="w-full bg-black/30 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-indigo-600 to-purple-600 h-2 rounded-full"
                      style={{ width: '65%' }}
                    ></div>
                  </div>
                  <p className="text-xs text-green-400 mt-1 flex items-center">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    <span>
                      +{engagementData.avgDurationChange}%{' '}
                      {useDemoData ? 'démo' : 'vs période préc.'}
                    </span>
                  </p>
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <div>
                      <p className="text-gray-300">Taux de rebond</p>
                      <p className="text-2xl font-audiowide text-white">
                        {engagementData.bounceRate}%
                      </p>
                    </div>
                    <div className="bg-teal-500/20 p-3 rounded-lg">
                      <Share2 className="text-teal-400 h-5 w-5" />
                    </div>
                  </div>
                  <div className="w-full bg-black/30 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-teal-600 to-blue-600 h-2 rounded-full"
                      style={{ width: `${engagementData.bounceRate}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-green-400 mt-1 flex items-center">
                    <TrendingDown className="h-3 w-3 mr-1" />
                    <span>
                      {engagementData.bounceRateChange}% {useDemoData ? 'démo' : 'vs période préc.'}
                    </span>
                  </p>
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <div>
                      <p className="text-gray-300">
                        Pages par session <span className="text-xs text-gray-500">(Simulé)</span>
                      </p>
                      <p className="text-2xl font-audiowide text-white">
                        {engagementData.pagesPerSession}
                      </p>
                    </div>
                    <div className="bg-purple-500/20 p-3 rounded-lg">
                      <Eye className="text-purple-400 h-5 w-5" />
                    </div>
                  </div>
                  <div className="w-full bg-black/30 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-purple-600 to-pink-600 h-2 rounded-full"
                      style={{ width: '60%' }}
                    ></div>
                  </div>
                  <p className="text-xs text-green-400 mt-1 flex items-center">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    <span>+{engagementData.pagesPerSessionChange}% (Simulé)</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <div className="glass rounded-xl backdrop-blur-md overflow-hidden relative border border-purple-500/20 p-6">
            <div className="absolute inset-0 bg-gradient-to-b from-purple-900/5 to-black/20"></div>
            <div className="relative z-10">
              <h3 className="text-xl font-audiowide text-white mb-4">
                Configuration d'Umami Analytics
              </h3>

              <div className="text-gray-300 space-y-4">
                <p>
                  Les statistiques affichées sur cette page sont alimentées par Umami Analytics, une
                  solution d'analyse respectueuse de la vie privée.
                </p>

                <div className="bg-black/30 p-4 rounded-lg">
                  <h4 className="text-white font-medium mb-2">
                    Variables d'environnement à configurer :
                  </h4>
                  <ul className="list-disc list-inside space-y-1 text-gray-400">
                    <li>UMAMI_URL - URL de votre instance Umami</li>
                    <li>UMAMI_WEBSITE_ID - ID de votre site dans Umami</li>
                    <li>UMAMI_USERNAME - Nom d'utilisateur pour accéder à l'API</li>
                    <li>UMAMI_PASSWORD - Mot de passe pour accéder à l'API</li>
                  </ul>
                </div>

                <p className="text-sm text-gray-500">
                  * Si les identifiants Umami ne sont pas configurés, des données de démonstration
                  sont affichées.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
