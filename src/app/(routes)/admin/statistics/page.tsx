'use client';

import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
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
  List,
  LineChart,
  Users2,
  Timer,
  MousePointerClick,
  LogOut,
} from 'lucide-react';
import prisma from '@/lib/prisma';
import { formatDistanceToNow, subDays, format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  getUmamiStats,
  getTopPages,
  getTrafficSources,
  UmamiPageViewsData,
  UmamiTopPage,
  getStatistics,
} from '@/lib/analytics';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import {
  ResponsiveContainer,
  LineChart as RechartsLineChart,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Line,
} from 'recharts';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';

type Period = 'daily' | 'weekly' | 'monthly';

// Helper pour formater l'axe X du graphique
const formatXAxis = (tickItem: string, periodUnit: 'hour' | 'day') => {
  try {
    const date = parseISO(tickItem);
    if (periodUnit === 'hour') {
      return format(date, 'HH:mm'); // Format heure:minute pour 'daily'
    } else {
      return format(date, 'dd/MM'); // Format jour/mois pour 'weekly' et 'monthly'
    }
  } catch (e) {
    return tickItem; // Retourne la valeur brute en cas d'erreur de parsing
  }
};

// Helper pour formater la durée moyenne (en secondes)
const formatDuration = (seconds: number) => {
  if (seconds < 60) {
    return `${Math.round(seconds)} s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return `${minutes} min ${remainingSeconds} s`;
};

export default function StatisticsPage() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<Period>('daily');
  const [periodUnit, setPeriodUnit] = useState<'hour' | 'day'>('hour'); // Pour formater le graphique

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
    pageviewsData: UmamiPageViewsData[]; // Pour le graphique
  }>({ stats: null, pagesVisited: [], trafficSources: [], pageviewsData: [] });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      // Récupérer les données de Prisma via une API Route
      try {
        const prismaResponse = await fetch(`/api/admin/stats?period=${activeView}`);
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
          console.error(
            'Erreur lors de la récupération des statistiques Prisma:',
            await prismaResponse.text()
          );
        }
      } catch (error) {
        console.error('Erreur lors de la récupération des statistiques Prisma:', error);
      }

      // Récupérer les données réelles d'Umami
      try {
        console.log(`Fetching Umami data for period: ${activeView}`);
        const { umami } = await getStatistics(activeView); // Passer la période active

        if (umami) {
          setUmamiData({
            stats: umami.metrics || null,
            pagesVisited: umami.pages || [],
            trafficSources: umami.referrers || [],
            pageviewsData: umami.pageviews || [], // Utiliser les données de pageviews pour le graph
          });
          setPeriodUnit(umami.periodUnit || 'hour'); // Mettre à jour l'unité pour le graphique
        } else {
          setUmamiData({ stats: null, pagesVisited: [], trafficSources: [], pageviewsData: [] });
        }
      } catch (error) {
        console.error('Erreur de récupération des données Umami:', error);
        setUmamiData({ stats: null, pagesVisited: [], trafficSources: [], pageviewsData: [] });
      }

      setLoading(false);
    };

    fetchData();
  }, [activeView]); // Re-fetch quand activeView change

  const stats = umamiData.stats;
  const pagesVisited = umamiData.pagesVisited;
  const trafficSources = umamiData.trafficSources;
  const pageviewsData = umamiData.pageviewsData;

  const { usersCount, eventsCount, tracksCount, recentUsers, recentEvents, recentTracks } =
    prismaStats;

  // Calcul taux de croissance Prisma (Simplifié: juste le nombre récent)
  const getGrowthIcon = (recent: number) => {
    if (recent > 0) return <TrendingUp className="h-3 w-3 mr-1 text-green-400" />;
    return <TrendingDown className="h-3 w-3 mr-1 text-gray-500" />; // Moins agressif si 0
  };

  const getGrowthColor = (recent: number) => {
    if (recent > 0) return 'text-green-400';
    return 'text-gray-400';
  };

  // Calcul du nombre de pages par session à partir des données réelles
  const calculatePagesPerSession = () => {
    if (!stats?.pageviews?.value || !stats?.uniques?.value || stats.uniques.value === 0) {
      return 0;
    }
    const pagesPerSession = stats.pageviews.value / stats.uniques.value;
    return parseFloat(pagesPerSession.toFixed(1));
  };

  // Calcul du taux de variation pour les pages par session
  const calculatePagesPerSessionChange = () => {
    const pageviewsChange = stats?.pageviews?.change ?? 0;
    const uniquesChange = stats?.uniques?.change ?? 0;
    return parseFloat((pageviewsChange - uniquesChange).toFixed(1));
  };

  const engagementData = {
    avgDuration: stats?.totalTime?.value ?? 0,
    avgDurationChange: stats?.totalTime?.change ?? 0,
    bounceRate: stats?.bounces?.value ?? 0,
    bounceRateChange: stats?.bounces?.change ?? 0,
    pagesPerSession: calculatePagesPerSession(),
    pagesPerSessionChange: calculatePagesPerSessionChange(),
  };

  const getTrendIcon = (change: number | undefined) => {
    const value = change ?? 0;
    if (value > 0) return <TrendingUp className="h-3 w-3 mr-1 text-green-400" />;
    if (value < 0) return <TrendingDown className="h-3 w-3 mr-1 text-red-400" />;
    return null; // Pas d'icône si 0
  };

  const getTrendColor = (change: number | undefined) => {
    const value = change ?? 0;
    if (value > 0) return 'text-green-400';
    if (value < 0) return 'text-red-400';
    return 'text-gray-400';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-[#0c0117] to-black">
        <p className="text-white text-xl">Chargement des statistiques...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-[#0c0117] to-black text-white">
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
            {/* -- Tabs pour sélectionner la période -- */}
            <Tabs
              defaultValue="daily"
              value={activeView}
              onValueChange={(value: string) => setActiveView(value as Period)}
            >
              <TabsList className="bg-purple-900/30 border border-purple-500/20 text-purple-300">
                <TabsTrigger value="daily">Journalier</TabsTrigger>
                <TabsTrigger value="weekly">Hebdomadaire</TabsTrigger>
                <TabsTrigger value="monthly">Mensuel</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <div className="bg-purple-500/10 h-1 w-32 rounded-full"></div>
        </div>

        {/* -- Cartes de stats générales -- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Utilisateurs Prisma */}
          <div className="glass rounded-xl backdrop-blur-md overflow-hidden relative border border-purple-500/20 p-5">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-600/5 to-pink-600/5 opacity-70"></div>
            <div className="flex justify-between items-start relative z-10">
              <div>
                <p className="text-gray-400 text-sm mb-1">Utilisateurs (Total)</p>
                <h3 className="text-3xl font-audiowide text-white">{usersCount}</h3>
                <p className={`flex items-center text-xs mt-2 ${getGrowthColor(recentUsers)}`}>
                  {getGrowthIcon(recentUsers)}
                  <span>{recentUsers} nouveaux</span>
                  <span className="text-gray-500 ml-1">
                    ({activeView === 'daily' ? '24h' : activeView === 'weekly' ? '7j' : '30j'})
                  </span>
                </p>
              </div>
              <div className="bg-purple-500/20 p-3 rounded-lg">
                <Users className="text-purple-400 h-6 w-6" />
              </div>
            </div>
          </div>

          {/* Événements Prisma */}
          <div className="glass rounded-xl backdrop-blur-md overflow-hidden relative border border-blue-500/20 p-5">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-indigo-600/5 opacity-70"></div>
            <div className="flex justify-between items-start relative z-10">
              <div>
                <p className="text-gray-400 text-sm mb-1">Événements (Total)</p>
                <h3 className="text-3xl font-audiowide text-white">{eventsCount}</h3>
                <p className={`flex items-center text-xs mt-2 ${getGrowthColor(recentEvents)}`}>
                  {getGrowthIcon(recentEvents)}
                  <span>{recentEvents} nouveaux</span>
                  <span className="text-gray-500 ml-1">
                    ({activeView === 'daily' ? '24h' : activeView === 'weekly' ? '7j' : '30j'})
                  </span>
                </p>
              </div>
              <div className="bg-blue-500/20 p-3 rounded-lg">
                <Calendar className="text-blue-400 h-6 w-6" />
              </div>
            </div>
          </div>

          {/* Morceaux Prisma */}
          <div className="glass rounded-xl backdrop-blur-md overflow-hidden relative border border-indigo-500/20 p-5">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/5 to-blue-600/5 opacity-70"></div>
            <div className="flex justify-between items-start relative z-10">
              <div>
                <p className="text-gray-400 text-sm mb-1">Morceaux (Total)</p>
                <h3 className="text-3xl font-audiowide text-white">{tracksCount}</h3>
                <p className={`flex items-center text-xs mt-2 ${getGrowthColor(recentTracks)}`}>
                  {getGrowthIcon(recentTracks)}
                  <span>{recentTracks} nouveaux</span>
                  <span className="text-gray-500 ml-1">
                    ({activeView === 'daily' ? '24h' : activeView === 'weekly' ? '7j' : '30j'})
                  </span>
                </p>
              </div>
              <div className="bg-indigo-500/20 p-3 rounded-lg">
                <Music2 className="text-indigo-400 h-6 w-6" />
              </div>
            </div>
          </div>

          {/* Pages Vues Umami */}
          <div className="glass rounded-xl backdrop-blur-md overflow-hidden relative border border-green-500/20 p-5">
            <div className="absolute inset-0 bg-gradient-to-br from-green-600/5 to-teal-600/5 opacity-70"></div>
            <div className="flex justify-between items-start relative z-10">
              <div>
                <p className="text-gray-400 text-sm mb-1">Pages Vues (Umami)</p>
                <h3 className="text-3xl font-audiowide text-white">
                  {stats?.pageviews?.value ?? 0}
                </h3>
                <p
                  className={`flex items-center text-xs mt-2 ${getTrendColor(stats?.pageviews?.change)}`}
                >
                  {getTrendIcon(stats?.pageviews?.change)}
                  <span>
                    {(stats?.pageviews?.change ?? 0) >= 0 ? '+' : ''}
                    {(stats?.pageviews?.change ?? 0).toFixed(1)}%
                  </span>
                  <span className="text-gray-500 ml-1">vs période préc.</span>
                </p>
              </div>
              <div className="bg-green-500/20 p-3 rounded-lg">
                <Eye className="text-green-400 h-6 w-6" />
              </div>
            </div>
          </div>
        </div>

        {/* -- Graphique d'évolution et métriques d'engagement -- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Graphique d'évolution */}
          <Card className="lg:col-span-2 glass border border-purple-500/20 bg-black/30 backdrop-blur-md text-white">
            <CardHeader>
              <CardTitle className="flex items-center">
                <LineChart className="mr-2 h-5 w-5 text-purple-400" />
                Évolution des visites ({activeView === 'daily' ? 'Heure' : 'Jour'})
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              {pageviewsData && pageviewsData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsLineChart
                    data={pageviewsData}
                    margin={{ top: 5, right: 20, left: -10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                    <XAxis
                      dataKey="x"
                      stroke="rgba(255, 255, 255, 0.5)"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => formatXAxis(value, periodUnit)} // Utiliser le helper
                    />
                    <YAxis
                      stroke="rgba(255, 255, 255, 0.5)"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `${value}`}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#fff',
                      }}
                      labelFormatter={(label) => formatXAxis(label, periodUnit)}
                      formatter={(value: number) => [`${value} visites`, null]} // Enlever le nom de la métrique
                    />
                    <Line
                      type="monotone"
                      dataKey="y"
                      stroke="#a855f7"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 6, strokeWidth: 2, fill: '#a855f7' }}
                    />
                  </RechartsLineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">
                  Aucune donnée de visite pour cette période.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Métriques d'engagement */}
          <Card className="glass border border-blue-500/20 bg-black/30 backdrop-blur-md text-white">
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="mr-2 h-5 w-5 text-blue-400" />
                Engagement
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Visiteurs uniques */}
              <div className="flex items-start space-x-4">
                <div className="bg-blue-500/10 p-2 rounded-lg">
                  <Users2 className="h-5 w-5 text-blue-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-400 mb-1">Visiteurs uniques</p>
                  <div className="flex items-baseline space-x-2">
                    <p className="text-xl font-semibold">{stats?.uniques?.value ?? 0}</p>
                    <p className={`text-xs font-medium ${getTrendColor(stats?.uniques?.change)}`}>
                      {getTrendIcon(stats?.uniques?.change)}
                      {(stats?.uniques?.change ?? 0) >= 0 ? '+' : ''}
                      {(stats?.uniques?.change ?? 0).toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>

              {/* Durée moyenne */}
              <div className="flex items-start space-x-4">
                <div className="bg-indigo-500/10 p-2 rounded-lg">
                  <Timer className="h-5 w-5 text-indigo-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-400 mb-1">Durée moyenne</p>
                  <div className="flex items-baseline space-x-2">
                    <p className="text-xl font-semibold">
                      {formatDuration(engagementData.avgDuration)}
                    </p>
                    <p
                      className={`text-xs font-medium ${getTrendColor(engagementData.avgDurationChange)}`}
                    >
                      {getTrendIcon(engagementData.avgDurationChange)}
                      {(engagementData.avgDurationChange ?? 0) >= 0 ? '+' : ''}
                      {(engagementData.avgDurationChange ?? 0).toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>

              {/* Taux de rebond */}
              <div className="flex items-start space-x-4">
                <div className="bg-red-500/10 p-2 rounded-lg">
                  <LogOut className="h-5 w-5 text-red-400" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-sm text-gray-400">Taux de rebond</p>
                    <p className={`text-xs font-medium ${getTrendColor(stats?.bounces?.change)}`}>
                      {getTrendIcon(stats?.bounces?.change)}
                      {(stats?.bounces?.change ?? 0) >= 0 ? '+' : ''}
                      {(stats?.bounces?.change ?? 0).toFixed(1)}%
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Progress
                      value={stats?.bounces?.value ?? 0}
                      className="h-2 bg-red-900/50 [&>div]:bg-red-500"
                    />
                    <span className="text-sm font-semibold w-12 text-right">
                      {stats?.bounces?.value ?? 0}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Pages / Session */}
              <div className="flex items-start space-x-4">
                <div className="bg-purple-500/10 p-2 rounded-lg">
                  <MousePointerClick className="h-5 w-5 text-purple-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-400 mb-1">Pages / Session</p>
                  <div className="flex items-baseline space-x-2">
                    <p className="text-xl font-semibold">{engagementData.pagesPerSession}</p>
                    <p
                      className={`text-xs font-medium ${getTrendColor(engagementData.pagesPerSessionChange)}`}
                    >
                      {getTrendIcon(engagementData.pagesPerSessionChange)}
                      {(engagementData.pagesPerSessionChange ?? 0) >= 0 ? '+' : ''}
                      {(engagementData.pagesPerSessionChange ?? 0).toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* -- Listes : Pages populaires & Sources de trafic -- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Pages populaires */}
          <Card className="glass border border-green-500/20 bg-black/30 backdrop-blur-md text-white">
            <CardHeader>
              <CardTitle className="flex items-center">
                <List className="mr-2 h-5 w-5 text-green-400" />
                Pages populaires
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pagesVisited && pagesVisited.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow className="border-purple-500/30 hover:bg-purple-500/10">
                      <TableHead className="text-white">Page</TableHead>
                      <TableHead className="text-right text-white">Visites</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagesVisited.slice(0, 10).map(
                      (
                        page,
                        index // Limite à 10
                      ) => (
                        <TableRow
                          key={index}
                          className="border-purple-500/20 hover:bg-purple-500/10"
                        >
                          <TableCell className="font-medium truncate max-w-xs" title={page.x}>
                            {page.x}
                          </TableCell>
                          <TableCell className="text-right">{page.y}</TableCell>
                        </TableRow>
                      )
                    )}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-gray-400 text-center py-4">Aucune donnée de page disponible.</p>
              )}
            </CardContent>
          </Card>

          {/* Sources de trafic */}
          <Card className="glass border border-orange-500/20 bg-black/30 backdrop-blur-md text-white">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Share2 className="mr-2 h-5 w-5 text-orange-400" />
                Sources de trafic
              </CardTitle>
            </CardHeader>
            <CardContent>
              {trafficSources && trafficSources.length > 0 ? (
                <div className="space-y-3">
                  {trafficSources.map((source, index) => (
                    <div key={index}>
                      <div className="flex justify-between items-center mb-1 text-sm">
                        <span className="text-gray-300">{source.source}</span>
                        <span className="font-semibold">{source.percentage}%</span>
                      </div>
                      <div className="w-full bg-gray-700/50 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full bg-gradient-to-r ${source.color || 'from-purple-600 to-indigo-600'}`}
                          style={{ width: `${source.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-center py-4">
                  Aucune donnée de source disponible.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
