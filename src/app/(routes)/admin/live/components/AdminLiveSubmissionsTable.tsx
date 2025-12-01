'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Trash2, ExternalLink, ArrowUpDown, Pin } from 'lucide-react';
import { useAdminLiveSubmissionsContext } from '../context/AdminLiveSubmissionsContext';
import { useAdminLiveFilters } from '../hooks/useAdminLiveFilters';
import { useAdminLivePlayerContext } from '../context/AdminLivePlayerContext';
import Link from 'next/link';

export function AdminLiveSubmissionsTable() {
  const {
    submissions,
    loading,
    error,
    fetchSubmissions,
    updateSubmissionRolled,
    updateSubmissionPinned,
  } = useAdminLiveSubmissionsContext();

  const {
    searchUsername,
    setSearchUsername,
    showRolled,
    setShowRolled,
    onlyActive,
    setOnlyActive,
    filteredSubmissions,
    resetFilters,
  } = useAdminLiveFilters(submissions);

  const { setSelectedSubmission, restoreSelectedSubmission } = useAdminLivePlayerContext();

  const handleOpenSubmission = (submission: (typeof submissions)[0]) => {
    setSelectedSubmission(submission);
  };

  // Restaurer la soumission sauvegardée après le chargement
  useEffect(() => {
    if (!loading && submissions.length > 0) {
      restoreSelectedSubmission(submissions);
    }
  }, [loading, submissions, restoreSelectedSubmission]);

  const handleToggleRolled = async (submission: (typeof submissions)[0], isRolled: boolean) => {
    await updateSubmissionRolled(submission.id, isRolled);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
      className="glass-modern glass-modern-hover rounded-2xl p-4 sm:p-6 lg:p-6"
    >
      <div className="mb-4">
        <h2 className="text-xl sm:text-2xl font-audiowide text-white mb-2">SUBMISSIONS</h2>
        <p className="text-xs text-gray-400">
          // THIS IS JUST HERE SO THAT THE LAYOUT LOOKS NICE : D
        </p>
      </div>

      {/* Filtres */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <input
          type="text"
          placeholder="Filter usernames..."
          value={searchUsername}
          onChange={(e) => setSearchUsername(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
        />
        <label className="flex items-center gap-2 cursor-pointer bg-white/5 hover:bg-white/10 px-4 py-2 rounded-lg transition-colors">
          <input
            type="checkbox"
            checked={showRolled}
            onChange={(e) => setShowRolled(e.target.checked)}
            className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
          />
          <span className="text-sm text-gray-300">Show Rolled</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer bg-white/5 hover:bg-white/10 px-4 py-2 rounded-lg transition-colors">
          <input
            type="checkbox"
            checked={onlyActive}
            onChange={(e) => setOnlyActive(e.target.checked)}
            className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
          />
          <span className="text-sm text-gray-300">Only Active</span>
        </label>
        <button
          onClick={resetFilters}
          className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg flex items-center justify-center gap-2 text-sm font-medium text-white transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          Reset All
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-white/5">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-purple-300 uppercase tracking-wider w-12"></th>
              <th className="px-4 py-3 text-left text-xs font-medium text-purple-300 uppercase tracking-wider">
                <div className="flex items-center gap-1">
                  SUBBED
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-purple-300 uppercase tracking-wider">
                <div className="flex items-center gap-1">
                  USERNAME
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-purple-300 uppercase tracking-wider">
                <div className="flex items-center gap-1">
                  SUBMISSION
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-purple-300 uppercase tracking-wider">
                <div className="flex items-center gap-1">
                  ROLLED
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-purple-300 uppercase tracking-wider">
                <div className="flex items-center gap-1">
                  VOTE
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-purple-300 uppercase tracking-wider">
                INVENTORY
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {filteredSubmissions.map((submission) => (
              <tr
                key={submission.id}
                className={`hover:bg-white/5 transition-colors ${submission.isPinned ? 'bg-purple-500/10' : ''}`}
              >
                <td className="px-4 py-3">
                  {submission.isPinned && (
                    <div className="flex items-center justify-center">
                      <Pin className="w-4 h-4 text-purple-400 fill-purple-400" />
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                    // TODO: Implémenter la vérification du statut subscription Twitch
                  />
                </td>
                <td className="px-4 py-3 text-sm text-gray-300">
                  {submission.User.name || 'Unknown'}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => handleOpenSubmission(submission)}
                    className="text-purple-400 hover:text-purple-300 flex items-center gap-1 text-sm transition-colors"
                  >
                    Open <ExternalLink className="w-3 h-3" />
                  </button>
                </td>
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={submission.isRolled}
                    onChange={(e) => handleToggleRolled(submission, e.target.checked)}
                    className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                  />
                </td>
                <td className="px-4 py-3 text-sm text-gray-400">--</td>
                <td className="px-4 py-3">
                  <Link
                    href={`/live?userId=${submission.userId}`}
                    className="text-purple-400 hover:text-purple-300 flex items-center gap-1 text-sm transition-colors"
                  >
                    Inventory <ExternalLink className="w-3 h-3" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {loading && (
        <div className="text-center py-12 text-gray-400">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
          <p>Chargement des soumissions...</p>
        </div>
      )}

      {!loading && error && (
        <div className="text-center py-12 text-red-400">
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && filteredSubmissions.length === 0 && (
        <div className="text-center py-12 text-gray-400">Aucune soumission trouvée</div>
      )}
    </motion.div>
  );
}
