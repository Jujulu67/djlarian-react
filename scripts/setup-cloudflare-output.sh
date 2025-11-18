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
  
  # AUSSI copier le worker à la racine pour Cloudflare Pages (fallback)
  # Les imports doivent être ajustés : les fichiers cloudflare sont à la racine, pas dans cloudflare/
  echo "📝 Copie du worker à la racine du build output..."
  sed 's|\.\./cloudflare/|./|g; s|\./cloudflare/|./|g; s|\.\./middleware/|./middleware/|g; s|\.\./server-functions/|./server-functions/|g; s|\.\./\.build/|./.build/|g' "$CLOUDFLARE_DIR/functions/_worker.js" > "$CLOUDFLARE_DIR/_worker.js.tmp"
  
  # Ajouter la logique pour servir les assets statiques avant le middleware
  echo "📝 Ajout de la logique pour servir les assets statiques..."
  awk '
    /const url = new URL\(request\.url\);/ {
      print $0
      print ""
      print "            // Serve static assets (_next/static) directly from ASSETS"
      print "            if (url.pathname.startsWith(\"/_next/static/\")) {"
      print "                const assetResponse = await env.ASSETS?.fetch(request);"
      print "                if (assetResponse && assetResponse.status !== 404) {"
      print "                    return assetResponse;"
      print "                }"
      print "            }"
      print ""
      next
    }
    { print }
  ' "$CLOUDFLARE_DIR/_worker.js.tmp" > "$CLOUDFLARE_DIR/_worker.js"
  rm -f "$CLOUDFLARE_DIR/_worker.js.tmp"
fi

# Copier les dépendances nécessaires
echo "📦 Copie des dépendances..."
[ -d ".open-next/assets" ] && cp -r .open-next/assets "$CLOUDFLARE_DIR/" 2>/dev/null || true
[ -d ".open-next/server-functions" ] && cp -r .open-next/server-functions "$CLOUDFLARE_DIR/" 2>/dev/null || true
[ -d ".open-next/middleware" ] && cp -r .open-next/middleware "$CLOUDFLARE_DIR/" 2>/dev/null || true
[ -d ".open-next/.build" ] && cp -r .open-next/.build "$CLOUDFLARE_DIR/" 2>/dev/null || true

# Déplacer les assets _next à la racine pour que Cloudflare Pages les serve correctement
if [ -d "$CLOUDFLARE_DIR/assets/_next" ]; then
  echo "📦 Déplacement de _next à la racine pour servir les assets statiques..."
  cp -r "$CLOUDFLARE_DIR/assets/_next" "$CLOUDFLARE_DIR/" 2>/dev/null || true
fi

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

