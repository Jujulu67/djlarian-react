-- AlterTable
-- Ajout des colonnes streamsJ180 et streamsJ365 pour le suivi long terme
-- Migration sans perte de données (ALTER TABLE ADD COLUMN est sûr en SQLite)

ALTER TABLE "Project" ADD COLUMN "streamsJ180" INTEGER;
ALTER TABLE "Project" ADD COLUMN "streamsJ365" INTEGER;
