#!/bin/bash

# Script pour recompiler better-sqlite3 sans utiliser les variables pnpm dépréciées
# Utilise pnpm rebuild (méthode recommandée) qui gère mieux les chemins avec espaces

cd "$(dirname "$0")/.."

# Supprimer le build existant pour forcer une recompilation complète
rm -rf node_modules/better-sqlite3/build 2>/dev/null || true

# Utiliser pnpm rebuild (méthode recommandée par les bonnes pratiques)
# Cette méthode gère mieux les chemins avec espaces et est plus fiable
if pnpm rebuild better-sqlite3 2>&1; then
    echo "✅ better-sqlite3 recompilé avec succès"
    exit 0
else
    echo "⚠️  Erreur avec pnpm rebuild, tentative avec node-gyp..."
    # Fallback: utiliser node-gyp directement si pnpm rebuild échoue
    if [ -d "node_modules/better-sqlite3" ]; then
        cd node_modules/better-sqlite3
        if npx node-gyp rebuild --release 2>&1; then
            echo "✅ better-sqlite3 recompilé avec succès (via node-gyp)"
            cd ../..
            exit 0
        else
            cd ../..
        fi
    fi
    echo "⚠️  Échec de la compilation de better-sqlite3"
    exit 0
fi

