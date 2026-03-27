'use client'

import React from 'react'
import GraphERD from '@/components/GraphERD'

// Organizations table data
const mainTable = {
  name: 'Organizations',
  columns: [
    { name: 'Id', dataType: 'UNIQUEIDENTIFIER', isPrimaryKey: true, isForeignKey: false },
    { name: 'Name', dataType: 'NVARCHAR(200)', isPrimaryKey: false, isForeignKey: false },
    { name: 'Email', dataType: 'NVARCHAR(100)', isPrimaryKey: false, isForeignKey: false },
    { name: 'CountryId', dataType: 'UNIQUEIDENTIFIER', isPrimaryKey: false, isForeignKey: true },
    { name: 'CityId', dataType: 'UNIQUEIDENTIFIER', isPrimaryKey: false, isForeignKey: true },
    { name: 'OrgTypeId', dataType: 'UNIQUEIDENTIFIER', isPrimaryKey: false, isForeignKey: true },
    { name: 'OrgCatId', dataType: 'UNIQUEIDENTIFIER', isPrimaryKey: false, isForeignKey: true },
    { name: 'IsActive', dataType: 'BIT', isPrimaryKey: false, isForeignKey: false },
    { name: 'CreatedOn', dataType: 'DATETIME', isPrimaryKey: false, isForeignKey: false },
    { name: 'ModifiedOn', dataType: 'DATETIME', isPrimaryKey: false, isForeignKey: false },
  ],
}

const relatedTables = [
  { name: 'Countries', columns: [{ name: 'Id', dataType: 'UUID', isPrimaryKey: true }], status: 'missing' as const },
  { name: 'Cities', columns: [{ name: 'Id', dataType: 'UUID', isPrimaryKey: true }], status: 'missing' as const },
  { name: 'OrganizationTypes', columns: [
    { name: 'Id', dataType: 'UUID', isPrimaryKey: true },
    { name: 'Name', dataType: 'NVARCHAR', isPrimaryKey: false },
  ], status: 'resolved' as const },
  { name: 'OrganizationCategories', columns: [
    { name: 'Id', dataType: 'UUID', isPrimaryKey: true },
    { name: 'Name', dataType: 'NVARCHAR', isPrimaryKey: false },
  ], status: 'resolved' as const },
]

const relationships = [
  { from: 'Organizations', to: 'Countries', column: 'CountryId', isMissing: true },
  { from: 'Organizations', to: 'Cities', column: 'CityId', isMissing: true },
  { from: 'Organizations', to: 'OrganizationTypes', column: 'OrgTypeId', isMissing: false },
  { from: 'Organizations', to: 'OrganizationCategories', column: 'OrgCatId', isMissing: false },
]

export default function OrganizationsERD() {
  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800">Organizations Table ERD</h1>
          <p className="text-slate-600">Entity Relationship Diagram with FK dependencies</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-5 gap-3 mb-6">
          <div className="bg-white rounded-lg p-4 border shadow-sm">
            <div className="text-2xl font-bold text-indigo-600">{mainTable.columns.length}</div>
            <div className="text-xs text-slate-500">Columns</div>
          </div>
          <div className="bg-white rounded-lg p-4 border shadow-sm">
            <div className="text-2xl font-bold text-purple-600">{relationships.length}</div>
            <div className="text-xs text-slate-500">Foreign Keys</div>
          </div>
          <div className="bg-white rounded-lg p-4 border shadow-sm">
            <div className="text-2xl font-bold text-green-600">2</div>
            <div className="text-xs text-slate-500">Resolved</div>
          </div>
          <div className="bg-white rounded-lg p-4 border shadow-sm">
            <div className="text-2xl font-bold text-red-500">2</div>
            <div className="text-xs text-slate-500">Missing</div>
          </div>
          <div className="bg-white rounded-lg p-4 border shadow-sm">
            <div className="text-2xl font-bold text-amber-500">50%</div>
            <div className="text-xs text-slate-500">Resolution</div>
          </div>
        </div>

        {/* ERD Graph */}
        <div className="bg-white rounded-xl shadow-lg border overflow-hidden mb-6">
          <GraphERD
            mainTable={mainTable}
            relatedTables={relatedTables}
            relationships={relationships}
          />
        </div>

        {/* Column Details Table */}
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b">
            <h2 className="font-semibold text-slate-700">Column Details</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500">#</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500">Column</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500">Data Type</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500">Key</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500">References</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500">Status</th>
              </tr>
            </thead>
            <tbody>
              {mainTable.columns.map((col, idx) => {
                const fk = relationships.find(r => r.column === col.name)
                return (
                  <tr key={idx} className={col.isForeignKey ? 'bg-amber-50' : ''}>
                    <td className="px-4 py-2 text-slate-500">{idx + 1}</td>
                    <td className="px-4 py-2 font-medium text-slate-800">{col.name}</td>
                    <td className="px-4 py-2 font-mono text-slate-600">{col.dataType}</td>
                    <td className="px-4 py-2">
                      {col.isPrimaryKey && (
                        <span className="inline-block px-2 py-0.5 rounded bg-amber-100 text-amber-700 text-xs font-medium mr-1">PK</span>
                      )}
                      {col.isForeignKey && (
                        <span className="inline-block px-2 py-0.5 rounded bg-purple-100 text-purple-700 text-xs font-medium">FK</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-slate-600">{fk ? `${fk.to}.Id` : '—'}</td>
                    <td className="px-4 py-2">
                      {fk && (
                        fk.isMissing
                          ? <span className="inline-block px-2 py-0.5 rounded bg-red-100 text-red-700 text-xs">Missing</span>
                          : <span className="inline-block px-2 py-0.5 rounded bg-green-100 text-green-700 text-xs">Resolved</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
