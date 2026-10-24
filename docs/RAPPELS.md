# Rappels en attente pour le propriétaire du projet

> **Agents (Claude, Cursor, etc.) : au début de chaque session, rappelez à l'utilisateur
> les points encore ouverts ci-dessous, en une ou deux lignes, avant de commencer la tâche.**
> Quand l'utilisateur confirme qu'un point est fait, cochez-le avec la date
> (et retirez ce fichier des instructions d'agent quand tout est coché).

## 🔴 Sécurité : à faire par l'utilisateur (un agent ne peut pas le faire à sa place)

Contexte : jusqu'au 24/10/2026, le repo **public** contenait des dumps SQLite avec de vraies
données (5 emails dont 2 admins, 3 hashes de mots de passe bcrypt, tokens OAuth Google et
Twitch, dont un refresh token Twitch). Les fichiers ont été retirés et l'historique purgé,
mais des forks, caches ou clones ont pu les récupérer avant : il faut considérer ces données
comme compromises.

- [ ] **Changer les mots de passe** des comptes présents dans le dump (les 3 comptes avec
      mot de passe, dont les admins).
- [ ] **Régénérer le secret client OAuth Google** (Google Cloud Console → Identifiants),
      puis mettre à jour `GOOGLE_CLIENT_SECRET` sur Vercel. Cela invalide les tokens fuités.
- [ ] **Régénérer le secret client Twitch** (dev.twitch.tv → Applications), puis mettre à
      jour la variable correspondante sur Vercel.
- [ ] **Débrancher Cloudflare Pages** du repo GitHub s'il n'est plus utilisé : il échoue
      sur chaque PR.

## 🟡 Chantiers techniques en cours (pour un agent, avec accord de l'utilisateur)

- [ ] Découper les gros composants client (`StatisticsClient.tsx`, `ImportProjectsDialog.tsx`,
      `ProjectsClient.tsx`, `LiveSubmissionForm.tsx`…), un par un, en vérifiant chaque page
      dans le navigateur (pas de tests d'interface).
- [ ] Migrer les routes API restantes vers `requireAdmin` / `requireAuth`
      (`src/lib/api/requireAuth.ts`), sans changer leurs réponses HTTP : celles qui
      utilisent `createUnauthorizedResponse`, `new NextResponse('Unauthorized')`, ou qui
      vérifient `session.user.id`.
