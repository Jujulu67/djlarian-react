# 🔧 Configuration Umami pour la Production

## ⚠️ Problème identifié

Si vous voyez des erreurs au build Vercel concernant Umami qui pointe vers `localhost`, c'est parce que la variable `NEXT_PUBLIC_UMAMI_URL` est configurée avec une URL localhost dans Vercel.

## ✅ Solutions

### Option 1 : Désactiver Umami en production (Recommandé si pas d'instance Umami hébergée)

**Dans Vercel :**

1. Vercel Dashboard → Votre projet → **Settings** → **Environment Variables**
2. **Supprimer** ou **ne pas configurer** `NEXT_PUBLIC_UMAMI_URL` pour Production
3. Garder seulement `NEXT_PUBLIC_UMAMI_WEBSITE_ID` si vous voulez garder la config

**Résultat :** Umami sera automatiquement désactivé en production (le code détecte l'absence d'URL et ne charge pas le script).

### Option 2 : Configurer une instance Umami de production

Si vous avez une instance Umami hébergée (ex: sur un VPS, Railway, etc.) :

**Dans Vercel :**

1. Vercel Dashboard → Votre projet → **Settings** → **Environment Variables**
2. **Modifier** `NEXT_PUBLIC_UMAMI_URL` :
   - **Valeur** : `https://analytics.votre-domaine.com` (votre URL Umami de production)
   - **⚠️ IMPORTANT** : Ne PAS utiliser `http://localhost:3001`
   - **Environnements** : Production uniquement
3. **Sauvegarder**

**Dans `.env.local` (pour le dev local) :**

```env
NEXT_PUBLIC_UMAMI_URL=http://localhost:3001  # OK pour local
```

## 🔍 Vérification

Le code détecte automatiquement :

- ✅ Si `NEXT_PUBLIC_UMAMI_URL` contient `localhost` en production → Umami désactivé
- ✅ Si `NEXT_PUBLIC_UMAMI_URL` n'est pas configuré → Umami désactivé
- ✅ Si `NEXT_PUBLIC_UMAMI_URL` pointe vers une URL valide → Umami activé

## 📋 Configuration actuelle

**Local (`.env.local`) :**

```env
NEXT_PUBLIC_UMAMI_URL=http://localhost:3001  # ✅ OK pour dev local
NEXT_PUBLIC_UMAMI_WEBSITE_ID=484ec662-e403-4498-a654-ca04b9b504c3
```

**Production (Vercel) :**

- **Option A** : Ne pas configurer `NEXT_PUBLIC_UMAMI_URL` → Umami désactivé en prod
- **Option B** : Configurer avec une URL de production → Umami activé en prod

## 💡 Recommandation

Si vous n'avez pas d'instance Umami hébergée en production, **désactivez Umami en production** en ne configurant pas `NEXT_PUBLIC_UMAMI_URL` dans Vercel. Vous pouvez toujours utiliser Umami en local pour le développement.

Les analytics de production peuvent être gérés par :

- **Vercel Speed Insights** (déjà intégré) - Performance
- **Sentry** (déjà intégré) - Error tracking
- **Umami** (optionnel) - Analytics détaillés (si instance hébergée)
