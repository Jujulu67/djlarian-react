#!/bin/bash

# Script wrapper pour démarrer le serveur avec redémarrage automatique
# Utilisez ce script au lieu de "npm run dev" pour avoir le redémarrage automatique
# Usage: npm run dev:auto

cd "$(dirname "$0")/.."

RESTART_SIGNAL_FILE=".restart-server-signal"
PID_FILE=".dev-server.pid"

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
    rm -f "$RESTART_SIGNAL_FILE"
    exit 0
}

trap cleanup SIGINT SIGTERM EXIT

# Fonction pour démarrer le serveur
start_server() {
    echo "🚀 Démarrage du serveur Next.js..."
    
    # Synchroniser le schéma Prisma avant de démarrer (le script npm run dev le fera aussi, mais on le fait ici pour être sûr)
    # Le script ensure-sqlite-schema.sh vérifie d'abord si c'est nécessaire, donc pas de problème de double exécution
    bash scripts/ensure-sqlite-schema.sh > /dev/null 2>&1 || bash scripts/ensure-sqlite-schema.sh
    
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
        
        # Attendre un peu pour être sûr que tout est arrêté
        sleep 2
        
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

