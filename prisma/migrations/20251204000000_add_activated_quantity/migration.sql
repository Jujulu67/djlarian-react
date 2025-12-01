-- AlterTable
ALTER TABLE "UserLiveItem" ADD COLUMN "activatedQuantity" INTEGER NOT NULL DEFAULT 0;

-- Migrer les données existantes: activatedQuantity = isActivated ? quantity : 0
UPDATE "UserLiveItem" SET "activatedQuantity" = CASE WHEN "isActivated" = 1 THEN "quantity" ELSE 0 END;

-- Créer l'index
CREATE INDEX "UserLiveItem_activatedQuantity_idx" ON "UserLiveItem"("activatedQuantity");

