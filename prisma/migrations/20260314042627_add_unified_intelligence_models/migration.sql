-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "passwordHash" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "displayName" TEXT,
    "avatar" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "locale" TEXT NOT NULL DEFAULT 'en',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "emailVerifiedAt" DATETIME,
    "lastLoginAt" DATETIME,
    "preferences" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Post" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "content" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "authorId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Post_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AgentDefinition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "layer" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT '1.0.0',
    "tags" TEXT NOT NULL,
    "dependencies" TEXT NOT NULL DEFAULT '[]',
    "requiresAI" BOOLEAN NOT NULL DEFAULT false,
    "estimatedDuration" INTEGER NOT NULL DEFAULT 60,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "registeredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastModified" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PipelineConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "config" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PipelineExecution" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "executionId" TEXT NOT NULL,
    "pipelineId" TEXT NOT NULL,
    "pipelineName" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "startTime" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" DATETIME,
    "duration" INTEGER,
    "aiEngine" TEXT NOT NULL DEFAULT 'offline',
    "aiModel" TEXT,
    "stopOnError" BOOLEAN NOT NULL DEFAULT true,
    "totalAgents" INTEGER NOT NULL DEFAULT 0,
    "completedAgents" INTEGER NOT NULL DEFAULT 0,
    "failedAgents" INTEGER NOT NULL DEFAULT 0,
    "skippedAgents" INTEGER NOT NULL DEFAULT 0,
    "itemsProcessed" INTEGER NOT NULL DEFAULT 0,
    "outputFiles" TEXT NOT NULL DEFAULT '[]',
    "errors" TEXT NOT NULL DEFAULT '[]',
    CONSTRAINT "PipelineExecution_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "PipelineConfig" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AgentExecution" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "executionId" TEXT NOT NULL,
    "pipelineExecutionId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "agentName" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "startTime" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" DATETIME,
    "duration" INTEGER,
    "output" TEXT,
    "error" TEXT,
    "itemsProcessed" INTEGER NOT NULL DEFAULT 0,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "AgentExecution_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "AgentDefinition" ("agentId") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AgentExecution_pipelineExecutionId_fkey" FOREIGN KEY ("pipelineExecutionId") REFERENCES "PipelineExecution" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AgentLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agentExecutionId" TEXT,
    "agentDefinitionId" TEXT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "level" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" TEXT,
    CONSTRAINT "AgentLog_agentExecutionId_fkey" FOREIGN KEY ("agentExecutionId") REFERENCES "AgentExecution" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AgentLog_agentDefinitionId_fkey" FOREIGN KEY ("agentDefinitionId") REFERENCES "AgentDefinition" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ContextSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "snapshotId" TEXT NOT NULL,
    "description" TEXT,
    "data" TEXT NOT NULL,
    "triggeredBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "SourceFile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "contentHash" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "modifiedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ParsedSchemaTable" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tableName" TEXT NOT NULL,
    "schema" TEXT,
    "sourceFileId" TEXT,
    "columns" TEXT NOT NULL,
    "primaryKey" TEXT NOT NULL,
    "foreignKeys" TEXT NOT NULL DEFAULT '[]',
    "indexes" TEXT NOT NULL DEFAULT '[]',
    "constraints" TEXT NOT NULL DEFAULT '[]',
    "sourceDDL" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ParsedStoredProcedureRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "procedureName" TEXT NOT NULL,
    "schema" TEXT,
    "sourceFileId" TEXT,
    "parameters" TEXT NOT NULL,
    "returnType" TEXT,
    "body" TEXT NOT NULL,
    "operations" TEXT NOT NULL DEFAULT '[]',
    "tablesAccessed" TEXT NOT NULL DEFAULT '[]',
    "tablesModified" TEXT NOT NULL DEFAULT '[]',
    "complexity" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ModuleDefinition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "moduleId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "tables" TEXT NOT NULL DEFAULT '[]',
    "procedures" TEXT NOT NULL DEFAULT '[]',
    "views" TEXT NOT NULL DEFAULT '[]',
    "screens" TEXT NOT NULL DEFAULT '[]',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "complexity" TEXT NOT NULL DEFAULT 'medium',
    "estimatedHours" REAL NOT NULL DEFAULT 0,
    "dependencies" TEXT NOT NULL DEFAULT '[]',
    "businessValue" TEXT NOT NULL DEFAULT 'medium',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "UserStoryRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "benefit" TEXT NOT NULL,
    "acceptanceCriteria" TEXT NOT NULL DEFAULT '[]',
    "moduleId" TEXT,
    "tables" TEXT NOT NULL DEFAULT '[]',
    "priority" TEXT NOT NULL DEFAULT 'should_have',
    "storyPoints" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "GeneratedArtifact" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "artifactId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sourceModule" TEXT,
    "sourceTable" TEXT,
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SystemSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ToolkitProject" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "softwareType" TEXT NOT NULL DEFAULT 'Custom',
    "rawSql" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ToolkitTable" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "tableName" TEXT NOT NULL,
    "schemaName" TEXT NOT NULL DEFAULT 'dbo',
    "columns" TEXT NOT NULL,
    "foreignKeys" TEXT NOT NULL DEFAULT '[]',
    "indexes" TEXT NOT NULL DEFAULT '[]',
    "constraints" TEXT NOT NULL DEFAULT '[]',
    "sourceDDL" TEXT,
    "status" TEXT NOT NULL DEFAULT 'standalone',
    "linkedModule" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ToolkitTable_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ToolkitProject" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ToolkitProcedure" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "procedureName" TEXT NOT NULL,
    "schemaName" TEXT NOT NULL DEFAULT 'dbo',
    "parameters" TEXT NOT NULL,
    "returnType" TEXT,
    "body" TEXT NOT NULL,
    "operations" TEXT NOT NULL DEFAULT '[]',
    "tablesAccessed" TEXT NOT NULL DEFAULT '[]',
    "tablesModified" TEXT NOT NULL DEFAULT '[]',
    "complexity" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ToolkitProcedure_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ToolkitProject" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ToolkitTestCase" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "testCaseId" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "testCase" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "preconditions" TEXT NOT NULL,
    "steps" TEXT NOT NULL,
    "expectedResult" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'Medium',
    "status" TEXT NOT NULL DEFAULT 'Not Started',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ToolkitUserStory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "benefit" TEXT NOT NULL,
    "acceptanceCriteria" TEXT NOT NULL DEFAULT '[]',
    "priority" TEXT NOT NULL DEFAULT 'should_have',
    "storyPoints" INTEGER NOT NULL DEFAULT 0,
    "tables" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ToolkitArtifact" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "artifactType" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AIConversation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "context" TEXT NOT NULL DEFAULT 'general',
    "projectId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AIMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "conversationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AIMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "AIConversation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "HISModule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "moduleKey" TEXT NOT NULL,
    "moduleName" TEXT NOT NULL,
    "description" TEXT,
    "layer" INTEGER NOT NULL,
    "layerName" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "estimatedDays" INTEGER NOT NULL DEFAULT 0,
    "tables" TEXT NOT NULL DEFAULT '[]',
    "dependsOn" TEXT NOT NULL DEFAULT '[]',
    "features" TEXT NOT NULL DEFAULT '[]',
    "userRoles" TEXT NOT NULL DEFAULT '[]',
    "revenue" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'planned',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "assignedTo" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ColumnIntelligenceCache" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tableName" TEXT NOT NULL,
    "columnName" TEXT NOT NULL,
    "semanticType" TEXT NOT NULL,
    "uiType" TEXT NOT NULL,
    "sensitivity" TEXT NOT NULL,
    "confidence" INTEGER NOT NULL,
    "validationRules" TEXT NOT NULL DEFAULT '[]',
    "suggestions" TEXT NOT NULL DEFAULT '[]',
    "isSearchable" BOOLEAN NOT NULL DEFAULT false,
    "isFilterable" BOOLEAN NOT NULL DEFAULT false,
    "displayInList" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "FKDependencyCache" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "tableName" TEXT NOT NULL,
    "totalFKs" INTEGER NOT NULL DEFAULT 0,
    "resolvedFKs" INTEGER NOT NULL DEFAULT 0,
    "missingTables" TEXT NOT NULL DEFAULT '[]',
    "analysisData" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "StoredProcedureCache" (
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
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ViewIntelligenceCache" (
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
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "DiscoveredTableCache" (
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
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logo" TEXT,
    "primaryColor" TEXT,
    "secondaryColor" TEXT,
    "domain" TEXT,
    "subscriptionTier" TEXT NOT NULL DEFAULT 'free',
    "subscriptionStatus" TEXT NOT NULL DEFAULT 'trialing',
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "trialEndsAt" DATETIME,
    "billingEmail" TEXT,
    "billingName" TEXT,
    "billingAddress" TEXT,
    "billingCity" TEXT,
    "billingState" TEXT,
    "billingPostalCode" TEXT,
    "billingCountry" TEXT,
    "settings" TEXT NOT NULL DEFAULT '{}',
    "limits" TEXT NOT NULL DEFAULT '{}',
    "usage" TEXT NOT NULL DEFAULT '{}',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "settings" TEXT NOT NULL DEFAULT '{}',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Workspace_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "softwareType" TEXT NOT NULL DEFAULT 'Custom',
    "status" TEXT NOT NULL DEFAULT 'planning',
    "settings" TEXT NOT NULL DEFAULT '{}',
    "statistics" TEXT NOT NULL DEFAULT '{}',
    "createdBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Project_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Project_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UserCompany" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "invitedBy" TEXT,
    "invitedAt" DATETIME,
    "joinedAt" DATETIME,
    "settings" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserCompany_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserCompany_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UserProject" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'viewer',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "permissions" TEXT NOT NULL DEFAULT '[]',
    "settings" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserProject_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserProject_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "APIKey" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "permissions" TEXT NOT NULL DEFAULT '[]',
    "rateLimit" INTEGER NOT NULL DEFAULT 1000,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastUsedAt" DATETIME,
    "expiresAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "APIKey_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resourceId" TEXT,
    "oldValue" TEXT,
    "newValue" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Invitation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "projectId" TEXT,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "roleType" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "invitedBy" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "MissingTableResolution" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "tableName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'missing',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "blocksCount" INTEGER NOT NULL DEFAULT 0,
    "referencedBy" TEXT NOT NULL DEFAULT '[]',
    "resolutionPath" TEXT,
    "resolutionStatus" TEXT NOT NULL DEFAULT 'pending',
    "suggestedColumns" TEXT NOT NULL DEFAULT '[]',
    "aiSuggestion" TEXT NOT NULL DEFAULT '{}',
    "resolvedAt" DATETIME,
    "resolvedBy" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "FKResolutionSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "totalMissing" INTEGER NOT NULL DEFAULT 0,
    "totalResolved" INTEGER NOT NULL DEFAULT 0,
    "totalBlocked" INTEGER NOT NULL DEFAULT 0,
    "buildOrder" TEXT NOT NULL DEFAULT '[]',
    "circularDeps" TEXT NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "FKResolutionLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT,
    "projectId" TEXT NOT NULL,
    "tableName" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "error" TEXT,
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "AIQuestionRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "questionId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "context" TEXT,
    "options" TEXT NOT NULL DEFAULT '[]',
    "allowsMultiple" BOOLEAN NOT NULL DEFAULT false,
    "allowsCustomInput" BOOLEAN NOT NULL DEFAULT false,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "impact" TEXT,
    "defaultValue" TEXT,
    "answer" TEXT,
    "relatedColumns" TEXT NOT NULL DEFAULT '[]',
    "relatedTables" TEXT NOT NULL DEFAULT '[]',
    "tableName" TEXT,
    "moduleName" TEXT,
    "sessionId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "QuestionSessionRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "projectId" TEXT,
    "groups" TEXT NOT NULL DEFAULT '[]',
    "totalQuestions" INTEGER NOT NULL DEFAULT 0,
    "answeredQuestions" INTEGER NOT NULL DEFAULT 0,
    "criticalTotal" INTEGER NOT NULL DEFAULT 0,
    "criticalAnswered" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ScreenBlueprintRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "blueprintId" TEXT NOT NULL,
    "tableName" TEXT NOT NULL,
    "screenType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "fields" TEXT NOT NULL DEFAULT '[]',
    "actions" TEXT NOT NULL DEFAULT '[]',
    "sections" TEXT NOT NULL DEFAULT '[]',
    "filters" TEXT NOT NULL DEFAULT '[]',
    "layout" TEXT NOT NULL DEFAULT 'single_column',
    "widgets" TEXT NOT NULL DEFAULT '[]',
    "moduleName" TEXT,
    "projectId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "BusinessRuleRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ruleId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "tableName" TEXT,
    "moduleName" TEXT,
    "trigger" TEXT NOT NULL,
    "condition" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "exception" TEXT,
    "examples" TEXT NOT NULL DEFAULT '[]',
    "impact" TEXT,
    "approvedBy" TEXT,
    "approvedAt" DATETIME,
    "version" INTEGER NOT NULL DEFAULT 1,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CSHTMLAnalysisCache" (
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
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "UIScreenBlueprint" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "screenName" TEXT NOT NULL,
    "screenType" TEXT NOT NULL DEFAULT 'form',
    "sourceTable" TEXT,
    "sourceCSHTML" TEXT,
    "tableName" TEXT,
    "fields" TEXT NOT NULL DEFAULT '[]',
    "actions" TEXT NOT NULL DEFAULT '[]',
    "sections" TEXT NOT NULL DEFAULT '[]',
    "filters" TEXT NOT NULL DEFAULT '[]',
    "layout" TEXT NOT NULL DEFAULT 'single_column',
    "columnIntel" TEXT NOT NULL DEFAULT '{}',
    "piiDetection" TEXT NOT NULL DEFAULT '{}',
    "reactComponent" TEXT,
    "suggestedRoute" TEXT,
    "migrationStatus" TEXT NOT NULL DEFAULT 'pending',
    "migrationNotes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "DBConversionCache" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "conversionId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL DEFAULT 'sqlserver',
    "targetType" TEXT NOT NULL DEFAULT 'postgresql',
    "tablesConverted" INTEGER NOT NULL DEFAULT 0,
    "columnsConverted" INTEGER NOT NULL DEFAULT 0,
    "fksConverted" INTEGER NOT NULL DEFAULT 0,
    "spsConverted" INTEGER NOT NULL DEFAULT 0,
    "viewsConverted" INTEGER NOT NULL DEFAULT 0,
    "postgresDDL" TEXT NOT NULL DEFAULT '',
    "prismaSchema" TEXT NOT NULL DEFAULT '',
    "nodeJSOutlines" TEXT NOT NULL DEFAULT '[]',
    "typeConversions" TEXT NOT NULL DEFAULT '[]',
    "warnings" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "RequirementRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "requirementId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'functional',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "sourceType" TEXT NOT NULL DEFAULT 'manual',
    "sourceId" TEXT,
    "linkedTables" TEXT NOT NULL DEFAULT '[]',
    "linkedAPIs" TEXT NOT NULL DEFAULT '[]',
    "linkedScreens" TEXT NOT NULL DEFAULT '[]',
    "linkedTestCases" TEXT NOT NULL DEFAULT '[]',
    "linkedSPs" TEXT NOT NULL DEFAULT '[]',
    "implementationStatus" TEXT NOT NULL DEFAULT 'not_started',
    "coveragePercent" INTEGER NOT NULL DEFAULT 0,
    "verifiedBy" TEXT,
    "verifiedAt" DATETIME,
    "verificationNotes" TEXT,
    "moduleName" TEXT,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SchemaVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "versionNumber" TEXT NOT NULL,
    "versionHash" TEXT NOT NULL,
    "tablesSnapshot" TEXT NOT NULL DEFAULT '[]',
    "viewsSnapshot" TEXT NOT NULL DEFAULT '[]',
    "spsSnapshot" TEXT NOT NULL DEFAULT '[]',
    "totalTables" INTEGER NOT NULL DEFAULT 0,
    "totalViews" INTEGER NOT NULL DEFAULT 0,
    "totalSPs" INTEGER NOT NULL DEFAULT 0,
    "totalColumns" INTEGER NOT NULL DEFAULT 0,
    "totalFKs" INTEGER NOT NULL DEFAULT 0,
    "changesSummary" TEXT NOT NULL DEFAULT '{}',
    "triggeredBy" TEXT,
    "triggerSource" TEXT NOT NULL DEFAULT 'upload',
    "description" TEXT,
    "previousVersionId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "SchemaDiff" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "fromVersionId" TEXT NOT NULL,
    "toVersionId" TEXT NOT NULL,
    "tableChanges" TEXT NOT NULL DEFAULT '[]',
    "columnChanges" TEXT NOT NULL DEFAULT '[]',
    "fkChanges" TEXT NOT NULL DEFAULT '[]',
    "indexChanges" TEXT NOT NULL DEFAULT '[]',
    "spChanges" TEXT NOT NULL DEFAULT '[]',
    "viewChanges" TEXT NOT NULL DEFAULT '[]',
    "breakingChanges" TEXT NOT NULL DEFAULT '[]',
    "affectedModules" TEXT NOT NULL DEFAULT '[]',
    "affectedScreens" TEXT NOT NULL DEFAULT '[]',
    "affectedAPIs" TEXT NOT NULL DEFAULT '[]',
    "riskLevel" TEXT NOT NULL DEFAULT 'low',
    "riskNotes" TEXT NOT NULL DEFAULT '[]',
    "migrationScript" TEXT,
    "prismaMigration" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "DecisionRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "decisionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'architecture',
    "context" TEXT,
    "problemStatement" TEXT,
    "decision" TEXT NOT NULL,
    "rationale" TEXT,
    "alternatives" TEXT NOT NULL DEFAULT '[]',
    "impact" TEXT NOT NULL DEFAULT 'medium',
    "affectedAreas" TEXT NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'proposed',
    "supersededBy" TEXT,
    "proposedBy" TEXT,
    "decidedBy" TEXT,
    "approvedBy" TEXT,
    "decidedAt" DATETIME,
    "approvedAt" DATETIME,
    "relatedDecisions" TEXT NOT NULL DEFAULT '[]',
    "relatedTables" TEXT NOT NULL DEFAULT '[]',
    "relatedModules" TEXT NOT NULL DEFAULT '[]',
    "tags" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TeamMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "role" TEXT NOT NULL DEFAULT 'developer',
    "skills" TEXT NOT NULL DEFAULT '[]',
    "availability" INTEGER NOT NULL DEFAULT 100,
    "hourlyRate" REAL,
    "currentAssignments" TEXT NOT NULL DEFAULT '[]',
    "projectsCompleted" INTEGER NOT NULL DEFAULT 0,
    "averageVelocity" REAL NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TeamAllocation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "allocationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sprintNumber" INTEGER,
    "startDate" DATETIME,
    "endDate" DATETIME,
    "assignments" TEXT NOT NULL DEFAULT '[]',
    "moduleAssignments" TEXT NOT NULL DEFAULT '[]',
    "totalMembers" INTEGER NOT NULL DEFAULT 0,
    "totalModules" INTEGER NOT NULL DEFAULT 0,
    "totalHours" REAL NOT NULL DEFAULT 0,
    "totalStoryPoints" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'planned',
    "plannedVelocity" INTEGER NOT NULL DEFAULT 0,
    "actualVelocity" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "GapAnalysisRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "targetName" TEXT NOT NULL,
    "gapType" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'medium',
    "description" TEXT,
    "expectedArtifacts" TEXT NOT NULL DEFAULT '[]',
    "existingArtifacts" TEXT NOT NULL DEFAULT '[]',
    "missingArtifacts" TEXT NOT NULL DEFAULT '[]',
    "coveragePercent" INTEGER NOT NULL DEFAULT 0,
    "recommendations" TEXT NOT NULL DEFAULT '[]',
    "resolutionStatus" TEXT NOT NULL DEFAULT 'open',
    "resolvedAt" DATETIME,
    "resolvedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "JSIntelligenceCache" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT,
    "fileType" TEXT NOT NULL DEFAULT 'javascript',
    "framework" TEXT NOT NULL DEFAULT 'unknown',
    "complexity" INTEGER NOT NULL DEFAULT 0,
    "ajaxCalls" TEXT NOT NULL DEFAULT '[]',
    "eventHandlers" TEXT NOT NULL DEFAULT '[]',
    "dependencies" TEXT NOT NULL DEFAULT '[]',
    "formValidations" TEXT NOT NULL DEFAULT '[]',
    "discoveredEndpoints" TEXT NOT NULL DEFAULT '[]',
    "jqueryPlugins" TEXT NOT NULL DEFAULT '[]',
    "bootstrapComponents" TEXT NOT NULL DEFAULT '[]',
    "linkedCSHTML" TEXT,
    "linkedTable" TEXT,
    "rawContent" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AjaxCallCache" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "jsFileId" TEXT,
    "callId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'GET',
    "dataType" TEXT,
    "contentType" TEXT,
    "isAsync" BOOLEAN NOT NULL DEFAULT true,
    "parameters" TEXT NOT NULL DEFAULT '[]',
    "successCallback" TEXT,
    "errorCallback" TEXT,
    "sourceFile" TEXT NOT NULL,
    "lineNumber" INTEGER,
    "context" TEXT,
    "linkedSP" TEXT,
    "linkedEndpoint" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "EventHandlerCache" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "jsFileId" TEXT,
    "handlerId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "selector" TEXT NOT NULL,
    "handlerType" TEXT NOT NULL,
    "functionName" TEXT,
    "code" TEXT NOT NULL DEFAULT '',
    "sourceFile" TEXT NOT NULL,
    "lineNumber" INTEGER,
    "linkedField" TEXT,
    "linkedAction" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "FormValidationCache" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "jsFileId" TEXT,
    "formId" TEXT,
    "formSelector" TEXT NOT NULL,
    "rules" TEXT NOT NULL DEFAULT '[]',
    "messages" TEXT NOT NULL DEFAULT '{}',
    "submitHandler" TEXT,
    "sourceFile" TEXT NOT NULL,
    "linkedTable" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "FileClassificationCache" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "framework" TEXT NOT NULL,
    "confidence" INTEGER NOT NULL DEFAULT 0,
    "indicators" TEXT NOT NULL DEFAULT '[]',
    "suggestedParser" TEXT,
    "fileSize" INTEGER NOT NULL DEFAULT 0,
    "lineCount" INTEGER NOT NULL DEFAULT 0,
    "estimatedComplexity" TEXT NOT NULL DEFAULT 'low',
    "isProcessed" BOOLEAN NOT NULL DEFAULT false,
    "processedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SPWorkflowChain" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "chainId" TEXT NOT NULL,
    "chainName" TEXT NOT NULL,
    "description" TEXT,
    "processType" TEXT NOT NULL DEFAULT 'unknown',
    "moduleName" TEXT,
    "steps" TEXT NOT NULL DEFAULT '[]',
    "totalSteps" INTEGER NOT NULL DEFAULT 0,
    "estimatedDuration" INTEGER NOT NULL DEFAULT 0,
    "entryPoints" TEXT NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'discovered',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SPDependencyGraph" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "callerSP" TEXT NOT NULL,
    "calledSP" TEXT NOT NULL,
    "callType" TEXT NOT NULL DEFAULT 'exec',
    "parameterMapping" TEXT NOT NULL DEFAULT '[]',
    "lineNumber" INTEGER,
    "context" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Page" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "moduleId" TEXT,
    "name" TEXT NOT NULL,
    "urlSlug" TEXT NOT NULL,
    "title" TEXT,
    "layout" TEXT NOT NULL DEFAULT '_Layout',
    "pageType" TEXT NOT NULL DEFAULT 'form',
    "sourceFile" TEXT,
    "sourceTable" TEXT,
    "migrationStatus" TEXT NOT NULL DEFAULT 'pending',
    "reactPath" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PageComponent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pageId" TEXT NOT NULL,
    "componentType" TEXT NOT NULL,
    "componentName" TEXT NOT NULL,
    "parentComponentId" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "props" TEXT NOT NULL DEFAULT '{}',
    "content" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PageComponent_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PageComponent_parentComponentId_fkey" FOREIGN KEY ("parentComponentId") REFERENCES "PageComponent" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Form" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pageId" TEXT,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "formKey" TEXT NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'POST',
    "actionUrl" TEXT,
    "enctype" TEXT NOT NULL DEFAULT 'application/x-www-form-urlencoded',
    "sourceTable" TEXT,
    "sourceSP" TEXT,
    "validationEnabled" BOOLEAN NOT NULL DEFAULT true,
    "customValidation" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Form_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FormField" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "formId" TEXT NOT NULL,
    "fieldName" TEXT NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "fieldType" TEXT NOT NULL DEFAULT 'text_input',
    "uiComponent" TEXT,
    "label" TEXT NOT NULL,
    "placeholder" TEXT,
    "helpText" TEXT,
    "validationRules" TEXT NOT NULL DEFAULT '[]',
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "isReadOnly" BOOLEAN NOT NULL DEFAULT false,
    "defaultValue" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "section" TEXT,
    "linkedColumn" TEXT,
    "semanticType" TEXT,
    "sensitivity" TEXT NOT NULL DEFAULT 'public',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FormField_formId_fkey" FOREIGN KEY ("formId") REFERENCES "Form" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Controller" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "moduleId" TEXT,
    "name" TEXT NOT NULL,
    "controllerKey" TEXT NOT NULL,
    "filePath" TEXT,
    "sourceType" TEXT NOT NULL DEFAULT 'mvc',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "APIEndpoint" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "controllerId" TEXT NOT NULL,
    "endpointKey" TEXT NOT NULL,
    "methodName" TEXT NOT NULL,
    "httpMethod" TEXT NOT NULL DEFAULT 'GET',
    "route" TEXT NOT NULL,
    "routePrefix" TEXT,
    "parameters" TEXT NOT NULL DEFAULT '[]',
    "requestBody" TEXT,
    "responseBody" TEXT,
    "responseType" TEXT,
    "sourceSP" TEXT,
    "sourceTable" TEXT,
    "requiresAuth" BOOLEAN NOT NULL DEFAULT true,
    "requiredRoles" TEXT NOT NULL DEFAULT '[]',
    "summary" TEXT,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "APIEndpoint_controllerId_fkey" FOREIGN KEY ("controllerId") REFERENCES "Controller" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Workflow" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "moduleId" TEXT,
    "workflowKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "businessContext" TEXT,
    "isSequential" BOOLEAN NOT NULL DEFAULT true,
    "allowParallel" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "WorkflowState" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workflowId" TEXT NOT NULL,
    "stateKey" TEXT NOT NULL,
    "stateName" TEXT NOT NULL,
    "isInitial" BOOLEAN NOT NULL DEFAULT false,
    "isFinal" BOOLEAN NOT NULL DEFAULT false,
    "isError" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "onEnter" TEXT,
    "onExit" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WorkflowState_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WorkflowTransition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workflowId" TEXT NOT NULL,
    "transitionKey" TEXT NOT NULL,
    "transitionName" TEXT NOT NULL,
    "fromStateId" TEXT NOT NULL,
    "toStateId" TEXT NOT NULL,
    "trigger" TEXT,
    "triggerType" TEXT NOT NULL DEFAULT 'manual',
    "conditions" TEXT NOT NULL DEFAULT '[]',
    "actions" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WorkflowTransition_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WorkflowTransition_fromStateId_fkey" FOREIGN KEY ("fromStateId") REFERENCES "WorkflowState" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WorkflowTransition_toStateId_fkey" FOREIGN KEY ("toStateId") REFERENCES "WorkflowState" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "moduleId" TEXT,
    "reportKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "businessPurpose" TEXT,
    "sourceView" TEXT,
    "sourceTable" TEXT,
    "sourceSP" TEXT,
    "reportType" TEXT NOT NULL DEFAULT 'tabular',
    "columns" TEXT NOT NULL DEFAULT '[]',
    "groupBy" TEXT NOT NULL DEFAULT '[]',
    "orderBy" TEXT NOT NULL DEFAULT '[]',
    "exportFormats" TEXT NOT NULL DEFAULT '["pdf","excel","csv"]',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ReportFilter" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reportId" TEXT NOT NULL,
    "filterKey" TEXT NOT NULL,
    "filterName" TEXT NOT NULL,
    "filterType" TEXT NOT NULL DEFAULT 'text',
    "columnName" TEXT NOT NULL,
    "operator" TEXT NOT NULL DEFAULT '=',
    "defaultValue" TEXT,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "options" TEXT NOT NULL DEFAULT '[]',
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ReportFilter_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TestCase" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "moduleId" TEXT,
    "testCaseKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "preconditions" TEXT NOT NULL DEFAULT '[]',
    "testCaseType" TEXT NOT NULL DEFAULT 'functional',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "expectedResult" TEXT,
    "sourceWorkflow" TEXT,
    "sourceTable" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TestStep" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "testCaseId" TEXT NOT NULL,
    "stepNumber" INTEGER NOT NULL,
    "instruction" TEXT NOT NULL,
    "detailedInstruction" TEXT,
    "expectedResult" TEXT,
    "testData" TEXT NOT NULL DEFAULT '{}',
    "isOptional" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TestStep_testCaseId_fkey" FOREIGN KEY ("testCaseId") REFERENCES "TestCase" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AgentRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "agentName" TEXT NOT NULL,
    "agentVersion" TEXT NOT NULL DEFAULT '1.0.0',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    "duration" INTEGER,
    "inputConfig" TEXT NOT NULL DEFAULT '{}',
    "outputData" TEXT NOT NULL DEFAULT '{}',
    "itemsProcessed" INTEGER NOT NULL DEFAULT 0,
    "itemsProduced" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "errorStack" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AgentMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "messageType" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "payload" TEXT NOT NULL DEFAULT '{}',
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AgentMessage_runId_fkey" FOREIGN KEY ("runId") REFERENCES "AgentRun" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SPIntelligence" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "procedureName" TEXT NOT NULL,
    "originalDDL" TEXT NOT NULL,
    "schemaName" TEXT NOT NULL DEFAULT 'dbo',
    "actionType" TEXT NOT NULL DEFAULT 'unknown',
    "classificationMethod" TEXT NOT NULL DEFAULT 'pattern_match',
    "classificationConfidence" REAL NOT NULL DEFAULT 0.0,
    "inputParameters" TEXT NOT NULL DEFAULT '[]',
    "outputParameters" TEXT NOT NULL DEFAULT '[]',
    "systemParameters" TEXT NOT NULL DEFAULT '[]',
    "optionalParameters" TEXT NOT NULL DEFAULT '[]',
    "businessRules" TEXT NOT NULL DEFAULT '[]',
    "errorCodes" TEXT NOT NULL DEFAULT '[]',
    "tableAccess" TEXT NOT NULL DEFAULT '[]',
    "subProcedureCalls" TEXT NOT NULL DEFAULT '[]',
    "sideEffects" TEXT NOT NULL DEFAULT '[]',
    "hasTransaction" BOOLEAN NOT NULL DEFAULT false,
    "hasTryCatch" BOOLEAN NOT NULL DEFAULT false,
    "hasErrorHandling" BOOLEAN NOT NULL DEFAULT false,
    "hasDynamicSQL" BOOLEAN NOT NULL DEFAULT false,
    "hasTempTables" BOOLEAN NOT NULL DEFAULT false,
    "hasCursor" BOOLEAN NOT NULL DEFAULT false,
    "lineCount" INTEGER NOT NULL DEFAULT 0,
    "parameterCount" INTEGER NOT NULL DEFAULT 0,
    "businessRuleCount" INTEGER NOT NULL DEFAULT 0,
    "tableAccessCount" INTEGER NOT NULL DEFAULT 0,
    "nestingDepth" INTEGER NOT NULL DEFAULT 0,
    "cyclomaticComplexity" INTEGER NOT NULL DEFAULT 0,
    "migrationRisk" TEXT NOT NULL DEFAULT 'medium',
    "suggestedHttpMethod" TEXT,
    "suggestedRoute" TEXT,
    "suggestedModule" TEXT,
    "generatedApiCode" TEXT,
    "generatedTypes" TEXT,
    "generatedValidation" TEXT,
    "correlatedViews" TEXT NOT NULL DEFAULT '[]',
    "correlatedTables" TEXT NOT NULL DEFAULT '[]',
    "correlatedControllers" TEXT NOT NULL DEFAULT '[]',
    "isAnalyzed" BOOLEAN NOT NULL DEFAULT false,
    "isCorrelated" BOOLEAN NOT NULL DEFAULT false,
    "isGenerated" BOOLEAN NOT NULL DEFAULT false,
    "needsManualReview" BOOLEAN NOT NULL DEFAULT false,
    "reviewNotes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "DLLIntelligence" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "dllName" TEXT NOT NULL,
    "dllVersion" TEXT,
    "controllers" TEXT NOT NULL DEFAULT '[]',
    "controllerActions" TEXT NOT NULL DEFAULT '[]',
    "routeMappings" TEXT NOT NULL DEFAULT '[]',
    "authorizationRules" TEXT NOT NULL DEFAULT '[]',
    "modelClasses" TEXT NOT NULL DEFAULT '[]',
    "dtoClasses" TEXT NOT NULL DEFAULT '[]',
    "viewModels" TEXT NOT NULL DEFAULT '[]',
    "enumerations" TEXT NOT NULL DEFAULT '[]',
    "serviceClasses" TEXT NOT NULL DEFAULT '[]',
    "repositoryClasses" TEXT NOT NULL DEFAULT '[]',
    "helperClasses" TEXT NOT NULL DEFAULT '[]',
    "nugetPackages" TEXT NOT NULL DEFAULT '[]',
    "projectReferences" TEXT NOT NULL DEFAULT '[]',
    "namespaces" TEXT NOT NULL DEFAULT '[]',
    "isDecompiled" BOOLEAN NOT NULL DEFAULT false,
    "isAnalyzed" BOOLEAN NOT NULL DEFAULT false,
    "analysisMethod" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "APIGenerationResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "moduleName" TEXT NOT NULL,
    "entityName" TEXT NOT NULL,
    "sourceSPs" TEXT NOT NULL DEFAULT '[]',
    "sourceTables" TEXT NOT NULL DEFAULT '[]',
    "routeFilePath" TEXT NOT NULL,
    "routeFileContent" TEXT NOT NULL,
    "typeFilePath" TEXT,
    "typeFileContent" TEXT,
    "validationFilePath" TEXT,
    "validationContent" TEXT,
    "testFilePath" TEXT,
    "testFileContent" TEXT,
    "generationConfidence" REAL NOT NULL DEFAULT 0.0,
    "compilable" BOOLEAN NOT NULL DEFAULT false,
    "hasTypeErrors" BOOLEAN NOT NULL DEFAULT false,
    "warningCount" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "validationLog" TEXT NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'generated',
    "reviewedBy" TEXT,
    "reviewedAt" DATETIME,
    "approvedBy" TEXT,
    "approvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "MigrationMapping" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "legacyType" TEXT NOT NULL,
    "legacyName" TEXT NOT NULL,
    "legacyPath" TEXT,
    "legacySignature" TEXT,
    "modernType" TEXT NOT NULL,
    "modernName" TEXT NOT NULL,
    "modernPath" TEXT,
    "modernSignature" TEXT,
    "mappingMethod" TEXT NOT NULL DEFAULT 'auto',
    "confidence" REAL NOT NULL DEFAULT 0.0,
    "isComplete" BOOLEAN NOT NULL DEFAULT false,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'mapped',
    "migrationNotes" TEXT,
    "blockers" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CSHTMLAjaxEndpoint" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "cshtmlViewName" TEXT NOT NULL,
    "endpointUrl" TEXT NOT NULL,
    "httpMethod" TEXT NOT NULL DEFAULT 'GET',
    "dataType" TEXT,
    "parameters" TEXT NOT NULL DEFAULT '[]',
    "successCallback" TEXT,
    "errorCallback" TEXT,
    "lineNumber" INTEGER,
    "context" TEXT,
    "linkedSP" TEXT,
    "linkedController" TEXT,
    "linkedAction" TEXT,
    "correlationConfidence" REAL NOT NULL DEFAULT 0.0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ErrorCodeMapping" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "spName" TEXT NOT NULL,
    "errorCode" INTEGER NOT NULL,
    "spErrorMessage" TEXT,
    "spCondition" TEXT,
    "cshtmlViewName" TEXT,
    "cshtmlErrorHandler" TEXT,
    "cshtmlUserMessage" TEXT,
    "messageAlignment" TEXT NOT NULL DEFAULT 'unknown',
    "migratedErrorHandling" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "DropdownMapping" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "cshtmlViewName" TEXT NOT NULL,
    "dropdownId" TEXT,
    "dropdownName" TEXT,
    "ddlMethod" TEXT,
    "linkedSP" TEXT,
    "linkedTable" TEXT,
    "valueColumn" TEXT,
    "textColumn" TEXT,
    "parentDropdownId" TEXT,
    "cascadeParameter" TEXT,
    "confidence" REAL NOT NULL DEFAULT 0.0,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ConfidenceScore" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "score" REAL NOT NULL,
    "confidence" TEXT NOT NULL,
    "factors" TEXT NOT NULL DEFAULT '[]',
    "source" TEXT NOT NULL DEFAULT 'inference',
    "verifiedAt" DATETIME,
    "verifiedBy" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ScoringFactor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "weight" REAL NOT NULL DEFAULT 0.15,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'default',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ExtractionConflict" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "conflictType" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'medium',
    "source1Agent" TEXT NOT NULL,
    "source1Value" TEXT NOT NULL DEFAULT '{}',
    "source1Confidence" REAL NOT NULL DEFAULT 0.5,
    "source1File" TEXT,
    "source2Agent" TEXT NOT NULL,
    "source2Value" TEXT NOT NULL DEFAULT '{}',
    "source2Confidence" REAL NOT NULL DEFAULT 0.5,
    "source2File" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "resolution" TEXT,
    "resolvedValue" TEXT DEFAULT '{}',
    "resolvedBy" TEXT,
    "resolvedAt" DATETIME,
    "resolutionNotes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ConflictRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "conflictType" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 10,
    "resolution" TEXT NOT NULL,
    "resolutionLogic" TEXT,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ProjectVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "name" TEXT,
    "description" TEXT,
    "snapshot" TEXT NOT NULL,
    "changeSummary" TEXT NOT NULL DEFAULT '{}',
    "changeCount" INTEGER NOT NULL DEFAULT 0,
    "tablesAdded" INTEGER NOT NULL DEFAULT 0,
    "tablesRemoved" INTEGER NOT NULL DEFAULT 0,
    "tablesModified" INTEGER NOT NULL DEFAULT 0,
    "spsAdded" INTEGER NOT NULL DEFAULT 0,
    "spsRemoved" INTEGER NOT NULL DEFAULT 0,
    "spsModified" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT,
    "isAutoSave" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ParseCache" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "parseResult" TEXT NOT NULL,
    "parseVersion" TEXT NOT NULL DEFAULT '1.0.0',
    "parseDuration" INTEGER NOT NULL DEFAULT 0,
    "entityCount" INTEGER NOT NULL DEFAULT 0,
    "isValid" BOOLEAN NOT NULL DEFAULT true,
    "errorMessage" TEXT,
    "parsedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "VerificationItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT,
    "itemType" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "itemData" TEXT NOT NULL DEFAULT '{}',
    "confidence" REAL NOT NULL DEFAULT 0.5,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "category" TEXT NOT NULL DEFAULT 'general',
    "suggestedValue" TEXT DEFAULT '{}',
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewedBy" TEXT,
    "reviewedAt" DATETIME,
    "reviewNotes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "DataLineage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "entityName" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceAgent" TEXT,
    "sourceFileId" TEXT,
    "sourceFileName" TEXT,
    "sourceLineStart" INTEGER,
    "sourceLineEnd" INTEGER,
    "sourceCharStart" INTEGER,
    "sourceCharEnd" INTEGER,
    "extractionMethod" TEXT NOT NULL DEFAULT 'direct_parse',
    "extractionConfidence" REAL NOT NULL DEFAULT 1.0,
    "extractionTime" INTEGER NOT NULL DEFAULT 0,
    "dependsOn" TEXT NOT NULL DEFAULT '[]',
    "dependedBy" TEXT NOT NULL DEFAULT '[]',
    "extractedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "IncrementalChange" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "versionFrom" INTEGER NOT NULL,
    "versionTo" INTEGER NOT NULL,
    "changeType" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "entityName" TEXT NOT NULL,
    "oldValue" TEXT DEFAULT '{}',
    "newValue" TEXT DEFAULT '{}',
    "impactScore" INTEGER NOT NULL DEFAULT 0,
    "affectedEntities" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "QualityMetrics" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "projectIdStr" TEXT,
    "avgConfidence" REAL NOT NULL DEFAULT 0,
    "highConfidence" INTEGER NOT NULL DEFAULT 0,
    "mediumConfidence" INTEGER NOT NULL DEFAULT 0,
    "lowConfidence" INTEGER NOT NULL DEFAULT 0,
    "unverified" INTEGER NOT NULL DEFAULT 0,
    "totalConflicts" INTEGER NOT NULL DEFAULT 0,
    "resolvedConflicts" INTEGER NOT NULL DEFAULT 0,
    "pendingConflicts" INTEGER NOT NULL DEFAULT 0,
    "criticalConflicts" INTEGER NOT NULL DEFAULT 0,
    "pendingVerifications" INTEGER NOT NULL DEFAULT 0,
    "approvedVerifications" INTEGER NOT NULL DEFAULT 0,
    "rejectedVerifications" INTEGER NOT NULL DEFAULT 0,
    "totalTables" INTEGER NOT NULL DEFAULT 0,
    "totalColumns" INTEGER NOT NULL DEFAULT 0,
    "totalFKs" INTEGER NOT NULL DEFAULT 0,
    "totalSPs" INTEGER NOT NULL DEFAULT 0,
    "totalViews" INTEGER NOT NULL DEFAULT 0,
    "moduleCoverage" REAL NOT NULL DEFAULT 0,
    "fkResolution" REAL NOT NULL DEFAULT 0,
    "piiDetection" REAL NOT NULL DEFAULT 0,
    "qualityScore" REAL NOT NULL DEFAULT 0,
    "calculatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "KGNode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "nodeType" TEXT NOT NULL,
    "nodeSubtype" TEXT,
    "name" TEXT NOT NULL,
    "displayName" TEXT,
    "description" TEXT,
    "positionX" REAL,
    "positionY" REAL,
    "color" TEXT,
    "size" REAL NOT NULL DEFAULT 1.0,
    "icon" TEXT,
    "properties" TEXT NOT NULL DEFAULT '{}',
    "confidence" REAL NOT NULL DEFAULT 1.0,
    "source" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "KGEdge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "sourceNodeId" TEXT NOT NULL,
    "targetNodeId" TEXT NOT NULL,
    "edgeType" TEXT NOT NULL,
    "label" TEXT,
    "properties" TEXT NOT NULL DEFAULT '{}',
    "confidence" REAL NOT NULL DEFAULT 1.0,
    "weight" REAL NOT NULL DEFAULT 1.0,
    "source" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "KGEdge_sourceNodeId_fkey" FOREIGN KEY ("sourceNodeId") REFERENCES "KGNode" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "KGEdge_targetNodeId_fkey" FOREIGN KEY ("targetNodeId") REFERENCES "KGNode" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CodeEmbedding" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "embedding" TEXT,
    "embeddingModel" TEXT,
    "tokenCount" INTEGER NOT NULL DEFAULT 0,
    "contentHash" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PipelineRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT,
    "runId" TEXT NOT NULL,
    "runName" TEXT,
    "config" TEXT NOT NULL DEFAULT '{}',
    "triggerSource" TEXT NOT NULL DEFAULT 'manual',
    "status" TEXT NOT NULL DEFAULT 'idle',
    "startTime" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" DATETIME,
    "duration" INTEGER,
    "totalAgents" INTEGER NOT NULL DEFAULT 0,
    "completedAgents" INTEGER NOT NULL DEFAULT 0,
    "failedAgents" INTEGER NOT NULL DEFAULT 0,
    "skippedAgents" INTEGER NOT NULL DEFAULT 0,
    "output" TEXT,
    "errors" TEXT NOT NULL DEFAULT '[]',
    "itemsProcessed" INTEGER NOT NULL DEFAULT 0,
    "itemsProduced" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "PipelineRunExecution" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "agentName" TEXT NOT NULL,
    "agentVersion" TEXT NOT NULL DEFAULT '1.0.0',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "startTime" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" DATETIME,
    "duration" INTEGER,
    "input" TEXT,
    "output" TEXT,
    "itemsProcessed" INTEGER NOT NULL DEFAULT 0,
    "itemsProduced" INTEGER NOT NULL DEFAULT 0,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "warnings" TEXT NOT NULL DEFAULT '[]',
    CONSTRAINT "PipelineRunExecution_runId_fkey" FOREIGN KEY ("runId") REFERENCES "PipelineRun" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PipelineRunLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runId" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "level" TEXT NOT NULL DEFAULT 'info',
    "agentId" TEXT,
    "message" TEXT NOT NULL,
    "data" TEXT,
    CONSTRAINT "PipelineRunLog_runId_fkey" FOREIGN KEY ("runId") REFERENCES "PipelineRun" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SearchIndex" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "keywords" TEXT NOT NULL DEFAULT '[]',
    "tags" TEXT NOT NULL DEFAULT '[]',
    "relevanceScore" REAL NOT NULL DEFAULT 1.0,
    "source" TEXT,
    "indexedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "UnifiedField" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "tableId" TEXT,
    "tableName" TEXT NOT NULL,
    "fieldName" TEXT NOT NULL,
    "qualifiedName" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "schemaDataType" TEXT,
    "schemaBaseType" TEXT,
    "schemaMaxLength" INTEGER,
    "schemaPrecision" INTEGER,
    "schemaScale" INTEGER,
    "schemaIsNullable" BOOLEAN NOT NULL DEFAULT true,
    "schemaIsPrimaryKey" BOOLEAN NOT NULL DEFAULT false,
    "schemaIsIdentity" BOOLEAN NOT NULL DEFAULT false,
    "schemaIsComputed" BOOLEAN NOT NULL DEFAULT false,
    "schemaDefaultValue" TEXT,
    "schemaCheckConstraint" TEXT,
    "schemaSource" TEXT NOT NULL DEFAULT 'unknown',
    "schemaConfidence" REAL NOT NULL DEFAULT 0.0,
    "fkIsForeignKey" BOOLEAN NOT NULL DEFAULT false,
    "fkReferencedTable" TEXT,
    "fkReferencedColumn" TEXT,
    "fkTableExists" BOOLEAN NOT NULL DEFAULT false,
    "fkRelationshipType" TEXT,
    "fkOnDelete" TEXT,
    "fkOnUpdate" TEXT,
    "fkResolutionStatus" TEXT NOT NULL DEFAULT 'not_fk',
    "fkCascadeChain" TEXT NOT NULL DEFAULT '[]',
    "fkSources" TEXT NOT NULL DEFAULT '{}',
    "fkConfidence" REAL NOT NULL DEFAULT 0.0,
    "intelSemanticType" TEXT,
    "intelSemanticCategory" TEXT,
    "intelBusinessMeaning" TEXT,
    "intelDataPattern" TEXT,
    "intelExampleValues" TEXT NOT NULL DEFAULT '[]',
    "intelSuggestedLabel" TEXT,
    "intelSuggestedPlaceholder" TEXT,
    "intelSuggestedHelpText" TEXT,
    "intelIsSystemField" BOOLEAN NOT NULL DEFAULT false,
    "intelIsAuditField" BOOLEAN NOT NULL DEFAULT false,
    "intelIsCalculated" BOOLEAN NOT NULL DEFAULT false,
    "intelConfidence" REAL NOT NULL DEFAULT 0.0,
    "uiComponentType" TEXT,
    "uiHtmlInputType" TEXT,
    "uiRenderAs" TEXT,
    "uiGridWidth" TEXT NOT NULL DEFAULT 'col-md-6',
    "uiLabelPosition" TEXT NOT NULL DEFAULT 'left',
    "uiGroupName" TEXT,
    "uiTabName" TEXT,
    "uiSectionName" TEXT,
    "uiIsHidden" BOOLEAN NOT NULL DEFAULT false,
    "uiIsReadOnly" BOOLEAN NOT NULL DEFAULT false,
    "uiIsDisabled" BOOLEAN NOT NULL DEFAULT false,
    "uiConditionalDisplay" TEXT,
    "uiDropdownConfig" TEXT,
    "uiDateConfig" TEXT,
    "uiFileConfig" TEXT,
    "uiSopRulesApplied" TEXT NOT NULL DEFAULT '[]',
    "uiConfidence" REAL NOT NULL DEFAULT 0.0,
    "validationIsRequired" BOOLEAN NOT NULL DEFAULT false,
    "validationClientRules" TEXT NOT NULL DEFAULT '[]',
    "validationServerRules" TEXT NOT NULL DEFAULT '[]',
    "validationCrossRules" TEXT NOT NULL DEFAULT '[]',
    "validationDbConstraints" TEXT NOT NULL DEFAULT '[]',
    "validationAlignment" TEXT NOT NULL DEFAULT 'unknown',
    "validationMissing" TEXT NOT NULL DEFAULT '[]',
    "validationExcessive" TEXT NOT NULL DEFAULT '[]',
    "validationConfidence" REAL NOT NULL DEFAULT 0.0,
    "compSensitivityLevel" TEXT NOT NULL DEFAULT 'public',
    "compIsPII" BOOLEAN NOT NULL DEFAULT false,
    "compIsPHI" BOOLEAN NOT NULL DEFAULT false,
    "compIsFinancial" BOOLEAN NOT NULL DEFAULT false,
    "compPiiCategory" TEXT,
    "compPhiCategory" TEXT,
    "compRequiresEncryption" BOOLEAN NOT NULL DEFAULT false,
    "compRequiresMasking" BOOLEAN NOT NULL DEFAULT false,
    "compMaskingPattern" TEXT,
    "compRetentionPolicy" TEXT,
    "compConsentRequired" BOOLEAN NOT NULL DEFAULT false,
    "compAuditRequired" BOOLEAN NOT NULL DEFAULT false,
    "compAccessRestrictions" TEXT NOT NULL DEFAULT '[]',
    "compRegulatoryFrameworks" TEXT NOT NULL DEFAULT '[]',
    "compConfidence" REAL NOT NULL DEFAULT 0.0,
    "complexityPoints" REAL NOT NULL DEFAULT 0.0,
    "complexityFactors" TEXT NOT NULL DEFAULT '[]',
    "complexityFrontendHrs" REAL NOT NULL DEFAULT 0.0,
    "complexityBackendHrs" REAL NOT NULL DEFAULT 0.0,
    "complexityTestingHrs" REAL NOT NULL DEFAULT 0.0,
    "complexityMigrationRisk" TEXT NOT NULL DEFAULT 'low',
    "sopAppliedRules" TEXT NOT NULL DEFAULT '[]',
    "sopTotalApplicable" INTEGER NOT NULL DEFAULT 0,
    "sopTotalCompliant" INTEGER NOT NULL DEFAULT 0,
    "sopCompliancePercent" REAL NOT NULL DEFAULT 0.0,
    "sopViolations" TEXT NOT NULL DEFAULT '[]',
    "sopAutoFixable" TEXT NOT NULL DEFAULT '[]',
    "cshtmlFoundInViews" TEXT NOT NULL DEFAULT '[]',
    "cshtmlAjaxEndpoints" TEXT NOT NULL DEFAULT '[]',
    "cshtmlJsValidation" TEXT NOT NULL DEFAULT '[]',
    "cshtmlCssClasses" TEXT NOT NULL DEFAULT '[]',
    "cshtmlInlineStyles" TEXT NOT NULL DEFAULT '[]',
    "cshtmlDataAttributes" TEXT NOT NULL DEFAULT '{}',
    "spUsedInSPs" TEXT NOT NULL DEFAULT '[]',
    "spBusinessRules" TEXT NOT NULL DEFAULT '[]',
    "spErrorCodes" TEXT NOT NULL DEFAULT '[]',
    "testCases" TEXT NOT NULL DEFAULT '[]',
    "docDataDictionary" TEXT NOT NULL DEFAULT '{}',
    "docDeveloperNotes" TEXT,
    "docUserGuideText" TEXT,
    "docApiDocumentation" TEXT,
    "metaEnrichedBy" TEXT NOT NULL DEFAULT '[]',
    "metaEnrichmentComplete" REAL NOT NULL DEFAULT 0.0,
    "metaOverallConfidence" REAL NOT NULL DEFAULT 0.0,
    "metaNeedsReview" BOOLEAN NOT NULL DEFAULT false,
    "metaReviewNotes" TEXT NOT NULL DEFAULT '[]',
    "metaVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "UnifiedFieldValidation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fieldId" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "ruleType" TEXT NOT NULL,
    "ruleValue" TEXT,
    "errorMessage" TEXT,
    "errorCode" INTEGER,
    "relatedField" TEXT,
    "spName" TEXT,
    "endpoint" TEXT,
    "source" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "confidence" REAL NOT NULL DEFAULT 1.0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UnifiedFieldValidation_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "UnifiedField" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UnifiedFieldTestCase" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fieldId" TEXT NOT NULL,
    "testCaseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "testType" TEXT NOT NULL,
    "inputValue" TEXT,
    "expectedResult" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "category" TEXT NOT NULL,
    "automatable" BOOLEAN NOT NULL DEFAULT true,
    "generatedFrom" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UnifiedFieldTestCase_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "UnifiedField" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UnifiedFieldSOPCompliance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fieldId" TEXT NOT NULL,
    "sopId" TEXT NOT NULL,
    "sopName" TEXT NOT NULL,
    "sopCategory" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 50,
    "isCompliant" BOOLEAN NOT NULL DEFAULT false,
    "complianceNote" TEXT,
    "autoFixAvailable" BOOLEAN NOT NULL DEFAULT false,
    "autoFixAction" TEXT,
    "fixedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UnifiedFieldSOPCompliance_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "UnifiedField" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UnifiedFieldCSHTMLEvidence" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fieldId" TEXT NOT NULL,
    "viewName" TEXT NOT NULL,
    "viewPath" TEXT,
    "formName" TEXT,
    "htmlElementId" TEXT,
    "htmlElementName" TEXT,
    "htmlElementType" TEXT NOT NULL,
    "lineNumber" INTEGER,
    "contextHTML" TEXT,
    "isInCreateForm" BOOLEAN NOT NULL DEFAULT false,
    "isInUpdateForm" BOOLEAN NOT NULL DEFAULT false,
    "isInGrid" BOOLEAN NOT NULL DEFAULT false,
    "isInFilter" BOOLEAN NOT NULL DEFAULT false,
    "isInModal" BOOLEAN NOT NULL DEFAULT false,
    "cssClasses" TEXT NOT NULL DEFAULT '[]',
    "inlineStyles" TEXT NOT NULL DEFAULT '[]',
    "dataAttributes" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UnifiedFieldCSHTMLEvidence_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "UnifiedField" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UnifiedFieldSPEvidence" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fieldId" TEXT NOT NULL,
    "spName" TEXT NOT NULL,
    "usageType" TEXT NOT NULL,
    "parameterName" TEXT,
    "parameterDirection" TEXT,
    "businessRule" TEXT,
    "errorCode" INTEGER,
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UnifiedFieldSPEvidence_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "UnifiedField" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UnifiedFieldDocumentation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fieldId" TEXT NOT NULL,
    "docType" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "format" TEXT NOT NULL DEFAULT 'markdown',
    "version" INTEGER NOT NULL DEFAULT 1,
    "isAutoGenerated" BOOLEAN NOT NULL DEFAULT true,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UnifiedFieldDocumentation_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "UnifiedField" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UnifiedSOPRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT,
    "sopId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 50,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "appliesTo" TEXT NOT NULL,
    "condition" TEXT NOT NULL,
    "expectedValue" TEXT,
    "autoFixAction" TEXT,
    "sourceDocument" TEXT,
    "sourceVersion" TEXT,
    "isSystemDefault" BOOLEAN NOT NULL DEFAULT false,
    "isCustom" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "UnifiedEnrichmentLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fieldId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "agentName" TEXT NOT NULL,
    "layerEnriched" TEXT NOT NULL,
    "previousValue" TEXT,
    "newValue" TEXT NOT NULL,
    "confidenceBefore" REAL,
    "confidenceAfter" REAL NOT NULL,
    "enrichmentMethod" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "UnifiedConsistencyCheck" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "tableName" TEXT,
    "fieldId" TEXT,
    "checkType" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "currentState" TEXT NOT NULL,
    "expectedState" TEXT NOT NULL,
    "autoFixable" BOOLEAN NOT NULL DEFAULT false,
    "autoFixAction" TEXT,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" DATETIME,
    "resolvedBy" TEXT,
    "resolutionNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "UnifiedTable" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "tableName" TEXT NOT NULL,
    "schemaName" TEXT NOT NULL DEFAULT 'dbo',
    "totalColumns" INTEGER NOT NULL DEFAULT 0,
    "requiredColumns" INTEGER NOT NULL DEFAULT 0,
    "fkColumns" INTEGER NOT NULL DEFAULT 0,
    "piiColumns" INTEGER NOT NULL DEFAULT 0,
    "phiColumns" INTEGER NOT NULL DEFAULT 0,
    "totalComplexityPoints" REAL NOT NULL DEFAULT 0,
    "complexityRating" TEXT NOT NULL DEFAULT 'SIMPLE',
    "estimatedDevDays" REAL NOT NULL DEFAULT 0,
    "complianceScore" REAL NOT NULL DEFAULT 100.0,
    "sopComplianceScore" REAL NOT NULL DEFAULT 100.0,
    "hasComplianceAlert" BOOLEAN NOT NULL DEFAULT false,
    "complianceAlertText" TEXT,
    "schemaComplete" BOOLEAN NOT NULL DEFAULT false,
    "fkResolved" BOOLEAN NOT NULL DEFAULT false,
    "intelligenceComplete" BOOLEAN NOT NULL DEFAULT false,
    "complianceScanned" BOOLEAN NOT NULL DEFAULT false,
    "sopChecked" BOOLEAN NOT NULL DEFAULT false,
    "testsGenerated" BOOLEAN NOT NULL DEFAULT false,
    "docsGenerated" BOOLEAN NOT NULL DEFAULT false,
    "moduleName" TEXT,
    "submoduleName" TEXT,
    "moduleConfidence" REAL NOT NULL DEFAULT 0.0,
    "overallEnrichment" REAL NOT NULL DEFAULT 0.0,
    "overallConfidence" REAL NOT NULL DEFAULT 0.0,
    "issueCount" INTEGER NOT NULL DEFAULT 0,
    "warningCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "UnifiedEnrichmentSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "currentStep" INTEGER NOT NULL DEFAULT 0,
    "totalSteps" INTEGER NOT NULL DEFAULT 12,
    "currentAgent" TEXT,
    "totalFields" INTEGER NOT NULL DEFAULT 0,
    "fieldsEnriched" INTEGER NOT NULL DEFAULT 0,
    "fieldsWithIssues" INTEGER NOT NULL DEFAULT 0,
    "averageConfidence" REAL NOT NULL DEFAULT 0.0,
    "startTime" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" DATETIME,
    "durationMs" INTEGER,
    "errors" TEXT NOT NULL DEFAULT '[]',
    "warnings" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SPClassificationRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pattern" TEXT NOT NULL,
    "patternFlags" TEXT NOT NULL DEFAULT 'i',
    "actionType" TEXT NOT NULL,
    "httpMethod" TEXT NOT NULL DEFAULT 'GET',
    "routePattern" TEXT NOT NULL,
    "routeTemplate" TEXT,
    "isTransactional" BOOLEAN NOT NULL DEFAULT false,
    "requiresAuth" BOOLEAN NOT NULL DEFAULT true,
    "isCacheable" BOOLEAN NOT NULL DEFAULT false,
    "cacheTTL" INTEGER,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "riskLevel" TEXT NOT NULL DEFAULT 'low',
    "description" TEXT,
    "examples" TEXT NOT NULL DEFAULT '[]',
    "category" TEXT NOT NULL DEFAULT 'general',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "matchCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SPBusinessRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "spName" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "ruleType" TEXT NOT NULL,
    "ruleName" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "tableName" TEXT NOT NULL,
    "conditionSQL" TEXT NOT NULL,
    "conditionNormalized" TEXT,
    "businessContext" TEXT,
    "errorHandlingType" TEXT NOT NULL DEFAULT 'blocking',
    "errorCode" INTEGER,
    "errorMessage" TEXT,
    "userFriendlyMessage" TEXT,
    "cshtmlValidation" TEXT,
    "cshtmlErrorMessage" TEXT,
    "validationAlignment" TEXT NOT NULL DEFAULT 'unknown',
    "migratedTo" TEXT,
    "migrationComplexity" TEXT NOT NULL DEFAULT 'simple',
    "migrationNotes" TEXT,
    "extractionConfidence" REAL NOT NULL DEFAULT 0.8,
    "verifiedBy" TEXT,
    "verifiedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SPCorrelation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "spName" TEXT NOT NULL,
    "cshtmlViewName" TEXT NOT NULL,
    "cshtmlViewPath" TEXT,
    "correlationType" TEXT NOT NULL,
    "correlationMethod" TEXT NOT NULL,
    "confidence" REAL NOT NULL DEFAULT 0.0,
    "confidenceBreakdown" TEXT NOT NULL DEFAULT '{}',
    "fieldMappings" TEXT NOT NULL DEFAULT '[]',
    "unmatchedCSHTMLFields" TEXT NOT NULL DEFAULT '[]',
    "unmatchedSPParams" TEXT NOT NULL DEFAULT '[]',
    "typeConflicts" TEXT NOT NULL DEFAULT '[]',
    "validationGaps" TEXT NOT NULL DEFAULT '[]',
    "validationExcessive" TEXT NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "verifiedBy" TEXT,
    "verifiedAt" DATETIME,
    "reviewNotes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SPErrorCodeMapping" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "spName" TEXT NOT NULL,
    "errorCode" INTEGER NOT NULL,
    "errorType" TEXT NOT NULL,
    "spErrorMessage" TEXT,
    "cshtmlViewName" TEXT,
    "cshtmlHandler" TEXT,
    "cshtmlUserMessage" TEXT,
    "userFriendlyMessage" TEXT NOT NULL,
    "suggestedHTTPStatus" INTEGER NOT NULL DEFAULT 400,
    "businessRule" TEXT,
    "severity" TEXT NOT NULL DEFAULT 'error',
    "messageKey" TEXT,
    "messageVariables" TEXT NOT NULL DEFAULT '[]',
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "migratedToCode" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "APIRouteGeneration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "spName" TEXT NOT NULL,
    "httpMethod" TEXT NOT NULL,
    "routePath" TEXT NOT NULL,
    "routeName" TEXT NOT NULL,
    "moduleName" TEXT,
    "entityName" TEXT,
    "generatedTypeScript" TEXT,
    "generatedZodSchema" TEXT,
    "generatedTypes" TEXT,
    "importsSection" TEXT NOT NULL DEFAULT '',
    "schemaSection" TEXT NOT NULL DEFAULT '',
    "handlerSection" TEXT NOT NULL DEFAULT '',
    "middlewareSection" TEXT NOT NULL DEFAULT '',
    "errorHandlingSection" TEXT NOT NULL DEFAULT '',
    "parameterMappings" TEXT NOT NULL DEFAULT '[]',
    "responseMapping" TEXT NOT NULL DEFAULT '{}',
    "errorMappings" TEXT NOT NULL DEFAULT '[]',
    "requiredMiddleware" TEXT NOT NULL DEFAULT '[]',
    "requiredPermissions" TEXT NOT NULL DEFAULT '[]',
    "generationConfidence" REAL NOT NULL DEFAULT 0.0,
    "generationSource" TEXT NOT NULL DEFAULT 'sp',
    "generationVersion" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'generated',
    "reviewedBy" TEXT,
    "reviewedAt" DATETIME,
    "implementedAt" DATETIME,
    "deployedAt" DATETIME,
    "testCoverage" REAL NOT NULL DEFAULT 0.0,
    "documentationComplete" BOOLEAN NOT NULL DEFAULT false,
    "outputFilePath" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "DropdownRegistry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "spName" TEXT NOT NULL,
    "dropdownKey" TEXT NOT NULL,
    "dropdownName" TEXT NOT NULL,
    "description" TEXT,
    "sourceSP" TEXT NOT NULL,
    "moduleName" TEXT,
    "parameters" TEXT NOT NULL DEFAULT '[]',
    "supportsFiltering" BOOLEAN NOT NULL DEFAULT false,
    "filterParameters" TEXT NOT NULL DEFAULT '[]',
    "cascadeFrom" TEXT,
    "cascadeParameter" TEXT,
    "valueColumn" TEXT NOT NULL DEFAULT 'Id',
    "labelColumn" TEXT NOT NULL DEFAULT 'Name',
    "additionalColumns" TEXT NOT NULL DEFAULT '[]',
    "isCacheable" BOOLEAN NOT NULL DEFAULT true,
    "cacheTTL" INTEGER NOT NULL DEFAULT 3600,
    "cacheKeyTemplate" TEXT,
    "defaultOption" TEXT,
    "emptyOption" BOOLEAN NOT NULL DEFAULT false,
    "searchEnabled" BOOLEAN NOT NULL DEFAULT false,
    "multiSelect" BOOLEAN NOT NULL DEFAULT false,
    "apiEndpoint" TEXT,
    "generatedAt" DATETIME,
    "usedInViews" TEXT NOT NULL DEFAULT '[]',
    "usedInForms" TEXT NOT NULL DEFAULT '[]',
    "totalOptions" INTEGER,
    "lastRefreshedAt" DATETIME,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CSHTMLFormIntelligence" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "viewName" TEXT NOT NULL,
    "formId" TEXT,
    "formName" TEXT,
    "actionUrl" TEXT,
    "httpMethod" TEXT NOT NULL DEFAULT 'POST',
    "enctype" TEXT NOT NULL DEFAULT 'application/x-www-form-urlencoded',
    "controllerName" TEXT,
    "actionName" TEXT,
    "fields" TEXT NOT NULL DEFAULT '[]',
    "jqueryValidateRules" TEXT NOT NULL DEFAULT '{}',
    "bootstrapValidator" TEXT NOT NULL DEFAULT '{}',
    "customValidation" TEXT NOT NULL DEFAULT '[]',
    "dropdowns" TEXT NOT NULL DEFAULT '[]',
    "ajaxCalls" TEXT NOT NULL DEFAULT '[]',
    "correlatedSP" TEXT,
    "correlationType" TEXT,
    "correlationConfidence" REAL NOT NULL DEFAULT 0.0,
    "submitHandler" TEXT,
    "successHandler" TEXT,
    "errorHandler" TEXT,
    "errorCodesHandled" TEXT NOT NULL DEFAULT '{}',
    "csrfEnabled" BOOLEAN NOT NULL DEFAULT false,
    "antiForgeryToken" BOOLEAN NOT NULL DEFAULT false,
    "suggestedReactComponent" TEXT,
    "suggestedZodSchema" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SPDependencyChain" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "chainName" TEXT NOT NULL,
    "entryPointSP" TEXT NOT NULL,
    "processType" TEXT NOT NULL,
    "steps" TEXT NOT NULL DEFAULT '[]',
    "totalSteps" INTEGER NOT NULL DEFAULT 0,
    "estimatedDuration" INTEGER NOT NULL DEFAULT 0,
    "errorHandlingStrategy" TEXT NOT NULL DEFAULT 'rollback',
    "transactionScope" TEXT NOT NULL DEFAULT 'chain',
    "moduleName" TEXT,
    "businessContext" TEXT,
    "generatedWorkflow" TEXT,
    "generatedTests" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_isActive_idx" ON "User"("isActive");

-- CreateIndex
CREATE INDEX "Post_authorId_idx" ON "Post"("authorId");

-- CreateIndex
CREATE UNIQUE INDEX "AgentDefinition_agentId_key" ON "AgentDefinition"("agentId");

-- CreateIndex
CREATE INDEX "AgentDefinition_layer_idx" ON "AgentDefinition"("layer");

-- CreateIndex
CREATE INDEX "AgentDefinition_enabled_idx" ON "AgentDefinition"("enabled");

-- CreateIndex
CREATE INDEX "PipelineConfig_name_idx" ON "PipelineConfig"("name");

-- CreateIndex
CREATE UNIQUE INDEX "PipelineExecution_executionId_key" ON "PipelineExecution"("executionId");

-- CreateIndex
CREATE INDEX "PipelineExecution_status_idx" ON "PipelineExecution"("status");

-- CreateIndex
CREATE INDEX "PipelineExecution_startTime_idx" ON "PipelineExecution"("startTime");

-- CreateIndex
CREATE INDEX "PipelineExecution_pipelineId_idx" ON "PipelineExecution"("pipelineId");

-- CreateIndex
CREATE INDEX "AgentExecution_status_idx" ON "AgentExecution"("status");

-- CreateIndex
CREATE INDEX "AgentExecution_startTime_idx" ON "AgentExecution"("startTime");

-- CreateIndex
CREATE INDEX "AgentExecution_agentId_idx" ON "AgentExecution"("agentId");

-- CreateIndex
CREATE INDEX "AgentExecution_pipelineExecutionId_idx" ON "AgentExecution"("pipelineExecutionId");

-- CreateIndex
CREATE UNIQUE INDEX "AgentExecution_executionId_agentId_key" ON "AgentExecution"("executionId", "agentId");

-- CreateIndex
CREATE INDEX "AgentLog_timestamp_idx" ON "AgentLog"("timestamp");

-- CreateIndex
CREATE INDEX "AgentLog_level_idx" ON "AgentLog"("level");

-- CreateIndex
CREATE INDEX "AgentLog_agentExecutionId_idx" ON "AgentLog"("agentExecutionId");

-- CreateIndex
CREATE INDEX "AgentLog_agentDefinitionId_idx" ON "AgentLog"("agentDefinitionId");

-- CreateIndex
CREATE UNIQUE INDEX "ContextSnapshot_snapshotId_key" ON "ContextSnapshot"("snapshotId");

-- CreateIndex
CREATE INDEX "ContextSnapshot_createdAt_idx" ON "ContextSnapshot"("createdAt");

-- CreateIndex
CREATE INDEX "SourceFile_type_idx" ON "SourceFile"("type");

-- CreateIndex
CREATE INDEX "SourceFile_uploadedAt_idx" ON "SourceFile"("uploadedAt");

-- CreateIndex
CREATE UNIQUE INDEX "SourceFile_path_key" ON "SourceFile"("path");

-- CreateIndex
CREATE INDEX "ParsedSchemaTable_tableName_idx" ON "ParsedSchemaTable"("tableName");

-- CreateIndex
CREATE UNIQUE INDEX "ParsedSchemaTable_tableName_schema_key" ON "ParsedSchemaTable"("tableName", "schema");

-- CreateIndex
CREATE INDEX "ParsedStoredProcedureRecord_procedureName_idx" ON "ParsedStoredProcedureRecord"("procedureName");

-- CreateIndex
CREATE UNIQUE INDEX "ParsedStoredProcedureRecord_procedureName_schema_key" ON "ParsedStoredProcedureRecord"("procedureName", "schema");

-- CreateIndex
CREATE UNIQUE INDEX "ModuleDefinition_moduleId_key" ON "ModuleDefinition"("moduleId");

-- CreateIndex
CREATE INDEX "ModuleDefinition_name_idx" ON "ModuleDefinition"("name");

-- CreateIndex
CREATE INDEX "ModuleDefinition_status_idx" ON "ModuleDefinition"("status");

-- CreateIndex
CREATE INDEX "ModuleDefinition_priority_idx" ON "ModuleDefinition"("priority");

-- CreateIndex
CREATE UNIQUE INDEX "UserStoryRecord_storyId_key" ON "UserStoryRecord"("storyId");

-- CreateIndex
CREATE INDEX "UserStoryRecord_title_idx" ON "UserStoryRecord"("title");

-- CreateIndex
CREATE INDEX "UserStoryRecord_priority_idx" ON "UserStoryRecord"("priority");

-- CreateIndex
CREATE INDEX "UserStoryRecord_moduleId_idx" ON "UserStoryRecord"("moduleId");

-- CreateIndex
CREATE UNIQUE INDEX "GeneratedArtifact_artifactId_key" ON "GeneratedArtifact"("artifactId");

-- CreateIndex
CREATE INDEX "GeneratedArtifact_type_idx" ON "GeneratedArtifact"("type");

-- CreateIndex
CREATE INDEX "GeneratedArtifact_name_idx" ON "GeneratedArtifact"("name");

-- CreateIndex
CREATE UNIQUE INDEX "SystemSettings_key_key" ON "SystemSettings"("key");

-- CreateIndex
CREATE INDEX "SystemSettings_key_idx" ON "SystemSettings"("key");

-- CreateIndex
CREATE INDEX "ToolkitProject_name_idx" ON "ToolkitProject"("name");

-- CreateIndex
CREATE INDEX "ToolkitProject_softwareType_idx" ON "ToolkitProject"("softwareType");

-- CreateIndex
CREATE INDEX "ToolkitTable_tableName_idx" ON "ToolkitTable"("tableName");

-- CreateIndex
CREATE UNIQUE INDEX "ToolkitTable_projectId_tableName_key" ON "ToolkitTable"("projectId", "tableName");

-- CreateIndex
CREATE INDEX "ToolkitProcedure_procedureName_idx" ON "ToolkitProcedure"("procedureName");

-- CreateIndex
CREATE UNIQUE INDEX "ToolkitProcedure_projectId_procedureName_key" ON "ToolkitProcedure"("projectId", "procedureName");

-- CreateIndex
CREATE INDEX "ToolkitTestCase_projectId_idx" ON "ToolkitTestCase"("projectId");

-- CreateIndex
CREATE INDEX "ToolkitTestCase_module_idx" ON "ToolkitTestCase"("module");

-- CreateIndex
CREATE INDEX "ToolkitUserStory_projectId_idx" ON "ToolkitUserStory"("projectId");

-- CreateIndex
CREATE INDEX "ToolkitUserStory_priority_idx" ON "ToolkitUserStory"("priority");

-- CreateIndex
CREATE INDEX "ToolkitArtifact_projectId_idx" ON "ToolkitArtifact"("projectId");

-- CreateIndex
CREATE INDEX "ToolkitArtifact_artifactType_idx" ON "ToolkitArtifact"("artifactType");

-- CreateIndex
CREATE INDEX "AIConversation_projectId_idx" ON "AIConversation"("projectId");

-- CreateIndex
CREATE INDEX "AIConversation_context_idx" ON "AIConversation"("context");

-- CreateIndex
CREATE INDEX "AIMessage_conversationId_idx" ON "AIMessage"("conversationId");

-- CreateIndex
CREATE INDEX "AIMessage_role_idx" ON "AIMessage"("role");

-- CreateIndex
CREATE UNIQUE INDEX "HISModule_moduleKey_key" ON "HISModule"("moduleKey");

-- CreateIndex
CREATE INDEX "HISModule_layer_idx" ON "HISModule"("layer");

-- CreateIndex
CREATE INDEX "HISModule_status_idx" ON "HISModule"("status");

-- CreateIndex
CREATE INDEX "HISModule_priority_idx" ON "HISModule"("priority");

-- CreateIndex
CREATE INDEX "ColumnIntelligenceCache_tableName_idx" ON "ColumnIntelligenceCache"("tableName");

-- CreateIndex
CREATE INDEX "ColumnIntelligenceCache_semanticType_idx" ON "ColumnIntelligenceCache"("semanticType");

-- CreateIndex
CREATE UNIQUE INDEX "ColumnIntelligenceCache_tableName_columnName_key" ON "ColumnIntelligenceCache"("tableName", "columnName");

-- CreateIndex
CREATE INDEX "FKDependencyCache_projectId_idx" ON "FKDependencyCache"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "FKDependencyCache_projectId_tableName_key" ON "FKDependencyCache"("projectId", "tableName");

-- CreateIndex
CREATE INDEX "StoredProcedureCache_projectId_idx" ON "StoredProcedureCache"("projectId");

-- CreateIndex
CREATE INDEX "StoredProcedureCache_actionType_idx" ON "StoredProcedureCache"("actionType");

-- CreateIndex
CREATE INDEX "StoredProcedureCache_moduleName_idx" ON "StoredProcedureCache"("moduleName");

-- CreateIndex
CREATE UNIQUE INDEX "StoredProcedureCache_projectId_procedureName_key" ON "StoredProcedureCache"("projectId", "procedureName");

-- CreateIndex
CREATE INDEX "ViewIntelligenceCache_projectId_idx" ON "ViewIntelligenceCache"("projectId");

-- CreateIndex
CREATE INDEX "ViewIntelligenceCache_purpose_idx" ON "ViewIntelligenceCache"("purpose");

-- CreateIndex
CREATE UNIQUE INDEX "ViewIntelligenceCache_projectId_viewName_key" ON "ViewIntelligenceCache"("projectId", "viewName");

-- CreateIndex
CREATE INDEX "DiscoveredTableCache_projectId_idx" ON "DiscoveredTableCache"("projectId");

-- CreateIndex
CREATE INDEX "DiscoveredTableCache_priority_idx" ON "DiscoveredTableCache"("priority");

-- CreateIndex
CREATE INDEX "DiscoveredTableCache_isResolved_idx" ON "DiscoveredTableCache"("isResolved");

-- CreateIndex
CREATE UNIQUE INDEX "DiscoveredTableCache_projectId_tableName_key" ON "DiscoveredTableCache"("projectId", "tableName");

-- CreateIndex
CREATE UNIQUE INDEX "Company_slug_key" ON "Company"("slug");

-- CreateIndex
CREATE INDEX "Company_slug_idx" ON "Company"("slug");

-- CreateIndex
CREATE INDEX "Company_subscriptionTier_idx" ON "Company"("subscriptionTier");

-- CreateIndex
CREATE INDEX "Company_subscriptionStatus_idx" ON "Company"("subscriptionStatus");

-- CreateIndex
CREATE INDEX "Company_isActive_idx" ON "Company"("isActive");

-- CreateIndex
CREATE INDEX "Workspace_companyId_idx" ON "Workspace"("companyId");

-- CreateIndex
CREATE INDEX "Workspace_isActive_idx" ON "Workspace"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_companyId_slug_key" ON "Workspace"("companyId", "slug");

-- CreateIndex
CREATE INDEX "Project_companyId_idx" ON "Project"("companyId");

-- CreateIndex
CREATE INDEX "Project_workspaceId_idx" ON "Project"("workspaceId");

-- CreateIndex
CREATE INDEX "Project_status_idx" ON "Project"("status");

-- CreateIndex
CREATE INDEX "Project_softwareType_idx" ON "Project"("softwareType");

-- CreateIndex
CREATE UNIQUE INDEX "Project_companyId_slug_key" ON "Project"("companyId", "slug");

-- CreateIndex
CREATE INDEX "UserCompany_userId_idx" ON "UserCompany"("userId");

-- CreateIndex
CREATE INDEX "UserCompany_companyId_idx" ON "UserCompany"("companyId");

-- CreateIndex
CREATE INDEX "UserCompany_role_idx" ON "UserCompany"("role");

-- CreateIndex
CREATE INDEX "UserCompany_status_idx" ON "UserCompany"("status");

-- CreateIndex
CREATE UNIQUE INDEX "UserCompany_userId_companyId_key" ON "UserCompany"("userId", "companyId");

-- CreateIndex
CREATE INDEX "UserProject_userId_idx" ON "UserProject"("userId");

-- CreateIndex
CREATE INDEX "UserProject_projectId_idx" ON "UserProject"("projectId");

-- CreateIndex
CREATE INDEX "UserProject_role_idx" ON "UserProject"("role");

-- CreateIndex
CREATE INDEX "UserProject_status_idx" ON "UserProject"("status");

-- CreateIndex
CREATE UNIQUE INDEX "UserProject_userId_projectId_key" ON "UserProject"("userId", "projectId");

-- CreateIndex
CREATE UNIQUE INDEX "APIKey_keyHash_key" ON "APIKey"("keyHash");

-- CreateIndex
CREATE INDEX "APIKey_companyId_idx" ON "APIKey"("companyId");

-- CreateIndex
CREATE INDEX "APIKey_prefix_idx" ON "APIKey"("prefix");

-- CreateIndex
CREATE INDEX "APIKey_isActive_idx" ON "APIKey"("isActive");

-- CreateIndex
CREATE INDEX "AuditLog_companyId_idx" ON "AuditLog"("companyId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_resource_idx" ON "AuditLog"("resource");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_token_key" ON "Invitation"("token");

-- CreateIndex
CREATE INDEX "Invitation_companyId_idx" ON "Invitation"("companyId");

-- CreateIndex
CREATE INDEX "Invitation_email_idx" ON "Invitation"("email");

-- CreateIndex
CREATE INDEX "Invitation_token_idx" ON "Invitation"("token");

-- CreateIndex
CREATE INDEX "Invitation_status_idx" ON "Invitation"("status");

-- CreateIndex
CREATE INDEX "MissingTableResolution_projectId_idx" ON "MissingTableResolution"("projectId");

-- CreateIndex
CREATE INDEX "MissingTableResolution_status_idx" ON "MissingTableResolution"("status");

-- CreateIndex
CREATE INDEX "MissingTableResolution_priority_idx" ON "MissingTableResolution"("priority");

-- CreateIndex
CREATE INDEX "MissingTableResolution_resolutionStatus_idx" ON "MissingTableResolution"("resolutionStatus");

-- CreateIndex
CREATE UNIQUE INDEX "MissingTableResolution_projectId_tableName_key" ON "MissingTableResolution"("projectId", "tableName");

-- CreateIndex
CREATE INDEX "FKResolutionSession_projectId_idx" ON "FKResolutionSession"("projectId");

-- CreateIndex
CREATE INDEX "FKResolutionSession_status_idx" ON "FKResolutionSession"("status");

-- CreateIndex
CREATE INDEX "FKResolutionLog_projectId_idx" ON "FKResolutionLog"("projectId");

-- CreateIndex
CREATE INDEX "FKResolutionLog_tableName_idx" ON "FKResolutionLog"("tableName");

-- CreateIndex
CREATE INDEX "FKResolutionLog_action_idx" ON "FKResolutionLog"("action");

-- CreateIndex
CREATE INDEX "FKResolutionLog_createdAt_idx" ON "FKResolutionLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AIQuestionRecord_questionId_key" ON "AIQuestionRecord"("questionId");

-- CreateIndex
CREATE INDEX "AIQuestionRecord_category_idx" ON "AIQuestionRecord"("category");

-- CreateIndex
CREATE INDEX "AIQuestionRecord_priority_idx" ON "AIQuestionRecord"("priority");

-- CreateIndex
CREATE INDEX "AIQuestionRecord_tableName_idx" ON "AIQuestionRecord"("tableName");

-- CreateIndex
CREATE INDEX "AIQuestionRecord_sessionId_idx" ON "AIQuestionRecord"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionSessionRecord_sessionId_key" ON "QuestionSessionRecord"("sessionId");

-- CreateIndex
CREATE INDEX "QuestionSessionRecord_projectId_idx" ON "QuestionSessionRecord"("projectId");

-- CreateIndex
CREATE INDEX "QuestionSessionRecord_status_idx" ON "QuestionSessionRecord"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ScreenBlueprintRecord_blueprintId_key" ON "ScreenBlueprintRecord"("blueprintId");

-- CreateIndex
CREATE INDEX "ScreenBlueprintRecord_tableName_idx" ON "ScreenBlueprintRecord"("tableName");

-- CreateIndex
CREATE INDEX "ScreenBlueprintRecord_screenType_idx" ON "ScreenBlueprintRecord"("screenType");

-- CreateIndex
CREATE INDEX "ScreenBlueprintRecord_projectId_idx" ON "ScreenBlueprintRecord"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "ScreenBlueprintRecord_tableName_screenType_key" ON "ScreenBlueprintRecord"("tableName", "screenType");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessRuleRecord_ruleId_key" ON "BusinessRuleRecord"("ruleId");

-- CreateIndex
CREATE INDEX "BusinessRuleRecord_name_idx" ON "BusinessRuleRecord"("name");

-- CreateIndex
CREATE INDEX "BusinessRuleRecord_category_idx" ON "BusinessRuleRecord"("category");

-- CreateIndex
CREATE INDEX "BusinessRuleRecord_priority_idx" ON "BusinessRuleRecord"("priority");

-- CreateIndex
CREATE INDEX "BusinessRuleRecord_status_idx" ON "BusinessRuleRecord"("status");

-- CreateIndex
CREATE INDEX "BusinessRuleRecord_tableName_idx" ON "BusinessRuleRecord"("tableName");

-- CreateIndex
CREATE INDEX "BusinessRuleRecord_moduleName_idx" ON "BusinessRuleRecord"("moduleName");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessRuleRecord_code_key" ON "BusinessRuleRecord"("code");

-- CreateIndex
CREATE INDEX "CSHTMLAnalysisCache_projectId_idx" ON "CSHTMLAnalysisCache"("projectId");

-- CreateIndex
CREATE INDEX "CSHTMLAnalysisCache_viewType_idx" ON "CSHTMLAnalysisCache"("viewType");

-- CreateIndex
CREATE INDEX "CSHTMLAnalysisCache_linkedTable_idx" ON "CSHTMLAnalysisCache"("linkedTable");

-- CreateIndex
CREATE UNIQUE INDEX "CSHTMLAnalysisCache_projectId_viewName_key" ON "CSHTMLAnalysisCache"("projectId", "viewName");

-- CreateIndex
CREATE INDEX "UIScreenBlueprint_projectId_idx" ON "UIScreenBlueprint"("projectId");

-- CreateIndex
CREATE INDEX "UIScreenBlueprint_screenType_idx" ON "UIScreenBlueprint"("screenType");

-- CreateIndex
CREATE INDEX "UIScreenBlueprint_sourceTable_idx" ON "UIScreenBlueprint"("sourceTable");

-- CreateIndex
CREATE INDEX "UIScreenBlueprint_migrationStatus_idx" ON "UIScreenBlueprint"("migrationStatus");

-- CreateIndex
CREATE UNIQUE INDEX "UIScreenBlueprint_projectId_screenName_key" ON "UIScreenBlueprint"("projectId", "screenName");

-- CreateIndex
CREATE UNIQUE INDEX "DBConversionCache_conversionId_key" ON "DBConversionCache"("conversionId");

-- CreateIndex
CREATE INDEX "DBConversionCache_projectId_idx" ON "DBConversionCache"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "RequirementRecord_requirementId_key" ON "RequirementRecord"("requirementId");

-- CreateIndex
CREATE INDEX "RequirementRecord_projectId_idx" ON "RequirementRecord"("projectId");

-- CreateIndex
CREATE INDEX "RequirementRecord_status_idx" ON "RequirementRecord"("status");

-- CreateIndex
CREATE INDEX "RequirementRecord_category_idx" ON "RequirementRecord"("category");

-- CreateIndex
CREATE INDEX "RequirementRecord_priority_idx" ON "RequirementRecord"("priority");

-- CreateIndex
CREATE INDEX "RequirementRecord_implementationStatus_idx" ON "RequirementRecord"("implementationStatus");

-- CreateIndex
CREATE UNIQUE INDEX "SchemaVersion_versionHash_key" ON "SchemaVersion"("versionHash");

-- CreateIndex
CREATE INDEX "SchemaVersion_projectId_idx" ON "SchemaVersion"("projectId");

-- CreateIndex
CREATE INDEX "SchemaVersion_versionNumber_idx" ON "SchemaVersion"("versionNumber");

-- CreateIndex
CREATE INDEX "SchemaVersion_createdAt_idx" ON "SchemaVersion"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SchemaVersion_projectId_versionNumber_key" ON "SchemaVersion"("projectId", "versionNumber");

-- CreateIndex
CREATE INDEX "SchemaDiff_projectId_idx" ON "SchemaDiff"("projectId");

-- CreateIndex
CREATE INDEX "SchemaDiff_fromVersionId_idx" ON "SchemaDiff"("fromVersionId");

-- CreateIndex
CREATE INDEX "SchemaDiff_toVersionId_idx" ON "SchemaDiff"("toVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "SchemaDiff_projectId_fromVersionId_toVersionId_key" ON "SchemaDiff"("projectId", "fromVersionId", "toVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "DecisionRecord_decisionId_key" ON "DecisionRecord"("decisionId");

-- CreateIndex
CREATE INDEX "DecisionRecord_projectId_idx" ON "DecisionRecord"("projectId");

-- CreateIndex
CREATE INDEX "DecisionRecord_status_idx" ON "DecisionRecord"("status");

-- CreateIndex
CREATE INDEX "DecisionRecord_category_idx" ON "DecisionRecord"("category");

-- CreateIndex
CREATE INDEX "DecisionRecord_impact_idx" ON "DecisionRecord"("impact");

-- CreateIndex
CREATE INDEX "TeamMember_companyId_idx" ON "TeamMember"("companyId");

-- CreateIndex
CREATE INDEX "TeamMember_isActive_idx" ON "TeamMember"("isActive");

-- CreateIndex
CREATE INDEX "TeamMember_role_idx" ON "TeamMember"("role");

-- CreateIndex
CREATE UNIQUE INDEX "TeamAllocation_allocationId_key" ON "TeamAllocation"("allocationId");

-- CreateIndex
CREATE INDEX "TeamAllocation_projectId_idx" ON "TeamAllocation"("projectId");

-- CreateIndex
CREATE INDEX "TeamAllocation_status_idx" ON "TeamAllocation"("status");

-- CreateIndex
CREATE INDEX "TeamAllocation_sprintNumber_idx" ON "TeamAllocation"("sprintNumber");

-- CreateIndex
CREATE INDEX "GapAnalysisRecord_projectId_idx" ON "GapAnalysisRecord"("projectId");

-- CreateIndex
CREATE INDEX "GapAnalysisRecord_targetType_idx" ON "GapAnalysisRecord"("targetType");

-- CreateIndex
CREATE INDEX "GapAnalysisRecord_resolutionStatus_idx" ON "GapAnalysisRecord"("resolutionStatus");

-- CreateIndex
CREATE INDEX "GapAnalysisRecord_severity_idx" ON "GapAnalysisRecord"("severity");

-- CreateIndex
CREATE UNIQUE INDEX "GapAnalysisRecord_projectId_targetId_gapType_key" ON "GapAnalysisRecord"("projectId", "targetId", "gapType");

-- CreateIndex
CREATE INDEX "JSIntelligenceCache_projectId_idx" ON "JSIntelligenceCache"("projectId");

-- CreateIndex
CREATE INDEX "JSIntelligenceCache_fileType_idx" ON "JSIntelligenceCache"("fileType");

-- CreateIndex
CREATE INDEX "JSIntelligenceCache_framework_idx" ON "JSIntelligenceCache"("framework");

-- CreateIndex
CREATE UNIQUE INDEX "JSIntelligenceCache_projectId_fileName_key" ON "JSIntelligenceCache"("projectId", "fileName");

-- CreateIndex
CREATE INDEX "AjaxCallCache_projectId_idx" ON "AjaxCallCache"("projectId");

-- CreateIndex
CREATE INDEX "AjaxCallCache_url_idx" ON "AjaxCallCache"("url");

-- CreateIndex
CREATE INDEX "AjaxCallCache_method_idx" ON "AjaxCallCache"("method");

-- CreateIndex
CREATE INDEX "EventHandlerCache_projectId_idx" ON "EventHandlerCache"("projectId");

-- CreateIndex
CREATE INDEX "EventHandlerCache_eventType_idx" ON "EventHandlerCache"("eventType");

-- CreateIndex
CREATE INDEX "EventHandlerCache_handlerType_idx" ON "EventHandlerCache"("handlerType");

-- CreateIndex
CREATE INDEX "FormValidationCache_projectId_idx" ON "FormValidationCache"("projectId");

-- CreateIndex
CREATE INDEX "FormValidationCache_formSelector_idx" ON "FormValidationCache"("formSelector");

-- CreateIndex
CREATE INDEX "FileClassificationCache_projectId_idx" ON "FileClassificationCache"("projectId");

-- CreateIndex
CREATE INDEX "FileClassificationCache_fileType_idx" ON "FileClassificationCache"("fileType");

-- CreateIndex
CREATE INDEX "FileClassificationCache_language_idx" ON "FileClassificationCache"("language");

-- CreateIndex
CREATE UNIQUE INDEX "FileClassificationCache_projectId_filePath_key" ON "FileClassificationCache"("projectId", "filePath");

-- CreateIndex
CREATE UNIQUE INDEX "SPWorkflowChain_chainId_key" ON "SPWorkflowChain"("chainId");

-- CreateIndex
CREATE INDEX "SPWorkflowChain_projectId_idx" ON "SPWorkflowChain"("projectId");

-- CreateIndex
CREATE INDEX "SPWorkflowChain_processType_idx" ON "SPWorkflowChain"("processType");

-- CreateIndex
CREATE INDEX "SPWorkflowChain_moduleName_idx" ON "SPWorkflowChain"("moduleName");

-- CreateIndex
CREATE INDEX "SPDependencyGraph_projectId_idx" ON "SPDependencyGraph"("projectId");

-- CreateIndex
CREATE INDEX "SPDependencyGraph_callerSP_idx" ON "SPDependencyGraph"("callerSP");

-- CreateIndex
CREATE INDEX "SPDependencyGraph_calledSP_idx" ON "SPDependencyGraph"("calledSP");

-- CreateIndex
CREATE UNIQUE INDEX "SPDependencyGraph_projectId_callerSP_calledSP_key" ON "SPDependencyGraph"("projectId", "callerSP", "calledSP");

-- CreateIndex
CREATE INDEX "Page_projectId_idx" ON "Page"("projectId");

-- CreateIndex
CREATE INDEX "Page_moduleId_idx" ON "Page"("moduleId");

-- CreateIndex
CREATE INDEX "Page_pageType_idx" ON "Page"("pageType");

-- CreateIndex
CREATE UNIQUE INDEX "Page_projectId_urlSlug_key" ON "Page"("projectId", "urlSlug");

-- CreateIndex
CREATE INDEX "PageComponent_pageId_idx" ON "PageComponent"("pageId");

-- CreateIndex
CREATE INDEX "PageComponent_componentType_idx" ON "PageComponent"("componentType");

-- CreateIndex
CREATE INDEX "PageComponent_parentComponentId_idx" ON "PageComponent"("parentComponentId");

-- CreateIndex
CREATE UNIQUE INDEX "Form_formKey_key" ON "Form"("formKey");

-- CreateIndex
CREATE INDEX "Form_projectId_idx" ON "Form"("projectId");

-- CreateIndex
CREATE INDEX "Form_sourceTable_idx" ON "Form"("sourceTable");

-- CreateIndex
CREATE INDEX "FormField_formId_idx" ON "FormField"("formId");

-- CreateIndex
CREATE INDEX "FormField_fieldType_idx" ON "FormField"("fieldType");

-- CreateIndex
CREATE UNIQUE INDEX "FormField_formId_fieldName_key" ON "FormField"("formId", "fieldName");

-- CreateIndex
CREATE UNIQUE INDEX "Controller_controllerKey_key" ON "Controller"("controllerKey");

-- CreateIndex
CREATE INDEX "Controller_projectId_idx" ON "Controller"("projectId");

-- CreateIndex
CREATE INDEX "Controller_moduleId_idx" ON "Controller"("moduleId");

-- CreateIndex
CREATE INDEX "Controller_name_idx" ON "Controller"("name");

-- CreateIndex
CREATE UNIQUE INDEX "APIEndpoint_endpointKey_key" ON "APIEndpoint"("endpointKey");

-- CreateIndex
CREATE INDEX "APIEndpoint_controllerId_idx" ON "APIEndpoint"("controllerId");

-- CreateIndex
CREATE INDEX "APIEndpoint_httpMethod_idx" ON "APIEndpoint"("httpMethod");

-- CreateIndex
CREATE INDEX "APIEndpoint_sourceSP_idx" ON "APIEndpoint"("sourceSP");

-- CreateIndex
CREATE UNIQUE INDEX "Workflow_workflowKey_key" ON "Workflow"("workflowKey");

-- CreateIndex
CREATE INDEX "Workflow_projectId_idx" ON "Workflow"("projectId");

-- CreateIndex
CREATE INDEX "Workflow_moduleId_idx" ON "Workflow"("moduleId");

-- CreateIndex
CREATE INDEX "Workflow_status_idx" ON "Workflow"("status");

-- CreateIndex
CREATE INDEX "WorkflowState_workflowId_idx" ON "WorkflowState"("workflowId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowState_workflowId_stateKey_key" ON "WorkflowState"("workflowId", "stateKey");

-- CreateIndex
CREATE INDEX "WorkflowTransition_workflowId_idx" ON "WorkflowTransition"("workflowId");

-- CreateIndex
CREATE INDEX "WorkflowTransition_fromStateId_idx" ON "WorkflowTransition"("fromStateId");

-- CreateIndex
CREATE INDEX "WorkflowTransition_toStateId_idx" ON "WorkflowTransition"("toStateId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowTransition_workflowId_transitionKey_key" ON "WorkflowTransition"("workflowId", "transitionKey");

-- CreateIndex
CREATE UNIQUE INDEX "Report_reportKey_key" ON "Report"("reportKey");

-- CreateIndex
CREATE INDEX "Report_projectId_idx" ON "Report"("projectId");

-- CreateIndex
CREATE INDEX "Report_moduleId_idx" ON "Report"("moduleId");

-- CreateIndex
CREATE INDEX "Report_reportType_idx" ON "Report"("reportType");

-- CreateIndex
CREATE INDEX "ReportFilter_reportId_idx" ON "ReportFilter"("reportId");

-- CreateIndex
CREATE UNIQUE INDEX "ReportFilter_reportId_filterKey_key" ON "ReportFilter"("reportId", "filterKey");

-- CreateIndex
CREATE UNIQUE INDEX "TestCase_testCaseKey_key" ON "TestCase"("testCaseKey");

-- CreateIndex
CREATE INDEX "TestCase_projectId_idx" ON "TestCase"("projectId");

-- CreateIndex
CREATE INDEX "TestCase_moduleId_idx" ON "TestCase"("moduleId");

-- CreateIndex
CREATE INDEX "TestCase_testCaseType_idx" ON "TestCase"("testCaseType");

-- CreateIndex
CREATE INDEX "TestCase_priority_idx" ON "TestCase"("priority");

-- CreateIndex
CREATE INDEX "TestStep_testCaseId_idx" ON "TestStep"("testCaseId");

-- CreateIndex
CREATE UNIQUE INDEX "TestStep_testCaseId_stepNumber_key" ON "TestStep"("testCaseId", "stepNumber");

-- CreateIndex
CREATE UNIQUE INDEX "AgentRun_runId_key" ON "AgentRun"("runId");

-- CreateIndex
CREATE INDEX "AgentRun_projectId_idx" ON "AgentRun"("projectId");

-- CreateIndex
CREATE INDEX "AgentRun_agentName_idx" ON "AgentRun"("agentName");

-- CreateIndex
CREATE INDEX "AgentRun_status_idx" ON "AgentRun"("status");

-- CreateIndex
CREATE INDEX "AgentRun_startedAt_idx" ON "AgentRun"("startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "AgentMessage_messageId_key" ON "AgentMessage"("messageId");

-- CreateIndex
CREATE INDEX "AgentMessage_runId_idx" ON "AgentMessage"("runId");

-- CreateIndex
CREATE INDEX "AgentMessage_messageType_idx" ON "AgentMessage"("messageType");

-- CreateIndex
CREATE INDEX "AgentMessage_timestamp_idx" ON "AgentMessage"("timestamp");

-- CreateIndex
CREATE INDEX "SPIntelligence_projectId_idx" ON "SPIntelligence"("projectId");

-- CreateIndex
CREATE INDEX "SPIntelligence_actionType_idx" ON "SPIntelligence"("actionType");

-- CreateIndex
CREATE INDEX "SPIntelligence_procedureName_idx" ON "SPIntelligence"("procedureName");

-- CreateIndex
CREATE INDEX "SPIntelligence_migrationRisk_idx" ON "SPIntelligence"("migrationRisk");

-- CreateIndex
CREATE UNIQUE INDEX "SPIntelligence_projectId_procedureName_key" ON "SPIntelligence"("projectId", "procedureName");

-- CreateIndex
CREATE INDEX "DLLIntelligence_projectId_idx" ON "DLLIntelligence"("projectId");

-- CreateIndex
CREATE INDEX "DLLIntelligence_dllName_idx" ON "DLLIntelligence"("dllName");

-- CreateIndex
CREATE UNIQUE INDEX "DLLIntelligence_projectId_dllName_key" ON "DLLIntelligence"("projectId", "dllName");

-- CreateIndex
CREATE INDEX "APIGenerationResult_projectId_idx" ON "APIGenerationResult"("projectId");

-- CreateIndex
CREATE INDEX "APIGenerationResult_moduleName_idx" ON "APIGenerationResult"("moduleName");

-- CreateIndex
CREATE INDEX "APIGenerationResult_entityName_idx" ON "APIGenerationResult"("entityName");

-- CreateIndex
CREATE INDEX "APIGenerationResult_status_idx" ON "APIGenerationResult"("status");

-- CreateIndex
CREATE UNIQUE INDEX "APIGenerationResult_projectId_moduleName_entityName_key" ON "APIGenerationResult"("projectId", "moduleName", "entityName");

-- CreateIndex
CREATE INDEX "MigrationMapping_projectId_idx" ON "MigrationMapping"("projectId");

-- CreateIndex
CREATE INDEX "MigrationMapping_legacyType_legacyName_idx" ON "MigrationMapping"("legacyType", "legacyName");

-- CreateIndex
CREATE INDEX "MigrationMapping_modernType_modernName_idx" ON "MigrationMapping"("modernType", "modernName");

-- CreateIndex
CREATE INDEX "MigrationMapping_status_idx" ON "MigrationMapping"("status");

-- CreateIndex
CREATE UNIQUE INDEX "MigrationMapping_projectId_legacyType_legacyName_key" ON "MigrationMapping"("projectId", "legacyType", "legacyName");

-- CreateIndex
CREATE INDEX "CSHTMLAjaxEndpoint_projectId_idx" ON "CSHTMLAjaxEndpoint"("projectId");

-- CreateIndex
CREATE INDEX "CSHTMLAjaxEndpoint_cshtmlViewName_idx" ON "CSHTMLAjaxEndpoint"("cshtmlViewName");

-- CreateIndex
CREATE INDEX "CSHTMLAjaxEndpoint_linkedSP_idx" ON "CSHTMLAjaxEndpoint"("linkedSP");

-- CreateIndex
CREATE UNIQUE INDEX "CSHTMLAjaxEndpoint_projectId_cshtmlViewName_endpointUrl_key" ON "CSHTMLAjaxEndpoint"("projectId", "cshtmlViewName", "endpointUrl");

-- CreateIndex
CREATE INDEX "ErrorCodeMapping_projectId_idx" ON "ErrorCodeMapping"("projectId");

-- CreateIndex
CREATE INDEX "ErrorCodeMapping_spName_idx" ON "ErrorCodeMapping"("spName");

-- CreateIndex
CREATE UNIQUE INDEX "ErrorCodeMapping_projectId_spName_errorCode_key" ON "ErrorCodeMapping"("projectId", "spName", "errorCode");

-- CreateIndex
CREATE INDEX "DropdownMapping_projectId_idx" ON "DropdownMapping"("projectId");

-- CreateIndex
CREATE INDEX "DropdownMapping_linkedSP_idx" ON "DropdownMapping"("linkedSP");

-- CreateIndex
CREATE INDEX "DropdownMapping_linkedTable_idx" ON "DropdownMapping"("linkedTable");

-- CreateIndex
CREATE UNIQUE INDEX "DropdownMapping_projectId_cshtmlViewName_dropdownName_key" ON "DropdownMapping"("projectId", "cshtmlViewName", "dropdownName");

-- CreateIndex
CREATE INDEX "ConfidenceScore_projectId_idx" ON "ConfidenceScore"("projectId");

-- CreateIndex
CREATE INDEX "ConfidenceScore_score_idx" ON "ConfidenceScore"("score");

-- CreateIndex
CREATE INDEX "ConfidenceScore_confidence_idx" ON "ConfidenceScore"("confidence");

-- CreateIndex
CREATE INDEX "ConfidenceScore_entityType_idx" ON "ConfidenceScore"("entityType");

-- CreateIndex
CREATE UNIQUE INDEX "ConfidenceScore_entityType_entityId_key" ON "ConfidenceScore"("entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "ScoringFactor_name_key" ON "ScoringFactor"("name");

-- CreateIndex
CREATE INDEX "ScoringFactor_name_idx" ON "ScoringFactor"("name");

-- CreateIndex
CREATE INDEX "ScoringFactor_active_idx" ON "ScoringFactor"("active");

-- CreateIndex
CREATE INDEX "ExtractionConflict_projectId_idx" ON "ExtractionConflict"("projectId");

-- CreateIndex
CREATE INDEX "ExtractionConflict_status_severity_idx" ON "ExtractionConflict"("status", "severity");

-- CreateIndex
CREATE INDEX "ExtractionConflict_conflictType_idx" ON "ExtractionConflict"("conflictType");

-- CreateIndex
CREATE INDEX "ExtractionConflict_entityType_idx" ON "ExtractionConflict"("entityType");

-- CreateIndex
CREATE UNIQUE INDEX "ExtractionConflict_entityType_entityId_conflictType_key" ON "ExtractionConflict"("entityType", "entityId", "conflictType");

-- CreateIndex
CREATE INDEX "ConflictRule_conflictType_idx" ON "ConflictRule"("conflictType");

-- CreateIndex
CREATE INDEX "ConflictRule_active_idx" ON "ConflictRule"("active");

-- CreateIndex
CREATE INDEX "ConflictRule_priority_idx" ON "ConflictRule"("priority");

-- CreateIndex
CREATE UNIQUE INDEX "ConflictRule_name_key" ON "ConflictRule"("name");

-- CreateIndex
CREATE INDEX "ProjectVersion_projectId_idx" ON "ProjectVersion"("projectId");

-- CreateIndex
CREATE INDEX "ProjectVersion_createdAt_idx" ON "ProjectVersion"("createdAt");

-- CreateIndex
CREATE INDEX "ProjectVersion_createdBy_idx" ON "ProjectVersion"("createdBy");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectVersion_projectId_version_key" ON "ProjectVersion"("projectId", "version");

-- CreateIndex
CREATE INDEX "ParseCache_projectId_idx" ON "ParseCache"("projectId");

-- CreateIndex
CREATE INDEX "ParseCache_contentHash_idx" ON "ParseCache"("contentHash");

-- CreateIndex
CREATE INDEX "ParseCache_fileType_idx" ON "ParseCache"("fileType");

-- CreateIndex
CREATE INDEX "ParseCache_isValid_idx" ON "ParseCache"("isValid");

-- CreateIndex
CREATE UNIQUE INDEX "ParseCache_projectId_filePath_key" ON "ParseCache"("projectId", "filePath");

-- CreateIndex
CREATE INDEX "VerificationItem_projectId_idx" ON "VerificationItem"("projectId");

-- CreateIndex
CREATE INDEX "VerificationItem_status_priority_idx" ON "VerificationItem"("status", "priority");

-- CreateIndex
CREATE INDEX "VerificationItem_itemType_idx" ON "VerificationItem"("itemType");

-- CreateIndex
CREATE INDEX "VerificationItem_category_idx" ON "VerificationItem"("category");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationItem_itemType_itemId_key" ON "VerificationItem"("itemType", "itemId");

-- CreateIndex
CREATE INDEX "DataLineage_projectId_idx" ON "DataLineage"("projectId");

-- CreateIndex
CREATE INDEX "DataLineage_entityType_idx" ON "DataLineage"("entityType");

-- CreateIndex
CREATE INDEX "DataLineage_sourceType_idx" ON "DataLineage"("sourceType");

-- CreateIndex
CREATE INDEX "DataLineage_sourceAgent_idx" ON "DataLineage"("sourceAgent");

-- CreateIndex
CREATE UNIQUE INDEX "DataLineage_entityType_entityId_key" ON "DataLineage"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "IncrementalChange_projectId_idx" ON "IncrementalChange"("projectId");

-- CreateIndex
CREATE INDEX "IncrementalChange_versionFrom_idx" ON "IncrementalChange"("versionFrom");

-- CreateIndex
CREATE INDEX "IncrementalChange_versionTo_idx" ON "IncrementalChange"("versionTo");

-- CreateIndex
CREATE INDEX "IncrementalChange_changeType_idx" ON "IncrementalChange"("changeType");

-- CreateIndex
CREATE INDEX "IncrementalChange_entityType_idx" ON "IncrementalChange"("entityType");

-- CreateIndex
CREATE UNIQUE INDEX "IncrementalChange_projectId_versionFrom_versionTo_entityType_entityId_key" ON "IncrementalChange"("projectId", "versionFrom", "versionTo", "entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "QualityMetrics_projectId_key" ON "QualityMetrics"("projectId");

-- CreateIndex
CREATE INDEX "QualityMetrics_projectId_idx" ON "QualityMetrics"("projectId");

-- CreateIndex
CREATE INDEX "QualityMetrics_qualityScore_idx" ON "QualityMetrics"("qualityScore");

-- CreateIndex
CREATE INDEX "QualityMetrics_calculatedAt_idx" ON "QualityMetrics"("calculatedAt");

-- CreateIndex
CREATE INDEX "KGNode_projectId_idx" ON "KGNode"("projectId");

-- CreateIndex
CREATE INDEX "KGNode_nodeType_idx" ON "KGNode"("nodeType");

-- CreateIndex
CREATE INDEX "KGNode_name_idx" ON "KGNode"("name");

-- CreateIndex
CREATE INDEX "KGNode_source_idx" ON "KGNode"("source");

-- CreateIndex
CREATE UNIQUE INDEX "KGNode_projectId_nodeType_name_key" ON "KGNode"("projectId", "nodeType", "name");

-- CreateIndex
CREATE INDEX "KGEdge_projectId_idx" ON "KGEdge"("projectId");

-- CreateIndex
CREATE INDEX "KGEdge_edgeType_idx" ON "KGEdge"("edgeType");

-- CreateIndex
CREATE INDEX "KGEdge_sourceNodeId_idx" ON "KGEdge"("sourceNodeId");

-- CreateIndex
CREATE INDEX "KGEdge_targetNodeId_idx" ON "KGEdge"("targetNodeId");

-- CreateIndex
CREATE UNIQUE INDEX "KGEdge_projectId_sourceNodeId_targetNodeId_edgeType_key" ON "KGEdge"("projectId", "sourceNodeId", "targetNodeId", "edgeType");

-- CreateIndex
CREATE INDEX "CodeEmbedding_projectId_idx" ON "CodeEmbedding"("projectId");

-- CreateIndex
CREATE INDEX "CodeEmbedding_entityType_idx" ON "CodeEmbedding"("entityType");

-- CreateIndex
CREATE INDEX "CodeEmbedding_entityId_idx" ON "CodeEmbedding"("entityId");

-- CreateIndex
CREATE UNIQUE INDEX "CodeEmbedding_projectId_entityType_entityId_key" ON "CodeEmbedding"("projectId", "entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "PipelineRun_runId_key" ON "PipelineRun"("runId");

-- CreateIndex
CREATE INDEX "PipelineRun_projectId_idx" ON "PipelineRun"("projectId");

-- CreateIndex
CREATE INDEX "PipelineRun_status_idx" ON "PipelineRun"("status");

-- CreateIndex
CREATE INDEX "PipelineRun_startTime_idx" ON "PipelineRun"("startTime");

-- CreateIndex
CREATE INDEX "PipelineRunExecution_runId_idx" ON "PipelineRunExecution"("runId");

-- CreateIndex
CREATE INDEX "PipelineRunExecution_agentId_idx" ON "PipelineRunExecution"("agentId");

-- CreateIndex
CREATE INDEX "PipelineRunExecution_status_idx" ON "PipelineRunExecution"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PipelineRunExecution_runId_agentId_key" ON "PipelineRunExecution"("runId", "agentId");

-- CreateIndex
CREATE INDEX "PipelineRunLog_runId_idx" ON "PipelineRunLog"("runId");

-- CreateIndex
CREATE INDEX "PipelineRunLog_timestamp_idx" ON "PipelineRunLog"("timestamp");

-- CreateIndex
CREATE INDEX "PipelineRunLog_level_idx" ON "PipelineRunLog"("level");

-- CreateIndex
CREATE INDEX "PipelineRunLog_agentId_idx" ON "PipelineRunLog"("agentId");

-- CreateIndex
CREATE INDEX "SearchIndex_projectId_idx" ON "SearchIndex"("projectId");

-- CreateIndex
CREATE INDEX "SearchIndex_entityType_idx" ON "SearchIndex"("entityType");

-- CreateIndex
CREATE UNIQUE INDEX "SearchIndex_projectId_entityType_entityId_key" ON "SearchIndex"("projectId", "entityType", "entityId");

-- CreateIndex
CREATE INDEX "UnifiedField_projectId_idx" ON "UnifiedField"("projectId");

-- CreateIndex
CREATE INDEX "UnifiedField_tableName_idx" ON "UnifiedField"("tableName");

-- CreateIndex
CREATE INDEX "UnifiedField_fkIsForeignKey_idx" ON "UnifiedField"("fkIsForeignKey");

-- CreateIndex
CREATE INDEX "UnifiedField_compIsPII_idx" ON "UnifiedField"("compIsPII");

-- CreateIndex
CREATE INDEX "UnifiedField_compIsPHI_idx" ON "UnifiedField"("compIsPHI");

-- CreateIndex
CREATE INDEX "UnifiedField_metaNeedsReview_idx" ON "UnifiedField"("metaNeedsReview");

-- CreateIndex
CREATE INDEX "UnifiedField_metaOverallConfidence_idx" ON "UnifiedField"("metaOverallConfidence");

-- CreateIndex
CREATE INDEX "UnifiedField_qualifiedName_idx" ON "UnifiedField"("qualifiedName");

-- CreateIndex
CREATE UNIQUE INDEX "UnifiedField_projectId_tableName_fieldName_key" ON "UnifiedField"("projectId", "tableName", "fieldName");

-- CreateIndex
CREATE INDEX "UnifiedFieldValidation_fieldId_idx" ON "UnifiedFieldValidation"("fieldId");

-- CreateIndex
CREATE INDEX "UnifiedFieldValidation_ruleType_idx" ON "UnifiedFieldValidation"("ruleType");

-- CreateIndex
CREATE INDEX "UnifiedFieldValidation_side_idx" ON "UnifiedFieldValidation"("side");

-- CreateIndex
CREATE INDEX "UnifiedFieldTestCase_fieldId_idx" ON "UnifiedFieldTestCase"("fieldId");

-- CreateIndex
CREATE INDEX "UnifiedFieldTestCase_testType_idx" ON "UnifiedFieldTestCase"("testType");

-- CreateIndex
CREATE INDEX "UnifiedFieldTestCase_priority_idx" ON "UnifiedFieldTestCase"("priority");

-- CreateIndex
CREATE INDEX "UnifiedFieldSOPCompliance_fieldId_idx" ON "UnifiedFieldSOPCompliance"("fieldId");

-- CreateIndex
CREATE INDEX "UnifiedFieldSOPCompliance_sopId_idx" ON "UnifiedFieldSOPCompliance"("sopId");

-- CreateIndex
CREATE INDEX "UnifiedFieldSOPCompliance_isCompliant_idx" ON "UnifiedFieldSOPCompliance"("isCompliant");

-- CreateIndex
CREATE INDEX "UnifiedFieldCSHTMLEvidence_fieldId_idx" ON "UnifiedFieldCSHTMLEvidence"("fieldId");

-- CreateIndex
CREATE INDEX "UnifiedFieldCSHTMLEvidence_viewName_idx" ON "UnifiedFieldCSHTMLEvidence"("viewName");

-- CreateIndex
CREATE INDEX "UnifiedFieldSPEvidence_fieldId_idx" ON "UnifiedFieldSPEvidence"("fieldId");

-- CreateIndex
CREATE INDEX "UnifiedFieldSPEvidence_spName_idx" ON "UnifiedFieldSPEvidence"("spName");

-- CreateIndex
CREATE INDEX "UnifiedFieldSPEvidence_usageType_idx" ON "UnifiedFieldSPEvidence"("usageType");

-- CreateIndex
CREATE INDEX "UnifiedFieldDocumentation_fieldId_idx" ON "UnifiedFieldDocumentation"("fieldId");

-- CreateIndex
CREATE INDEX "UnifiedFieldDocumentation_docType_idx" ON "UnifiedFieldDocumentation"("docType");

-- CreateIndex
CREATE UNIQUE INDEX "UnifiedSOPRule_sopId_key" ON "UnifiedSOPRule"("sopId");

-- CreateIndex
CREATE INDEX "UnifiedSOPRule_category_idx" ON "UnifiedSOPRule"("category");

-- CreateIndex
CREATE INDEX "UnifiedSOPRule_isActive_idx" ON "UnifiedSOPRule"("isActive");

-- CreateIndex
CREATE INDEX "UnifiedSOPRule_projectId_idx" ON "UnifiedSOPRule"("projectId");

-- CreateIndex
CREATE INDEX "UnifiedEnrichmentLog_fieldId_idx" ON "UnifiedEnrichmentLog"("fieldId");

-- CreateIndex
CREATE INDEX "UnifiedEnrichmentLog_agentName_idx" ON "UnifiedEnrichmentLog"("agentName");

-- CreateIndex
CREATE INDEX "UnifiedEnrichmentLog_createdAt_idx" ON "UnifiedEnrichmentLog"("createdAt");

-- CreateIndex
CREATE INDEX "UnifiedConsistencyCheck_projectId_idx" ON "UnifiedConsistencyCheck"("projectId");

-- CreateIndex
CREATE INDEX "UnifiedConsistencyCheck_checkType_idx" ON "UnifiedConsistencyCheck"("checkType");

-- CreateIndex
CREATE INDEX "UnifiedConsistencyCheck_severity_idx" ON "UnifiedConsistencyCheck"("severity");

-- CreateIndex
CREATE INDEX "UnifiedConsistencyCheck_isResolved_idx" ON "UnifiedConsistencyCheck"("isResolved");

-- CreateIndex
CREATE INDEX "UnifiedTable_projectId_idx" ON "UnifiedTable"("projectId");

-- CreateIndex
CREATE INDEX "UnifiedTable_complexityRating_idx" ON "UnifiedTable"("complexityRating");

-- CreateIndex
CREATE INDEX "UnifiedTable_hasComplianceAlert_idx" ON "UnifiedTable"("hasComplianceAlert");

-- CreateIndex
CREATE INDEX "UnifiedTable_moduleName_idx" ON "UnifiedTable"("moduleName");

-- CreateIndex
CREATE UNIQUE INDEX "UnifiedTable_projectId_tableName_key" ON "UnifiedTable"("projectId", "tableName");

-- CreateIndex
CREATE INDEX "UnifiedEnrichmentSession_projectId_idx" ON "UnifiedEnrichmentSession"("projectId");

-- CreateIndex
CREATE INDEX "UnifiedEnrichmentSession_status_idx" ON "UnifiedEnrichmentSession"("status");

-- CreateIndex
CREATE UNIQUE INDEX "SPClassificationRule_pattern_key" ON "SPClassificationRule"("pattern");

-- CreateIndex
CREATE INDEX "SPClassificationRule_actionType_idx" ON "SPClassificationRule"("actionType");

-- CreateIndex
CREATE INDEX "SPClassificationRule_httpMethod_idx" ON "SPClassificationRule"("httpMethod");

-- CreateIndex
CREATE INDEX "SPClassificationRule_isActive_idx" ON "SPClassificationRule"("isActive");

-- CreateIndex
CREATE INDEX "SPClassificationRule_category_idx" ON "SPClassificationRule"("category");

-- CreateIndex
CREATE INDEX "SPBusinessRule_projectId_idx" ON "SPBusinessRule"("projectId");

-- CreateIndex
CREATE INDEX "SPBusinessRule_spName_idx" ON "SPBusinessRule"("spName");

-- CreateIndex
CREATE INDEX "SPBusinessRule_ruleType_idx" ON "SPBusinessRule"("ruleType");

-- CreateIndex
CREATE INDEX "SPBusinessRule_errorCode_idx" ON "SPBusinessRule"("errorCode");

-- CreateIndex
CREATE INDEX "SPBusinessRule_validationAlignment_idx" ON "SPBusinessRule"("validationAlignment");

-- CreateIndex
CREATE UNIQUE INDEX "SPBusinessRule_projectId_spName_ruleId_key" ON "SPBusinessRule"("projectId", "spName", "ruleId");

-- CreateIndex
CREATE INDEX "SPCorrelation_projectId_idx" ON "SPCorrelation"("projectId");

-- CreateIndex
CREATE INDEX "SPCorrelation_spName_idx" ON "SPCorrelation"("spName");

-- CreateIndex
CREATE INDEX "SPCorrelation_cshtmlViewName_idx" ON "SPCorrelation"("cshtmlViewName");

-- CreateIndex
CREATE INDEX "SPCorrelation_correlationType_idx" ON "SPCorrelation"("correlationType");

-- CreateIndex
CREATE INDEX "SPCorrelation_status_idx" ON "SPCorrelation"("status");

-- CreateIndex
CREATE INDEX "SPCorrelation_confidence_idx" ON "SPCorrelation"("confidence");

-- CreateIndex
CREATE UNIQUE INDEX "SPCorrelation_projectId_spName_cshtmlViewName_key" ON "SPCorrelation"("projectId", "spName", "cshtmlViewName");

-- CreateIndex
CREATE INDEX "SPErrorCodeMapping_projectId_idx" ON "SPErrorCodeMapping"("projectId");

-- CreateIndex
CREATE INDEX "SPErrorCodeMapping_spName_idx" ON "SPErrorCodeMapping"("spName");

-- CreateIndex
CREATE INDEX "SPErrorCodeMapping_errorCode_idx" ON "SPErrorCodeMapping"("errorCode");

-- CreateIndex
CREATE INDEX "SPErrorCodeMapping_errorType_idx" ON "SPErrorCodeMapping"("errorType");

-- CreateIndex
CREATE UNIQUE INDEX "SPErrorCodeMapping_projectId_spName_errorCode_key" ON "SPErrorCodeMapping"("projectId", "spName", "errorCode");

-- CreateIndex
CREATE INDEX "APIRouteGeneration_projectId_idx" ON "APIRouteGeneration"("projectId");

-- CreateIndex
CREATE INDEX "APIRouteGeneration_spName_idx" ON "APIRouteGeneration"("spName");

-- CreateIndex
CREATE INDEX "APIRouteGeneration_httpMethod_idx" ON "APIRouteGeneration"("httpMethod");

-- CreateIndex
CREATE INDEX "APIRouteGeneration_moduleName_idx" ON "APIRouteGeneration"("moduleName");

-- CreateIndex
CREATE INDEX "APIRouteGeneration_status_idx" ON "APIRouteGeneration"("status");

-- CreateIndex
CREATE UNIQUE INDEX "APIRouteGeneration_projectId_spName_httpMethod_key" ON "APIRouteGeneration"("projectId", "spName", "httpMethod");

-- CreateIndex
CREATE UNIQUE INDEX "DropdownRegistry_dropdownKey_key" ON "DropdownRegistry"("dropdownKey");

-- CreateIndex
CREATE INDEX "DropdownRegistry_projectId_idx" ON "DropdownRegistry"("projectId");

-- CreateIndex
CREATE INDEX "DropdownRegistry_spName_idx" ON "DropdownRegistry"("spName");

-- CreateIndex
CREATE INDEX "DropdownRegistry_moduleName_idx" ON "DropdownRegistry"("moduleName");

-- CreateIndex
CREATE INDEX "DropdownRegistry_cascadeFrom_idx" ON "DropdownRegistry"("cascadeFrom");

-- CreateIndex
CREATE INDEX "DropdownRegistry_isActive_idx" ON "DropdownRegistry"("isActive");

-- CreateIndex
CREATE INDEX "CSHTMLFormIntelligence_projectId_idx" ON "CSHTMLFormIntelligence"("projectId");

-- CreateIndex
CREATE INDEX "CSHTMLFormIntelligence_viewName_idx" ON "CSHTMLFormIntelligence"("viewName");

-- CreateIndex
CREATE INDEX "CSHTMLFormIntelligence_controllerName_idx" ON "CSHTMLFormIntelligence"("controllerName");

-- CreateIndex
CREATE INDEX "CSHTMLFormIntelligence_correlatedSP_idx" ON "CSHTMLFormIntelligence"("correlatedSP");

-- CreateIndex
CREATE UNIQUE INDEX "CSHTMLFormIntelligence_projectId_viewName_formName_key" ON "CSHTMLFormIntelligence"("projectId", "viewName", "formName");

-- CreateIndex
CREATE INDEX "SPDependencyChain_projectId_idx" ON "SPDependencyChain"("projectId");

-- CreateIndex
CREATE INDEX "SPDependencyChain_entryPointSP_idx" ON "SPDependencyChain"("entryPointSP");

-- CreateIndex
CREATE INDEX "SPDependencyChain_processType_idx" ON "SPDependencyChain"("processType");

-- CreateIndex
CREATE INDEX "SPDependencyChain_moduleName_idx" ON "SPDependencyChain"("moduleName");

-- CreateIndex
CREATE UNIQUE INDEX "SPDependencyChain_projectId_chainName_key" ON "SPDependencyChain"("projectId", "chainName");
