'use client'

import React, { useState } from 'react'
import VisualERD from '@/components/VisualERD'
import DashboardLayout from '@/components/layout/DashboardLayout'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

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

export default function OrganizationsERDPage() {
  const [showMissing, setShowMissing] = useState(true)
  
  const displayTables = showMissing ? organizationsData : organizationsData.filter(t => t.tableName === 'Organizations')

  return (
    <DashboardLayout title="Organizations ERD" subtitle="Entity Relationship Diagram for Organizations table">
      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
          <div className="text-2xl font-bold text-blue-400">10</div>
          <div className="text-sm text-slate-400">Columns</div>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
          <div className="text-2xl font-bold text-purple-400">4</div>
          <div className="text-sm text-slate-400">Foreign Keys</div>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
          <div className="text-2xl font-bold text-green-400">2</div>
          <div className="text-sm text-slate-400">Resolved FKs</div>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
          <div className="text-2xl font-bold text-red-400">2</div>
          <div className="text-sm text-slate-400">Missing Tables</div>
        </div>
      </div>

      {/* Controls */}
      <div className="mb-4 flex items-center gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showMissing}
            onChange={(e) => setShowMissing(e.target.checked)}
            className="w-4 h-4 text-blue-600 rounded bg-slate-700 border-slate-600"
          />
          <span className="text-sm text-slate-300">Show resolved tables</span>
        </label>
      </div>

      {/* ERD Visualization */}
      <div className="bg-slate-800/50 rounded-lg border border-slate-700 overflow-hidden mb-6">
        <VisualERD 
          tables={displayTables}
          width={1000} 
          height={500}
        />
      </div>

      {/* FK Details Table */}
      <div className="bg-slate-800/50 rounded-lg border border-slate-700 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-700">
          <h3 className="font-semibold text-white">Foreign Key Details</h3>
        </div>
        <table className="min-w-full divide-y divide-slate-700">
          <thead className="bg-slate-700/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Column</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">References</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            <tr>
              <td className="px-4 py-3 text-sm font-medium text-white">CountryId</td>
              <td className="px-4 py-3 text-sm text-slate-400">Countries.Id</td>
              <td className="px-4 py-3">
                <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-red-500/20 text-red-400">
                  Missing Table
                </span>
              </td>
            </tr>
            <tr>
              <td className="px-4 py-3 text-sm font-medium text-white">CityId</td>
              <td className="px-4 py-3 text-sm text-slate-400">Cities.Id</td>
              <td className="px-4 py-3">
                <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-red-500/20 text-red-400">
                  Missing Table
                </span>
              </td>
            </tr>
            <tr>
              <td className="px-4 py-3 text-sm font-medium text-white">OrgTypeId</td>
              <td className="px-4 py-3 text-sm text-slate-400">OrganizationTypes.Id</td>
              <td className="px-4 py-3">
                <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-500/20 text-green-400">
                  Resolved
                </span>
              </td>
            </tr>
            <tr>
              <td className="px-4 py-3 text-sm font-medium text-white">OrgCatId</td>
              <td className="px-4 py-3 text-sm text-slate-400">OrganizationCategories.Id</td>
              <td className="px-4 py-3">
                <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-500/20 text-green-400">
                  Resolved
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  )
}
