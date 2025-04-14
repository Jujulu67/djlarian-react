# Déploiement en Production - Statistiques Umami

Ce document décrit les étapes nécessaires pour déployer l'application avec les statistiques Umami configurées pour l'environnement de production.

## 1. Configuration d'Umami

Vous avez deux options pour déployer Umami :

### Option 1 : Auto-hébergé

1.  Suivez la documentation officielle d'Umami pour déployer votre propre instance sur le serveur de votre choix (ex: DigitalOcean, AWS, OVHcloud).
2.  Configurez votre serveur web (Nginx, Apache) pour servir Umami, potentiellement avec un certificat SSL pour HTTPS.
3.  Assurez-vous que la base de données (PostgreSQL ou MySQL) est correctement configurée et accessible par votre instance Umami.

### Option 2 : Service Hébergé

1.  Utilisez un service d'hébergement qui supporte Umami, comme :
    - [Umami Cloud](https://cloud.umami.is/) (Solution officielle payante)
    - [Vercel](https://vercel.com/) (Avec les templates communautaires)
    - [Railway](https://railway.app/)
    - [Netlify](https://www.netlify.com/)
2.  Suivez les instructions spécifiques du fournisseur pour déployer et configurer votre instance Umami.

Une fois votre instance Umami déployée (quelle que soit l'option choisie), notez :

- **L'URL de votre instance Umami**
- **L'ID de suivi de votre site (Website ID)**

## 2. Variables d'Environnement de l'Application

Mettez à jour (ou créez) le fichier `.env.production` à la racine de votre projet avec les variables nécessaires pour Umami :

```dotenv
# Exemple .env.production

# URL publique de votre instance Umami
NEXT_PUBLIC_UMAMI_URL="https://votre-instance-umami.com"
# ID de suivi du site obtenu depuis votre tableau de bord Umami
NEXT_PUBLIC_UMAMI_WEBSITE_ID="VOTRE_WEBSITE_ID"

# --- Autres variables de production ---
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require" # Adaptez selon votre base de données
# ... autres variables ...
```

**Important :** N'incluez jamais de clés secrètes ou de mots de passe directement dans le code source. Utilisez les variables d'environnement.

## 3. Vérification du Script de Tracking

Assurez-vous que le composant `UmamiScript` (ou le code de suivi équivalent) est inclus dans votre fichier de layout principal (probablement `src/app/layout.tsx` ou similaire), afin qu'il soit présent sur toutes les pages :

```typescript
// Exemple dans src/app/layout.tsx
import UmamiScript from '@/components/analytics/UmamiScript'; // Adaptez le chemin

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        {/* ... autres balises head ... */}
      </head>
      <body>
        {children}
        <UmamiScript /> {/* Inclusion du script Umami */}
      </body>
    </html>
  );
}
```

## 4. Configuration de Prisma pour la Production

1.  **Adapter le `schema.prisma` :**
    Assurez-vous que le `datasource` dans `prisma/schema.prisma` est configuré pour utiliser la variable d'environnement `DATABASE_URL` qui pointera vers votre base de données de production.

    ```prisma
    // prisma/schema.prisma
    datasource db {
      provider = "postgresql" // ou mysql, sqlite selon votre choix
      url      = env("DATABASE_URL")
    }

    generator client {
      provider = "prisma-client-js"
    }

    // ... vos modèles ...
    ```

2.  **Configurer la Variable `DATABASE_URL` :**
    Dans l'environnement de votre serveur de production (ou via les secrets de votre plateforme d'hébergement), définissez la variable `DATABASE_URL` avec la chaîne de connexion de votre base de données de production.

## 5. Procédure de Déploiement

### A. Préparation Locale (Optionnel mais recommandé)

1.  **Installer les dépendances :**
    ```bash
    npm install
    # ou yarn install, pnpm install
    ```
2.  **Construire l'application pour la production :**
    ```bash
    npm run build
    # ou yarn build, pnpm build
    ```

### B. Déploiement sur le Serveur

La méthode exacte dépend de votre hébergeur (Vercel, Netlify, serveur dédié, etc.). Les étapes générales sont :

1.  **Transférer les fichiers :** Envoyez le code source (ou le build `/.next`) sur votre serveur/plateforme. Pour les plateformes comme Vercel/Netlify, cela se fait souvent via Git.
2.  **Installer les dépendances (si non incluses dans le build) :**
    ```bash
    npm install --production
    # ou équivalent yarn/pnpm
    ```
3.  **Appliquer les migrations Prisma :**
    _Important :_ Faites une sauvegarde de votre base de données avant d'appliquer les migrations.
    ```bash
    npx prisma migrate deploy
    ```
4.  **Générer le client Prisma (si non inclus dans le build) :**
    Cette étape peut être nécessaire si le client n'est pas généré lors du `build` ou si vous ne transférez pas `node_modules`.
    ```bash
    npx prisma generate
    ```
5.  **Démarrer l'application :**
    ```bash
    npm run start
    # ou yarn start, pnpm start
    ```
    Cela exécute généralement la commande `next start`. Assurez-vous que l'application tourne sur le bon port et est gérée par un processus manager comme `pm2` ou le système d'init de votre serveur pour la robustesse.

## 6. Vérification Après Déploiement

1.  **Accéder au site :** Ouvrez votre site en production dans un navigateur.
2.  **Vérifier le chargement du script Umami :**
    - Ouvrez les outils de développement du navigateur (F12).
    - Allez dans l'onglet "Réseau" (Network).
    - Rafraîchissez la page.
    - Filtrez les requêtes (par exemple, par "umami" ou le nom du script, souvent `script.js` chargé depuis votre `NEXT_PUBLIC_UMAMI_URL`). Vérifiez qu'il se charge avec un statut 200.
    - Vérifiez également dans l'onglet "Console" qu'il n'y a pas d'erreurs JavaScript liées à Umami.
3.  **Vérifier les logs serveur :** Consultez les logs de votre application Node.js et de votre serveur web pour détecter d'éventuelles erreurs au démarrage ou lors des requêtes.
4.  **Vérifier le tableau de bord Umami :**
    - Effectuez quelques actions sur votre site (visitez différentes pages, cliquez sur des liens).
    - Connectez-vous à votre tableau de bord Umami.
    - Vérifiez que les nouvelles visites et actions apparaissent (cela peut prendre quelques instants).

---

Si toutes ces étapes sont validées, votre déploiement avec Umami en production devrait être réussi !
