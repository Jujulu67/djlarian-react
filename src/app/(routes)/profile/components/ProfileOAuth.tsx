'use client';

import type { MouseEvent } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { Shield, Mail, Key, Link2, Unlink, AlertTriangle, Loader2 } from 'lucide-react';

import { useUiVersion } from '@/hooks/useUiVersion';

interface OAuthAccount {
  linked: boolean;
  available: boolean;
  accountId: string | null;
}

interface OAuthSecurity {
  hasPassword: boolean;
  oauthCount: number;
  canUnlink: boolean;
  isSecure: boolean;
}

interface ProfileOAuthProps {
  oauthAccounts: {
    google: OAuthAccount;
    twitch: OAuthAccount;
  } | null;
  oauthSecurity: OAuthSecurity | null;
  isLoading: boolean;
  unlinkingProvider: string | null;
  onLinkAccount: (provider: 'google' | 'twitch') => void;
  onUnlinkAccount: (provider: 'google' | 'twitch', accountId: string | null) => void;
  onOpenPasswordModal: () => void;
}

type OAuthAccounts = NonNullable<ProfileOAuthProps['oauthAccounts']>;
type OAuthProvider = 'google' | 'twitch';

const ROW_CLASS =
  'rounded-xl bg-gradient-to-r from-purple-500/5 to-blue-500/5 border border-purple-500/10 p-3 sm:p-4 v2:bg-none v2:bg-white/[0.03] v2:border-white/[0.08]';
const ACTION_BUTTON_CLASS =
  'px-3 sm:px-4 py-2 bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/30 rounded-lg hover:from-purple-500/30 hover:to-blue-500/30 transition-colors duration-200 flex items-center gap-2 cursor-pointer v2:rounded-xl v2:bg-none v2:bg-white/[0.04] v2:border-transparent v2:ring-1 v2:ring-inset v2:ring-white/10 v2:hover:bg-white/[0.08] v2:active:scale-[0.98]';
const ACTION_LABEL_CLASS = 'text-xs sm:text-sm text-purple-400 font-medium v2:text-white/80';
const UNLINK_BUTTON_CLASS =
  'px-3 sm:px-4 py-2 bg-gradient-to-r from-red-500/20 to-rose-500/20 border border-red-500/30 rounded-lg hover:from-red-500/30 hover:to-rose-500/30 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer v2:rounded-xl v2:bg-none v2:bg-red-500/10 v2:border-red-500/20 v2:hover:bg-red-500/20 v2:active:scale-[0.98]';

/** Empêche la propagation du clic avant d'exécuter l'action */
function runWithoutPropagation(action: () => void) {
  return (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    action();
  };
}

/** Ligne d'un fournisseur OAuth (Google, Twitch) : lier ou délier le compte */
function OAuthProviderRow({
  provider,
  label,
  iconSrc,
  iconBgClass,
  account,
  unlinkingProvider,
  onLinkAccount,
  onUnlinkAccount,
}: Readonly<{
  provider: OAuthProvider;
  label: string;
  iconSrc: string;
  iconBgClass: string;
  account: OAuthAccount;
  unlinkingProvider: string | null;
  onLinkAccount: ProfileOAuthProps['onLinkAccount'];
  onUnlinkAccount: ProfileOAuthProps['onUnlinkAccount'];
}>) {
  if (!account.available) return null;

  return (
    <div className={ROW_CLASS}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`relative w-10 h-10 rounded-lg ${iconBgClass} v2:rounded-xl flex items-center justify-center overflow-hidden`}
          >
            <Image src={iconSrc} alt={label} width={24} height={24} className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm sm:text-base font-medium text-white">{label}</p>
            <p className="text-xs text-gray-400">{account.linked ? 'Compte lié' : 'Non lié'}</p>
          </div>
        </div>
        {account.linked ? (
          <button
            onClick={runWithoutPropagation(() => onUnlinkAccount(provider, account.accountId))}
            disabled={unlinkingProvider === provider}
            className={UNLINK_BUTTON_CLASS}
          >
            {unlinkingProvider === provider ? (
              <Loader2 size={16} className="animate-spin text-red-400" />
            ) : (
              <Unlink size={16} className="text-red-400" />
            )}
            <span className="text-xs sm:text-sm text-red-400 font-medium">Désassocier</span>
          </button>
        ) : (
          <button
            onClick={runWithoutPropagation(() => onLinkAccount(provider))}
            className={ACTION_BUTTON_CLASS}
          >
            <Link2 size={16} className="text-purple-400 v2:text-white/70" />
            <span className={ACTION_LABEL_CLASS}>Associer</span>
          </button>
        )}
      </div>
    </div>
  );
}

/** Liste des méthodes de connexion : mot de passe, fournisseurs et avertissements */
function OAuthAccountsList({
  oauthAccounts,
  oauthSecurity,
  unlinkingProvider,
  onLinkAccount,
  onUnlinkAccount,
  onOpenPasswordModal,
}: Readonly<
  Omit<ProfileOAuthProps, 'oauthAccounts' | 'isLoading'> & { oauthAccounts: OAuthAccounts }
>) {
  const { google, twitch } = oauthAccounts;

  return (
    <div className="space-y-3">
      {/* Email/Mot de passe */}
      <div className={ROW_CLASS}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 rounded-lg bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center overflow-hidden v2:bg-none v2:bg-white/[0.06] v2:rounded-xl">
              <Mail size={20} className="text-white" />
            </div>
            <div>
              <p className="text-sm sm:text-base font-medium text-white">Email / Mot de passe</p>
              <p className="text-xs text-gray-400">
                {oauthSecurity?.hasPassword ? 'Mot de passe défini' : 'Aucun mot de passe défini'}
              </p>
            </div>
          </div>
          <button
            onClick={runWithoutPropagation(onOpenPasswordModal)}
            className={ACTION_BUTTON_CLASS}
          >
            <Key size={16} className="text-purple-400 v2:text-white/70" />
            <span className={ACTION_LABEL_CLASS}>
              {oauthSecurity?.hasPassword ? 'Modifier' : 'Définir'}
            </span>
          </button>
        </div>
      </div>

      <OAuthProviderRow
        provider="google"
        label="Google"
        iconSrc="/icons/google.svg"
        iconBgClass="bg-white"
        account={google}
        unlinkingProvider={unlinkingProvider}
        onLinkAccount={onLinkAccount}
        onUnlinkAccount={onUnlinkAccount}
      />
      <OAuthProviderRow
        provider="twitch"
        label="Twitch"
        iconSrc="/icons/twitch.svg"
        iconBgClass="bg-[#9146FF]"
        account={twitch}
        unlinkingProvider={unlinkingProvider}
        onLinkAccount={onLinkAccount}
        onUnlinkAccount={onUnlinkAccount}
      />

      {/* Avertissement si dernier compte OAuth */}
      {oauthSecurity?.oauthCount === 1 && !oauthSecurity.hasPassword && (
        <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-3 sm:p-4 flex items-start gap-3 v2:bg-amber-500/[0.06] v2:border-amber-500/20">
          <AlertTriangle size={18} className="text-amber-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-xs sm:text-sm text-amber-400 font-medium mb-1">Attention</p>
            <p className="text-xs text-amber-300/80">
              Vous n'avez qu'un seul compte OAuth lié. Assurez-vous d'avoir un mot de passe défini
              avant de le désassocier, sinon vous risquez de perdre l'accès à votre compte.
            </p>
          </div>
        </div>
      )}

      {/* Message si aucun provider disponible */}
      {!google.available && !twitch.available && (
        <div className="text-center py-4">
          <p className="text-sm text-gray-400">Aucun provider OAuth configuré sur ce serveur</p>
        </div>
      )}
    </div>
  );
}

/** Contenu de la carte : chargement, erreur ou liste des comptes */
function OAuthBody({
  oauthAccounts,
  oauthSecurity,
  isLoading,
  unlinkingProvider,
  onLinkAccount,
  onUnlinkAccount,
  onOpenPasswordModal,
}: Readonly<ProfileOAuthProps>) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="w-5 h-5 text-purple-400 animate-spin v2:text-white/50" />
      </div>
    );
  }

  if (!oauthAccounts) {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-gray-400">Erreur lors du chargement des comptes</p>
      </div>
    );
  }

  return (
    <OAuthAccountsList
      oauthAccounts={oauthAccounts}
      oauthSecurity={oauthSecurity}
      unlinkingProvider={unlinkingProvider}
      onLinkAccount={onLinkAccount}
      onUnlinkAccount={onUnlinkAccount}
      onOpenPasswordModal={onOpenPasswordModal}
    />
  );
}

export function ProfileOAuth({
  oauthAccounts,
  oauthSecurity,
  isLoading,
  unlinkingProvider,
  onLinkAccount,
  onUnlinkAccount,
  onOpenPasswordModal,
}: Readonly<ProfileOAuthProps>) {
  const isV2 = useUiVersion() !== 'legacy';
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.6 }}
      className="mt-4 sm:mt-6 lg:mt-6"
    >
      <div
        className={`rounded-2xl p-3 sm:p-4 lg:p-3 ${
          isV2 ? 'surface-1' : 'glass-modern glass-modern-hover lift-3d'
        }`}
      >
        <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4 lg:mb-3">
          <div className="p-2 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-lg v2:bg-none v2:bg-white/[0.06] v2:rounded-xl">
            <Shield size={18} className="sm:w-5 sm:h-5 text-purple-400 v2:text-brand" />
          </div>
          <div className="flex-1">
            <h2 className="text-base sm:text-lg lg:text-base font-audiowide text-white">
              Comptes connectés
            </h2>
            <p className="text-xs sm:text-sm lg:text-xs text-gray-400">
              Gérez vos méthodes de connexion
            </p>
          </div>
        </div>

        <OAuthBody
          oauthAccounts={oauthAccounts}
          oauthSecurity={oauthSecurity}
          isLoading={isLoading}
          unlinkingProvider={unlinkingProvider}
          onLinkAccount={onLinkAccount}
          onUnlinkAccount={onUnlinkAccount}
          onOpenPasswordModal={onOpenPasswordModal}
        />
      </div>
    </motion.div>
  );
}
