/*
  Warnings:

  - Added the required column `email` to the `EmailOTP` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "EmailOTP" DROP CONSTRAINT "EmailOTP_userId_fkey";

-- DropIndex
DROP INDEX "EmailOTP_userId_key";

-- AlterTable
ALTER TABLE "EmailOTP" ADD COLUMN     "email" TEXT NOT NULL,
ALTER COLUMN "userId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "EmailOTP_email_idx" ON "EmailOTP"("email");

-- AddForeignKey
ALTER TABLE "EmailOTP" ADD CONSTRAINT "EmailOTP_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
