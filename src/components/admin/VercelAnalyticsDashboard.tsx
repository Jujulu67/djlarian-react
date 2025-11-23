'use client';

import { BarChart3, CheckCircle2, ExternalLink, RefreshCcw, TrendingUp } from 'lucide-react';
import { useState, useEffect } from 'react';

import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

interface VercelAnalyticsStatus {
  enabled: boolean;
  dashboardUrl?: string;
  loading: boolean;
}

export default function VercelAnalyticsDashboard() {
  const [status, setStatus] = useState<VercelAnalyticsStatus>({
    enabled: true,
    loading: true,
  });

  const fetchStatus = async () => {
    setStatus((prev) => ({ ...prev, loading: true }));
    try {
      // Récupérer l'URL du dashboard depuis l'API
      const response = await fetch('/api/admin/integrations/status');
      if (response.ok) {
        const data = await response.json();
        setStatus({
          enabled: data.vercel?.analytics?.enabled || true,
          dashboardUrl: data.vercel?.analytics?.dashboardUrl,
          loading: false,
        });
      } else {
        setStatus({
          enabled: true,
          loading: false,
        });
      }
    } catch (error) {
      setStatus({
        enabled: true,
        loading: false,
      });
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const enabled = true; // Toujours actif si intégré

  return (
    <Card className="glass border-purple-500/20 bg-transparent">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center text-white">
            <BarChart3 className="h-5 w-5 mr-2 text-purple-400" />
            Vercel Web Analytics
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchStatus}
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
            <CheckCircle2 className="h-4 w-4 text-green-400" />
            <span className="text-sm font-semibold text-green-400">Actif</span>
          </div>
        </div>

        {/* Informations */}
        <div className="pt-2 border-t border-purple-500/20 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">Limite gratuite</span>
            <div className="flex items-center space-x-1">
              <TrendingUp className="h-3 w-3 text-purple-400" />
              <span className="text-xs text-white font-semibold">5,000 événements/mois</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">Type</span>
            <span className="text-xs text-white">Analytics web (trafic)</span>
          </div>
        </div>

        {/* Lien vers Vercel */}
        <div className="pt-2 border-t border-purple-500/20">
          <Button
            variant="outline"
            size="sm"
            className="w-full border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
            onClick={() => {
              const url = status.dashboardUrl || 'https://vercel.com/dashboard';
              window.open(url, '_blank');
            }}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Ouvrir Vercel Analytics
          </Button>
        </div>

        {/* Note */}
        <div className="pt-2 border-t border-purple-500/20">
          <p className="text-xs text-gray-500">
            Collecte automatiquement les stats de trafic (visiteurs, pages vues, sources). Les stats
            détaillées sont disponibles uniquement via le dashboard Vercel. Utilisez le bouton
            ci-dessus pour y accéder.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
