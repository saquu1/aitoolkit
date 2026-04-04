// =============================================================================
// Multi-Tenant Prisma Schema Definitions
// Step 5: Enterprise-grade multi-tenancy with subscription management
// =============================================================================

// This file contains the schema definitions for multi-tenant architecture
// These should be added to the main prisma/schema.prisma file

export const MULTI_TENANT_SCHEMA = `
// =============================================================================
// MULTI-TENANT MODELS
// =============================================================================

/// Company (Tenant) - Top level organization
model Company {
  id                String   @id @default(cuid())
  name              String
  slug              String   @unique
  logo              String?
  primaryColor      String?  @default("#6366f1")
  secondaryColor    String?  @default("#8b5cf6")
  domain            String?  @unique
  isActive          Boolean  @default(true)
  
  // Subscription
  subscriptionTier     String      @default("free") // free, starter, professional, enterprise
  subscriptionStatus   String      @default("active") // active, past_due, cancelled, trialing
  trialEndsAt          DateTime?
  stripeCustomerId     String?     @unique
  stripeSubscriptionId String?     @unique
  
  // Billing
  billingEmail      String?
  billingName       String?
  billingAddress    String?
  billingCity       String?
  billingState      String?
  billingPostalCode String?
  billingCountry    String?
  
  // Settings (JSON)
  settings          Json     @default("{}")
  
  // Limits (JSON)
  limits            Json     @default("{}")
  
  // Usage (JSON)
  usage             Json     @default("{}")
  
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  // Relations
  workspaces        Workspace[]
  users             UserCompany[]
  projects          Project[]
  apiKeys           ApiKey[]
  
  @@index([slug])
  @@index([subscriptionTier])
  @@index([isActive])
}

/// Workspace - Optional grouping within company
model Workspace {
  id          String   @id @default(cuid())
  companyId   String
  name        String
  slug        String
  description String?
  isActive    Boolean  @default(true)
  settings    Json     @default("{}")
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  // Relations
  company     Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)
  projects    Project[]
  members     UserWorkspace[]
  
  @@unique([companyId, slug])
  @@index([companyId])
}

/// User - Global user account
model User {
  id              String   @id @default(cuid())
  email           String   @unique
  passwordHash    String
  firstName       String
  lastName        String
  displayName     String?
  avatar          String?
  timezone        String   @default("UTC")
  locale          String   @default("en")
  isActive        Boolean  @default(true)
  emailVerified   Boolean  @default(false)
  emailVerifiedAt DateTime?
  lastLoginAt     DateTime?
  preferences     Json     @default("{}")
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  // Relations
  companies       UserCompany[]
  projects        UserProject[]
  workspaces      UserWorkspace[]
  sessions        Session[]
  apiKeys         ApiKey[]
  
  @@index([email])
}

/// UserCompany - User membership in a company
model UserCompany {
  id          String   @id @default(cuid())
  userId      String
  companyId   String
  role        String   @default("member") // owner, admin, member
  status      String   @default("pending") // pending, active, suspended, removed
  invitedBy   String?
  invitedAt   DateTime?
  joinedAt    DateTime?
  settings    Json     @default("{}")
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  // Relations
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  company     Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)
  
  @@unique([userId, companyId])
  @@index([companyId])
  @@index([userId])
}

/// UserWorkspace - User membership in a workspace
model UserWorkspace {
  id            String   @id @default(cuid())
  userId        String
  workspaceId   String
  role          String   @default("member") // admin, member
  status        String   @default("active")
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  // Relations
  user          User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  workspace     Workspace   @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  
  @@unique([userId, workspaceId])
  @@index([workspaceId])
}

/// Project - Software project within company/workspace
model Project {
  id            String   @id @default(cuid())
  workspaceId   String?
  companyId     String
  name          String
  slug          String
  description   String?
  softwareType  String   @default("Custom") // HIS, ERP, CRM, E-Commerce, LMS, Custom
  status        String   @default("planning") // planning, in_development, testing, production, archived
  settings      Json     @default("{}")
  statistics    Json     @default("{}")
  createdBy     String
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  // Relations
  company       Company   @relation(fields: [companyId], references: [id], onDelete: Cascade)
  workspace     Workspace? @relation(fields: [workspaceId], references: [id], onDelete: SetNull)
  members       UserProject[]
  tables        ParsedTable[]
  modules       ProjectModule[]
  rules         BusinessRuleDB[]
  
  @@unique([companyId, slug])
  @@index([companyId])
  @@index([workspaceId])
  @@index([status])
}

/// UserProject - User membership in a project
model UserProject {
  id          String   @id @default(cuid())
  userId      String
  projectId   String
  role        String   @default("viewer") // manager, developer, viewer
  status      String   @default("active")
  permissions Json     @default("[]")
  settings    Json     @default("{}")
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  // Relations
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  project     Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  
  @@unique([userId, projectId])
  @@index([projectId])
  @@index([userId])
}

/// Session - User authentication sessions
model Session {
  id           String   @id @default(cuid())
  userId       String
  token        String   @unique
  ipAddress    String?
  userAgent    String?
  expiresAt    DateTime
  createdAt    DateTime @default(now())
  
  // Relations
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([userId])
  @@index([token])
}

/// ApiKey - API keys for programmatic access
model ApiKey {
  id          String   @id @default(cuid())
  companyId   String
  userId      String?
  name        String
  key         String   @unique
  scopes      Json     @default("[]")
  lastUsedAt  DateTime?
  expiresAt   DateTime?
  isActive    Boolean  @default(true)
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  // Relations
  company     Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)
  user        User?    @relation(fields: [userId], references: [id], onDelete: SetNull)
  
  @@index([companyId])
  @@index([key])
}

// =============================================================================
// PROJECT ARTIFACTS
// =============================================================================

/// ParsedTable - SQL tables parsed for a project
model ParsedTable {
  id            String   @id @default(cuid())
  projectId     String
  tableName     String
  schemaName    String   @default("dbo")
  columns       Json
  foreignKeys   Json     @default("[]")
  indexes       Json     @default("[]")
  checkConstraints Json  @default("[]")
  sourceDDL     String?
  status        String   @default("pending") // pending, partial, complete
  linkedModule  String?
  columnIntelligence Json @default("{}")
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  // Relations
  project       Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  
  @@unique([projectId, tableName])
  @@index([projectId])
  @@index([linkedModule])
}

/// ProjectModule - Module assignments for a project
model ProjectModule {
  id            String   @id @default(cuid())
  projectId     String
  moduleKey     String
  moduleName    String
  layer         Int
  priority      Int      @default(5)
  status        String   @default("planned") // planned, in_progress, testing, completed, blocked
  estimatedDays Int?
  actualDays    Int?
  notes         String?
  assignedTo    String?
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  // Relations
  project       Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  
  @@unique([projectId, moduleKey])
  @@index([projectId])
  @@index([status])
}

/// BusinessRuleDB - Business rules for a project
model BusinessRuleDB {
  id            String   @id @default(cuid())
  projectId     String
  code          String
  name          String
  description   String
  category      String
  priority      String   @default("medium")
  status        String   @default("draft")
  moduleName    String?
  tableName     String?
  trigger       Json
  condition     Json
  action        Json
  exception     Json?
  examples      Json     @default("[]")
  impact        String?
  approvedBy    String?
  approvedAt    DateTime?
  version       Int      @default(1)
  tags          Json     @default("[]")
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  // Relations
  project       Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  
  @@unique([projectId, code])
  @@index([projectId])
  @@index([category])
  @@index([priority])
}

// =============================================================================
// SUBSCRIPTION & BILLING
// =============================================================================

/// SubscriptionEvent - Track subscription changes
model SubscriptionEvent {
  id              String   @id @default(cuid())
  companyId       String
  type            String   // created, updated, cancelled, renewed, upgraded, downgraded
  previousTier    String?
  newTier         String
  previousStatus  String?
  newStatus       String
  stripeEventId   String?
  metadata        Json     @default("{}")
  
  createdAt       DateTime @default(now())
  
  @@index([companyId])
  @@index([type])
}

/// UsageRecord - Track daily usage for billing
model UsageRecord {
  id              String   @id @default(cuid())
  companyId       String
  date            DateTime @db.Date
  projectCount    Int      @default(0)
  userCount       Int      @default(0)
  tableCount      Int      @default(0)
  apiCallCount    Int      @default(0)
  exportCount     Int      @default(0)
  storageUsed     Float    @default(0)
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  @@unique([companyId, date])
  @@index([companyId])
}

// =============================================================================
// AUDIT LOG
// =============================================================================

/// AuditLog - Track all important actions
model AuditLog {
  id          String   @id @default(cuid())
  companyId   String?
  userId      String?
  action      String
  resource    String
  resourceId  String?
  oldValues   Json?
  newValues   Json?
  ipAddress   String?
  userAgent   String?
  metadata    Json     @default("{}")
  
  createdAt   DateTime @default(now())
  
  @@index([companyId])
  @@index([userId])
  @@index([action])
  @@index([resource])
  @@index([createdAt])
}
`;

// Schema installation instructions
export const SCHEMA_INSTALLATION = `
-- Multi-Tenant Schema Installation Instructions --

1. Add the models above to your prisma/schema.prisma file
2. Run: npx prisma migrate dev --name add_multi_tenant
3. Seed the subscription tiers:

INSERT INTO "SubscriptionTier" (id, name, displayName, price, billingPeriod, features, limits)
VALUES 
  ('tier_free', 'free', 'Free', 0, 'monthly', '[]', '{"maxProjects":1,"maxUsers":2,"maxTables":10}'),
  ('tier_starter', 'starter', 'Starter', 29, 'monthly', '[]', '{"maxProjects":5,"maxUsers":10,"maxTables":50}'),
  ('tier_professional', 'professional', 'Professional', 99, 'monthly', '[]', '{"maxProjects":25,"maxUsers":50,"maxTables":-1}'),
  ('tier_enterprise', 'enterprise', 'Enterprise', 0, 'yearly', '[]', '{"maxProjects":-1,"maxUsers":-1,"maxTables":-1}');

4. Create initial admin user and company:

-- This would typically be done through the application

5. Configure Stripe webhooks for subscription management

6. Set up background jobs for:
   - Daily usage aggregation
   - Subscription status checks
   - Trial expiration notifications
`;
