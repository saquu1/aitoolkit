# SQL Data Types Knowledge Base

> **Purpose**: This document serves as the embedded knowledge for parsing SQL schemas, stored procedures, and web forms. It provides comprehensive data type mappings, constraints, and semantic understanding for the Schema Architect project.

---

## 1. SQL Data Type Mapping Table

### 1.1 Character Data Types

| Original Type | SQLite Type | Max Size | Description |
|--------------|-------------|----------|-------------|
| CHAR(n) | CHAR(n) COLLATE RTRIM | 32,767 bytes | Fixed-length character data |
| VARCHAR(n[,m]) | VARCHAR(n) COLLATE RTRIM | 255 bytes | Variable-length character data |
| LVARCHAR(n) | VARCHAR(n) COLLATE RTRIM | Variable | Long variable character |
| NCHAR(n) | NCHAR(n) | Variable | Fixed-length with collation |
| NVARCHAR(n) | NVARCHAR(n) | Variable | Variable-length with collation |
| TEXT | TEXT | Unlimited | Large text object |

**Parsing Rules for Column Intelligence:**
- `CHAR(n)` → Fixed-length, typically for codes, flags, short identifiers
- `VARCHAR(n)` → Variable-length, for names, descriptions, user input
- `NCHAR/NVARCHAR` → Unicode support, for internationalization
- `TEXT` → Large content, documents, HTML, JSON

### 1.2 Numeric Data Types

| Original Type | SQLite Type | Bytes | Range | Description |
|--------------|-------------|-------|-------|-------------|
| SMALLINT | SMALLINT | 2 bytes | -32,768 to 32,767 | Small integer |
| INTEGER | INTEGER | 4 bytes | -2^31 to 2^31-1 | Standard integer |
| BIGINT | BIGINT | 8 bytes | -2^63 to 2^63-1 | Large integer |
| INT8 | BIGINT | 8 bytes | -2^63 to 2^63-1 | 64-bit integer |
| DECIMAL(p,s) | DECIMAL(p,s) | Variable | Precision p, scale s | Exact decimal |
| DECIMAL(p) | DECIMAL(p) | Variable | Precision p | Floating decimal |
| MONEY | DECIMAL(16,2) | Variable | 16,2 precision | Currency |
| MONEY(p,s) | DECIMAL(p,s) | Variable | Custom precision | Currency |
| FLOAT(n) | FLOAT | 8 bytes | IEEE 754 | Floating point |
| DOUBLE PRECISION | FLOAT | 8 bytes | IEEE 754 | Double precision |
| REAL | SMALLFLOAT | 4 bytes | IEEE 754 | Single precision |

**Semantic Type Detection:**
- `*_ID`, `*_KEY` suffixes → Likely foreign key or primary key
- `*_COUNT`, `*_QTY`, `*_AMOUNT` → Numeric counters/quantities
- `*_PRICE`, `*_COST`, `*_TOTAL`, `*_FEE` → Money/Currency semantic type
- `*_RATE`, `*_RATIO`, `*_PERCENT` → Percentage or ratio

### 1.3 Date/Time Data Types

| Informix Type | SQLite Type | Storage Format | Description |
|--------------|-------------|----------------|-------------|
| DATE | DATE | YYYY-MM-DD | Date only |
| DATETIME YEAR TO YEAR | TINYDATETIME | YYYY-01-01 | Year only |
| DATETIME YEAR TO MONTH | TINYDATETIME | YYYY-MM-01 | Year-Month |
| DATETIME YEAR TO DAY | TINYDATETIME | YYYY-MM-DD | Calendar date |
| DATETIME YEAR TO HOUR | SMALLDATETIME | YYYY-MM-DD hh:00 | Date + hour |
| DATETIME YEAR TO MINUTE | SMALLDATETIME | YYYY-MM-DD hh:mm | Date + minute |
| DATETIME YEAR TO SECOND | DATETIME | YYYY-MM-DD hh:mm:ss | Full datetime |
| DATETIME YEAR TO FRACTION(n) | DATETIME(n) | YYYY-MM-DD hh:mm:ss.fffff | With milliseconds |
| DATETIME HOUR TO MINUTE | SMALLTIME | hh:mm | Time only |
| DATETIME HOUR TO SECOND | TIME | hh:mm:ss | Time with seconds |
| DATETIME HOUR TO FRACTION(n) | TIME(n) | hh:mm:ss.fffff | Time with ms |

**Semantic Type Detection for Date Columns:**
- `*_DATE`, `*_DT` → Date type
- `CREATED_*`, `UPDATED_*`, `MODIFIED_*` → Audit timestamps
- `*_START`, `*_END`, `*_FROM`, `*_TO` → Date ranges
- `BIRTH_*`, `HIRE_*`, `JOIN_*` → Life event dates
- `EXPIRY_*`, `EFFECTIVE_*` → Validity periods

### 1.4 Auto-Increment Types

| Original Type | SQLite Type | Behavior |
|--------------|-------------|----------|
| SERIAL | INTEGER PRIMARY KEY AUTOINCREMENT | 32-bit auto-increment |
| BIGSERIAL | N/A (not supported) | Use INTEGER PRIMARY KEY |
| INT8 | N/A (not supported) | Use INTEGER PRIMARY KEY |

**Primary Key Detection:**
- `IDENTITY` keyword → Auto-increment
- `AUTO_INCREMENT` → Auto-increment
- `SERIAL` type → Auto-increment primary key
- Column named `ID` or `*_ID` as first column → Likely PK

### 1.5 Binary/Large Object Types

| Original Type | SQLite Type | Description |
|--------------|-------------|-------------|
| TEXT | TEXT | Large text content |
| BYTE | BLOB | Binary large object |
| CLOB | TEXT | Character large object |
| BLOB | BLOB | Binary large object |

---

## 2. SQL Constraint Patterns

### 2.1 Primary Key Patterns

```sql
-- Pattern 1: Inline with column
column_name INT PRIMARY KEY

-- Pattern 2: Named constraint at column level
column_name INT CONSTRAINT pk_table_name PRIMARY KEY

-- Pattern 3: Table-level constraint
CONSTRAINT pk_table_name PRIMARY KEY (column_name)
PRIMARY KEY (column1, column2)  -- Composite PK
```

### 2.2 Foreign Key Patterns

```sql
-- Pattern 1: Inline foreign key
column_name INT REFERENCES other_table(id)

-- Pattern 2: Named foreign key with actions
column_name INT CONSTRAINT fk_name 
    REFERENCES other_table(id) 
    ON DELETE CASCADE 
    ON UPDATE RESTRICT

-- Pattern 3: Table-level foreign key
CONSTRAINT fk_child_parent 
    FOREIGN KEY (parent_id) REFERENCES parent(id)
```

**FK Intelligence Detection:**
- Column name matches pattern `*_ID` where prefix is a table name → FK candidate
- `REFERENCES` keyword → Confirmed FK
- `ON DELETE CASCADE` → Strong relationship (parent-child)
- `ON DELETE SET NULL` → Optional relationship
- `ON DELETE RESTRICT` → Protected relationship

### 2.3 Unique Constraint Patterns

```sql
-- Pattern 1: Inline unique
column_name VARCHAR(50) UNIQUE

-- Pattern 2: Named unique
column_name VARCHAR(50) CONSTRAINT uq_name UNIQUE

-- Pattern 3: Composite unique
CONSTRAINT uq_name UNIQUE (col1, col2)
```

### 2.4 Check Constraint Patterns

```sql
-- Pattern 1: Inline check
status VARCHAR(20) CHECK (status IN ('Active', 'Inactive'))

-- Pattern 2: Named check
price DECIMAL(10,2) CONSTRAINT chk_price_positive CHECK (price >= 0)
```

### 2.5 Default Value Patterns

```sql
-- Pattern 1: Literal default
status VARCHAR(20) DEFAULT 'Active'

-- Pattern 2: Function default
created_date DATE DEFAULT GETDATE()
created_date DATE DEFAULT CURRENT_TIMESTAMP
created_date DATE DEFAULT NOW()

-- Pattern 3: Expression default
total_price DECIMAL(10,2) DEFAULT (0)
```

---

## 3. Common Column Semantic Patterns

### 3.1 Audit Columns

| Pattern | Semantic Type | Description |
|---------|--------------|-------------|
| `CreatedDate`, `Created_On`, `DateCreated` | Created Timestamp | Record creation time |
| `CreatedBy`, `Created_By` | Created By User | User who created |
| `ModifiedDate`, `Updated_On`, `LastUpdated` | Modified Timestamp | Last modification |
| `ModifiedBy`, `Updated_By` | Modified By User | User who modified |
| `RowVersion`, `Timestamp` | Version Control | Optimistic locking |

### 3.2 Status/State Columns

| Pattern | Semantic Type | Typical Values |
|---------|--------------|----------------|
| `Status`, `*_Status` | Status | Active/Inactive, Pending/Approved/Rejected |
| `IsActive`, `IsEnabled`, `IsDeleted` | Boolean Flag | 0/1, true/false |
| `State`, `*_State` | State Machine | Draft/Published/Archived |

### 3.3 Reference Columns

| Pattern | Semantic Type | Description |
|---------|--------------|-------------|
| `Parent_ID`, `ParentID` | Self-Referencing FK | Hierarchical data |
| `Type_ID`, `TypeID`, `*_Type` | Type Reference | Lookup table FK |
| `Category_ID`, `CategoryID` | Category Reference | Classification FK |
| `Code`, `*_Code` | Code/Identifier | Short identifier code |

### 3.4 Content Columns

| Pattern | Semantic Type | Description |
|---------|--------------|-------------|
| `Name`, `*_Name` | Name | Entity name |
| `Description`, `*_Desc` | Description | Detailed text |
| `Title`, `Subject` | Title | Heading/title |
| `Content`, `Body`, `Text` | Content | Main content body |
| `Notes`, `Remarks`, `Comments` | Notes | Additional info |

### 3.5 Contact Information

| Pattern | Semantic Type | Description |
|---------|--------------|-------------|
| `Email`, `EmailAddress`, `*_Email` | Email | Email address |
| `Phone`, `Telephone`, `*_Phone` | Phone | Phone number |
| `Address`, `Street`, `City`, `State`, `Zip` | Address | Location data |
| `Website`, `URL`, `Link` | URL | Web address |

---

## 4. SQL Function Patterns for Parsing

### 4.1 Date/Time Functions

| Function | Purpose | Example |
|----------|---------|---------|
| `GETDATE()`, `CURRENT_TIMESTAMP`, `NOW()` | Current datetime | `DEFAULT GETDATE()` |
| `DATEADD()`, `DATE_ADD()` | Add interval | `DATEADD(day, 30, GETDATE())` |
| `DATEDIFF()`, `DATE_DIFF()` | Difference | `DATEDIFF(day, start, end)` |
| `CONVERT()`, `FORMAT()` | Format date | `CONVERT(VARCHAR, date, 101)` |

### 4.2 String Functions

| Function | Purpose | Example |
|----------|---------|---------|
| `SUBSTRING()`, `SUBSTR()` | Extract part | `SUBSTRING(name, 1, 10)` |
| `LEN()`, `LENGTH()` | String length | `LEN(name)` |
| `UPPER()`, `LOWER()` | Case conversion | `UPPER(name)` |
| `TRIM()`, `LTRIM()`, `RTRIM()` | Remove spaces | `TRIM(name)` |
| `REPLACE()` | Replace text | `REPLACE(text, 'old', 'new')` |
| `CONCAT()`, `||` | Concatenate | `CONCAT(first, ' ', last)` |

### 4.3 Aggregate Functions

| Function | Purpose | Example |
|----------|---------|---------|
| `COUNT()` | Row count | `COUNT(*)` |
| `SUM()` | Sum values | `SUM(amount)` |
| `AVG()` | Average | `AVG(price)` |
| `MIN()`, `MAX()` | Min/Max | `MAX(created_date)` |
| `GROUP_CONCAT()`, `STRING_AGG()` | Concatenate group | `STRING_AGG(name, ',')` |

---

## 5. Stored Procedure Patterns

### 5.1 Parameter Patterns

```sql
-- Input parameters
CREATE PROCEDURE GetUser(@UserID INT)
CREATE PROCEDURE SearchUsers(@Name NVARCHAR(100), @Status VARCHAR(20) = 'Active')

-- Output parameters
CREATE PROCEDURE GetCount(@Total INT OUTPUT)
CREATE PROCEDURE InsertUser(@ID INT OUT, @Name VARCHAR(100))

-- Table-valued parameters (SQL Server)
CREATE PROCEDURE UpdateBatch(@Items dbo.ItemTable READONLY)
```

### 5.2 Return Value Patterns

```sql
-- Scalar return
RETURN @Status
RETURN SCOPE_IDENTITY()  -- Return new ID

-- Result set return
SELECT * FROM Users WHERE ...
SELECT @ID AS NewID, @Status AS ResultStatus
```

### 5.3 Common Procedure Types

| Prefix/Suffix | Purpose | Example |
|--------------|---------|---------|
| `sp_*`, `usp_*` | Stored procedure | `sp_GetUserDetails` |
| `Get*` | Retrieve data | `GetAllUsers`, `GetUserByID` |
| `Insert*`, `Add*`, `Create*` | Insert data | `InsertUser`, `AddNewOrder` |
| `Update*`, `Edit*`, `Modify*` | Update data | `UpdateUser`, `EditProfile` |
| `Delete*`, `Remove*` | Delete data | `DeleteUser`, `RemoveItem` |
| `Search*`, `Find*` | Search data | `SearchProducts` |
| `Process*`, `Calculate*` | Business logic | `ProcessOrder`, `CalculateTotal` |

---

## 6. Web Form Field Type Mapping

### 6.1 HTML Input Types by SQL Data Type

| SQL Data Type | HTML Input Type | Validation |
|--------------|-----------------|------------|
| CHAR(n), VARCHAR(n) | `text`, `input[type="text"]` | maxlength=n |
| INTEGER, SMALLINT, BIGINT | `number` | step=1, integer only |
| DECIMAL(p,s), MONEY | `number` | step=0.01, decimal places |
| FLOAT, DOUBLE | `number` | step=any |
| DATE | `date` | YYYY-MM-DD format |
| DATETIME | `datetime-local` | YYYY-MM-DDTHH:mm |
| TIME | `time` | HH:mm format |
| BOOLEAN, BIT | `checkbox` | checked=true |
| TEXT | `textarea` | rows, cols |
| BLOB, BINARY | `file` | accept attribute |

### 6.2 Semantic Field Detection from Names

| Name Pattern | Field Type | UI Component |
|-------------|-----------|--------------|
| `Password`, `Pwd`, `Pass` | Password | `input[type="password"]` |
| `Email`, `EmailAddress` | Email | `input[type="email"]` |
| `Phone`, `Tel`, `Mobile` | Phone | `input[type="tel"]` |
| `URL`, `Website`, `Link` | URL | `input[type="url"]` |
| `Image`, `Photo`, `Avatar` | Image Upload | `input[type="file"]` |
| `File`, `Document`, `Attachment` | File Upload | `input[type="file"]` |
| `Color`, `Colour` | Color | `input[type="color"]` |
| `Date`, `*_Date` | Date | `input[type="date"]` |
| `Time`, `*_Time` | Time | `input[type="time"]` |
| `Amount`, `Price`, `Cost`, `Total` | Currency | `input[type="number"]` with currency symbol |
| `Quantity`, `Qty`, `Count` | Number | `input[type="number"]` |
| `Percentage`, `Percent`, `Rate` | Percentage | `input[type="range"]` or number 0-100 |
| `Description`, `Notes`, `Comments` | Multi-line | `textarea` |
| `IsActive`, `IsEnabled`, `IsDefault` | Boolean | `checkbox` or `toggle` |
| `Status`, `Type`, `Category` | Selection | `select` dropdown |

---

## 7. Foreign Key Detection Heuristics

### 7.1 Naming Convention Detection

```javascript
// Column naming patterns suggesting FK relationships
const fkPatterns = [
  /^(\w+)_ID$/i,           // user_id, product_id
  /^(\w+)Id$/i,            // userId, productId
  /^FK_(\w+)$/i,           // FK_User, FK_Product
  /^(\w+)_KEY$/i,          // user_key, product_key
  /^PARENT_(\w+)$/i,       // parent_id, parent_category
];

// Table naming patterns for lookup/reference tables
const lookupTablePatterns = [
  /^LK_/i,                 // LK_Status, LK_Type
  /^REF_/i,                // REF_Country, REF_Currency
  /^TYPE$/i,               // UserType, StatusType
  /^CATEGORY$/i,           // ProductCategory
  /^Lookup$/i,             // StatusLookup
];
```

### 7.2 Relationship Strength Indicators

| Indicator | Strength | Meaning |
|-----------|----------|---------|
| `ON DELETE CASCADE` | Strong | Child cannot exist without parent |
| `ON DELETE SET NULL` | Weak | Child can exist independently |
| `ON DELETE RESTRICT` | Protected | Parent cannot be deleted if children exist |
| `NOT NULL` + FK | Required | Mandatory relationship |
| Nullable FK | Optional | Optional relationship |

---

## 8. Schema Analysis Intelligence

### 8.1 Table Classification

| Pattern | Classification | Example |
|---------|---------------|---------|
| Singular name, has PK | Entity Table | User, Product, Order |
| Junction/Join table | Relationship Table | User_Role, Order_Item |
| `*_Type`, `*_Status`, `*_Category` | Lookup Table | UserType, OrderStatus |
| `*_Audit`, `*_Log`, `*_History` | Audit Table | UserAudit, OrderLog |
| `*_Config`, `*_Setting` | Configuration Table | SystemConfig |
| `Temp_*`, `TMP_*` | Temporary Table | Temp_Import |

### 8.2 Column Importance Ranking

1. **Critical**: Primary Key, Foreign Keys, Unique constraints
2. **Important**: Not null columns, Indexed columns, Status columns
3. **Standard**: Regular data columns
4. **Metadata**: Audit columns, version columns, calculated columns

### 8.3 Data Type Priority for Display

1. VARCHAR/CHAR - Most common, display first
2. INT/BIGINT - Common identifiers
3. DATE/DATETIME - Important for filtering
4. DECIMAL/MONEY - Financial data
5. BOOLEAN/STATUS - State indicators
6. TEXT/BLOB - Large content, display truncated

---

## 9. Web Framework Model Mapping

### 9.1 C#/ASP.NET Model Types

```csharp
// SQL to C# Type Mapping
SQL CHAR/VARCHAR    → string
SQL NCHAR/NVARCHAR  → string
SQL TEXT            → string
SQL INTEGER         → int
SQL BIGINT          → long
SQL SMALLINT        → short
SQL DECIMAL         → decimal
SQL MONEY           → decimal
SQL FLOAT           → double
SQL DATE            → DateTime
SQL DATETIME        → DateTime
SQL BOOLEAN         → bool
SQL BLOB            → byte[]
SQL UNIQUEIDENTIFIER→ Guid
```

### 9.2 ASP.NET MVC Editor Templates

```csharp
// Common EditorFor mappings
[UIHint("MultilineText")]  // textarea for long text
[UIHint("Password")]       // password field
[UIHint("EmailAddress")]   // email input
[UIHint("PhoneNumber")]    // tel input
[UIHint("Date")]           // date picker
[UIHint("Time")]           // time picker
[UIHint("Currency")]       // number with currency format
[UIHint("Boolean")]        // checkbox or toggle
```

### 9.3 Data Annotations Mapping

```csharp
// Column constraints to Data Annotations
NOT NULL           → [Required]
VARCHAR(n)         → [StringLength(n)]
DECIMAL(p,s)       → [Column(TypeName = "decimal(p,s)")]
UNIQUE             → [Index(IsUnique = true)]
PRIMARY KEY        → [Key]
IDENTITY           → [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
DEFAULT value      → Set in constructor or [DefaultValue]
```

---

## 10. Parsing Intelligence Extraction

### 10.1 From SQL CREATE TABLE

```sql
CREATE TABLE Users (
    UserID INT IDENTITY(1,1) PRIMARY KEY,           -- PK, Auto-increment
    Username VARCHAR(50) NOT NULL UNIQUE,           -- Required, Unique
    Email VARCHAR(100) NOT NULL,                    -- Required
    PasswordHash VARCHAR(255) NOT NULL,             -- Required, Sensitive
    FirstName VARCHAR(50),                          -- Optional
    LastName VARCHAR(50),                           -- Optional
    DateOfBirth DATE,                               -- Date field
    StatusID INT FOREIGN KEY REFERENCES Status(ID), -- FK to Status table
    RoleID INT NULL FOREIGN KEY REFERENCES Role(ID),-- Optional FK
    IsActive BIT DEFAULT 1,                         -- Boolean, default true
    CreatedDate DATETIME DEFAULT GETDATE(),         -- Audit field
    ModifiedDate DATETIME NULL,                     -- Audit field
    CONSTRAINT UQ_UserEmail UNIQUE (Email)          -- Additional unique
);
```

**Extracted Intelligence:**
```json
{
  "tableName": "Users",
  "type": "Entity",
  "primaryKey": {"column": "UserID", "autoIncrement": true},
  "foreignKeys": [
    {"column": "StatusID", "references": "Status", "required": true},
    {"column": "RoleID", "references": "Role", "required": false}
  ],
  "uniqueConstraints": ["Username", "Email"],
  "auditColumns": ["CreatedDate", "ModifiedDate"],
  "sensitiveColumns": ["PasswordHash"],
  "semanticTypes": {
    "Email": "EmailAddress",
    "PasswordHash": "Password",
    "DateOfBirth": "BirthDate",
    "IsActive": "StatusFlag"
  }
}
```

### 10.2 From CSHTML Web Form

```html
@model UserViewModel
@using (Html.BeginForm()) {
    @Html.EditorFor(m => m.Username)           <!-- text input -->
    @Html.EditorFor(m => m.Email)              <!-- email input -->
    @Html.PasswordFor(m => m.PasswordHash)     <!-- password input -->
    @Html.DropDownListFor(m => m.StatusID, ...) <!-- dropdown -->
    @Html.CheckBoxFor(m => m.IsActive)         <!-- checkbox -->
}
```

**Extracted Intelligence:**
```json
{
  "viewModel": "UserViewModel",
  "fields": [
    {"name": "Username", "type": "text", "required": true},
    {"name": "Email", "type": "email", "required": true},
    {"name": "PasswordHash", "type": "password", "required": true, "sensitive": true},
    {"name": "StatusID", "type": "select", "dataSource": "Status"},
    {"name": "IsActive", "type": "checkbox", "default": true}
  ],
  "formType": "Edit",
  "relatedTables": ["Status"]
}
```

---

## 11. Boolean Type Handling

### 11.1 Cross-Database Boolean Representations

| Database | Boolean Type | Storage | Values |
|----------|-------------|---------|--------|
| SQLite | BOOLEAN (pseudo) | INTEGER | 1 = true, 0 = false |
| SQL Server | BIT | INTEGER | 1 = true, 0 = false |
| MySQL | BOOLEAN, BOOL | TINYINT(1) | 1 = true, 0 = false |
| PostgreSQL | BOOLEAN | Native | true/false, 't'/'f', 1/0 |
| Oracle | NUMBER(1) | NUMBER | 1 = true, 0 = false |

### 11.2 Boolean Column Naming Patterns

| Pattern | Semantic Type | Display As |
|---------|--------------|------------|
| `Is*` (IsActive, IsEnabled) | Status Flag | Toggle/Switch |
| `Has*` (HasPermission, HasAccess) | Capability Flag | Checkbox |
| `Can*` (CanEdit, CanDelete) | Permission Flag | Checkbox |
| `Should*` (ShouldNotify) | Setting Flag | Toggle |
| `Allow*` (AllowAnonymous) | Permission Flag | Toggle |

---

## 12. Date/Time Format Patterns

### 12.1 ISO Date Formats

| Type | Format | Example |
|------|--------|---------|
| DATE | YYYY-MM-DD | 2024-01-15 |
| TIME | HH:mm:ss | 14:30:45 |
| TIME with ms | HH:mm:ss.SSS | 14:30:45.123 |
| DATETIME | YYYY-MM-DD HH:mm:ss | 2024-01-15 14:30:45 |
| DATETIME with ms | YYYY-MM-DD HH:mm:ss.SSS | 2024-01-15 14:30:45.123 |
| DATETIME ISO 8601 | YYYY-MM-DDTHH:mm:ssZ | 2024-01-15T14:30:45Z |

### 12.2 Common Date Functions by Database

| Purpose | SQL Server | MySQL | PostgreSQL | SQLite |
|---------|-----------|-------|------------|--------|
| Current Date | GETDATE() | NOW() | CURRENT_TIMESTAMP | datetime('now') |
| Date Add | DATEADD() | DATE_ADD() | + INTERVAL | date(date, '+1 day') |
| Date Diff | DATEDIFF() | DATEDIFF() | - (subtract) | julianday() diff |
| Format | CONVERT() | DATE_FORMAT() | TO_CHAR() | strftime() |

---

## Conclusion

This knowledge base provides the foundation for intelligent parsing of:
1. **SQL DDL statements** - Extract tables, columns, constraints, relationships
2. **Stored procedures** - Extract parameters, return types, operations
3. **Web forms (CSHTML/ASP.NET)** - Extract models, fields, validation, data sources
4. **Cross-reference intelligence** - Match SQL columns to web form fields

The semantic patterns enable automatic classification and intelligent suggestions during schema analysis and migration planning.

---

*This document is based on the MSSQL/SQLite Data Types Mapping Reference and extended with parsing intelligence for the Schema Architect project.*
