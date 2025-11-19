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
  
  # Injecter les polyfills pour intercepter createNotImplementedError AVANT Prisma
  # Même avec engineType = "library", Prisma essaie d'appeler getCurrentBinaryTarget qui utilise fs.readdir
  echo "📝 Injection des polyfills pour intercepter fs.readdir..."
  WORKER_FILE="$CLOUDFLARE_DIR/_worker.js.tmp2"
  node << 'NODE_INJECT'
    const fs = require('fs');
    const workerFile = process.env.WORKER_FILE || '.open-next/cloudflare/_worker.js.tmp2';
    
    if (!fs.existsSync(workerFile)) {
      console.error('Fichier worker non trouvé:', workerFile);
      process.exit(1);
    }
    
    const content = fs.readFileSync(workerFile, 'utf8');
    
    // Polyfills à injecter au début - intercepter createNotImplementedError pour fs.readdir
    const polyfills = `// ========================================
// Polyfills pour Prisma Client dans Cloudflare Workers
// Intercepte createNotImplementedError pour fs.readdir AVANT que Prisma ne soit chargé
// ========================================
if (typeof globalThis !== "undefined") {
  // SOLUTION CRITIQUE: Intercepter createNotImplementedError AVANT TOUT
  const originalDefineProperty = Object.defineProperty;
  Object.defineProperty = function(obj, prop, descriptor) {
    if (prop === "createNotImplementedError" && obj === globalThis) {
      const originalValue = descriptor.value;
      if (typeof originalValue === "function") {
        descriptor.value = function(name) {
          if (name && typeof name === "string" && (name.includes("readdir") || name.includes("fs.readdir"))) {
            return function() { return Promise.resolve([]); };
          }
          return originalValue(name);
        };
      }
    }
    return originalDefineProperty.apply(this, arguments);
  };
  // Aussi patcher si createNotImplementedError existe déjà
  if (typeof globalThis.createNotImplementedError !== "undefined") {
    const original = globalThis.createNotImplementedError;
    globalThis.createNotImplementedError = function(name) {
      if (name && typeof name === "string" && (name.includes("readdir") || name.includes("fs.readdir"))) {
        return function() { return Promise.resolve([]); };
      }
      return original(name);
    };
  }

  // Polyfill pour fs.readdir (retourne un tableau vide)
  if (!globalThis.fs) {
    globalThis.fs = {};
  }
  const fsReaddirImpl = (path, options, callback) => {
    if (typeof options === "function") {
      callback = options;
      options = {};
    }
    if (callback) {
      callback(null, []);
    } else {
      return Promise.resolve([]);
    }
  };
  globalThis.fs.readdir = fsReaddirImpl;
  if (!globalThis.fs.promises) {
    globalThis.fs.promises = {};
  }
  globalThis.fs.promises.readdir = () => Promise.resolve([]);
}
`;
    
    // Injecter les polyfills au début
    const newContent = polyfills + content;
    fs.writeFileSync(workerFile, newContent, 'utf8');
    console.log('✅ Polyfills injectés avec Node.js');
NODE_INJECT
  
  # Copier le fichier avec les polyfills
  cp "$CLOUDFLARE_DIR/_worker.js.tmp2" "$CLOUDFLARE_DIR/_worker.js"
  rm -f "$CLOUDFLARE_DIR/_worker.js.tmp" "$CLOUDFLARE_DIR/_worker.js.tmp2"
  
  # Patcher le code bundlé pour remplacer createNotImplementedError("fs.readdir")
  echo "📝 Patch du code bundlé pour intercepter createNotImplementedError..."
  if [ -f "$CLOUDFLARE_DIR/_worker.js" ]; then
    WORKER_PATH="$CLOUDFLARE_DIR/_worker.js" node << 'NODE_PATCH'
      const fs = require('fs');
      const path = process.env.WORKER_PATH;
      
      if (!fs.existsSync(path)) {
        process.exit(0);
      }
      
      let content = fs.readFileSync(path, 'utf8');
      let modified = false;
      const originalLength = content.length;
      
      // Pattern 1: Remplacer Object.fn[as readdir] = createNotImplementedError(...)
      const pattern1 = /Object\.fn\[as\s+readdir\]\s*=\s*createNotImplementedError\([^)]+\)/g;
      if (pattern1.test(content)) {
        content = content.replace(pattern1, 'Object.fn[as readdir]=function(){return Promise.resolve([])}');
        modified = true;
        console.log('✅ Pattern 1 trouvé et remplacé: Object.fn[as readdir]');
      }
      
      // Pattern 2: Remplacer fn[as readdir] = createNotImplementedError(...)
      const pattern2 = /fn\[as\s+readdir\]\s*=\s*createNotImplementedError\([^)]+\)/g;
      if (pattern2.test(content)) {
        content = content.replace(pattern2, 'fn[as readdir]=function(){return Promise.resolve([])}');
        modified = true;
        console.log('✅ Pattern 2 trouvé et remplacé: fn[as readdir]');
      }
      
      // Pattern 3: Patcher la fonction createNotImplementedError pour intercepter readdir
      const pattern3 = /function\s+createNotImplementedError\s*\([^)]*\)\s*\{[^}]*\}/g;
      if (pattern3.test(content)) {
        content = content.replace(pattern3, (match) => {
          if (!match.includes('readdir') && !match.includes('Promise.resolve')) {
            const patched = match.replace(
              /(throw\s+new\s+Error\()/,
              'if(typeof arguments[0]==="string"&&(arguments[0].includes("readdir")||arguments[0].includes("fs.readdir"))){return function(){return Promise.resolve([])}}$1'
            );
            if (patched !== match) {
              modified = true;
              return patched;
            }
          }
          return match;
        });
        if (modified) {
          console.log('✅ Pattern 3 trouvé et remplacé: createNotImplementedError function');
        }
      }
      
      // Pattern 4: Chercher les appels directs à createNotImplementedError avec "readdir"
      const pattern4 = /createNotImplementedError\([^)]*readdir[^)]*\)/g;
      if (pattern4.test(content)) {
        content = content.replace(pattern4, 'function(){return Promise.resolve([])}');
        modified = true;
        console.log('✅ Pattern 4 trouvé et remplacé: createNotImplementedError("readdir")');
      }
      
      // Pattern 5: Patcher getCurrentBinaryTarget pour qu'il retourne 'unknown' sans appeler fs.readdir
      // Chercher les définitions de getCurrentBinaryTarget et les remplacer
      const pattern5a = /getCurrentBinaryTarget\s*=\s*async\s*function[^}]*fs\.readdir[^}]*\}/g;
      const pattern5b = /getCurrentBinaryTarget\s*:\s*async\s*function[^}]*fs\.readdir[^}]*\}/g;
      const pattern5c = /getCurrentBinaryTarget\s*=\s*\([^)]*\)\s*=>\s*[^}]*fs\.readdir[^}]*\}/g;
      const pattern5d = /getCurrentBinaryTarget\s*:\s*\([^)]*\)\s*=>\s*[^}]*fs\.readdir[^}]*\}/g;
      
      [pattern5a, pattern5b, pattern5c, pattern5d].forEach((pattern, idx) => {
        if (pattern.test(content)) {
          content = content.replace(pattern, (match) => {
            // Remplacer par une fonction qui retourne directement 'unknown'
            return match.replace(/[^}]*fs\.readdir[^}]*/, "return 'unknown'");
          });
          modified = true;
          console.log(`✅ Pattern 5${String.fromCharCode(97+idx)} trouvé et remplacé: getCurrentBinaryTarget`);
        }
      });
      
      // Pattern 6: Remplacer les appels à getCurrentBinaryTarget() par 'unknown' directement
      // Mais seulement si c'est dans un contexte où on peut le faire sans casser le code
      // On va plutôt patcher la fonction elle-même
      const pattern6 = /(getCurrentBinaryTarget\s*[=:]\s*)(async\s*)?(function\s*\([^)]*\)|\([^)]*\)\s*=>)\s*\{[^}]*\}/g;
      if (pattern6.test(content)) {
        content = content.replace(pattern6, (match) => {
          // Si la fonction contient fs.readdir, la remplacer par une version simple
          if (match.includes('fs.readdir') || match.includes('readdir')) {
            return match.replace(/[^}]*\{[^}]*\}/, "{return Promise.resolve('unknown')}");
          }
          return match;
        });
        modified = true;
        console.log('✅ Pattern 6 trouvé et remplacé: getCurrentBinaryTarget function');
      }
      
      if (modified) {
        fs.writeFileSync(path, content, 'utf8');
        console.log(`✅ Code bundlé patché: ${originalLength} -> ${content.length} caractères`);
      } else {
        console.log('ℹ️  Aucun pattern trouvé (peut-être déjà patché ou format différent)');
      }
NODE_PATCH
    echo "✅ Patch du code bundlé terminé"
  fi
fi

# Copier les dépendances nécessaires
echo "📦 Copie des dépendances..."
[ -d ".open-next/assets" ] && cp -r .open-next/assets "$CLOUDFLARE_DIR/" 2>/dev/null || true
[ -d ".open-next/server-functions" ] && cp -r .open-next/server-functions "$CLOUDFLARE_DIR/" 2>/dev/null || true
[ -d ".open-next/middleware" ] && cp -r .open-next/middleware "$CLOUDFLARE_DIR/" 2>/dev/null || true
[ -d ".open-next/.build" ] && cp -r .open-next/.build "$CLOUDFLARE_DIR/" 2>/dev/null || true

# Injecter les mêmes polyfills dans server-functions
echo "📝 Injection des polyfills dans server-functions..."
SERVER_FUNCTIONS_INDEX="$CLOUDFLARE_DIR/server-functions/default/index.mjs"
if [ -f "$SERVER_FUNCTIONS_INDEX" ]; then
  SERVER_FUNCTIONS_FILE="$SERVER_FUNCTIONS_INDEX"
  node << 'NODE_INJECT_SF'
    const fs = require('fs');
    const serverFunctionsFile = process.env.SERVER_FUNCTIONS_FILE || '.open-next/cloudflare/server-functions/default/index.mjs';
    
    if (!fs.existsSync(serverFunctionsFile)) {
      console.error('Fichier server-functions non trouvé:', serverFunctionsFile);
      process.exit(1);
    }
    
    const content = fs.readFileSync(serverFunctionsFile, 'utf8');
    
    // Mêmes polyfills que pour _worker.js
    const polyfills = `// ========================================
// Polyfills pour Prisma Client dans Cloudflare Workers
// Intercepte createNotImplementedError pour fs.readdir AVANT que Prisma ne soit chargé
// ========================================
if (typeof globalThis !== "undefined") {
  const originalDefineProperty = Object.defineProperty;
  Object.defineProperty = function(obj, prop, descriptor) {
    if (prop === "createNotImplementedError" && obj === globalThis) {
      const originalValue = descriptor.value;
      if (typeof originalValue === "function") {
        descriptor.value = function(name) {
          if (name && typeof name === "string" && (name.includes("readdir") || name.includes("fs.readdir"))) {
            return function() { return Promise.resolve([]); };
          }
          return originalValue(name);
        };
      }
    }
    return originalDefineProperty.apply(this, arguments);
  };
  if (typeof globalThis.createNotImplementedError !== "undefined") {
    const original = globalThis.createNotImplementedError;
    globalThis.createNotImplementedError = function(name) {
      if (name && typeof name === "string" && (name.includes("readdir") || name.includes("fs.readdir"))) {
        return function() { return Promise.resolve([]); };
      }
      return original(name);
    };
  }
  if (!globalThis.fs) {
    globalThis.fs = {};
  }
  const fsReaddirImpl = (path, options, callback) => {
    if (typeof options === "function") {
      callback = options;
      options = {};
    }
    if (callback) {
      callback(null, []);
    } else {
      return Promise.resolve([]);
    }
  };
  globalThis.fs.readdir = fsReaddirImpl;
  if (!globalThis.fs.promises) {
    globalThis.fs.promises = {};
  }
  globalThis.fs.promises.readdir = () => Promise.resolve([]);
}
`;
    
    const newContent = polyfills + content;
    fs.writeFileSync(serverFunctionsFile, newContent, 'utf8');
    console.log('✅ Polyfills server-functions injectés avec Node.js');
NODE_INJECT_SF
  echo "✅ Polyfills injectés dans server-functions/default/index.mjs"
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
