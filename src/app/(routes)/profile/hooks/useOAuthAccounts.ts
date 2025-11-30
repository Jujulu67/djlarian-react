import { useState, useCallback } from 'react';
import { fetchWithAuth } from '@/lib/api/fetchWithAuth';

export interface OAuthAccounts {
  google: { linked: boolean; available: boolean; accountId: string | null };
  twitch: { linked: boolean; available: boolean; accountId: string | null };
}

export interface OAuthSecurity {
  hasPassword: boolean;
  oauthCount: number;
  canUnlink: boolean;
  isSecure: boolean;
}

export function useOAuthAccounts() {
  const [oauthAccounts, setOauthAccounts] = useState<OAuthAccounts | null>(null);
  const [oauthSecurity, setOauthSecurity] = useState<OAuthSecurity | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadOAuthAccounts = useCallback(async (userId?: string) => {
    if (!userId) return;
    try {
      setIsLoading(true);
      const response = await fetchWithAuth('/api/profile/accounts');
      if (response.ok) {
        const data = await response.json();
        setOauthAccounts(data.accounts);
        setOauthSecurity(data.security);
      } else {
        console.error('Erreur lors du chargement des comptes OAuth');
      }
    } catch (error) {
      console.error('Erreur lors du chargement des comptes OAuth:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    oauthAccounts,
    oauthSecurity,
    isLoading,
    loadOAuthAccounts,
  };
}
