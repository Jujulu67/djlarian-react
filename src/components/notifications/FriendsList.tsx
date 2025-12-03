'use client';

import {
  UserPlus,
  UserMinus,
  Check,
  X,
  Loader2,
  MessageSquare,
  User,
  Send,
  Search,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

import { useFriends, Friend, PendingRequest } from '@/hooks/useFriends';
import { SendMessageModal } from './SendMessageModal';
import { fetchWithAuth } from '@/lib/api/fetchWithAuth';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface FriendsListProps {
  onSendMessage?: (userId: string) => void;
}

export function FriendsList({ onSendMessage }: FriendsListProps) {
  const {
    friends,
    pendingReceived,
    pendingSent,
    isLoading,
    error,
    sendRequest,
    acceptRequest,
    rejectRequest,
    unfriend,
  } = useFriends();

  const [searchQuery, setSearchQuery] = useState('');
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [users, setUsers] = useState<Array<{ id: string; name: string | null; email: string }>>([]);
  const [showUserSearch, setShowUserSearch] = useState(true); // Ouvert par défaut
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [unfriendDialogOpen, setUnfriendDialogOpen] = useState(false);
  const [friendToRemove, setFriendToRemove] = useState<{ id: string; name: string } | null>(null);

  // Charger la liste des utilisateurs pour la recherche
  const loadUsers = async () => {
    if (users.length > 0) return; // Déjà chargé
    setIsLoadingUsers(true);
    try {
      const response = await fetchWithAuth('/api/users');
      if (response.ok) {
        const data = await response.json();
        const result = data?.data || data;
        setUsers(Array.isArray(result) ? result : []);
      }
    } catch (err) {
      console.error('Erreur lors du chargement des utilisateurs:', err);
      toast.error('Erreur lors du chargement des utilisateurs');
    } finally {
      setIsLoadingUsers(false);
    }
  };

  // Charger les utilisateurs au montage si la section est ouverte
  useEffect(() => {
    if (showUserSearch && users.length === 0) {
      loadUsers();
    }
  }, [showUserSearch]);

  // Filtrer les utilisateurs qui ne sont pas déjà amis ou en attente
  const availableUsers = users.filter((user) => {
    const isFriend = friends.some((f) => f.user.id === user.id);
    const isPendingReceived = pendingReceived.some((p) => p.user.id === user.id);
    const isPendingSent = pendingSent.some((p) => p.user.id === user.id);
    return !isFriend && !isPendingReceived && !isPendingSent;
  });

  // Filtrer selon la recherche si une recherche est active, sinon afficher tous les utilisateurs disponibles
  const filteredAvailableUsers = availableUsers.filter((user) => {
    if (!searchQuery.trim()) return true; // Afficher tous si pas de recherche
    const query = searchQuery.toLowerCase();
    return user.name?.toLowerCase().includes(query) || user.email.toLowerCase().includes(query);
  });

  const handleAction = async (
    action: () => Promise<void>,
    friendshipId: string,
    successMessage: string
  ) => {
    setProcessingIds((prev) => new Set(prev).add(friendshipId));
    try {
      await action();
      toast.success(successMessage);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(friendshipId);
        return next;
      });
    }
  };

  const handleSendMessage = (userId: string) => {
    setSelectedUserId(userId);
    setIsSendModalOpen(true);
    if (onSendMessage) {
      onSendMessage(userId);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Recherche d'utilisateurs pour envoyer une demande */}
      <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700/50 rounded-lg overflow-hidden transition-all duration-200">
        {/* Header cliquable pour collapse/expand */}
        <button
          onClick={() => {
            setShowUserSearch(!showUserSearch);
            if (!showUserSearch && users.length === 0) {
              loadUsers();
            }
          }}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-800/30 transition-colors"
        >
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <div className="p-1.5 bg-purple-500/20 rounded-lg border border-purple-500/30">
              <UserPlus className="w-4 h-4 text-purple-400" />
            </div>
            Ajouter un ami
          </h3>
          <div className="flex items-center gap-2">
            {availableUsers.length > 0 && (
              <span className="text-xs text-gray-400 bg-gray-700/50 px-2 py-1 rounded-full">
                {availableUsers.length} disponible{availableUsers.length > 1 ? 's' : ''}
              </span>
            )}
            {showUserSearch ? (
              <ChevronUp className="w-5 h-5 text-gray-400 transition-transform" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400 transition-transform" />
            )}
          </div>
        </button>

        {/* Contenu collapsible */}
        {showUserSearch && (
          <div className="px-4 pb-4 space-y-3 border-t border-gray-700/50 pt-4">
            {/* Champ de recherche */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher un utilisateur par nom ou email..."
                className="w-full pl-10 pr-4 py-2.5 bg-gray-900/70 border border-gray-700/50 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
                onClick={(e) => e.stopPropagation()}
              />
            </div>

            {/* Liste des utilisateurs */}
            {isLoadingUsers ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
              </div>
            ) : filteredAvailableUsers.length === 0 ? (
              <div className="text-center py-6">
                <User className="w-10 h-10 text-gray-600 mx-auto mb-2" />
                <p className="text-sm text-gray-400">
                  {searchQuery.trim()
                    ? 'Aucun utilisateur trouvé'
                    : availableUsers.length === 0
                      ? 'Aucun utilisateur disponible'
                      : 'Commencez à taper pour rechercher'}
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar">
                {filteredAvailableUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-3 bg-gray-900/50 hover:bg-gray-900/70 border border-gray-700/30 rounded-lg transition-all group"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-900/40 to-purple-800/20 flex items-center justify-center border border-purple-500/30 flex-shrink-0 group-hover:border-purple-500/50 transition-colors">
                        <User className="w-5 h-5 text-purple-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-white truncate">
                          {user.name || user.email}
                        </p>
                        {user.name && (
                          <p className="text-xs text-gray-400 truncate">{user.email}</p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAction(
                          () => sendRequest(user.id),
                          `request-${user.id}`,
                          "Demande d'ami envoyée"
                        );
                      }}
                      disabled={processingIds.has(`request-${user.id}`)}
                      className="px-4 py-2 bg-gradient-to-r from-purple-600/20 to-purple-500/20 hover:from-purple-600/30 hover:to-purple-500/30 border border-purple-500/30 rounded-lg text-purple-300 text-xs font-medium transition-all disabled:opacity-50 flex items-center gap-2 flex-shrink-0 hover:scale-105 active:scale-95"
                    >
                      {processingIds.has(`request-${user.id}`) ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Envoi...</span>
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>Ajouter</span>
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Demandes reçues */}
      {pendingReceived.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-blue-400" />
            Demandes reçues ({pendingReceived.length})
          </h2>
          <div className="space-y-2">
            {pendingReceived.map((request) => (
              <div
                key={request.friendshipId}
                className="flex items-center justify-between p-4 bg-gray-800/50 border border-gray-700/50 rounded-lg"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="h-10 w-10 rounded-full bg-blue-900/30 flex items-center justify-center border border-blue-500/20 flex-shrink-0">
                    {request.user.image ? (
                      <img
                        src={request.user.image}
                        alt={request.user.name || ''}
                        className="h-full w-full object-cover rounded-full"
                      />
                    ) : (
                      <User className="w-5 h-5 text-blue-400" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white truncate">
                      {request.user.name || request.user.email}
                    </p>
                    {request.user.name && (
                      <p className="text-xs text-gray-400 truncate">{request.user.email}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() =>
                      handleAction(
                        () => acceptRequest(request.friendshipId),
                        request.friendshipId,
                        'Demande acceptée'
                      )
                    }
                    disabled={processingIds.has(request.friendshipId)}
                    className="px-3 py-1.5 bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 rounded-lg text-green-300 text-xs font-medium transition-colors disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {processingIds.has(request.friendshipId) ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Check className="w-3 h-3" />
                    )}
                    Accepter
                  </button>
                  <button
                    onClick={() =>
                      handleAction(
                        () => rejectRequest(request.friendshipId),
                        request.friendshipId,
                        'Demande rejetée'
                      )
                    }
                    disabled={processingIds.has(request.friendshipId)}
                    className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 rounded-lg text-red-300 text-xs font-medium transition-colors disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {processingIds.has(request.friendshipId) ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <X className="w-3 h-3" />
                    )}
                    Rejeter
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Demandes envoyées */}
      {pendingSent.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <Send className="w-5 h-5 text-yellow-400" />
            Demandes envoyées ({pendingSent.length})
          </h2>
          <div className="space-y-2">
            {pendingSent.map((request) => (
              <div
                key={request.friendshipId}
                className="flex items-center justify-between p-4 bg-gray-800/50 border border-gray-700/50 rounded-lg"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="h-10 w-10 rounded-full bg-yellow-900/30 flex items-center justify-center border border-yellow-500/20 flex-shrink-0">
                    {request.user.image ? (
                      <img
                        src={request.user.image}
                        alt={request.user.name || ''}
                        className="h-full w-full object-cover rounded-full"
                      />
                    ) : (
                      <User className="w-5 h-5 text-yellow-400" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white truncate">
                      {request.user.name || request.user.email}
                    </p>
                    {request.user.name && (
                      <p className="text-xs text-gray-400 truncate">{request.user.email}</p>
                    )}
                  </div>
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0">En attente</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Liste des amis */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
          <User className="w-5 h-5 text-purple-400" />
          Mes amis ({friends.length})
        </h2>
        {friends.length === 0 ? (
          <div className="p-8 bg-gray-800/50 border border-gray-700/50 rounded-lg text-center">
            <User className="w-12 h-12 text-gray-500 mx-auto mb-3" />
            <p className="text-gray-400">Vous n'avez pas encore d'amis</p>
            <p className="text-sm text-gray-500 mt-1">
              Utilisez la recherche ci-dessus pour ajouter des amis
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {friends.map((friend) => (
              <div
                key={friend.friendshipId}
                className="flex items-center justify-between p-4 bg-gray-800/50 border border-gray-700/50 rounded-lg hover:bg-gray-800/70 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="h-10 w-10 rounded-full bg-purple-900/30 flex items-center justify-center border border-purple-500/20 flex-shrink-0">
                    {friend.user.image ? (
                      <img
                        src={friend.user.image}
                        alt={friend.user.name || ''}
                        className="h-full w-full object-cover rounded-full"
                      />
                    ) : (
                      <User className="w-5 h-5 text-purple-400" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white truncate">
                      {friend.user.name || friend.user.email}
                    </p>
                    {friend.user.name && (
                      <p className="text-xs text-gray-400 truncate">{friend.user.email}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleSendMessage(friend.user.id)}
                    className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded-lg text-blue-300 text-xs font-medium transition-colors flex items-center gap-1.5"
                  >
                    <MessageSquare className="w-3 h-3" />
                    Message
                  </button>
                  <button
                    onClick={() => {
                      setFriendToRemove({
                        id: friend.friendshipId,
                        name: friend.user.name || friend.user.email || 'Cet ami',
                      });
                      setUnfriendDialogOpen(true);
                    }}
                    disabled={processingIds.has(friend.friendshipId)}
                    className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 rounded-lg text-red-300 text-xs font-medium transition-colors disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {processingIds.has(friend.friendshipId) ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <UserMinus className="w-3 h-3" />
                    )}
                    Retirer
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal d'envoi de message */}
      <SendMessageModal
        isOpen={isSendModalOpen && selectedUserId !== null}
        onClose={() => {
          setIsSendModalOpen(false);
          setSelectedUserId(null);
        }}
        onSuccess={() => {
          setIsSendModalOpen(false);
          setSelectedUserId(null);
        }}
        replyTo={null}
        initialUserId={selectedUserId}
      />

      {/* Dialog de confirmation pour retirer un ami */}
      <AlertDialog open={unfriendDialogOpen} onOpenChange={setUnfriendDialogOpen}>
        <AlertDialogContent className="bg-gradient-to-br from-gray-900/95 via-gray-800/95 to-gray-900/95 backdrop-blur-xl border border-red-500/30">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Retirer un ami</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-300">
              Êtes-vous sûr de vouloir retirer{' '}
              <span className="font-semibold text-white">{friendToRemove?.name}</span> de votre
              liste d'amis ?
              <br />
              <span className="text-sm text-gray-400 mt-2 block">
                Vous ne pourrez plus lui envoyer de messages tant que vous ne serez pas à nouveau
                amis.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-800/50 border-gray-700/50 text-gray-300 hover:bg-gray-700/50">
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (friendToRemove) {
                  await handleAction(
                    () => unfriend(friendToRemove.id),
                    friendToRemove.id,
                    'Ami retiré'
                  );
                  setUnfriendDialogOpen(false);
                  setFriendToRemove(null);
                }
              }}
              className="bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-300"
            >
              Retirer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
