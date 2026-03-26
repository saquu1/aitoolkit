'use client'

import React from 'react'
import VisualERD from './VisualERD'

// Sample Organizations table data
const organizationsTable = {
  tableName: 'Organizations',
  columns: [
    { name: 'Id', dataType: 'UNIQUEIDENTIFIER', isPrimaryKey: true, isNullable: false },
    { name: 'Name', dataType: 'NVARCHAR(200)', isPrimaryKey: false, isNullable: false },
    { name: 'Email', dataType: 'NVARCHAR(100)', isPrimaryKey: false, isNullable: true },
    { name: 'CountryId', dataType: 'UNIQUEIDENTIFIER', isPrimaryKey: false, isNullable: true },
    { name: 'CityId', dataType: 'UNIQUEIDENTIFIER', isPrimaryKey: false, isNullable: true },
    { name: 'OrgTypeId', dataType: 'UNIQUEIDENTIFIER', isPrimaryKey: false, isNullable: true },
    { name: 'OrgCatId', dataType: 'UNIQUEIDENTIFIER', isPrimaryKey: false, isNullable: true },
    { name: 'IsActive', dataType: 'BIT', isPrimaryKey: false, isNullable: false },
    { name: 'CreatedOn', dataType: 'DATETIME', isPrimaryKey: false, isNullable: false },
    { name: 'ModifiedOn', dataType: 'DATETIME', isPrimaryKey: false, isNullable: true },
  ],
  foreignKeys: [
    { columnName: 'CountryId', referencesTable: 'Countries', referencesColumn: 'Id' },
    { columnName: 'CityId', referencesTable: 'Cities', referencesColumn: 'Id' },
    { columnName: 'OrgTypeId', referencesTable: 'OrganizationTypes', referencesColumn: 'Id' },
    { columnName: 'OrgCatId', referencesTable: 'OrganizationCategories', referencesColumn: 'Id' },
  ],
}

const organizationTypesTable = {
  tableName: 'OrganizationTypes',
  columns: [
    { name: 'Id', dataType: 'UNIQUEIDENTIFIER', isPrimaryKey: true, isNullable: false },
    { name: 'Name', dataType: 'NVARCHAR(100)', isPrimaryKey: false, isNullable: false },
    { name: 'Code', dataType: 'NVARCHAR(20)', isPrimaryKey: false, isNullable: true },
    { name: 'IsActive', dataType: 'BIT', isPrimaryKey: false, isNullable: false },
  ],
  foreignKeys: [],
}

const organizationCategoriesTable = {
  tableName: 'OrganizationCategories',
  columns: [
    { name: 'Id', dataType: 'UNIQUEIDENTIFIER', isPrimaryKey: true, isNullable: false },
    { name: 'Name', dataType: 'NVARCHAR(100)', isPrimaryKey: false, isNullable: false },
    { name: 'Code', dataType: 'NVARCHAR(20)', isPrimaryKey: false, isNullable: true },
    { name: 'IsActive', dataType: 'BIT', isPrimaryKey: false, isNullable: false },
  ],
  foreignKeys: [],
}

// Demo tables including resolved ones
const demoTables = [
  organizationsTable,
  organizationTypesTable,
  organizationCategoriesTable,
]

export default function OrganizationERDDemo() {
  return (
    <div className="p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-4">
        Organizations Table ERD
      </h2>
      
      <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-2">Table Summary</h3>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-blue-700">Columns:</span>
            <span className="ml-2 font-medium">{organizationsTable.columns.length}</span>
          </div>
          <div>
            <span className="text-blue-700">Foreign Keys:</span>
            <span className="ml-2 font-medium">{organizationsTable.foreignKeys.length}</span>
          </div>
          <div>
            <span className="text-blue-700">FK Resolution:</span>
            <span className="ml-2 font-medium">2/4 (50%)</span>
          </div>
        </div>
      </div>
      
      <VisualERD 
        tables={demoTables} 
        width={1000} 
        height={400}
      />
      
      <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
        <h3 className="font-semibold text-yellow-900 mb-2">Missing Tables</h3>
        <p className="text-sm text-yellow-800">
          The following tables are referenced by Organizations but not yet uploaded:
        </p>
        <ul className="mt-2 space-y-1">
          <li className="flex items-center gap-2 text-sm">
            <span className="w-2 h-2 bg-red-500 rounded-full"></span>
            <span className="font-medium">Countries</span>
            <span className="text-gray-500">— referenced by CountryId</span>
          </li>
          <li className="flex items-center gap-2 text-sm">
            <span className="w-2 h-2 bg-red-500 rounded-full"></span>
            <span className="font-medium">Cities</span>
            <span className="text-gray-500">— referenced by CityId</span>
          </li>
        </ul>
      </div>
    </div>
  )
}
