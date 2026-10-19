-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "reviewSendEndHour" INTEGER NOT NULL DEFAULT 20,
ADD COLUMN     "reviewSendStartHour" INTEGER NOT NULL DEFAULT 9;
