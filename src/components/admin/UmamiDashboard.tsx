'use client';

import { AlertCircle, CheckCircle2, ExternalLink, BarChart3 } from 'lucide-react';
import { useState, useEffect } from 'react';

import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

export default function UmamiDashboard() {
  const [status, setStatus] = useState<{
    enabled: boolean;
    isLocalhost: boolean;
    url?: string;
  }>({
    enabled: false,
    isLocalhost: false,
  });

  useEffect(() => {
    // Récupérer le statut depuis l'API
    const fetchStatus = async () => {
      try {
        const response = await fetch('/api/admin/integrations/status');
        if (response.ok) {
          const data = await response.json();
          setStatus({
            enabled: data.umami?.enabled || false,
            isLocalhost: data.umami?.isLocalhost || false,
            url: data.umami?.url,
          });
        }
      } catch (error) {
        // Fallback : utiliser les variables d'environnement (si disponibles au build)
        const umamiUrl = process.env.NEXT_PUBLIC_UMAMI_URL;
        const websiteId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;
        const isLocalhost = umamiUrl?.includes('localhost') || false;

        setStatus({
          enabled: !!umamiUrl && !!websiteId && websiteId !== 'your-website-id-here',
          isLocalhost,
          url: umamiUrl,
        });
      }
    };
    fetchStatus();
  }, []);

  return (
    <Card className="glass border-purple-500/20 bg-transparent">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center text-white">
          <BarChart3 className="h-5 w-5 mr-2 text-purple-400" />
          Umami Analytics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Statut */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">Statut</span>
          <div className="flex items-center space-x-2">
            {status.enabled && !status.isLocalhost ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-green-400" />
                <span className="text-sm font-semibold text-green-400">Actif</span>
              </>
            ) : status.enabled && status.isLocalhost ? (
              <>
                <AlertCircle className="h-4 w-4 text-yellow-400" />
                <span className="text-sm font-semibold text-yellow-400">Local uniquement</span>
              </>
            ) : (
              <>
                <AlertCircle className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-semibold text-gray-500">Inactif</span>
              </>
            )}
          </div>
        </div>

        {/* Informations */}
        {status.enabled && (
          <div className="pt-2 border-t border-purple-500/20 space-y-2">
            {status.isLocalhost && (
              <div className="p-2 bg-yellow-500/10 border border-yellow-500/20 rounded text-xs text-yellow-300">
                ⚠️ Configuré pour localhost uniquement. Désactivé en production.
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">Type</span>
              <span className="text-xs text-white">Analytics web (auto-hébergé)</span>
            </div>
            {status.url && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">URL</span>
                <span className="text-xs text-white truncate ml-2">{status.url}</span>
              </div>
            )}
          </div>
        )}

        {/* Lien vers Umami */}
        {status.enabled && status.url && (
          <div className="pt-2 border-t border-purple-500/20">
            <Button
              variant="outline"
              size="sm"
              className="w-full border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
              onClick={() => {
                const umamiUrl = status.url?.replace('/script.js', '') || status.url;
                window.open(umamiUrl, '_blank');
              }}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Ouvrir Umami Dashboard
            </Button>
          </div>
        )}

        {/* Message si désactivé */}
        {!status.enabled && (
          <div className="pt-2 border-t border-purple-500/20">
            <p className="text-xs text-gray-500">
              Umami n'est pas configuré. Utilisé uniquement en local pour le développement.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
