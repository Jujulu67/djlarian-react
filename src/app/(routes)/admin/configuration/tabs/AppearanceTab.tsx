'use client';

import ColorInput from '@/components/config/ColorInput';
import ToggleRow from '@/components/config/ToggleRow';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { useConfigs } from '@/stores/useConfigs';

export default function AppearanceTab() {
  const { appearance, update } = useConfigs();

  return (
    <div className="p-6 relative z-10">
      <h2 className="text-2xl font-audiowide text-white mb-6 pb-2 border-b border-purple-500/20">
        Apparence
      </h2>

      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ColorInput
            id="primaryColor"
            label="Couleur primaire"
            value={appearance.primaryColor}
            onChange={(v: string) => update('appearance', 'primaryColor', v)}
            className="input-style"
          />
          <ColorInput
            id="secondaryColor"
            label="Couleur secondaire"
            value={appearance.secondaryColor}
            onChange={(v: string) => update('appearance', 'secondaryColor', v)}
            className="input-style"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="logoUrl">URL du logo</Label>
            <Input
              id="logoUrl"
              value={appearance.logoUrl}
              onChange={(e) => update('appearance', 'logoUrl', e.target.value)}
              className="input-style"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="faviconUrl">URL du favicon</Label>
            <Input
              id="faviconUrl"
              value={appearance.faviconUrl}
              onChange={(e) => update('appearance', 'faviconUrl', e.target.value)}
              className="input-style"
            />
          </div>
        </div>

        <ToggleRow
          label="Mode sombre"
          desc="Activer le thème sombre par défaut"
          value={appearance.darkMode}
          onChange={(checked) => update('appearance', 'darkMode', checked)}
        />

        <ToggleRow
          label="Animations"
          desc="Activer les animations de l'interface"
          value={appearance.animationsEnabled}
          onChange={(checked) => update('appearance', 'animationsEnabled', checked)}
        />
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
      `}</style>
    </div>
  );
}
