# 🔄 Switch Production/Local - Idée Future

## 💡 Concept

Ajouter un switch dans les paramètres de l'application pour basculer entre :

- **Base locale (SQLite)** : Pour le développement et les tests
- **Base production (Neon)** : Pour accéder aux vraies données depuis localhost

## 🎯 Cas d'usage

1. **Développement normal** : Utiliser SQLite local (rapide, isolé)
2. **Debug production** : Basculer vers Neon pour reproduire un bug avec les vraies données
3. **Tests avec données réelles** : Tester des fonctionnalités avec les données de production

## 🛠️ Implémentation Suggérée

### Option 1 : Variable d'environnement dynamique

Créer un fichier `.env.local.switch` qui peut être modifié par l'interface :

```typescript
// src/lib/db-switch.ts
export function getDatabaseUrl(): string {
  // Lire depuis un fichier de config ou localStorage
  const useProduction = localStorage.getItem('useProductionDb') === 'true';

  if (useProduction) {
    return process.env.DATABASE_URL_PRODUCTION || '';
  }
  return process.env.DATABASE_URL || 'file:./prisma/dev.db';
}
```

### Option 2 : Toggle dans les paramètres admin

Créer une page de paramètres avec un switch :

```tsx
// src/app/(routes)/admin/settings/page.tsx
'use client';

import { useState } from 'react';
import { Switch } from '@/components/ui/switch';

export default function SettingsPage() {
  const [useProduction, setUseProduction] = useState(false);

  const handleToggle = async (checked: boolean) => {
    // Sauvegarder dans localStorage ou un fichier de config
    localStorage.setItem('useProductionDb', checked.toString());

    // Redémarrer le serveur ou recharger la page
    if (checked) {
      // Avertir l'utilisateur
      alert('⚠️ Vous allez utiliser la base de production. Soyez prudent !');
    }

    setUseProduction(checked);
    window.location.reload();
  };

  return (
    <div>
      <h1>Paramètres de Base de Données</h1>
      <div>
        <label>Utiliser la base de production (Neon)</label>
        <Switch checked={useProduction} onCheckedChange={handleToggle} />
        <p className="text-sm text-muted-foreground">
          {useProduction
            ? '⚠️ Connecté à la base de production'
            : '✅ Connecté à la base locale (SQLite)'}
        </p>
      </div>
    </div>
  );
}
```

### Option 3 : Script de basculement rapide

Créer un script pnpm pour basculer rapidement :

```json
// package.json
{
  "scripts": {
    "db:switch:local": "pnpm run db:local",
    "db:switch:prod": "pnpm run db:production && echo '⚠️ Vous utilisez maintenant la base de production'"
  }
}
```

## ⚠️ Sécurité

**IMPORTANT** : Si vous implémentez le switch dans l'interface :

1. **Avertissement clair** : Toujours avertir l'utilisateur qu'il utilise la production
2. **Protection** : Ne pas permettre le switch en production (seulement en dev)
3. **Logs** : Logger tous les changements de base de données
4. **Read-only option** : Option pour mettre la base en lecture seule

## 📝 Variables d'environnement

Ajouter dans `.env.local` :

```env
# Base locale (développement)
DATABASE_URL="file:./prisma/dev.db"

# Base production (Neon) - pour le switch
DATABASE_URL_PRODUCTION="postgresql://neondb_owner:xxxxx@ep-xxxxx.neon.tech/neondb?sslmode=require"
```

## 🎨 UI Suggestion

```
┌─────────────────────────────────────┐
│  Paramètres de Base de Données      │
├─────────────────────────────────────┤
│                                     │
│  Base de données actuelle:         │
│  ✅ SQLite (locale)                 │
│                                     │
│  [Switch] Utiliser Neon (prod)      │
│                                     │
│  ⚠️ Attention : Les modifications   │
│     affecteront la production       │
│                                     │
└─────────────────────────────────────┘
```

## 🚀 Priorité

- **Faible** : Fonctionnalité "nice to have"
- **Utile pour** : Debug de bugs spécifiques à la production
- **Risque** : Modifications accidentelles sur la production

---

**Note** : Cette fonctionnalité peut être ajoutée plus tard, une fois que le système de base locale est bien établi.
