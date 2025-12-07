# Configuration d'Umami Analytics

Ce document explique comment configurer [Umami Analytics](https://umami.is/) pour recueillir et afficher les statistiques du site web Larian.

## Qu'est-ce qu'Umami?

Umami est une alternative légère à Google Analytics, respectueuse de la vie privée:

- 100% open source
- Auto-hébergée ou service hébergé
- Pas de cookies
- Conforme au RGPD
- Script léger (< 2KB)

## État actuel de l'installation

Umami est actuellement installé et configuré avec Docker Compose dans le projet. L'installation fonctionne comme suit:

- Instance Umami accessible sur **http://localhost:3001**
- Base de données PostgreSQL pour stocker les données
- Identifiants par défaut: `admin` / `umami`
- Un site configuré: "Djlarian Dev"

### Configuration Docker

Le fichier `docker-compose.yml` à la racine du projet gère l'installation:

```yaml
version: '3'
services:
  umami:
    image: ghcr.io/umami-software/umami:postgresql-latest
    ports:
      - '3001:3000' # Exposition sur le port 3001 pour éviter conflit avec l'app Next.js (port 3000)
    environment:
      DATABASE_URL: postgresql://umami:${POSTGRES_PASSWORD}@db:5432/umami
      DATABASE_TYPE: postgresql
      HASH_SALT: ${HASH_SALT}
    depends_on:
      - db
    restart: always
    networks:
      - umami-network
  db:
    image: postgres:14-alpine
    environment:
      POSTGRES_DB: umami
      POSTGRES_USER: umami
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - umami-db-data:/var/lib/postgresql/data
    restart: always
    networks:
      - umami-network

volumes:
  umami-db-data:

networks:
  umami-network:
    driver: bridge
```

## Variables d'environnement

Les variables sont configurées dans le fichier `.env`:

```
# Pour Docker et Umami backend
POSTGRES_PASSWORD=umami_password
HASH_SALT=votre_salt_secret

# Pour l'API Umami (utilisé par analytics.ts)
# Note: Ces variables sont nécessaires pour le serveur uniquement
UMAMI_USERNAME=admin
UMAMI_PASSWORD=umami

# Pour l'accès côté client
NEXT_PUBLIC_UMAMI_USERNAME=admin
NEXT_PUBLIC_UMAMI_PASSWORD=umami
NEXT_PUBLIC_UMAMI_URL=http://localhost:3001
NEXT_PUBLIC_UMAMI_WEBSITE_ID=484ec662-e403-4498-a654-ca04b9b504c3
```

## Intégration dans l'application

### Composants clés

1. **UmamiScript.tsx** (`src/components/analytics/UmamiScript.tsx`)
   - Intègre le script de tracking Umami dans le site
   - Utilisé dans le layout principal

2. **analytics.ts** (`src/lib/analytics.ts`)
   - Fonctions pour récupérer les statistiques via l'API Umami
   - Utilise les variables d'environnement avec préfixe NEXT*PUBLIC*
   - Inclut des fonctions de secours pour générer des données de démo si Umami n'est pas configuré

3. **Page de statistiques** (`src/app/(routes)/admin/statistics/page.tsx`)
   - Affiche les statistiques collectées par Umami
   - Affiche également les données de la base de données (utilisateurs, événements, morceaux)

## Utilisation et maintenance

### Démarrage

Pour démarrer Umami:

```bash
docker-compose up -d
```

### Accès à l'interface d'administration

1. Accédez à http://localhost:3001
2. Connectez-vous avec:
   - Nom d'utilisateur: `admin`
   - Mot de passe: `umami`

### Vérification des données

Une fois l'application en cours d'exécution:

1. Visitez différentes pages du site pour générer des données
2. Consultez le tableau de bord Umami pour voir les visites en temps réel
3. Accédez à la page de statistiques dans le panel admin

## Dépannage

### Les statistiques n'apparaissent pas

1. Vérifiez que Docker est en cours d'exécution avec `docker ps | grep umami`
2. Assurez-vous que les variables d'environnement sont correctement configurées (en particulier celles avec préfixe NEXT*PUBLIC*)
3. Consultez les logs Docker avec `docker logs larian-react-umami-1`

### Réinitialisation

Si nécessaire, vous pouvez réinitialiser complètement Umami:

```bash
docker-compose down -v  # Supprime aussi les volumes (perte de données)
docker-compose up -d    # Redémarre les conteneurs
```

### Ressources

- Documentation officielle: [umami.is/docs](https://umami.is/docs)
- GitHub Umami: [github.com/umami-software/umami](https://github.com/umami-software/umami)
