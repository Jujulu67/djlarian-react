# 📋 TODO - État Actuel de l'Application

**Dernière mise à jour** : Après audit des fonctionnalités projets

## ✅ Fonctionnalités Complètes

### Projets Musicaux

- ✅ **CRUD complet** : Création, lecture, modification, suppression
- ✅ **Recherche** : Recherche textuelle dans tous les champs (nom, style, label, etc.)
- ✅ **Tri personnalisé** : Tri par colonne avec toggle asc/desc
- ✅ **Export Excel** : Export vers Excel avec style et formatage
- ✅ **Import Excel** : Import de projets depuis Excel
- ✅ **Import Streams CSV** : Import des streams depuis CSV
- ✅ **Drag & Drop** : Réordonnancement des projets
- ✅ **Filtrage** : Par statut et par utilisateur (admin)
- ✅ **Édition inline** : Modification directe dans le tableau
- ✅ **Statistiques** : Vue d'ensemble avec graphiques
- ✅ **Calendrier des sorties** : Visualisation des dates de release
- ✅ **Notifications** : Système de notifications pour milestones

### Authentification

- ✅ **OAuth Google** : Connexion avec Google (100% gratuit)
- ✅ **OAuth Twitch** : Connexion avec Twitch (100% gratuit)
- ✅ **Credentials** : Authentification par email/mot de passe
- ✅ **Création automatique de compte** : Via OAuth

---

## ⏳ En Attente / À Configurer

### 1. Configuration Instagram API

**Priorité** : Moyenne  
**Statut** : Code prêt, en attente de configuration Meta Business Suite

- [ ] Finaliser l'association Page Facebook / Instagram
- [ ] Résoudre le problème du portefeuille business "Bertram Beer" dans Meta Business Suite
- [ ] Obtenir les credentials Instagram :
  - [ ] `INSTAGRAM_APP_SECRET`
  - [ ] `INSTAGRAM_USER_ID`
  - [ ] `INSTAGRAM_ACCESS_TOKEN` (long-lived)

**Fichier** : `TODO_INSTAGRAM.md` (détails complets)

---

## 🔧 Améliorations Optionnelles

### Projets Musicaux

**Priorité** : Basse

- [ ] **Bulk actions** : Sélection multiple avec checkboxes pour actions groupées
- [ ] **Historique** : Table d'audit pour tracking des modifications
- [ ] **Notifications avancées** : Notifications pour changements de statut (au-delà des milestones)

### Tests

**Priorité** : Moyenne

- [ ] **Tests ProjectsClient** : Tests unitaires pour le composant utilisateur
- [ ] **Tests ProjectTable** : Tests unitaires pour le tableau
- [ ] **Tests API projets** : Tests d'intégration pour tous les endpoints
- [ ] **Tests E2E** : Tests Cypress pour les workflows complets
- [ ] **Tests d'accessibilité** : Vérification de l'accessibilité

**Note** : Des tests existent déjà pour AdminProjectsClient, mais pas pour ProjectsClient.

### Spotify for Artists API

**Priorité** : Basse

- [ ] Implémenter l'accès à Spotify for Artists API
- [ ] Nécessite :
  - OAuth flow avec Spotify
  - Accès vérifié au compte artiste
  - Utilisation de l'API Spotify for Artists (endpoint spécifique)

**Fichier** : `src/app/api/spotify/scheduled/route.ts` ligne 43

### Refactorisation Technique

**Priorité** : Basse (amélioration technique)

- [ ] **useGameManager** : Refactoriser pour réduire la complexité
  - [ ] Créer `usePatternManager.ts`
  - [ ] Créer `useScoreManager.ts`
  - [ ] Réduire de 1185 lignes à ~400-500 lignes

**Fichier** : `src/hooks/useGameManager.PROGRESS.md`

---

## 📊 Résumé par Priorité

### Priorité Haute

Aucun

### Priorité Moyenne

1. Configuration Instagram API (code prêt, besoin de credentials)
2. Tests : Étendre la suite de tests pour ProjectsClient et ProjectTable

### Priorité Basse

1. Spotify for Artists API (OAuth nécessaire)
2. Bulk actions projets
3. Historique et notifications avancées
4. Refactorisation useGameManager

---

## 📝 Notes

- **La plupart des fonctionnalités sont complètes** : L'application est fonctionnelle et prête pour la production
- **Les TODOs restants sont principalement** :
  - Configuration externe (Instagram - Meta Business Suite)
  - Améliorations UX optionnelles
  - Tests pour améliorer la robustesse
  - Optimisations techniques

---

## 🔍 Fichiers de Référence

- **Instagram** : `TODO_INSTAGRAM.md`
- **Audit Projets** : `AUDIT_PROJETS_REPORT.md`
- **Refactorisation GameManager** : `src/hooks/useGameManager.PROGRESS.md`
