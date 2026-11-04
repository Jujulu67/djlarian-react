'use client';

import {
  Calendar,
  Users,
  Music2,
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Gauge,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';

import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { logger } from '@/lib/logger';

type Period = 'daily' | 'weekly' | 'monthly';

const VERCEL_PROJECT_URL = 'https://vercel.com/larians-projects-a2dc5026/djlarian-react';

export default function StatisticsPage() {
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<Period>('daily');

  const [prismaStats, setPrismaStats] = useState({
    usersCount: 0,
    eventsCount: 0,
    tracksCount: 0,
    recentUsers: 0,
    recentEvents: 0,
    recentTracks: 0,
  });

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
          logger.error(
            'Erreur lors de la récupération des statistiques Prisma:',
            await prismaResponse.text()
          );
        }
      } catch (error) {
        logger.error('Erreur lors de la récupération des statistiques Prisma:', error);
      }

      setLoading(false);
    };

    fetchData();
  }, [activeView]); // Re-fetch quand activeView change

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

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gradient-to-br from-black via-[#0c0117] to-black">
        <p className="text-white text-xl">Chargement des statistiques...</p>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-black via-[#0c0117] to-black text-white">
      <div className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <Link
            href="/admin"
            className="flex items-center text-white hover:text-gray-300 transition-colors mb-6"
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
                <TabsTrigger value="daily" className="data-[state=active]:bg-purple-600">
                  Journalier
                </TabsTrigger>
                <TabsTrigger value="weekly" className="data-[state=active]:bg-purple-600">
                  Hebdomadaire
                </TabsTrigger>
                <TabsTrigger value="monthly" className="data-[state=active]:bg-purple-600">
                  Mensuel
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <div className="bg-purple-500/10 h-1 w-32 rounded-full"></div>
        </div>

        {/* -- Cartes de stats générales -- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
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
        </div>

        {/* -- Audience : suivie par Vercel -- */}
        <Card className="glass border border-green-500/20 bg-black/30 backdrop-blur-md text-white">
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="mr-2 h-5 w-5 text-green-400" />
              Audience
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-300">
              Les visites du site sont suivies par Vercel Web Analytics, sans cookie. Les pages
              vues, visiteurs, pages populaires et sources de trafic se consultent directement dans
              le tableau de bord Vercel, avec les performances mesurées par Speed Insights.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild variant="outline" className="border-green-500/30 text-green-300">
                <a
                  href={`${VERCEL_PROJECT_URL}/analytics`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Web Analytics
                  <ExternalLink className="ml-2 h-3 w-3" />
                </a>
              </Button>
              <Button asChild variant="outline" className="border-green-500/30 text-green-300">
                <a
                  href={`${VERCEL_PROJECT_URL}/speed-insights`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Gauge className="mr-2 h-4 w-4" />
                  Speed Insights
                  <ExternalLink className="ml-2 h-3 w-3" />
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
