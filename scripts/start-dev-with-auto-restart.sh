#!/bin/bash

# Script wrapper pour démarrer le serveur avec redémarrage automatique
# Utilisez ce script au lieu de "npm run dev" pour avoir le redémarrage automatique
# Usage: npm run dev:auto

cd "$(dirname "$0")/.."

RESTART_SIGNAL_FILE=".restart-server-signal"
PID_FILE=".dev-server.pid"

UMAMI_PID_FILE=".umami-docker.pid"

# Fonction pour démarrer Umami
start_umami() {
    if ! command -v docker > /dev/null 2>&1; then
        echo "⚠️  Docker n'est pas installé. Umami ne sera pas démarré."
        return
    fi
    
    if ! command -v docker-compose > /dev/null 2>&1 && ! docker compose version > /dev/null 2>&1; then
        echo "⚠️  Docker Compose n'est pas installé. Umami ne sera pas démarré."
        return
    fi
    
    echo "📊 Démarrage d'Umami Analytics..."
    
    # Vérifier si Umami est déjà en cours d'exécution
    if docker ps | grep -q "umami"; then
        echo "   Umami est déjà en cours d'exécution"
        return
    fi
    
    # Démarrer Umami avec docker-compose (utilise .env.local)
    if command -v docker-compose > /dev/null 2>&1; then
        docker-compose --env-file .env.local up -d umami db > /dev/null 2>&1
    else
        docker compose --env-file .env.local up -d umami db > /dev/null 2>&1
    fi
    
    if [ $? -eq 0 ]; then
        echo "   ✅ Umami démarré (http://localhost:3001)"
        echo $$ > "$UMAMI_PID_FILE"
    else
        echo "   ⚠️  Erreur lors du démarrage d'Umami"
    fi
}

# Fonction pour arrêter Umami
stop_umami() {
    if [ ! -f "$UMAMI_PID_FILE" ]; then
        return
    fi
    
    echo "📊 Arrêt d'Umami..."
    if command -v docker-compose > /dev/null 2>&1; then
        docker-compose --env-file .env.local stop umami db > /dev/null 2>&1 || true
    else
        docker compose --env-file .env.local stop umami db > /dev/null 2>&1 || true
    fi
    rm -f "$UMAMI_PID_FILE"
}

# Fonction pour nettoyer à la sortie
cleanup() {
    echo ""
    echo "🛑 Arrêt du serveur..."
    if [ -f "$PID_FILE" ]; then
        OLD_PID=$(cat "$PID_FILE")
        if ps -p $OLD_PID > /dev/null 2>&1; then
            # Tuer le processus et ses enfants
            pkill -P $OLD_PID 2>/dev/null || true
            kill $OLD_PID 2>/dev/null || true
            sleep 1
            if ps -p $OLD_PID > /dev/null 2>&1; then
                kill -9 $OLD_PID 2>/dev/null || true
            fi
        fi
        rm -f "$PID_FILE"
    fi
    stop_umami
    rm -f "$RESTART_SIGNAL_FILE"
    exit 0
}

trap cleanup SIGINT SIGTERM EXIT

# Démarrer Umami au début
start_umami

# Fonction pour démarrer le serveur
start_server() {
    echo "🚀 Démarrage du serveur Next.js..."
    
    # Synchroniser le schéma Prisma avant de démarrer (le script npm run dev le fera aussi, mais on le fait ici pour être sûr)
    # Le script ensure-sqlite-schema.sh vérifie d'abord si c'est nécessaire, donc pas de problème de double exécution
    bash scripts/ensure-sqlite-schema.sh > /dev/null 2>&1 || bash scripts/ensure-sqlite-schema.sh
    
    # S'assurer qu'on utilise la bonne version de Node.js depuis .nvmrc
    if [ -f .nvmrc ]; then
        source "$HOME/.nvm/nvm.sh" 2>/dev/null || true
        nvm use > /dev/null 2>&1 || true
    fi
    
    # Lancer npm run dev en arrière-plan et capturer son PID
    # npm run dev exécute aussi ensure-sqlite-schema.sh, mais c'est rapide et garantit la synchronisation
    npm run dev &
    NPM_PID=$!
    echo $NPM_PID > "$PID_FILE"
    echo "   Serveur démarré (PID: $NPM_PID)"
    
    # Attendre que le processus npm se termine (il reste actif tant que next tourne)
    wait $NPM_PID
    SERVER_EXIT_CODE=$?
    
    # Le processus s'est arrêté
    rm -f "$PID_FILE"
    return $SERVER_EXIT_CODE
}

# Démarrer le serveur initial
start_server

# Boucle de surveillance du fichier de signal
while true; do
    if [ -f "$RESTART_SIGNAL_FILE" ]; then
        echo ""
        echo "🔄 Signal de redémarrage détecté..."
        rm -f "$RESTART_SIGNAL_FILE"
        
        # Lire les instructions du fichier de marqueur
        RESTART_MARKER=".db-restart-required.json"
        NEEDS_PRISMA_GENERATE=false
        NEEDS_CACHE_CLEAN=false
        
        if [ -f "$RESTART_MARKER" ]; then
            if command -v jq > /dev/null 2>&1; then
                NEEDS_PRISMA_GENERATE=$(jq -r '.needsPrismaGenerate // false' "$RESTART_MARKER")
                NEEDS_CACHE_CLEAN=$(jq -r '.needsCacheClean // false' "$RESTART_MARKER")
            else
                # Fallback si jq n'est pas installé
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
        
        # Arrêter le serveur actuel et tous les processus liés
        if [ -f "$PID_FILE" ]; then
            OLD_PID=$(cat "$PID_FILE")
            if ps -p $OLD_PID > /dev/null 2>&1; then
                echo "   Arrêt du serveur actuel (PID: $OLD_PID)..."
                # Tuer tous les processus enfants d'abord
                pkill -P $OLD_PID 2>/dev/null || true
                sleep 1
                # Tuer le processus parent
                kill $OLD_PID 2>/dev/null || true
                sleep 2
                if ps -p $OLD_PID > /dev/null 2>&1; then
                    kill -9 $OLD_PID 2>/dev/null || true
                fi
            fi
            rm -f "$PID_FILE"
        fi
        
        # Tuer tous les processus next restants pour être sûr
        pkill -f "next-server" 2>/dev/null || true
        pkill -f "\.bin/next dev" 2>/dev/null || true
        pkill -f "npm.*dev" 2>/dev/null || true
        
        # Attendre que tous les processus soient bien arrêtés
        sleep 2
        
        # Maintenant qu'on est sûr que le serveur est arrêté, on peut faire les opérations
        if [ "$NEEDS_PRISMA_GENERATE" = "true" ]; then
            echo "🔄 Régénération du client Prisma..."
            npx prisma generate > /dev/null 2>&1 || npx prisma generate
            # Corriger les fichiers default.js et default.mjs pour Prisma 7
            node scripts/fix-prisma-types.mjs > /dev/null 2>&1 || node scripts/fix-prisma-types.mjs
            echo "✅ Client Prisma régénéré"
        fi
        
        if [ "$NEEDS_CACHE_CLEAN" = "true" ]; then
            echo "🧹 Nettoyage du cache Next.js..."
            rm -rf .next 2>/dev/null || true
            echo "✅ Cache Next.js nettoyé"
        fi
        
        # Supprimer le marqueur
        rm -f "$RESTART_MARKER"
        
        # Attendre un peu avant de redémarrer pour laisser le temps au système de se stabiliser
        sleep 1
        
        # Redémarrer le serveur
        start_server
    else
        # Vérifier si le serveur est toujours actif
        if [ -f "$PID_FILE" ]; then
            CHECK_PID=$(cat "$PID_FILE")
            if ! ps -p $CHECK_PID > /dev/null 2>&1; then
                # Le serveur s'est arrêté sans signal
                echo ""
                echo "⚠️  Le serveur s'est arrêté inattenduement."
                rm -f "$PID_FILE"
                # Ne pas sortir, continuer à surveiller pour un redémarrage
            fi
        fi
        sleep 0.5
    fi
done

