# Larian - Site Web Officiel

Site web officiel de Larian, développé avec Next.js 16, React, TypeScript et TailwindCSS.

## 🎵 Caractéristiques

- Design moderne et immersif
- Visualiseur musical interactif
- Interface responsive et animations fluides
- Intégration Twitch pour les streams en direct
- Section événements et actualités
- Galerie média et discographie
- Système de gestion de projet musical intégré
- Authentification OAuth (Google, Twitch) - 100% gratuit

## 🚀 Technologies

- **Framework**: Next.js 16 (App Router)
- **Frontend**: React, TypeScript, TailwindCSS
- **Base de données**: Prisma ORM 7 avec PostgreSQL/SQLite
- **Authentification**: NextAuth.js v5 avec OAuth
- **Déploiement**: Vercel

## 📚 Documentation

La documentation technique complète est disponible dans le dossier [`/docs`](docs/).

### Documentation Principale

- **[Architecture](docs/01-ARCHITECTURE.md)** - Vue d'ensemble, diagrammes, patterns
- **[Choix Techniques](docs/02-CHOIX-TECHNIQUES.md)** - Stack technique et justifications
- **[Infrastructure et Déploiement](docs/03-INFRA-DEPLOIEMENT.md)** - Guide de déploiement complet
- **[Guide de Développement](docs/04-GUIDE-DEV.md)** - Installation, conventions, workflow

### Table des Matières

Voir [docs/INDEX.md](docs/INDEX.md) pour la navigation complète.

## 🛠 Installation Rapide

```bash
# Cloner le repository
git clone https://github.com/votre-username/larian-react.git
cd larian-react

# Installer les dépendances
pnpm install

# Configurer l'environnement
cp .env.example .env.local  # Créer et configurer .env.local

# Setup base de données
pnpm run db:setup:local

# Lancer le serveur de développement
pnpm run dev
```

Pour plus de détails, voir le [Guide de Développement](docs/04-GUIDE-DEV.md).

## 🔐 Authentification OAuth

L'application supporte l'authentification OAuth via Google et Twitch (100% gratuit) :

- ✅ **Connexion avec Google** : Création automatique de compte
- ✅ **Connexion avec Twitch** : Création automatique de compte
- ✅ **Authentification par email/mot de passe** : Alternative classique

**Guides de configuration** :

- 🚀 **Guide rapide** : [docs/OAUTH_QUICK_START.md](docs/OAUTH_QUICK_START.md) (10-15 min par provider)
- 📚 **Guide complet** : [docs/OAUTH_SETUP.md](docs/OAUTH_SETUP.md) (détails et dépannage)

## 🧪 Tests

```bash
# Exécuter tous les tests
pnpm test

# Tests en mode watch
pnpm run test:watch

# Tests avec couverture
pnpm run test:coverage

# Tests pour CI/CD (avec vérification des seuils)
pnpm run test:ci

# Vérifier les seuils de coverage
pnpm run test:coverage:check

# Tests E2E Playwright (base PostgreSQL locale, voir e2e/README.md)
pnpm test:e2e

# Mesures de dette technique (voir docs/DETTE-TECHNIQUE.md)
pnpm debt
```

### Seuils de Coverage

Les tests bloquent automatiquement si les seuils suivants ne sont pas atteints :

- **Statements** : 60%
- **Branches** : 50%
- **Functions** : 50%
- **Lines** : 60%

⚠️ **Important** :

- **En local/test** : `pnpm run build` lance automatiquement les tests (`test:ci`) et bloque si les seuils ne sont pas atteints
- **En production sur Vercel** : Les tests sont automatiquement ignorés lors du build pour ne pas bloquer le déploiement

## 📜 License

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à ouvrir une issue ou un pull request.

Pour contribuer :

1. Lire la [documentation](docs/)
2. Suivre les [conventions de code](docs/04-GUIDE-DEV.md#conventions-de-code)
3. Écrire des tests pour les nouvelles fonctionnalités
4. Créer une pull request avec description claire

---

**Documentation complète** : Voir [docs/INDEX.md](docs/INDEX.md)
