'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  RefreshCw,
  Trash2,
  ExternalLink,
  ArrowUpDown,
  Pin,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { useAdminLiveSubmissionsContext } from '../context/AdminLiveSubmissionsContext';
import { useAdminLiveFilters } from '../hooks/useAdminLiveFilters';
import { useAdminLivePlayerContext } from '../context/AdminLivePlayerContext';
import { useAdminLiveActions } from '../hooks/useAdminLiveActions';
import { calculateTicketWeight } from '@/lib/live/calculations';
import type { UserTicket, UserLiveItem } from '@/types/live';
import { TicketSource, LiveItemType } from '@/types/live';
import Link from 'next/link';
import { InventoryModal } from './InventoryModal';

type SortField = 'weight' | 'username' | 'rolled' | null;
type SortDirection = 'asc' | 'desc' | null;

export function AdminLiveSubmissionsTable() {
  const {
    submissions,
    loading,
    error,
    fetchSubmissions,
    updateSubmissionRolled,
    updateSubmissionPinned,
  } = useAdminLiveSubmissionsContext();

  const { searchUsername, showRolled, onlyActive, filteredSubmissions } =
    useAdminLiveFilters(submissions);

  const { purgeAllSubmissions } = useAdminLiveActions(
    submissions,
    updateSubmissionRolled,
    updateSubmissionPinned,
    fetchSubmissions
  );

  const { setSelectedSubmission, restoreSelectedSubmission } = useAdminLivePlayerContext();

  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  // Fonction pour calculer le poids d'une soumission
  const calculateSubmissionWeight = (submission: (typeof submissions)[0]): number => {
    const userTickets: UserTicket[] = (submission.User?.UserTicket || []).map((t) => ({
      id: t.id,
      userId: submission.User.id,
      quantity: t.quantity,
      source: t.source as TicketSource,
      expiresAt: t.expiresAt,
      createdAt: t.createdAt,
    }));

    const userItems: UserLiveItem[] = (submission.User?.UserLiveItem || [])
      .filter((item) => item.LiveItem && (item.activatedQuantity || 0) > 0) // Filtrer les items activés
      .map((item) => ({
        id: item.id,
        userId: submission.User.id,
        itemId: item.LiveItem?.id || '',
        quantity: item.quantity,
        activatedQuantity: item.activatedQuantity || 0,
        isActivated: (item.activatedQuantity || 0) > 0,
        activatedAt: item.activatedAt,
        metadata: item.metadata,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        LiveItem: item.LiveItem
          ? {
              id: item.LiveItem.id,
              type: item.LiveItem.type as LiveItemType,
              name: item.LiveItem.name,
              description: null,
              icon: null,
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date(),
            }
          : undefined,
      }));

    return calculateTicketWeight(userTickets, userItems);
  };

  // Trier les soumissions
  const sortedSubmissions = useMemo(() => {
    if (!sortField) return filteredSubmissions;

    const sorted = [...filteredSubmissions].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'weight':
          const weightA = calculateSubmissionWeight(a);
          const weightB = calculateSubmissionWeight(b);
          comparison = weightA - weightB;
          break;
        case 'username':
          comparison = (a.User.name || '').localeCompare(b.User.name || '');
          break;
        case 'rolled':
          comparison = Number(a.isRolled) - Number(b.isRolled);
          break;
        default:
          return 0;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [filteredSubmissions, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

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

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 opacity-50" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="w-3 h-3" />
    ) : (
      <ArrowDown className="w-3 h-3" />
    );
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
        <p className="text-xs text-gray-400">{/* List of current live submissions */}</p>
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
                <button
                  onClick={() => handleSort('username')}
                  className="flex items-center gap-1 hover:text-purple-200 transition-colors"
                >
                  USERNAME
                  {getSortIcon('username')}
                </button>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-purple-300 uppercase tracking-wider">
                <div className="flex items-center gap-1">
                  SUBMISSION
                  <ArrowUpDown className="w-3 h-3 opacity-50" />
                </div>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-purple-300 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('weight')}
                  className="flex items-center gap-1 hover:text-purple-200 transition-colors"
                >
                  WEIGHT
                  {getSortIcon('weight')}
                </button>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-purple-300 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('rolled')}
                  className="flex items-center gap-1 hover:text-purple-200 transition-colors"
                >
                  ROLLED
                  {getSortIcon('rolled')}
                </button>
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
            {sortedSubmissions.map((submission) => {
              const weight = calculateSubmissionWeight(submission);
              return (
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
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-purple-400 font-audiowide">
                        {weight}
                      </span>
                      <span className="text-xs text-gray-500">tickets</span>
                    </div>
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
                    <InventoryModal
                      userId={submission.userId}
                      userName={submission.User.name || 'Unknown'}
                      trigger={
                        <button className="text-purple-400 hover:text-purple-300 flex items-center gap-1 text-sm transition-colors">
                          Inventory <ExternalLink className="w-3 h-3" />
                        </button>
                      }
                    />
                  </td>
                </tr>
              );
            })}
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

      {!loading && !error && sortedSubmissions.length === 0 && (
        <div className="text-center py-12 text-gray-400">Aucune soumission trouvée</div>
      )}
    </motion.div>
  );
}
