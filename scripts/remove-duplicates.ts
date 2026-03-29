import { prisma } from '../src/lib/db';

async function removeDuplicates() {
  console.log('\n=== REMOVING EXACT DUPLICATE RAW DATA ===\n');

  // 1. Get all raw imports ordered by import time
  const rawRecords = await prisma.$queryRaw<{ id: string; rawJson: string; importedAt: Date }[]>`
    SELECT id, rawJson, importedAt FROM RawImportData ORDER BY importedAt ASC
  `;

  console.log(`Total RawImportData records: ${rawRecords.length}`);

  // 2. Analyze which imports to keep vs remove
  const importsToKeep = new Set<string>();
  const importsToRemove = new Set<string>();
  const messageKeysSeen = new Set<string>();

  for (const raw of rawRecords) {
    if (!raw.rawJson) continue;
    
    try {
      const parsed = JSON.parse(raw.rawJson);
      if (!parsed.data) continue;

      const rawId = raw.id;
      const keysInThisImport: string[] = [];

      for (const msgId of Object.keys(parsed.data)) {
        const msg = parsed.data[msgId];
        const parentId = msg.parent_id || msg.parentId || 'NULL';
        const childrenIds = (msg.childrenIds || []).sort().join(',');
        const exactKey = `${msgId}|${parentId}|${childrenIds}`;
        keysInThisImport.push(exactKey);
      }

      // Check if ALL messages in this import are already seen
      const allAlreadySeen = keysInThisImport.length > 0 && keysInThisImport.every(k => messageKeysSeen.has(k));

      if (allAlreadySeen) {
        importsToRemove.add(rawId);
      } else {
        importsToKeep.add(rawId);
        for (const k of keysInThisImport) {
          messageKeysSeen.add(k);
        }
      }
    } catch (e) {}
  }

  console.log(`\nImports to KEEP:    ${importsToKeep.size}`);
  console.log(`Imports to REMOVE:  ${importsToRemove.size}`);

  // 3. Delete duplicates
  if (importsToRemove.size > 0) {
    console.log('\nDeleting duplicate records...');
    
    const idsArray = [...importsToRemove];
    let deleted = 0;

    for (const id of idsArray) {
      try {
        // Delete related ChatLog records
        await prisma.$executeRawUnsafe(`DELETE FROM ChatLog WHERE rawDataId = ?`, id);
        
        // Delete related RawDataLink records (using correct column names)
        await prisma.$executeRawUnsafe(`DELETE FROM RawDataLink WHERE rawDataId = ?`, id);
        await prisma.$executeRawUnsafe(`DELETE FROM RawDataLink WHERE sourceRawDataId = ?`, id);
        
        // Delete the RawImportData
        await prisma.$executeRawUnsafe(`DELETE FROM RawImportData WHERE id = ?`, id);
        deleted++;
        
        if (deleted % 10 === 0) {
          console.log(`  Deleted ${deleted}/${importsToRemove.size}...`);
        }
      } catch (e) {
        console.log(`  Error deleting ${id}: ${e}`);
      }
    }

    console.log(`\n✓ Deleted ${deleted} duplicate records`);
  }

  // 4. Verify remaining
  const remaining = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*) as count FROM RawImportData
  `;
  
  console.log(`\nRemaining RawImportData records: ${remaining[0].count}`);

  // 5. Show remaining
  console.log('\nRemaining imports:');
  const keptImports = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM RawImportData ORDER BY importedAt ASC
  `;
  
  for (const imp of keptImports) {
    console.log(`  ✓ ${imp.id}`);
  }

  console.log('\n=== DONE ===');
  await prisma.$disconnect();
}

removeDuplicates().catch(console.error);
