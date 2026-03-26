import { prisma } from '../src/lib/db';

async function showDuplicateExamples() {
  console.log('\n=== DUPLICATE EXAMPLES ===\n');

  // Get all raw imports
  const rawRecords = await prisma.$queryRaw<{ id: string; rawJson: string }[]>`
    SELECT id, rawJson FROM RawImportData
  `;

  // Extract all messages
  interface MessageData {
    messageId: string;
    parentId: string;
    childrenIds: string;
    rawImportId: string;
    role: string;
    content: string;
  }

  const allMessages: MessageData[] = [];

  for (const raw of rawRecords) {
    if (!raw.rawJson) continue;
    try {
      const parsed = JSON.parse(raw.rawJson);
      if (parsed.data) {
        for (const msgId of Object.keys(parsed.data)) {
          const msg = parsed.data[msgId];
          allMessages.push({
            messageId: msgId,
            parentId: msg.parent_id || msg.parentId || 'NULL',
            childrenIds: (msg.childrenIds || []).sort().join(','),
            rawImportId: raw.id,
            role: msg.role || 'unknown',
            content: (msg.content || '').substring(0, 80).replace(/\n/g, ' ')
          });
        }
      }
    } catch (e) {}
  }

  // Group by message.id
  const byMessageId = new Map<string, MessageData[]>();
  for (const msg of allMessages) {
    if (!byMessageId.has(msg.messageId)) {
      byMessageId.set(msg.messageId, []);
    }
    byMessageId.get(msg.messageId)!.push(msg);
  }

  // ═══════════════════════════════════════════════════════════════
  // EXACT DUPLICATES - same message.id, parent_id, childrenIds
  // ═══════════════════════════════════════════════════════════════
  console.log('═'.repeat(80));
  console.log('EXAMPLE 1: EXACT DUPLICATES (same message.id + parent_id + childrenIds)');
  console.log('═'.repeat(80));
  console.log('\nThese are SAFE TO REMOVE - identical data imported multiple times\n');

  let exactDupCount = 0;
  for (const [msgId, copies] of byMessageId) {
    if (copies.length < 2) continue;
    
    // Check if ALL fields match
    const first = copies[0];
    const allMatch = copies.every(c => 
      c.parentId === first.parentId && 
      c.childrenIds === first.childrenIds
    );
    
    if (allMatch) {
      exactDupCount++;
      if (exactDupCount <= 3) {
        console.log(`\n📌 Message ID: ${msgId}`);
        console.log(`   Role: ${first.role}`);
        console.log(`   Content: "${first.content}..."`);
        console.log(`\n   ┌─────────────────────────────────────────────────────────┐`);
        console.log(`   │ parent_id:   ${first.parentId.substring(0, 40)}... │`);
        console.log(`   │ childrenIds: ${first.childrenIds.substring(0, 40)}... │`);
        console.log(`   └─────────────────────────────────────────────────────────┘`);
        console.log(`\n   Found in ${copies.length} imports (ALL IDENTICAL):`);
        
        for (let i = 0; i < copies.length; i++) {
          const marker = i === 0 ? '✓ KEEP' : '✗ REMOVE';
          console.log(`     [${marker}] ${copies[i].rawImportId}`);
        }
        console.log(`\n   ➜ Result: ${copies.length - 1} copies can be deleted`);
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // NOT DUPLICATES - same message.id but different parent_id or childrenIds
  // ═══════════════════════════════════════════════════════════════
  console.log('\n\n');
  console.log('═'.repeat(80));
  console.log('EXAMPLE 2: NOT DUPLICATES (same message.id BUT different parent_id/childrenIds)');
  console.log('═'.repeat(80));
  console.log('\nThese are DIFFERENT - conversation evolved, keep ALL\n');

  let notDupCount = 0;
  for (const [msgId, copies] of byMessageId) {
    if (copies.length < 2) continue;
    
    // Check if some fields DON'T match
    const first = copies[0];
    const hasDifference = copies.some(c => 
      c.parentId !== first.parentId || 
      c.childrenIds !== first.childrenIds
    );
    
    if (hasDifference) {
      notDupCount++;
      if (notDupCount <= 3) {
        console.log(`\n📌 Message ID: ${msgId}`);
        console.log(`   Role: ${copies[0].role}`);
        console.log(`   Content: "${copies[0].content.substring(0, 50)}..."`);
        console.log(`\n   Found in ${copies.length} imports with DIFFERENT connections:`);
        
        for (const copy of copies) {
          console.log(`\n   ┌─────────────────────────────────────────────────────────┐`);
          console.log(`   │ Import:      ${copy.rawImportId.substring(0, 20)}...         │`);
          console.log(`   │ parent_id:   ${copy.parentId.substring(0, 40)}... │`);
          console.log(`   │ childrenIds: ${copy.childrenIds.substring(0, 40)}... │`);
          console.log(`   └─────────────────────────────────────────────────────────┘`);
        }
        console.log(`\n   ➜ Result: KEEP ALL - these represent conversation at different times`);
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════════════════════════
  console.log('\n\n');
  console.log('═'.repeat(80));
  console.log('SUMMARY');
  console.log('═'.repeat(80));

  let totalExact = 0;
  let totalNotExact = 0;
  let recordsToRemove = 0;

  for (const [msgId, copies] of byMessageId) {
    if (copies.length < 2) continue;
    
    const first = copies[0];
    const allMatch = copies.every(c => 
      c.parentId === first.parentId && 
      c.childrenIds === first.childrenIds
    );
    
    if (allMatch) {
      totalExact++;
      recordsToRemove += copies.length - 1;
    } else {
      totalNotExact++;
    }
  }

  console.log(`
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DUPLICATE ANALYSIS RESULTS                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  EXACT DUPLICATES:                                                          │
│  └── ${totalExact} messages have identical (id + parent_id + childrenIds)
│  └── ${recordsToRemove} copies can be safely removed
│                                                                             │
│  NOT DUPLICATES (conversation evolved):                                     │
│  └── ${totalNotExact} messages have same ID but different connections
│  └── Keep ALL - these are conversation snapshots at different times
│                                                                             │
│  TOTAL RECORDS THAT CAN BE REMOVED: ${recordsToRemove}
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
`);

  await prisma.$disconnect();
}

showDuplicateExamples().catch(console.error);
