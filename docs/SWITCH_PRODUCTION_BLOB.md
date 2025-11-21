# 🔄 Switch Production - Base de données et Blob Storage

## Vue d'ensemble

Le switch de production permet de se connecter à la base de données de production (Neon) et au blob storage de production (Vercel Blob) depuis votre environnement local.

## Configuration

### Variables d'environnement dans `.env.local`

Pour utiliser le switch de production, vous devez définir ces variables dans `.env.local` :

```env
# Base de données de production
DATABASE_URL_PRODUCTION="postgresql://neondb_owner:xxxxx@ep-xxxxx.neon.tech/neondb?sslmode=require"

# Blob storage de production (optionnel mais recommandé)
BLOB_READ_WRITE_TOKEN_PRODUCTION="vercel_blob_rw_xxxxx"
```

### Comment obtenir BLOB_READ_WRITE_TOKEN_PRODUCTION

1. Allez dans votre projet Vercel
2. **Settings** → **Environment Variables**
3. Trouvez `BLOB_READ_WRITE_TOKEN`
4. Copiez la valeur
5. Ajoutez-la dans `.env.local` comme `BLOB_READ_WRITE_TOKEN_PRODUCTION`

**Note** : Le token est créé automatiquement par Vercel quand vous créez un Blob Store. Il est disponible dans les variables d'environnement de votre projet Vercel.

## Utilisation

### Activer le switch de production

1. Allez dans `/admin/configuration`
2. Trouvez la section "Switch Base de données"
3. Activez le switch "Base de production (Neon)"
4. Le serveur redémarre automatiquement

### Ce qui se passe

Quand vous activez le switch :

1. **Base de données** : `DATABASE_URL` dans `.env.local` est remplacé par `DATABASE_URL_PRODUCTION`
2. **Blob storage** : `BLOB_READ_WRITE_TOKEN` dans `.env.local` est remplacé par `BLOB_READ_WRITE_TOKEN_PRODUCTION` (si défini)
3. **Schéma Prisma** : Change automatiquement de SQLite vers PostgreSQL
4. **Redémarrage** : Le serveur redémarre automatiquement pour prendre en compte les changements

### Désactiver le switch

1. Désactivez le switch dans `/admin/configuration`
2. Le serveur redémarre automatiquement
3. `DATABASE_URL` revient à SQLite local
4. `BLOB_READ_WRITE_TOKEN` est restauré depuis le backup (si disponible)

## Comportement

### En production (Vercel)

- Le switch est **bloqué** (non disponible)
- `DATABASE_URL` vient toujours de Vercel (Neon)
- `BLOB_READ_WRITE_TOKEN` est injecté automatiquement par Vercel

### En développement local

- **Switch OFF** (par défaut) :

  - Base de données : SQLite local (`file:./prisma/dev.db`)
  - Blob storage : Dossier local (`public/uploads/`)

- **Switch ON** :
  - Base de données : PostgreSQL de production (Neon)
  - Blob storage : Vercel Blob de production (si `BLOB_READ_WRITE_TOKEN_PRODUCTION` est défini)

## Notes importantes

1. **BLOB_READ_WRITE_TOKEN_PRODUCTION est optionnel** :

   - Si non défini, le système utilisera `BLOB_READ_WRITE_TOKEN` tel quel (peut être un token local ou vide)
   - Si défini, il sera utilisé quand le switch est activé

2. **Backup automatique** :

   - Les valeurs de `DATABASE_URL` et `BLOB_READ_WRITE_TOKEN` sont sauvegardées dans `.env.local.backup`
   - Elles sont restaurées automatiquement quand vous désactivez le switch

3. **Redémarrage requis** :
   - Après activation/désactivation du switch, le serveur redémarre automatiquement
   - Les variables d'environnement sont rechargées au redémarrage

## Vérification

Pour vérifier que tout fonctionne :

1. Activez le switch
2. Vérifiez `/api/health` :
   - `database.status` devrait être `"connected"`
   - `blob.status` devrait être `"configured"` si le token est défini

## Sécurité

⚠️ **Important** :

- Ne commitez JAMAIS `.env.local` dans Git
- `BLOB_READ_WRITE_TOKEN_PRODUCTION` contient un secret
- Utilisez uniquement pour le développement local
- En production, Vercel injecte automatiquement le token
