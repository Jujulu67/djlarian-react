'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useSession, signIn } from 'next-auth/react';
import Image from 'next/image';

import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { toast } from 'sonner';

interface AccountMergeData {
  existingAccount: {
    email: string;
    name: string | null;
    image: string | null;
    hasPassword: boolean;
    createdAt: string;
  };
  oauthAccount: {
    email: string;
    name: string | null;
    image: string | null;
    provider: string;
  };
}

export default function MergeAccountsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, update: updateSession } = useSession();
  const [loading, setLoading] = useState(true);
  const [merging, setMerging] = useState(false);
  const [mergeData, setMergeData] = useState<AccountMergeData | null>(null);
  const [mergeOptions, setMergeOptions] = useState({
    useOAuthName: false,
    useOAuthImage: true,
    keepPassword: true,
  });

  useEffect(() => {
    const fetchMergeData = async () => {
      try {
        const token = searchParams.get('token');
        if (!token) {
          toast.error('Token de fusion manquant');
          router.push('/');
          return;
        }

        const response = await fetch(`/api/auth/merge-accounts/preview?token=${token}`);
        if (!response.ok) {
          const error = await response.json();
          toast.error(error.error || 'Erreur lors de la récupération des données');
          router.push('/');
          return;
        }

        const data = await response.json();
        console.log('[MergeAccounts] Données reçues:', data);
        setMergeData(data);

        // Options par défaut intelligentes
        setMergeOptions({
          useOAuthName: !data.existingAccount.name && !!data.oauthAccount.name,
          useOAuthImage:
            !data.existingAccount.image || data.oauthAccount.image !== data.existingAccount.image,
          keepPassword: data.existingAccount.hasPassword,
        });
      } catch (error) {
        console.error('Erreur:', error);
        toast.error('Erreur lors du chargement des données');
        router.push('/');
      } finally {
        setLoading(false);
      }
    };

    fetchMergeData();
  }, [searchParams, router]);

  const handleMerge = async () => {
    if (!mergeData) return;

    setMerging(true);
    try {
      const token = searchParams.get('token');
      const response = await fetch('/api/auth/merge-accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          options: mergeOptions,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.error || 'Erreur lors de la fusion');
        return;
      }

      const data = await response.json();
      toast.success('Comptes fusionnés avec succès !');

      // Connecter automatiquement l'utilisateur via OAuth après la fusion
      if (data.provider) {
        // Rediriger vers la connexion OAuth pour créer la session
        // Comme le compte est déjà lié, NextAuth connectera automatiquement l'utilisateur
        await signIn(data.provider, {
          redirect: true,
          callbackUrl: '/',
        });
      } else {
        // Fallback : rediriger vers la page d'accueil
        router.push('/');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la fusion');
    } finally {
      setMerging(false);
    }
  };

  const handleCancel = () => {
    router.push('/');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-gray-900 to-black">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-purple-600 border-t-transparent mx-auto" />
          <p className="text-gray-300">Chargement des données...</p>
        </div>
      </div>
    );
  }

  if (!mergeData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-gray-900 to-black">
        <div className="text-center">
          <p className="text-red-400">Erreur : Données de fusion introuvables</p>
          <Button onClick={() => router.push('/')} className="mt-4">
            Retour à l'accueil
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black p-4 py-12">
      <div className="mx-auto max-w-4xl">
        <div className="rounded-xl bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600/20 to-purple-800/20 border-b border-gray-700/50 p-6">
            <h1 className="text-2xl font-bold text-white mb-2">Fusion de comptes</h1>
            <p className="text-gray-300">
              Un compte existe déjà avec l'adresse email{' '}
              <span className="font-semibold text-purple-400">
                {mergeData.existingAccount.email}
              </span>
              .
              <br />
              Voulez-vous fusionner les deux comptes ?
            </p>
          </div>

          <div className="p-6 space-y-6">
            {/* Comparaison des comptes */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Compte existant */}
              <div className="rounded-lg bg-gray-800/60 border border-gray-700/50 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-full bg-purple-600/20 flex items-center justify-center">
                    <span className="text-purple-400 font-bold">1</span>
                  </div>
                  <h3 className="text-lg font-semibold text-white">Compte existant</h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Nom</p>
                    <p className="text-white font-medium">
                      {mergeData.existingAccount.name || (
                        <span className="text-gray-500 italic">Non défini</span>
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Email</p>
                    <p className="text-white font-medium">{mergeData.existingAccount.email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Photo</p>
                    {mergeData.existingAccount.image ? (
                      <div className="relative h-20 w-20 rounded-full overflow-hidden border-2 border-gray-700">
                        <Image
                          src={mergeData.existingAccount.image}
                          alt="Photo existante"
                          fill
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="h-20 w-20 rounded-full bg-gray-700 flex items-center justify-center">
                        <span className="text-gray-500 text-2xl">👤</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Connexion</p>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-900/30 text-blue-300 border border-blue-700/50">
                      {mergeData.existingAccount.hasPassword
                        ? 'Email/Mot de passe'
                        : 'OAuth uniquement'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Compte OAuth */}
              <div className="rounded-lg bg-gray-800/60 border border-gray-700/50 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-full bg-green-600/20 flex items-center justify-center">
                    <span className="text-green-400 font-bold">2</span>
                  </div>
                  <h3 className="text-lg font-semibold text-white">
                    Compte{' '}
                    {mergeData.oauthAccount.provider === 'google'
                      ? 'Google'
                      : mergeData.oauthAccount.provider === 'twitch'
                        ? 'Twitch'
                        : mergeData.oauthAccount.provider}
                  </h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Nom</p>
                    <p className="text-white font-medium">
                      {mergeData.oauthAccount.name || (
                        <span className="text-gray-500 italic">Non défini</span>
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Email</p>
                    <p className="text-white font-medium">{mergeData.oauthAccount.email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Photo</p>
                    {mergeData.oauthAccount.image ? (
                      <div className="relative h-20 w-20 rounded-full overflow-hidden border-2 border-gray-700">
                        <Image
                          src={mergeData.oauthAccount.image}
                          alt="Photo OAuth"
                          fill
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="h-20 w-20 rounded-full bg-gray-700 flex items-center justify-center">
                        <span className="text-gray-500 text-2xl">👤</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Connexion</p>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-900/30 text-purple-300 border border-purple-700/50 capitalize">
                      {mergeData.oauthAccount.provider}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Options de fusion */}
            <div className="rounded-lg bg-gray-800/60 border border-gray-700/50 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Options de fusion</h3>
              <div className="space-y-4">
                <label className="flex items-start gap-3 p-3 rounded-lg bg-gray-900/50 border border-gray-700/30 hover:bg-gray-900/70 transition-colors cursor-pointer">
                  <input
                    type="checkbox"
                    checked={mergeOptions.useOAuthName}
                    onChange={(e) =>
                      setMergeOptions({ ...mergeOptions, useOAuthName: e.target.checked })
                    }
                    className="mt-1 h-4 w-4 rounded border-gray-600 bg-gray-700 text-purple-600 focus:ring-purple-500 focus:ring-offset-gray-900"
                  />
                  <div className="flex-1">
                    <span className="text-white font-medium block">
                      Utiliser le nom du compte{' '}
                      {mergeData.oauthAccount.provider === 'google'
                        ? 'Google'
                        : mergeData.oauthAccount.provider === 'twitch'
                          ? 'Twitch'
                          : mergeData.oauthAccount.provider}
                    </span>
                    {mergeData.existingAccount.name && mergeData.oauthAccount.name && (
                      <span className="text-gray-400 text-sm mt-1 block">
                        {mergeData.existingAccount.name} → {mergeData.oauthAccount.name}
                      </span>
                    )}
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 rounded-lg bg-gray-900/50 border border-gray-700/30 hover:bg-gray-900/70 transition-colors cursor-pointer">
                  <input
                    type="checkbox"
                    checked={mergeOptions.useOAuthImage}
                    onChange={(e) =>
                      setMergeOptions({ ...mergeOptions, useOAuthImage: e.target.checked })
                    }
                    className="mt-1 h-4 w-4 rounded border-gray-600 bg-gray-700 text-purple-600 focus:ring-purple-500 focus:ring-offset-gray-900"
                  />
                  <div className="flex-1">
                    <span className="text-white font-medium block">
                      Utiliser la photo du compte{' '}
                      {mergeData.oauthAccount.provider === 'google'
                        ? 'Google'
                        : mergeData.oauthAccount.provider === 'twitch'
                          ? 'Twitch'
                          : mergeData.oauthAccount.provider}
                    </span>
                    <span className="text-gray-400 text-sm mt-1 block">
                      Mettre à jour votre photo de profil
                    </span>
                  </div>
                </label>

                {mergeData.existingAccount.hasPassword && (
                  <label className="flex items-start gap-3 p-3 rounded-lg bg-gray-900/50 border border-gray-700/30 hover:bg-gray-900/70 transition-colors cursor-pointer">
                    <input
                      type="checkbox"
                      checked={mergeOptions.keepPassword}
                      onChange={(e) =>
                        setMergeOptions({ ...mergeOptions, keepPassword: e.target.checked })
                      }
                      className="mt-1 h-4 w-4 rounded border-gray-600 bg-gray-700 text-purple-600 focus:ring-purple-500 focus:ring-offset-gray-900"
                    />
                    <div className="flex-1">
                      <span className="text-white font-medium block">
                        Conserver le mot de passe du compte existant
                      </span>
                      <span className="text-gray-400 text-sm mt-1 block">
                        Vous pourrez toujours vous connecter avec email/mot de passe
                      </span>
                    </div>
                  </label>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-4 pt-4 border-t border-gray-700/50">
              <Button variant="outline" onClick={handleCancel} disabled={merging}>
                Annuler
              </Button>
              <Button onClick={handleMerge} disabled={merging}>
                {merging ? (
                  <>
                    <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Fusion en cours...
                  </>
                ) : (
                  'Fusionner les comptes'
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
