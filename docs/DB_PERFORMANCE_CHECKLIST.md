# Checklist de Performance DB sur Vercel

Ce document décrit les étapes pour diagnostiquer et optimiser les performances de la base de données sur Vercel.

## Problème identifié

Les actions DB sont lentes en production sur Vercel (ex: `addItemToUser` prend ~3 secondes). Ce document aide à identifier les causes possibles.

## Diagnostic en 3 étapes

### a) Logger précisément la latence des appels DB

✅ **Implémenté** : Un système de logging de performance a été ajouté dans `src/lib/db-performance.ts`.

**Comment ça fonctionne :**

- Le logging est activé automatiquement en production (`NODE_ENV === 'production'`)
- Les métriques sont loggées dans la console Vercel avec le préfixe `[DB Perf]`
- Les logs incluent :
  - Temps de connexion (si applicable)
  - Temps d'exécution de la query
  - Temps total du handler

**Actions instrumentées :**

- `src/actions/inventory.ts` : `addItemToUser`, `removeItemFromUser`, `getInventory`
- `src/app/api/live/inventory/route.ts` : `GET` et `PUT`

**Interprétation des logs :**

Si vous voyez dans les logs Vercel :

```
[DB Perf] addItemToUser [findUnique+update] - query: 45ms, total: 1200ms
```

Cela signifie :

- **query: 45ms** → La query DB elle-même est rapide
- **total: 1200ms** → Le handler total est lent
- **Conclusion** : Le problème vient probablement du cold start Vercel, pas de la DB

Si vous voyez :

```
[DB Perf] addItemToUser [findUnique+update] - query: 850ms, total: 900ms
```

Cela signifie :

- **query: 850ms** → La query DB est lente
- **total: 900ms** → Le handler total est aussi lent
- **Conclusion** : Le problème vient de la DB (région, pooling, index, etc.)

**Où voir les logs :**

1. Aller sur https://vercel.com
2. Sélectionner votre projet
3. Aller dans l'onglet "Logs" ou "Functions"
4. Filtrer par `[DB Perf]` pour voir uniquement les métriques de performance

---

### b) Vérifier les régions

**Problème fréquent** : Si votre projet Vercel est en Europe mais que votre DB Neon est aux US (ou vice versa), vous aurez une latence importante.

#### Vérifier la région Vercel

1. Aller sur https://vercel.com
2. Sélectionner votre projet
3. Aller dans **Settings** → **General**
4. Vérifier la **Region** (ex: `Europe (Frankfurt)`, `US East (Washington D.C.)`)

**Recommandation** : Si vos utilisateurs sont principalement en Europe, configurez Vercel en région Europe.

#### Vérifier la région Neon

1. Aller sur https://console.neon.tech
2. Sélectionner votre projet
3. Aller dans **Settings** → **Connection Details**
4. Vérifier la région dans l'URL de connexion :
   - `eu-central-1` = Europe (Frankfurt)
   - `us-east-2` = US East (Ohio)
   - `us-west-2` = US West (Oregon)
   - etc.

**Recommandation** : La région Neon doit correspondre à la région Vercel pour minimiser la latence.

**Comment changer la région Neon :**

- ⚠️ **Attention** : Changer la région nécessite de créer un nouveau projet Neon ou de migrer les données
- Si vous devez changer, contactez le support Neon ou créez un nouveau projet dans la bonne région

---

### c) Vérifier le driver / pooling Neon

✅ **Implémenté** : Le driver serverless Neon est maintenant utilisé dans `src/lib/prisma.ts`.

**Vérification de la configuration actuelle :**

Le code utilise maintenant `@neondatabase/serverless` qui est optimisé pour les environnements serverless comme Vercel. Il gère automatiquement :

- Le pooling de connexions
- Les connexions HTTP/WebSocket selon le contexte
- La réutilisation des connexions

**Vérifier que la DATABASE_URL utilise le pooler :**

Votre `DATABASE_URL` en production devrait contenir `pooler` dans l'URL :

```
postgresql://user:pass@ep-xxxxx-pooler.eu-central-1.aws.neon.tech/dbname?sslmode=require
```

Si votre URL contient `pooler`, c'est bon ✅

Si votre URL ne contient pas `pooler`, vous devriez :

1. Aller sur https://console.neon.tech
2. Sélectionner votre projet
3. Aller dans **Connection Details**
4. Utiliser la connection string avec **"Pooled connection"** (pas "Direct connection")

**Note** : Le driver serverless Neon fonctionne avec les deux types de connexions, mais le pooler est recommandé pour les environnements serverless.

---

## Résumé des optimisations appliquées

1. ✅ **Logging de performance** : Ajout d'un système de logging détaillé pour mesurer la latence
2. ✅ **Driver serverless Neon** : Utilisation de `@neondatabase/serverless` au lieu de seulement `connectionString`
3. ✅ **Instrumentation des actions critiques** : Les fonctions `addItemToUser`, `removeItemFromUser`, et les routes API sont maintenant instrumentées

## Actions manuelles requises

1. **Vérifier les régions** : Comparer la région Vercel avec la région Neon (voir section b)
2. **Vérifier la DATABASE_URL** : S'assurer qu'elle utilise le pooler (voir section c)
3. **Surveiller les logs** : Après déploiement, surveiller les logs Vercel pour voir les métriques de performance

## Prochaines étapes si le problème persiste

Si après ces vérifications le problème persiste :

1. **Vérifier les index** : S'assurer que les colonnes utilisées dans les `where` ont des index

   ```sql
   -- Exemple : vérifier les index sur userLiveItem
   SELECT indexname, indexdef
   FROM pg_indexes
   WHERE tablename = 'UserLiveItem';
   ```

2. **Vérifier la taille de la DB** : Une DB très grande peut ralentir les queries
   - Aller sur https://console.neon.tech
   - Vérifier la taille de la DB dans les statistiques

3. **Vérifier les connexions actives** : Trop de connexions ouvertes peuvent ralentir
   - Utiliser les logs Neon pour voir le nombre de connexions

4. **Considérer un cache** : Pour les données fréquemment lues, considérer un cache (Redis, etc.)

## Références

- [Documentation Neon Serverless Driver](https://neon.tech/docs/serverless/serverless-driver)
- [Documentation Vercel Regions](https://vercel.com/docs/concepts/edge-network/regions)
- [Documentation Neon Connection Pooling](https://neon.tech/docs/connect/connection-pooling)
