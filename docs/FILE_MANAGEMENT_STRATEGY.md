# AI Enterprise Architect - File Management Strategy

## 📁 Folder Structure Overview

```
/home/z/my-project/
├── storage/                          # Main storage root
│   ├── raw/                          # User uploaded files (ORIGINAL)
│   │   ├── sql/                      # SQL DDL files
│   │   │   └── {projectId}/
│   │   │       ├── schema.sql
│   │   │       ├── schema_1234567890.sql  # Versioned
│   │   │       └── migrations/
│   │   ├── sp/                       # Stored Procedures
│   │   │   └── {projectId}/
│   │   │       ├── PatientCreate.sql
│   │   │       └── PatientUpdate.sql
│   │   ├── cshtml/                   # ASP.NET Razor Views
│   │   │   └── {projectId}/
│   │   │       ├── PatientCreate.cshtml
│   │   │       └── PatientList.cshtml
│   │   ├── views/                    # SQL Views
│   │   │   └── {projectId}/
│   │   └── misc/                     # Other files
│   │       └── {projectId}/
│   │
│   ├── processed/                    # PARSED/ANALYZED files
│   │   ├── parsed/                   # Parse results (JSON)
│   │   │   └── {projectId}/
│   │   │       ├── tables.json       # Parsed table definitions
│   │   │       ├── procedures.json   # Parsed SP definitions
│   │   │       ├── views.json        # Parsed view definitions
│   │   │       └── cshtml.json       # Parsed CSHTML elements
│   │   ├── intelligence/             # Intelligence extraction
│   │   │   └── {projectId}/
│   │   │       ├── column-intel.json # Column intelligence
│   │   │       ├── sp-intel.json     # SP intelligence
│   │   │       ├── view-intel.json   # View intelligence
│   │   │       └── business-rules.json
│   │   ├── blueprints/               # UI Blueprints
│   │   │   └── {projectId}/
│   │   │       ├── patient-list.json
│   │   │       ├── patient-form.json
│   │   │       └── patient-detail.json
│   │   └── schemas/                  # Generated schemas
│   │       └── {projectId}/
│   │           ├── prisma.prisma
│   │           ├── typescript.ts
│   │           └── zod-schemas.ts
│   │
│   ├── generated/                    # GENERATED CODE (Final Output)
│   │   ├── pages/                    # Next.js pages
│   │   │   └── {projectId}/
│   │   │       ├── patients/
│   │   │       │   ├── page.tsx      # List page
│   │   │       │   ├── new/page.tsx  # Create page
│   │   │       │   └── [id]/page.tsx # Detail/Edit page
│   │   │       └── app/
│   │   ├── components/               # React components
│   │   │   └── {projectId}/
│   │   │       ├── patients/
│   │   │       │   ├── PatientForm.tsx
│   │   │       │   ├── PatientList.tsx
│   │   │       │   └── PatientCard.tsx
│   │   │       └── ui/
│   │   ├── api/                      # API routes
│   │   │   └── {projectId}/
│   │   │       ├── patients/
│   │   │       │   └── route.ts
│   │   │       └── patients/[id]/
│   │   │           └── route.ts
│   │   ├── hooks/                    # Custom hooks
│   │   │   └── {projectId}/
│   │   │       ├── usePatients.ts
│   │   │       └── usePatientMutations.ts
│   │   ├── types/                    # TypeScript types
│   │   │   └── {projectId}/
│   │   │       ├── patient.ts
│   │   │       └── api.ts
│   │   ├── prisma/                   # Prisma schemas
│   │   │   └── {projectId}/
│   │   │       └── schema.prisma
│   │   ├── tests/                    # Generated tests
│   │   │   └── {projectId}/
│   │   │       ├── uat/
│   │   │       │   └── patient-registration.md
│   │   │       └── e2e/
│   │   │           └── patient.spec.ts
│   │   └── docs/                     # Documentation
│   │       └── {projectId}/
│   │           ├── README.md
│   │           ├── API.md
│   │           └── USER_GUIDE.md
│   │
│   ├── exports/                      # Ready-to-download packages
│   │   └── {projectId}/
│   │       ├── 2024-03-17T00-34-27/ # Timestamped export
│   │       │   ├── manifest.json
│   │       │   ├── full-project.zip
│   │       │   ├── pages.zip
│   │       │   └── src/             # Full source tree
│   │       └── latest/               # Latest export (symlink)
│   │
│   ├── archives/                     # Archived/deleted files
│   │   └── {projectId}/
│   │       └── 2024-03-17T12-00-00/
│   │           ├── archive-metadata.json
│   │           ├── raw/
│   │           ├── processed/
│   │           └── generated/
│   │
│   └── temp/                         # Temporary files
│       └── {sessionId}/
│           ├── uploads/
│           └── processing/
│
├── upload/                           # Legacy upload folder
├── download/                         # Legacy download folder
│   └── autopilot-{timestamp}/       # Autopilot test outputs
│
└── prisma/                           # Database schema
    └── schema.prisma
```

## 🔄 File Lifecycle Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FILE LIFECYCLE FLOW                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. UPLOAD                                                                  │
│     User uploads file ──► /storage/raw/{type}/{projectId}/                 │
│                              │                                              │
│                              ▼                                              │
│  2. DETECT & CLASSIFY                                                       │
│     FileClassifier ──► Determines: SQL DDL, SP, CSHTML, View, etc.         │
│                              │                                              │
│                              ▼                                              │
│  3. PARSE                                                                   │
│     Parser Agent ──► /storage/processed/parsed/{projectId}/                │
│                              │                                              │
│                              ▼                                              │
│  4. INTELLIGENCE EXTRACTION                                                 │
│     Intelligence Agents ──► /storage/processed/intelligence/               │
│                              │                                              │
│                              ▼                                              │
│  5. BLUEPRINT GENERATION                                                    │
│     Blueprint Generator ──► /storage/processed/blueprints/                 │
│                              │                                              │
│                              ▼                                              │
│  6. CODE GENERATION                                                         │
│     Code Generators ──► /storage/generated/{type}/{projectId}/             │
│                              │                                              │
│                              ▼                                              │
│  7. EXPORT                                                                  │
│     Export Package ──► /storage/exports/{projectId}/{timestamp}/           │
│                              │                                              │
│                              ▼                                              │
│  8. DOWNLOAD                                                                │
│     User downloads ──► ZIP file with full project                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 🗄️ Database + File System Strategy

### Hybrid Approach: Best of Both Worlds

| Aspect | Database (Prisma) | File System |
|--------|-------------------|-------------|
| **Metadata** | ✅ Fast queries, indexes | ❌ Not searchable |
| **Content** | ✅ Small files (<1MB) | ✅ Large files (>1MB) |
| **Search** | ✅ Full-text search | ❌ Requires scanning |
| **Relations** | ✅ Foreign keys, joins | ❌ Manual linking |
| **Versioning** | ⚠️ Complex | ✅ Simple timestamps |
| **Backup** | ✅ Built-in | ⚠️ Manual |
| **Export** | ⚠️ Query needed | ✅ Direct copy |

### What Goes Where

#### Database (Prisma) - Metadata & Small Content
```prisma
model ToolkitFile {
  id              String   @id
  projectId       String
  fileName        String
  fileType        String   // sql_ddl, sql_sp, cshtml
  fileSize        Int
  contentHash     String
  parseStatus     String
  content         String   // For files < 100KB
  // ... metadata fields
}
```

#### File System - Actual Files
```
/storage/raw/sql/{projectId}/schema_1234567890.sql
/storage/generated/pages/{projectId}/patients/page.tsx
```

## 📋 File Handling Strategies

### 1. Raw File Handling (User Uploads)

```typescript
// 1. User uploads file
const file = await fileManager.saveRawFile(
  projectId,
  'schema.sql',
  sqlContent,
  'SQL'  // fileType
);

// File saved to: /storage/raw/sql/{projectId}/schema_1234567890.sql

// 2. Create database record
await prisma.toolkitFile.create({
  data: {
    projectId,
    fileName: 'schema.sql',
    fileType: 'sql_ddl',
    filePath: file.storedPath,
    fileSize: file.size,
    contentHash: file.contentHash,
    content: sqlContent.length < 100000 ? sqlContent : '', // Small files in DB
    parseStatus: 'pending'
  }
});
```

### 2. Processed File Handling (Parse Results)

```typescript
// Parse SQL and save result
const parseResult = await sqlParser.parse(sqlContent);

await fileManager.saveProcessedFile(
  projectId,
  'tables.json',
  parseResult.tables,
  'PARSED'
);

// File saved to: /storage/processed/parsed/{projectId}/tables.json
```

### 3. Generated File Handling (Code Output)

```typescript
// Generate React component
const componentCode = await reactPageGenerator.generateListPage(table);

await fileManager.saveGeneratedFile(
  projectId,
  'PatientList.tsx',
  componentCode,
  'COMPONENTS',
  'patients'  // subPath
);

// File saved to: /storage/generated/components/{projectId}/patients/PatientList.tsx
```

### 4. Export Package Handling

```typescript
// Create full project export
const files = [
  { path: 'src/app/patients/page.tsx', content: listPageCode },
  { path: 'src/app/patients/new/page.tsx', content: createPageCode },
  { path: 'src/components/PatientForm.tsx', content: formComponentCode },
  { path: 'prisma/schema.prisma', content: prismaSchemaCode },
  // ... more files
];

const exportPath = await fileManager.createExport(
  projectId,
  files,
  'full-project'
);

// Creates: /storage/exports/{projectId}/2024-03-17T00-34-27/
// Updates: /storage/exports/{projectId}/latest/ (symlink)
```

## 🔧 API Endpoints

### File Manager API

```bash
# Initialize project storage
POST /api/file-manager?action=init&projectId=proj_123

# Save raw uploaded file
POST /api/file-manager?action=save-raw
Body: { projectId, fileName, content, fileType: 'SQL' }

# Save processed result
POST /api/file-manager?action=save-processed
Body: { projectId, fileName, content: {}, processedType: 'PARSED' }

# Save generated code
POST /api/file-manager?action=save-generated
Body: { projectId, fileName, content, generatedType: 'PAGES', subPath? }

# Create export package
POST /api/file-manager?action=export
Body: { projectId, files: [{path, content}], exportName }

# Get project file structure
GET /api/file-manager?action=structure&projectId=proj_123

# Get storage statistics
GET /api/file-manager?action=stats
GET /api/file-manager?action=stats&projectId=proj_123

# Read a file
GET /api/file-manager?action=read&projectId=proj_123&category=raw&subType=sql&fileName=schema.sql

# Archive project
DELETE /api/file-manager?projectId=proj_123&reason=user_deleted
```

## 🧹 Maintenance Operations

### Temp File Cleanup (Cron Job)

```typescript
// Run daily via cron
const cleaned = await fileManager.cleanTempFiles(24); // Files older than 24 hours
console.log(`Cleaned ${cleaned} temp directories`);
```

### Storage Statistics

```typescript
// Get overall storage stats
const stats = await fileManager.getStorageStats();

// Get project-specific stats
const projectStats = await fileManager.getStorageStats(projectId);

/*
{
  totalSize: 125829120,  // ~120MB
  categories: {
    raw: { size: 52428800, fileCount: 150 },
    processed: { size: 10485760, fileCount: 75 },
    generated: { size: 52428800, fileCount: 200 },
    exports: { size: 10485760, fileCount: 10 },
    archives: { size: 0, fileCount: 0 },
    temp: { size: 0, fileCount: 0 }
  }
}
*/
```

## 📦 Export Package Structure

When creating an export, the following structure is generated:

```
{projectId}/
├── manifest.json           # Export metadata
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── {module}/
│   │       ├── page.tsx
│   │       ├── new/page.tsx
│   │       └── [id]/page.tsx
│   ├── components/
│   │   └── {module}/
│   │       ├── Form.tsx
│   │       ├── List.tsx
│   │       └── Card.tsx
│   ├── hooks/
│   │   └── use{Module}.ts
│   ├── types/
│   │   └── {module}.ts
│   └── lib/
│       └── validations/
│           └── {module}.ts
├── prisma/
│   └── schema.prisma
├── tests/
│   ├── uat/
│   │   └── {module}-registration.md
│   └── e2e/
│       └── {module}.spec.ts
└── docs/
    ├── README.md
    ├── API.md
    └── USER_GUIDE.md
```

## 🔐 Security Considerations

1. **Content Hashing**: All files are hashed for integrity verification
2. **Path Sanitization**: File paths are validated to prevent directory traversal
3. **Size Limits**: File uploads are limited (default: 50MB)
4. **Access Control**: Project-based file access via database relations
5. **Archival**: Deleted files are archived, not permanently deleted

## 📊 Monitoring & Logging

```typescript
// Log file operations
await prisma.agentLog.create({
  data: {
    agentDefinitionId: 'file-manager',
    level: 'info',
    message: `File saved: ${fileName}`,
    data: JSON.stringify({
      projectId,
      fileType,
      size: fileBuffer.length,
      hash: contentHash
    })
  }
});
```

---

## Quick Reference

| Directory | Purpose | Contents |
|-----------|---------|----------|
| `storage/raw/` | Original uploads | SQL, CSHTML, SP files |
| `storage/processed/` | Analysis results | JSON intelligence data |
| `storage/generated/` | Code output | TSX, TS, Prisma files |
| `storage/exports/` | Download packages | ZIP, manifest, full tree |
| `storage/archives/` | Deleted files | Backup before deletion |
| `storage/temp/` | Processing temp | Auto-cleaned |

---

*Last Updated: March 2024*
