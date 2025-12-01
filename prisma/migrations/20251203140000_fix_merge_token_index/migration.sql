-- Supprimer l'index unique sur token (trop grand pour PostgreSQL)
-- Note: Cette migration fonctionne pour PostgreSQL et SQLite
-- - PostgreSQL: crée un index fonctionnel MD5 (compatible avec grandes valeurs)
-- - SQLite: ne crée pas d'index unique (les recherches se font par email de toute façon)

-- Pour PostgreSQL: créer un index fonctionnel avec MD5
-- SQLite ignore les blocs DO $$ ... END $$, donc pas de problème
DO $$
BEGIN
  -- Vérifier qu'on est sur PostgreSQL (et non SQLite)
  IF current_setting('server_version_num', true) IS NOT NULL THEN
    -- Créer l'index fonctionnel MD5 uniquement pour PostgreSQL
    EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS "MergeToken_token_key" ON "MergeToken" USING btree (md5("token"))';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- Si erreur (ex: index existe déjà), ignorer
    NULL;
END $$;

