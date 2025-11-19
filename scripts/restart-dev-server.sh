#!/bin/bash

# Script pour redémarrer automatiquement le serveur Next.js
# Ce script s'exécute de manière indépendante pour pouvoir tuer le processus parent

# Attendre 2 secondes pour que l'API puisse répondre avant de tuer le processus
sleep 2

# Trouver le processus parent Next.js
# Chercher le processus qui contient "node_modules/.bin/next dev" ou "next dev"
PARENT_PID=$(ps aux | grep -E "node.*\.bin/next dev|node.*next dev" | grep -v grep | grep -v "restart-dev-server" | awk '{print $2}' | head -1)

# Si on ne trouve pas, chercher par pgrep
if [ -z "$PARENT_PID" ]; then
    PARENT_PID=$(pgrep -f "\.bin/next dev" | head -1)
fi

# Si toujours rien, chercher tous les processus next
if [ -z "$PARENT_PID" ]; then
    PARENT_PID=$(pgrep -f "next dev" | head -1)
fi

# Créer un fichier de signal pour indiquer qu'un redémarrage est nécessaire
cd "$(dirname "$0")/.."
RESTART_SIGNAL_FILE=".restart-server-signal"
echo "$(date)" > "$RESTART_SIGNAL_FILE"

# Si le wrapper est en cours d'exécution, il détectera le signal et redémarrera automatiquement
# Sinon, on tue le processus et on le relance
if [ -n "$PARENT_PID" ]; then
    # Vérifier si le wrapper est actif (il surveille le fichier de signal)
    WRAPPER_PID=$(pgrep -f "start-dev-with-auto-restart" | head -1)
    
    if [ -n "$WRAPPER_PID" ]; then
        echo "✅ Signal de redémarrage envoyé au wrapper (PID: $WRAPPER_PID)"
        echo "   Le serveur redémarrera automatiquement dans le terminal..."
        exit 0
    else
        # Pas de wrapper, tuer et relancer manuellement
        echo "📛 Arrêt du serveur (PID: $PARENT_PID)..."
        
        # Trouver tous les processus enfants (next-server, postcss, etc.)
        CHILD_PIDS=$(pgrep -P $PARENT_PID 2>/dev/null || true)
        
        # Tuer tous les processus enfants d'abord
        if [ -n "$CHILD_PIDS" ]; then
            echo "   Arrêt des processus enfants..."
            for child in $CHILD_PIDS; do
                kill $child 2>/dev/null || true
            done
            sleep 1
        fi
        
        # Tuer le processus parent
        kill $PARENT_PID 2>/dev/null || true
        sleep 2
        
        # Vérifier si le processus est toujours actif
        if ps -p $PARENT_PID > /dev/null 2>&1; then
            echo "⚠️  Force kill nécessaire..."
            kill -9 $PARENT_PID 2>/dev/null || true
            sleep 1
        fi
        
        # Tuer tous les processus restants liés à next (au cas où)
        pkill -f "next-server" 2>/dev/null || true
        pkill -f "next dev" 2>/dev/null || true
        sleep 1
        
        # Redémarrer en arrière-plan (fallback)
        echo "🚀 Redémarrage du serveur en arrière-plan..."
        npm run dev &
    fi
else
    echo "ℹ️  Aucun processus Next.js trouvé"
    echo "   Utilisez 'npm run dev:auto' pour démarrer avec redémarrage automatique"
fi

