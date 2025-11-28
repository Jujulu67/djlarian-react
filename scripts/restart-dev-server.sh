#!/bin/bash

# Script pour redémarrer automatiquement le serveur Next.js
# Ce script s'exécute de manière indépendante pour pouvoir tuer le processus parent

cd "$(dirname "$0")/.."

# S'assurer qu'on utilise la bonne version de Node.js depuis .nvmrc
if [ -f .nvmrc ]; then
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    nvm use > /dev/null 2>&1 || true
fi

# Attendre 2 secondes pour que l'API puisse répondre avant de tuer le processus
sleep 2

# Lire les instructions du fichier de marqueur
RESTART_MARKER=".db-restart-required.json"
NEEDS_PRISMA_GENERATE=false
NEEDS_CACHE_CLEAN=false

if [ -f "$RESTART_MARKER" ]; then
    if command -v jq > /dev/null 2>&1; then
        NEEDS_PRISMA_GENERATE=$(jq -r '.needsPrismaGenerate // false' "$RESTART_MARKER")
        NEEDS_CACHE_CLEAN=$(jq -r '.needsCacheClean // false' "$RESTART_MARKER")
    else
        # Fallback si jq n'est pas installé - lire directement avec grep
        if grep -q '"needsPrismaGenerate":\s*true' "$RESTART_MARKER" 2>/dev/null; then
            NEEDS_PRISMA_GENERATE=true
        fi
        if grep -q '"needsCacheClean":\s*true' "$RESTART_MARKER" 2>/dev/null; then
            NEEDS_CACHE_CLEAN=true
        fi
        # Par défaut, si le fichier existe, on fait les deux opérations
        if [ "$NEEDS_PRISMA_GENERATE" = "false" ] && [ "$NEEDS_CACHE_CLEAN" = "false" ]; then
            NEEDS_PRISMA_GENERATE=true
            NEEDS_CACHE_CLEAN=true
        fi
    fi
fi

# Trouver TOUS les processus Next.js (plusieurs méthodes pour être sûr)
NEXT_PIDS=$(pgrep -f "next-server" 2>/dev/null || true)
NEXT_PIDS="$NEXT_PIDS $(pgrep -f "\.bin/next dev" 2>/dev/null || true)"
NEXT_PIDS="$NEXT_PIDS $(pgrep -f "next dev" 2>/dev/null || true)"
NEXT_PIDS="$NEXT_PIDS $(pgrep -f "next-server" 2>/dev/null || true)"
NEXT_PIDS="$NEXT_PIDS $(ps aux | grep -E "node.*next|next.*dev" | grep -v grep | grep -v "restart-dev-server" | awk '{print $2}' || true)"

# Trouver aussi les processus sur les ports 3000 et 3001
PORT_PIDS=$(lsof -ti:3000,3001 2>/dev/null || true)
if [ -n "$PORT_PIDS" ]; then
    NEXT_PIDS="$NEXT_PIDS $PORT_PIDS"
fi

# Supprimer les doublons et les espaces
NEXT_PIDS=$(echo $NEXT_PIDS | tr ' ' '\n' | sort -u | tr '\n' ' ')

# Créer un fichier de signal pour indiquer qu'un redémarrage est nécessaire
RESTART_SIGNAL_FILE=".restart-server-signal"
echo "$(date)" > "$RESTART_SIGNAL_FILE"

    # Vérifier si le wrapper est actif (il surveille le fichier de signal)
    WRAPPER_PID=$(pgrep -f "start-dev-with-auto-restart" | head -1)
    
    if [ -n "$WRAPPER_PID" ]; then
        echo "✅ Signal de redémarrage envoyé au wrapper (PID: $WRAPPER_PID)"
        echo "   Le serveur redémarrera automatiquement dans le terminal..."
        exit 0
fi

# Pas de wrapper, on doit tout faire manuellement
if [ -n "$NEXT_PIDS" ]; then
    echo "📛 Arrêt de tous les processus Next.js..."
        
    # Tuer tous les processus trouvés
    for pid in $NEXT_PIDS; do
        if ps -p $pid > /dev/null 2>&1; then
            # Trouver les processus enfants
            CHILD_PIDS=$(pgrep -P $pid 2>/dev/null || true)
            for child in $CHILD_PIDS; do
                kill -9 $child 2>/dev/null || true
            done
            kill -9 $pid 2>/dev/null || true
        fi
    done
        
    sleep 2
        
    # Force kill si nécessaire (plus agressif)
    pkill -9 -f "next-server" 2>/dev/null || true
    pkill -9 -f "\.bin/next" 2>/dev/null || true
    pkill -9 -f "next dev" 2>/dev/null || true
    pkill -9 -f "turbopack" 2>/dev/null || true
    
    # Tuer aussi les processus sur les ports
    lsof -ti:3000,3001 | xargs kill -9 2>/dev/null || true
    
    sleep 1
    
    # Supprimer le verrou Next.js
    rm -f .next/dev/lock 2>/dev/null || true
    echo "✅ Verrou Next.js supprimé"
fi
        
# Attendre que tous les processus soient bien arrêtés
        sleep 1
        
# Maintenant qu'on est sûr que le serveur est arrêté, on peut faire les opérations
if [ "$NEEDS_PRISMA_GENERATE" = "true" ]; then
    echo "🔄 Régénération du client Prisma..."
    npx prisma generate > /dev/null 2>&1 || npx prisma generate
    echo "✅ Client Prisma régénéré"
fi

if [ "$NEEDS_CACHE_CLEAN" = "true" ]; then
    echo "🧹 Nettoyage du cache Next.js..."
    # Supprimer le verrou Next.js avant de nettoyer le cache
    rm -f .next/dev/lock 2>/dev/null || true
    rm -rf .next 2>/dev/null || true
    echo "✅ Cache Next.js nettoyé (verrou supprimé)"
fi

# Toujours supprimer le verrou Next.js si il existe (même si pas de nettoyage de cache)
if [ -f ".next/dev/lock" ]; then
    echo "🔓 Suppression du verrou Next.js résiduel..."
    rm -f .next/dev/lock 2>/dev/null || true
fi

# Supprimer le marqueur
rm -f "$RESTART_MARKER"

# Redémarrer en arrière-plan (fallback si pas de wrapper)
echo "🚀 Redémarrage du serveur en arrière-plan..."
npm run dev > /dev/null 2>&1 &

