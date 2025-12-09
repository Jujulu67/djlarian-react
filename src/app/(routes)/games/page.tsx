'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Trophy, Dices, Gamepad2, Lock, TrendingUp, Users, Coins, Activity } from 'lucide-react';
import Image from 'next/image';

interface UserLeaderboard {
  id: string;
  name: string | null;
  image: string | null;
  gameHighScore: number;
}

interface CasinoLeaderboard {
  id: string;
  name: string | null;
  image: string | null;
  totalWins: number;
  totalSpins: number;
  tokens: number;
}

interface GlobalStats {
  totalTokens: number;
  totalSpins: number;
  totalWins: number;
}

interface LeaderboardData {
  rhythmGame: UserLeaderboard[];
  casino: CasinoLeaderboard[];
  richest: CasinoLeaderboard[];
  mostActive: CasinoLeaderboard[];
  global: GlobalStats;
}

export default function GamesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'winners' | 'richest' | 'active'>('winners');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    } else if (status === 'authenticated') {
      // Check for badges/access
      const highScore = session?.user?.gameHighScore || 0;
      const discoveredCasino = session?.user?.hasDiscoveredCasino || false;

      if (highScore <= 0 && !discoveredCasino) {
        // Redirect if no access
        router.push('/profile');
        return;
      }

      // Fetch leaderboard data
      fetch('/api/games/leaderboard')
        .then((res) => {
          if (res.ok) return res.json();
          throw new Error('Failed to fetch');
        })
        .then((data) => {
          setData(data);
          setLoading(false);
        })
        .catch((err) => {
          console.error(err);
          setLoading(false);
        });
    }
  }, [status, router, session]);

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
      </div>
    );
  }

  const hasRhythmAccess = (session?.user?.gameHighScore || 0) > 0;
  const hasCasinoAccess = session?.user?.hasDiscoveredCasino || false;

  return (
    <div className="min-h-screen bg-black pt-24 pb-20 px-4 sm:px-6 relative overflow-hidden">
      {/* Background Gradients */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-900/20 blur-[120px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-900/20 blur-[120px] rounded-full mix-blend-screen" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10 space-y-12">
        {/* Header */}
        <div className="text-center space-y-4">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-6xl font-audiowide text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-blue-400 to-purple-400 animate-gradient-shift bg-[length:200%_100%]"
          >
            ARCADE
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-gray-400 max-w-2xl mx-auto text-lg"
          >
            Explorez vos exploits et comparez-vous aux meilleurs joueurs de la communauté.
          </motion.p>
        </div>

        {/* Global Community Stats Ticker */}
        {data?.global && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-4"
          >
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-500/20 rounded-lg text-yellow-400">
                  <Coins className="w-5 h-5" />
                </div>
                <span className="text-gray-400 text-sm">Fortune Globale</span>
              </div>
              <span className="text-xl font-bold font-audiowide text-white">
                {data.global.totalTokens.toLocaleString()}
              </span>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/20 rounded-lg text-purple-400">
                  <Activity className="w-5 h-5" />
                </div>
                <span className="text-gray-400 text-sm">Spins Totaux</span>
              </div>
              <span className="text-xl font-bold font-audiowide text-white">
                {data.global.totalSpins.toLocaleString()}
              </span>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/20 rounded-lg text-green-400">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <span className="text-gray-400 text-sm">Gains Distribués</span>
              </div>
              <span className="text-xl font-bold font-audiowide text-white">
                {data.global.totalWins.toLocaleString()}
              </span>
            </div>
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Rhythm Game Section */}
          {hasRhythmAccess ? (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 md:p-8 hover:bg-white/10 transition-colors duration-500"
            >
              <div className="flex items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/30">
                    <Gamepad2 className="w-8 h-8 text-purple-400" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white font-audiowide">Rhythm Catcher</h2>
                    <p className="text-purple-300">
                      Votre meilleur score:{' '}
                      <span className="text-white font-bold">
                        {session?.user?.gameHighScore?.toLocaleString()}
                      </span>
                    </p>
                  </div>
                </div>
                <Link
                  href="/#visualizer"
                  className="px-4 py-2 rounded-full bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-sm font-semibold border border-purple-500/30 transition-all hover:scale-105"
                >
                  Jouer
                </Link>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
                  Top 10 Global
                </h3>
                {data?.rhythmGame.map((player, index) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 flex items-center justify-center rounded-lg font-bold ${
                          index === 0
                            ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                            : index === 1
                              ? 'bg-gray-400/20 text-gray-400'
                              : index === 2
                                ? 'bg-amber-700/20 text-amber-600'
                                : 'bg-white/5 text-gray-500'
                        }`}
                      >
                        {index + 1}
                      </div>
                      <div className="relative w-8 h-8 rounded-full overflow-hidden bg-gray-800">
                        {player.image ? (
                          <Image
                            src={player.image}
                            alt={player.name || 'User'}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-purple-900/50 text-xs">
                            {(player.name || '?')[0]}
                          </div>
                        )}
                      </div>
                      <span
                        className={`font-medium ${player.id === session?.user?.id ? 'text-purple-400' : 'text-gray-300'}`}
                      >
                        {player.name || 'Anonyme'}
                      </span>
                    </div>
                    <span className="font-audiowide text-white">
                      {player.gameHighScore.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          ) : (
            <div className="hidden lg:flex items-center justify-center rounded-3xl border border-white/5 bg-white/5 backdrop-blur-sm p-8 opacity-50 grayscale">
              <div className="text-center space-y-4">
                <Lock className="w-12 h-12 text-gray-500 mx-auto" />
                <h3 className="text-xl font-bold text-gray-500">Section Verrouillée</h3>
                <p className="text-gray-600">Jouez au jeu caché pour débloquer cette section.</p>
              </div>
            </div>
          )}

          {/* Casino Section */}
          {hasCasinoAccess ? (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 md:p-8 hover:bg-white/10 transition-colors duration-500"
            >
              <div className="flex items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-500/20 to-red-500/20 border border-amber-500/30">
                    <Dices className="w-8 h-8 text-amber-400" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white font-audiowide">
                      Casino High Rollers
                    </h2>
                    <p className="text-amber-300 capitalize">L'élite du Casino</p>
                  </div>
                </div>
                <Link
                  href="/casino"
                  className="px-4 py-2 rounded-full bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-sm font-semibold border border-amber-500/30 transition-all hover:scale-105"
                >
                  Entrer
                </Link>
              </div>

              {/* Tabs Navigation */}
              <div className="flex gap-2 mb-6 p-1 bg-black/20 rounded-xl">
                <button
                  onClick={() => setActiveTab('winners')}
                  className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'winners' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'text-gray-400 hover:text-white'}`}
                >
                  Top Gains
                </button>
                <button
                  onClick={() => setActiveTab('richest')}
                  className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'richest' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' : 'text-gray-400 hover:text-white'}`}
                >
                  Les Riches
                </button>
                <button
                  onClick={() => setActiveTab('active')}
                  className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'active' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'text-gray-400 hover:text-white'}`}
                >
                  Actifs
                </button>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
                  {activeTab === 'winners'
                    ? 'Top 10 Vainqueurs (Total)'
                    : activeTab === 'richest'
                      ? 'Top 10 Fortunes (Actuel)'
                      : 'Top 10 Joueurs (Spins)'}
                </h3>
                {(activeTab === 'winners'
                  ? data?.casino
                  : activeTab === 'richest'
                    ? data?.richest
                    : data?.mostActive
                )?.map((player, index) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 flex items-center justify-center rounded-lg font-bold ${
                          index === 0
                            ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                            : index === 1
                              ? 'bg-gray-400/20 text-gray-400'
                              : index === 2
                                ? 'bg-amber-700/20 text-amber-600'
                                : 'bg-white/5 text-gray-500'
                        }`}
                      >
                        {index + 1}
                      </div>
                      <div className="relative w-8 h-8 rounded-full overflow-hidden bg-gray-800">
                        {player.image ? (
                          <Image
                            src={player.image}
                            alt={player.name || 'User'}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-amber-900/50 text-xs">
                            {(player.name || '?')[0]}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span
                          className={`font-medium leading-none ${player.id === session?.user?.id ? 'text-amber-400' : 'text-gray-300'}`}
                        >
                          {player.name || 'Anonyme'}
                        </span>
                        <span className="text-[10px] text-gray-500">
                          {player.totalSpins.toLocaleString()} spins
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-audiowide text-amber-400 block">
                        {activeTab === 'winners'
                          ? player.totalWins.toLocaleString()
                          : activeTab === 'richest'
                            ? player.tokens.toLocaleString()
                            : player.totalSpins.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-gray-500">
                        {activeTab === 'winners'
                          ? 'Wins'
                          : activeTab === 'richest'
                            ? 'Jetons'
                            : 'Spins'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          ) : (
            <div className="hidden lg:flex items-center justify-center rounded-3xl border border-white/5 bg-white/5 backdrop-blur-sm p-8 opacity-50 grayscale">
              <div className="text-center space-y-4">
                <Lock className="w-12 h-12 text-gray-500 mx-auto" />
                <h3 className="text-xl font-bold text-gray-500">Section Verrouillée</h3>
                <p className="text-gray-600">
                  Découvrez le Casino secret pour accéder à cette section.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
