'use client';

import { motion } from 'framer-motion';
import {
  Gift,
  MessageSquare,
  Download,
  CheckCircle,
  FileText,
  Eye,
  RotateCcw,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { useAdminLiveActions } from '../hooks/useAdminLiveActions';
import { useAdminLiveSubmissionsContext } from '../context/AdminLiveSubmissionsContext';
import { GlobalInventoryManager } from './GlobalInventoryManager';
import { Package } from 'lucide-react';
import { RandomWheelModal } from './RandomWheelModal';

export function AdminLiveActions() {
  const { submissions, updateSubmissionRolled, updateSubmissionPinned, fetchSubmissions } =
    useAdminLiveSubmissionsContext();

  // Filtrer les soumissions non rollées pour la roue
  const nonRolledSubmissions = submissions.filter((s) => !s.isRolled);

  const {
    actions,
    updateAction,
    refreshAllSockets,
    addLoyalty,
    sendDiscordNotification,
    pasteNgrokUrl,
    getAllNames,
    getRolledNames,
    editGenres,
    deleteNgrok,
    rollRandom,
    downloadAll,
    purgeAllSubmissions,
    isWheelModalOpen,
    selectedSubmissionId,
    handleWheelSelectionComplete,
    handleCloseWheelModal,
    isInventoryManagerOpen,
    setIsInventoryManagerOpen,
  } = useAdminLiveActions(
    submissions,
    updateSubmissionRolled,
    updateSubmissionPinned,
    fetchSubmissions
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="glass-modern glass-modern-hover rounded-2xl p-4 sm:p-6 lg:p-6"
    >
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl sm:text-2xl font-audiowide text-white">ACTIONS</h2>
        <button
          onClick={refreshAllSockets}
          className="text-xs text-gray-400 hover:text-white underline transition-colors"
        >
          {/* CLICK HERE TO REFRESH ALL SOCKETS */}
        </button>
      </div>

      {/* Première ligne de boutons/checkboxes */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-4">
        <button
          onClick={() => setIsInventoryManagerOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 px-3 sm:px-4 py-2 rounded-lg flex items-center justify-center gap-2 text-sm font-medium text-white transition-colors"
        >
          <Package className="w-4 h-4" />
          <span className="hidden sm:inline">Inventories</span>
          <span className="sm:hidden">Inv.</span>
        </button>

        <button
          onClick={addLoyalty}
          className="bg-purple-600 hover:bg-purple-700 px-3 sm:px-4 py-2 rounded-lg flex items-center justify-center gap-2 text-sm font-medium text-white transition-colors"
        >
          <Gift className="w-4 h-4" />
          <span className="hidden sm:inline">Add Loyalty</span>
          <span className="sm:hidden">Loyalty</span>
        </button>

        <button
          onClick={sendDiscordNotification}
          className="bg-indigo-600 hover:bg-indigo-700 px-3 sm:px-4 py-2 rounded-lg flex items-center justify-center gap-2 text-sm font-medium text-white transition-colors"
        >
          <MessageSquare className="w-4 h-4" />
          <span className="hidden sm:inline">Discord Notification</span>
          <span className="sm:hidden">Discord</span>
        </button>

        <label className="flex items-center gap-2 cursor-pointer bg-white/5 hover:bg-white/10 px-3 sm:px-4 py-2 rounded-lg transition-colors">
          <input
            type="checkbox"
            checked={actions.downloadsEnabled}
            onChange={(e) => updateAction('downloadsEnabled', e.target.checked)}
            className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
          />
          <CheckCircle className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-300">Downloads</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer bg-white/5 hover:bg-white/10 px-3 sm:px-4 py-2 rounded-lg transition-colors">
          <input
            type="checkbox"
            checked={actions.trackSubmissions}
            onChange={(e) => updateAction('trackSubmissions', e.target.checked)}
            className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
          />
          <CheckCircle className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-300">Track Submissions</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer bg-white/5 hover:bg-white/10 px-3 sm:px-4 py-2 rounded-lg transition-colors">
          <input
            type="checkbox"
            checked={actions.koolKids}
            onChange={(e) => updateAction('koolKids', e.target.checked)}
            className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
          />
          <span className="text-sm text-gray-300">Kool Kids</span>
        </label>
      </div>

      {/* Deuxième ligne de boutons/checkboxes */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-4">
        <button
          onClick={pasteNgrokUrl}
          className="bg-gray-700 hover:bg-gray-600 px-3 sm:px-4 py-2 rounded-lg text-sm font-medium text-gray-300 transition-colors"
        >
          ngrok Paste URL
        </button>

        <button
          onClick={getAllNames}
          className="bg-gray-700 hover:bg-gray-600 px-3 sm:px-4 py-2 rounded-lg flex items-center justify-center gap-2 text-sm font-medium text-gray-300 transition-colors"
        >
          <FileText className="w-4 h-4" />
          <span className="hidden sm:inline">All Names</span>
          <span className="sm:hidden">All</span>
        </button>

        <button
          onClick={getRolledNames}
          className="bg-gray-700 hover:bg-gray-600 px-3 sm:px-4 py-2 rounded-lg flex items-center justify-center gap-2 text-sm font-medium text-gray-300 transition-colors"
        >
          <FileText className="w-4 h-4" />
          <span className="hidden sm:inline">Rolled Names</span>
          <span className="sm:hidden">Rolled</span>
        </button>

        <button
          onClick={downloadAll}
          className="bg-gray-700 hover:bg-gray-600 px-3 sm:px-4 py-2 rounded-lg flex items-center justify-center gap-2 text-sm font-medium text-gray-300 transition-colors"
        >
          <Download className="w-4 h-4" />
          <span className="hidden sm:inline">Download All</span>
          <span className="sm:hidden">Download</span>
        </button>

        <label className="flex items-center gap-2 cursor-pointer bg-white/5 hover:bg-white/10 px-3 sm:px-4 py-2 rounded-lg transition-colors">
          <input
            type="checkbox"
            checked={actions.genreBlend}
            onChange={(e) => updateAction('genreBlend', e.target.checked)}
            className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
          />
          <CheckCircle className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-300">Genre Blend</span>
        </label>

        <button
          onClick={editGenres}
          className="bg-gray-700 hover:bg-gray-600 px-3 sm:px-4 py-2 rounded-lg flex items-center justify-center gap-2 text-sm font-medium text-gray-300 transition-colors"
        >
          <Eye className="w-4 h-4" />
          <span className="hidden sm:inline">Edit Genres</span>
          <span className="sm:hidden">Genres</span>
        </button>
      </div>

      <div className="flex justify-start mb-4 gap-4">
        <button
          onClick={deleteNgrok}
          className="bg-red-600 hover:bg-red-700 px-3 sm:px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
        >
          ngrok Delete
        </button>

        <button
          onClick={purgeAllSubmissions}
          className="bg-red-600 hover:bg-red-700 px-3 sm:px-4 py-2 rounded-lg flex items-center justify-center gap-2 text-sm font-medium text-white transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          <span className="hidden sm:inline">Purge All</span>
          <span className="sm:hidden">Purge</span>
        </button>
      </div>

      {/* Bouton Roll Random centré */}
      <div className="flex justify-center">
        <motion.button
          onClick={rollRandom}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="bg-purple-600 hover:bg-purple-700 px-6 sm:px-8 py-3 rounded-lg flex items-center gap-2 text-base sm:text-lg font-medium text-white transition-colors"
        >
          <RotateCcw className="w-5 h-5" />
          Roll Random
        </motion.button>
      </div>

      {/* Modale de la roue */}
      <RandomWheelModal
        isOpen={isWheelModalOpen}
        submissions={nonRolledSubmissions}
        selectedSubmissionId={selectedSubmissionId}
        onClose={handleCloseWheelModal}
        onSelectionComplete={handleWheelSelectionComplete}
      />

      {/* Modale de gestion d'inventaire */}
      <GlobalInventoryManager
        isOpen={isInventoryManagerOpen}
        onClose={() => setIsInventoryManagerOpen(false)}
      />
    </motion.div>
  );
}
