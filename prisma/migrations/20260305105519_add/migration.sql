/*
  Warnings:

  - Added the required column `teacherEmail` to the `TeacherInvite` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "TeacherInvite" ADD COLUMN     "teacherEmail" TEXT NOT NULL;
