-- CreateTable
CREATE TABLE "ToolkitFile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL DEFAULT 0,
    "lineCount" INTEGER NOT NULL DEFAULT 0,
    "content" TEXT NOT NULL DEFAULT '',
    "contentHash" TEXT,
    "parseStatus" TEXT NOT NULL DEFAULT 'pending',
    "parseError" TEXT,
    "parsedAt" DATETIME,
    "tablesFound" INTEGER NOT NULL DEFAULT 0,
    "proceduresFound" INTEGER NOT NULL DEFAULT 0,
    "complexity" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ToolkitFile_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ToolkitProject" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CSHTMLAnalysisCache" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "viewName" TEXT NOT NULL,
    "filePath" TEXT,
    "viewType" TEXT NOT NULL DEFAULT 'unknown',
    "modelName" TEXT,
    "linkedTable" TEXT,
    "title" TEXT,
    "layout" TEXT,
    "fields" TEXT NOT NULL DEFAULT '[]',
    "listConfig" TEXT NOT NULL DEFAULT '{}',
    "sections" TEXT NOT NULL DEFAULT '[]',
    "permissions" TEXT NOT NULL DEFAULT '[]',
    "scripts" TEXT NOT NULL DEFAULT '[]',
    "styles" TEXT NOT NULL DEFAULT '[]',
    "reactBlueprint" TEXT NOT NULL DEFAULT '{}',
    "suggestedPath" TEXT,
    "estimatedEffort" INTEGER NOT NULL DEFAULT 0,
    "rawContent" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CSHTMLAnalysisCache_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ToolkitProject" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_CSHTMLAnalysisCache" ("createdAt", "estimatedEffort", "fields", "filePath", "id", "layout", "linkedTable", "listConfig", "modelName", "permissions", "projectId", "rawContent", "reactBlueprint", "scripts", "sections", "styles", "suggestedPath", "title", "updatedAt", "viewName", "viewType") SELECT "createdAt", "estimatedEffort", "fields", "filePath", "id", "layout", "linkedTable", "listConfig", "modelName", "permissions", "projectId", "rawContent", "reactBlueprint", "scripts", "sections", "styles", "suggestedPath", "title", "updatedAt", "viewName", "viewType" FROM "CSHTMLAnalysisCache";
DROP TABLE "CSHTMLAnalysisCache";
ALTER TABLE "new_CSHTMLAnalysisCache" RENAME TO "CSHTMLAnalysisCache";
CREATE INDEX "CSHTMLAnalysisCache_projectId_idx" ON "CSHTMLAnalysisCache"("projectId");
CREATE INDEX "CSHTMLAnalysisCache_viewType_idx" ON "CSHTMLAnalysisCache"("viewType");
CREATE INDEX "CSHTMLAnalysisCache_linkedTable_idx" ON "CSHTMLAnalysisCache"("linkedTable");
CREATE UNIQUE INDEX "CSHTMLAnalysisCache_projectId_viewName_key" ON "CSHTMLAnalysisCache"("projectId", "viewName");
CREATE TABLE "new_DiscoveredTableCache" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "tableName" TEXT NOT NULL,
    "discoveredInSP" TEXT,
    "discoveredInView" TEXT,
    "accessType" TEXT NOT NULL DEFAULT 'read',
    "columns" TEXT NOT NULL DEFAULT '[]',
    "suggestedModule" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedTableId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DiscoveredTableCache_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ToolkitProject" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_DiscoveredTableCache" ("accessType", "columns", "createdAt", "discoveredInSP", "discoveredInView", "id", "isResolved", "priority", "projectId", "resolvedTableId", "suggestedModule", "tableName", "updatedAt") SELECT "accessType", "columns", "createdAt", "discoveredInSP", "discoveredInView", "id", "isResolved", "priority", "projectId", "resolvedTableId", "suggestedModule", "tableName", "updatedAt" FROM "DiscoveredTableCache";
DROP TABLE "DiscoveredTableCache";
ALTER TABLE "new_DiscoveredTableCache" RENAME TO "DiscoveredTableCache";
CREATE INDEX "DiscoveredTableCache_projectId_idx" ON "DiscoveredTableCache"("projectId");
CREATE INDEX "DiscoveredTableCache_priority_idx" ON "DiscoveredTableCache"("priority");
CREATE INDEX "DiscoveredTableCache_isResolved_idx" ON "DiscoveredTableCache"("isResolved");
CREATE UNIQUE INDEX "DiscoveredTableCache_projectId_tableName_key" ON "DiscoveredTableCache"("projectId", "tableName");
CREATE TABLE "new_StoredProcedureCache" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "procedureName" TEXT NOT NULL,
    "schemaName" TEXT NOT NULL DEFAULT 'dbo',
    "actionType" TEXT NOT NULL DEFAULT 'unknown',
    "moduleName" TEXT,
    "moduleConfidence" INTEGER NOT NULL DEFAULT 0,
    "tablesReferenced" TEXT NOT NULL DEFAULT '[]',
    "implicitJoins" TEXT NOT NULL DEFAULT '[]',
    "discoveredTables" TEXT NOT NULL DEFAULT '[]',
    "businessRules" TEXT NOT NULL DEFAULT '[]',
    "writeOperations" TEXT NOT NULL DEFAULT '[]',
    "readOperations" TEXT NOT NULL DEFAULT '[]',
    "parameters" TEXT NOT NULL DEFAULT '[]',
    "apiInputSchema" TEXT NOT NULL DEFAULT '{}',
    "complexity" INTEGER NOT NULL DEFAULT 0,
    "riskLevel" TEXT NOT NULL DEFAULT 'low',
    "suggestedEndpoint" TEXT,
    "body" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StoredProcedureCache_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ToolkitProject" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_StoredProcedureCache" ("actionType", "apiInputSchema", "body", "businessRules", "complexity", "createdAt", "discoveredTables", "id", "implicitJoins", "moduleConfidence", "moduleName", "parameters", "procedureName", "projectId", "readOperations", "riskLevel", "schemaName", "suggestedEndpoint", "tablesReferenced", "updatedAt", "writeOperations") SELECT "actionType", "apiInputSchema", "body", "businessRules", "complexity", "createdAt", "discoveredTables", "id", "implicitJoins", "moduleConfidence", "moduleName", "parameters", "procedureName", "projectId", "readOperations", "riskLevel", "schemaName", "suggestedEndpoint", "tablesReferenced", "updatedAt", "writeOperations" FROM "StoredProcedureCache";
DROP TABLE "StoredProcedureCache";
ALTER TABLE "new_StoredProcedureCache" RENAME TO "StoredProcedureCache";
CREATE INDEX "StoredProcedureCache_projectId_idx" ON "StoredProcedureCache"("projectId");
CREATE INDEX "StoredProcedureCache_actionType_idx" ON "StoredProcedureCache"("actionType");
CREATE INDEX "StoredProcedureCache_moduleName_idx" ON "StoredProcedureCache"("moduleName");
CREATE UNIQUE INDEX "StoredProcedureCache_projectId_procedureName_key" ON "StoredProcedureCache"("projectId", "procedureName");
CREATE TABLE "new_ToolkitProject" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "softwareType" TEXT NOT NULL DEFAULT 'Custom',
    "rawSql" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'active',
    "color" TEXT NOT NULL DEFAULT '#3b82f6',
    "icon" TEXT NOT NULL DEFAULT 'Database',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_ToolkitProject" ("createdAt", "description", "id", "name", "rawSql", "softwareType", "updatedAt") SELECT "createdAt", "description", "id", "name", "rawSql", "softwareType", "updatedAt" FROM "ToolkitProject";
DROP TABLE "ToolkitProject";
ALTER TABLE "new_ToolkitProject" RENAME TO "ToolkitProject";
CREATE INDEX "ToolkitProject_name_idx" ON "ToolkitProject"("name");
CREATE INDEX "ToolkitProject_softwareType_idx" ON "ToolkitProject"("softwareType");
CREATE INDEX "ToolkitProject_status_idx" ON "ToolkitProject"("status");
CREATE TABLE "new_ViewIntelligenceCache" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "viewName" TEXT NOT NULL,
    "schemaName" TEXT NOT NULL DEFAULT 'dbo',
    "sourceTables" TEXT NOT NULL DEFAULT '[]',
    "joinRelationships" TEXT NOT NULL DEFAULT '[]',
    "columns" TEXT NOT NULL DEFAULT '[]',
    "calculatedFields" TEXT NOT NULL DEFAULT '[]',
    "caseStatements" TEXT NOT NULL DEFAULT '[]',
    "purpose" TEXT NOT NULL DEFAULT 'unknown',
    "businessContext" TEXT,
    "suggestedReportType" TEXT,
    "suggestedWidgets" TEXT NOT NULL DEFAULT '[]',
    "enumSuggestions" TEXT NOT NULL DEFAULT '[]',
    "apiEndpoints" TEXT NOT NULL DEFAULT '[]',
    "complexity" INTEGER NOT NULL DEFAULT 0,
    "hiddenRelationships" TEXT NOT NULL DEFAULT '[]',
    "body" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ViewIntelligenceCache_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ToolkitProject" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ViewIntelligenceCache" ("apiEndpoints", "body", "businessContext", "calculatedFields", "caseStatements", "columns", "complexity", "createdAt", "enumSuggestions", "hiddenRelationships", "id", "joinRelationships", "projectId", "purpose", "schemaName", "sourceTables", "suggestedReportType", "suggestedWidgets", "updatedAt", "viewName") SELECT "apiEndpoints", "body", "businessContext", "calculatedFields", "caseStatements", "columns", "complexity", "createdAt", "enumSuggestions", "hiddenRelationships", "id", "joinRelationships", "projectId", "purpose", "schemaName", "sourceTables", "suggestedReportType", "suggestedWidgets", "updatedAt", "viewName" FROM "ViewIntelligenceCache";
DROP TABLE "ViewIntelligenceCache";
ALTER TABLE "new_ViewIntelligenceCache" RENAME TO "ViewIntelligenceCache";
CREATE INDEX "ViewIntelligenceCache_projectId_idx" ON "ViewIntelligenceCache"("projectId");
CREATE INDEX "ViewIntelligenceCache_purpose_idx" ON "ViewIntelligenceCache"("purpose");
CREATE UNIQUE INDEX "ViewIntelligenceCache_projectId_viewName_key" ON "ViewIntelligenceCache"("projectId", "viewName");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "ToolkitFile_projectId_idx" ON "ToolkitFile"("projectId");

-- CreateIndex
CREATE INDEX "ToolkitFile_fileType_idx" ON "ToolkitFile"("fileType");

-- CreateIndex
CREATE INDEX "ToolkitFile_parseStatus_idx" ON "ToolkitFile"("parseStatus");

-- CreateIndex
CREATE UNIQUE INDEX "ToolkitFile_projectId_fileName_key" ON "ToolkitFile"("projectId", "fileName");
