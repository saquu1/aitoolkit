# SPDLL Strategic Implementation Plan

**Post-CSHTML Intelligence Integration Strategy**

*Next.js 16 | React 19 | Prisma | SQLite Architecture*

---

## 1. Executive Summary

This strategic document outlines the comprehensive implementation plan for handling Stored Procedures and Dynamic Link Libraries (SPDLL) within the AI Enterprise Architect platform. Following the successful completion of CSHTML Intelligence extraction capabilities, this plan addresses the integration of backend business logic analysis with frontend view intelligence, creating a unified migration pathway from legacy ASP.NET systems to modern Next.js architecture.

The SPDLL handling strategy represents a critical bridge between database schema analysis and frontend migration, enabling complete understanding of legacy system behavior patterns, business rule extraction, and automated API generation. This document provides technical specifications, implementation phases, resource requirements, and success metrics for the SPDLL integration initiative.

---

## 2. Current Technology Stack Verification

Before proceeding with SPDLL implementation, a thorough verification of the existing technology stack was conducted. The following table confirms the current architecture and identifies components relevant to SPDLL integration:

| Component | Current Version | SPDLL Relevance |
|-----------|-----------------|-----------------|
| Next.js | 16.1.1 (App Router) | API Routes for SP execution |
| React | 19.0.0 | UI component rendering |
| Prisma ORM | 6.11.1 | Raw SQL for SP calls |
| SQLite | 3.x (via Prisma) | Dev/Meta storage only |
| TypeScript | 5.x | Type generation from SP |
| z-ai-web-dev-sdk | 0.0.17 | AI-powered SP analysis |

**Key Findings:**

- Next.js 16.1.1 provides stable App Router for API route generation from SP definitions
- Prisma 6.11.1 supports `$queryRaw` and `$executeRaw` for stored procedure execution
- SQLite serves as development/meta storage; production will require SQL Server connection for SP access
- Existing SP parser (sp-parser.ts) provides foundation for intelligence extraction
- CSHTML parser integration creates unified frontend-backend intelligence pipeline

---

## 3. SPDLL Definition and Scope

### 3.1 Stored Procedures (SP)

Stored Procedures in the legacy system represent the core business logic layer. These SQL Server procedures encapsulate data operations ranging from simple CRUD operations to complex multi-table transactions with business rule enforcement. The existing SP parser infrastructure identifies the following action types through naming convention analysis:

| Pattern | Action Type | Migration Target |
|---------|-------------|------------------|
| `SP_DDL_*` | Dropdown/List | `GET /api/{entity}/dropdown` |
| `SP_Get*` | Read/Fetch | `GET /api/{entity}/:id` |
| `SP_Add*` | Create/Insert | `POST /api/{entity}` |
| `SP_Update*` | Update/Edit | `PUT /api/{entity}/:id` |
| `SP_Delete*` | Delete/Remove | `DELETE /api/{entity}/:id` |
| `SP_Search*` | Search/Query | `GET /api/{entity}/search` |
| `SP_Validate*` | Business Validation | `POST /api/{entity}/validate` |

### 3.2 DLL (Dynamic Link Library)

In the ASP.NET MVC architecture, DLLs contain compiled C# code including Controllers, Models, Services, and Business Logic components. The reverse engineering process for DLLs involves decompilation and analysis to extract:

- **Controller Actions:** API endpoint definitions and routing patterns
- **Model Classes:** Data structures matching database entities
- **Service Layer:** Business logic and validation rules
- **Data Access:** Entity Framework contexts and queries
- **Attributes/Metadata:** Authorization, validation, and display attributes

---

## 4. CSHTML Intelligence Integration

The recently completed CSHTML Intelligence extraction provides the frontend view layer understanding. Integrating SPDLL analysis with CSHTML intelligence creates a complete picture of the legacy system, enabling comprehensive migration planning. The integration strategy focuses on bridging the gap between frontend views and backend data operations.

### 4.1 Intelligence Correlation Matrix

The following matrix illustrates how CSHTML-extracted intelligence correlates with SPDLL analysis to produce comprehensive migration artifacts:

| CSHTML Source | SP/DLL Source | Correlation Result | Confidence |
|---------------|---------------|-------------------|------------|
| Form fields (asp-for) | SP parameters | API input schema | 95% |
| Validation rules | SP body conditions | Business rules | 85% |
| Dropdown sources | SP_DDL_* procedures | Lookup endpoints | 98% |
| List columns | SP_Get* SELECT | API response schema | 92% |
| AJAX endpoints | Controller actions | Route mapping | 88% |
| RBAC permissions | Authorize attributes | API middleware | 90% |

---

## 5. Implementation Phases

The SPDLL integration will be executed in four strategic phases, each building upon the previous phase's deliverables. This phased approach ensures manageable complexity, clear milestones, and the ability to validate results incrementally before proceeding to subsequent phases.

### Phase 1: SP Intelligence Enhancement (Week 1-2)

This phase focuses on enhancing the existing SP parser (sp-parser.ts) to extract more comprehensive intelligence and establish correlation capabilities with CSHTML analysis results.

**Key Tasks:**
1. Enhance SP parameter type inference with semantic analysis
2. Implement business rule extraction from WHERE clauses and conditional logic
3. Build SP-to-CSHTML correlation engine using field name matching
4. Create API schema generator from SP parameters and result sets
5. Develop complexity scoring and migration risk assessment

**Deliverables:**
- Enhanced SP parser with 95% field extraction accuracy
- SP-CSHTML correlation report generator
- OpenAPI 3.0 schema generator from SP definitions

---

### Phase 2: DLL Analysis Integration (Week 3-4)

This phase introduces DLL decompilation and analysis capabilities to extract controller actions, model definitions, and business logic from compiled .NET assemblies.

**Key Tasks:**
1. Integrate ILSpy/dnlib for DLL decompilation
2. Build Controller Action extractor with route mapping
3. Implement Model class parser with attribute extraction
4. Create Service layer business logic extractor
5. Build three-way correlation (CSHTML-SP-DLL) engine

**Deliverables:**
- DLL analyzer module with controller/action extraction
- TypeScript type generator from C# models
- Complete intelligence correlation dashboard

---

### Phase 3: API Generation Layer (Week 5-6)

This phase leverages the gathered intelligence to automatically generate Next.js API routes with Prisma integration, creating executable backend code from legacy SP definitions.

**Key Tasks:**
- Generate Next.js API route handlers from SP definitions
- Implement Prisma raw query wrappers for SP execution
- Create TypeScript type definitions from merged intelligence
- Build validation middleware from extracted business rules
- Implement authentication/authorization middleware from RBAC analysis

**Deliverables:**
- Auto-generated API routes with full TypeScript typing
- SP execution layer with parameter validation
- Swagger/OpenAPI documentation auto-generation

---

### Phase 4: Validation & Migration Support (Week 7-8)

The final phase focuses on validation tooling, migration tracking, and quality assurance to ensure generated artifacts meet production standards.

**Key Tasks:**
- Build SP execution comparison tool (legacy vs. new API)
- Create migration progress dashboard with gap analysis
- Implement automated test case generation from SP logic
- Build documentation generator from merged intelligence
- Create deployment checklist and validation pipeline

**Deliverables:**
- Migration validation suite with automated testing
- Complete migration documentation package
- Production deployment guide and checklist

---

## 6. Technical Architecture

The SPDLL integration architecture extends the existing AI Enterprise Architect platform with three new core modules: SP Intelligence Engine, DLL Analyzer, and API Generator. These modules integrate seamlessly with the existing CSHTML parser and database schema analysis capabilities.

### 6.1 Data Flow Architecture

The following illustrates the data flow from legacy artifacts through intelligence extraction to generated API code:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              INPUT LAYER                                    │
│   SQL DDL  │  Stored Procedures  │  CSHTML Views  │  DLL Assemblies        │
└─────┬─────────────┬────────────────────┬────────────────┬──────────────────┘
      │             │                    │                │
      ▼             ▼                    ▼                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                             PARSING LAYER                                   │
│   SQL Parser │ SP Parser │ CSHTML Parser │ DLL Decompiler                  │
└─────┬─────────────┬────────────────────┬────────────────┬──────────────────┘
      │             │                    │                │
      ▼             ▼                    ▼                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           INTELLIGENCE LAYER                                │
│   Schema Intel │ SP Intelligence │ View Intelligence │ Business Rules      │
└─────┬─────────────┬────────────────────┬────────────────┬──────────────────┘
      │             │                    │                │
      ▼             ▼                    ▼                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CORRELATION LAYER                                 │
│   Field Matching │ Route Mapping │ Permission Mapping │ Validation Mapping │
└─────┬─────────────┬────────────────────┬────────────────┬──────────────────┘
      │             │                    │                │
      ▼             ▼                    ▼                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           GENERATION LAYER                                  │
│   API Routes │ TypeScript Types │ React Components │ Documentation         │
└─────┬─────────────┬────────────────────┬────────────────┬──────────────────┘
      │             │                    │                │
      ▼             ▼                    ▼                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              OUTPUT LAYER                                   │
│         Next.js App Router API Routes with Prisma Integration              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Prisma Schema Extensions

The following Prisma schema extensions support SPDLL intelligence storage and caching. These models integrate with the existing schema to provide persistent storage for analysis results:

**Existing Models (Already Implemented):**
- `StoredProcedureCache` - SP intelligence with action types and dependencies
- `DiscoveredTableCache` - Tables found in SPs but not in uploaded DDL
- `CSHTMLAnalysisCache` - View parsing results with field definitions
- `UIScreenBlueprint` - Merged intelligence for UI generation

**Required Extensions:**
- **DLLAnalysisCache:** Controller actions, model definitions, service methods
- **APISchemaCache:** Generated OpenAPI schemas and TypeScript types
- **MigrationMappingCache:** Legacy-to-new entity and route mappings
- **ValidationRuleCache:** Extracted business rules for API middleware

---

## 7. Risk Assessment and Mitigation

| Risk Category | Severity | Mitigation Strategy |
|---------------|----------|---------------------|
| Dynamic SQL in SPs | Critical | Flag for manual review; AI-assisted pattern extraction |
| Encrypted DLLs | High | Request source code access; fallback to CSHTML + SP analysis |
| Missing SP Sources | High | Use CSHTML AJAX endpoints to infer SP signatures |
| Naming Convention Gaps | Medium | AI classification fallback; manual categorization interface |
| Type Mismatches | Medium | Confidence scoring; validation against DB schema |

---

## 8. Success Metrics

The following key performance indicators (KPIs) will be used to measure the success of the SPDLL integration initiative:

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| SP Field Extraction Accuracy | ≥ 95% | Manual validation sample |
| CSHTML-SP Correlation Rate | ≥ 90% | Auto-matched forms to SPs |
| API Generation Success | ≥ 85% | Compilable generated code |
| Business Rule Coverage | ≥ 80% | Extracted vs. documented rules |
| Migration Time Reduction | ≥ 60% | Comparison with manual effort |

---

## 9. Recommended Next Steps

Based on the analysis and strategic planning outlined in this document, the following immediate next steps are recommended to initiate the SPDLL integration:

1. **Review and Approval:** Stakeholder review of this strategic plan and resource allocation approval
2. **Sample Data Collection:** Gather representative SP scripts and DLL files from the legacy system
3. **Environment Setup:** Configure SQL Server connection for production SP analysis (beyond SQLite dev environment)
4. **Sprint Planning:** Create detailed sprint backlog for Phase 1 implementation tasks
5. **Pilot Module Selection:** Identify a single module (e.g., Organization) for end-to-end pilot migration
6. **Baseline Establishment:** Document current manual migration effort metrics for comparison

Upon completion of these preparatory steps, the team will be positioned to begin Phase 1 implementation with clear objectives, measurable targets, and a validated technical approach.

---

## Appendix: Existing Parser Capabilities

### CSHTML Parser (`cshtml-parser.ts`)

The existing CSHTML parser extracts the following intelligence from Razor views:

- **Form Fields:** Input types, validation rules, labels, layout
- **List Views:** Column definitions, sorting, pagination
- **JavaScript:** Validation rules, AJAX endpoints, cascading dropdowns
- **Permissions:** RBAC requirements from conditional rendering
- **Schema Intelligence:** Inferred tables and relationships

### SP Parser (`sp-parser.ts`)

The existing SP parser provides:

- **Action Type Classification:** Based on naming conventions
- **Module Identification:** Keyword-based module mapping
- **Table Dependencies:** FROM, JOIN, INSERT, UPDATE, DELETE extraction
- **Business Rules:** WHERE clause condition analysis
- **API Schema:** Parameter-to-API-property mapping
- **Complexity Scoring:** Risk assessment for migration

---

*Document generated for AI Enterprise Architect Platform - SPDLL Integration Initiative*
