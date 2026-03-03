-- CreateEnum
CREATE TYPE "EntryType" AS ENUM ('ANGER', 'GRATITUDE', 'CREATIVE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "passcodeHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntryCounter" (
    "id" SERIAL NOT NULL,
    "entryType" "EntryType" NOT NULL,
    "counter" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EntryCounter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "entryType" "EntryType" NOT NULL,
    "title" TEXT NOT NULL,
    "bodyMarkdown" TEXT NOT NULL DEFAULT '',
    "angerReason" TEXT,
    "gratitudePromptId" TEXT,
    "creativePromptId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JournalEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GratitudePrompt" (
    "id" TEXT NOT NULL,
    "promptText" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GratitudePrompt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreativePersona" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreativePersona_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreativePrompt" (
    "id" TEXT NOT NULL,
    "personasUsed" JSONB,
    "promptText" TEXT NOT NULL,
    "aiRaw" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreativePrompt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EntryCounter_entryType_key" ON "EntryCounter"("entryType");

-- CreateIndex
CREATE UNIQUE INDEX "GratitudePrompt_promptText_key" ON "GratitudePrompt"("promptText");

-- CreateIndex
CREATE UNIQUE INDEX "CreativePersona_name_key" ON "CreativePersona"("name");

-- AddForeignKey
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_gratitudePromptId_fkey" FOREIGN KEY ("gratitudePromptId") REFERENCES "GratitudePrompt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_creativePromptId_fkey" FOREIGN KEY ("creativePromptId") REFERENCES "CreativePrompt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

