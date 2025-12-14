# Configuration .env.local pour PostgreSQL Local

## Fichier .env.local

Créez un fichier `.env.local` à la racine du projet avec le contenu suivant:

```bash
# Base de données locale (PostgreSQL via Docker Compose)
DATABASE_URL="postgresql://djlarian:djlarian_dev_password@127.0.0.1:5433/djlarian_dev?sslmode=disable"

# Base de données locale (alias pour clarté)
DATABASE_URL_LOCAL="postgresql://djlarian:djlarian_dev_password@127.0.0.1:5433/djlarian_dev?sslmode=disable"

# Base de données de production (optionnel, pour switch DB)
# ⚠️  PROTECTION: Ne pas utiliser sans ALLOW_PROD_DB=1
# DATABASE_URL_PRODUCTION="postgresql://user:password@host:5432/db?sslmode=require"

# Protection contre l'utilisation accidentelle de la DB de production
# Définir à "1" ou "true" pour autoriser le switch vers prod (DÉCONSEILLÉ en local)
# ALLOW_PROD_DB=0

# Vercel Blob Storage (optionnel pour développement local)
# BLOB_READ_WRITE_TOKEN="your_token_here"
# BLOB_READ_WRITE_TOKEN_PRODUCTION="your_prod_token_here"

# NextAuth
# NEXTAUTH_SECRET="your_secret_here"
# NEXTAUTH_URL="http://localhost:3000"

# Autres variables d'environnement
# NODE_ENV=development
```

## Variables Requises

### DATABASE_URL (obligatoire)

Point vers PostgreSQL local (Docker Compose):

```bash
DATABASE_URL="postgresql://djlarian:djlarian_dev_password@127.0.0.1:5433/djlarian_dev?sslmode=disable"
```

**Configuration Docker Compose:**

- User: `djlarian`
- Password: `djlarian_dev_password`
- Database: `djlarian_dev`
- Port: `5433` (exposé depuis 5432 dans le conteneur pour éviter conflit avec PostgreSQL natif)

## Variables Optionnelles

### DATABASE_URL_LOCAL

Alias pour clarté (même valeur que DATABASE_URL).

### DATABASE_URL_PRODUCTION

**⚠️ PROTECTION:** Ne pas utiliser sans `ALLOW_PROD_DB=1`

URL de la base de production (Neon). Utilisée uniquement avec le switch DB et `ALLOW_PROD_DB=1`.

### ALLOW_PROD_DB

Protection contre l'utilisation accidentelle de la DB de production.

- `0` ou non défini: Bloque toute connexion vers prod
- `1` ou `true`: Autorise le switch vers prod (DÉCONSEILLÉ)

## Sécurité

- ✅ `.env.local` est dans `.gitignore` (ne sera jamais commité)
- ✅ Protection prod avec `ALLOW_PROD_DB`
- ✅ Logs sanitizés (pas de credentials dans les logs)

## Vérification

```bash
# Vérifier que DATABASE_URL est configuré
grep "^DATABASE_URL" .env.local

# Tester la connexion
psql "$DATABASE_URL" -c "\dt"
```
