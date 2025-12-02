# TODO - Fonctionnalités à Implémenter

Ce fichier liste tous les TODOs restants dans le codebase, organisés par domaine fonctionnel.

## 📋 Vue d'ensemble

**Total**: 9 TODOs restants

- **Administration Live**: 8 TODOs
- **Intégration Spotify**: 1 TODO

---

## 🎮 Administration Live

### Actions (useAdminLiveActions.ts)

#### 1. Refresh des sockets

- **Fichier**: `src/app/(routes)/admin/live/hooks/useAdminLiveActions.ts:112`
- **Description**: Implémenter le refresh des sockets pour rafraîchir les connexions WebSocket actives
- **État actuel**: Fonction vide avec toast de succès factice
- **Priorité**: Basse

#### 2. Ajout de loyalty

- **Fichier**: `src/app/(routes)/admin/live/hooks/useAdminLiveActions.ts:121`
- **Description**: Implémenter l'ajout de points de fidélité (loyalty) aux utilisateurs
- **État actuel**: Fonction vide avec toast informatif
- **Priorité**: Basse

#### 3. Notification Discord

- **Fichier**: `src/app/(routes)/admin/live/hooks/useAdminLiveActions.ts:126`
- **Description**: Implémenter l'envoi de notifications Discord (probablement via webhook)
- **État actuel**: Fonction vide avec toast informatif
- **Priorité**: Moyenne
- **Notes**: Nécessite configuration d'un webhook Discord

#### 4. Paste ngrok URL

- **Fichier**: `src/app/(routes)/admin/live/hooks/useAdminLiveActions.ts:131`
- **Description**: Implémenter la fonctionnalité de coller une URL ngrok (probablement pour le développement/testing)
- **État actuel**: Fonction vide avec toast informatif
- **Priorité**: Basse
- **Notes**: Utile principalement en développement

#### 5. Édition des genres

- **Fichier**: `src/app/(routes)/admin/live/hooks/useAdminLiveActions.ts:185`
- **Description**: Implémenter l'édition des genres musicaux dans l'interface admin
- **État actuel**: Fonction vide avec toast informatif
- **Priorité**: Moyenne

#### 6. Suppression ngrok

- **Fichier**: `src/app/(routes)/admin/live/hooks/useAdminLiveActions.ts:190`
- **Description**: Implémenter la suppression d'une URL ngrok configurée
- **État actuel**: Fonction vide avec toast informatif
- **Priorité**: Basse
- **Notes**: Utile principalement en développement

### Table des soumissions (AdminLiveSubmissionsTable.tsx)

#### 7. Vérification du statut subscription Twitch

- **Fichier**: `src/app/(routes)/admin/live/components/AdminLiveSubmissionsTable.tsx:296`
- **Description**: Implémenter la vérification du statut d'abonnement Twitch pour chaque utilisateur
- **État actuel**: Checkbox présente mais non fonctionnelle
- **Priorité**: Haute
- **Notes**: Fonctionnalité importante pour la modération

### Filtres (useAdminLiveFilters.ts)

#### 8. Filtre "Only Active"

- **Fichier**: `src/app/(routes)/admin/live/hooks/useAdminLiveFilters.ts:27`
- **Description**: Implémenter le filtre pour afficher uniquement les utilisateurs actifs dans le chat Twitch (activité < 10 minutes)
- **État actuel**: Filtre présent dans l'UI mais non fonctionnel (commenté)
- **Priorité**: Haute
- **Notes**: Améliore l'expérience utilisateur pour filtrer les soumissions

---

## 🎵 Intégration Spotify

### API Spotify for Artists

#### 9. Spotify for Artists API

- **Fichier**: `src/app/api/spotify/scheduled/route.ts:43`
- **Description**: Implémenter l'accès à l'API Spotify for Artists pour récupérer les releases planifiées
- **État actuel**: Route retourne un message indiquant que la fonctionnalité nécessite une configuration supplémentaire
- **Priorité**: Basse
- **Prérequis**:
  - Configuration OAuth avec Spotify
  - Accès vérifié au compte artiste
  - Utilisation de l'endpoint spécifique Spotify for Artists
- **Notes**: Nécessite configuration externe complexe

---

## 🎯 Priorités suggérées

### Priorité Haute

1. ✅ **Filtre "Only Active"** - Améliore l'expérience utilisateur pour filtrer les soumissions
2. ✅ **Vérification subscription Twitch** - Fonctionnalité importante pour la modération

### Priorité Moyenne

3. ⚠️ **Notification Discord** - Utile pour les alertes automatiques
4. ⚠️ **Édition des genres** - Fonctionnalité admin importante

### Priorité Basse

5. 📝 **Refresh des sockets** - Fonctionnalité de maintenance
6. 📝 **Ajout de loyalty** - Fonctionnalité bonus
7. 📝 **Paste/Suppression ngrok** - Utile principalement en développement
8. 📝 **Spotify for Artists API** - Nécessite configuration externe complexe

---

## 📝 Notes techniques

- Tous les TODOs sont dans le domaine de l'administration live (sauf Spotify)
- La plupart nécessitent des intégrations avec des services externes (Twitch, Discord, Spotify)
- Certaines fonctionnalités (ngrok) semblent être des outils de développement/testing
- Les fonctions avec toast informatif sont déjà intégrées dans l'UI mais non fonctionnelles

---

**Dernière mise à jour**: $(date)
