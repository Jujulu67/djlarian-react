-- AlterTable
-- Ajout des colonnes gameHighScore et hasDiscoveredCasino à la table User
-- Ces colonnes sont utilisées pour le système de jeu (casino, high score)
-- Migration sans perte de données (ALTER TABLE ADD COLUMN avec valeurs par défaut)

ALTER TABLE "User" ADD COLUMN "gameHighScore" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "hasDiscoveredCasino" BOOLEAN NOT NULL DEFAULT false;

