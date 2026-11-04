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
      YouTube Data API v3. La prod se redéploie toute seule à chaque fusion
      dans `main` (intégration GitHub de Vercel) : elle utilise la nouvelle clé depuis le 04/11/2026.
- [ ] _(facultatif, décidé le 04/11/2026 : tous les secrets fuités sont révoqués ; seule raison restante, les données personnelles des dumps)_ **Demander au support GitHub de purger les anciens commits** : l'historique a été
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
- [ ] _(facultatif)_ **Domaine perso** : le site est public sur `https://djlarian-react.vercel.app`
      (seules les autres adresses `*.vercel.app` sont derrière la protection Vercel). Si un domaine est
      acheté : l'ajouter au projet sur Vercel, régler le DNS, puis mettre à jour `NEXTAUTH_URL` et les
      URL de redirection OAuth Google et Twitch.
- [ ] **Umami en prod** : `NEXT_PUBLIC_UMAMI_URL` vaut `http://localhost:3001` sur Vercel, donc les
      statistiques Umami ne fonctionnent pas en prod. Mettre l'URL réelle de l'instance (ou supprimer
      la variable si Umami n'est pas utilisé).
- [ ] **Imposer la Content-Security-Policy** : elle est en place en mode `Report-Only` depuis le
      04/11/2026 (`src/lib/security/csp.ts`, rapports vers Sentry), et en prod depuis ce jour-là.
      Laisser tourner quelques jours, regarder les rapports CSP
      dans Sentry, ajuster les sources, puis passer `CSP_HEADER_REPORT_ONLY` à
      `Content-Security-Policy` dans `next.config.ts`.
- [x] Découper les gros composants (24/10/2026 : statistiques, projets, import, live, table,
      notifications, admin, événements, boutique, navigation, machine à sous, SoundCloud).
- [x] Routes API migrées vers `requireAuth` / `requireAdmin` (04/11/2026, PR #29 puis
      refactor/require-auth-remaining). Restent volontairement sans session : `events` GET (public)
      et `license/*` appelées par le plugin (la clé de licence sert de preuve).
- [x] **Trous d'accès repérés pendant la migration** (corrigés le 04/11/2026, PR fix/access-holes) :
  - `minigames/reset-tokens` : réservé aux admins (403 sinon) ;
  - `events` GET : `?isPublished=` n'est plus pris en compte pour un visiteur ;
  - `spotify/enrich` : réservé aux admins, rôle relu en base comme les routes voisines ;
  - `users/[userId]` PUT/DELETE : 403 pour un non-propriétaire (401 seulement si anonyme) ;
  - `events` et `events/[id]` : un événement dont `publishAt` est passé est publié dès qu'un visiteur le demande.
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
