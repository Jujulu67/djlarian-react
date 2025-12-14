#!/bin/bash
# Script pour attendre que PostgreSQL soit prêt

PG_URL="${1:-postgresql://djlarian:djlarian_dev_password@localhost:5433/djlarian_dev?sslmode=disable}"
MAX_WAIT=60
WAIT_INTERVAL=2

echo "⏳ Attente que PostgreSQL soit prêt..."
echo "   URL: ${PG_URL//:[^:@]*@/:****@}"

for i in $(seq 1 $MAX_WAIT); do
  if docker compose ps 2>/dev/null | grep -q "healthy"; then
    # Tester la connexion
    if command -v psql &> /dev/null; then
      if psql "$PG_URL" -c "SELECT 1" &>/dev/null; then
        echo "✅ PostgreSQL est prêt!"
        exit 0
      fi
    else
      # Tester avec Node.js
      if node -e "const {Pool}=require('pg');const p=new Pool({connectionString:'$PG_URL'});p.query('SELECT 1').then(()=>{p.end();process.exit(0)}).catch(()=>{p.end();process.exit(1)})" 2>/dev/null; then
        echo "✅ PostgreSQL est prêt!"
        exit 0
      fi
    fi
  fi
  
  if [ $((i % 5)) -eq 0 ]; then
    echo "   ... toujours en attente ($i/$MAX_WAIT secondes)"
  fi
  
  sleep $WAIT_INTERVAL
done

echo "❌ Timeout: PostgreSQL n'est pas prêt après $MAX_WAIT secondes"
echo "   Vérifiez que Docker est démarré: docker compose up -d"
exit 1
