'use client';

import { Loader2, X, Send, Search } from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';

interface User {
  id: string;
  name: string | null;
  email: string;
  role: string;
}

interface SendMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function SendMessageModal({ isOpen, onClose, onSuccess }: SendMessageModalProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>('ALL'); // 'ALL' par défaut
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Charger la liste des utilisateurs au montage
  useEffect(() => {
    if (isOpen) {
      loadUsers();
    }
  }, [isOpen]);

  // Filtrer les utilisateurs selon la recherche
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const query = searchQuery.toLowerCase();
    return users.filter(
      (user) => user.name?.toLowerCase().includes(query) || user.email.toLowerCase().includes(query)
    );
  }, [users, searchQuery]);

  const loadUsers = async () => {
    setIsLoadingUsers(true);
    setError(null);
    try {
      const response = await fetch('/api/users');
      if (!response.ok) {
        throw new Error('Erreur lors du chargement des utilisateurs');
      }
      const data = await response.json();
      const result = data?.data || data;
      setUsers(Array.isArray(result) ? result : []);
    } catch (err) {
      console.error('Erreur lors du chargement des utilisateurs:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setError('Le titre est requis');
      return;
    }

    const sendToAll = selectedUserId === 'ALL';

    setIsSending(true);
    setError(null);

    try {
      const response = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: sendToAll ? null : selectedUserId,
          type: 'ADMIN_MESSAGE',
          title: title.trim(),
          message: message.trim() || null,
          sendToAll,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erreur lors de l'envoi");
      }

      // Réinitialiser le formulaire
      setTitle('');
      setMessage('');
      setSelectedUserId('ALL');
      setSearchQuery('');

      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err) {
      console.error("Erreur lors de l'envoi:", err);
      setError(err instanceof Error ? err.message : "Erreur lors de l'envoi");
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = () => {
    if (!isSending) {
      setTitle('');
      setMessage('');
      setSelectedUserId('ALL');
      setSearchQuery('');
      setError(null);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="w-full max-w-md bg-gradient-to-br from-gray-900/95 via-gray-800/95 to-gray-900/95 backdrop-blur-xl border border-purple-500/30 rounded-xl shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-700/50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Send className="w-5 h-5 text-blue-400" />
              </div>
              <h2 className="text-lg font-semibold text-white">Envoyer un message</h2>
            </div>
            <button
              onClick={handleClose}
              disabled={isSending}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors disabled:opacity-50"
              aria-label="Fermer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            {/* Erreur */}
            {error && (
              <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Sélecteur de destinataire */}
            <div className="space-y-2">
              <label htmlFor="recipient-select" className="text-sm font-medium text-gray-300">
                Destinataire
              </label>
              {isLoadingUsers ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-purple-500" />
                </div>
              ) : (
                <>
                  {/* Zone de recherche (toujours visible pour filtrer) */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Rechercher un utilisateur..."
                      className="w-full pl-10 pr-4 py-2 bg-gray-800/50 border border-gray-700/50 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    />
                  </div>

                  <select
                    id="recipient-select"
                    value={selectedUserId}
                    onChange={(e) => {
                      setSelectedUserId(e.target.value);
                      if (e.target.value === 'ALL') {
                        setSearchQuery(''); // Réinitialiser la recherche si on sélectionne "TOUS"
                      }
                    }}
                    className="w-full px-4 py-2 bg-gray-800/50 border border-gray-700/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  >
                    <option value="ALL">Tous les utilisateurs</option>
                    {filteredUsers.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name || user.email} {user.role === 'ADMIN' && '(Admin)'}
                      </option>
                    ))}
                  </select>

                  {/* Message si aucun résultat de recherche */}
                  {searchQuery && filteredUsers.length === 0 && (
                    <p className="text-xs text-gray-400">Aucun utilisateur trouvé</p>
                  )}
                </>
              )}
            </div>

            {/* Titre */}
            <div className="space-y-2">
              <label htmlFor="title" className="text-sm font-medium text-gray-300">
                Titre <span className="text-red-400">*</span>
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2 bg-gray-800/50 border border-gray-700/50 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                placeholder="Titre de la notification"
                required
                disabled={isSending}
              />
            </div>

            {/* Message */}
            <div className="space-y-2">
              <label htmlFor="message" className="text-sm font-medium text-gray-300">
                Message
              </label>
              <textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                className="w-full px-4 py-2 bg-gray-800/50 border border-gray-700/50 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none"
                placeholder="Message de la notification (optionnel)"
                disabled={isSending}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSending}
                className="flex-1 px-4 py-2 bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700/50 rounded-lg text-gray-300 text-sm font-medium transition-colors disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={
                  isSending || (selectedUserId !== 'ALL' && !selectedUserId) || !title.trim()
                }
                className="flex-1 px-4 py-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded-lg text-purple-300 text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Envoi...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Envoyer
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
