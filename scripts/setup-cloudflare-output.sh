#!/bin/bash

# Script pour configurer la sortie OpenNext pour Cloudflare Pages
# Ce script copie les fichiers nécessaires dans .open-next/cloudflare/

set -e

CLOUDFLARE_DIR=".open-next/cloudflare"

echo "🔧 Configuration de la sortie Cloudflare Pages..."

# Créer le dossier functions s'il n'existe pas
mkdir -p "$CLOUDFLARE_DIR/functions"

# Copier le worker dans functions/_worker.js avec les bons imports
if [ -f ".open-next/worker.js" ]; then
  echo "📝 Copie du worker dans functions/_worker.js..."
  # Remplacer les imports pour pointer vers les bons chemins depuis functions/
  sed 's|\./cloudflare/|../cloudflare/|g; s|\./middleware/|../middleware/|g; s|\./server-functions/|../server-functions/|g; s|\./\.build/|../.build/|g' .open-next/worker.js > "$CLOUDFLARE_DIR/functions/_worker.js"
fi

# Copier les dépendances nécessaires
echo "📦 Copie des dépendances..."
[ -d ".open-next/assets" ] && cp -r .open-next/assets "$CLOUDFLARE_DIR/" 2>/dev/null || true
[ -d ".open-next/server-functions" ] && cp -r .open-next/server-functions "$CLOUDFLARE_DIR/" 2>/dev/null || true
[ -d ".open-next/middleware" ] && cp -r .open-next/middleware "$CLOUDFLARE_DIR/" 2>/dev/null || true
[ -d ".open-next/.build" ] && cp -r .open-next/.build "$CLOUDFLARE_DIR/" 2>/dev/null || true

# Créer _routes.json si il n'existe pas
if [ ! -f "$CLOUDFLARE_DIR/_routes.json" ]; then
  echo "📝 Création de _routes.json..."
  cat > "$CLOUDFLARE_DIR/_routes.json" << 'EOF'
{
  "version": 1,
  "include": ["/*"],
  "exclude": []
}
EOF
fi

echo "✅ Configuration Cloudflare Pages terminée !"

