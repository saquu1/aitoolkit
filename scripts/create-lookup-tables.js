/**
 * Create minimal lookup tables for the project
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const projectId = 'cmmtztnf90000p680l9xcj0ol';

const lookupTables = [
  {
    tableName: 'OrganizationType',
    columns: [
      { name: 'Id', dataType: 'INT', isPrimaryKey: true, isIdentity: true, isNullable: false },
      { name: 'Name', dataType: 'NVARCHAR(100)', isNullable: false },
      { name: 'Code', dataType: 'VARCHAR(20)', isNullable: false },
      { name: 'Description', dataType: 'NVARCHAR(500)', isNullable: true },
      { name: 'SortOrder', dataType: 'INT', isNullable: true },
      { name: 'IsActive', dataType: 'BIT', isNullable: false, defaultValue: '1' }
    ]
  },
  {
    tableName: 'Country',
    columns: [
      { name: 'Id', dataType: 'INT', isPrimaryKey: true, isIdentity: true, isNullable: false },
      { name: 'Name', dataType: 'NVARCHAR(100)', isNullable: false },
      { name: 'CountryCode', dataType: 'VARCHAR(10)', isNullable: false },
      { name: 'ISOCode', dataType: 'VARCHAR(3)', isNullable: true },
      { name: 'PhoneCode', dataType: 'VARCHAR(10)', isNullable: true },
      { name: 'Currency', dataType: 'VARCHAR(10)', isNullable: true },
      { name: 'IsActive', dataType: 'BIT', isNullable: false, defaultValue: '1' }
    ]
  },
  {
    tableName: 'Province',
    columns: [
      { name: 'Id', dataType: 'INT', isPrimaryKey: true, isIdentity: true, isNullable: false },
      { name: 'Name', dataType: 'NVARCHAR(100)', isNullable: false },
      { name: 'Code', dataType: 'VARCHAR(20)', isNullable: true },
      { name: 'CountryId', dataType: 'INT', isNullable: false, isFK: true, fkTable: 'Country' },
      { name: 'IsActive', dataType: 'BIT', isNullable: false, defaultValue: '1' }
    ],
    foreignKeys: [
      { columnName: 'CountryId', referencesTable: 'Country', referencesColumn: 'Id' }
    ]
  },
  {
    tableName: 'State',
    columns: [
      { name: 'Id', dataType: 'INT', isPrimaryKey: true, isIdentity: true, isNullable: false },
      { name: 'Name', dataType: 'NVARCHAR(100)', isNullable: false },
      { name: 'Code', dataType: 'VARCHAR(20)', isNullable: true },
      { name: 'CountryId', dataType: 'INT', isNullable: false, isFK: true, fkTable: 'Country' },
      { name: 'IsActive', dataType: 'BIT', isNullable: false, defaultValue: '1' }
    ],
    foreignKeys: [
      { columnName: 'CountryId', referencesTable: 'Country', referencesColumn: 'Id' }
    ]
  },
  {
    tableName: 'City',
    columns: [
      { name: 'Id', dataType: 'INT', isPrimaryKey: true, isIdentity: true, isNullable: false },
      { name: 'Name', dataType: 'NVARCHAR(100)', isNullable: false },
      { name: 'Code', dataType: 'VARCHAR(20)', isNullable: true },
      { name: 'ProvinceId', dataType: 'INT', isNullable: true, isFK: true, fkTable: 'Province' },
      { name: 'StateId', dataType: 'INT', isNullable: true, isFK: true, fkTable: 'State' },
      { name: 'PostalCode', dataType: 'VARCHAR(20)', isNullable: true },
      { name: 'IsActive', dataType: 'BIT', isNullable: false, defaultValue: '1' }
    ],
    foreignKeys: [
      { columnName: 'ProvinceId', referencesTable: 'Province', referencesColumn: 'Id' },
      { columnName: 'StateId', referencesTable: 'State', referencesColumn: 'Id' }
    ]
  }
];

async function createLookupTables() {
  console.log('Creating lookup tables...\n');

  for (const table of lookupTables) {
    try {
      await prisma.toolkitTable.create({
        data: {
          id: `lookup-${table.tableName.toLowerCase()}-${Date.now()}`,
          projectId,
          tableName: table.tableName,
          schemaName: 'dbo',
          columns: JSON.stringify(table.columns),
          foreignKeys: JSON.stringify(table.foreignKeys || []),
          indexes: '[]',
          constraints: '[]',
          sourceDDL: `-- Lookup Table: ${table.tableName}`,
          status: 'complete',
          linkedModule: 'Lookup',
          updatedAt: new Date()
        }
      });
      console.log('Created:', table.tableName);
    } catch (e) {
      if (e.code === 'P2002') {
        await prisma.toolkitTable.update({
          where: { projectId_tableName: { projectId, tableName: table.tableName } },
          data: {
            columns: JSON.stringify(table.columns),
            foreignKeys: JSON.stringify(table.foreignKeys || []),
            status: 'complete',
            linkedModule: 'Lookup',
            updatedAt: new Date()
          }
        });
        console.log('Updated:', table.tableName);
      } else {
        console.error('Error:', table.tableName, e.message);
      }
    }
  }

  const count = await prisma.toolkitTable.count({ where: { projectId } });
  console.log('\nTotal tables:', count);

  await prisma.$disconnect();
}

createLookupTables();
