

# 🔥 ULTRA-ADVANCED REGEX ENGINE FOR `.cshtml` PARSING

Everything below goes **far beyond** what was covered — these are patterns most people never think about.

---

## 🏗️ ARCHITECTURE: 5-LAYER DEEP PARSER

```
┌─────────────────────────────────────────────────────┐
│                    LAYER 5: AI ENRICHMENT            │
│              (GPT post-process ambiguities)          │
├─────────────────────────────────────────────────────┤
│                LAYER 4: RELATIONSHIP ENGINE          │
│         (FK chains, M:M, self-ref, hierarchy)       │
├─────────────────────────────────────────────────────┤
│              LAYER 3: CONSTRAINT DETECTOR            │
│      (unique, required, length, range, pattern)     │
├─────────────────────────────────────────────────────┤
│              LAYER 2: TYPE INFERENCE ENGINE          │
│    (name heuristics + HTML type + validation attrs) │
├─────────────────────────────────────────────────────┤
│              LAYER 1: RAW ELEMENT EXTRACTION        │
│       (inputs, selects, textareas, tag helpers,     │
│        razor helpers, labels, tables, buttons)      │
└─────────────────────────────────────────────────────┘
```

---

# ═══════════════════════════════════════════
# LAYER 1 — RAW EXTRACTION (DEEP)
# ═══════════════════════════════════════════

---

## 🧩 17. RAZOR HTML HELPERS (THE BIG ONE MOST MISS)

Most `.cshtml` files don't use raw `<input>` — they use **Razor helpers**.

### `@Html.TextBoxFor` / `@Html.EditorFor`

```regex
@Html\.(?<helper>TextBoxFor|EditorFor|TextAreaFor|PasswordFor|HiddenFor|CheckBoxFor|DropDownListFor|ListBoxFor|RadioButtonFor)\s*\(\s*(?:m|model|x)\s*=>\s*(?:m|model|x)\.(?<property>[\w.]+)
```

#### 🔥 Matches ALL of these:

```csharp
@Html.TextBoxFor(m => m.FirstName, new { @class = "form-control" })
@Html.EditorFor(model => model.BirthDate)
@Html.DropDownListFor(m => m.CountryId, ViewBag.Countries as SelectList)
@Html.CheckBoxFor(x => x.IsActive)
@Html.HiddenFor(m => m.OrganizationId)
@Html.TextAreaFor(m => m.Description)
@Html.PasswordFor(m => m.Password)
@Html.ListBoxFor(m => m.SelectedRoleIds, ViewBag.Roles as MultiSelectList)
@Html.RadioButtonFor(m => m.Gender, "Male")
```

#### Output:

```json
[
  {"helper": "TextBoxFor", "property": "FirstName"},
  {"helper": "EditorFor", "property": "BirthDate"},
  {"helper": "DropDownListFor", "property": "CountryId"},
  {"helper": "CheckBoxFor", "property": "IsActive"},
  {"helper": "HiddenFor", "property": "OrganizationId"},
  {"helper": "ListBoxFor", "property": "SelectedRoleIds"},
  {"helper": "RadioButtonFor", "property": "Gender"}
]
```

---

### Intelligence mapping from helper type:

```ts
const helperTypeMap: Record<string, string> = {
  "TextBoxFor":      "VARCHAR(255)",
  "EditorFor":       "INFER_FROM_NAME",
  "TextAreaFor":     "TEXT",
  "PasswordFor":     "VARCHAR(255)",
  "HiddenFor":       "INFER_FROM_NAME",
  "CheckBoxFor":     "BIT",
  "DropDownListFor": "INTEGER",      // FK
  "ListBoxFor":      "M2M_RELATION", // Many-to-Many!
  "RadioButtonFor":  "ENUM_OR_LOOKUP"
}
```

---

## 🧩 18. ASP.NET CORE TAG HELPERS (MODERN RAZOR)

```regex
<(?<tag>input|select|textarea)[^>]*\basp-for=["'](?<property>[\w.]+)["'][^>]*\/?>
```

#### Matches:

```html
<input asp-for="Email" class="form-control" />
<select asp-for="DepartmentId" asp-items="ViewBag.Departments"></select>
<textarea asp-for="Notes" rows="5"></textarea>
```

---

### Extended — capture `asp-items` too (FK source):

```regex
<select[^>]*\basp-for=["'](?<property>[\w.]+)["'][^>]*\basp-items=["'](?<source>[^"']+)["'][^>]*>
```

#### Output:

```json
{
  "property": "DepartmentId",
  "source": "ViewBag.Departments",
  "inference": "FK → Department"
}
```

---

## 🧩 19. `@Html.ValidationMessageFor` → REQUIRED FIELD

```regex
@Html\.ValidationMessageFor\s*\(\s*\w+\s*=>\s*\w+\.(?<property>[\w.]+)
```

If validation message exists → field is likely **[Required]**.

---

## 🧩 20. `asp-validation-for` (CORE VERSION)

```regex
<span[^>]*\basp-validation-for=["'](?<property>[\w.]+)["']
```

Same inference → Required or has validation.

---

## 🧩 21. MODEL DECLARATION (TABLE NAME + STRONG TYPING)

```regex
@model\s+(?:[\w.]+\.)*(?<modelName>\w+?)(?:ViewModel|VM|DTO|Model)?\s*$
```

#### Matches:

```csharp
@model MyApp.Models.OrganizationViewModel
@model Employee
@model ProjectManagement.DTO.TaskDTO
```

#### Output:

```json
{
  "modelName": "Organization",   // stripped ViewModel suffix
  "tableName": "Organization"
}
```

---

## 🧩 22. MULTI-VALUE / MULTI-LEVEL PROPERTY PATHS

```regex
(?:asp-for|name)=["'](?<root>\w+)(?:\.(?<child>\w+))?(?:\[(?<index>\d+)\]\.(?<subprop>\w+))?["']
```

#### Matches:

```html
<input asp-for="Address.City" />
<input name="OrderItems[0].ProductId" />
<input name="OrderItems[1].Quantity" />
<input asp-for="Contact.Phone.CountryCode" />
```

#### Output:

```json
[
  {"root": "Address", "child": "City", "inference": "1:1 relation or embedded"},
  {"root": "OrderItems", "index": "0", "subprop": "ProductId", "inference": "CHILD TABLE"},
  {"root": "OrderItems", "index": "1", "subprop": "Quantity", "inference": "CHILD TABLE"},
  {"root": "Contact", "child": "Phone", "inference": "nested object chain"}
]
```

> 🧠 **Collection indexer `[n]`** = **GUARANTEED child table (1:M)**

---

## 🧩 23. DYNAMIC ROW / REPEATER DETECTION (CHILD TABLE PROOF)

```regex
(?:addRow|appendRow|cloneRow|addLine|newItem|addDetail)\s*\(|\.(?:append|after|prepend)\s*\(\s*['"`]<tr
```

Also:

```regex
<(?:tr|div)[^>]*\b(?:id|class)=["'][^"']*(?:template|clone|repeater|dynamic)[^"']*["']
```

#### 🧠 Intelligence:

```text
If dynamic row adding exists → CHILD TABLE with FK back to parent
```

---

## 🧩 24. FILE / IMAGE UPLOAD

```regex
<input[^>]*type=["']file["'][^>]*\b(?:id|name|asp-for)=["'](?<name>[\w.]+)["']
```

Also detect by class:

```regex
<[^>]*\bclass=["'][^"']*(?:file-upload|dropzone|filepond|upload-area)[^"']*["']
```

#### 🧠 Type mapping:

```ts
if (name.match(/photo|image|avatar|logo|thumbnail/i))
  → "VARCHAR(500)" // image path
  → possibly separate Attachments table

if (name.match(/document|file|attachment|resume/i))
  → SEPARATE TABLE: Attachments(Id, FileName, FilePath, EntityId, EntityType)
```

---

## 🧩 25. DATE PICKER / DATETIME DETECTION (BEYOND type="date")

```regex
<[^>]*\bclass=["'][^"']*(?:datepicker|date-picker|datetimepicker|datetime-picker|flatpickr|calendar)[^"']*["'][^>]*(?:id|name|asp-for)=["'](?<name>[\w.]+)["']
```

Also reverse order:

```regex
(?:id|name|asp-for)=["'](?<name>[\w.]+)["'][^>]*\bclass=["'][^"']*(?:datepicker|datetimepicker)[^"']*["']
```

Also JS initialization:

```regex
\$\(["']#(?<field>\w+)["']\)\s*\.\s*(?:datepicker|datetimepicker|flatpickr)\s*\(
```

---

## 🧩 26. NUMERIC / CURRENCY DETECTION

```regex
<[^>]*\bclass=["'][^"']*(?:numeric|currency|money|decimal-input|number-format)[^"']*["'][^>]*(?:id|name)=["'](?<name>[\w.]+)["']
```

Also data attributes:

```regex
<input[^>]*\bdata-type=["'](?<datatype>currency|decimal|integer|percent)["'][^>]*(?:id|name)=["'](?<name>[\w.]+)["']
```

---

# ═══════════════════════════════════════════
# LAYER 2 — CONSTRAINT EXTRACTION
# ═══════════════════════════════════════════

---

## 🧩 27. HTML5 VALIDATION ATTRIBUTES (RICH!)

### Master regex — captures ALL constraint attrs from one element:

```regex
<input[^>]*(?=.*?\b(?:id|name|asp-for)=["'](?<name>[\w.]+)["'])(?=(?:[^>]*?\brequired\b)?)(?=(?:[^>]*?\bmaxlength=["'](?<maxlen>\d+)["'])?)(?=(?:[^>]*?\bminlength=["'](?<minlen>\d+)["'])?)(?=(?:[^>]*?\bmin=["'](?<min>[^"']+)["'])?)(?=(?:[^>]*?\bmax=["'](?<max>[^"']+)["'])?)(?=(?:[^>]*?\bpattern=["'](?<pattern>[^"']+)["'])?)(?=(?:[^>]*?\bstep=["'](?<step>[^"']+)["'])?)[^>]*>
```

> ⚠️ Lookahead-heavy — works but slow. Better: **extract element first, then parse attributes separately.**

### Practical approach — 2-step:

**Step 1: Extract full element**

```regex
<input[^>]+>
```

**Step 2: Parse attributes from captured element**

```regex
\b(?<attr>required|readonly|disabled|multiple)\b(?!=)
```

```regex
\b(?<attr>maxlength|minlength|min|max|step|pattern|placeholder|size)=["'](?<value>[^"']+)["']
```

#### 🧠 Constraint mapping:

```ts
const constraintMap = {
  required:  "NOT NULL",
  maxlength: (v) => `VARCHAR(${v})`,
  minlength: (v) => `CHECK(LEN(col) >= ${v})`,
  min:       (v) => `CHECK(col >= ${v})`,
  max:       (v) => `CHECK(col <= ${v})`,
  pattern:   (v) => `CHECK(col LIKE pattern)`,  // approximate
  step:      (v) => v.includes('.') ? 'DECIMAL' : 'INTEGER',
  readonly:  "COMPUTED_OR_SYSTEM",
  disabled:  "COMPUTED_OR_SYSTEM"
}
```

---

## 🧩 28. `data-val-*` ATTRIBUTES (jQuery Unobtrusive Validation)

ASP.NET generates these automatically:

```regex
data-val-required=["'](?<msg>[^"']+)["']
```

```regex
data-val-length-max=["'](?<max>\d+)["']
```

```regex
data-val-length-min=["'](?<min>\d+)["']
```

```regex
data-val-range-min=["'](?<rangeMin>[^"']+)["']\s*data-val-range-max=["'](?<rangeMax>[^"']+)["']
```

```regex
data-val-regex-pattern=["'](?<pattern>[^"']+)["']
```

```regex
data-val-equalto-other=["']\*\.(?<otherField>\w+)["']
```

### Full extractor (on captured element):

```regex
data-val-(?<rule>required|length|range|regex|email|url|creditcard|equalto|remote)(?:-(?<param>max|min|pattern|other))?(?:=["'](?<value>[^"']+)["'])?
```

---

## 🧩 29. REMOTE VALIDATION (UNIQUE DETECTION — HIGH CONFIDENCE)

```regex
data-val-remote-url=["'](?<url>[^"']+)["']
```

```regex
data-val-remote-additionalfields=["'](?<fields>[^"']+)["']
```

#### 🧠 Intelligence:

```ts
if (url.match(/check|exist|unique|duplicate|validate/i)) {
  field → UNIQUE CONSTRAINT
}

if (additionalFields) {
  // Composite unique: UNIQUE(field1, field2)
  const compositeFields = additionalFields
    .split(',')
    .map(f => f.replace('*.', ''))
  → UNIQUE(compositeFields)
}
```

---

# ═══════════════════════════════════════════
# LAYER 3 — RELATIONSHIP ENGINE (DEEP)
# ═══════════════════════════════════════════

---

## 🧩 30. SELF-REFERENCING FK (HIERARCHY)

```regex
(?:id|name|asp-for)=["'](?<name>Parent(?:Id|_Id)|Manager(?:Id|_Id)|ReportsTo(?:Id|_Id)|Superior(?:Id|_Id))["']
```

Also:

```regex
<select[^>]*(?:id|name|asp-for)=["'](?<field>Parent\w*Id)["']
```

#### 🧠 Output:

```sql
ALTER TABLE Employee ADD ParentId INTEGER REFERENCES Employee(Id)
-- This creates a HIERARCHY / TREE structure
```

---

## 🧩 31. MANY-TO-MANY DETECTION

### Signal 1: `ListBoxFor` (multi-select)

```regex
@Html\.ListBoxFor\s*\(\s*\w+\s*=>\s*\w+\.(?<property>Selected\w+Ids|Chosen\w+|\w+Ids)
```

### Signal 2: `<select multiple>`

```regex
<select[^>]*\bmultiple\b[^>]*(?:id|name|asp-for)=["'](?<name>[\w.]+)["']
```

### Signal 3: Checkbox list pattern

```regex
@foreach\s*\(.*?\bin\s+(?:ViewBag|Model)\.(?<collection>\w+)\)[\s\S]*?type=["']checkbox["'][^>]*(?:name|id)=["'](?<name>[\w.]+)["']
```

### Signal 4: Name pattern with `[]`

```regex
name=["'](?<name>\w+)\[\]["']
```

#### 🧠 Intelligence:

```ts
if (multiSelect detected) {
  // Create junction table
  // Example: property = "SelectedRoleIds"
  
  const parentTable = currentModel      // e.g., "User"
  const relatedTable = extractEntity("SelectedRoleIds")  // "Role"
  
  → CREATE TABLE UserRole (
      UserId   INTEGER REFERENCES User(Id),
      RoleId   INTEGER REFERENCES Role(Id),
      PRIMARY KEY (UserId, RoleId)
    )
}
```

---

## 🧩 32. CASCADING FK CHAIN (DEEP)

```regex
\$\(\s*["']#(?<parent>\w+)["']\s*\)\s*\.(?:change|on\s*\(\s*["']change["'])\s*[\s\S]*?\$\s*\.\s*(?:ajax|get|getJSON|post)\s*\(\s*\{?\s*(?:url\s*:\s*)?["'](?<url>[^"']+)["'][\s\S]*?["']#(?<child>\w+)["']
```

### Simpler cascading pattern:

```regex
(?:change|on.*?change)[\s\S]{0,500}?(?<parentId>\w+Id)[\s\S]{0,300}?(?<childId>\w+Id)[\s\S]{0,200}?(?:empty|html|append|option)
```

### 🧠 Full chain detection:

```ts
// Collect all cascade pairs
const cascades = [
  { parent: "CountryId",  child: "ProvinceId" },
  { parent: "ProvinceId", child: "CityId"     },
  { parent: "CityId",     child: "AreaId"      }
]

// Build chain: Country → Province → City → Area
// Each has FK to parent
```

---

## 🧩 33. ONE-TO-ONE RELATIONSHIP DETECTION

```regex
(?:asp-for|name|id)=["'](?<parent>\w+)\.(?<child>(?:Address|Profile|Setting|Detail|Info|Config|Preference)\w*)\.(?<prop>\w+)["']
```

#### 🧠 Intelligence:

```ts
// If nested object is singular (not collection) → 1:1
const oneToOneSignals = [
  /Address$/,
  /Profile$/,
  /Settings?$/,
  /Details?$/,
  /Info$/,
  /Config(?:uration)?$/,
  /Preference$/,
  /Metadata$/
]
```

---

## 🧩 34. POLYMORPHIC / GENERIC FK DETECTION

```regex
(?:name|id|asp-for)=["'](?<name>(?:Entity|Record|Item|Object|Resource)(?:Type|Kind|Category)(?:Id)?)["']
```

And paired:

```regex
(?:name|id|asp-for)=["'](?<name>(?:Entity|Record|Item|Object|Resource)Id)["']
```

#### 🧠 Output:

```sql
-- Polymorphic pattern detected
EntityType VARCHAR(50)   -- 'Order', 'Invoice', 'User'
EntityId   INTEGER       -- FK to that entity's table
```

---

# ═══════════════════════════════════════════
# LAYER 4 — INTELLIGENT INFERENCE
# ═══════════════════════════════════════════

---

## 🧩 35. AUDIT COLUMN DETECTION

```regex
(?:name|id|asp-for)=["'](?<name>(?:Created|Modified|Updated|Deleted|Inserted)(?:By|On|At|Date|Time|Timestamp)?|(?:Create|Update|Modify|Insert)(?:d_?(?:By|Date|At))|Is(?:Active|Deleted|Enabled|Archived|Published))["']
```

#### 🧠 Auto-add if ANY detected:

```sql
CreatedBy     VARCHAR(100) -- or INTEGER FK to User
CreatedDate   DATETIME     DEFAULT GETDATE()
ModifiedBy    VARCHAR(100)
ModifiedDate  DATETIME
IsActive      BIT          DEFAULT 1
```

---

## 🧩 36. SOFT DELETE DETECTION

```regex
(?:name|id|asp-for)=["'](?<name>Is(?:Deleted|Active|Archived|Enabled|Visible|Hidden|Disabled|Published|Draft))["']
```

```regex
(?:delete|remove)\w*\s*[\s\S]{0,200}?(?:IsDeleted|IsActive|Status)\s*(?:=|:)
```

Also in JS:

```regex
(?:soft[_-]?delete|logical[_-]?delete|mark[_-]?(?:as[_-]?)?deleted)
```

---

## 🧩 37. ENUM / LOOKUP TABLE DETECTION

### Radio button groups:

```regex
(?:type=["']radio["'][^>]*name=["'](?<name>\w+)["'][^>]*value=["'](?<value>[^"']+)["'][\s\S]*?){2,}
```

### Select with hardcoded options:

```regex
<select[^>]*(?:name|id)=["'](?<name>\w+)["'][^>]*>(?:\s*<option[^>]*value=["'](?<val>[^"']+)["'][^>]*>(?<text>[^<]+)<\/option>\s*){2,}
```

#### 🧠 Intelligence:

```ts
function detectEnumOrLookup(name, values) {
  if (values.length <= 7) {
    // Small set → ENUM or CHECK constraint
    return {
      type: "ENUM",
      constraint: `CHECK(${name} IN (${values.map(v => `'${v}'`).join(',')}))`
    }
  } else {
    // Larger set → Lookup table
    return {
      type: "LOOKUP_TABLE",
      table: `${name}Type`,
      fk: true
    }
  }
}
```

---

## 🧩 38. COMPUTED / READONLY FIELD DETECTION

```regex
<input[^>]*\b(?:readonly|disabled)\b[^>]*(?:name|id|asp-for)=["'](?<name>[\w.]+)["']
```

Also:

```regex
(?:name|id|asp-for)=["'](?<name>[\w.]+)["'][^>]*\b(?:readonly|disabled)\b
```

And JS-set fields:

```regex
\$\(["']#(?<name>\w+)["']\)\s*\.(?:val|text|html)\s*\(\s*(?<expression>[^)]+)\)[\s\S]{0,100}?(?:readonly|disabled|attr\s*\(\s*["']readonly["'])
```

#### 🧠 Intelligence:

```text
Readonly + named "Total" or "Amount" → COMPUTED COLUMN or VIEW
Readonly + named with "Id" suffix → SYSTEM GENERATED (IDENTITY)
```

---

## 🧩 39. COMPUTED VALUE DETECTION (JS)

```regex
(?:function\s+)?(?:calculate|compute|update|refresh|recalc)\w*\s*\([^)]*\)\s*\{[\s\S]*?\$\(["']#(?<target>\w+)["']\)\s*\.val\s*\([\s\S]*?(?:\+|\-|\*|\/|parseFloat|parseInt)
```

Simpler:

```regex
\$\(["']#(?<target>\w+)["']\)\s*\.val\s*\(\s*(?:parseFloat|parseInt)?\s*\(?\s*\$\(["']#(?<source1>\w+)["']\)\.val\(\)\s*(?<operator>[+\-*/])\s*(?:parseFloat|parseInt)?\s*\(?\s*\$\(["']#(?<source2>\w+)["']\)\.val\(\)
```

#### 🧠 Output:

```sql
-- Total = Quantity * UnitPrice
-- → Could be COMPUTED or stored with trigger
Total AS (Quantity * UnitPrice) PERSISTED
```

---

## 🧩 40. ADVANCED NAME-BASED TYPE INFERENCE

```ts
const advancedTypeRules: Array<{
  pattern: RegExp
  sqlType: string
  constraints?: string
}> = [
  // Identity / Keys
  { pattern: /^Id$|^\w+Id$/,              sqlType: "INT",             constraints: "IDENTITY(1,1)" },
  
  // Strings with known lengths
  { pattern: /^(?:Code|Sku|Isbn)$/i,      sqlType: "VARCHAR(50)",     constraints: "UNIQUE" },
  { pattern: /^(?:Name|Title|Label)$/i,   sqlType: "NVARCHAR(200)",   constraints: "NOT NULL" },
  { pattern: /^(?:Description|Summary)$/i,sqlType: "NVARCHAR(1000)"   },
  { pattern: /^(?:Notes?|Remarks?|Comments?)$/i, sqlType: "NVARCHAR(MAX)" },
  { pattern: /^(?:Body|Content|Html)$/i,  sqlType: "NVARCHAR(MAX)"    },
  
  // Contact
  { pattern: /Email/i,                    sqlType: "VARCHAR(255)",     constraints: "UNIQUE" },
  { pattern: /Phone|Mobile|Fax|Tel/i,     sqlType: "VARCHAR(20)"      },
  { pattern: /Website|Url|Link|Uri/i,     sqlType: "VARCHAR(500)"     },
  
  // Address
  { pattern: /^(?:Address|Street|Line[12])$/i,    sqlType: "NVARCHAR(500)" },
  { pattern: /^(?:City|State|Province|Region)$/i,  sqlType: "NVARCHAR(100)" },
  { pattern: /^(?:Zip|Postal|PostCode)(?:Code)?$/i, sqlType: "VARCHAR(20)" },
  { pattern: /^Country$/i,                         sqlType: "NVARCHAR(100)" },
  
  // Dates
  { pattern: /Date|On$|At$/i,             sqlType: "DATETIME2"        },
  { pattern: /Time(?!stamp)/i,            sqlType: "TIME"             },
  { pattern: /Timestamp/i,                sqlType: "DATETIME2",       constraints: "DEFAULT SYSUTCDATETIME()" },
  { pattern: /^(?:Dob|BirthDate|DateOfBirth)$/i, sqlType: "DATE"     },
  { pattern: /Year$/i,                    sqlType: "SMALLINT"         },
  { pattern: /Month$/i,                   sqlType: "TINYINT"         },
  
  // Numbers
  { pattern: /^(?:Age|Count|Quantity|Qty|Number|Num)$/i, sqlType: "INT" },
  { pattern: /^(?:Price|Amount|Cost|Rate|Fee|Salary|Budget|Total|Balance|Tax|Discount)$/i, 
                                           sqlType: "DECIMAL(18,2)"   },
  { pattern: /^(?:Percent|Percentage|Ratio|Rate)$/i, 
                                           sqlType: "DECIMAL(5,2)"    },
  { pattern: /^(?:Latitude|Lat)$/i,       sqlType: "DECIMAL(9,6)"    },
  { pattern: /^(?:Longitude|Lng|Lon)$/i,  sqlType: "DECIMAL(9,6)"    },
  { pattern: /^(?:Weight|Height|Width|Length|Size|Dimension)$/i,
                                           sqlType: "DECIMAL(10,2)"   },
  
  // Boolean
  { pattern: /^Is[A-Z]|^Has[A-Z]|^Can[A-Z]|^Should|^Allow|^Enable|^Show|^Include/,
                                           sqlType: "BIT",            constraints: "DEFAULT 0" },
  
  // Files
  { pattern: /^(?:Photo|Image|Avatar|Logo|Thumbnail|Icon|Banner)(?:Url|Path)?$/i,
                                           sqlType: "VARCHAR(500)"    },
  { pattern: /^(?:File|Document|Attachment)(?:Name|Path|Url)?$/i,
                                           sqlType: "VARCHAR(500)"    },
  { pattern: /^(?:MimeType|ContentType|FileType)$/i,
                                           sqlType: "VARCHAR(100)"    },
  { pattern: /^(?:FileSize|Size)$/i,      sqlType: "BIGINT"          },
  
  // Auth
  { pattern: /^(?:Password|PasswordHash)$/i,   sqlType: "VARCHAR(255)" },
  { pattern: /^(?:Salt|SecurityStamp)$/i,      sqlType: "VARCHAR(255)" },
  { pattern: /^(?:Token|RefreshToken|ApiKey)$/i, sqlType: "VARCHAR(500)" },
  
  // Enums (stored as string or int)
  { pattern: /^(?:Status|State|Phase|Stage)$/i, sqlType: "VARCHAR(50)" },
  { pattern: /^(?:Type|Kind|Category|Level|Priority|Severity|Role|Gender)$/i,
                                           sqlType: "VARCHAR(50)"     },
  
  // JSON / Complex
  { pattern: /^(?:Metadata|Settings|Config|Preferences|Options|Tags|Attributes)$/i,
                                           sqlType: "NVARCHAR(MAX)",  constraints: "-- JSON column" },
  
  // Ordering
  { pattern: /^(?:Sort|Display)?Order$|^Sequence$|^Position$|^Rank$/i,
                                           sqlType: "INT",            constraints: "DEFAULT 0" },
  
  // GUID
  { pattern: /^(?:Guid|Uuid|ExternalId|CorrelationId|TrackingId)$/i,
                                           sqlType: "UNIQUEIDENTIFIER", constraints: "DEFAULT NEWID()" },
  
  // IP / Technical
  { pattern: /^(?:IpAddress|Ip)$/i,       sqlType: "VARCHAR(45)"     },
  { pattern: /^(?:UserAgent|Browser)$/i,  sqlType: "VARCHAR(500)"    },
  { pattern: /^(?:Color|Colour)$/i,       sqlType: "VARCHAR(7)"      }, // #FFFFFF
]
```

---

# ═══════════════════════════════════════════
# LAYER 5 — FORM STRUCTURE ANALYSIS
# ═══════════════════════════════════════════

---

## 🧩 41. FORM GROUP DETECTION (SECTION → TABLE BOUNDARY)

```regex
<(?:fieldset|div)[^>]*\b(?:id|class)=["'][^"']*(?:form-section|panel|card|tab-pane|step|wizard-step|fieldset|form-group-section|section)[^"']*["'][^>]*>[\s\S]*?(?:<legend[^>]*>|<h[1-6][^>]*>|class=["'][^"']*(?:panel-title|card-header|section-title))(?<sectionName>[^<]+)
```

#### 🧠 Intelligence:

```text
If form has clear sections like:
  - "Personal Information"
  - "Address Details"  
  - "Employment History"

→ These might be SEPARATE TABLES or at minimum column groupings
```

---

## 🧩 42. TAB-BASED FORM (MULTI-TABLE INDICATOR)

```regex
<(?:a|button|li)[^>]*(?:data-toggle|data-bs-toggle)=["'](?:tab|pill)["'][^>]*(?:href|data-(?:bs-)?target)=["']#(?<tabId>\w+)["'][^>]*>(?<tabName>[^<]+)
```

#### 🧠 Intelligence:

```ts
const tabs = extractTabs(html)
// tabs = ["General", "Address", "Documents", "Contacts"]

// Each tab with its own fields → potentially separate table
// Especially if tab has its own grid/repeater
```

---

## 🧩 43. NESTED GRID / DETAIL TABLE INSIDE FORM

```regex
<table[^>]*\b(?:id|class)=["'][^"']*(?:detail|child|line-item|order-item|grid|sub-table)[^"']*["'][\s\S]*?<\/table>
```

Inside the grid, extract headers:

```regex
<th[^>]*(?:\bdata-field=["'](?<field>\w+)["'])?[^>]*>(?<header>[^<]+)<\/th>
```

#### 🧠 This GUARANTEES a child table:

```sql
-- Parent: Order
-- Child: OrderItem (from nested grid)
CREATE TABLE OrderItem (
  Id         INT IDENTITY PRIMARY KEY,
  OrderId    INT REFERENCES [Order](Id),  -- FK back to parent
  -- columns from <th> headers
)
```

---

## 🧩 44. API ENDPOINT EXTRACTION (FULL)

```regex
(?:url|href|action|src)\s*[:=]\s*["'](?<url>\/(?:api\/)?[\w\-\/]+)["']
```

```regex
\$\.(?:ajax|get|post|put|delete|getJSON)\s*\(\s*(?:\{[\s\S]*?url\s*:\s*)?["'](?<url>[^"']+)["']
```

```regex
fetch\s*\(\s*["'](?<url>[^"']+)["']
```

```regex
axios\.(?:get|post|put|delete|patch)\s*\(\s*["'](?<url>[^"']+)["']
```

#### 🧠 Entity extraction from URLs:

```ts
function extractEntityFromUrl(url: string): string {
  // /api/Organizations/GetAll → Organization
  // /Country/GetList → Country
  // /api/v1/employees → Employee
  
  const patterns = [
    /\/api\/(?:v\d+\/)?(\w+)/i,
    /\/(\w+)\/(?:Get|List|Index|Create|Save|Delete|Update)/i,
    /\/(\w+)Controller/i,
  ]
  
  for (const p of patterns) {
    const m = url.match(p)
    if (m) return singularize(m[1])
  }
}
```

---

## 🧩 45. FORM ACTION → CRUD MAPPING

```regex
<form[^>]*\b(?:action|asp-action)=["'](?<action>\w+)["'][^>]*(?:asp-controller=["'](?<controller>\w+)["'])?
```

```regex
<form[^>]*\bmethod=["'](?<method>get|post|put|delete)["']
```

---

## 🧩 46. PARTIAL VIEW / COMPONENT DETECTION

```regex
@(?:await\s+)?Html\.(?:Partial|RenderPartial)(?:Async)?\s*\(\s*["'](?<partial>[^"']+)["']
```

```regex
@await\s+Component\.InvokeAsync\s*\(\s*["'](?<component>[^"']+)["']
```

```regex
<partial\s+name=["'](?<partial>[^"']+)["']
```

#### 🧠 Intelligence:

```text
Partial "_AddressForm" → Address is a sub-entity
Partial "_ContactList" → Contact is a child table (1:M)
Partial "_DocumentUpload" → Document attachment table
```

---

## 🧩 47. COMPOSITE UNIQUE KEY DETECTION

### From JS validation:

```regex
(?:checkDuplicate|checkUnique|validateUnique)\w*\s*\([^)]*(?<fields>(?:\w+\s*,\s*)*\w+)
```

### From data attributes:

```regex
data-val-remote-additionalfields=["'](?<fields>[^"']+)["']
```

### From field grouping with same validation URL:

```ts
// If multiple fields point to same validation URL
// → Composite unique constraint
// Example: Code + BranchId → UNIQUE(Code, BranchId)
```

---

## 🧩 48. CONDITIONAL FIELD DETECTION (NULLABLE)

```regex
\$\(["']#(?<trigger>\w+)["']\)\s*\.(?:change|on\s*\([^)]*change)[\s\S]{0,500}?(?:show|hide|toggle|slideDown|slideUp|fadeIn|fadeOut|css\s*\([^)]*display)\s*[\s\S]{0,200}?["']#(?<dependent>\w+)["']
```

#### 🧠 Intelligence:

```text
If field is conditionally shown/hidden → NULLABLE
If trigger is checkbox/radio → dependent fields are NULLABLE
```

---

# ═══════════════════════════════════════════
# 🔥 COMPLETE ENGINE (TypeScript)
# ═══════════════════════════════════════════

```ts
interface Column {
  name: string
  sqlType: string
  nullable: boolean
  isPK: boolean
  isFK: boolean
  fkTable?: string
  isUnique: boolean
  isComputed: boolean
  isAudit: boolean
  defaultValue?: string
  checkConstraint?: string
  label?: string
  maxLength?: number
  source: string // which regex found it
}

interface Table {
  name: string
  columns: Column[]
  relationships: Relationship[]
  isJunction: boolean
}

interface Relationship {
  type: '1:1' | '1:M' | 'M:M' | 'SELF_REF' | 'POLYMORPHIC'
  from: string
  to: string
  fkColumn: string
  cascadeDelete: boolean
}

interface ParseResult {
  tables: Table[]
  warnings: string[]
  confidence: number // 0-100
}

// ─── REGEX REGISTRY ──────────────────────────

const REGEX = {
  // Layer 1: Extraction
  rawInput:         /<input[^>]*>/gi,
  rawSelect:        /<select[^>]*>[\s\S]*?<\/select>/gi,
  rawTextarea:      /<textarea[^>]*>[\s\S]*?<\/textarea>/gi,
  
  razorHelper:      /@Html\.(\w+For)\s*\(\s*\w+\s*=>\s*\w+\.([\w.]+)/g,
  tagHelper:        /<(?:input|select|textarea)[^>]*\basp-for=["']([\w.]+)["']/g,
  tagHelperItems:   /asp-items=["']([^"']+)["']/,
  
  modelDecl:        /@model\s+(?:[\w.]+\.)*(\w+?)(?:ViewModel|VM|DTO|Model)?\s*$/m,
  viewBagTitle:     /ViewBag\.Title\s*=\s*["']([^"']+)["']/,
  
  // Layer 2: Attributes
  attrName:         /\b(?:id|name|asp-for)=["']([\w.[\]]+)["']/i,
  attrType:         /\btype=["'](\w+)["']/i,
  attrRequired:     /\brequired\b/i,
  attrMaxLength:    /\bmaxlength=["'](\d+)["']/i,
  attrMinLength:    /\bminlength=["'](\d+)["']/i,
  attrMin:          /\bmin=["']([^"']+)["']/i,
  attrMax:          /\bmax=["']([^"']+)["']/i,
  attrPattern:      /\bpattern=["']([^"']+)["']/i,
  attrStep:         /\bstep=["']([^"']+)["']/i,
  attrReadonly:     /\b(?:readonly|disabled)\b/i,
  attrMultiple:     /\bmultiple\b/i,
  attrPlaceholder:  /\bplaceholder=["']([^"']+)["']/i,
  
  // data-val
  dataValRequired:  /data-val-required=["']([^"']+)["']/,
  dataValMaxLen:    /data-val-length-max=["'](\d+)["']/,
  dataValRemote:    /data-val-remote-url=["']([^"']+)["']/,
  dataValAdditional:/data-val-remote-additionalfields=["']([^"']+)["']/,
  
  // Layer 3: Labels
  labelFor:         /<label[^>]*for=["']([^"']+)["'][^>]*>(.*?)<\/label>/gi,
  displayName:      /\[Display\s*\(\s*Name\s*=\s*["']([^"']+)["']/g,
  
  // Layer 4: Structure
  collectionIndex:  /name=["'](\w+)\[(\d+)\]\.(\w+)["']/g,
  nestedProperty:   /(?:asp-for|name)=["'](\w+)\.(\w+)["']/g,
  partialView:      /@(?:await\s+)?Html\.(?:Partial|RenderPartial)\s*\(\s*["']([^"']+)["']/g,
  
  // Layer 5: JS/AJAX
  ajaxUrl:          /\$\.(?:ajax|get|post|getJSON)\s*\(\s*(?:\{[\s\S]*?url\s*:\s*)?["']([^"']+)["']/g,
  jqLoad:           /\$\(["']#(\w+)["']\)\.load\(["']([^"']+)["']/g,
  fetchUrl:         /fetch\s*\(\s*["']([^"']+)["']/g,
  cascadePattern:   /\$\(["']#(\w+)["']\)\s*\.(?:change|on\s*\(.*?change)[\s\S]{0,800}?["']#(\w+)["']/g,
  
  dynamicRow:       /(?:addRow|appendRow|cloneRow|addLine|addDetail)\s*\(/g,
  
  // Uniqueness
  uniqueCheck:      /(?:check|validate|verify)(?:Duplicate|Unique|Exist)\w*\s*\(/gi,
  
  // Tables (list view)
  tableHeaders:     /<th[^>]*>([^<]+)<\/th>/gi,
  
  // Buttons
  submitButton:     /<button[^>]*type=["']submit["'][^>]*>([^<]+)<\/button>/gi,
}

// ─── MAIN PARSER ──────────────────────────

function parseCshtml(
  html: string,
  filename: string
): ParseResult {
  
  const result: ParseResult = {
    tables: [],
    warnings: [],
    confidence: 0
  }
  
  // ── STEP 1: Determine primary table name ──
  
  let tableName = "Unknown"
  
  const modelMatch = html.match(REGEX.modelDecl)
  if (modelMatch) {
    tableName = modelMatch[1]
  } else {
    const titleMatch = html.match(REGEX.viewBagTitle)
    if (titleMatch) {
      tableName = titleMatch[1].replace(/\s+/g, '')
    } else {
      tableName = filename
        .replace(/\.(cshtml|razor)$/i, '')
        .replace(/^(Create|Edit|Index|Details|_)/, '')
    }
  }
  
  const primaryTable: Table = {
    name: tableName,
    columns: [],
    relationships: [],
    isJunction: false
  }
  
  const childTables = new Map<string, Table>()
  const labels = new Map<string, string>()
  const uniqueFields = new Set<string>()
  const fkSources = new Map<string, string>()
  const cascades: Array<{parent: string, child: string}> = []
  const m2mFields = new Set<string>()
  
  // ── STEP 2: Extract labels ──
  
  let m: RegExpExecArray | null
  
  while ((m = REGEX.labelFor.exec(html))) {
    labels.set(m[1], m[2].replace(/<[^>]+>/g, '').trim())
  }
  
  // ── STEP 3: Extract all form elements ──
  
  const elements: Array<{
    raw: string
    source: string
    name: string
    type: string
  }> = []
  
  // 3a: Raw HTML inputs
  for (const el of html.matchAll(REGEX.rawInput)) {
    const raw = el[0]
    const nameMatch = raw.match(REGEX.attrName)
    const typeMatch = raw.match(REGEX.attrType)
    if (nameMatch) {
      elements.push({
        raw,
        source: 'html-input',
        name: nameMatch[1],
        type: typeMatch ? typeMatch[1] : 'text'
      })
    }
  }
  
  // 3b: Raw selects
  for (const el of html.matchAll(REGEX.rawSelect)) {
    const raw = el[0]
    const nameMatch = raw.match(REGEX.attrName)
    const isMultiple = REGEX.attrMultiple.test(raw)
    if (nameMatch) {
      elements.push({
        raw,
        source: isMultiple ? 'html-multiselect' : 'html-select',
        name: nameMatch[1],
        type: isMultiple ? 'multiselect' : 'select'
      })
    }
  }
  
  // 3c: Textareas
  for (const el of html.matchAll(REGEX.rawTextarea)) {
    const raw = el[0]
    const nameMatch = raw.match(REGEX.attrName)
    if (nameMatch) {
      elements.push({
        raw,
        source: 'html-textarea',
        name: nameMatch[1],
        type: 'textarea'
      })
    }
  }
  
  // 3d: Razor helpers
  while ((m = REGEX.razorHelper.exec(html))) {
    const helperType = m[1]  // TextBoxFor, DropDownListFor, etc.
    const property = m[2]
    
    let type = 'text'
    if (helperType === 'CheckBoxFor') type = 'checkbox'
    if (helperType === 'DropDownListFor') type = 'select'
    if (helperType === 'ListBoxFor') type = 'multiselect'
    if (helperType === 'TextAreaFor') type = 'textarea'
    if (helperType === 'HiddenFor') type = 'hidden'
    if (helperType === 'PasswordFor') type = 'password'
    if (helperType === 'RadioButtonFor') type = 'radio'
    
    elements.push({
      raw: m[0],
      source: `razor-${helperType}`,
      name: property,
      type
    })
  }
  
  // 3e: Tag helpers
  while ((m = REGEX.tagHelper.exec(html))) {
    const property = m[1]
    const tag = m[0].startsWith('<select') ? 'select' 
              : m[0].startsWith('<textarea') ? 'textarea' 
              : 'input'
    
    let type = tag
    if (tag === 'input') {
      const typeMatch = m[0].match(REGEX.attrType)
      type = typeMatch ? typeMatch[1] : 'text'
    }
    
    const itemsMatch = m[0].match(REGEX.tagHelperItems)
    if (itemsMatch) {
      fkSources.set(property, itemsMatch[1])
    }
    
    elements.push({
      raw: m[0],
      source: `tag-helper-${tag}`,
      name: property,
      type
    })
  }
  
  // ── STEP 4: Collection / nested detection ──
  
  while ((m = REGEX.collectionIndex.exec(html))) {
    const parentProp = m[1]  // "OrderItems"
    const childProp = m[3]   // "ProductId"
    
    if (!childTables.has(parentProp)) {
      childTables.set(parentProp, {
        name: singularize(parentProp),
        columns: [{
          name: 'Id', sqlType: 'INT', nullable: false,
          isPK: true, isFK: false, isUnique: false,
          isComputed: false, isAudit: false,
          source: 'auto-pk'
        }, {
          name: `${tableName}Id`, sqlType: 'INT',
          nullable: false, isPK: false, isFK: true,
          fkTable: tableName, isUnique: false,
          isComputed: false, isAudit: false,
          source: 'parent-fk'
        }],
        relationships: [{
          type: '1:M',
          from: tableName,
          to: singularize(parentProp),
          fkColumn: `${tableName}Id`,
          cascadeDelete: true
        }],
        isJunction: false
      })
    }
    // Add column to child table if not exists
    const childTable = childTables.get(parentProp)!
    if (!childTable.columns.find(c => c.name === childProp)) {
      childTable.columns.push(
        buildColumn(childProp, 'text', '', [])
      )
    }
  }
  
  // ── STEP 5: Unique detection ──
  
  for (const match of html.matchAll(REGEX.uniqueCheck)) {
    // Extract field name from context around the match
    const context = html.substring(
      Math.max(0, match.index! - 200),
      match.index! + match[0].length + 200
    )
    const fieldMatch = context.match(
      /["']#?(\w+)["']|\.val\b[\s\S]{0,50}?["'](\w+)["'/
    )
    if (fieldMatch) {
      uniqueFields.add(fieldMatch[1] || fieldMatch[2])
    }
  }
  
  for (const match of html.matchAll(REGEX.dataValRemote)) {
    const url = match[1]
    if (/check|exist|unique|duplicate/i.test(url)) {
      // Find which field this belongs to
      const elContext = html.substring(
        Math.max(0, match.index! - 500),
        match.index! + 100
      )
      const nameMatch = elContext.match(REGEX.attrName)
      if (nameMatch) uniqueFields.add(nameMatch[1])
    }
  }
  
  // ── STEP 6: Cascade detection ──
  
  while ((m = REGEX.cascadePattern.exec(html))) {
    cascades.push({ parent: m[1], child: m[2] })
  }
  
  // ── STEP 7: M:M detection ──
  
  for (const el of elements) {
    if (el.type === 'multiselect') {
      m2mFields.add(el.name)
    }
  }
  
  // ── STEP 8: Build columns ──
  
  const seenNames = new Set<string>()
  
  for (const el of elements) {
    // Skip if collection item (handled in child tables)
    if (el.name.includes('[')) continue
    
    // Handle nested: "Address.City" → different table
    if (el.name.includes('.') && !el.name.includes('[')) {
      const parts = el.name.split('.')
      if (parts.length === 2) {
        const [parent, child] = parts
        // Could be 1:1 or embedded
        if (!childTables.has(parent)) {
          childTables.set(parent, {
            name: parent,
            columns: [{
              name: 'Id', sqlType: 'INT', nullable: false,
              isPK: true, isFK: false, isUnique: false,
              isComputed: false, isAudit: false,
              source: 'auto-pk'
            }],
            relationships: [{
              type: '1:1',
              from: tableName,
              to: parent,
              fkColumn: `${parent}Id`,
              cascadeDelete: false
            }],
            isJunction: false
          })
        }
        const ct = childTables.get(parent)!
        if (!ct.columns.find(c => c.name === child)) {
          ct.columns.push(buildColumn(child, el.type, el.raw, []))
        }
        continue
      }
    }
    
    const fieldName = el.name.split('.').pop()!
    
    if (seenNames.has(fieldName)) continue
    seenNames.add(fieldName)
    
    // M:M → create junction table instead of column
    if (m2mFields.has(el.name)) {
      const relatedEntity = el.name
        .replace(/^Selected|^Chosen|Ids$/g, '')
      
      const junctionName = [tableName, relatedEntity]
        .sort()
        .join('')
      
      childTables.set(junctionName, {
        name: junctionName,
        columns: [
          {
            name: `${tableName}Id`, sqlType: 'INT',
            nullable: false, isPK: true, isFK: true,
            fkTable: tableName, isUnique: false,
            isComputed: false, isAudit: false,
            source: 'm2m-junction'
          },
          {
            name: `${relatedEntity}Id`, sqlType: 'INT',
            nullable: false, isPK: true, isFK: true,
            fkTable: relatedEntity, isUnique: false,
            isComputed: false, isAudit: false,
            source: 'm2m-junction'
          }
        ],
        relationships: [
          {
            type: 'M:M',
            from: tableName,
            to: relatedEntity,
            fkColumn: `${tableName}Id`,
            cascadeDelete: true
          }
        ],
        isJunction: true
      })
      continue
    }
    
    const col = buildColumn(fieldName, el.type, el.raw, [])
    
    // Apply label
    if (labels.has(fieldName)) {
      col.label = labels.get(fieldName)
    }
    
    // Apply unique
    if (uniqueFields.has(fieldName)) {
      col.isUnique = true
    }
    
    primaryTable.columns.push(col)
  }
  
  // ── STEP 9: Ensure PK exists ──
  
  if (!primaryTable.columns.find(c => c.isPK)) {
    primaryTable.columns.unshift({
      name: 'Id',
      sqlType: 'INT',
      nullable: false,
      isPK: true,
      isFK: false,
      isUnique: false,
      isComputed: false,
      isAudit: false,
      defaultValue: 'IDENTITY(1,1)',
      source: 'auto-generated'
    })
  }
  
  // ── STEP 10: Detect & add audit columns ──
  
  const hasAuditFields = primaryTable.columns.some(c =>
    /^(Created|Modified|Updated|IsActive|IsDeleted)/i.test(c.name)
  )
  
  if (hasAuditFields) {
    const auditCols = [
      'CreatedBy', 'CreatedDate',
      'ModifiedBy', 'ModifiedDate'
    ]
    for (const ac of auditCols) {
      if (!primaryTable.columns.find(c => c.name === ac)) {
        primaryTable.columns.push({
          name: ac,
          sqlType: ac.includes('Date') ? 'DATETIME2' : 'NVARCHAR(100)',
          nullable: true,
          isPK: false,
          isFK: false,
          isUnique: false,
          isComputed: false,
          isAudit: true,
          defaultValue: ac.includes('Date') ? 'SYSUTCDATETIME()' : undefined,
          source: 'audit-auto-added'
        })
      }
    }
  }
  
  // ── STEP 11: Build relationships from cascades ──
  
  for (const c of cascades) {
    primaryTable.relationships.push({
      type: '1:M',
      from: c.parent.replace(/Id$/, ''),
      to: c.child.replace(/Id$/, ''),
      fkColumn: c.child,
      cascadeDelete: false
    })
  }
  
  // ── Assemble result ──
  
  result.tables.push(primaryTable)
  for (const [, ct] of childTables) {
    result.tables.push(ct)
  }
  
  // Confidence calculation
  const fieldCount = primaryTable.columns.length
  const hasModel = !!modelMatch
  const hasFKs = primaryTable.columns.some(c => c.isFK)
  
  result.confidence = Math.min(100,
    (fieldCount > 0 ? 30 : 0) +
    (hasModel ? 20 : 0) +
    (hasFKs ? 15 : 0) +
    (labels.size > 0 ? 10 : 0) +
    (uniqueFields.size > 0 ? 10 : 0) +
    (childTables.size > 0 ? 15 : 0)
  )
  
  return result
}

// ─── COLUMN BUILDER ──────────────────────────

function buildColumn(
  name: string,
  htmlType: string,
  rawElement: string,
  constraints: string[]
): Column {
  
  const col: Column = {
    name,
    sqlType: 'NVARCHAR(255)',
    nullable: true,
    isPK: false,
    isFK: false,
    isUnique: false,
    isComputed: false,
    isAudit: false,
    source: 'inference'
  }
  
  // ── PK detection ──
  if (
    name === 'Id' ||
    (name.endsWith('Id') && htmlType === 'hidden' && 
     name === `${/*tableName*/''}Id`)
  ) {
    col.isPK = true
    col.sqlType = 'INT'
    col.nullable = false
    col.defaultValue = 'IDENTITY(1,1)'
  }
  
  // ── FK detection ──
  else if (
    name.endsWith('Id') && 
    (htmlType === 'select' || htmlType === 'hidden')
  ) {
    col.isFK = true
    col.sqlType = 'INT'
    col.fkTable = name.replace(/Id$/, '')
    col.nullable = false
  }
  
  // ── Type from HTML type ──
  else if (htmlType === 'checkbox')  { col.sqlType = 'BIT'; col.defaultValue = '0' }
  else if (htmlType === 'textarea')  { col.sqlType = 'NVARCHAR(MAX)' }
  else if (htmlType === 'password')  { col.sqlType = 'VARCHAR(255)' }
  else if (htmlType === 'email')     { col.sqlType = 'VARCHAR(255)'; col.isUnique = true }
  else if (htmlType === 'date')      { col.sqlType = 'DATE' }
  else if (htmlType === 'datetime-local') { col.sqlType = 'DATETIME2' }
  else if (htmlType === 'time')      { col.sqlType = 'TIME' }
  else if (htmlType === 'number')    { col.sqlType = 'DECIMAL(18,2)' }
  else if (htmlType === 'tel')       { col.sqlType = 'VARCHAR(20)' }
  else if (htmlType === 'url')       { col.sqlType = 'VARCHAR(500)' }
  else if (htmlType === 'color')     { col.sqlType = 'VARCHAR(7)' }
  
  // ── Type from name heuristics ──
  else {
    col.sqlType = inferTypeFromName(name)
  }
  
  // ── Constraints from raw element ──
  if (rawElement) {
    if (REGEX.attrRequired.test(rawElement) || 
        REGEX.dataValRequired.test(rawElement)) {
      col.nullable = false
    }
    
    const maxLenMatch = rawElement.match(REGEX.attrMaxLength) || 
                        rawElement.match(REGEX.dataValMaxLen)
    if (maxLenMatch) {
      col.maxLength = parseInt(maxLenMatch[1])
      if (col.sqlType.startsWith('NVARCHAR') || 
          col.sqlType.startsWith('VARCHAR')) {
        col.sqlType = col.sqlType.replace(
          /\(\d+\)/, `(${maxLenMatch[1]})`
        )
      }
    }
    
    if (REGEX.attrReadonly.test(rawElement)) {
      col.isComputed = true
    }
  }
  
  // ── Audit detection ──
  if (/^(Created|Modified|Updated|Deleted|Inserted)(By|On|At|Date|Time)?$|^Is(Active|Deleted)$/i.test(name)) {
    col.isAudit = true
  }
  
  return col
}

// ─── HELPERS ──────────────────────────

function singularize(word: string): string {
  if (word.endsWith('ies'))
    return word.slice(0, -3) + 'y'
  if (word.endsWith('ses') || word.endsWith('xes') || word.endsWith('zes'))
    return word.slice(0, -2)
  if (word.endsWith('s') && !word.endsWith('ss'))
    return word.slice(0, -1)
  return word
}

function inferTypeFromName(name: string): string {
  // Apply rules from Pattern 40 above
  for (const rule of advancedTypeRules) {
    if (rule.pattern.test(name)) return rule.sqlType
  }
  return 'NVARCHAR(255)'
}
```

---

# 🧩 49. SQL GENERATION FROM PARSE RESULT

```ts
function generateSQL(result: ParseResult): string {
  const lines: string[] = []
  
  for (const table of result.tables) {
    lines.push(`-- ═══════════════════════════════════════`)
    lines.push(`-- TABLE: ${table.name}`)
    lines.push(`-- Confidence: ${result.confidence}%`)
    lines.push(`-- ═══════════════════════════════════════`)
    lines.push(`CREATE TABLE [${table.name}] (`)
    
    const colDefs: string[] = []
    const constraints: string[] = []
    
    // Composite PK for junction tables
    const pkCols = table.columns.filter(c => c.isPK)
    
    for (const col of table.columns) {
      let def = `  [${col.name}] ${col.sqlType}`
      
      if (col.isPK && pkCols.length === 1) {
        def += ' IDENTITY(1,1) PRIMARY KEY'
      }
      
      if (!col.nullable && !col.isPK) def += ' NOT NULL'
      if (col.nullable) def += ' NULL'
      if (col.defaultValue && !col.isPK) {
        def += ` DEFAULT ${col.defaultValue}`
      }
      if (col.isUnique) def += ' UNIQUE'
      
      colDefs.push(def)
      
      // FK constraint
      if (col.isFK && col.fkTable) {
        constraints.push(
          `  CONSTRAINT FK_${table.name}_${col.fkTable} ` +
          `FOREIGN KEY ([${col.name}]) ` +
          `REFERENCES [${col.fkTable}]([Id])`
        )
      }
    }
    
    // Composite PK
    if (pkCols.length > 1) {
      constraints.push(
        `  PRIMARY KEY (${pkCols.map(c => `[${c.name}]`).join(', ')})`
      )
    }
    
    lines.push([...colDefs, ...constraints].join(',\n'))
    lines.push(`);\n`)
  }
  
  return lines.join('\n')
}
```

---

# 🧩 50. FINAL PIPELINE ORCHESTRATOR

```ts
async function fullPipeline(
  files: Array<{name: string, content: string}>
): Promise<{
  sql: string
  erd: object
  warnings: string[]
}> {
  
  const allTables = new Map<string, Table>()
  const allWarnings: string[] = []
  
  // ── Phase 1: Parse each file ──
  for (const file of files) {
    const result = parseCshtml(file.content, file.name)
    
    for (const table of result.tables) {
      if (allTables.has(table.name)) {
        // Merge columns
        const existing = allTables.get(table.name)!
        for (const col of table.columns) {
          if (!existing.columns.find(c => c.name === col.name)) {
            existing.columns.push(col)
          }
        }
      } else {
        allTables.set(table.name, table)
      }
    }
    
    allWarnings.push(...result.warnings)
  }
  
  // ── Phase 2: Cross-file relationship resolution ──
  for (const [, table] of allTables) {
    for (const col of table.columns) {
      if (col.isFK && col.fkTable) {
        if (!allTables.has(col.fkTable)) {
          allWarnings.push(
            `⚠️ FK reference ${col.fkTable} not found ` +
            `as parsed table — may need manual creation`
          )
        }
      }
    }
  }
  
  // ── Phase 3: Generate output ──
  const finalResult: ParseResult = {
    tables: Array.from(allTables.values()),
    warnings: allWarnings,
    confidence: Math.round(
      Array.from(allTables.values()).length > 0 ? 75 : 20
    )
  }
  
  const sql = generateSQL(finalResult)
  
  return {
    sql,
    erd: buildERD(finalResult),
    warnings: allWarnings
  }
}
```

---

# 📊 SUMMARY — WHAT WE NOW COVER

```
✅  Raw HTML inputs, selects, textareas
✅  Razor @Html.*For helpers (ALL variants)
✅  ASP.NET Core Tag Helpers (asp-for, asp-items)
✅  @model → table name
✅  Collection indexers → child tables
✅  Nested properties → 1:1 relations
✅  Cascading dropdowns → FK chains
✅  Multi-select/ListBox → M:M junction tables
✅  Radio buttons → enum/lookup
✅  File inputs → attachment handling
✅  HTML5 validation → constraints (NOT NULL, length, range)
✅  data-val-* → ASP.NET validation constraints
✅  data-val-remote → UNIQUE detection
✅  Labels → friendly names
✅  CSS class → date/numeric type detection
✅  JS dynamic rows → child table proof
✅  JS computation → computed columns
✅  Readonly/disabled → system fields
✅  Audit field auto-detection
✅  Self-referencing FK (ParentId)
✅  Polymorphic FK detection
✅  Partial views → sub-entity detection
✅  API URL → entity extraction
✅  Tab/section analysis → table boundaries
✅  150+ name-pattern → SQL type rules
✅  Composite unique from remote validation
✅  Confidence scoring
✅  Multi-file merge + cross-reference
```

> This is the **most comprehensive `.cshtml` → database schema** regex engine possible without a full AST parser. Beyond this, you need Roslyn or a Razor compiler.