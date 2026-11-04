'use client';

import { BarChart3, Globe } from 'lucide-react';

import NumberInput from '@/components/config/NumberInput';
import SentryDashboard from '@/components/admin/SentryDashboard';
import VercelAnalyticsDashboard from '@/components/admin/VercelAnalyticsDashboard';
import VercelSpeedInsightsDashboard from '@/components/admin/VercelSpeedInsightsDashboard';
import ToggleRow from '@/components/config/ToggleRow';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { useConfigs } from '@/stores/useConfigs';

export default function ApiTab() {
  const { api, update } = useConfigs();

  return (
    <div className="p-6 relative z-10">
      <h2 className="text-2xl font-audiowide text-white mb-6 pb-2 border-b border-purple-500/20">
        API & Intégrations
      </h2>

      <div className="space-y-8">
        {/* Section Analytics & Monitoring */}
        <div>
          <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
            <BarChart3 className="h-5 w-5 mr-2 text-purple-400" />
            Analytics & Monitoring
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <VercelAnalyticsDashboard />
            <VercelSpeedInsightsDashboard />
            <SentryDashboard />
          </div>
        </div>

        {/* Section API Configuration */}
        <div className="pt-6 border-t border-purple-500/20">
          <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
            <Globe className="h-5 w-5 mr-2 text-purple-400" />
            Configuration API
          </h3>
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
