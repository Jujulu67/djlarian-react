#!/bin/bash

# Script simple pour libérer les ports Next.js (3000, 3001, 3002)
# Usage: ./scripts/kill-ports.sh [port1] [port2] ...

cd "$(dirname "$0")/.."

# Ports par défaut si aucun argument
PORTS="${@:-3000 3001 3002}"

echo "🔌 Libération des ports..."

for port in $PORTS; do
    # Trouver les processus en LISTEN sur ce port
    PIDS=$(lsof -nP -iTCP:${port} -sTCP:LISTEN -t 2>/dev/null | tr '\n' ' ' || true)
    
    if [ -z "$PIDS" ]; then
        echo "   ✅ Port ${port} déjà libre"
    else
        echo "   🔎 Port ${port}: processus trouvés ($PIDS)"
        
        # Tentative gracieuse
        kill -TERM $PIDS 2>/dev/null || true
        sleep 0.5
        
        # Vérifier si le port est libéré
        if lsof -nP -iTCP:${port} -sTCP:LISTEN >/dev/null 2>&1; then
            # Force kill si nécessaire
            echo "      Force kill..."
            kill -KILL $PIDS 2>/dev/null || true
            sleep 0.5
        fi
        
        # Vérification finale
        if lsof -nP -iTCP:${port} -sTCP:LISTEN >/dev/null 2>&1; then
            echo "      ❌ Port ${port} toujours occupé"
        else
            echo "      ✅ Port ${port} libéré"
        fi
    fi
done

echo "✅ Terminé"
