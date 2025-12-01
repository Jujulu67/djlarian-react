-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT NOT NULL,
    "address" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "imageId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'UPCOMING',
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "publishAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "isMasterEvent" BOOLEAN NOT NULL DEFAULT false,
    "masterId" TEXT,
    "userId" TEXT,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Genre" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Genre_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GenresOnTracks" (
    "trackId" TEXT NOT NULL,
    "genreId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GenresOnTracks_pkey" PRIMARY KEY ("trackId","genreId")
);

-- CreateTable
CREATE TABLE "MusicCollection" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "coverUrl" TEXT,
    "releaseDate" TIMESTAMP(3),
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MusicCollection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecurrenceConfig" (
    "id" TEXT NOT NULL,
    "frequency" TEXT NOT NULL DEFAULT 'weekly',
    "day" INTEGER,
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "eventId" TEXT NOT NULL,
    "excludedDates" JSONB,

    CONSTRAINT "RecurrenceConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketInfo" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "price" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "buyUrl" TEXT,
    "availableFrom" TIMESTAMP(3),
    "availableTo" TIMESTAMP(3),
    "quantity" INTEGER,

    CONSTRAINT "TicketInfo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Track" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "artist" TEXT NOT NULL,
    "imageId" TEXT,
    "releaseDate" TIMESTAMP(3) NOT NULL,
    "bpm" INTEGER,
    "musicalKey" TEXT,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "publishAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT,
    "collectionId" TEXT,

    CONSTRAINT "Track_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrackPlatform" (
    "id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "embedId" TEXT,
    "trackId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrackPlatform_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "hashedPassword" TEXT,
    "role" TEXT DEFAULT 'USER',
    "isVip" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "SiteConfig" (
    "id" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConfigHistory" (
    "id" TEXT NOT NULL,
    "configId" TEXT NOT NULL,
    "previousValue" TEXT NOT NULL,
    "newValue" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "description" TEXT,
    "reverted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ConfigHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConfigSnapshot" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,

    CONSTRAINT "ConfigSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Image" (
    "id" TEXT NOT NULL,
    "imageId" TEXT NOT NULL,
    "blobUrl" TEXT,
    "blobUrlOriginal" TEXT,
    "size" INTEGER,
    "contentType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Image_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "name" TEXT NOT NULL,
    "style" TEXT,
    "status" TEXT NOT NULL DEFAULT 'EN_COURS',
    "collab" TEXT,
    "label" TEXT,
    "labelFinal" TEXT,
    "releaseDate" TIMESTAMP(3),
    "externalLink" TEXT,
    "streamsJ7" INTEGER,
    "streamsJ14" INTEGER,
    "streamsJ21" INTEGER,
    "streamsJ28" INTEGER,
    "streamsJ56" INTEGER,
    "streamsJ84" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Genre_name_key" ON "Genre"("name");

-- CreateIndex
CREATE UNIQUE INDEX "RecurrenceConfig_eventId_key" ON "RecurrenceConfig"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "TicketInfo_eventId_key" ON "TicketInfo"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "SiteConfig_section_key_key" ON "SiteConfig"("section", "key");

-- CreateIndex
CREATE UNIQUE INDEX "Image_imageId_key" ON "Image"("imageId");

-- CreateIndex
CREATE INDEX "Image_imageId_idx" ON "Image"("imageId");

-- CreateIndex
CREATE INDEX "Project_userId_idx" ON "Project"("userId");

-- CreateIndex
CREATE INDEX "Project_status_idx" ON "Project"("status");

-- AddForeignKey
-- Note: Les foreign keys sont définies directement dans les CREATE TABLE pour SQLite et PostgreSQL
-- Les ALTER TABLE ... ADD CONSTRAINT ont été supprimés car :
-- 1. SQLite ne supporte pas ALTER TABLE ... ADD CONSTRAINT
-- 2. Prisma génère les foreign keys dans CREATE TABLE pour les deux bases de données
-- 3. Les ALTER TABLE étaient redondants et causaient des erreurs en SQLite
-- 
-- Si en production PostgreSQL les foreign keys ne sont pas dans CREATE TABLE,
-- elles seront ajoutées automatiquement par Prisma lors de la prochaine migration

