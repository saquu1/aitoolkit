# Deep Analysis: Module 02 (UI Intelligence) & Module 03 (Schema Intelligence)

---

## MODULE 02: UI INTELLIGENCE — COMPLETE ANALYSIS

### 02-A: Claimed Capabilities vs Verified Implementation

**Screen Generation Actions (8 claimed):**

| Action | Claimed | Implementation Evidence | Status |
|---|---|---|---|
| `generate-screens` | Generate all screens for project | screen-blueprint-generator.ts exists | ⚠️ Generates JSON blueprint, not actual screen files |
| `generate-list-screen` | Create list/grid screen | No list-specific generator found | ❌ Not implemented |
| `generate-detail-screen` | Create detail view screen | No detail-specific generator found | ❌ Not implemented |
| `generate-form-screen` | Create create/edit form | screen-blueprint-generator.ts produces form definition | ⚠️ Partial — JSON schema only, no React component |
| `generate-search-screen` | Create advanced search | No search screen generator found | ❌ Not implemented |
| `generate-dashboard` | Create module dashboard | No dashboard generator found | ❌ Not implemented |
| `generate-wizard` | Create multi-step wizard | No wizard generator found | ❌ Not implemented |
| `generate-crud-screens` | Full CRUD screen set | No CRUD set generator found | ❌ Not implemented |

**Field Configuration Actions (9 claimed):**

| Action | Claimed | Implementation Evidence | Status |
|---|---|---|---|
| `map-field-to-control` | Map column to UI control | column-intelligence.ts has suggestedUIComponent | ⚠️ Partial — mapping exists but in Module 3, not Module 2 |
| `configure-lookup-field` | Setup FK lookup field | No configurable lookup setup | ❌ Not implemented as action |
| `configure-date-picker` | Setup date field | No date picker configuration action | ❌ Not implemented |
| `configure-numeric-input` | Setup number field | No numeric config action | ❌ Not implemented |
| `configure-text-area` | Setup multiline text | No textarea config action | ❌ Not implemented |
| `configure-dropdown` | Setup select/combobox | No dropdown config action | ❌ Not implemented |
| `configure-checkbox` | Setup boolean field | No checkbox config action | ❌ Not implemented |
| `configure-file-upload` | Setup file attachment | No file upload config action | ❌ Not implemented |
| `configure-rich-text` | Setup HTML editor | No rich text config action | ❌ Not implemented |

**Navigation Actions (5 claimed):**

| Action | Claimed | Implementation Evidence | Status |
|---|---|---|---|
| `generate-navigation` | Create navigation menu | No navigation generator found | ❌ Not implemented |
| `generate-breadcrumbs` | Create breadcrumb config | No breadcrumb generator found | ❌ Not implemented |
| `generate-sidebar-menu` | Create sidebar navigation | No sidebar generator found | ❌ Not implemented |
| `generate-tabs` | Create tab navigation | No tab generator found | ❌ Not implemented |
| `generate-related-links` | Create related entity links | No link generator found | ❌ Not implemented |

**Validation Configuration Actions (6 claimed):**

| Action | Claimed | Implementation Evidence | Status |
|---|---|---|---|
| `generate-validations` | Create field validations | Validation inference exists in column-intelligence.ts | ⚠️ Partial — inference only, not configurable |
| `add-required-validation` | Add required rule | No individual validation action | ❌ Not implemented |
| `add-length-validation` | Add length constraint | No individual validation action | ❌ Not implemented |
| `add-pattern-validation` | Add regex pattern | No individual validation action | ❌ Not implemented |
| `add-range-validation` | Add numeric range | No individual validation action | ❌ Not implemented |
| `add-custom-validation` | Add custom rule | No individual validation action | ❌ Not implemented |

**Screen Management Actions (7 claimed):**

| Action | Claimed | Implementation Evidence | Status |
|---|---|---|---|
| `create-screen` | Create new screen | UIScreenBlueprint Prisma model exists | ⚠️ Model exists, CRUD API unknown |
| `update-screen` | Update screen config | Not verified | ⚠️ Unknown |
| `get-screen` | Get screen details | Not verified | ⚠️ Unknown |
| `list-screens` | List project screens | Not verified | ⚠️ Unknown |
| `delete-screen` | Delete screen | Not verified | ⚠️ Unknown |
| `duplicate-screen` | Clone screen | No clone logic found | ❌ Not implemented |
| `reorder-fields` | Reorder screen fields | No reorder logic found | ❌ Not implemented |

**Summary:**

```
Total explicitly listed actions:  35 (of "70+" claimed)
Verified working:                 1-2 (generate-screens partial, map-field-to-control partial)
Partial/Presumed:                 6-8
Not implemented:                  25+
Unlisted actions (70-35):         35+ actions never enumerated
Verification rate:                ~3-5%
```

**Finding 02-001:** Module 2 is the most overinflated module. Of 35 listed actions, approximately 2 are partially functional (generating a JSON blueprint and mapping fields to control types). The remaining 33+ listed actions and 35+ unlisted actions do not exist. Effective implementation rate is approximately 3%.

---

### 02-B: The Core Problem — Blueprint Without Builder

The fundamental architectural gap in Module 2 is the disconnect between BLUEPRINT and IMPLEMENTATION.

Cross-referencing what exists versus what is needed:

```
WHAT EXISTS (from implementation analysis):

screen-blueprint-generator.ts
  Input:  Table name + columns
  Output: JSON object describing screen structure
  
  Contains:
    - Field list with inferred UI types
    - Basic section grouping
    - Suggested labels
    - Required/optional flags

column-intelligence.ts (actually Module 3, but used by Module 2)
  Input:  Column name + data type
  Output: Suggested UI component type + semantic type
  
  Contains:
    - Name pattern → UI type mapping
    - Data type → UI type mapping
    - Semantic category inference


WHAT IS MISSING (the actual generation pipeline):

1. Blueprint → React Component Generator
   Input:  ScreenBlueprint JSON
   Output: CustomerForm.tsx, CustomerList.tsx, CustomerDetail.tsx
   Status: ❌ Does not exist

2. Blueprint → Page Generator
   Input:  ScreenBlueprint JSON
   Output: page.tsx files with routing
   Status: ❌ Does not exist

3. Blueprint → Layout Generator
   Input:  Layout configuration
   Output: layout.tsx with sidebar, header, etc.
   Status: ❌ Does not exist

4. Navigation → Route Config
   Input:  Module list + screen list
   Output: Navigation menu component, route configuration
   Status: ❌ Does not exist

5. Dashboard → Widget Assembly
   Input:  Table statistics + chart config
   Output: Dashboard page with KPI cards, charts, tables
   Status: ❌ Does not exist

6. Form Blueprint → Interactive Form
   Input:  Field list with validation
   Output: React Hook Form component with Zod validation
   Status: ❌ Does not exist
```

**Finding 02-002:** Module 2 produces a data structure (blueprint JSON) but has no consumer for that data structure. The blueprint is generated and stored but never transformed into actual UI code. The pipeline is broken at the critical junction between "what to build" and "building it." Cross-referencing with Module 4 (Code Generation), Module 4 lists screen blueprints as an upstream dependency, but Module 4's code generation capability is also largely unimplemented. Both halves of the pipeline are missing.

---

### 02-C: Screen Types — Claims vs Capability

Module 2 documents 8 screen types:

| Screen Type | Document Claims | What Would Be Needed | Implementation |
|---|---|---|---|
| List | Grid with sort, filter, pagination | DataTable component with server-side processing, column config, action buttons, export | ❌ No list component generator |
| Detail | All fields read-only | Read-only form with field grouping, related data tabs, audit trail display | ❌ No detail component generator |
| Create Form | Editable fields with validation | React Hook Form with Zod, field components per type, error display, submit handler | ❌ No create form generator |
| Edit Form | Editable fields with validation | Same as Create but with data prefill, readonly PK, conditional fields | ❌ No edit form generator |
| Delete Confirmation | Record summary, confirm button | Modal with entity summary, cascade warning, confirm/cancel | ❌ No delete confirmation generator |
| Search | Advanced search interface | Multi-field search form, saved searches, results grid | ❌ No search screen generator |
| Dashboard | Charts, KPIs, recent items | Chart components, KPI cards, activity feed, quick actions | ❌ No dashboard generator |
| Wizard | Progressive field groups | Multi-step form with progress indicator, step validation, summary | ❌ No wizard generator |

**Finding 02-003:** All 8 screen types are documented as capabilities but none are implemented as generators. The screen-blueprint-generator.ts produces a JSON specification but does not differentiate between screen types — it generates the same basic field-list structure regardless of whether the consumer needs a list, form, detail, or dashboard.

---

### 02-D: Field Mapping Rules — Cross-Reference with CSHTML Evidence

Module 2 documents an "Automatic Control Type Detection" table mapping SQL types to UI controls. Cross-referencing this mapping with what was actually discovered from the Organization.cshtml analysis (350+ intelligence points):

| SQL Type / Context | Module 2 Claims | CSHTML Reality (Organization.cshtml) | Gap |
|---|---|---|---|
| BIT | checkbox/switch | IsActive rendered as `kt-checkbox` with `checked="checked"` default | ⚠️ Module 2 says "checkbox/switch" generically. Reality needs to know: checkbox in create, checkbox in update, with specific default value. |
| INT (FK) | lookup | OrganizationTypeId rendered as `selectpicker` with `data_live_search="true"` loaded from `DDLManager.GetOrganizationTypesDDL()` | ❌ Module 2 says "lookup" but reality is a searchable dropdown with specific data source, not a generic lookup. |
| INT (FK + cascade) | lookup | CountryId → ProvinceId → CityId rendered as cascading dependent dropdowns with AJAX loading from specific URLs | ❌ Module 2 has no concept of cascading dropdowns. The field mapping table has no entry for cascading FK chains. |
| NVARCHAR(2) with digits-only | text | Code field rendered with `maxlength="2"`, `text-transform:capitalize`, digits-only validation, remote uniqueness check | ❌ Module 2 maps VARCHAR(<100) to "text" generically. Reality needs specific maxlength, input restrictions, and remote validation. |
| NVARCHAR(100) email semantic | text | Email rendered with regexp email validation pattern, notEmpty, and specific error messages | ❌ Module 2 has no email-specific entry in mapping table. No mention of email validation pattern. |
| NVARCHAR + phone semantic | text | TelNo and CellNoOne rendered with `onkeypress="Utilities.TakeOnlyInputNumbers(event)"` and numeric-only validation | ❌ Module 2 has no phone-specific entry. No mention of numeric-only input restriction. |
| NVARCHAR + password | text | Password field rendered with `type="password"`, minlength=6, plus ConfirmPassword with identical validator | ❌ Module 2 has no password field entry. No concept of confirmation field pairing. |
| DATE + datepicker | date | DateOfBirth rendered with bootstrap-datepicker, format DD/MM/YYYY, min 01/01/1900, max today, plus jquery.mask for input | ⚠️ Module 2 says "date" generically. Reality needs specific format, min/max dates, masking library, and complex event handling. |
| File upload | Not in mapping | Image upload with `accept="image/*"` and FormData handling | ❌ Module 2 has no file upload entry in the type mapping table. |
| Hidden GUID (PK) | text (read-only) | UpdateID rendered as `type="text" hidden="hidden" readonly="readonly"` | ⚠️ Module 2 says UNIQUEIDENTIFIER → "text (GUID display read-only)" but reality is a hidden field, never displayed. |
| Nested model prefix | Not in mapping | `User.firstname`, `User.GenderId` — fields with dot-prefix binding to nested model | ❌ Module 2 has no concept of nested model binding, form sections mapping to different entities, or composite create operations. |

**Finding 02-004:** Module 2's field mapping table has 14 entries covering basic SQL-to-UI-control mapping. The Organization.cshtml analysis revealed 22 distinct field configurations requiring at least 25 different mapping rules including searchable dropdowns, cascading dropdowns, password pairs, masked inputs, numeric-only inputs, file uploads, hidden fields, nested model fields, and conditional readonly behavior. Module 2's mapping covers approximately 40% of real-world field complexity and misses the most important nuances that make forms functional.

---

### 02-E: Data Model Analysis — ScreenBlueprint Interface

Module 2 defines:

```typescript
interface ScreenBlueprint {
  id: string;
  projectId: string;
  tableName: string;
  screenType: 'list' | 'detail' | 'create' | 'edit' | 'search' | 'dashboard' | 'wizard';
  title: string;
  description?: string;
  fields: ScreenField[];
  actions: ScreenAction[];
  layout: LayoutConfig;
  permissions: PermissionConfig;
  navigation: NavigationConfig;
}
```

Cross-referencing with what the CSHTML analysis proved is needed:

```
WHAT SCREENBLUEPINT HAS          WHAT CSHTML ANALYSIS REQUIRES
─────────────────────────        ────────────────────────────────
fields: ScreenField[]            ✅ Field list — but ScreenField is too simple
actions: ScreenAction[]          ⚠️ Actions — but no AJAX submit URL, no error code mapping
layout: LayoutConfig             ⚠️ Layout — but no section nesting, no conditional display
permissions: PermissionConfig    ⚠️ Permissions — what type? Not defined.
navigation: NavigationConfig     ⚠️ Navigation — what type? Not defined.

MISSING FROM SCREENBLUEPINT:
  ❌ formAction (POST URL, AJAX URL)
  ❌ formEncoding (multipart/form-data for file upload)
  ❌ ajaxEndpoints (submit URL, validation URLs, cascade URLs)
  ❌ errorCodeMapping (server error codes → user messages)
  ❌ gridConfiguration (DataTable columns, sort config, server-side vs client)
  ❌ modalConfiguration (edit modal, info modal, delete confirmation)
  ❌ formSections (Organization Info, Admin Info — separate visual groups)
  ❌ nestedEntities (User.* fields within Organization form)
  ❌ cascadeChains (Country → Province → City dependency)
  ❌ buttonConfiguration (Submit, Cancel, Update — with specific behavior)
  ❌ toastMessages (success/error notification messages)
  ❌ loadingBehavior (KTApp.blockPage overlay)
  ❌ formResetBehavior (what happens after submit)
  ❌ defaultVisibility (form hidden by default, shown on button click)
  ❌ validationFramework (bootstrapValidator vs jQuery validate)
  ❌ validationMessages (field-specific error messages)
  ❌ jsLibraryDependencies (jquery.mask, datepicker, selectpicker, toastr)
  ❌ cssFrameworkClasses (kt-portlet, kt-form, col-md-6)
```

**Finding 02-005:** The ScreenBlueprint interface has 8 top-level properties. The Organization.cshtml analysis demonstrated that a real-world screen requires at least 25 distinct configuration categories. The ScreenBlueprint captures approximately 30% of the information needed to generate a functional screen. The missing 70% includes the most critical elements: form submission handling, error code mapping, cascading dropdown chains, modal configurations, and JavaScript library dependencies.

---

### 02-F: ScreenField Interface — Depth Analysis

```typescript
interface ScreenField {
  id: string;
  columnName: string;
  label: string;
  uiType: UIControlType;
  isRequired: boolean;
  isReadOnly: boolean;
  isVisible: boolean;
  defaultValue?: any;
  placeholder?: string;
  validation: ValidationRule[];
  lookupConfig?: LookupConfig;
  order: number;
  width?: number;
  helpText?: string;
}
```

Cross-referencing with the UnifiedFieldRecord from the planning architecture:

```
ScreenField properties:     14
UnifiedFieldRecord UI layer: 30+ properties

MISSING FROM SCREENFIELD:
  ❌ isDisabled (different from isReadOnly)
  ❌ isHidden (different from isVisible — hidden fields still submit)
  ❌ conditionalDisplay (show/hide based on other field values)
  ❌ htmlElementType (input vs select vs textarea vs checkbox)
  ❌ inputType (text, password, email, number, file)
  ❌ cssClasses (form-control, selectpicker, datepicker)
  ❌ containerClasses (col-md-6, col-md-4)
  ❌ inlineStyles (text-transform:capitalize)
  ❌ dataAttributes (data-live-search, data-toggle)
  ❌ onEvents (onkeypress for numeric-only)
  ❌ sectionName (which section/group this field belongs to)
  ❌ tabName (if using tabs)
  ❌ formType ('create' | 'update' | 'both' — behavior differs!)
  ❌ nestedObjectPrefix (User. prefix for nested model)
  ❌ minLength / maxLength (separate from validation — HTML attributes)
  ❌ dropdownConfig (data source, search, cascade parent/child)
  ❌ dateConfig (format, min, max, masking)
  ❌ fileConfig (accept type, max size)
  ❌ remoteValidationUrl (for uniqueness checks)
  ❌ errorMessages (field-specific error text)
  ❌ gridColumnConfig (header, sortable, filterable, alignment, visibility)
```

**Finding 02-006:** ScreenField has 14 properties. A fully functional field configuration (as proven by the Organization.cshtml extraction) requires 35+ properties. ScreenField captures 40% of what is needed. The most critical omissions are: the field's behavior difference between create and edit forms, cascading dropdown configuration, nested model binding, and grid column configuration. Without these, generated screens would be non-functional.

---

### 02-G: UIControlType — Completeness Check

Module 2 defines 17 control types:

```typescript
type UIControlType = 
  | 'text' | 'email' | 'password' | 'number' | 'date' | 'datetime' 
  | 'textarea' | 'richtext' | 'select' | 'multiselect' | 'checkbox' 
  | 'radio' | 'switch' | 'file' | 'image' | 'lookup' | 'autocomplete'
  | 'color' | 'slider' | 'rating';
```

Cross-referencing with what the Organization.cshtml analysis and HIS domain requirements demand:

```
EXISTING TYPES THAT ARE SUFFICIENT:
  ✅ text, email, password, number, date, textarea, checkbox, switch, file

EXISTING TYPES THAT NEED SUBDIVISION:
  ⚠️ 'select' — needs to distinguish:
      - static_select (hardcoded options)
      - api_select (loaded from API)
      - searchable_select (with type-ahead search)
      - cascading_select (dependent on parent field)
      - grouped_select (optgroup structure)
  
  ⚠️ 'lookup' — needs to distinguish:
      - dropdown_lookup (simple FK dropdown)
      - modal_lookup (opens modal to search/select)
      - inline_autocomplete (type-ahead in input)

  ⚠️ 'date' — needs to distinguish:
      - date_only (DD/MM/YYYY)
      - datetime (DD/MM/YYYY HH:mm)
      - time_only (HH:mm)
      - date_range (from/to)

MISSING TYPES ENTIRELY:
  ❌ hidden          — hidden form field (for PK, system fields)
  ❌ readonly_text   — display-only text (computed fields)
  ❌ phone_input     — numeric-only input with formatting
  ❌ currency_input  — decimal with currency symbol
  ❌ percentage      — decimal with % symbol
  ❌ code_input      — short alphanumeric code (Organization Code)
  ❌ address         — multi-part address input
  ❌ toggle_group    — group of related toggles
  ❌ status_badge    — colored status indicator (in grids)
  ❌ action_buttons  — edit/delete/view action column (in grids)
  ❌ avatar          — profile image upload with preview
  ❌ tag_input       — multi-value tag entry
  ❌ tree_select     — hierarchical tree selection (for self-referencing FKs)
  ❌ masked_input    — input with format mask (date, phone, SSN)
  ❌ signature       — signature capture (for medical consent)
  ❌ barcode_scanner — barcode/QR input (for HIS patient wristbands)
```

**Finding 02-007:** The UIControlType enum has 20 entries but several are too coarse-grained to drive code generation. A `select` type without knowing whether it is searchable, cascading, or static cannot generate the correct React component. The enum needs at least 35 distinct types to cover real-world HIS UI requirements. Additionally, healthcare-specific controls (signature capture, barcode scanner) are entirely missing.

---

### 02-H: Integration Point Analysis — Module 02

Module 2 claims these upstream dependencies:

```
Intake Layer:          Table definitions, column metadata
Schema Intelligence:   Relationships, constraints
Business Logic:        Validation rules from SPs
```

Cross-referencing with what Module 2 actually NEEDS versus what upstream modules actually PROVIDE:

```
FROM INTAKE (Module 1):
  Module 2 NEEDS:             Module 1 PROVIDES:
  ─────────────               ──────────────────
  Table with columns          ✅ TableDef with ColumnDef[]
  Column semantic types       ❌ Not in ColumnDef (Module 3 adds this)
  CSHTML form structure       ❌ Module 1 doc doesn't mention CSHTML
  CSHTML field evidence       ❌ Not in Module 1's output contract
  
  GAP: Module 2 needs CSHTML evidence to generate accurate screens.
       Module 1 has the parser but doesn't document it as output.

FROM SCHEMA INTELLIGENCE (Module 3):
  Module 2 NEEDS:             Module 3 PROVIDES:
  ─────────────               ──────────────────
  FK relationships            ✅ Relationship[] (from fk-resolver)
  Semantic types              ✅ Column intelligence analysis
  Cascade chains              ⚠️ FK chains detected but not as cascade config
  Lookup table data           ❌ Module 3 doesn't identify lookup tables
  Cardinality                 ❌ Module 3 doesn't detect cardinality
  Naming conventions          ❌ Module 3 naming analyzer not implemented
  
  GAP: Module 2 needs cascade chain configuration for UI.
       Module 3 detects FK chains but doesn't format them as UI config.

FROM BUSINESS LOGIC (Module 5):
  Module 2 NEEDS:             Module 5 PROVIDES:
  ─────────────               ──────────────────
  Validation rules            ⚠️ Basic IF/THEN extraction
  Error messages              ❌ Error messages from SPs not extracted
  Conditional UI behavior     ❌ Not in Module 5 output
  Workflow state impacts      ❌ Not in Module 5 output
  Field editability rules     ❌ Not in Module 5 output
  
  GAP: Module 2 needs business rules that affect UI behavior.
       Module 5 extracts rules but doesn't classify which affect UI.
```

**Finding 02-008:** Module 2 has three upstream dependencies but the data contracts between modules are incompatible. Module 1 provides raw TableDef, Module 3 provides column analysis, Module 5 provides basic rules. But Module 2 needs ENRICHED data that combines all three sources into a unified view. This is exactly what the UnifiedFieldRecord from the planning architecture was designed to solve. Without it, Module 2 would need to independently query all three upstream modules and merge results itself — which adds complexity and creates inconsistency risk.

---

### 02-I: Downstream Consumer Analysis — Module 02

Module 2 claims these downstream consumers:

```
Code Generation:          Generates React components from blueprints
Testing Intelligence:     Creates UI test cases from screen configs
Documentation Intelligence: Generates screen documentation
```

Cross-referencing each consumer's documented needs:

```
MODULE 4 (Code Generation) says it needs:
  "UI Intelligence: Screen blueprints"
  
  But Code Gen needs:
    - Exact React component structure
    - Import statements for each UI control type
    - Props interface per component
    - State management hooks
    - API endpoint URLs for data loading
    - Error handling patterns
    - Form submission handlers
    
  ScreenBlueprint provides:
    - Field list with basic types
    - Layout config
    
  GAP: ScreenBlueprint → Code Gen requires a transformation layer
       that doesn't exist. ScreenBlueprint is insufficient input for
       generating production React components.

MODULE 8 (Testing) says it needs:
  "UI Intelligence: Screens for UI tests"
  
  But Testing needs:
    - What fields are on each screen
    - What validations apply per field
    - What the expected error messages are
    - What the submission behavior is
    - What the success/failure states look like
    
  ScreenBlueprint provides:
    - Field list
    - Basic validation rules
    
  GAP: Testing needs specific expected results and error messages.
       ScreenBlueprint doesn't include error code mapping or 
       toast message definitions.

MODULE 9 (Documentation) says it needs:
  "UI Intelligence: Screen definitions"
  
  Documentation needs:
    - Screen names and descriptions
    - Field labels and help text
    - User workflow descriptions
    - Screenshot references
    
  ScreenBlueprint provides:
    - Some of this (title, fields with labels)
    
  GAP: Smallest gap. Documentation can work with basic blueprint data.
```

**Finding 02-009:** Module 2's output (ScreenBlueprint) is insufficient for its primary consumer (Module 4 — Code Generation). The blueprint provides approximately 30% of the information needed to generate React components. The gap is not just missing data — it is a structural mismatch between a high-level specification (blueprint) and the low-level implementation details needed for code generation (imports, hooks, handlers, styling).

---

### 02-K: CSHTML Parser Integration — The Biggest Missed Opportunity

**Finding 02-010:** Cross-referencing Module 2 with the Organization.cshtml extraction results, the CSHTML parser provides EXACTLY the information that Module 2 claims to generate but cannot:

```
CSHTML PARSER EXTRACTS:              MODULE 2 WANTS TO GENERATE:
─────────────────────                ────────────────────────────
Form structure with sections         → Screen with sections ✅ MATCH
Field types with attributes          → Field configurations ✅ MATCH
Validation rules with messages       → Validation rules ✅ MATCH
Dropdown configurations              → Lookup configs ✅ MATCH
Cascading chains                     → Related lookups ✅ MATCH
Grid column definitions              → List screen ✅ MATCH
Modal configurations                 → Detail/edit screens ✅ MATCH
Button configurations                → Screen actions ✅ MATCH
Permission checks                    → Permission config ✅ MATCH
AJAX endpoints                       → API mapping ✅ MATCH
JavaScript libraries                 → Frontend dependencies ✅ MATCH
Layout structure (rows, columns)     → Layout config ✅ MATCH
```

**The CSHTML parser is Module 2's most valuable input source.** Every capability that Module 2 claims to infer from database schema alone (field types, layout, validation, navigation) is ALREADY explicitly defined in the CSHTML files. Instead of guessing that an INT FK column should be a dropdown, the CSHTML parser proves it IS a searchable dropdown with specific configuration.

**The integration path should be:**

```
CSHTML File → CSHTML Parser → UI Evidence → Module 2 (verify + enrich) → ScreenBlueprint

Instead of the current path:
Database Schema → Column Intelligence → Guess UI controls → Basic ScreenBlueprint
```

When CSHTML evidence is available, Module 2 should use it as the PRIMARY source and only fall back to schema inference when CSHTML is not available. This would make Module 2's output dramatically more accurate.

---

## MODULE 03: SCHEMA INTELLIGENCE — COMPLETE ANALYSIS

### 03-A: Claimed Capabilities vs Verified Implementation

**Relationship Analysis Actions (8 claimed):**

| Action | Claimed | Implementation Evidence | Status |
|---|---|---|---|
| `analyze-relationships` | Full relationship analysis | fk-resolver.ts detects FK relationships | ⚠️ Partial — FK detection works, not full relationship analysis |
| `get-parent-tables` | Find parent tables | Not found as separate action | ❌ Not implemented |
| `get-child-tables` | Find child tables | Not found as separate action | ❌ Not implemented |
| `get-relationship-path` | Path between tables | No pathfinding algorithm | ❌ Not implemented |
| `detect-circular-refs` | Find circular references | No cycle detection | ❌ Not implemented |
| `analyze-cardinality` | Determine cardinality | Always assumes ONE_TO_MANY | ❌ Not implemented (hardcoded) |
| `get-foreign-key-chains` | Build FK chains | Cascade chain detection in fk-resolver | ⚠️ Partial |
| `suggest-cascade-rules` | Suggest cascade behavior | No cascade suggestion logic | ❌ Not implemented |

**Naming Convention Actions (5 claimed):**

| Action | Claimed | Implementation Evidence | Status |
|---|---|---|---|
| `detect-naming-convention` | Identify naming pattern | No naming analyzer found | ❌ Not implemented |
| `validate-naming-convention` | Check against standard | No naming validator found | ❌ Not implemented |
| `suggest-standard-names` | Propose standard names | No naming suggestion logic | ❌ Not implemented |
| `apply-naming-convention` | Apply convention rules | No convention application logic | ❌ Not implemented |
| `generate-naming-rules` | Create naming guidelines | No naming rule generator | ❌ Not implemented |

**Data Quality Actions (6 claimed):**

| Action | Claimed | Implementation Evidence | Status |
|---|---|---|---|
| `analyze-data-quality` | Full quality assessment | No quality analyzer found | ❌ Not implemented |
| `detect-nullable-abuse` | Find unnecessary nullables | No nullable analysis | ❌ Not implemented |
| `check-default-values` | Validate defaults | No default value analysis | ❌ Not implemented |
| `analyze-data-types` | Check type appropriateness | column-intelligence.ts checks type semantics | ⚠️ Partial — semantic analysis, not appropriateness |
| `detect-redundant-columns` | Find duplicate data | No redundancy detection | ❌ Not implemented |
| `analyze-identity-columns` | Check identity usage | No identity analysis | ❌ Not implemented |

**Index Optimization Actions (6 claimed):**

| Action | Claimed | Implementation Evidence | Status |
|---|---|---|---|
| `analyze-indexes` | Full index analysis | No index analyzer | ❌ Not implemented |
| `suggest-indexes` | Propose new indexes | No index suggestion logic | ❌ Not implemented |
| `detect-unused-indexes` | Find unused indexes | No usage analysis (requires live DB) | ❌ Not implemented |
| `analyze-index-fragmentation` | Check fragmentation | Requires live DB access | ❌ Not implemented |
| `suggest-covering-indexes` | Propose covering indexes | No covering index logic | ❌ Not implemented |
| `analyze-index-usage` | Usage statistics | Requires live DB access | ❌ Not implemented |

**Normalization Actions (5 claimed):**

| Action | Claimed | Implementation Evidence | Status |
|---|---|---|---|
| `analyze-normalization` | Check normalization level | No normalization analyzer | ❌ Not implemented |
| `detect-1nf-violations` | Find 1NF issues | No 1NF checker | ❌ Not implemented |
| `detect-2nf-violations` | Find 2NF issues | No 2NF checker | ❌ Not implemented |
| `detect-3nf-violations` | Find 3NF issues | No 3NF checker | ❌ Not implemented |
| `suggest-normalization` | Propose normalization | No normalization suggestion | ❌ Not implemented |

**Constraint Actions (4 claimed):**

| Action | Claimed | Implementation Evidence | Status |
|---|---|---|---|
| `analyze-constraints` | Full constraint analysis | Constraints extracted by sql-parser | ⚠️ Partial — extraction only, no analysis |
| `validate-referential-integrity` | Check FK integrity | fk-resolver checks if referenced tables exist | ⚠️ Partial |
| `suggest-check-constraints` | Propose check constraints | No constraint suggestion | ❌ Not implemented |
| `analyze-unique-constraints` | Review unique constraints | Unique constraints extracted by parser | ⚠️ Partial — extraction only |

**Schema Comparison Actions (4 claimed):**

| Action | Claimed | Implementation Evidence | Status |
|---|---|---|---|
| `compare-schemas` | Compare two schemas | No comparison logic | ❌ Not implemented |
| `generate-schema-diff` | Generate diff report | No diff generator | ❌ Not implemented |
| `generate-migration-script` | Create migration SQL | No migration generator | ❌ Not implemented |
| `detect-schema-drift` | Find schema changes | No drift detection | ❌ Not implemented |

**Summary:**

```
Total explicitly listed actions:  38 (of "80+" claimed)
Verified working:                 2-3 (FK detection, column intelligence, basic ERD)
Partial:                          5-6
Not implemented:                  29+
Unlisted actions (80-38):         42+ actions never enumerated
Verification rate:                ~6-8%
```

**Finding 03-001:** Module 3 lists 38 specific actions. Of those, approximately 3 are fully implemented (column semantic analysis, FK detection/resolution, ERD Mermaid generation) and 5-6 are partially implemented. The remaining 29+ listed and 42+ unlisted actions do not exist.

---

### 03-B: Column Intelligence — The Module's Strongest Asset

Cross-referencing column-intelligence.ts (~600 lines) with the module documentation:

```
WHAT COLUMN INTELLIGENCE ACTUALLY DOES:

1. NAME-BASED SEMANTIC TYPE INFERENCE
   Input:  Column name "Email"
   Output: semanticType = "email"
           uiType = "email_input"
           suggestedLabel = "Email Address"
   
   Patterns recognized:
   ✅ email, phone, address, city, country, state, zip
   ✅ name, firstname, lastname, fullname
   ✅ date, dateofbirth, created, modified
   ✅ status, isactive, isenabled
   ✅ password, username
   ✅ code, id, key
   ✅ price, amount, cost, total, quantity
   ✅ description, notes, comments
   ✅ url, website, link
   ✅ image, photo, avatar, picture

2. DATA TYPE-BASED UI INFERENCE
   INT → number input
   BIT → checkbox/toggle
   NVARCHAR(x) where x < 100 → text input
   NVARCHAR(x) where x >= 100 → textarea
   NVARCHAR(MAX) → rich text
   DATE/DATETIME → date picker
   DECIMAL/MONEY → currency input
   UNIQUEIDENTIFIER → hidden field

3. SENSITIVITY DETECTION
   Links to pii-phi-detector.ts
   Marks columns as PII/PHI based on name patterns

4. VALIDATION INFERENCE
   Required: from NOT NULL constraint
   Max length: from NVARCHAR(x) length
   Email format: from email semantic type
   Numeric range: from INT/DECIMAL type
```

**Finding 03-002:** Column intelligence is the most mature component in the entire platform. It successfully bridges database schema to UI requirements. However, cross-referencing with the Organization.cshtml analysis reveals its limitations:

```
WHAT COLUMN INTELLIGENCE GETS RIGHT:
  ✅ "Email" → email type, email validation
  ✅ "IsActive" → boolean toggle
  ✅ "Name" → text, PII flag
  ✅ "DateOfBirth" → date picker
  ✅ "Password" → password field

WHAT COLUMN INTELLIGENCE MISSES:
  ❌ "Code" (2-char digit code) → infers "code" type but doesn't know it's digits-only, exactly 2 chars
  ❌ "OrganizationTypeId" → infers FK but doesn't know it's a SEARCHABLE dropdown with live search
  ❌ "CountryId" → infers FK but doesn't know it's the TOP of a 3-level cascade chain
  ❌ "ProvinceId" → infers FK but doesn't know it's DEPENDENT on CountryId
  ❌ "CityId" → infers FK but doesn't know it's DEPENDENT on ProvinceId
  ❌ "UAN" → doesn't recognize as "Universal Account Number" — a domain-specific field
  ❌ "TelNo" → infers phone but doesn't know it requires onkeypress numeric restriction
  ❌ "CellNoOne" → unusual naming, may not match phone pattern
  ❌ "User.firstname" → doesn't understand nested model binding
  ❌ "User.confirmpassword" → doesn't understand password confirmation pairing
  ❌ File upload field → not a database column at all, exists only in CSHTML
```

**Finding 03-003:** Column intelligence works well for simple, well-named columns (Email, Name, IsActive, DateOfBirth). It struggles with domain-specific fields (UAN, MRN), composite field behaviors (cascade chains, confirmation pairs), fields with unusual naming (CellNoOne, TelNo), and fields that exist only in the UI (file upload, confirm password). Approximately 60% of fields in the Organization.cshtml are correctly analyzed by column intelligence alone. The remaining 40% require CSHTML evidence or domain knowledge.

---

### 03-C: FK Resolver — Depth Analysis

Cross-referencing fk-resolver.ts (~500 lines) with Module 3 documentation and the Organization.cshtml analysis:

```
WHAT FK RESOLVER DOES:

1. EXPLICIT FK DETECTION
   Source: SQL DDL FOREIGN KEY constraints
   Confidence: 0.99
   Works: ✅

2. NAMING PATTERN FK DETECTION
   Source: Column names ending in "Id"
   Logic: "OrganizationTypeId" → look for table "OrganizationType" or "OrganizationTypes"
   Confidence: 0.75
   Works: ⚠️ Partial — depends on table being in uploaded schema

3. RESOLUTION STATUS
   Resolved: Referenced table found in uploaded schema
   Unresolved: Referenced table NOT found
   Missing Table: Table needs to be uploaded
   Works: ✅

4. CASCADE CHAIN DETECTION
   Source: CSHTML cascading dropdown evidence
   Logic: Country dropdown onChange triggers Province load, Province onChange triggers City load
   Confidence: 0.85
   Works: ⚠️ Only if CSHTML is parsed (not documented in Module 3)


WHAT FK RESOLVER DOES NOT DO:

❌ CARDINALITY DETECTION
   Every FK is assumed ONE_TO_MANY
   No detection of ONE_TO_ONE (FK with UNIQUE constraint)
   No detection of MANY_TO_MANY (junction table pattern)
   No detection of self-referencing (ParentId → same table)

❌ IMPLICIT RELATIONSHIP DETECTION
   Does not detect relationships without FK or *Id naming:
   - Tables with matching column names but no constraint
   - Cross-reference patterns
   - Shared lookup references

❌ CIRCULAR DEPENDENCY DETECTION
   Does not detect cycles:
   A.BId → B, B.CId → C, C.AId → A
   This would break Prisma schema generation

❌ FK RESOLUTION FEEDBACK
   When a FK references a missing table, the system flags it
   but does NOT:
   - Ask the user to upload the missing table
   - Suggest creating the missing table
   - Provide a template for the missing table
   - Track resolution status over time

❌ LOOKUP TABLE IDENTIFICATION
   Does not distinguish between:
   - Lookup tables (Countries, Genders — small, static)
   - Entity tables (Patients, Orders — large, dynamic)
   This distinction matters for UI: lookup → dropdown, entity → modal search

❌ FK IMPACT ON GENERATED CODE
   Does not feed into:
   - Prisma schema relations
   - API endpoint include/join configuration
   - Delete behavior (cascade vs restrict)
   - Form save order (parent before child)
```

**Finding 03-004:** FK Resolver handles the basic case (explicit FK → resolve → report status) well. It handles approximately 40% of the relationship intelligence needed. The missing 60% includes cardinality detection, junction table identification, circular dependency detection, lookup vs entity distinction, and code generation impact analysis. These missing capabilities directly affect Module 4 (Code Generation) and Module 2 (UI Intelligence).

---

### 03-D: ERD Generator Analysis

Cross-referencing erd-generator.ts with Module 3 documentation:

```
WHAT ERD GENERATOR DOES:
  ✅ Generates Mermaid syntax from tables and FK relationships
  ✅ Shows table names as nodes
  ✅ Shows FK relationships as edges

WHAT ERD GENERATOR DOES NOT DO:
  ❌ No column listing in diagram (tables shown as empty boxes)
  ❌ No cardinality notation (1:1, 1:N, N:M)
  ❌ No color coding by module
  ❌ No interactive zoom/pan
  ❌ No filtering by module/table
  ❌ No Graphviz DOT output (Module 7 claims this)
  ❌ No D3.js graph output
  ❌ No SVG/PNG export (only Mermaid text)
  ❌ No table grouping by module/schema
  ❌ No relationship labeling
```

**Finding 03-005:** The ERD generator produces valid Mermaid syntax which is renderable. However, the output is basic — table nodes connected by unlabeled edges. For a HIS system with 460+ tables, an ERD without module grouping, filtering, or search is unusable. The KnowledgeGraphViewer component (~650 lines) provides a richer visualization but builds its graph in-memory rather than from stored graph data, which limits scalability.

---

### 03-E: Module Matcher — Unique Capability Not Properly Documented

Cross-referencing module-matcher.ts and module-registry.ts:

```
WHAT MODULE MATCHER DOES:
  ✅ Maps table names to HIS module categories
  ✅ Uses pattern matching against module registry
  ✅ Assigns confidence scores
  ✅ Identifies HIS layer (ADT, Pharmacy, Lab, etc.)

HIS MODULE REGISTRY CONTAINS:
  Layer 1: ADT, Master Data
  Layer 2: Pharmacy, Laboratory
  Layer 3: Radiology, Emergency
  Layer 4: Operating Theater, ICU
  Layer 5: Billing, Inventory
  Layer 6: HR, Payroll
  Layer 7: Reports, Analytics

EXAMPLE MATCHING:
  "PatientRegistration" → ADT module, Layer 1
  "DrugDispensing" → Pharmacy module, Layer 2
  "LabResult" → Laboratory module, Layer 2
  "Organization" → Administration (Master Data), Layer 1
```

**Finding 03-006:** The module matcher is a genuinely unique and valuable capability specific to HIS. However, it is buried in Module 3 (Schema Intelligence) where it doesn't conceptually belong. Module matching is a business domain classification activity, not a schema analysis activity. It should either be its own sub-module or belong to Module 5 (Business Logic). Additionally, the module matcher's output (module name, layer, confidence) is not documented in Module 3's API actions table. This is an undocumented feature.

---

### 03-F: Normalization Analysis — Why It Cannot Work As Described

**Finding 03-007:** Module 3 claims 5 normalization actions (1NF through BCNF violation detection). Cross-referencing with database theory:

True normalization analysis requires knowledge of FUNCTIONAL DEPENDENCIES, which cannot be determined from schema alone. A functional dependency X → Y means that for every unique value of X, there is exactly one value of Y.

Example: In a table `Orders(OrderId, CustomerId, CustomerName)`:
- Schema shows three columns with data types
- 3NF violation exists because CustomerName depends on CustomerId, not on OrderId
- But you cannot detect this from schema alone — you need to know the SEMANTIC meaning that CustomerName belongs to the Customer entity

The column intelligence module CAN partially detect this because it would identify that `CustomerName` contains a table prefix (`Customer`) and `CustomerId` is a FK to `Customers`. So the heuristic approach works for well-named schemas but fails for:
- Schemas with inconsistent naming
- Denormalized by design (performance optimization)
- Legacy schemas with abbreviated column names
- Schemas where redundancy is intentional

**Recommendation:** Normalization analysis should be presented as "heuristic normalization hints" rather than "normalization analysis," with clear confidence scores indicating that schema-only analysis has inherent limitations.

---

### 03-G: Schema Comparison — Requires Version Infrastructure

**Finding 03-008:** Module 3 claims 4 schema comparison actions. Cross-referencing with the actual system:

Schema comparison requires two versions of the same schema. The current system has:
- `ToolkitProject` with no version field
- `project_versions` table exists in Prisma schema but has no evidence of being used
- No file diff mechanism
- No schema snapshot storage
- No migration generation capability

The schema comparison feature requires infrastructure (version storage, diff algorithm, migration generation) that does not exist. This is not a missing action — it is a missing capability stack.

---

### 03-H: Data Model — Relationship Interface Analysis

Module 3 defines:

```typescript
interface Relationship {
  id: string;
  name: string;
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
  cardinality: 'ONE_TO_ONE' | 'ONE_TO_MANY' | 'MANY_TO_MANY';
  onDelete: 'CASCADE' | 'SET_NULL' | 'NO_ACTION' | 'RESTRICT';
  onUpdate: 'CASCADE' | 'SET_NULL' | 'NO_ACTION' | 'RESTRICT';
  isIdentifying: boolean;
  isMandatory: boolean;
}
```

Cross-referencing with what the FK resolver actually produces and what downstream modules need:

```
INTERFACE HAS:               FK RESOLVER PRODUCES:
─────────────                ─────────────────────
id                           ❌ No ID generated
name                         ❌ No name generated
fromTable                    ✅ parentTable
fromColumn                   ✅ column
toTable                      ✅ referencedTable
toColumn                     ✅ referencedColumn
cardinality                  ❌ Always ONE_TO_MANY (hardcoded)
onDelete                     ❌ Not extracted
onUpdate                     ❌ Not extracted
isIdentifying                ❌ Not analyzed
isMandatory                  ❌ Not analyzed

DOWNSTREAM MODULES NEED:     INTERFACE PROVIDES:
─────────────────────────    ────────────────────
cascadeChain                  ❌ Not in interface
lookupTableFlag               ❌ Not in interface
detectionMethod               ❌ Not in interface
confidence                    ❌ Not in interface
isHierarchical                ❌ Not in interface
junctionTableInfo             ❌ Not in interface
circularDependencyFlag        ❌ Not in interface
uiComponentSuggestion         ❌ Not in interface
```

**Finding 03-009:** The Relationship interface has 11 properties. The FK resolver actually populates approximately 4 of them. Downstream modules (UI Intelligence, Code Generation) need at least 19 properties. The interface is simultaneously under-populated by its producer and under-specified for its consumers.

---

### 03-I: SchemaAnalysis Result — Cross-Reference with Actual Output

Module 3 defines:

```typescript
interface SchemaAnalysis {
  projectId: string;
  analyzedAt: Date;
  statistics: { totalTables, totalColumns, totalForeignKeys, totalIndexes, averageColumnsPerTable };
  relationships: Relationship[];
  issues: SchemaIssue[];
  suggestions: SchemaSuggestion[];
  conventions: NamingConvention[];
  normalizationLevel: 'UNNORMALIZED' | '1NF' | '2NF' | '3NF' | 'BCNF';
}
```

**Finding 03-010:** This interface is never populated as a complete object anywhere in the codebase. Cross-referencing:
- `statistics`: Could be computed from parsed data but no function does this aggregation
- `relationships`: FK resolver produces individual resolutions, not this array format
- `issues`: No SchemaIssue generator exists
- `suggestions`: No SchemaSuggestion generator exists
- `conventions`: No naming convention analyzer exists
- `normalizationLevel`: No normalization analyzer exists

The SchemaAnalysis interface is a design document, not a data contract backed by implementation. It describes the DESIRED output but nothing produces it.

---

## CROSS-MODULE FINDINGS: 02 ↔ 03

**Finding CROSS-005:** Module 2 and Module 3 have a critical circular dependency in their documentation. Module 2 says "Upstream: Schema Intelligence: Relationships, constraints." Module 3 says its output feeds Module 2. But the actual data transformation between Module 3's output format and Module 2's input requirements is undefined. Module 3 outputs individual FK resolutions and column intelligence records. Module 2 needs structured ScreenField configurations with lookup configs, cascade chains, and validation rules. No transformation function exists to convert one to the other.

**Finding CROSS-006:** Both modules independently implement field-to-UI-control mapping. Module 3 (column-intelligence.ts) maps columns to UI types. Module 2 (documented in field mapping table) also maps SQL types to UI controls. These two mapping systems use DIFFERENT type names and DIFFERENT logic. Module 3's column intelligence might say `uiType: "email_input"` while Module 2's UIControlType enum says `'email'`. This inconsistency means if both modules are used together, the field has two different UI type assignments.

**Finding CROSS-007:** Module 2 claims to handle 8 screen types. Module 3's column intelligence produces per-column UI suggestions. Neither module addresses HOW columns are assembled into screens. The gap is:
- Module 3 says: "This column should be an email input"
- Module 2 says: "This screen should have a create form"
- Neither says: "This email input should be in the second row, first column, of the Organization Information section, with a col-md-6 width"

Layout assembly — deciding WHERE on the screen each field goes — is documented in neither module. The CSHTML parser's layout extraction (row/column positions, section grouping) is the only source of layout information, and it is not referenced by either module.

**Finding CROSS-008:** Module 3 documents the ERD generator. Module 7 (Dependency Graph) also claims ERD visualization. Cross-referencing the two:
- Module 3: `generate-erd-documentation` action → ERD docs
- Module 7: `generate-erd-diagram` action → ERD diagram
- Module 7: `generate-mermaid-diagram` action → Mermaid code

There is overlap between Module 3 and Module 7 on ERD generation. The implementation has one erd-generator.ts that could belong to either module. The module boundary is unclear for graph/visualization features.

**Finding CROSS-009:** Both modules serve Module 4 (Code Generation) as upstream dependencies. Module 3 provides schema analysis, Module 2 provides screen blueprints. But their outputs are stored in DIFFERENT data structures with DIFFERENT keys. Module 3 stores results in `ColumnIntelligenceCache`, `FKDependencyCache`. Module 2 stores results in `UIScreenBlueprint`. Module 4 would need to query both caches independently, match records by table/column name, merge results, resolve conflicts, and then generate code. This merge operation is not documented or implemented anywhere. The Unified Data Bank (UnifiedFieldRecord) from the planning architecture was designed specifically to eliminate this problem by giving all modules a single shared record per field.

---

## ANALYSIS SUMMARY: MODULES 02 AND 03

| Finding ID | Module | Severity | Description |
|---|---|---|---|
| 02-001 | UI Intel | 🔴 Critical | ~3% implementation rate, 2 of 35+ actions working |
| 02-002 | UI Intel | 🔴 Critical | Blueprint generated but no builder consumes it |
| 02-003 | UI Intel | 🟠 High | All 8 screen types documented but none implemented as generators |
| 02-004 | UI Intel | 🟠 High | Field mapping covers 40% of real-world complexity |
| 02-005 | UI Intel | 🔴 Critical | ScreenBlueprint captures 30% of screen configuration needed |
| 02-006 | UI Intel | 🟠 High | ScreenField has 14 properties, needs 35+ |
| 02-007 | UI Intel | 🟡 Medium | UIControlType needs 35+ types, has 20 |
| 02-008 | UI Intel | 🔴 Critical | Data contracts with upstream modules incompatible |
| 02-009 | UI Intel | 🟠 High | Output insufficient for Code Generation consumption |
| 02-010 | UI Intel | 🟠 High | CSHTML parser integration would transform accuracy |
| 03-001 | Schema | 🔴 Critical | ~6-8% implementation rate, 3 of 38+ actions working |
| 03-002 | Schema | ✅ Strength | Column intelligence is the most mature component |
| 03-003 | Schema | 🟡 Medium | Column intel correct for 60% of fields, misses domain-specific |
| 03-004 | Schema | 🟠 High | FK resolver handles 40% of relationship intelligence needed |
| 03-005 | Schema | 🟡 Medium | ERD generator produces basic output, unusable at HIS scale |
| 03-006 | Schema | 🟡 Medium | Module matcher is valuable but misplaced and undocumented |
| 03-007 | Schema | 🟡 Medium | Normalization analysis cannot work as described from schema alone |
| 03-008 | Schema | 🟡 Medium | Schema comparison requires version infrastructure that doesn't exist |
| 03-009 | Schema | 🟠 High | Relationship interface under-populated by producer, under-specified for consumers |
| 03-010 | Schema | 🟠 High | SchemaAnalysis result object never fully populated |
| CROSS-005 | 02+03 | 🔴 Critical | No data transformation layer between Module 3 output and Module 2 input |
| CROSS-006 | 02+03 | 🟠 High | Duplicate field-to-UI mapping with different type systems |
| CROSS-007 | 02+03 | 🟠 High | Layout assembly (field positioning) not addressed by either module |
| CROSS-008 | 02+03 | 🟡 Medium | ERD generation overlap between Module 3 and Module 7 |
| CROSS-009 | 02+03 | 🔴 Critical | Outputs stored in separate caches with no merge mechanism for downstream use |

**Critical: 7 | High: 10 | Medium: 7 | Strength: 1**

---

## Module Summary

### Module 02 (UI Intelligence)
The weakest module in the platform. Produces a basic JSON blueprint that no downstream module can consume effectively. The field mapping is too coarse for real-world forms. The most valuable input source (CSHTML parser) is not connected. Approximately 3% implemented.

**Key Issue:** Blueprint generated but no builder consumes it.

### Module 03 (Schema Intelligence)
Has genuine value in column-intelligence.ts and fk-resolver.ts. These two files (~1,100 lines combined) represent the most mature intelligence capabilities in the platform. However, the remaining 80% of claimed features (naming conventions, normalization, index optimization, schema comparison) do not exist. The gap between documentation and implementation is severe but the foundation is real.

**Key Strength:** Column intelligence is the most mature component in the platform.

---

## Strategic Insight

Module 03's column intelligence + FK resolver + Module 01's CSHTML parser represent the three most valuable implemented capabilities. If Module 02 were redesigned to consume the Unified Data Bank enriched by these three sources instead of trying to independently generate UI specifications from scratch, the platform would leap from 3% to potentially 40-50% functional for screen generation.

---

*Analysis Complete: Modules 02 and 03*
*Next: Module 04 (Code Generation) and Module 05 (Business Logic) Analysis*
