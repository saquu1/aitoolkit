/**
 * Cleanup Duplicate CSHTML Views
 * 
 * This script removes duplicate CSHTML views from the database.
 * Run with: npx ts-node scripts/cleanup-duplicate-views.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function cleanupDuplicateViews() {
  console.log('Starting cleanup of duplicate CSHTML views...\n')
  
  // Find all views grouped by project
  const projects = await prisma.toolkitProject.findMany({
    select: { id: true, name: true }
  })
  
  let totalDuplicates = 0
  let totalDeleted = 0
  
  for (const project of projects) {
    // Get all views for this project
    const views = await prisma.cSHTMLAnalysisCache.findMany({
      where: { projectId: project.id },
      select: {
        id: true,
        viewName: true,
        title: true,
        modelName: true,
        fields: true,
        createdAt: true
      },
      orderBy: { createdAt: 'asc' }
    })
    
    // Group by normalized name (without .cshtml extension, case-insensitive)
    const groups = new Map<string, typeof views>()
    
    for (const view of views) {
      // Normalize: remove extension and convert to lowercase
      const normalizedName = view.viewName
        .toLowerCase()
        .replace(/\.cshtml$/i, '')
        .replace(/\.vbhtml$/i, '')
      
      const key = normalizedName
      if (!groups.has(key)) {
        groups.set(key, [])
      }
      groups.get(key)!.push(view)
    })
    
    // Find duplicates
    for (const [normalizedName, duplicates] of groups) {
      if (duplicates.length > 1) {
        totalDuplicates += duplicates.length - 1
        
        console.log(`\nProject: ${project.name}`)
        console.log(`Normalized name: "${normalizedName}"`)
        console.log(`Found ${duplicates.length} duplicates:`)
        
        for (const dup of duplicates) {
          const fieldCount = dup.fields ? JSON.parse(dup.fields as string).length : 0
          console.log(`  - ID: ${dup.id}`)
          console.log(`    viewName: "${dup.viewName}"`)
          console.log(`    title: "${dup.title || 'N/A'}"`)
          console.log(`    modelName: "${dup.modelName || 'N/A'}"`)
          console.log(`    fields: ${fieldCount}`)
          console.log(`    created: ${dup.createdAt}`)
        }
        
        // Keep the one with most fields, delete others
        duplicates.sort((a, b) => {
          const aFields = a.fields ? JSON.parse(a.fields as string).length : 0
          const bFields = b.fields ? JSON.parse(b.fields as string).length : 0
          return bFields - aFields
        })
        
        const toKeep = duplicates[0]
        const toDelete = duplicates.slice(1)
        
        console.log(`\n  Keeping: ${toKeep.viewName} (${JSON.parse(toKeep.fields as string).length} fields)`)
        
        for (const del of toDelete) {
          console.log(`  Deleting: ${del.viewName}`)
          await prisma.cSHTMLAnalysisCache.delete({
            where: { id: del.id }
          })
          totalDeleted++
        }
      }
    }
  }
  
  console.log('\n' + '='.repeat(50))
  console.log(`Total duplicates found: ${totalDuplicates}`)
  console.log(`Total deleted: ${totalDeleted}`)
  console.log('Cleanup complete!')
  
  await prisma.$disconnect()
}

// Run the cleanup
cleanupDuplicateViews().catch((error) => {
  console.error('Cleanup failed:', error)
  process.exit(1)
})
