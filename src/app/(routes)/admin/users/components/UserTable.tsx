'use client';

import { useState } from 'react';
import { User, Mail, Calendar, X } from 'lucide-react';
import Image from 'next/image';
import { toast } from 'sonner';

import UserActions from '@/components/admin/UserActions';
import { logger } from '@/lib/logger';

type UserData = {
  id: string;
  name?: string | null;
  email?: string | null;
  role: string | null;
  isVip?: boolean;
  createdAt?: Date | null;
  hashedPassword?: string | null; // Pour vérifier si l'utilisateur a un mot de passe
  Account: Array<{
    id: string;
    provider: string;
    providerAccountId: string;
    type: string; // Pour vérifier si c'est OAuth
  }>;
};

interface UserTableProps {
  users: UserData[];
}

// Composant pour afficher et gérer les comptes OAuth
function OAuthAccountsCell({ user }: Readonly<{ user: UserData }>) {
  const [unlinking, setUnlinking] = useState<string | null>(null);

  const handleUnlink = async (accountId: string, provider: string) => {
    // Vérifier si c'est le dernier compte OAuth et si l'utilisateur n'a pas de mot de passe
    // Note: NextAuth utilise 'oidc' comme type pour OAuth (Google, Twitch, etc.)
    const oauthAccounts = user.Account.filter((acc) => acc.type === 'oauth' || acc.type === 'oidc');
    const hasPassword = !!user.hashedPassword;
    const isLastOAuthAccount = oauthAccounts.length === 1;

    if (isLastOAuthAccount && !hasPassword) {
      toast.error(
        "Impossible de désassocier le dernier compte OAuth. L'utilisateur doit d'abord définir un mot de passe.",
        {
          duration: 5000,
        }
      );
      return;
    }

    const confirmMessage =
      isLastOAuthAccount && hasPassword
        ? `⚠️ Attention : C'est le dernier compte OAuth. L'utilisateur devra utiliser son mot de passe pour se connecter. Continuer ?`
        : `Êtes-vous sûr de vouloir désassocier le compte ${provider} ?`;

    if (!confirm(confirmMessage)) {
      return;
    }

    setUnlinking(accountId);
    try {
      const response = await fetch(`/api/admin/users/${user.id}/unlink-account`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ accountId }),
      });

      if (!response.ok) {
        const error = await response.json();
        const errorMessage = error.error || 'Erreur lors de la désassociation';

        // Si l'erreur indique qu'il faut un mot de passe, suggérer d'en définir un
        if (errorMessage.includes('mot de passe')) {
          toast.error(
            `${errorMessage} Veuillez d'abord définir un mot de passe pour cet utilisateur.`,
            {
              duration: 6000,
            }
          );
        } else {
          throw new Error(errorMessage);
        }
        return;
      }

      toast.success(`Compte ${provider} désassocié avec succès`);
      // Rafraîchir la page pour mettre à jour les données
      window.location.reload();
    } catch (error) {
      logger.error('Erreur désassociation:', error);
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la désassociation');
    } finally {
      setUnlinking(null);
    }
  };

  const getProviderIcon = (provider: string) => {
    switch (provider.toLowerCase()) {
      case 'google':
        return '/icons/google.svg';
      case 'twitch':
        return '/icons/twitch.svg';
      default:
        return null;
    }
  };

  const getProviderColor = (provider: string) => {
    switch (provider.toLowerCase()) {
      case 'google':
        return 'bg-blue-900/30 border-blue-700/50';
      case 'twitch':
        return 'bg-purple-900/30 border-purple-700/50';
      default:
        return 'bg-gray-900/30 border-gray-700/50';
    }
  };

  const getProviderLabel = (provider: string) => {
    switch (provider.toLowerCase()) {
      case 'google':
        return 'Google';
      case 'twitch':
        return 'Twitch';
      default:
        return provider;
    }
  };

  if (!user.Account || user.Account.length === 0) {
    return <span className="text-gray-500 text-sm italic">Aucun compte OAuth</span>;
  }

  // Vérifier si c'est le dernier compte OAuth et si l'utilisateur n'a pas de mot de passe
  // Note: NextAuth utilise 'oidc' comme type pour OAuth (Google, Twitch, etc.)
  const oauthAccounts = user.Account.filter((acc) => acc.type === 'oauth' || acc.type === 'oidc');
  const hasPassword = !!user.hashedPassword;
  const isLastOAuthAccount = oauthAccounts.length === 1;

  return (
    <div className="flex flex-wrap gap-2">
      {user.Account.map((account) => {
        const iconSrc = getProviderIcon(account.provider);
        const isThisAccount = account.id === oauthAccounts[0]?.id;
        const showWarning = isLastOAuthAccount && !hasPassword && isThisAccount;

        return (
          <div
            key={account.id}
            className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full border ${
              showWarning
                ? 'bg-amber-900/30 border-amber-700/50'
                : getProviderColor(account.provider)
            }`}
            title={
              showWarning
                ? `⚠️ Attention : C'est le dernier compte OAuth de cet utilisateur et aucun mot de passe n'est défini. Définissez un mot de passe via "Modifier" avant de pouvoir désassocier ce compte, sinon l'utilisateur sera verrouillé.`
                : `Compte ${getProviderLabel(account.provider)} lié`
            }
          >
            {iconSrc ? (
              <Image
                src={iconSrc}
                alt={getProviderLabel(account.provider)}
                width={16}
                height={16}
                className="w-4 h-4"
              />
            ) : (
              <span className="text-xs font-medium text-gray-300">
                {getProviderLabel(account.provider)}
              </span>
            )}
            {showWarning && (
              <span
                className="text-xs text-amber-400 cursor-help"
                title="⚠️ Dernier compte OAuth sans mot de passe - Définir un mot de passe avant de désassocier"
              >
                ⚠️
              </span>
            )}
            <button
              onClick={() => handleUnlink(account.id, account.provider)}
              disabled={unlinking === account.id || showWarning}
              className="hover:bg-red-500/20 rounded-full p-0.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ml-0.5"
              title={
                showWarning
                  ? `⚠️ Impossible de désassocier : C'est le dernier compte OAuth et aucun mot de passe n'est défini. Allez dans "Modifier" pour définir un mot de passe d'abord.`
                  : `Désassocier le compte ${getProviderLabel(account.provider)}`
              }
            >
              <X className="h-3 w-3 text-gray-400 hover:text-red-400" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

function getRoleBadgeClass(role: string | null): string {
  if (role === 'ADMIN') return 'bg-purple-800/70 text-purple-100';
  if (role === 'MODERATOR') return 'bg-blue-800/70 text-blue-100';
  return 'bg-green-800/70 text-green-100';
}

export const UserTable = ({ users }: UserTableProps) => {
  return (
    <div className="bg-gray-800/50 rounded-lg shadow-xl overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-700/50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-purple-300 uppercase tracking-wider">
              Nom
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-purple-300 uppercase tracking-wider">
              Email
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-purple-300 uppercase tracking-wider">
              Rôle & Statut
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-purple-300 uppercase tracking-wider">
              Comptes OAuth
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-purple-300 uppercase tracking-wider">
              Date de création
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-purple-300 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-700">
          {users.map((user: UserData) => (
            <tr key={user.id} className="hover:bg-gray-700/30 transition-colors">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <User className="h-5 w-5 text-gray-400 mr-2" />
                  {user.name || 'N/A'}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <Mail className="h-5 w-5 text-gray-400 mr-2" />
                  {user.email || 'N/A'}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center space-x-2">
                  <span
                    className={`px-3 py-1 inline-flex items-center text-xs leading-5 font-semibold rounded-full ${getRoleBadgeClass(user.role)}`}
                  >
                    {user.role === 'ADMIN' && <span className="mr-1">👑</span>}
                    {user.role === 'MODERATOR' && <span className="mr-1">🛡️</span>}
                    {user.role === 'USER' && <span className="mr-1">👤</span>}
                    {user.role || 'N/A'}
                  </span>
                  {user.isVip && (
                    <span
                      className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-700/70 text-amber-100"
                      title="Utilisateur VIP"
                    >
                      <span className="mr-1">⭐</span>VIP
                    </span>
                  )}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <OAuthAccountsCell user={user} />
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center text-sm text-gray-300">
                  <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                  {user.createdAt
                    ? new Date(user.createdAt).toLocaleDateString('fr-FR', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })
                    : 'N/A'}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <UserActions userId={user.id} userName={user.name} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
