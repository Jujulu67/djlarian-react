'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Ticket, FileText, RefreshCw } from 'lucide-react';
import { fetchWithAuth } from '@/lib/api/fetchWithAuth';

interface PoolStats {
  totalTickets: number;
  submissionsCount: number;
}

export function LivePoolStats() {
  const [stats, setStats] = useState<PoolStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadStats = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const response = await fetchWithAuth('/api/admin/live/stats');
      if (response.ok) {
        const result = await response.json();
        setStats(result.data);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des stats:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadStats();
    // Rafraîchir toutes les 30 secondes
    const interval = setInterval(() => {
      loadStats(true);
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadStats(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="glass-modern glass-modern-hover rounded-2xl p-4 sm:p-6 lg:p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg sm:text-xl font-audiowide text-white">POOL STATS</h2>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="text-gray-400 hover:text-white transition-colors disabled:opacity-50"
          title="Rafraîchir les statistiques"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading && !stats ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {/* Total Tickets */}
          <div className="flex flex-col items-center justify-center p-4 bg-gradient-to-br from-purple-900/30 to-blue-900/30 rounded-xl border border-purple-500/20">
            <div className="flex items-center gap-2 mb-2">
              <Ticket className="w-5 h-5 text-purple-400" />
              <span className="text-xs sm:text-sm text-gray-400 uppercase tracking-wider">
                Total Tickets
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-white font-audiowide">
              {stats?.totalTickets ?? 0}
            </div>
          </div>

          {/* Submissions Count */}
          <div className="flex flex-col items-center justify-center p-4 bg-gradient-to-br from-blue-900/30 to-purple-900/30 rounded-xl border border-blue-500/20">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-5 h-5 text-blue-400" />
              <span className="text-xs sm:text-sm text-gray-400 uppercase tracking-wider">
                Submissions
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-white font-audiowide">
              {stats?.submissionsCount ?? 0}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
