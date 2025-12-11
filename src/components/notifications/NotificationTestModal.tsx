'use client';

import {
  TestTube,
  X,
  Loader2,
  ChevronRight,
  Calendar,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import ReactDOM from 'react-dom';
import { fetchWithAuth } from '@/lib/api/fetchWithAuth';

interface NotificationTestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function NotificationTestModal({ isOpen, onClose, onSuccess }: NotificationTestModalProps) {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'ADMIN';
  const [isSendingTest, setIsSendingTest] = useState<string | null>(null);

  // Ne pas afficher si l'utilisateur n'est pas admin
  if (!isAdmin) {
    return null;
  }

  const handleSendTestNotification = async (notificationType: string) => {
    setIsSendingTest(notificationType);
    try {
      const response = await fetchWithAuth('/api/notifications/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notificationType }),
      });

      if (response.ok) {
        // Attendre un peu pour que la notification soit bien créée
        await new Promise((resolve) => setTimeout(resolve, 500));
        // Appeler onSuccess pour rafraîchir les notifications
        if (onSuccess) {
          await onSuccess();
        }
      } else {
        const data = await response.json();
        alert(`Erreur: ${data.message || "Impossible d'envoyer la notification de test"}`);
      }
    } catch (err) {
      console.error("Erreur lors de l'envoi de la notification de test:", err);
      alert("Erreur lors de l'envoi de la notification de test");
    } finally {
      setIsSendingTest(null);
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        aria-hidden="true"
      />
      <div
        className="relative transform overflow-hidden rounded-xl glass-modern backdrop-blur-xl w-full max-w-2xl text-left shadow-2xl transition-all sm:my-8 animate-fadeIn"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-2 text-gray-400 hover:text-white bg-black/20 hover:bg-black/40 rounded-full transition-colors z-10"
          aria-label="Fermer la modale"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="p-6 md:p-8 max-h-[80vh] overflow-y-auto">
          <div className="flex items-center gap-2 mb-4">
            <TestTube className="w-6 h-6 text-yellow-400" />
            <h2 className="text-2xl font-bold text-white">Tests de notifications</h2>
          </div>
          <p className="text-sm text-gray-400 mb-6">
            Envoyer des notifications de test pour vérifier leur affichage
          </p>

          <div className="space-y-6">
            {/* Notifications de Release */}
            <div>
              <h3 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-purple-400" />
                Releases
              </h3>
              <div className="flex flex-wrap gap-2">
                {['RELEASE_J7', 'RELEASE_J5', 'RELEASE_J3', 'RELEASE_J1', 'RELEASE_J0'].map(
                  (type) => (
                    <button
                      key={type}
                      onClick={() => handleSendTestNotification(type)}
                      disabled={isSendingTest === type}
                      className="px-4 py-2 text-sm bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/50 text-purple-300 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {isSendingTest === type ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                      {type.replace('RELEASE_', 'J-')}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Notifications de Deadline */}
            <div>
              <h3 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-orange-400" />
                Deadlines
              </h3>
              <div className="flex flex-wrap gap-2">
                {['DEADLINE_J14', 'DEADLINE_J7', 'DEADLINE_J5', 'DEADLINE_J3', 'DEADLINE_J1'].map(
                  (type) => (
                    <button
                      key={type}
                      onClick={() => handleSendTestNotification(type)}
                      disabled={isSendingTest === type}
                      className="px-4 py-2 text-sm bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/50 text-orange-300 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {isSendingTest === type ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                      {type.replace('DEADLINE_', 'J-')}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Notifications de Jalons */}
            <div>
              <h3 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-400" />
                Jalons
              </h3>
              <div className="flex flex-wrap gap-2">
                {['MILESTONE_J180', 'MILESTONE_J365'].map((type) => (
                  <button
                    key={type}
                    onClick={() => handleSendTestNotification(type)}
                    disabled={isSendingTest === type}
                    className="px-4 py-2 text-sm bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/50 text-blue-300 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isSendingTest === type ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                    {type.replace('MILESTONE_', '')}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (typeof window === 'undefined') return null;
  return ReactDOM.createPortal(modalContent, document.body);
}
