'use client'

import React from 'react'
import GraphERD from '@/components/GraphERD'
import DashboardLayout from '@/components/layout/DashboardLayout'

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

export default function ERDDemoPage() {
  return (
    <DashboardLayout title="ERD Graph Demo" subtitle="Interactive Entity Relationship Diagram">
      {/* Stats */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
          <div className="text-2xl font-bold text-indigo-400">{mainTable.columns.length}</div>
          <div className="text-xs text-slate-400">Columns</div>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
          <div className="text-2xl font-bold text-purple-400">{relationships.length}</div>
          <div className="text-xs text-slate-400">Foreign Keys</div>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
          <div className="text-2xl font-bold text-green-400">2</div>
          <div className="text-xs text-slate-400">Resolved</div>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
          <div className="text-2xl font-bold text-red-400">2</div>
          <div className="text-xs text-slate-400">Missing</div>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
          <div className="text-2xl font-bold text-amber-400">50%</div>
          <div className="text-xs text-slate-400">Resolution</div>
        </div>
      </div>

      {/* ERD Graph */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden mb-6">
        <GraphERD
          mainTable={mainTable}
          relatedTables={relatedTables}
          relationships={relationships}
        />
      </div>

      {/* Column Details Table */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-700">
          <h2 className="font-semibold text-white">Column Details</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-700/50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-semibold text-slate-400">#</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-slate-400">Column</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-slate-400">Data Type</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-slate-400">Key</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-slate-400">References</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-slate-400">Status</th>
            </tr>
          </thead>
          <tbody>
            {mainTable.columns.map((col, idx) => {
              const fk = relationships.find(r => r.column === col.name)
              return (
                <tr key={idx} className={col.isForeignKey ? 'bg-amber-500/5' : ''}>
                  <td className="px-4 py-2 text-slate-500">{idx + 1}</td>
                  <td className="px-4 py-2 font-medium text-white">{col.name}</td>
                  <td className="px-4 py-2 font-mono text-slate-400">{col.dataType}</td>
                  <td className="px-4 py-2">
                    {col.isPrimaryKey && (
                      <span className="inline-block px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 text-xs font-medium mr-1">PK</span>
                    )}
                    {col.isForeignKey && (
                      <span className="inline-block px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 text-xs font-medium">FK</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-slate-400">{fk ? `${fk.to}.Id` : '—'}</td>
                  <td className="px-4 py-2">
                    {fk && (
                      fk.isMissing
                        ? <span className="inline-block px-2 py-0.5 rounded bg-red-500/20 text-red-400 text-xs">Missing</span>
                        : <span className="inline-block px-2 py-0.5 rounded bg-green-500/20 text-green-400 text-xs">Resolved</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  )
}
