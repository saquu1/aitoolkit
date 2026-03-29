import { prisma } from '../src/lib/db';

async function showExamples() {
  console.log('\n=== DUPLICATE EXAMPLES ===\n');

  const rawRecords = await prisma.$queryRaw<{ id: string; rawJson: string }[]>`
    SELECT id, rawJson FROM RawImportData LIMIT 50
  `;

  interface Msg { messageId: string; parentId: string; childrenIds: string; rawImportId: string; role: string; content: string; }
  const allMsgs: Msg[] = [];

  for (const raw of rawRecords) {
    if (!raw.rawJson) continue;
    try {
      const p = JSON.parse(raw.rawJson);
      if (p.data) {
        for (const mid of Object.keys(p.data)) {
          const m = p.data[mid];
          allMsgs.push({
            messageId: mid,
            parentId: m.parent_id || m.parentId || 'NULL',
            childrenIds: (m.childrenIds || []).sort().join(','),
            rawImportId: raw.id,
            role: m.role || 'unknown',
            content: (m.content || '').substring(0, 50).replace(/\n/g, ' ')
          });
        }
      }
    } catch (e) {}
  }

  const byId = new Map<string, Msg[]>();
  for (const m of allMsgs) {
    if (!byId.has(m.messageId)) byId.set(m.messageId, []);
    byId.get(m.messageId)!.push(m);
  }

  // EXAMPLE 1: EXACT DUPLICATES
  console.log('================================================================================');
  console.log('EXAMPLE 1: EXACT DUPLICATES');
  console.log('================================================================================');
  console.log('(Same message.id + parent_id + childrenIds = SAFE TO REMOVE)\n');

  let found1 = 0;
  for (const [mid, copies] of byId) {
    if (copies.length < 2 || found1 >= 2) continue;
    const first = copies[0];
    const allMatch = copies.every(c => c.parentId === first.parentId && c.childrenIds === first.childrenIds);
    
    if (allMatch) {
      found1++;
      console.log(`Message ID: ${mid}`);
      console.log(`Role: ${first.role}`);
      console.log(`Content: "${first.content}..."`);
      console.log(`\n  parent_id:   ${first.parentId.substring(0, 30)}...`);
      console.log(`  childrenIds: ${first.childrenIds.substring(0, 30)}...`);
      console.log(`\n  Found in ${copies.length} imports:`);
      
      copies.forEach((c, i) => {
        const mark = i === 0 ? '[KEEP]' : '[REMOVE]';
        console.log(`    ${mark} ${c.rawImportId}`);
      });
      console.log(`\n  --> Can remove ${copies.length - 1} copies\n`);
      console.log('--------------------------------------------------------------------------------\n');
    }
  }

  // EXAMPLE 2: NOT DUPLICATES
  console.log('\n================================================================================');
  console.log('EXAMPLE 2: NOT DUPLICATES (Conversation Evolved)');
  console.log('================================================================================');
  console.log('(Same message.id but different parent_id/childrenIds = KEEP ALL)\n');

  let found2 = 0;
  for (const [mid, copies] of byId) {
    if (copies.length < 2 || found2 >= 2) continue;
    const first = copies[0];
    const hasDiff = copies.some(c => c.parentId !== first.parentId || c.childrenIds !== first.childrenIds);
    
    if (hasDiff) {
      found2++;
      console.log(`Message ID: ${mid}`);
      console.log(`Role: ${copies[0].role}`);
      console.log(`Content: "${copies[0].content}..."`);
      console.log(`\n  Found in ${copies.length} imports with DIFFERENT connections:\n`);
      
      for (const c of copies) {
        console.log(`  Import: ${c.rawImportId.substring(0, 15)}...`);
        console.log(`    parent_id:   ${c.parentId.substring(0, 25)}...`);
        console.log(`    childrenIds: ${c.childrenIds.substring(0, 25)}...`);
        console.log('');
      }
      console.log(`  --> KEEP ALL - conversation evolved between imports\n`);
      console.log('--------------------------------------------------------------------------------\n');
    }
  }

  // SUMMARY
  let exactCount = 0, notExactCount = 0, toRemove = 0;
  for (const [mid, copies] of byId) {
    if (copies.length < 2) continue;
    const first = copies[0];
    const allMatch = copies.every(c => c.parentId === first.parentId && c.childrenIds === first.childrenIds);
    if (allMatch) { exactCount++; toRemove += copies.length - 1; }
    else notExactCount++;
  }

  console.log('\n================================================================================');
  console.log('SUMMARY');
  console.log('================================================================================');
  console.log(`Exact duplicates:     ${exactCount} messages`);
  console.log(`Records to remove:    ${toRemove} copies`);
  console.log(`Not duplicates:       ${notExactCount} messages (keep all)`);

  await prisma.$disconnect();
}

showExamples().catch(console.error);
