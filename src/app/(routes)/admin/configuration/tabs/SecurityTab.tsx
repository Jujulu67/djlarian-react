'use client';

import { Lock } from 'lucide-react';

import NumberInput from '@/components/config/NumberInput';
import ToggleRow from '@/components/config/ToggleRow';
import { useConfigs } from '@/stores/useConfigs';

export default function SecurityTab() {
  const { security, update } = useConfigs();

  return (
    <div className="p-6 relative z-10">
      <h2 className="text-2xl font-audiowide text-white mb-6 pb-2 border-b border-purple-500/20">
        Sécurité
      </h2>

      <div className="space-y-6">
        <ToggleRow
          label="Authentification à deux facteurs"
          desc="Exiger la 2FA pour les comptes administrateurs"
          value={security.twoFactorAuth}
          onChange={(checked: boolean) => update('security', 'twoFactorAuth', checked)}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <NumberInput
            id="passwordExpiration"
            label="Expiration du mot de passe (jours)"
            value={security.passwordExpiration}
            onChange={(v: number) => update('security', 'passwordExpiration', v)}
            min={0}
            unit="jours"
            desc="0 = pas d'expiration"
            className="input-style"
          />

          <NumberInput
            id="failedLoginLimit"
            label="Limite de tentatives de connexion"
            value={security.failedLoginLimit}
            onChange={(v: number) => update('security', 'failedLoginLimit', v)}
            min={1}
            unit="tentatives"
            className="input-style"
          />
        </div>

        <NumberInput
          id="sessionTimeout"
          label="Timeout de session (minutes)"
          value={security.sessionTimeout}
          onChange={(v: number) => update('security', 'sessionTimeout', v)}
          min={5}
          unit="minutes"
          className="input-style"
        />

        <ToggleRow
          label="Restriction IP"
          desc="Limiter l'accès admin à certaines adresses IP"
          value={security.ipRestriction}
          onChange={(checked: boolean) => update('security', 'ipRestriction', checked)}
        />

        <div className="p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
          <div className="flex items-start">
            <Lock className="h-5 w-5 text-yellow-400 mr-3 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-gray-300">
              Les paramètres de sécurité avancés tels que les politiques de mot de passe et les
              journaux d&apos;audit peuvent être configurés via le panneau de sécurité dédié.
            </p>
          </div>
        </div>
      </div>
      {/* Styles partagés potentiels */}
      <style jsx>{`
        .input-style {
          /* Styles copiés depuis HomepageTab pour cohérence */
          background-color: rgba(139, 92, 246, 0.1);
          border: 1px solid rgba(139, 92, 246, 0.2);
        }
        .input-style:focus {
          border-color: rgba(139, 92, 246, 0.5);
        }
        .input-style input[type='number']::-webkit-inner-spin-button,
        .input-style input[type='number']::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        .input-style input[type='number'] {
          -moz-appearance: textfield; /* Firefox */
        }
      `}</style>
    </div>
  );
}
