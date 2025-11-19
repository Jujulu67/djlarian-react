'use client';

import { useConfigs } from '@/stores/useConfigs';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/Button';
import ToggleRow from '@/components/config/ToggleRow';
import NumberInput from '@/components/config/NumberInput';
import { RefreshCcw } from 'lucide-react';
import { logger } from '@/lib/logger';

export default function ApiTab() {
  const { api, update } = useConfigs();

  const handleRegenerateApiKeys = () => {
    logger.debug('Regenerating API Keys...');
    alert('Logique de régénération des clés API non implémentée.');
  };

  return (
    <div className="p-6 relative z-10">
      <h2 className="text-2xl font-audiowide text-white mb-6 pb-2 border-b border-purple-500/20">
        API & Intégrations
      </h2>

      <div className="space-y-6">
        <ToggleRow
          label="API activée"
          desc="Activer l'accès API"
          value={api.apiEnabled}
          onChange={(checked: boolean) => update('api', 'apiEnabled', checked)}
        />

        <NumberInput
          id="rateLimit"
          label="Limite de requêtes API (par minute)"
          value={api.rateLimit}
          onChange={(v: number) => update('api', 'rateLimit', v)}
          min={10}
          unit="req/min"
          className="input-style"
          disabled={!api.apiEnabled}
        />

        <div className="space-y-2">
          <Label htmlFor="webhookUrl">URL de Webhook</Label>
          <Input
            id="webhookUrl"
            type="url"
            value={api.webhookUrl}
            onChange={(e) => update('api', 'webhookUrl', e.target.value)}
            placeholder="https://example.com/webhook"
            className="input-style"
            disabled={!api.apiEnabled}
          />
        </div>

        <ToggleRow
          label="Umami Analytics"
          desc="Activer le suivi Umami"
          value={api.umamiEnabled}
          onChange={(checked: boolean) => update('api', 'umamiEnabled', checked)}
        />

        {api.umamiEnabled && (
          <div className="space-y-2">
            <Label htmlFor="umamiSiteId">ID du site Umami</Label>
            <Input
              id="umamiSiteId"
              value={api.umamiSiteId}
              onChange={(e) => update('api', 'umamiSiteId', e.target.value)}
              className="input-style"
            />
          </div>
        )}

        <div className="p-4 bg-purple-900/20 rounded-lg border border-purple-500/20">
          <div className="flex items-start">
            <RefreshCcw className="h-5 w-5 text-purple-400 mr-3 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-purple-300 font-semibold mb-1">Régénérer les clés API</h3>
              <p className="text-xs text-gray-400 mb-3">
                Vous pouvez régénérer vos clés API si nécessaire. Toutes les applications utilisant
                actuellement ces clés devront être mises à jour.
              </p>
              <Button
                variant="outline"
                className="border border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
                onClick={handleRegenerateApiKeys}
              >
                Régénérer les clés API
              </Button>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .input-style {
          background-color: rgba(139, 92, 246, 0.1);
          border: 1px solid rgba(139, 92, 246, 0.2);
        }
        .input-style:focus {
          border-color: rgba(139, 92, 246, 0.5);
        }
        .input-style:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
