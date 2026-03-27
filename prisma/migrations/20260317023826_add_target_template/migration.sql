-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ToolkitProject" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "softwareType" TEXT NOT NULL DEFAULT 'Custom',
    "targetTemplate" TEXT NOT NULL DEFAULT 'nextjs-react',
    "rawSql" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'active',
    "color" TEXT NOT NULL DEFAULT '#3b82f6',
    "icon" TEXT NOT NULL DEFAULT 'Database',
    "lastExportAt" DATETIME,
    "exportCount" INTEGER NOT NULL DEFAULT 0,
    "lastExportPath" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_ToolkitProject" ("color", "createdAt", "description", "icon", "id", "name", "rawSql", "softwareType", "status", "updatedAt") SELECT "color", "createdAt", "description", "icon", "id", "name", "rawSql", "softwareType", "status", "updatedAt" FROM "ToolkitProject";
DROP TABLE "ToolkitProject";
ALTER TABLE "new_ToolkitProject" RENAME TO "ToolkitProject";
CREATE INDEX "ToolkitProject_name_idx" ON "ToolkitProject"("name");
CREATE INDEX "ToolkitProject_softwareType_idx" ON "ToolkitProject"("softwareType");
CREATE INDEX "ToolkitProject_status_idx" ON "ToolkitProject"("status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
