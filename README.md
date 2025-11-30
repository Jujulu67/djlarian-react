# DJ Larian - Site Web Officiel

Site web officiel de DJ Larian, développé avec Next.js 14, React et TailwindCSS.

## 🎵 Caractéristiques

- Design moderne et immersif
- Visualiseur musical interactif
- Interface responsive et animations fluides
- Intégration Twitch pour les streams en direct
- Section événements et actualités
- Galerie média et discographie
- **Système de gestion de projet musical intégré** (voir détails ci-dessous)

## 📊 Gestion de Projets Musicaux

Le système de gestion de projets permet de suivre l'ensemble du workflow musical, de la conception à la release :

### Fonctionnalités principales

- **CRUD complet** : Création, lecture, modification et suppression de projets
- **Édition inline** : Modification directe dans le tableau (clic sur une cellule)
- **Filtres avancés** : Par statut, nom, style, collaborateur, label, etc.
- **Recherche** : Recherche textuelle dans tous les champs
- **Tri personnalisé** : Tri par colonne (nom, date, statut, streams, etc.)
- **Drag & Drop** : Réordonnancement des projets par glisser-déposer
- **Import/Export** : Import Excel et export des projets
- **Statistiques détaillées** :
  - Vue d'ensemble avec graphiques
  - Évolution des streams par projet (J7, J14, J21, J28, J56, J84)
  - Répartition par année et statut
  - Métriques globales (totaux, moyennes, maximums)
- **Calendrier des sorties** : Visualisation des dates de release
- **Suivi des streams** : Enregistrement des streams à différents jalons
- **Gestion des statuts** : EN_COURS, TERMINE, ANNULE, A_REWORK, GHOST_PRODUCTION

### Vue administrateur

- Visualisation de tous les projets utilisateurs
- Filtrage par utilisateur
- Statistiques globales
- Mode lecture seule pour respecter la vie privée

### Optimisations performance

- **Cache intelligent** : Réduction des requêtes DB
- **Agrégats SQL** : Calculs rapides même avec beaucoup de projets
- **Debounce** : Optimisation des appels API
- **Pagination optionnelle** : Support pour grandes listes

Voir [docs/PROJECTS_OPTIMIZATION.md](docs/PROJECTS_OPTIMIZATION.md) pour les détails techniques.

## 🚀 Technologies

- **Framework**: Next.js 14
- **Frontend**: React, TailwindCSS, Framer Motion
- **Styling**: TailwindCSS, SCSS
- **Animations**: GSAP, Framer Motion
- **Base de données**: Prisma avec PostgreSQL
- **Authentification**: NextAuth.js avec OAuth (Google, Twitch)
- **Déploiement**: Vercel

## 🔐 Authentification OAuth

L'application supporte l'authentification OAuth via Google et Twitch (100% gratuit) :

- ✅ **Connexion avec Google** : Création automatique de compte
- ✅ **Connexion avec Twitch** : Création automatique de compte
- ✅ **Authentification par email/mot de passe** : Alternative classique

Voir [docs/OAUTH_SETUP.md](docs/OAUTH_SETUP.md) pour le guide complet de configuration.

## 🛠 Installation

1. Clonez le repository

```bash
git clone https://github.com/votre-username/djlarian-react.git
```

2. Installez les dépendances

```bash
cd djlarian-react
npm install
```

3. Créez un fichier `.env.local` et ajoutez les variables d'environnement nécessaires

```env
NEXT_PUBLIC_API_URL=votre_url_api
NEXT_PUBLIC_SITE_URL=votre_url_site
```

4. Lancez le serveur de développement

```bash
npm run dev
```

## 📝 Structure du Projet

```
djlarian-react/
├── app/                   # App router Next.js
├── components/           # Composants React réutilisables
├── lib/                 # Utilitaires et configurations
├── public/             # Assets statiques
├── styles/            # Styles globaux et variables
└── types/            # Types TypeScript
```

## 🧪 Tests

Le projet inclut une suite de tests unitaires complète :

```bash
# Exécuter tous les tests
npm test

# Tests en mode watch
npm run test:watch

# Tests avec couverture
npm run test:coverage

# Tests en CI
npm run test:ci
```

**Couverture des tests :**

- Endpoints API (`/api/projects/**`)
- Composants clients (`ProjectsClient`, `AdminProjectsClient`)
- Hooks et utilitaires

## ⚡ Optimisations Performance

Le projet a été optimisé pour réduire les requêtes DB et améliorer les performances :

- **Cache intelligent** : Cache de 60s-5min avec invalidation automatique
- **Agrégats SQL** : Utilisation de COUNT/GROUP BY au lieu de calculs en mémoire
- **Debounce** : Réduction des appels API lors des changements de filtres
- **Endpoint dédié** : `/api/projects/counts` pour les totaux légers

Voir [docs/PROJECTS_OPTIMIZATION.md](docs/PROJECTS_OPTIMIZATION.md) pour plus de détails.

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à ouvrir une issue ou un pull request.

## 📜 License

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

# Stratégie de linting

## Objectif

Avoir une base de code lisible, robuste et maintenable, sans viser la perfection immédiate ni perdre du temps sur des détails non critiques.

## Dossiers ignorés

- `.next/`, `node_modules/`, `public/`, `dist/`, `coverage/` sont exclus du lint pour éviter les faux positifs.

## Règles assouplies

- Certaines règles bruyantes sont en warning (voir `.eslintrc.json`) :
  - `@next/next/no-img-element` (usage de `<img>` parfois volontaire)
  - `react-hooks/exhaustive-deps` (bruit sur les hooks)
  - `react/no-unescaped-entities` (guillemets/apostrophes dans le JSX)

## Correction automatique

- Utiliser `npm run lint:fix` pour corriger automatiquement un maximum d’erreurs.
- Les erreurs critiques (accessibilité, typage, conventions majeures) doivent être corrigées en priorité.
- Les warnings sont traités progressivement, au fil de l’eau.

## Processus d’amélioration continue

- Le lint est exécuté à chaque commit via `lint-staged` et `husky`.
- L’objectif est de réduire le nombre d’erreurs/warnings à chaque itération, sans bloquer l’équipe.
- Toute nouvelle fonctionnalité doit respecter les règles existantes.

## Philosophie

- Pragmatisme : on ne vise pas le "lint 0" immédiat, mais une amélioration continue.
- Communication : toute règle assouplie ou désactivée est documentée et justifiée.
- Évolution : la configuration est réévaluée régulièrement selon la maturité du projet.
