# DJ Larian - Site Web Officiel

Site web officiel de DJ Larian, développé avec Next.js 14, React et TailwindCSS.

## 🎵 Caractéristiques

- Design moderne et immersif
- Visualiseur musical interactif
- Interface responsive et animations fluides
- Intégration Twitch pour les streams en direct
- Section événements et actualités
- Galerie média et discographie
- Système de gestion de projet musical intégré

## 🚀 Technologies

- **Framework**: Next.js 14
- **Frontend**: React, TailwindCSS, Framer Motion
- **Styling**: TailwindCSS, SCSS
- **Animations**: GSAP, Framer Motion
- **Base de données**: Prisma avec PostgreSQL
- **Authentification**: NextAuth.js
- **Déploiement**: Vercel

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
