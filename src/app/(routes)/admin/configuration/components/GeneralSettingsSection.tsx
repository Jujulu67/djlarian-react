'use client';

import DatabaseSwitch from '@/components/admin/DatabaseSwitch';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { AllConfigs, GeneralConfig } from '@/types/config';

interface GeneralSettingsSectionProps {
  general: GeneralConfig;
  update: <S extends keyof AllConfigs, K extends keyof AllConfigs[S]>(
    section: S,
    key: K,
    value: AllConfigs[S][K]
  ) => void;
}

export function GeneralSettingsSection({ general, update }: GeneralSettingsSectionProps) {
  return (
    <div className="p-6 relative z-10">
      <h2 className="text-2xl font-audiowide text-white mb-6 pb-2 border-b border-purple-500/20">
        Configuration Générale
      </h2>

      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="siteName">Nom du site</Label>
            <Input
              id="siteName"
              value={general.siteName} // Utilise le store
              onChange={(e) => update('general', 'siteName', e.target.value)} // Utilise update du store
              className="bg-purple-500/10 border-purple-500/20 focus:border-purple-500/50"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contactEmail">Email de contact</Label>
            <Input
              id="contactEmail"
              type="email"
              value={general.contactEmail} // Utilise le store
              onChange={(e) => update('general', 'contactEmail', e.target.value)} // Utilise update du store
              className="bg-purple-500/10 border-purple-500/20 focus:border-purple-500/50"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="siteDescription">Description du site</Label>
          <Textarea
            id="siteDescription"
            value={general.siteDescription} // Utilise le store
            onChange={(e) => update('general', 'siteDescription', e.target.value)} // Utilise update du store
            className="bg-purple-500/10 border-purple-500/20 focus:border-purple-500/50"
            rows={3}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="timeZone">Fuseau horaire</Label>
            <select
              id="timeZone"
              value={general.timeZone} // Utilise le store
              onChange={(e) => update('general', 'timeZone', e.target.value)} // Utilise update du store
              className="w-full bg-purple-500/10 border border-purple-500/20 focus:border-purple-500/50 rounded-md p-2 text-white"
            >
              <option value="Europe/Paris">Europe/Paris</option>
              <option value="America/New_York">America/New_York</option>
              <option value="Asia/Tokyo">Asia/Tokyo</option>
              <option value="Australia/Sydney">Australia/Sydney</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dateFormat">Format de date</Label>
            <select
              id="dateFormat"
              value={general.dateFormat} // Utilise le store
              onChange={(e) => update('general', 'dateFormat', e.target.value)} // Utilise update du store
              className="w-full bg-purple-500/10 border border-purple-500/20 focus:border-purple-500/50 rounded-md p-2 text-white"
            >
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            </select>
          </div>
        </div>

        {/* Switch de base de données */}
        <div className="mt-8 pt-6 border-t border-purple-500/20">
          <DatabaseSwitch />
        </div>
      </div>
    </div>
  );
}
