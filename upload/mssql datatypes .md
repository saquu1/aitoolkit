Data dictionary
SQLite related data dictionary topics.

SQL types mapping: SQLite
Table 1. SQL data types mapping for SQLite
Original data types	SQLite data types
CHAR(n)	CHAR(n) COLLATE RTRIM
VARCHAR(n[,m])	VARCHAR(n) COLLATE RTRIM
LVARCHAR(n)	VARCHAR(n) COLLATE RTRIM
NCHAR(n)	NCHAR(n)
NVARCHAR(n)	NVARCHAR(n)
BOOLEAN	BOOLEAN
SMALLINT	SMALLINT
INTEGER	INTEGER
BIGINT	BIGINT
INT8	BIGINT
SERIAL[(start)]	INTEGER (see note 1)
BIGSERIAL[(start)]	N/A (see note 1)
INT8[(start)]	N/A (see note 1)
DOUBLE PRECISION / FLOAT[(n)]	FLOAT
REAL / SMALLFLOAT	SMALLFLOAT
DECIMAL(p,s)	DECIMAL(p,s)
DECIMAL(p)	DECIMAL(p)
DECIMAL	DECIMAL
MONEY(p,s)	DECIMAL(p,s)
MONEY(p)	DECIMAL(p,2)
MONEY	DECIMAL(16,2)
TEXT	TEXT
BYTE	BLOB
DATE	DATE
DATETIME HOUR TO HOUR	SMALLTIME
DATETIME HOUR TO MINUTE	SMALLTIME
DATETIME HOUR TO SECOND	TIME
DATETIME HOUR TO FRACTION(n)	TIME(n)
DATETIME MINUTE TO MINUTE	SMALLTIME
DATETIME MINUTE TO SECOND	TIME
DATETIME MINUTE TO FRACTION(n)	TIME(n)
DATETIME SECOND TO SECOND	TIME
DATETIME SECOND TO FRACTION(n)	TIME(n)
DATETIME FRACTION TO FRACTION(n)	TIME(n)
DATETIME YEAR TO YEAR	TINYDATETIME
DATETIME YEAR TO MONTH	TINYDATETIME
DATETIME YEAR TO DAY	TINYDATETIME
DATETIME YEAR TO HOUR	SMALLDATETIME
DATETIME YEAR TO MINUTE	SMALLDATETIME
DATETIME YEAR TO SECOND	DATETIME
DATETIME YEAR TO FRACTION(n)	DATETIME(n)
DATETIME MONTH TO MONTH	TINYDATETIME
DATETIME MONTH TO DAY	TINYDATETIME
DATETIME MONTH TO HOUR	SMALLDATETIME
DATETIME MONTH TO MINUTE	SMALLDATETIME
DATETIME MONTH TO SECOND	DATETIME
DATETIME MONTH TO FRACTION(n)	DATETIME(n)
DATETIME DAY TO DAY	TINYDATETIME
DATETIME DAY TO HOUR	SMALLDATETIME
DATETIME DAY TO MINUTE	SMALLDATETIME
DATETIME DAY TO SECOND	DATETIME
DATETIME DAY TO FRACTION(n)	DATETIME(n)
INTERVAL q1 TO q2	CHAR(50)
Notes:


BOOLEAN data type
Informix®
Informix supports the BOOLEAN data type, which can store 't' or 'f' values.

Genero BDL implements the BOOLEAN data type in a different way: A BOOLEAN variable stores integer values 1 or 0 (for TRUE or FALSE). This type is designed to hold the result of a boolean expression.
SQLite
SQLite does not implement a native BOOLEAN type, but accepts BOOLEAN in the SQL syntax for data column types, and uses integer values 1/0 for true/false booleans.

Solution
The SQLite database interface supports the BOOLEAN data type and stores 1 or 0 values in the column.

The BOOLEAN type translation can be controlled with the following FGLPROFILE entry:
dbi.database.dsname.ifxemul.datatype.boolean = { true | false }


CHAR and VARCHAR data types
Informix®
Informix supports the following character data types:

Table 1. Informix character data types
Informix data type	Description
CHAR(n)	SBCS and MBCS character data (max is 32767 bytes)
VARCHAR(n[,m])	SBCS and MBCS character data (max is 255 bytes)
NCHAR(n)	Same as CHAR, with specific collation order
NVARCHAR(n[,m])	Same as VARCHAR, with specific collation order
LVARCHAR(n)	max size varies depending on the IDS version
With Informix, both CHAR/VARCHAR and NCHAR/NVARCHAR data types can be used to store single-byte or multibyte encoded character strings. The only difference between CHAR/VARCHAR and NCHAR/NVARCHAR is in how they use sorting: N[VAR]CHAR types use the collation order, while [VAR]CHAR types use the byte order.

The character set used to store strings in CHAR/VARCHAR/NCHAR/NVARCHAR columns is defined by the DB_LOCALE environment variable.

The character set used by applications is defined by the CLIENT_LOCALE environment variable.
Informix uses Byte Length Semantics (the size N that you specify in [VAR]CHAR(N) is expressed in bytes, not characters as in some other databases)

SQLite
SQLite 3 provides the TEXT native data type with no strict size limitation. SQLite allows the CHAR(n), VARCHAR(n), NCHAR(n) and NVARCHAR(n) type names to be used, but actually stores the data in a TEXT native type.

SQLite treats empty strings as NOT NULL values like Informix.

Note:
With the default BINARY collation, SQLite compares VARCHAR and CHAR values by taking trailing blanks into account. Informix always ignores trailing blanks when comparing CHAR/VARCHAR values.

SQLite supports only the UTF-8 character encoding. Thus, client applications must provide UTF-8 encoded strings.

Solution
The database interface supports character string variables in SQL statements for input (BDL USING) and output (BDL INTO).

Important:
With the default BINARY collation, CHAR and VARCHAR comparison in SQLite takes trailing blanks into account. As result, some queries returning rows with Informix may not return the same result set with SQLite. When creating a table in SQLite, you can change the default collation rule to force the database engine to trim trailing blanks before comparing CHAR/VARCHAR values, by specifying COLLATION RTRIM in the column definitions. When creating a table from a Genero program, if Informix emulation is enabled for the CHAR/VARCHAR types, the SQLite database driver adds automatically COLLATE RTRIM after the CHAR(N) or VARCHAR(N) type, to get the same comparison semantics as Informix.

Table columns using a different character encoding than the database is not supported with Genero: All table columns must use the same character encoding defined at the database level.

Regarding character sets, the SQLite database driver automatically converts character strings used in the programs to/from UTF-8 for SQLite.

SQLite uses character length semantics: When you define a CHAR(20) and the database character set is multibyte, the column can hold more bytes/characters than the Informix CHAR(20) type, when using byte length semantics.

When using a multibyte character set (such as UTF-8), define database columns with the size in character units, and use character length semantics in BDL programs with FGL_LENGTH_SEMANTICS=CHAR.

When extracting a database schema from a SQLite database, the fgldbsch schema extractor uses the size of the column in characters, not the octet length. If you have created a CHAR(10 (characters) ) column a in SQLite database using the UTF-8 character set, the .sch file will get a size of 10, that will be interpreted following FGL_LENGTH_SEMANTICS, as a number of bytes or characters.

See also the section about Localization.

The CHAR/VARCHAR type translation can be controlled with the following FGLPROFILE entries:
dbi.database.dsname.ifxemul.datatype.char = { true | false }
dbi.database.dsname.ifxemul.datatype.varchar = { true | false }


Numeric data types
Informix®
Informix supports several data types to store numbers:

Table 1. Informix numeric data types
Informix data type	Description
SMALLINT	16 bit signed integer
INTEGER	32 bit signed integer
BIGINT	64 bit signed integer
INT8	64 bit signed integer (replaced by BIGINT)
DECIMAL	Equivalent to DECIMAL(16)
DECIMAL(p)	Floating-point decimal number (max precision is 32)
DECIMAL(p,s)	Fixed-point decimal number (max precision is 32)
MONEY	Equivalent to DECIMAL(16,2)
MONEY(p)	Equivalent to DECIMAL(p,2) (max precision is 32)
MONEY(p,s)	Equivalent to DECIMAL(p,s) (max precision is 32)
REAL / SMALLFLOAT	32-bit floating point decimal (C float)
DOUBLE PRECISION / FLOAT[(n)]	64-bit floating point decimal (C double)
SQLite
SQLite 3 supports INTEGER (8 byte integer) and REAL (8 byte floating point) as native types to store numbers, but allows also synonyms:

Table 2. SQLite numeric data types and supported synonyms
Supported synonyms	SQLite type affinity
INT, INTEGER, TINYINT, SMALLINT, MEDIUMINT, BIGINT, UNSIGNED BIG INT, INT2, INT8	INTEGER (8 bytes!)
REAL, DOUBLE, DOUBLE PRECISION, FLOAT	REAL (8 bytes!)
DECIMAL(p,s), NUMERIC	NUMERIC (based on REAL)
Important:
Exact decimal types like DECIMAL(p,s) may be stored as floating point numbers (REAL), INTEGER or TEXT types, according to the type affinity selected by SQLite. When converted to floating point type, data loss and rounding rule differences are possible with SQLite.

Solution
Informix numeric types are not translated by the SQLite database driver: The numeric types are used as is when creating tables, since SQLite supports a wide range of type synonyms.

Since SQLite 3 does not have exact decimal types like DECIMAL(p,s), you must pay attention to the rounding rules and data loss when using numbers with many significant digits. Arithmetic operations like division have different results than with Informix. It is better to fetch the original column value into a DECIMAL variable, and do arithmetic operations in the application program.

Note:
Avoid using DECIMAL[(p)] type in FGL or SQL: Due to the implementation differences in Informix SQL / Genero BDL and the native SQL type, such data type is not recommended. Always specify a precision and scale with DECIMAL(p,s).

The numeric types translation can be controlled with the following FGLPROFILE entries:
dbi.database.dsname.ifxemul.datatype.smallint = { true | false }
dbi.database.dsname.ifxemul.datatype.integer = { true | false }
dbi.database.dsname.ifxemul.datatype.bigint = { true | false }
dbi.database.dsname.ifxemul.datatype.int8 = { true | false }
dbi.database.dsname.ifxemul.datatype.decimal = { true | false }
dbi.database.dsname.ifxemul.datatype.money = { true | false }
dbi.database.dsname.ifxemul.datatype.float = { true | false }
dbi.database.dsname.ifxemul.datatype.smallfloat = { true | false }


DATE and DATETIME data types
Informix®
Informix provides two data types to store date and time information:

DATE = for year, month and day storage.
DATETIME = for year to fraction (1-5) storage.
The DATE type is stored as an INTEGER with the number of days since 1899/12/31.

The DATETIME type can be defined with various time units, by specifying a start and end qualifier. For example, you can define a datetime to store an hour-to-second time value with DATETIME HOUR TO SECOND.

The values of Informix DATETIME can be represented with a character string literal, or as DATETIME() literals:
'2017-12-24 15:45:12.345'  -- a DATETIME YEAR TO FRACTION(3)
'15:45'   -- a DATETIME HOUR TO MINUTE
DATETIME(2017-12-24 12:45) YEAR TO MINUTE
DATETIME(12:45:56.333) HOUR TO FRACTION(3)
Informix is able to convert quoted strings to DATE / DATETIME data, if the string contains matching environment parameters. The string to date conversion rules for DATE is defined by the DBDATE environment variable. The string to datetime format for DATETIME is defined by the GL_DATETIME environment variable.
Note:
Within Genero programs, the string representation for DATETIME values is always ISO (YYYY-MM-DD hh:mm:ss.fffff)

Informix supports date arithmetic on DATE and DATETIME values. The result of an arithmetic expression involving dates/times is an INTEGER number of days when only DATE values are used, and an INTERVAL value if a DATETIME is used in the expression.

Informix automatically converts an INTEGER to a DATE when the integer is used to set a value of a date column.

Informix provides the CURRENT [ q1 TO q2 ] operator, to get the system date/time on the server where the current database is located. When no qualifiers are specified, CURRENT returns a DATETIME YEAR TO FRACTION(3). Informix also supports the SYSDATE operator, which returns the current system time as a DATETIME YEAR TO FRACTION(5).
Note:
The USEOSTIME configuration parameter must be set to 1 in order to get the subsecond precision in CURRENT and SYSDATE operators. See Informix documentation for more details.

SQLite
SQLite 3 does not have a native type for date/time storage, but you can use data/time type names and functions based on the string representation of dates and times. The date/time values are stored in the TEXT native type.

The date/time functions of SQLite are based on standard DATE (YYYY-MM-DD), TIME (hh:mm:ss) and TIMESTAMP (YYYY-MM-DD hh:mm:ss) concepts.

For maximum flexibility with other RDBMS SQL languages, SQLite allows you to define table columns with your own type names. You can for example use the SMALLDATETIME, SMALLTIME, TIME(N), DATETIME(N) type names.

Solution
All Informix - BDL date/time types can be stored in SQLite date/time columns.

Since SQLite allows various data type names, the date/time type conversion rules define specific type names such as SMALLTIME, TINYDATETIME, to map original Informix date/time types. This allows the SQLite ODI driver and the fgldbsch tool detect the exact date/time type of a column. When a CREATE TABLE statement in a BDL program uses DATETIME HOUR TO MINUTE, it is mapped to a SMALLTIME by the ODI driver, and when extracting the database schema, fgldbsch can recognized SMALLTIME as a BDL / Informix DATETIME HOUR TO MINUTE column.

The storage format must follow the ISO date/time formatting style (YYYY-MM-DD hh:mm:ss.fffff). Depending on the BDL date/time precision, some parts will be omitted. For example a DATETIME HOUR TO MINUTE is stored as hh:mm (see conversion table below for more details).

Use the following conversion rules to map Informix date/time types to SQLite date/time (pseudo) types:

Table 1. Informix data types and SQLite equivalents
Informix data type	SQLite (pseudo data type)	Storage format
DATE	DATE	YYYY-MM-DD
DATETIME HOUR TO HOUR	SMALLTIME	hh:00
DATETIME HOUR TO MINUTE	SMALLTIME	hh:mm
DATETIME HOUR TO SECOND	TIME	hh:mm:ss
DATETIME HOUR TO FRACTION(n)	TIME(n)	hh:mm:ss.fffff
DATETIME MINUTE TO MINUTE	SMALLTIME	00:mm
DATETIME MINUTE TO SECOND	TIME	00:mm:ss
DATETIME MINUTE TO FRACTION(n)	TIME(n)	00:mm:ss.fffff
DATETIME SECOND TO SECOND	TIME	00:00:ss
DATETIME SECOND TO FRACTION(n)	TIME(n)	00:00:ss.fffff
DATETIME FRACTION TO FRACTION(n)	TIME(n)	00:00:00.fffff
DATETIME YEAR TO YEAR	TINYDATETIME	YYYY-01-01
DATETIME YEAR TO MONTH	TINYDATETIME	YYYY-MM-01
DATETIME YEAR TO DAY	TINYDATETIME	YYYY-MM-DD
DATETIME YEAR TO HOUR	SMALLDATETIME	YYYY-MM-DD hh:00
DATETIME YEAR TO MINUTE	SMALLDATETIME	YYYY-MM-DD hh:mm
DATETIME YEAR TO SECOND	DATETIME	YYYY-MM-DD hh:mm:ss
DATETIME YEAR TO FRACTION(n)	DATETIME(n)	YYYY-MM-DD hh:mm:ss.fffff
DATETIME MONTH TO MONTH	TINYDATETIME	1900-MM-01
DATETIME MONTH TO DAY	TINYDATETIME	1900-MM-DD
DATETIME MONTH TO HOUR	SMALLDATETIME	1900-MM-DD hh:00
DATETIME MONTH TO MINUTE	SMALLDATETIME	1900-MM-DD hh:mm
DATETIME MONTH TO SECOND	DATETIME	1900-MM-DD hh:mm:ss
DATETIME MONTH TO FRACTION(n)	DATETIME(n)	1900-MM-DD hh:mm:ss.fffff
DATETIME DAY TO DAY	TINYDATETIME	1900-01-DD
DATETIME DAY TO HOUR	SMALLDATETIME	1900-01-DD hh:00
DATETIME DAY TO MINUTE	SMALLDATETIME	1900-01-DD hh:mm
DATETIME DAY TO SECOND	DATETIME	1900-01-DD hh:mm:ss
DATETIME DAY TO FRACTION(n)	DATETIME(n)	1900-01-DD hh:mm:ss.fffff
The DATE and DATETIME types translation can be controlled with the following FGLPROFILE entries:
dbi.database.dsname.ifxemul.datatype.date = { true | false }
dbi.database.dsname.ifxemul.datatype.datetime = { true | false }
For more details see IBM Informix emulation parameters in FGLPROFILE.
In SQL statements, CURRENT [q1 TO q2] expressions are converted to SQLite strftime('%Y-%m-%d %H:%M:%S','now'). The SQLite 'now' option returns the current date/time in UTC, while the FGL runtime system CURRENT instruction returns the current local time. Both values can be different. Always consider using SQL parameters with program variables assigned by the CURRENT instruction of Genero BDL, instead of using CURRENT instructions in SQL statements.

When using the CURRENT keyword without qualifiers, the SQL translator in ODI drivers will not convert this expression to a native equivalent, because it is difficult to find the required date/time precision. Depending on the context, the Informix CURRENT expression will be converted to match the target DATETIME or DATE type. In SQL statements, always use qualifiers after the CURRENT keyword, or use a DATETIME variable assigned with the current date/time set by program, and use this variable as SQL parameter.
-- Next CURRENT keyword will not be converted!
SELECT COUNT(*) INTO cnt FROM customer WHERE creadate < CURRENT
-- Best practice:
DEFINE dtcurr DATETIME YEAR TO FRACTION(3)
LET drcurr = CURRENT -- OK: it's the built-in language CURRENT expression!
SELECT COUNT(*) INTO cnt FROM customer WHERE creadate < dtcurr


INTERVAL data type
Informix®
Informix provides the INTERVAL data type to store a value that represents a span of time.

INTERVAL types are divided into two classes:
Intervals of year-month class such as INTERVAL YEAR(5) TO MONTH
Intervals of day-time class such as INTERVAL DAY(9) TO SECOND
INTERVAL columns can be defined with various time units, by specifying a start and end qualifier. For example, you can define an interval to store a number of hours and minutes with INTERVAL HOUR(n) TO MINUTE, where n defines the maximum number of digits for the hours unit.
The values of Informix INTERVAL can be represented with a character string literal, or as INTERVAL() literals:
'-9834 15:45:12.345'  -- an INTERVAL DAY(6) TO FRACTION(3)
'7623-11'   -- an INTERVAL YEAR(9) TO MONTH
INTERVAL(18734:45) HOUR(5) TO MINUTE
INTERVAL(-7634-11) YEAR(5) TO MONTH
SQLite
SQLite 3 does not provide a data type similar to Informix INTERVAL.

Solution
The INTERVAL data type and values are converted CHAR(50) column with SQLite.

INTERVAL values can be stored and retrieved from the database. However, since SQLite does not support a native interval type, arithmetics cannot be performed on the database side in SQL statements.


SERIAL and BIGSERIAL data types
Informix®
Informix supports the SERIAL, BIGSERIAL data types to produce automatic integer sequences:
SERIAL can produce 32 bit integers (INTEGER)
BIGSERIAL can produce 64 bit integers (BIGINT)
SERIAL8 is a synonym for BIGSERIAL
Steps to use serials with Informix:
Create the table with a column using SERIAL, or BIGSERIAL.
To generate a new serial, no value or a zero value is specified in the INSERT statement:
INSERT INTO tab1 ( c ) VALUES ( 'aa' )
INSERT INTO tab1 ( k, c ) VALUES ( 0, 'aa' )
After INSERT, the new value of a SERIAL or BIGSERIAL column is provided in sqlca.sqlerrd[2], or it can be fetched with a SELECT dbinfo('sqlca.sqlerrd1') query. Since sqlca.sqlerrd[1-6] is defined as BIGINT, when using Informix CSDK 15 with the dbmifx_15 driver, the last generated BIGSERIAL will be available in sqlca.sqlerrd[2].
Informix allows you to insert rows with a value different from zero for a serial column. Using an explicit value will automatically increment the internal serial counter, to avoid conflicts with future INSERT statements that are using a zero value:

SQL statement                                               Internal serial counter
------------------------------------------------------------------------------------------
CREATE TABLE tab ( pkey SERIAL, name VARCHAR(50) );                    0
INSERT INTO tab VALUES (  0, 'aaa' );                                  1
INSERT INTO tab VALUES ( 10, 'bbb' );                                 10
INSERT INTO tab VALUES (  0, 'ccc' );                                 11
DELETE FROM tab;                                                      11
INSERT INTO tab VALUES (  0, 'ddd' );                                 12
SQLite
SQLite supports the AUTOINCREMENT attribute for columns:

Only one column must be declared as INTEGER PRIMARY KEY AUTOINCREMENT.
SQLite (version 3.8.3.1) does not support SEQUENCE objects.
SQLite (version 3.8.3.1) does not allow AUTOINCREMENT on BIGINT columns.
To get the last generated number, SQLite provides the sqlite_sequence table:
SELECT seq FROM sqlite_sequence WHERE name='tabname'
At INSERT, for the auto-incremented column:
When specifying a zero, SQLite will not generate a new sequence like Informix does.
When specifying a NULL, SQLite generates a new sequence; Informix denies nulls in serials.
When specifying a value different from zero and NULL, SQLite will use that value. The next INSERT statement not providing a value > 0 will produce a new auto-incremented value that is greater than the last inserted value.
Solution
Note:
For best SQL portability when using different types of databases, consider using sequences as described in Solution 3: Use native SEQUENCE database objects.

When using SQLite, the SERIAL data type is converted to INTEGER PRIMARY KEY AUTOINCREMENT.

The serial type emulation can be enabled or disabled with the following FGLPROFILE entries:
dbi.database.dbname.ifxemul.datatype.serial = {true|false}
dbi.database.dbname.ifxemul.datatype.serial8 = {true|false}
dbi.database.dbname.ifxemul.datatype.bigserial = {true|false}
For more details see IBM Informix emulation parameters in FGLPROFILE.

Disabling automatic serial retrieval for sqlca.sqlerrd[2]
For Informix compatibility, when the SERIAL type emulation is active, the ODI drivers automatically execute another SQL query (or do a DB client API call when possible) after each INSERT statement, to get the last generated serial, and fill the sqlca.sqlerrd[2] register. This results in some overhead that can be avoided, if the sqlca.sqlerrd[2] register is not used by the program.

When serial emulation is required (to create temp tables with a serial column during program execution), and the sqlca.sqlerrd[2] register does not need to be filled, (typically because you use your own method to retrieve the last generated serial), you can set the ifxemul.datatype.serial.sqlerrd2 FGLPROFILE entry to false. This will avoid the automatic retrieval of last serial value to fill sqlca.sqlerrd[2]:

dbi.database.dbname.ifxemul.datatype.serial.sqlerrd2 = false
The above FGLPROFILE entry is useless, if Informix SERIAL type emulation is disabled with:
dbi.database.dbname.ifxemul.datatype.serial = false
See also fgldbutl.db_get_last_serial().

Using the native serial emulation (only option)
The sqlca.sqlerrd[2] register is filled automatically after each INSERT with the last generated number, by fetching the value from the sqlite_sequence table.

Important:
SQLite (V 3.8) does not support auto-incremented BIGINT columns. Therefore, BIGSERIAL or SERIAL8 cannot be supported. These Informix SQL types are converted to BIGINT PRIMARY KEY AUTOINCREMENT, but that will produce an SQL error "AUTOINCREMENT is only allowed on an INTEGER PRIMARY KEY".

Because SQLite does not behave like Informix regarding zero and NULL value specification for auto-incremented columns, all INSERT statements must be reviewed to remove the SERIAL column from the list.

For example, the following statement:

INSERT INTO tab (col1,col2) VALUES ( 0 , p_value)
Can be converted to:

INSERT INTO tab (col2) VALUES (p_value)
Static SQL INSERT using records defined from the schema file must also be reviewed:

DEFINE rec LIKE tab.*
INSERT INTO tab VALUES (rec.*) -- will use the serial column
Can be converted to:

INSERT INTO tab VALUES rec.* -- without parentheses, serial column is removed


ROWID columns
Informix®
When creating a table, Informix automatically adds a ROWID integer column (applies to non-fragmented tables only).

The ROWID column is auto-filled with a unique number and can be used like a primary key to access a given row.

Starting with Informix version 15, when using the "large tables" option, rowid columns are defined as 8 byte BIGINT integers. When using "small tables" option (onconfig TABLE_SIZE SMALL), the rowids are defined as 4 byte INTEGER.

Note:
Informix ROWID usage was a common practice in the early days of Informix 4GL programming. Today it is recommended to define all your database tables with a PRIMARY KEY to uniquely identify rows.

With Informix, the sqlca.sqlerrd[6] register contains the ROWID of the last row affected by an INSERT, UPDATE or DELETE statement.

SQLite
SQLite supports ROWID columns as 64-bit integers. Informix rowids are 16-bit integers.

Solution
If your Genero BDL application uses rowid columns, review the program logic to use primary keys insead. If the database table does no define a primary key, it should be added. All references to SQLCA.SQLERRD[6] must be removed, because this variable will not hold the ROWID of the last modified row.

If you cannot avoid the use of rowids, you must change the type of the variables which hold ROWID values. Instead of using INTEGER, use DECIMAL(20).

For databases where the keyword of the rowid pseudo-column is different than "ROWID", the translation can be controlled with the following FGLPROFILE entry:
dbi.database.dsname.ifxemul.rowid = { true | false }



SQL table definition
Informix®
Informix supports primary key, unique, foreign key, default and check constraints.

The constraint naming syntax is different in Informix and most other databases: Informix expects the constraint name after the constraint definition:

CREATE TABLE emp (
  ...
  emp_code CHAR(10) UNIQUE CONSTRAINT pk_emp,
  ...
)
While other SQL database brands require to specify the constraint name before the constraint definition:
CREATE TABLE emp (
   ... 
   emp_code CHAR(10) CONSTRAINT pk_emp UNIQUE, 
   ...
)
SQLite
SQLite supports primary key, unique, foreign key, default and check constraints.

Constraint naming syntax
The constraint naming clause must be placed before the constraint specification.

The database interface does not convert constraint naming expressions when creating tables from BDL programs. Review the database creation scripts to adapt the constraint naming clauses for SQLite.

Primary keys
Like Informix, SQLite creates an index to enforce PRIMARY KEY constraints (some RDBMS do not create indexes for constraints). Using CREATE UNIQUE INDEX to define unique constraints is obsolete (use primary keys or a secondary key instead).

Unique constraints
Like Informix, SQLite creates an index to enforce UNIQUE constraints (some RDBMS do not create indexes for constraints).

When using a unique constraint, Informix allows only one row with a NULL value, while SQLite allows several rows with NULL! Consider using NOT NULL constraint with UNIQUE.

Foreign keys
SQLite (3.6.19 and +) implements foreign key support, but this feature is not enabled by default. In fact, it is possible to define foreign keys on tables, but when doing database operations, the constraints are not enforced until you enable it explicitly with a PRAGMA command.

To get foreign key constraint checking in SQLite, perform a PRAGMA command with the EXECUTE IMMEDIATE instruction:
EXECUTE IMMEDIATE "PRAGMA foreign_keys = ON"
Future releases of SQLite might change this, so that foreign key constraints enabled by default.

Check constraints
The check condition may be any valid expression that can be evaluated to TRUE or FALSE, including functions and literals. You must verify that the expression is not Informix specific. SQLite supportes CHECK constraints like Informix, but you must check the syntax of the expression to make it portable.

Null constraints
Informix and SQLite support not null constraints, but Informix does not allow you to give a name to NOT NULL" constraints.

TEXT and BYTE (LOB) types
Informix®
Informix provides the TEXT, BYTE, CLOB and BLOB data types to store very large texts or binary data.

Legacy Informix 4GL applications typically use the TEXT and BYTE types.

Genero BDL does not support the Informix CLOB and BLOB types.

SQLite
SQLite 3 provides the TEXT and BLOB native data types for large objects storage.

Solution
The SQLite database interface can convert BDL TEXT data to SQLite TEXT and BYTE data to SQLite BLOB.

The TEXT and BYTE types translation can be controlled with the following FGLPROFILE entries:
dbi.database.dsname.ifxemul.datatype.text = { true | false }
dbi.database.dsname.ifxemul.datatype.byte = { true | false }

Name resolution of SQL objects
Informix®
Informix uses the following form to identify an SQL object:
database[@dbservername]:][{owner|"owner"}.]identifier
The ANSI convention is to use double quotes for identifier delimiters (For example: "customer"."cust_name").

Informix database object names are not case-sensitive in non-ANSI databases. When using double-quoted identifiers, Informix becomes case sensitive.

With non-ANSI Informix databases, you do not have to give a schema name before the tables when executing an SQL statement:
SELECT ... FROM customer WHERE ...
In Informix ANSI compliant databases:
The table name must include "owner", unless the connected user is the owner of the database object.
The database server shifts the owner name to uppercase letters before the statement executes, unless the owner name is enclosed in double quotes.
SQLite
SQLite database object names are case-insensitive. Using double quotes to surround table names in possible. However, the letter case is kept even without double quotes:
sqlite> CREATE TABLE tab1 ( pk INT );
sqlite> CREATE TABLE "TAB2" ( pk INT );
sqlite> CREATE TABLE Tab3 ( pk INT );
sqlite> .tables
TAB2  Tab3  tab1
sqlite> .schema "TAB3" 
CREATE TABLE Tab3 ( pk INT );
In an SQLite, if a prefix is specified as part of an object reference, it must be either "main", or "temp" or the schema-name of an attached database. There is no such concept as user schema in SQLite.

Solution
To write portable SQL, regarding database object names:
Use simple database object names (without any owner/schema prefix)
Do not use double quotes to surround database object identifiers.
If needed, define public synonyms to reference database objects in others databases/schema.
Specify database object identifiers in lowercase.



Data manipulation
SQLite related data manipulation topics.

Outer joins
Transactions handling
Temporary tables
Substrings in SQL
MATCHES and LIKE
The LENGTH() function
Row limiting clause



Outer joins
Informix® OUTER() syntax
In Informix SQL, outer joins can be defined in the FROM clause with the OUTER keyword:
SELECT ... FROM a, OUTER (b)
     WHERE a.key = b.akey

SELECT ... FROM a, OUTER(b,OUTER(c))
     WHERE a.key = b.akey 
       AND b.key1 = c.bkey1 AND b.key2 = c.bkey2 
Informix also supports the ANSI outer join syntax, which is the recommended way to specify outer joins with recent SQL database engines:
SELECT ... FROM cust LEFT OUTER JOIN order
                      ON cust.key = order.custno
    WHERE ...
SQLite
SQLite supports the ANSI outer join syntax:

SELECT ...
  FROM cust LEFT OUTER JOIN order
                  LEFT OUTER JOIN item
                  ON order.key = item.ordno
             ON cust.key = order.custno
 WHERE order.cdate > current date
Solution
The Genero database drivers can convert Informix Informix OUTER specifications to ANSI outer joins.
Note:
For better SQL portability, use the ANSI outer join syntax instead of the old Informix OUTER syntax.

The outer join translation can be controlled with the following FGLPROFILE entry:
dbi.database.dsname.ifxemul.outers = { true | false }
For more details see IBM Informix emulation parameters in FGLPROFILE.
Prerequisites:
In the FROM clause, the main table must be the first item and the outer tables must be listed from left to right in the order of outer levels.
Example which does not work:
... FROM OUTER(tab2), tab1 
The outer join in the WHERE clause must use the table name as prefix:
... WHERE tab1.col1 = tab2.col2
Restrictions:
Statements composed by 2 or more SELECT instructions are not supported:
SELECT ... UNION SELECT ...
or:
SELECT ... WHERE col IN (SELECT...)
Additional conditions on outer table columns cannot be detected and therefore are not supported:
... FROM tab1, OUTER(tab2)
    WHERE tab1.col1 = tab2.col2
      AND tab2.colx > 10
Using subscript in outer conditions:
... FROM tab1, OUTER(tab2)
    WHERE tab1.col1[1,3] = tab2.col2[1,3]
Notes:
Table aliases are detected in OUTER expressions.
OUTER example with table alias:
... OUTER(tab1 alias1) ...
In the outer join, outertab.col can be placed on both right or left sides of the equal sign:
... WHERE outertab.col1 = maintab.col2
Table names detection is not case-sensitive:
SELECT ... FROM tab1, TAB2
    WHERE tab1.col1 = tab2.col2
Temporary tables are supported in OUTER specifications:
CREATE TEMP TABLE tt1 ( ... )

Transactions handling
Informix®
With the Informix native mode (non ANSI):

Transactions blocks start with BEGIN WORK and terminate with COMMIT WORK or ROLLBACK WORK.
Statements executed outside a transaction are automatically committed.
DDL statements can be executed (and canceled) in transactions.
UPDATE tab1 SET ...   -- auto-committed
BEGIN WORK            -- start of TX block
UPDATE tab1 SET ...
UPDATE tab2 SET ...
...
COMMIT WORK           -- end of TX block
Informix version 11.50 introduces savepoints:
SAVEPOINT name [UNIQUE]
ROLLBACK [WORK] TO SAVEPOINT [name] ]
RELEASE SAVEPOINT name
SQLite
With SQLite:
Individual SQL statements are auto-committed.
Transactions start with BEGIN TRANSACTION and end with COMMIT TRANSACTION or ROLLBACK TRANSACTION.
DDL statements can be executed (and canceled) in transaction blocks.
SQLite supports savepoints with some differences compared to Informix:

SAVEPOINT can be used instead of BEGIN TRANSACTION. In this case, RELEASE is like a COMMIT.
The syntax of a rollback to the savepoint is ROLLBACK [TRANSACTION] TO [SAVEPOINT] name.
The syntax of a release of the savepoint is RELEASE [SAVEPOINT] name.
Rollback must always specify the savepoint name.
You cannot rollback to a savepoint if cursors are opened.
In SQLite versions prior to 3.7, you cannot rollback are transaction if a cursor is open.
Solution
Regarding transaction control instructions, BDL applications do not have to be modified in order to work with SQLite. The BEGIN WORK, COMMIT WORK and ROLLBACK WORK commands are translated the native commands of SQLite.

Note:
If you want to use savepoints, always specify the savepoint name in ROLLBACK TO SAVEPOINT and do not open cursors during transactions using savepoints. If you are using an SQLite versions prior to 3.7, it is not possible to perform a ROLLBACK WORK if a cursor (with hold) is currently open.
Temporary tables
Informix®
Informix temporary tables are created with the CREATE TEMP TABLE DDL instruction or with SELECT ... INTO TEMP statement:
CREATE TEMP TABLE tt1 ( pkey INT, name VARCHAR(50) )
CREATE TEMP TABLE tt2 ( pkey INT, name VARCHAR(50) ) WITH NO LOG 
SELECT * FROM tab1 WHERE pkey > 100 INTO TEMP tt2
Temporary tables are automatically dropped when the SQL session ends, but they can also be dropped with the DROP TABLE command. There is no name conflict when several users create temporary tables with the same name.

BDL reports can create a temporary table when the rows are not sorted externally (by the source SQL statement).

Informix allows you to create indexes on temporary tables. No name conflict occurs when several users create an index on a temporary table by using the same index identifier.

When creating temporary tables in Informix, the WITH NO LOG clause can be used to avoid the overhead of recording DML operations in transaction logs.

SQLite
SQLite supports temporary tables with the CREATE TEMP TABLE statement:
CREATE TEMP TABLE mytt1 ( pkey INT, name VARCHAR(50) )
CREATE TEMP TABLE mytt2 AS SELECT * FROM source
Solution
Informix CREATE TEMP TABLE statements are kept as is, while SELECT INTO TEMP statements are converted to SQLite native SQL CREATE TEMP TABLE AS SELECT ...

Important:
Simple Informix-style SQL statement creating temporary tables can be converted to a native SQL equivalent instruction. However, complex SQL statements such as SELECT .. INTO TEMP with subqueries may fail. In such cases, create a view from the complex query and then create the temp table from the view. Or, disable Informix emulation and use the native SQL syntax to create the temporary table (EXECUTE IMMEDIATE "/* fglhint_no_ifxemul */ …")

With Informix SQL, if the source table has a column defined as SERIAL or BIGSERIAL, a SELECT ... INTO TEMP will produce a new temp table with an auto-incremented serial column. With the SELECT … INTO TEMP emulation for non-Informix databases, not using the native sequence generators (such as IDENTITY columns in SQL Server), the resulting temporary table will get a simple INTEGER or BIGINT column, instead of an auto-incremented column.

The general FGLPROFILE entry to control temporary table emulation is:
dbi.database.dsname.ifxemul.temptables = { true | false }

Temporary tables
Informix®
Informix temporary tables are created with the CREATE TEMP TABLE DDL instruction or with SELECT ... INTO TEMP statement:
CREATE TEMP TABLE tt1 ( pkey INT, name VARCHAR(50) )
CREATE TEMP TABLE tt2 ( pkey INT, name VARCHAR(50) ) WITH NO LOG 
SELECT * FROM tab1 WHERE pkey > 100 INTO TEMP tt2
Temporary tables are automatically dropped when the SQL session ends, but they can also be dropped with the DROP TABLE command. There is no name conflict when several users create temporary tables with the same name.

BDL reports can create a temporary table when the rows are not sorted externally (by the source SQL statement).

Informix allows you to create indexes on temporary tables. No name conflict occurs when several users create an index on a temporary table by using the same index identifier.

When creating temporary tables in Informix, the WITH NO LOG clause can be used to avoid the overhead of recording DML operations in transaction logs.

SQLite
SQLite supports temporary tables with the CREATE TEMP TABLE statement:
CREATE TEMP TABLE mytt1 ( pkey INT, name VARCHAR(50) )
CREATE TEMP TABLE mytt2 AS SELECT * FROM source
Solution
Informix CREATE TEMP TABLE statements are kept as is, while SELECT INTO TEMP statements are converted to SQLite native SQL CREATE TEMP TABLE AS SELECT ...

Important:
Simple Informix-style SQL statement creating temporary tables can be converted to a native SQL equivalent instruction. However, complex SQL statements such as SELECT .. INTO TEMP with subqueries may fail. In such cases, create a view from the complex query and then create the temp table from the view. Or, disable Informix emulation and use the native SQL syntax to create the temporary table (EXECUTE IMMEDIATE "/* fglhint_no_ifxemul */ …")

With Informix SQL, if the source table has a column defined as SERIAL or BIGSERIAL, a SELECT ... INTO TEMP will produce a new temp table with an auto-incremented serial column. With the SELECT … INTO TEMP emulation for non-Informix databases, not using the native sequence generators (such as IDENTITY columns in SQL Server), the resulting temporary table will get a simple INTEGER or BIGINT column, instead of an auto-incremented column.

The general FGLPROFILE entry to control temporary table emulation is:
dbi.database.dsname.ifxemul.temptables = { true | false }

Substrings in SQL
Informix®
Informix SQL statements can use subscripts on columns defined with the character data type:

SELECT ... FROM tab1 WHERE col1[2,3] = 'RO'
SELECT ... FROM tab1 WHERE col1[10] = 'R' -- Same as col1[10,10]
UPDATE tab1 SET col1[2,3] = 'RO' WHERE ...
SELECT ... FROM tab1 ORDER BY col1[1,3]
Important:
With other database servers than Informix, when the subscript notation is used to modify column values in UPDATE statement, or as ORDER BY element, you will get and SQL error:
UPDATE tab1 SET col1[2,3] = 'RO' WHERE ...
SELECT ... FROM tab1 ORDER BY col1[1,3]
Informix SQL provides a various set of substring functions:
SUBSTR( str-expr, start-pos [, length ] )
SUBSTRB( str-expr, start-pos [, length ] )
SUBSTRING( str-expr FROM start-pos [FOR length ] )
SUBSTRING_INDEX( str-expr, delimiter, count )
SQLite
SQLite provides the SUBSTR(expr, start, length) function, to extract a substring from a string expression:

SELECT SUBSTR(col,10,5) ... 
Solution
Replace all Informix col[x,y] right-value expressions by SUBSTR(col,x,y-x+1).

Rewrite UPDATE and ORDER BY clauses using col[x,y] expressions.

The Informix substring functions SUBSTR(), SUBSTRB(), SUBSTRING() and SUBSTRING_INDEX() are not converted by the ODI driver.

The translation of col[x,y] expressions can be controlled with the following FGLPROFILE entry:
dbi.database.dsname.ifxemul.colsubs = { true | false }

The LENGTH() function
Informix®
Informix provides the LENGTH() function to count the number of bytes of a character string expression:

SELECT LENGTH("aaa"), LENGTH(col1) FROM table 
Informix LENGTH() does not count the trailing blanks for CHAR or VARCHAR expressions, while SQLite counts the trailing blanks.

Informix LENGTH() returns 0 when the given string is empty. That means, LENGTH('')=0.

SQLite
SQLite supports the LENGTH() function, but there are some differences with Informix LENGTH().

The SQLite LENGTH() function counts trailing blanks. When using a CHAR column, values are blank padded, and the function returns the size of the CHAR column. When using a VARCHAR column, trailing blanks are significant, and the function returns the number of characters, including trailing blanks.

When passing NULL as parameter, the SQLite LENGTH() function returns NULL.

Solution
The SQL LENGTH() function name can be used with SQLite.

Check if the trailing blanks are significant when using the LENGTH() SQL function in your application.

To count the number of characters by ignoring the trailing blanks, you must use the RTRIM() function:
SELECT LENGTH(RTRIM(col1)) FROM table

Row limiting clause
Informix®
Informix SQL supports the SKIP and FIRST/LIMIT keywords to limit the number of rows of a result set:

SELECT SKIP 10 FIRST 20 customer.* FROM customer ... ORDER BY cust_name
This Informix SQL syntax is not portable.

Recent database engines support the row limiting clause syntax defined by the SQL standard:
SELECT ... OFFSET n ROWS FETCH FIRST m ROWS ONLY
This should be the prefered syntax to be used, if all target database types support this SELECT clause.

The ODI database drivers can convert the Informix SQL SKIP/FIRST row limiting clause to a native SQL equivalent, if the row limiting clause parameters are simple integer literals (the clause is not translated when using SQL parameters / program variables).
Important:
In addition to the SKIP/FIRST clause of the projection clause, Informix SQL supports also a LIMIT clause after the ORDER BY clause:
SELECT customer.* FROM customer ... ORDER BY cust_name LIMIT 10
This Informix SQL syntax construction is not converted by the ODI drivers. To benefit from the conversion, review the code to use the Informix SQL SKIP/FIRST clause instead.
SQLite
SQLite supports the following row limiting clause:
SELECT ... ORDER BY ... LIMIT m [ OFFSET n ]
Solution
The Informix SQL row limiting clause can be converted by the SQLite driver to the native SQL equivalent clause, when the parameters are simple integer literals.

Note:
Row limiting clauses using SQL parameters will not be converted: The SKIP and FIRST keywords must be followed by an integer constaint.
When using nested SQL queries, only the row limiting clause of the main SELECT will be converted. The row limiting clauses in subqueries will not be converted.
The translation of the Informix SQL row limiting clause can be controlled with the following FGLPROFILE entry:
dbi.database.dsname.ifxemul.rowlimiting = { true | false }

BDL programming
SQLite related programming topics.

INSERT cursors
SELECT … FOR UPDATE
Cursors WITH HOLD
UPDATE/DELETE … WHERE CURRENT OF
LOAD and UNLOAD
SQL Interruption
Scrollable cursors
Modifying many rows in a table
Optimizing database file usage
Drop table limitation



INSERT cursors
Informix®
Informix provides insert cursors to optimize row creation in a database. An insert cursor is declared as a cursor, and rows as added with the PUT instruction. The rows are buffered and sent to the database server when executing a FLUSH instruction, or when the cursor is closed with CLOSE. When using transactions in Informix, the OPEN, PUT and FLUSH instructions must be executed within a transaction block.

DECLARE c1 CURSOR FOR INSERT INTO tab1 ...
BEGIN WORK
OPEN c1
WHILE ...
   PUT c1 USING var-list
END WHILE
CLOSE c1
COMMIT WORK
SQLite
SQLite does not support insert cursors.

Solution
Insert cursors are emulated by the database interface, using basic INSERT SQL instructions.

The performances might be not as good as with Informix, but the feature is fully supported.

SELECT … FOR UPDATE
Informix®
Legacy BDL programs typically use a cursor with SELECT FOR UPDATE to implement pessimistic locking and avoid several users editing the same rows:

DECLARE cc CURSOR FOR
SELECT ... FROM tab WHERE ... FOR UPDATE
OPEN cc
FETCH cc <-- lock is acquired
...
CLOSE cc <-- lock is released
The row must be fetched in order to set the lock.

If the cursor is local to a transaction, the lock is released when the transaction ends. If the cursor is declared WITH HOLD, the lock is released when the cursor is closed.

Informix provides the SET LOCK MODE instruction to define the lock wait timeout:
SET LOCK MODE TO { WAIT | NOT WAIT | WAIT seconds }
The default mode is NOT WAIT.
SQLite
SQLite does not support the FOR UPDATE close in SELECT syntax.


Cursors WITH HOLD
Informix®
Informix closes opened cursors automatically when a transaction ends, unless the WITH HOLD option is used in the DECLARE instruction:
DECLARE c1 CURSOR WITH HOLD FOR SELECT ...
OPEN c1
BEGIN WORK
FETCH c1 ...
COMMIT WORK
FETCH c1 ...
CLOSE c1
SQLite
SQLite does not close cursors when a transaction ends.

SQLite does not support the FOR UPDATE close in SELECT syntax: Therefore, there cannot be a combination of WITH HOLD + SELECT … FOR UPDATE.

Solution
BDL cursors declared WITH HOLD remain open even after terminating a transaction with a COMMIT WORK or ROLLBACK WORK.

For consistency with other database brands, database cursors that are not declared WITH HOLD are automatically closed, when a COMMIT WORK or ROLLBACK WORK is performed.

Important:
Opening a WITH HOLD cursor declared with a SELECT FOR UPDATE results in an SQL error; in the same conditions, this does not normally appear with Informix. Review the program logic in order to find another way to set locks.





















Comparing GUID and uniqueidentifier Values

Summarize this article for me
The globally unique identifier (GUID) data type in SQL Server is represented by the uniqueidentifier data type, which stores a 16-byte binary value. A GUID is a binary number, and its main use is as an identifier that must be unique in a network that has many computers at many sites. GUIDs can be generated by calling the Transact-SQL NEWID function, and is guaranteed to be unique throughout the world. For more information, see uniqueidentifier (Transact-SQL).

Working with SqlGuid Values
Because GUIDs values are long and obscure, they are not meaningful for users. If randomly generated GUIDs are used for key values and you insert a lot of rows, you get random I/O into your indexes, which can negatively impact performance. GUIDs are also relatively large when compared to other data types. In general we recommend using GUIDs only for very narrow scenarios for which no other data type is suitable.

Comparing GUID Values
Comparison operators can be used with uniqueidentifier values. However, ordering is not implemented by comparing the bit patterns of the two values. The only operations that are allowed against a uniqueidentifier value are comparisons (=, <>, <, >, <=, >=) and checking for NULL (IS NULL and IS NOT NULL). No other arithmetic operators are allowed.

Both Guid and SqlGuid have a CompareTo method for comparing different GUID values. However, System.Guid.CompareTo and SqlTypes.SqlGuid.CompareTo are implemented differently. SqlGuid implements CompareTo using SQL Server behavior, in the last six bytes of a value are most significant. Guid evaluates all 16 bytes. The following example demonstrates this behavioral difference. The first section of code displays unsorted Guid values, and the second section of code shows the sorted Guid values. The third section shows the sorted SqlGuid values. The output is displayed beneath the code listing.

C#
static void WorkWithGuids()
{
    // Create an ArrayList and fill it with Guid values.
    ArrayList guidList = new()
    {
        new Guid("3AAAAAAA-BBBB-CCCC-DDDD-2EEEEEEEEEEE"),
        new Guid("2AAAAAAA-BBBB-CCCC-DDDD-1EEEEEEEEEEE"),
        new Guid("1AAAAAAA-BBBB-CCCC-DDDD-3EEEEEEEEEEE")
    };

    // Display the unsorted Guid values.
    Console.WriteLine("Unsorted Guids:");
    foreach (Guid guidValue in guidList)
    {
        Console.WriteLine($" {guidValue}");
    }
    Console.WriteLine("");

    // Sort the Guids.
    guidList.Sort();

    // Display the sorted Guid values.
    Console.WriteLine("Sorted Guids:");
    foreach (Guid guidSorted in guidList)
    {
        Console.WriteLine($" {guidSorted}");
    }
    Console.WriteLine("");

    // Create an ArrayList of SqlGuids.
    ArrayList sqlGuidList = new()
    {
        new SqlGuid("3AAAAAAA-BBBB-CCCC-DDDD-2EEEEEEEEEEE"),
        new SqlGuid("2AAAAAAA-BBBB-CCCC-DDDD-1EEEEEEEEEEE"),
        new SqlGuid("1AAAAAAA-BBBB-CCCC-DDDD-3EEEEEEEEEEE")
    };

    // Sort the SqlGuids. The unsorted SqlGuids are in the same order
    // as the unsorted Guid values.
    sqlGuidList.Sort();

    // Display the sorted SqlGuids. The sorted SqlGuid values are ordered
    // differently than the Guid values.
    Console.WriteLine("Sorted SqlGuids:");
    foreach (SqlGuid sqlGuidValue in sqlGuidList)
    {
        Console.WriteLine($" {sqlGuidValue}");
    }
}
This example produces the following results.

Output
Unsorted Guids:  
3aaaaaaa-bbbb-cccc-dddd-2eeeeeeeeeee  
2aaaaaaa-bbbb-cccc-dddd-1eeeeeeeeeee  
1aaaaaaa-bbbb-cccc-dddd-3eeeeeeeeeee  
  
Sorted Guids:  
1aaaaaaa-bbbb-cccc-dddd-3eeeeeeeeeee  
2aaaaaaa-bbbb-cccc-dddd-1eeeeeeeeeee  
3aaaaaaa-bbbb-cccc-dddd-2eeeeeeeeeee  
  
Sorted SqlGuids:  
2aaaaaaa-bbbb-cccc-dddd-1eeeeeeeeeee  
3aaaaaaa-bbbb-cccc-dddd-2eeeeeeeeeee  
1aaaaaaa-bbbb-cccc-dddd-3eeeeeeeeeee  


SQL Server data type	Type (in System.Data.SqlTypes or Microsoft.SqlServer.Types)	CLR data type (.NET Framework)
bigint	SqlInt64	Int64, Nullable<Int64>
binary	SqlBytes, SqlBinary	Byte[]
bit	SqlBoolean	Boolean, Nullable<Boolean>
char	None	None
cursor	None	None
date	SqlDateTime	DateTime, Nullable<DateTime>
datetime	SqlDateTime	DateTime, Nullable<DateTime>
datetime2	None	DateTime, Nullable<DateTime>
datetimeoffset	None	DateTimeOffset, Nullable<DateTimeOffset>
decimal	SqlDecimal	Decimal, Nullable<Decimal>
float	SqlDouble	Double, Nullable<Double>
geography	SqlGeography 1	None
geometry	SqlGeometry 1	None
hierarchyid	SqlHierarchyId 1	None
image	None	None
int	SqlInt32	Int32, Nullable<Int32>
money	SqlMoney	Decimal, Nullable<Decimal>
nchar	SqlChars, SqlString	String, Char[]
ntext	None	None
numeric	SqlDecimal	Decimal, Nullable<Decimal>
nvarchar	SqlChars, SqlString

SQLChars is a better match for data transfer and access, and SQLString is a better match for performing String operations.	String, Char[]
nvarchar(1), nchar(1)	SqlChars, SqlString	Char, String, Char[], Nullable<char>
real	SqlSingle (however, the range of SqlSingle is larger than real)	Single, Nullable<Single>
rowversion	None	Byte[]
smallint	SqlInt16	Int16, Nullable<Int16>
smallmoney	SqlMoney	Decimal, Nullable<Decimal>
sql_variant	None	Object
table	None	None
text	None	None
time	None	TimeSpan, Nullable<TimeSpan>
timestamp	None	None
tinyint	SqlByte	Byte, Nullable<Byte>
uniqueidentifier	SqlGuid	Guid, Nullable<Guid>
User-defined type (UDT)	None	The same class that is bound to the user-defined type in the same assembly or a dependent assembly.
varbinary	SqlBytes, SqlBinary	Byte[]
varbinary(1), binary(1)	SqlBytes, SqlBinary	byte, Byte[], Nullable<byte>
varchar	None	None
xml	SqlXml	None




SQL Server Database Engine type	.NET Framework type	SqlDbType enumeration	SqlDataReader SqlTypes typed accessor	DbType enumeration	SqlDataReader DbType typed accessor
bigint	Int64	BigInt	GetSqlInt64	Int64	GetInt64
binary	Byte[]	VarBinary	GetSqlBinary	Binary	GetBytes
bit	Boolean	Bit	GetSqlBoolean	Boolean	GetBoolean
char	String

Char[]	Char	GetSqlString	AnsiStringFixedLength,

String	GetString

GetChars
date 1

(SQL Server 2008 and later)	DateTime	Date 1	GetSqlDateTime	Date 1	GetDateTime
datetime	DateTime	DateTime	GetSqlDateTime	DateTime	GetDateTime
datetime2

(SQL Server 2008 and later)	DateTime	DateTime2	None	DateTime2	GetDateTime
datetimeoffset

(SQL Server 2008 and later)	DateTimeOffset	DateTimeOffset	none	DateTimeOffset	GetDateTimeOffset
decimal	Decimal	Decimal	GetSqlDecimal	Decimal	GetDecimal
FILESTREAM attribute (varbinary(max))	Byte[]	VarBinary	GetSqlBytes	Binary	GetBytes
float	Double	Float	GetSqlDouble	Double	GetDouble
image	Byte[]	Binary	GetSqlBinary	Binary	GetBytes
int	Int32	Int	GetSqlInt32	Int32	GetInt32
money	Decimal	Money	GetSqlMoney	Decimal	GetDecimal
nchar	String

Char[]	NChar	GetSqlString	StringFixedLength	GetString

GetChars
ntext	String

Char[]	NText	GetSqlString	String	GetString

GetChars
numeric	Decimal	Decimal	GetSqlDecimal	Decimal	GetDecimal
nvarchar	String

Char[]	NVarChar	GetSqlString	String	GetString

GetChars
real	Single	Real	GetSqlSingle	Single	GetFloat
rowversion	Byte[]	Timestamp	GetSqlBinary	Binary	GetBytes
smalldatetime	DateTime	DateTime	GetSqlDateTime	DateTime	GetDateTime
smallint	Int16	SmallInt	GetSqlInt16	Int16	GetInt16
smallmoney	Decimal	SmallMoney	GetSqlMoney	Decimal	GetDecimal
sql_variant	Object 2	Variant	GetSqlValue 2	Object	GetValue 2
text	String

Char[]	Text	GetSqlString	String	GetString

GetChars
time

(SQL Server 2008 and later)	TimeSpan	Time	none	Time	GetTimeSpan
timestamp	Byte[]	Timestamp	GetSqlBinary	Binary	GetBytes
tinyint	Byte	TinyInt	GetSqlByte	Byte	GetByte
uniqueidentifier	Guid	UniqueIdentifier	GetSqlGuid	Guid	GetGuid
varbinary	Byte[]	VarBinary	GetSqlBinary	Binary	GetBytes
varchar	String

Char[]	VarChar	GetSqlString	AnsiString, String	GetString

GetChars
xml	Xml	Xml	GetSqlXml	Xml	none


