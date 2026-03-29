'use client'

import React, { useState } from 'react'
import VisualERD from '@/components/VisualERD'

// Organizations table data based on uploaded schema
const organizationsData = [
  {
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
  },
  {
    tableName: 'OrganizationTypes',
    columns: [
      { name: 'Id', dataType: 'UNIQUEIDENTIFIER', isPrimaryKey: true, isNullable: false },
      { name: 'Name', dataType: 'NVARCHAR(100)', isPrimaryKey: false, isNullable: false },
      { name: 'Code', dataType: 'NVARCHAR(20)', isPrimaryKey: false, isNullable: true },
      { name: 'IsActive', dataType: 'BIT', isPrimaryKey: false, isNullable: false },
    ],
    foreignKeys: [],
  },
  {
    tableName: 'OrganizationCategories',
    columns: [
      { name: 'Id', dataType: 'UNIQUEIDENTIFIER', isPrimaryKey: true, isNullable: false },
      { name: 'Name', dataType: 'NVARCHAR(100)', isPrimaryKey: false, isNullable: false },
      { name: 'Code', dataType: 'NVARCHAR(20)', isPrimaryKey: false, isNullable: true },
      { name: 'IsActive', dataType: 'BIT', isPrimaryKey: false, isNullable: false },
    ],
    foreignKeys: [],
  },
]

export default function ERDPage() {
  const [showMissing, setShowMissing] = useState(true)
  
  const displayTables = showMissing ? organizationsData : organizationsData.filter(t => t.tableName === 'Organizations')

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Organizations Table ERD
          </h1>
          <p className="text-gray-600 mt-1">
            Visual Entity Relationship Diagram for the Organizations table
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <div className="text-2xl font-bold text-blue-600">10</div>
            <div className="text-sm text-gray-600">Columns</div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <div className="text-2xl font-bold text-purple-600">4</div>
            <div className="text-sm text-gray-600">Foreign Keys</div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <div className="text-2xl font-bold text-green-600">2</div>
            <div className="text-sm text-gray-600">Resolved FKs</div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <div className="text-2xl font-bold text-red-600">2</div>
            <div className="text-sm text-gray-600">Missing Tables</div>
          </div>
        </div>

        {/* Controls */}
        <div className="mb-4 flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showMissing}
              onChange={(e) => setShowMissing(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <span className="text-sm text-gray-700">Show resolved tables</span>
          </label>
        </div>

        {/* ERD Visualization */}
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
          <VisualERD 
            tables={displayTables}
            width={1000} 
            height={500}
          />
        </div>

        {/* FK Details Table */}
        <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Foreign Key Details</h3>
          </div>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Column</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">References</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              <tr>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">CountryId</td>
                <td className="px-4 py-3 text-sm text-gray-600">Countries.Id</td>
                <td className="px-4 py-3">
                  <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                    Missing Table
                  </span>
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">CityId</td>
                <td className="px-4 py-3 text-sm text-gray-600">Cities.Id</td>
                <td className="px-4 py-3">
                  <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                    Missing Table
                  </span>
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">OrgTypeId</td>
                <td className="px-4 py-3 text-sm text-gray-600">OrganizationTypes.Id</td>
                <td className="px-4 py-3">
                  <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                    Resolved
                  </span>
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">OrgCatId</td>
                <td className="px-4 py-3 text-sm text-gray-600">OrganizationCategories.Id</td>
                <td className="px-4 py-3">
                  <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                    Resolved
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
