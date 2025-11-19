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
  ' "$CLOUDFLARE_DIR/_worker.js.tmp" > "$CLOUDFLARE_DIR/_worker.js.tmp2"
  
  # Ajouter les polyfills pour fs.readdir et node:os au début du fichier
  # IMPORTANT: Ces polyfills doivent être chargés AVANT tout autre code
  echo "📝 Ajout des polyfills pour fs.readdir et node:os..."
  awk '
    BEGIN {
      # Polyfills pour fs.readdir et node:os
      print "// ========================================"
      print "// Polyfills pour Prisma Client dans Cloudflare Workers"
      print "// Ces polyfills doivent être chargés AVANT Prisma"
      print "// ========================================"
      print "if (typeof globalThis !== \"undefined\") {"
      print "  // Polyfill pour node:os"
      print "  if (!globalThis.os) {"
      print "    globalThis.os = {"
      print "      platform: () => \"cloudflare\","
      print "      arch: () => \"wasm32\","
      print "      type: () => \"Cloudflare Workers\","
      print "      release: () => \"\","
      print "      homedir: () => \"/\","
      print "      tmpdir: () => \"/tmp\","
      print "      hostname: () => \"cloudflare-worker\","
      print "      cpus: () => [],"
      print "      totalmem: () => 0,"
      print "      freemem: () => 0,"
      print "      networkInterfaces: () => ({}),"
      print "      getPriority: () => 0,"
      print "      setPriority: () => {},"
      print "      userInfo: () => ({ username: \"\", uid: 0, gid: 0, shell: \"\" }),"
      print "      loadavg: () => [0, 0, 0],"
      print "      uptime: () => 0,"
      print "      endianness: () => \"LE\","
      print "      EOL: \"\\n\","
      print "      constants: {}"
      print "    };"
      print "  }"
      print ""
      print "  // Polyfill pour fs.readdir (retourne un tableau vide)"
      print "  // IMPORTANT: Ce polyfill doit être disponible avant que Prisma ne soit chargé"
      print "  if (!globalThis.fs) {"
      print "    globalThis.fs = {};"
      print "  }"
      print "  const fsReaddirImpl = (path, options, callback) => {"
      print "    if (typeof options === \"function\") {"
      print "      callback = options;"
      print "      options = {};"
      print "    }"
      print "    if (callback) {"
      print "      callback(null, []);"
      print "    } else {"
      print "      return Promise.resolve([]);"
      print "    }"
      print "  };"
      print "  globalThis.fs.readdir = fsReaddirImpl;"
      print "  if (!globalThis.fs.promises) {"
      print "    globalThis.fs.promises = {};"
      print "  }"
      print "  globalThis.fs.promises.readdir = () => Promise.resolve([]);"
      print ""
      print "  // SOLUTION CRITIQUE: Patcher unenv de manière agressive"
      print "  // unenv est le système de polyfills utilisé par Cloudflare Workers"
      print "  // Il faut patcher fs.readdir AVANT que Prisma ne soit chargé"
      print "  const patchUnenv = () => {"
      print "    try {"
      print "      if (globalThis.unenv && typeof globalThis.unenv === \"object\") {"
      print "        if (!globalThis.unenv.fs) {"
      print "          globalThis.unenv.fs = globalThis.fs;"
      print "        } else {"
      print "          globalThis.unenv.fs.readdir = fsReaddirImpl;"
      print "          if (!globalThis.unenv.fs.promises) {"
      print "            globalThis.unenv.fs.promises = {};"
      print "          }"
      print "          globalThis.unenv.fs.promises.readdir = () => Promise.resolve([]);"
      print "        }"
      print "        if (!globalThis.unenv.os) {"
      print "          globalThis.unenv.os = globalThis.os;"
      print "        }"
      print "      }"
      print "    } catch (e) {"
      print "      // Ignorer"
      print "    }"
      print "  };"
      print "  patchUnenv();"
      print "}"
      print ""
    }
    { print }
  ' "$CLOUDFLARE_DIR/_worker.js.tmp2" > "$CLOUDFLARE_DIR/_worker.js"
  rm -f "$CLOUDFLARE_DIR/_worker.js.tmp" "$CLOUDFLARE_DIR/_worker.js.tmp2"
  
  # SOLUTION RADICALE: Patcher directement le code bundlé pour remplacer createNotImplementedError
  # unenv crée cette fonction dans le code bundlé, il faut la remplacer
  echo "📝 Patch du code bundlé pour intercepter createNotImplementedError..."
  if [ -f "$CLOUDFLARE_DIR/_worker.js" ]; then
    # Remplacer les appels à createNotImplementedError pour fs.readdir
    # Utiliser une approche compatible macOS/Linux
    if [[ "$OSTYPE" == "darwin"* ]]; then
      # macOS
      sed -i '' \
        -e 's/createNotImplementedError("fs\.readdir")/function() { return []; }/g' \
        -e "s/createNotImplementedError('fs\.readdir')/function() { return []; }/g" \
        -e 's/createNotImplementedError("\[unenv\] fs\.readdir")/function() { return []; }/g' \
        -e "s/createNotImplementedError('\[unenv\] fs\.readdir')/function() { return []; }/g" \
        "$CLOUDFLARE_DIR/_worker.js" 2>/dev/null || true
    else
      # Linux
      sed -i \
        -e 's/createNotImplementedError("fs\.readdir")/function() { return []; }/g' \
        -e "s/createNotImplementedError('fs\.readdir')/function() { return []; }/g" \
        -e 's/createNotImplementedError("\[unenv\] fs\.readdir")/function() { return []; }/g' \
        -e "s/createNotImplementedError('\[unenv\] fs\.readdir')/function() { return []; }/g" \
        "$CLOUDFLARE_DIR/_worker.js" 2>/dev/null || true
    fi
    echo "✅ Code bundlé patché pour intercepter createNotImplementedError"
  fi
fi

# Copier les dépendances nécessaires
echo "📦 Copie des dépendances..."
[ -d ".open-next/assets" ] && cp -r .open-next/assets "$CLOUDFLARE_DIR/" 2>/dev/null || true
[ -d ".open-next/server-functions" ] && cp -r .open-next/server-functions "$CLOUDFLARE_DIR/" 2>/dev/null || true
[ -d ".open-next/middleware" ] && cp -r .open-next/middleware "$CLOUDFLARE_DIR/" 2>/dev/null || true
[ -d ".open-next/.build" ] && cp -r .open-next/.build "$CLOUDFLARE_DIR/" 2>/dev/null || true

# Injecter les polyfills dans les server-functions
echo "📝 Injection des polyfills dans les server-functions..."
SERVER_FUNCTIONS_INDEX="$CLOUDFLARE_DIR/server-functions/default/index.mjs"
if [ -f "$SERVER_FUNCTIONS_INDEX" ]; then
  echo "📝 Ajout des polyfills au début de index.mjs..."
  awk '
    BEGIN {
      # Polyfills pour fs.readdir et node:os
      print "// ========================================"
      print "// Polyfills pour Prisma Client dans Cloudflare Workers"
      print "// Ces polyfills doivent être chargés AVANT Prisma"
      print "// ========================================"
      print "if (typeof globalThis !== \"undefined\") {"
      print "  // Polyfill pour node:os"
      print "  if (!globalThis.os) {"
      print "    globalThis.os = {"
      print "      platform: () => \"cloudflare\","
      print "      arch: () => \"wasm32\","
      print "      type: () => \"Cloudflare Workers\","
      print "      release: () => \"\","
      print "      homedir: () => \"/\","
      print "      tmpdir: () => \"/tmp\","
      print "      hostname: () => \"cloudflare-worker\","
      print "      cpus: () => [],"
      print "      totalmem: () => 0,"
      print "      freemem: () => 0,"
      print "      networkInterfaces: () => ({}),"
      print "      getPriority: () => 0,"
      print "      setPriority: () => {},"
      print "      userInfo: () => ({ username: \"\", uid: 0, gid: 0, shell: \"\" }),"
      print "      loadavg: () => [0, 0, 0],"
      print "      uptime: () => 0,"
      print "      endianness: () => \"LE\","
      print "      EOL: \"\\n\","
      print "      constants: {}"
      print "    };"
      print "  }"
      print ""
      print "  // Polyfill pour fs.readdir (retourne un tableau vide)"
      print "  // IMPORTANT: Ce polyfill doit être disponible avant que Prisma ne soit chargé"
      print "  if (!globalThis.fs) {"
      print "    globalThis.fs = {};"
      print "  }"
      print "  const fsReaddirImpl = (path, options, callback) => {"
      print "    if (typeof options === \"function\") {"
      print "      callback = options;"
      print "      options = {};"
      print "    }"
      print "    if (callback) {"
      print "      callback(null, []);"
      print "    } else {"
      print "      return Promise.resolve([]);"
      print "    }"
      print "  };"
      print "  globalThis.fs.readdir = fsReaddirImpl;"
      print "  if (!globalThis.fs.promises) {"
      print "    globalThis.fs.promises = {};"
      print "  }"
      print "  globalThis.fs.promises.readdir = () => Promise.resolve([]);"
      print ""
      print "  // SOLUTION CRITIQUE: Patcher unenv de manière agressive"
      print "  // unenv est le système de polyfills utilisé par Cloudflare Workers"
      print "  // Il faut patcher fs.readdir AVANT que Prisma ne soit chargé"
      print "  const patchUnenv = () => {"
      print "    try {"
      print "      if (globalThis.unenv && typeof globalThis.unenv === \"object\") {"
      print "        if (!globalThis.unenv.fs) {"
      print "          globalThis.unenv.fs = globalThis.fs;"
      print "        } else {"
      print "          globalThis.unenv.fs.readdir = fsReaddirImpl;"
      print "          if (!globalThis.unenv.fs.promises) {"
      print "            globalThis.unenv.fs.promises = {};"
      print "          }"
      print "          globalThis.unenv.fs.promises.readdir = () => Promise.resolve([]);"
      print "        }"
      print "        if (!globalThis.unenv.os) {"
      print "          globalThis.unenv.os = globalThis.os;"
      print "        }"
      print "      }"
      print "    } catch (e) {"
      print "      // Ignorer"
      print "    }"
      print "  };"
      print "  patchUnenv();"
      print "}"
      print ""
    }
    { print }
  ' "$SERVER_FUNCTIONS_INDEX" > "$SERVER_FUNCTIONS_INDEX.tmp"
  mv "$SERVER_FUNCTIONS_INDEX.tmp" "$SERVER_FUNCTIONS_INDEX"
  echo "✅ Polyfills injectés dans server-functions/default/index.mjs"
  
  # SOLUTION RADICALE: Patcher directement le code bundlé pour remplacer createNotImplementedError
  echo "📝 Patch du code bundlé server-functions pour intercepter createNotImplementedError..."
  if [ -f "$SERVER_FUNCTIONS_INDEX" ]; then
    # Remplacer les appels à createNotImplementedError pour fs.readdir
    # Utiliser une approche compatible macOS/Linux
    if [[ "$OSTYPE" == "darwin"* ]]; then
      # macOS
      sed -i '' \
        -e 's/createNotImplementedError("fs\.readdir")/function() { return []; }/g' \
        -e "s/createNotImplementedError('fs\.readdir')/function() { return []; }/g" \
        -e 's/createNotImplementedError("\[unenv\] fs\.readdir")/function() { return []; }/g' \
        -e "s/createNotImplementedError('\[unenv\] fs\.readdir')/function() { return []; }/g" \
        "$SERVER_FUNCTIONS_INDEX" 2>/dev/null || true
    else
      # Linux
      sed -i \
        -e 's/createNotImplementedError("fs\.readdir")/function() { return []; }/g' \
        -e "s/createNotImplementedError('fs\.readdir')/function() { return []; }/g" \
        -e 's/createNotImplementedError("\[unenv\] fs\.readdir")/function() { return []; }/g' \
        -e "s/createNotImplementedError('\[unenv\] fs\.readdir')/function() { return []; }/g" \
        "$SERVER_FUNCTIONS_INDEX" 2>/dev/null || true
    fi
    echo "✅ Code bundlé server-functions patché"
  fi
fi

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
  "exclude": ["/_next/static/*"]
}
EOF
  else
    # Mettre à jour _routes.json pour exclure les assets statiques
    echo "📝 Mise à jour de _routes.json pour exclure les assets statiques..."
    if ! grep -q '"/_next/static/\*"' "$CLOUDFLARE_DIR/_routes.json" 2>/dev/null; then
      # Utiliser Python pour modifier le JSON de manière sûre
      python3 << 'PYTHON_SCRIPT'
import json
import sys

routes_file = sys.argv[1]
try:
    with open(routes_file, 'r') as f:
        routes = json.load(f)
    
    if "exclude" not in routes:
        routes["exclude"] = []
    
    if "/_next/static/*" not in routes["exclude"]:
        routes["exclude"].append("/_next/static/*")
    
    with open(routes_file, 'w') as f:
        json.dump(routes, f, indent=2)
    
    print("✅ _routes.json mis à jour")
except Exception as e:
    print(f"⚠️  Erreur lors de la mise à jour de _routes.json: {e}")
    # Fallback: recréer le fichier
    with open(routes_file, 'w') as f:
        json.dump({
            "version": 1,
            "include": ["/*"],
            "exclude": ["/_next/static/*"]
        }, f, indent=2)
    print("✅ _routes.json recréé")
PYTHON_SCRIPT
      "$CLOUDFLARE_DIR/_routes.json"
    fi
  fi

echo "✅ Configuration Cloudflare Pages terminée !"

