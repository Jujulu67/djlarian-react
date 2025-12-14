# Runbook PostgreSQL Local — Setup et Commandes

**Objectif**: Configurer PostgreSQL local pour le développement, remplacer SQLite.

---

## Option 1: Docker Compose (Recommandé)

### Prérequis

- Docker Desktop installé et démarré
- Port 5432 disponible (ou modifier dans `docker-compose.yml`)

### Setup Initial

1. **Créer `docker-compose.yml` à la racine du projet**:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: djlarian-postgres-local
    environment:
      POSTGRES_USER: djlarian
      POSTGRES_PASSWORD: djlarian_dev_password
      POSTGRES_DB: djlarian_dev
    ports:
      - '5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U djlarian']
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

2. **Démarrer PostgreSQL**:

```bash
docker-compose up -d
```

3. **Vérifier que PostgreSQL est démarré**:

```bash
docker-compose ps
# Devrait afficher "Up" et "healthy"
```

4. **Configurer `.env.local`**:

```bash
DATABASE_URL="postgresql://djlarian:djlarian_dev_password@127.0.0.1:5433/djlarian_dev?sslmode=disable"
```

5. **Bootstrap la base de données**:

```bash
npm run prisma:bootstrap:local
```

### Commandes Utiles

```bash
# Démarrer PostgreSQL
docker-compose up -d

# Arrêter PostgreSQL
docker-compose down

# Arrêter et supprimer les données (⚠️ DESTRUCTIF)
docker-compose down -v

# Voir les logs
docker-compose logs -f postgres

# Se connecter avec psql
docker-compose exec postgres psql -U djlarian -d djlarian_dev

# Backup
docker-compose exec postgres pg_dump -U djlarian djlarian_dev > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore
docker-compose exec -T postgres psql -U djlarian djlarian_dev < backup_YYYYMMDD_HHMMSS.sql
```

---

## Option 2: PostgreSQL Natif (macOS)

### Prérequis

- Homebrew installé
- Port 5432 disponible

### Setup Initial

1. **Installer PostgreSQL**:

```bash
brew install postgresql@16
brew services start postgresql@16
```

2. **Créer la base de données et l'utilisateur**:

```bash
# Se connecter à PostgreSQL
psql postgres

# Dans psql, exécuter:
CREATE USER djlarian WITH PASSWORD 'djlarian_dev_password';
CREATE DATABASE djlarian_dev OWNER djlarian;
GRANT ALL PRIVILEGES ON DATABASE djlarian_dev TO djlarian;
\q
```

3. **Configurer `.env.local`**:

```bash
DATABASE_URL="postgresql://djlarian:djlarian_dev_password@127.0.0.1:5433/djlarian_dev?sslmode=disable"
```

4. **Bootstrap la base de données**:

```bash
npm run prisma:bootstrap:local
```

### Commandes Utiles

```bash
# Démarrer PostgreSQL
brew services start postgresql@16

# Arrêter PostgreSQL
brew services stop postgresql@16

# Se connecter avec psql
psql -U djlarian -d djlarian_dev

# Backup
pg_dump -U djlarian djlarian_dev > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore
psql -U djlarian djlarian_dev < backup_YYYYMMDD_HHMMSS.sql

# Lister les bases de données
psql -U djlarian -l

# Supprimer la base (⚠️ DESTRUCTIF)
dropdb -U djlarian djlarian_dev
```

---

## Scripts NPM Disponibles

### Bootstrap Local

```bash
npm run prisma:bootstrap:local
```

- Vérifie `DATABASE_URL`
- Crée un backup si la DB existe
- Applique les migrations (`migrate deploy`)
- Génère le client Prisma

### Migrations

```bash
# Créer une nouvelle migration
npm run prisma:migrate:dev -- --name nom_migration

# Appliquer les migrations (production-safe)
npm run prisma:migrate:deploy

# Vérifier l'état des migrations
npx prisma migrate status

# Vérifier le drift
npm run prisma:check:drift
```

### Client Prisma

```bash
# Générer le client
npm run prisma:generate

# Valider le schéma et générer
npm run prisma:check:client
```

### Studio (GUI)

```bash
npm run db:studio
```

---

## Migration des Données SQLite → PostgreSQL (Optionnel)

Si vous avez des données dans `prisma/dev.db` que vous voulez migrer:

### 1. Backup SQLite

```bash
cp prisma/dev.db prisma/dev.db.backup.$(date +%Y%m%d_%H%M%S)
```

### 2. Exporter depuis SQLite

```bash
# Installer sqlite3 si nécessaire
brew install sqlite3

# Exporter les données (exemple pour la table Project)
sqlite3 prisma/dev.db ".mode insert Project" ".output projects.sql" "SELECT * FROM Project;"
```

### 3. Importer dans PostgreSQL

```bash
# Adapter le format SQL si nécessaire, puis:
psql -U djlarian -d djlarian_dev < projects.sql
```

**Note**: Cette migration est manuelle et optionnelle. Pour un démarrage propre, il est recommandé de repartir avec une base vide et de réimporter uniquement les données critiques.

---

## Dépannage

### Erreur: "relation does not exist"

```bash
# Vérifier que les migrations sont appliquées
npx prisma migrate status

# Si des migrations sont en attente:
npm run prisma:migrate:deploy
```

### Erreur: "database does not exist"

```bash
# Créer la base de données
createdb -U djlarian djlarian_dev

# Ou avec Docker:
docker-compose exec postgres createdb -U djlarian djlarian_dev
```

### Erreur: "password authentication failed"

```bash
# Vérifier DATABASE_URL dans .env.local
# Vérifier que l'utilisateur existe et que le mot de passe est correct
```

### Reset Complet (⚠️ DESTRUCTIF)

```bash
# Docker
docker-compose down -v
docker-compose up -d
npm run prisma:bootstrap:local

# Natif
dropdb -U djlarian djlarian_dev
createdb -U djlarian djlarian_dev
npm run prisma:bootstrap:local
```

---

## Vérification

### Vérifier que tout fonctionne

```bash
# 1. Vérifier la connexion
npx prisma db execute --stdin <<< "SELECT 1;"

# 2. Vérifier les migrations
npx prisma migrate status

# 3. Vérifier les tables
npx prisma db execute --stdin <<< "\dt"

# 4. Lancer l'app
npm run dev
```

---

## Variables d'Environnement

### `.env.local` (exemple)

```bash
# PostgreSQL Local
DATABASE_URL="postgresql://djlarian:djlarian_dev_password@127.0.0.1:5433/djlarian_dev?sslmode=disable"

# Production (pour switch DB, optionnel)
DATABASE_URL_PRODUCTION="postgresql://user:pass@prod-host/db?sslmode=require"

# Protection anti-prod (requis pour pointer vers prod)
ALLOW_PROD_DB=0
```

---

**Fin du runbook**
