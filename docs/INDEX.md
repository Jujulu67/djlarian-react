# Documentation Technique - DJ Larian

Bienvenue dans la documentation technique complète du projet DJ Larian. Cette documentation centralise toute la connaissance du projet et sert de source de vérité unique.

## 📚 Table des Matières

### 1. [Architecture du Projet](01-ARCHITECTURE.md)

Vue d'ensemble complète de l'architecture du projet :

- Diagrammes Mermaid (C4, Flowchart, Séquence)
- Structure détaillée du projet
- Patterns architecturaux
- Gestion d'état
- Flux d'authentification
- Modèles de données
- Sécurité et performance

**À lire si** : Vous voulez comprendre comment le projet est structuré et comment les différentes parties interagissent.

### 2. [Choix Techniques](02-CHOIX-TECHNIQUES.md)

Stack technique complète et justifications des choix :

- Stack technique (Frontend, Backend, Base de données)
- Dépendances majeures avec versions
- Justifications des choix (Next.js, Prisma, NextAuth, etc.)
- Configuration TypeScript et Next.js
- Scripts NPM
- Performance et optimisations

**À lire si** : Vous voulez comprendre pourquoi certaines technologies ont été choisies et comment elles sont configurées.

### 3. [Infrastructure et Déploiement](03-INFRA-DEPLOIEMENT.md)

Guide complet pour l'infrastructure et le déploiement :

- Environnements (développement, production)
- Variables d'environnement complètes
- Configuration Docker
- Déploiement Vercel et Cloudflare Pages
- Base de données (SQLite, PostgreSQL/Neon)
- Stockage (Vercel Blob)
- Configuration OAuth (Google, Twitch)
- Monitoring (Sentry, Umami, Vercel Analytics)
- Dépannage

**À lire si** : Vous voulez déployer l'application ou configurer l'infrastructure.

### 4. [Guide de Développement](04-GUIDE-DEV.md)

Guide complet pour les développeurs :

- Installation et configuration initiale
- Commandes de développement
- Structure du projet
- Conventions de code
- Workflow Git
- Débogage
- Tests
- Bonnes pratiques
- Problèmes courants

**À lire si** : Vous voulez commencer à développer sur le projet.

## 🚀 Démarrage Rapide

### Pour les Développeurs

1. **Installation** : Suivez le [Guide de Développement](04-GUIDE-DEV.md#installation)
2. **Architecture** : Lisez [Architecture du Projet](01-ARCHITECTURE.md) pour comprendre la structure
3. **Choix Techniques** : Consultez [Choix Techniques](02-CHOIX-TECHNIQUES.md) pour comprendre la stack

### Pour le Déploiement

1. **Infrastructure** : Suivez [Infrastructure et Déploiement](03-INFRA-DEPLOIEMENT.md)
2. **Variables d'environnement** : Configurez toutes les variables requises
3. **Base de données** : Configurez Neon DB et appliquez les migrations

## 📖 Navigation Rapide

### Par Sujet

#### Architecture

- [Vue d'ensemble](01-ARCHITECTURE.md#vue-densemble)
- [Diagrammes](01-ARCHITECTURE.md#diagramme-c4---niveau-système)
- [Structure du projet](01-ARCHITECTURE.md#structure-du-projet)
- [Patterns architecturaux](01-ARCHITECTURE.md#patterns-architecturaux)

#### Technologies

- [Stack technique](02-CHOIX-TECHNIQUES.md#stack-technique-complète)
- [Dépendances](02-CHOIX-TECHNIQUES.md#dépendances-majeures)
- [Justifications](02-CHOIX-TECHNIQUES.md#justifications-des-choix)
- [Configuration](02-CHOIX-TECHNIQUES.md#configuration-typescript)

#### Déploiement

- [Environnements](03-INFRA-DEPLOIEMENT.md#environnements)
- [Variables d'environnement](03-INFRA-DEPLOIEMENT.md#variables-denvironnement)
- [Déploiement Vercel](03-INFRA-DEPLOIEMENT.md#déploiement-vercel)
- [Base de données](03-INFRA-DEPLOIEMENT.md#base-de-données)

#### Développement

- [Installation](04-GUIDE-DEV.md#installation)
- [Commandes](04-GUIDE-DEV.md#commandes-de-développement)
- [Conventions](04-GUIDE-DEV.md#conventions-de-code)
- [Tests](04-GUIDE-DEV.md#tests)

## 🔗 Ressources Externes

### Documentation Officielle

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [Prisma Documentation](https://www.prisma.io/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)
- [TailwindCSS Documentation](https://tailwindcss.com/docs)
- [NextAuth.js Documentation](https://next-auth.js.org)
- [Zod Documentation](https://zod.dev)

### Services Utilisés

- [Vercel](https://vercel.com/docs)
- [Neon DB](https://neon.tech/docs)
- [Vercel Blob](https://vercel.com/docs/storage/vercel-blob)
- [Sentry](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Umami Analytics](https://umami.is/docs)

## 📝 Notes Importantes

### Source de Vérité Unique

Cette documentation dans `/docs` est la **source de vérité unique** pour le projet. Toute documentation dispersée dans le projet a été migrée ici.

### Mise à Jour

Cette documentation doit être mise à jour lors de :

- Changements d'architecture majeurs
- Ajout de nouvelles dépendances
- Modifications de configuration
- Changements de workflow

### Contribution

Pour contribuer à la documentation :

1. Modifier les fichiers dans `/docs`
2. Vérifier que les liens sont valides
3. Tester les diagrammes Mermaid
4. Mettre à jour l'INDEX si nécessaire

## 🆘 Besoin d'Aide ?

### Problèmes Courants

- **Installation** : Voir [Guide de Développement - Problèmes Courants](04-GUIDE-DEV.md#problèmes-courants)
- **Déploiement** : Voir [Infrastructure et Déploiement - Dépannage](03-INFRA-DEPLOIEMENT.md#dépannage)
- **Architecture** : Voir [Architecture du Projet](01-ARCHITECTURE.md)

### Support

- **Issues GitHub** : Pour signaler des bugs ou demander des fonctionnalités
- **Documentation** : Cette documentation pour les questions techniques
- **Code** : Le code source pour comprendre l'implémentation

## ✅ Checklist de Documentation

Lors de l'ajout d'une nouvelle fonctionnalité :

- [ ] Architecture mise à jour si nécessaire
- [ ] Choix techniques documentés si nouvelle dépendance
- [ ] Variables d'environnement ajoutées si nécessaire
- [ ] Guide de développement mis à jour si workflow change
- [ ] Tests documentés si nouvelle méthode de test

---

**Dernière mise à jour** : Voir l'historique Git des fichiers de documentation.

**Maintenu par** : L'équipe de développement DJ Larian.
