# Rappels en attente pour le propriétaire du projet

> **Agents (Claude, Cursor, etc.) : au début de chaque session, rappelez à l'utilisateur
> les points encore ouverts ci-dessous, en une ou deux lignes, avant de commencer la tâche.**
> Quand l'utilisateur confirme qu'un point est fait, cochez-le avec la date
> (et retirez ce fichier des instructions d'agent quand tout est coché).

## 🔴 Sécurité : à faire par l'utilisateur (un agent ne peut pas le faire à sa place)

Contexte : jusqu'au 24/10/2026, le repo **public** contenait des dumps SQLite avec de vraies
données (5 emails dont 2 admins, 3 hashes de mots de passe bcrypt, tokens OAuth Google et
Twitch, dont un refresh token Twitch). Les fichiers ont été retirés et l'historique git réécrit le 24/10/2026,
mais des forks, caches ou clones ont pu les récupérer avant : il faut considérer ces données
comme compromises.

- [ ] **Changer les mots de passe** des comptes présents dans le dump (les 3 comptes avec
      mot de passe, dont les admins).
- [ ] **Régénérer le secret client OAuth Google** (Google Cloud Console → Identifiants),
      puis mettre à jour `GOOGLE_CLIENT_SECRET` sur Vercel. Cela invalide les tokens fuités.
- [ ] **Régénérer le secret client Twitch** (dev.twitch.tv → Applications), puis mettre à
      jour la variable correspondante sur Vercel.
- [ ] **Demander au support GitHub de purger les anciens commits** : l'historique a été
      réécrit le 24/10/2026, mais les PR #1 à #4 et #16 gardent des références en lecture
      seule vers l'ancien historique, et les commits restent accessibles par leur SHA.
      Formulaire : https://support.github.com/contact → « Remove sensitive data », en
      précisant le dépôt `Jujulu67/djlarian-react` et les fichiers
      `prisma/dev.db.backup.20251214_140955`, `prisma/dev.db.before-restore.*`,
      `prisma/prisma/dev.db`.
- [ ] **Débrancher Cloudflare Pages** du repo GitHub s'il n'est plus utilisé : il échoue
      sur chaque PR.

## 🟡 Chantiers techniques en cours (pour un agent, avec accord de l'utilisateur)

- [x] Découper les gros composants (24/10/2026 : statistiques, projets, import, live, table,
      notifications, admin, événements, boutique, navigation, machine à sous, SoundCloud).
- [ ] Routes API restantes non migrées vers `requireAuth` : celles qui testent `session.user.id`/`email`
      ou mélangent admin et propriétaire (~50).
- [x] Récurrence d'événements (25/10/2026) : les occurrences étaient calculées en UTC côté serveur,
      donc décalées d'une heure après un changement d'heure. Tout est maintenant calculé en heure de
      Paris (`src/lib/utils/timezone.ts`), ce qui aligne aussi les clés d'exclusion du serveur sur
      celles enregistrées depuis le navigateur : aucune migration nécessaire.
- [x] Bugs repérés pendant le refactor, corrigés le 24/10/2026 (PR fix/bugs-round-3) :
  - formulaire d'événement : `d&apos;` affiché tel quel (titre « Modifier l&apos;événement » et 2 toasts) ;
  - historique de configuration : libellés jamais appliqués (`general.siteName` au lieu du nom lisible) ;
  - navigation : `isNavLinkActive` fait un `startsWith` brut (`/musicx` active `/music`) ;
  - `ImportStreamsDialog` : effets de bord (setTimeout/setState) dans des updaters d'état ;
  - `formatDateFrench('pas une date')` renvoie `NaN/NaN/NaN` ;
  - dates de récurrence : arithmétique locale + `toISOString()` (décalage possible hors UTC) ;
  - machine à sous : timers non annulés au démontage.
