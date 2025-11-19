#!/bin/bash

# Script pour tester l'application Cloudflare localement avec wrangler dev
# Cela évite de devoir rebuild à chaque fois

set -e

echo "🧪 Test local Cloudflare avec wrangler dev"
echo "==========================================="

# Vérifier que wrangler est installé
if ! command -v wrangler &> /dev/null && ! command -v npx &> /dev/null; then
  echo "❌ wrangler n'est pas disponible"
  echo "📦 Installation de wrangler..."
  npm install -g wrangler
fi

# Vérifier que le build existe
if [ ! -f ".open-next/cloudflare/_worker.js" ]; then
  echo "⚠️  Le build n'existe pas. Construction du build..."
  npm run pages:build
fi

# Vérifier que wrangler.toml existe
if [ ! -f "wrangler.toml" ]; then
  echo "⚠️  wrangler.toml n'existe pas. Création d'un fichier temporaire..."
  cat > wrangler.toml << 'EOF'
name = "djlarian-react"
compatibility_date = "2024-01-01"
compatibility_flags = ["nodejs_compat"]

[env.development]
vars = { NODE_ENV = "development", CF_PAGES = "1", NEXT_RUNTIME = "nodejs" }
EOF
fi

WORKER_FILE=".open-next/cloudflare/_worker.js"
BUILD_DIR=".open-next/cloudflare"

echo "🚀 Démarrage de wrangler dev..."
echo "📍 Worker: $WORKER_FILE"
echo "📍 Build dir: $BUILD_DIR"
echo ""

# Lancer wrangler dev avec les variables d'environnement
# wrangler dev utilise Miniflare en interne
if command -v wrangler &> /dev/null; then
  WRANGLER_CMD="wrangler"
else
  WRANGLER_CMD="npx wrangler"
fi

# Créer un fichier .dev.vars temporaire pour les secrets
if [ ! -f ".dev.vars" ]; then
  echo "📝 Création de .dev.vars pour les variables d'environnement..."
  cat > .dev.vars << EOF
DATABASE_URL=${DATABASE_URL:-}
NEXTAUTH_SECRET=${NEXTAUTH_SECRET:-}
NEXTAUTH_URL=http://127.0.0.1:8787
NODE_ENV=development
CF_PAGES=1
NEXT_RUNTIME=nodejs
EOF
  echo "✅ .dev.vars créé (ajoutez vos secrets si nécessaire)"
fi

# Lancer wrangler dev
cd "$BUILD_DIR" || exit 1
$WRANGLER_CMD dev _worker.js \
  --port 8787 \
  --host 127.0.0.1 \
  --local \
  --compatibility-date 2024-01-01 \
  --compatibility-flags nodejs_compat

