-- AlterTable
ALTER TABLE "User" ADD COLUMN     "dateFormat" TEXT NOT NULL DEFAULT 'dd/MM/yyyy',
ADD COLUMN     "locale" TEXT NOT NULL DEFAULT 'fr',
ADD COLUMN     "preferredCurrency" CHAR(3) NOT NULL DEFAULT 'MGA';
