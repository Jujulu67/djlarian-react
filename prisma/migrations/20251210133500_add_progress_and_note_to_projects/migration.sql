-- AlterTable
-- Ajout des colonnes progress et note à la table Project
-- progress: Pourcentage d'avancement (0-100)
-- note: Note/informations pertinentes sur le projet

ALTER TABLE "Project" ADD COLUMN "progress" INTEGER;
ALTER TABLE "Project" ADD COLUMN "note" TEXT;
