# Plan d'Action - Fix Prisma 7 avec Next.js

## Problème Identifié

Prisma 7 génère des fichiers `.ts` mais `default.mjs` essaie d'importer `client.js` qui n'existe pas.
Next.js/Turbopack ne peut pas compiler les fichiers TypeScript dans `node_modules`.

## Solution (basée sur Trigger.dev et communauté)

**Principe clé** : Marquer Prisma comme dépendance externe et NE PAS modifier les fichiers générés par Prisma.

### Étapes

1. ✅ Backuper la base de données
2. ✅ Nettoyer les fichiers modifiés
3. ✅ Régénérer Prisma proprement
4. ⏳ Configurer Next.js pour marquer Prisma comme externe
5. ⏳ Créer uniquement default.d.ts et default.js (pas default.mjs)
6. ⏳ Tester le build

## Configuration Requise

### next.config.ts

- Marquer `@prisma/client` et `.prisma/client` comme externes
- Utiliser `--webpack` (pas Turbopack)

### Script fix-prisma-types.mjs

- Créer uniquement `default.d.ts` et `default.js`
- NE PAS modifier `default.mjs` (géré par Prisma)
