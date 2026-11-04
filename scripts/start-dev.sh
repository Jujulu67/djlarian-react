#!/bin/bash

# Script simplifié pour démarrer le serveur de développement
# Avec le hot swap DB, plus besoin de redémarrage automatique lors des switchs
# Usage: pnpm run dev:auto

cd "$(dirname "$0")/.."

PID_FILE=".dev-server.pid"

# Fonction pour vérifier et démarrer Docker si nécessaire
check_and_start_docker() {
    if ! command -v docker > /dev/null 2>&1; then
        echo "⚠️  Docker n'est pas installé. Veuillez l'installer pour utiliser PostgreSQL."
        return 1
    fi
    
    if docker info > /dev/null 2>&1; then
        echo "✅ Docker est déjà démarré"
        return 0
    fi
    
    echo "🐳 Docker n'est pas démarré, tentative de démarrage..."
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        if [ -d "/Applications/Docker.app" ]; then
            echo "   Démarrage de Docker Desktop..."
            open -a Docker 2>/dev/null || {
                echo "   ⚠️  Impossible de démarrer Docker Desktop automatiquement"
                return 1
            }
        else
            echo "   ⚠️  Docker Desktop n'est pas installé dans /Applications"
            return 1
        fi
    else
        if command -v systemctl > /dev/null 2>&1; then
            echo "   Démarrage du service Docker..."
            sudo systemctl start docker 2>/dev/null || {
                echo "   ⚠️  Impossible de démarrer Docker automatiquement"
                return 1
            }
        else
            echo "   ⚠️  Impossible de démarrer Docker automatiquement sur ce système"
            return 1
        fi
    fi
    
    echo "   ⏳ Attente que Docker soit prêt..."
    for i in {1..30}; do
        if docker info > /dev/null 2>&1; then
            echo "   ✅ Docker est prêt!"
            return 0
        fi
        echo "      Tentative $i/30..."
        sleep 2
    done
    
    echo "   ⚠️  Docker n'est pas prêt après 60 secondes"
    return 1
}

# Fonction pour démarrer PostgreSQL local
start_postgres() {
    if ! check_and_start_docker; then
        echo "⚠️  Docker n'est pas disponible. PostgreSQL ne sera pas démarré."
        return 1
    fi
    
    if ! command -v docker-compose > /dev/null 2>&1 && ! docker compose version > /dev/null 2>&1; then
        echo "⚠️  Docker Compose n'est pas installé. PostgreSQL ne sera pas démarré."
        return 1
    fi
    
    echo "🐘 Démarrage de PostgreSQL local..."
    
    if docker compose ps 2>/dev/null | grep -q "djlarian-postgres-local.*Up"; then
        echo "   PostgreSQL est déjà en cours d'exécution"
        if docker compose ps 2>/dev/null | grep -q "healthy"; then
            echo "   ✅ PostgreSQL est healthy"
            return 0
        fi
    else
        if command -v docker-compose > /dev/null 2>&1; then
            docker-compose up -d postgres > /dev/null 2>&1
        else
            docker compose up -d postgres > /dev/null 2>&1
        fi
    fi
    
    echo "   ⏳ Attente que PostgreSQL soit prêt..."
    for i in {1..30}; do
        if docker compose ps 2>/dev/null | grep -q "healthy"; then
            echo "   ✅ PostgreSQL démarré et healthy (port 5433)"
            return 0
        fi
        sleep 1
    done
    
    echo "   ⚠️  PostgreSQL démarré mais pas encore healthy (peut prendre quelques secondes)"
    return 1
}

# Fonction pour nettoyer à la sortie
cleanup() {
    echo ""
    echo "🛑 Arrêt du serveur..."
    if [ -f "$PID_FILE" ]; then
        OLD_PID=$(cat "$PID_FILE")
        if ps -p $OLD_PID > /dev/null 2>&1; then
            pkill -P $OLD_PID 2>/dev/null || true
            kill $OLD_PID 2>/dev/null || true
            sleep 1
            if ps -p $OLD_PID > /dev/null 2>&1; then
                kill -9 $OLD_PID 2>/dev/null || true
            fi
        fi
        rm -f "$PID_FILE"
    fi
    
    exit 0
}

trap cleanup SIGINT SIGTERM EXIT

# Démarrer PostgreSQL
start_postgres

# Fonction pour démarrer le serveur
start_server() {
    echo "🚀 Démarrage du serveur Next.js..."
    
    # S'assurer qu'on utilise la bonne version de Node.js depuis .nvmrc
    if [ -f .nvmrc ]; then
        echo "📦 Chargement de la version Node.js depuis .nvmrc..."
        if [ -s "$HOME/.nvm/nvm.sh" ]; then
            source "$HOME/.nvm/nvm.sh" 2>/dev/null || true
            nvm use 2>&1
            if [ $? -eq 0 ]; then
                NODE_VERSION=$(node --version 2>/dev/null || echo "unknown")
                echo "   ✅ Node.js version: $NODE_VERSION"
            else
                echo "   ⚠️  Impossible de charger la version depuis .nvmrc"
            fi
        else
            echo "   ⚠️  nvm non trouvé, utilisation de la version Node.js actuelle"
        fi
    fi
    
    # Vérifier et libérer le port 3000 si nécessaire
    if lsof -nP -iTCP:3000 -sTCP:LISTEN >/dev/null 2>&1; then
        echo "   Port 3000 occupé, libération..."
        bash scripts/kill-ports.sh 3000 >/dev/null 2>&1 || true
        sleep 0.5
    fi
    
    # Supprimer le verrou Next.js s'il existe
    rm -f .next/dev/lock 2>/dev/null || true
    
    # Lancer next dev
    NODE_OPTIONS='--import tsx' pnpm next dev &
    SERVER_PID=$!
    echo $SERVER_PID > "$PID_FILE"
    echo "   Serveur démarré (PID: $SERVER_PID)"
    
    # Attendre que le processus se termine
    wait $SERVER_PID
    SERVER_EXIT_CODE=$?
    
    rm -f "$PID_FILE"
    return $SERVER_EXIT_CODE
}

# Démarrer le serveur
start_server
