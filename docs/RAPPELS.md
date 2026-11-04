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
- [x] **Secret client OAuth Google** (04/11/2026) : le secret actuel (`…HvLo`, créé le 30/11/2025) n'a jamais fuité. Le 2ᵉ secret inutilisé (`…7hqP`) est désactivé ; le supprimer après un test de connexion Google en prod.
- [x] **Secret client Twitch** (04/11/2026) : n'a pas fuité (absent des builds), les tokens des dumps sont inutilisables sans lui. Rotation facultative.
- [x] **Mot de passe de la base Neon de production changé** (04/11/2026, l'ancien est refusé ; branche `development` supprimée).
- [x] **`NEXTAUTH_SECRET` changé** (04/11/2026).
- [x] **Clés Cloudflare R2 révoquées** (04/11/2026, refusées par R2).
- [x] **Clé `YOUTUBE_API_KEY` régénérée** (04/11/2026) : les deux clés Google fuitées dans les
      builds `.open-next/` (projets « projet 2 » et « My First Project ») sont révoquées, projets
      arrêtés, alertes GitHub fermées. Nouvelle clé dans « DJLarian Search », restreinte à
      YouTube Data API v3. Reste à **redéployer la prod sur Vercel** : le dernier déploiement
      (25/10) utilise encore l'ancienne clé, donc les vidéos YouTube ne marchent plus en prod.
- [ ] **Demander au support GitHub de purger les anciens commits** : l'historique a été
      réécrit le 24/10/2026, mais les PR #1 à #4 et #16 gardent des références en lecture
      seule vers l'ancien historique, et les commits restent accessibles par leur SHA.
      Formulaire : https://support.github.com/contact → « Remove sensitive data », en
      précisant le dépôt `Jujulu67/djlarian-react` et les fichiers
      `prisma/dev.db.backup.20251214_140955`, `prisma/dev.db.before-restore.*`,
      `prisma/prisma/dev.db`, ainsi que les commits `a431d85e` et `1f735b1b` (dossier `.open-next/`,
      clés Google).
- [x] **Cloudflare Pages débranché** (04/11/2026) : application GitHub « Cloudflare Workers and Pages » désinstallée (elle n'avait accès qu'à ce dépôt ; chefsenligne se déploie avec `wrangler` et n'est pas concerné).
- [x] Audit des dépendances (04/11/2026) : faille haute `follow-redirects` corrigée (override),
      Next 16.4.5, React 19.3.1 (n'est plus en `latest`), Prisma 7.10.1. Restent 7 alertes
      basses/modérées non exploitables ici : `deepmerge` (Jest, dev seulement), `minimatch`/`glob`
      via `archiver`/`exceljs` (motifs fixes, aucune entrée utilisateur) ; à reprendre quand les
      paquets parents publient un correctif.
- [ ] Ajouter une Content-Security-Policy (les autres en-têtes de sécurité sont en place dans
      `next.config.ts`) : à tester en mode `Report-Only` avant de l'imposer.

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
