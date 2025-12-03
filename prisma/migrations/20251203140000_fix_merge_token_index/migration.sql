-- Fix merge token index
-- SQLite: Les index uniques sur de grandes colonnes TEXT fonctionnent normalement
-- Cette migration est principalement pour PostgreSQL où on utilise un index fonctionnel MD5
-- Pour SQLite, on ne fait rien car l'index unique standard fonctionne

-- Note: SQLite ignore les commentaires et cette migration est essentiellement un no-op pour SQLite
-- L'index unique standard sur token fonctionne déjà correctement
