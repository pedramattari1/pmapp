-- DropIndex
DROP INDEX "Task_templateId_idx";

-- AlterTable
ALTER TABLE "Task" ALTER COLUMN "dueDate" SET DATA TYPE DATE;

-- CreateIndex
CREATE UNIQUE INDEX "ChecklistTick_taskId_label_key" ON "ChecklistTick"("taskId", "label");

-- CreateIndex
CREATE UNIQUE INDEX "Reading_taskId_type_key" ON "Reading"("taskId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "Task_templateId_dueDate_key" ON "Task"("templateId", "dueDate");

