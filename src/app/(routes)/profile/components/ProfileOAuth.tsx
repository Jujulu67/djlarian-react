'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { Shield, Mail, Key, Link2, Unlink, AlertTriangle, Loader2 } from 'lucide-react';

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

export function ProfileOAuth({
  oauthAccounts,
  oauthSecurity,
  isLoading,
  unlinkingProvider,
  onLinkAccount,
  onUnlinkAccount,
  onOpenPasswordModal,
}: ProfileOAuthProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.6 }}
      className="mt-4 sm:mt-6 lg:mt-6"
    >
      <div className="glass-modern glass-modern-hover rounded-2xl p-3 sm:p-4 lg:p-3 lift-3d">
        <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4 lg:mb-3">
          <div className="p-2 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-lg">
            <Shield size={18} className="sm:w-5 sm:h-5 text-purple-400" />
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

        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
          </div>
        ) : oauthAccounts ? (
          <div className="space-y-3">
            {/* Email/Mot de passe */}
            <div className="rounded-xl bg-gradient-to-r from-purple-500/5 to-blue-500/5 border border-purple-500/10 p-3 sm:p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="relative w-10 h-10 rounded-lg bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center overflow-hidden">
                    <Mail size={20} className="text-white" />
                  </div>
                  <div>
                    <p className="text-sm sm:text-base font-medium text-white">
                      Email / Mot de passe
                    </p>
                    <p className="text-xs text-gray-400">
                      {oauthSecurity?.hasPassword
                        ? 'Mot de passe défini'
                        : 'Aucun mot de passe défini'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onOpenPasswordModal();
                  }}
                  className="px-3 sm:px-4 py-2 bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/30 rounded-lg hover:from-purple-500/30 hover:to-blue-500/30 transition-colors duration-200 flex items-center gap-2 cursor-pointer"
                >
                  <Key size={16} className="text-purple-400" />
                  <span className="text-xs sm:text-sm text-purple-400 font-medium">
                    {oauthSecurity?.hasPassword ? 'Modifier' : 'Définir'}
                  </span>
                </button>
              </div>
            </div>

            {/* Google */}
            {oauthAccounts.google.available && (
              <div className="rounded-xl bg-gradient-to-r from-purple-500/5 to-blue-500/5 border border-purple-500/10 p-3 sm:p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="relative w-10 h-10 rounded-lg bg-white flex items-center justify-center overflow-hidden">
                      <Image
                        src="/icons/google.svg"
                        alt="Google"
                        width={24}
                        height={24}
                        className="w-6 h-6"
                      />
                    </div>
                    <div>
                      <p className="text-sm sm:text-base font-medium text-white">Google</p>
                      <p className="text-xs text-gray-400">
                        {oauthAccounts.google.linked ? 'Compte lié' : 'Non lié'}
                      </p>
                    </div>
                  </div>
                  {oauthAccounts.google.linked ? (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onUnlinkAccount('google', oauthAccounts.google.accountId);
                      }}
                      disabled={unlinkingProvider === 'google'}
                      className="px-3 sm:px-4 py-2 bg-gradient-to-r from-red-500/20 to-rose-500/20 border border-red-500/30 rounded-lg hover:from-red-500/30 hover:to-rose-500/30 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
                    >
                      {unlinkingProvider === 'google' ? (
                        <Loader2 size={16} className="animate-spin text-red-400" />
                      ) : (
                        <Unlink size={16} className="text-red-400" />
                      )}
                      <span className="text-xs sm:text-sm text-red-400 font-medium">
                        Désassocier
                      </span>
                    </button>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onLinkAccount('google');
                      }}
                      className="px-3 sm:px-4 py-2 bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/30 rounded-lg hover:from-purple-500/30 hover:to-blue-500/30 transition-colors duration-200 flex items-center gap-2 cursor-pointer"
                    >
                      <Link2 size={16} className="text-purple-400" />
                      <span className="text-xs sm:text-sm text-purple-400 font-medium">
                        Associer
                      </span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Twitch */}
            {oauthAccounts.twitch.available && (
              <div className="rounded-xl bg-gradient-to-r from-purple-500/5 to-blue-500/5 border border-purple-500/10 p-3 sm:p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="relative w-10 h-10 rounded-lg bg-[#9146FF] flex items-center justify-center overflow-hidden">
                      <Image
                        src="/icons/twitch.svg"
                        alt="Twitch"
                        width={24}
                        height={24}
                        className="w-6 h-6"
                      />
                    </div>
                    <div>
                      <p className="text-sm sm:text-base font-medium text-white">Twitch</p>
                      <p className="text-xs text-gray-400">
                        {oauthAccounts.twitch.linked ? 'Compte lié' : 'Non lié'}
                      </p>
                    </div>
                  </div>
                  {oauthAccounts.twitch.linked ? (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onUnlinkAccount('twitch', oauthAccounts.twitch.accountId);
                      }}
                      disabled={unlinkingProvider === 'twitch'}
                      className="px-3 sm:px-4 py-2 bg-gradient-to-r from-red-500/20 to-rose-500/20 border border-red-500/30 rounded-lg hover:from-red-500/30 hover:to-rose-500/30 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
                    >
                      {unlinkingProvider === 'twitch' ? (
                        <Loader2 size={16} className="animate-spin text-red-400" />
                      ) : (
                        <Unlink size={16} className="text-red-400" />
                      )}
                      <span className="text-xs sm:text-sm text-red-400 font-medium">
                        Désassocier
                      </span>
                    </button>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onLinkAccount('twitch');
                      }}
                      className="px-3 sm:px-4 py-2 bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/30 rounded-lg hover:from-purple-500/30 hover:to-blue-500/30 transition-colors duration-200 flex items-center gap-2 cursor-pointer"
                    >
                      <Link2 size={16} className="text-purple-400" />
                      <span className="text-xs sm:text-sm text-purple-400 font-medium">
                        Associer
                      </span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Avertissement si dernier compte OAuth */}
            {oauthSecurity && oauthSecurity.oauthCount === 1 && !oauthSecurity.hasPassword && (
              <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-3 sm:p-4 flex items-start gap-3">
                <AlertTriangle size={18} className="text-amber-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs sm:text-sm text-amber-400 font-medium mb-1">Attention</p>
                  <p className="text-xs text-amber-300/80">
                    Vous n'avez qu'un seul compte OAuth lié. Assurez-vous d'avoir un mot de passe
                    défini avant de le désassocier, sinon vous risquez de perdre l'accès à votre
                    compte.
                  </p>
                </div>
              </div>
            )}

            {/* Message si aucun provider disponible */}
            {!oauthAccounts.google.available && !oauthAccounts.twitch.available && (
              <div className="text-center py-4">
                <p className="text-sm text-gray-400">
                  Aucun provider OAuth configuré sur ce serveur
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-gray-400">Erreur lors du chargement des comptes</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
