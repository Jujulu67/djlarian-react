# Tests E2E (Playwright)

Parcours réels dans Chromium, contre le serveur de dev et une base PostgreSQL **locale**.

## Prérequis

- Base locale : le conteneur Docker `djlarian-postgres-local` (port 5433), schéma à jour
  (voir [docs/RUNBOOK_POSTGRES_LOCAL.md](../docs/RUNBOOK_POSTGRES_LOCAL.md)).
- `.env.local` avec `DATABASE_URL` vers cette base et `NEXTAUTH_SECRET`.
- Navigateur : `pnpm playwright install chromium` (une fois).

`e2e/helpers/db.ts` refuse de tourner si `DATABASE_URL` ne pointe pas vers `localhost` : les tests
créent et suppriment des comptes, jamais sur la prod.

## Lancer

```bash
pnpm test:e2e            # tous les tests
pnpm test:e2e:ui         # mode interactif
pnpm test:e2e:debug      # pas à pas
pnpm playwright test e2e/auth.spec.ts
```

Playwright démarre `pnpm run dev` s'il ne tourne pas déjà (ou réutilise celui sur le port 3000).
Deux workers en local : le serveur de dev compile chaque page à la demande et sature au-delà.
`test-results/` et `playwright-report/` sont générés à chaque lancement et ignorés par git.

## Ce qui est couvert (14 tests)

`auth.spec.ts`

- Visiteur : la croix ferme la modale de connexion sans changer de page ; « Se connecter » du
  profil ouvre la modale du site ; un mauvais mot de passe est refusé.
- Compte connecté (utilisateur créé puis supprimé par le test) : après connexion on reste sur la
  page courante ; la déconnexion garde la préférence d'interface (cookie `ui`).

`navigation.spec.ts`

- Chaque page publique s'affiche sans erreur JavaScript.
- Échap ferme la carte du casino ; la fermer renvoie un visiteur à l'accueil.

À ajouter : création de projet, admin musique, live, boutique. Ces tests ne tournent pas encore
en CI (il faudrait un service PostgreSQL dans le workflow) : voir
[docs/DETTE-TECHNIQUE.md](../docs/DETTE-TECHNIQUE.md).

## Dépannage

- « DATABASE_URL doit pointer vers une base PostgreSQL locale » : `.env.local` vise une base
  distante ; le remplacer par l'URL du conteneur local.
- Pages qui dépassent le délai au premier lancement : la compilation à froid est lente, relancer
  une fois le serveur de dev chaud.
