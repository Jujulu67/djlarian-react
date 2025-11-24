# TODO - Configuration Instagram API

## Statut

En attente - Configuration Meta Business Suite nécessaire

## Ce qui est déjà fait ✅

- [x] Service Instagram créé (`src/lib/services/instagram.ts`)
- [x] Route API créée (`src/app/api/instagram/posts/route.ts`)
- [x] Types TypeScript ajoutés (`InstagramPost` dans `src/lib/utils/types.ts`)
- [x] Page galerie modifiée avec onglets Instagram/Galerie
- [x] Documentation mise à jour (`SECRETS_MANAGEMENT.md`)

## Ce qui reste à faire ⏳

### 1. Finaliser l'association Page Facebook / Instagram

- [ ] Confirmer l'association entre la Page Facebook "Larian" et le compte Instagram "@djlarian"
- [ ] Résoudre le problème du portefeuille business "Bertram Beer" dans Meta Business Suite
- [ ] Vérifier que la Page Facebook et Instagram sont bien liées

### 2. Obtenir les credentials Instagram

- [ ] **INSTAGRAM_APP_ID** : `1213631690870715` (déjà trouvé - App Instagram)
- [ ] **INSTAGRAM_APP_SECRET** : À récupérer depuis les paramètres de l'app Instagram
- [ ] **INSTAGRAM_USER_ID** : ID du compte Instagram Business (@djlarian) - à obtenir via Graph API Explorer
- [ ] **INSTAGRAM_ACCESS_TOKEN** : Token long-lived (60 jours) - à générer via Graph API Explorer ou Meta Business Manager

### 3. Méthode recommandée pour obtenir le token

**Option A : Via Graph API Explorer (une fois l'association confirmée)**

1. Aller sur : https://developers.facebook.com/tools/explorer/
2. Sélectionner l'app "LARIAN GALLERY"
3. Dans "Utilisateur ou Page", sélectionner la Page Facebook "Larian"
4. Générer le token
5. Tester avec : `me?fields=instagram_business_account` pour obtenir l'INSTAGRAM_USER_ID
6. Utiliser : `{instagram_business_account_id}/media` pour récupérer les posts

**Option B : Via Meta Business Manager (recommandé)**

1. Aller sur : https://business.facebook.com/settings/system-users
2. Créer un utilisateur système
3. Assigner l'app "LARIAN GALLERY" et la Page Facebook
4. Générer un token avec les permissions Instagram
5. Ce token ne expire pas (contrairement au token Graph API Explorer)

### 4. Configuration des variables d'environnement

Une fois les credentials obtenus, ajouter dans `.env.local` :

```env
INSTAGRAM_APP_ID="1213631690870715"
INSTAGRAM_APP_SECRET="[à récupérer]"
INSTAGRAM_USER_ID="[à récupérer]"
INSTAGRAM_ACCESS_TOKEN="[à générer]"
```

Et dans Vercel (pour la production) :

- Ajouter les mêmes variables dans Settings → Environment Variables
- Marquer `INSTAGRAM_APP_SECRET` et `INSTAGRAM_ACCESS_TOKEN` comme "Encrypt" (Secret)

## Notes

- Le code est prêt et fonctionnera automatiquement une fois les credentials configurés
- La galerie affichera un message gracieux si Instagram n'est pas configuré
- Le cache est de 1 heure pour éviter de surcharger l'API Instagram
- Limite : 6 posts Instagram affichés (configurable dans le code)

## Références

- Documentation Instagram Graph API : https://developers.facebook.com/docs/instagram-api/
- Graph API Explorer : https://developers.facebook.com/tools/explorer/
- Meta Business Manager : https://business.facebook.com/
