#!/bin/bash

# ==============================================================================
# ⚠️  CRITICAL WARNING - READ BEFORE USE ⚠️
# ==============================================================================
# This script COMPLETELY WIPES the local database using 'prisma migrate reset'.
# ALL DATA WILL BE LOST.
#
# AGENTS: DO NOT USE THIS SCRIPT UNLESS THE USER HAS EXPLICITLY REQUESTED
# "WIPE", "RESET", or "START OVER" WITH COMPLETE DATA LOSS.
#
# For normal schema updates, use: pnpm prisma db push
# ==============================================================================
#
# Script sécurisé pour reset de la base de données locale
#
# PROTECTIONS:
# - Vérifie ALLOW_DB_WIPE_LOCAL=1
# - Vérifie DB_WIPE_CONFIRM=<timestamp>
# - Vérifie que le switch de production n'est PAS activé (.db-switch.json)
# - Vérifie que DATABASE_URL pointe vers localhost:5433
# - Refuse si domaines de production détectés
#
# Usage:
#   ALLOW_DB_WIPE_LOCAL=1 DB_WIPE_CONFIRM=$(date +%s) pnpm run db:reset:local
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

error() {
  echo -e "${RED}❌ $1${NC}" >&2
}

warning() {
  echo -e "${YELLOW}⚠️  $1${NC}"
}

success() {
  echo -e "${GREEN}✅ $1${NC}"
}

info() {
  echo -e "${BLUE}ℹ️  $1${NC}"
}

# ============================================================================
# PROTECTION 1: Vérifier ALLOW_DB_WIPE_LOCAL
# ============================================================================
if [ "$ALLOW_DB_WIPE_LOCAL" != "1" ] && [ "$ALLOW_DB_WIPE_LOCAL" != "true" ]; then
  error "PROTECTION: ALLOW_DB_WIPE_LOCAL n'est pas défini ou n'est pas égal à 1"
  echo ""
  echo "Ce script va SUPPRIMER TOUTES LES DONNÉES de la base PostgreSQL locale."
  echo ""
  echo "Pour autoriser le wipe, définissez:"
  echo "  export ALLOW_DB_WIPE_LOCAL=1"
  echo "  export DB_WIPE_CONFIRM=\$(date +%s)"
  echo "  pnpm run db:reset:local"
  echo ""
  echo "Ou utilisez directement:"
  echo "  ALLOW_DB_WIPE_LOCAL=1 DB_WIPE_CONFIRM=\$(date +%s) pnpm run db:reset:local"
  exit 1
fi

# ============================================================================
# PROTECTION 2: Vérifier DB_WIPE_CONFIRM
# ============================================================================
if [ -z "$DB_WIPE_CONFIRM" ]; then
  error "PROTECTION: DB_WIPE_CONFIRM n'est pas défini"
  echo ""
  echo "Pour confirmer le wipe, définissez:"
  echo "  export DB_WIPE_CONFIRM=\$(date +%s)"
  echo ""
  exit 1
fi

# Vérifier que DB_WIPE_CONFIRM est un timestamp récent (moins de 5 minutes)
CURRENT_TIMESTAMP=$(date +%s)
TIMESTAMP_DIFF=$((CURRENT_TIMESTAMP - DB_WIPE_CONFIRM))

if [ "$TIMESTAMP_DIFF" -lt 0 ] || [ "$TIMESTAMP_DIFF" -gt 300 ]; then
  error "PROTECTION: DB_WIPE_CONFIRM invalide ou expiré"
  echo ""
  echo "DB_WIPE_CONFIRM doit être un timestamp Unix récent (moins de 5 minutes)."
  echo "Générez-le avec: export DB_WIPE_CONFIRM=\$(date +%s)"
  echo ""
  exit 1
fi

# ============================================================================
# PROTECTION 3: Vérifier le switch de production
# ============================================================================
SWITCH_PATH=".db-switch.json"
USE_PRODUCTION=false

if [ -f "$SWITCH_PATH" ]; then
  # Vérifier si le switch est activé (production)
  if command -v jq > /dev/null 2>&1; then
    USE_PRODUCTION=$(jq -r '.useProduction // false' "$SWITCH_PATH" 2>/dev/null || echo "false")
  else
    # Fallback si jq n'est pas installé
    if grep -q '"useProduction"[[:space:]]*:[[:space:]]*true' "$SWITCH_PATH" 2>/dev/null; then
      USE_PRODUCTION="true"
    fi
  fi
fi

if [ "$USE_PRODUCTION" = "true" ]; then
  error "PROTECTION: Le switch de production est activé!"
  echo ""
  echo "Le fichier .db-switch.json indique que vous utilisez la base de PRODUCTION."
  echo ""
  echo "Ce script ne peut PAS être utilisé avec une base de production."
  echo ""
  echo "Pour utiliser ce script:"
  echo "  1. Désactivez le switch de production dans /admin/configuration"
  echo "  2. OU modifiez .db-switch.json pour mettre useProduction à false"
  echo ""
  exit 1
fi

# ============================================================================
# PROTECTION 4: Vérifier DATABASE_URL
# ============================================================================
# Charger .env.local si disponible
if [ -f ".env.local" ]; then
  set -a
  source .env.local
  set +a
fi

DATABASE_URL="${DATABASE_URL:-}"

if [ -z "$DATABASE_URL" ]; then
  error "DATABASE_URL n'est pas défini"
  exit 1
fi

# Vérifier que c'est bien localhost/127.0.0.1
if [[ ! "$DATABASE_URL" =~ (localhost|127\.0\.0\.1) ]]; then
  error "PROTECTION: DATABASE_URL ne pointe pas vers localhost!"
  echo ""
  echo "URL actuelle: ${DATABASE_URL//:[^:@]*@/:****@}"
  echo ""
  echo "Ce script ne peut être utilisé que pour PostgreSQL LOCAL (localhost:5433)"
  echo ""
  exit 1
fi

# Vérifier le port (devrait être 5433 pour local)
if [[ ! "$DATABASE_URL" =~ :543[23] ]]; then
  warning "ATTENTION: Port non standard détecté dans DATABASE_URL"
  echo "   URL: ${DATABASE_URL//:[^:@]*@/:****@}"
  echo ""
  read -p "Continuer quand même? (o/N) " -n 1 -r
  echo ""
  if [[ ! $REPLY =~ ^[OoYy]$ ]]; then
    echo "Annulé"
    exit 0
  fi
fi

# Vérifier qu'il n'y a pas de domaines de production (double vérification)
PROD_DOMAINS=("neon.tech" "vercel" "production" "prod" "aws" "amazonaws")
for domain in "${PROD_DOMAINS[@]}"; do
  if [[ "$DATABASE_URL" =~ $domain ]]; then
    error "PROTECTION: DATABASE_URL contient un domaine de production!"
    echo ""
    echo "URL: ${DATABASE_URL//:[^:@]*@/:****@}"
    echo ""
    echo "Ce script ne peut PAS être utilisé avec une base de production."
    echo ""
    echo "Vérifiez que:"
    echo "  1. Le switch de production est désactivé dans /admin/configuration"
    echo "  2. DATABASE_URL pointe vers localhost:5433"
    echo ""
    exit 1
  fi
done

# ============================================================================
# AFFICHER RÉSUMÉ AVANT WIPE
# ============================================================================
echo ""
warning "⚠️  ATTENTION: Cette opération va SUPPRIMER TOUTES LES DONNÉES"
echo ""
info "Base de données cible:"
echo "   ${DATABASE_URL//:[^:@]*@/:****@}"
echo ""
info "Opérations qui seront effectuées:"
echo "   1. Arrêt des conteneurs Docker (docker compose down -v)"
echo "   2. Suppression du volume PostgreSQL (TOUTES LES DONNÉES)"
echo "   3. Redémarrage des conteneurs (docker compose up -d)"
echo "   4. Application des migrations Prisma (prisma migrate deploy)"
echo ""

# Afficher les compteurs actuels si possible
if command -v psql > /dev/null 2>&1; then
  info "État actuel de la base (si accessible):"
  if psql "$DATABASE_URL" -c "SELECT 'User' as table_name, COUNT(*) as count FROM \"User\" UNION ALL SELECT 'Project', COUNT(*) FROM \"Project\" UNION ALL SELECT 'Track', COUNT(*) FROM \"Track\";" 2>/dev/null | grep -v "table_name" | grep -v "^-" | grep -v "rows" | while read -r line; do
    echo "   $line"
  done; then
    :
  else
    echo "   (Base non accessible ou vide)"
  fi
  echo ""
fi

# Demander confirmation finale
read -p "Confirmer le wipe complet? (tapez 'WIPE' en majuscules) " -r
echo ""
if [ "$REPLY" != "WIPE" ]; then
  echo "Annulé (vous devez taper 'WIPE' en majuscules)"
  exit 0
fi

# ============================================================================
# EXÉCUTER LE WIPE
# ============================================================================
echo ""
info "Démarrage du wipe..."

# 1. Arrêter et supprimer les volumes
info "Arrêt des conteneurs et suppression des volumes..."
if docker compose down -v; then
  success "Conteneurs arrêtés et volumes supprimés"
else
  error "Erreur lors de l'arrêt des conteneurs"
  exit 1
fi

# 2. Redémarrer les conteneurs
info "Redémarrage des conteneurs..."
if docker compose up -d; then
  success "Conteneurs redémarrés"
else
  error "Erreur lors du redémarrage des conteneurs"
  exit 1
fi

# 3. Attendre que PostgreSQL soit prêt
info "Attente que PostgreSQL soit prêt..."
sleep 3

# Vérifier que PostgreSQL est healthy
for i in {1..30}; do
  if docker compose ps 2>/dev/null | grep -q "healthy"; then
    success "PostgreSQL est healthy"
    break
  fi
  if [ $i -eq 30 ]; then
    warning "PostgreSQL n'est pas encore healthy après 30 secondes"
    warning "Continuons quand même..."
  fi
  sleep 1
done

# 4. Appliquer les migrations
info "Application des migrations Prisma..."
export DATABASE_URL
if pnpm prisma migrate deploy; then
  success "Migrations appliquées"
else
  error "Erreur lors de l'application des migrations"
  exit 1
fi

# ============================================================================
# VÉRIFICATION POST-WIPE
# ============================================================================
echo ""
info "Vérification post-wipe..."

if command -v psql > /dev/null 2>&1; then
  info "État de la base après wipe:"
  if psql "$DATABASE_URL" -c "SELECT 'User' as table_name, COUNT(*) as count FROM \"User\" UNION ALL SELECT 'Project', COUNT(*) FROM \"Project\" UNION ALL SELECT 'Track', COUNT(*) FROM \"Track\";" 2>/dev/null | grep -v "table_name" | grep -v "^-" | grep -v "rows" | while read -r line; do
    echo "   $line"
  done; then
    :
  else
    echo "   (Base vide ou non accessible)"
  fi
fi

echo ""
success "Wipe terminé avec succès!"
echo ""
info "La base de données locale a été réinitialisée."
info "Pour restaurer des données depuis un backup:"
echo "   node scripts/restore-sqlite-backup-to-postgres.mjs <backup_path>"
echo ""
