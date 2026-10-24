#!/bin/bash
# Script de migration SQLite -> PostgreSQL local
# Automatise les étapes principales de la migration

set -e  # Arrêter en cas d'erreur

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

echo "🚀 Migration SQLite → PostgreSQL Local"
echo "========================================"
echo ""

# Couleurs pour les outputs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction pour afficher les étapes
step() {
  echo -e "${BLUE}▶ $1${NC}"
}

success() {
  echo -e "${GREEN}✅ $1${NC}"
}

warning() {
  echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
  echo -e "${RED}❌ $1${NC}"
}

# Phase A - Audit rapide
step "Phase A: Audit rapide"
echo ""

# Vérifier schema.prisma - FAIL FAST si encore en sqlite
if grep -q 'provider = "sqlite"' prisma/schema.prisma; then
  error "schema.prisma est encore en SQLite!"
  echo ""
  echo "   Action requise: Modifier prisma/schema.prisma ligne 8:"
  echo "   Changer 'provider = \"sqlite\"' en 'provider = \"postgresql\"'"
  echo "   GARDER 'url = env(\"DATABASE_URL\")' (ne pas supprimer!)"
  echo ""
  exit 1
fi

# Vérifier que url est présent (obligatoire)
if ! grep -q 'url[[:space:]]*=[[:space:]]*env("DATABASE_URL")' prisma/schema.prisma; then
  error "schema.prisma doit contenir 'url = env(\"DATABASE_URL\")'"
  echo ""
  echo "   Ajoutez dans le bloc datasource db:"
  echo "   url = env(\"DATABASE_URL\")"
  echo ""
  exit 1
fi

success "schema.prisma est correct (postgresql avec url)"

# Vérifier migration_lock.toml
if grep -q 'provider = "postgresql"' prisma/migrations/migration_lock.toml; then
  success "migration_lock.toml est correct (postgresql)"
else
  error "migration_lock.toml n'est pas sur postgresql"
  exit 1
fi

# Vérifier SQLite DB
if [ -f "prisma/dev.db" ]; then
  success "SQLite DB trouvée: prisma/dev.db"
  TABLE_COUNT=$(sqlite3 prisma/dev.db "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma_%';" 2>/dev/null || echo "0")
  echo "   Tables trouvées: $TABLE_COUNT"
else
  warning "SQLite DB non trouvée (peut être normal si déjà migré)"
fi

echo ""

# Phase B - Docker PostgreSQL
step "Phase B: Mise en place PostgreSQL local (Docker)"
echo ""

# Vérifier Docker
if ! command -v docker &> /dev/null; then
  error "Docker n'est pas installé ou non accessible"
  exit 1
fi

# Démarrer Docker Compose
if ! docker compose ps | grep -q "djlarian-postgres-local.*Up"; then
  warning "PostgreSQL n'est pas démarré"
  echo "   Démarrage de Docker Compose..."
  docker compose up -d
  
  # Attendre que PostgreSQL soit prêt
  echo "   Attente que PostgreSQL soit prêt..."
  sleep 5
  
  # Vérifier la santé
  for i in {1..30}; do
    if docker compose ps | grep -q "healthy"; then
      success "PostgreSQL est démarré et healthy"
      break
    fi
    if [ $i -eq 30 ]; then
      error "PostgreSQL n'est pas prêt après 30 secondes"
      docker compose logs postgres | tail -20
      exit 1
    fi
    sleep 1
  done
else
  success "PostgreSQL est déjà démarré"
fi

echo ""

# Configurer .env.local
step "Phase B: Configuration .env.local"
echo ""

if [ ! -f ".env.local" ]; then
  warning ".env.local n'existe pas, création..."
  touch .env.local
fi

# Ajouter DATABASE_URL_LOCAL si n'existe pas
if ! grep -q "^DATABASE_URL_LOCAL" .env.local 2>/dev/null; then
  echo 'DATABASE_URL_LOCAL="postgresql://djlarian:djlarian_dev_password@localhost:5432/djlarian_dev?sslmode=disable"' >> .env.local
  success "DATABASE_URL_LOCAL ajouté dans .env.local"
else
  echo "   DATABASE_URL_LOCAL existe déjà"
fi

# Tester la connexion
step "Test de connexion PostgreSQL"
echo ""

PG_URL="postgresql://djlarian:djlarian_dev_password@localhost:5432/djlarian_dev?sslmode=disable"
if command -v psql &> /dev/null; then
  if psql "$PG_URL" -c "\dt" &>/dev/null; then
    success "Connexion PostgreSQL OK"
  else
    error "Impossible de se connecter à PostgreSQL"
    exit 1
  fi
else
  warning "psql non installé, test de connexion avec Node.js..."
  if node -e "const {Pool}=require('pg');const p=new Pool({connectionString:'$PG_URL'});p.query('SELECT 1').then(()=>{console.log('✅ Connexion OK');p.end();process.exit(0)}).catch(e=>{console.error('❌',e.message);p.end();process.exit(1)})" 2>/dev/null; then
    success "Connexion PostgreSQL OK"
  else
    error "Impossible de se connecter à PostgreSQL"
    exit 1
  fi
fi

echo ""

# Phase C - Vérification schema.prisma
step "Phase C: Vérification schema.prisma"
echo ""

if grep -q 'provider = "postgresql"' prisma/schema.prisma; then
  success "schema.prisma a provider = postgresql"
else
  error "schema.prisma doit avoir provider = postgresql"
  echo "   Modifiez manuellement prisma/schema.prisma ligne 8"
  exit 1
fi

# Note: url n'est plus dans schema.prisma en Prisma 7, il est dans prisma.config.ts
success "schema.prisma correct (url géré par prisma.config.ts)"

# Valider le schema
if pnpm prisma validate &>/dev/null; then
  success "Schema Prisma valide"
else
  error "Schema Prisma invalide"
  pnpm prisma validate
  exit 1
fi

echo ""

# Phase D - Appliquer migrations
step "Phase D: Appliquer migrations Prisma sur PostgreSQL"
echo ""

# Utiliser DATABASE_URL_LOCAL temporairement
export DATABASE_URL="$PG_URL"

# Vérifier que les tables n'existent pas encore (base propre)
echo "   Vérification que la base est propre..."
TABLE_CHECK=$(psql "$PG_URL" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name NOT LIKE '_prisma_%';" 2>/dev/null || echo "error")
if [ "$TABLE_CHECK" != "error" ] && [ "$TABLE_CHECK" -gt 0 ] 2>/dev/null; then
  warning "La base contient déjà des tables ($TABLE_CHECK tables)"
  echo "   Si vous voulez repartir propre, utilisez: pnpm run db:reset:local"
  read -p "   Continuer quand même? (o/N) " -r
  if [[ ! $REPLY =~ ^[Oo]$ ]]; then
    warning "Migration annulée"
    exit 0
  fi
else
  success "Base propre (pas de tables existantes)"
fi

# Vérifier l'état des migrations
echo "   Vérification de l'état des migrations..."
MIGRATION_STATUS=$(pnpm prisma migrate status 2>&1 || true)

if echo "$MIGRATION_STATUS" | grep -q "Database schema is up to date"; then
  success "Migrations déjà appliquées"
elif echo "$MIGRATION_STATUS" | grep -q "migrations have not yet been applied"; then
  warning "Migrations non appliquées, application..."
  pnpm prisma migrate deploy
  success "Migrations appliquées"
else
  warning "État des migrations incertain, tentative d'application..."
  pnpm prisma migrate deploy || {
    error "Échec de l'application des migrations"
    exit 1
  }
  success "Migrations appliquées"
fi

# Vérifier migrate status après application
echo "   Vérification finale du statut des migrations..."
FINAL_STATUS=$(pnpm prisma migrate status 2>&1 || true)
if echo "$FINAL_STATUS" | grep -q "Database schema is up to date"; then
  success "Migrations confirmées: base à jour"
else
  warning "État des migrations après application:"
  echo "$FINAL_STATUS"
fi

echo ""

# Phase E - Migration des données
step "Phase E: Migration des données SQLite → PostgreSQL"
echo ""

if [ ! -f "prisma/dev.db" ]; then
  warning "SQLite DB non trouvée, saut de la migration des données"
else
  # Dry-run d'abord
  echo "   Exécution d'un dry-run (simulation)..."
  if node scripts/migrate-sqlite-to-postgres.mjs --dry-run 2>&1 | tail -5; then
    echo ""
    read -p "Dry-run terminé. Continuer avec la migration réelle? (o/N) " -r
    if [[ ! $REPLY =~ ^[Oo]$ ]]; then
      warning "Migration annulée par l'utilisateur"
      exit 0
    fi
    
    echo ""
    echo "   Migration réelle en cours..."
    node scripts/migrate-sqlite-to-postgres.mjs
    
    success "Migration des données terminée"
  else
    error "Erreur lors du dry-run"
    exit 1
  fi
fi

echo ""

# Phase F - Mise à jour .env.local
step "Phase F: Mise à jour DATABASE_URL dans .env.local"
echo ""

# Demander confirmation avant de changer DATABASE_URL
if grep -q "^DATABASE_URL=file:" .env.local; then
  warning "DATABASE_URL pointe encore vers SQLite"
  echo "   Voulez-vous mettre à jour DATABASE_URL pour pointer vers PostgreSQL local?"
  read -p "   (o/N) " -r
  if [[ $REPLY =~ ^[Oo]$ ]]; then
    # Remplacer DATABASE_URL
    if [[ "$OSTYPE" == "darwin"* ]]; then
      # macOS
      sed -i '' 's|^DATABASE_URL=file:.*|DATABASE_URL="postgresql://djlarian:djlarian_dev_password@localhost:5432/djlarian_dev?sslmode=disable"|' .env.local
    else
      # Linux
      sed -i 's|^DATABASE_URL=file:.*|DATABASE_URL="postgresql://djlarian:djlarian_dev_password@localhost:5432/djlarian_dev?sslmode=disable"|' .env.local
    fi
    success "DATABASE_URL mis à jour dans .env.local"
  else
    warning "DATABASE_URL non modifié (vous pouvez le faire manuellement)"
  fi
else
  echo "   DATABASE_URL ne pointe pas vers SQLite (peut être déjà configuré)"
fi

echo ""

# Phase G - Validation finale
step "Phase G: Validation finale"
echo ""

# Générer Prisma Client
echo "   Génération du Prisma Client..."
pnpm run prisma:generate
success "Prisma Client généré"

# Valider le schema
echo "   Validation du schema..."
if pnpm prisma validate; then
  success "Schema valide"
else
  error "Schema invalide"
  exit 1
fi

echo ""
success "Migration terminée avec succès!"
echo ""
echo "📋 Prochaines étapes:"
echo "   1. Vérifier que l'app démarre: pnpm run dev"
echo "   2. Lancer les tests: pnpm run test:assistant-router"
echo "   3. Vérifier les données dans Prisma Studio: pnpm run db:studio"
echo ""
