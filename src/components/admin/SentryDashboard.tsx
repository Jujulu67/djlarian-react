'use client';

import { AlertCircle, CheckCircle2, ExternalLink, RefreshCcw, TrendingUp } from 'lucide-react';
import { useState, useEffect } from 'react';

import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { logger } from '@/lib/logger';

interface SentryStatus {
  enabled: boolean;
  errorCount?: number;
  lastError?: string;
  sentryUrl?: string;
  loading: boolean;
}

export default function SentryDashboard() {
  const [status, setStatus] = useState<SentryStatus>({
    enabled: false,
    loading: true,
  });

  const fetchSentryStatus = async () => {
    setStatus((prev) => ({ ...prev, loading: true }));
    try {
      const response = await fetch('/api/admin/sentry/status');
      if (response.ok) {
        const data = await response.json();
        setStatus({
          enabled: data.enabled,
          errorCount: data.errorCount,
          lastError: data.lastError,
          sentryUrl: data.sentryUrl,
          loading: false,
        });
      } else {
        setStatus({
          enabled: false,
          loading: false,
        });
      }
    } catch (error) {
      logger.error('Erreur lors de la récupération du statut Sentry:', error);
      setStatus({
        enabled: false,
        loading: false,
      });
    }
  };

  useEffect(() => {
    fetchSentryStatus();
  }, []);

  // L'URL Sentry est retournée par l'API et stockée dans le state

  return (
    <Card className="glass border-purple-500/20 bg-transparent">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center text-white">
            <AlertCircle className="h-5 w-5 mr-2 text-purple-400" />
            Sentry Error Tracking
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchSentryStatus}
            disabled={status.loading}
            className="h-8 w-8 p-0"
          >
            <RefreshCcw className={`h-4 w-4 ${status.loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Statut */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">Statut</span>
          <div className="flex items-center space-x-2">
            {status.enabled ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-green-400" />
                <span className="text-sm font-semibold text-green-400">Actif</span>
              </>
            ) : (
              <>
                <AlertCircle className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-semibold text-gray-500">Inactif</span>
              </>
            )}
          </div>
        </div>

        {/* Nombre d'erreurs */}
        {status.enabled && status.errorCount !== undefined && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Erreurs (24h)</span>
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-purple-400" />
              <span className="text-sm font-semibold text-white">{status.errorCount}</span>
            </div>
          </div>
        )}

        {/* Dernière erreur */}
        {status.enabled && status.lastError && (
          <div className="pt-2 border-t border-purple-500/20">
            <p className="text-xs text-gray-400 mb-1">Dernière erreur</p>
            <p className="text-xs text-gray-300 truncate">{status.lastError}</p>
          </div>
        )}

        {/* Message si désactivé */}
        {!status.enabled && !status.loading && (
          <div className="pt-2 border-t border-purple-500/20">
            <p className="text-xs text-gray-500">
              Configurez <code className="text-purple-400">NEXT_PUBLIC_SENTRY_DSN</code> dans Vercel
              pour activer Sentry.
            </p>
          </div>
        )}

        {/* Lien vers Sentry */}
        {status.enabled && (
          <div className="pt-2 border-t border-purple-500/20">
            <Button
              variant="outline"
              size="sm"
              className="w-full border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
              onClick={() => {
                const url = status.sentryUrl || 'https://sentry.io';
                window.open(url, '_blank');
              }}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Ouvrir le dashboard Sentry
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
