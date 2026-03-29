import { prisma } from '../src/lib/db';

async function fullAnalysis() {
  const rawRecords = await prisma.$queryRaw<{ id: string; rawJson: string }[]>`
    SELECT id, rawJson FROM RawImportData
  `;

  interface Msg { messageId: string; parentId: string; childrenIds: string; rawImportId: string; }
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
            rawImportId: raw.id
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

  let exactCount = 0, notExactCount = 0, toRemove = 0;
  const exactDupMsgIds: string[] = [];
  const notExactMsgIds: string[] = [];

  for (const [mid, copies] of byId) {
    if (copies.length < 2) continue;
    const first = copies[0];
    const allMatch = copies.every(c => c.parentId === first.parentId && c.childrenIds === first.childrenIds);
    
    if (allMatch) {
      exactCount++;
      toRemove += copies.length - 1;
      exactDupMsgIds.push(mid);
    } else {
      notExactCount++;
      notExactMsgIds.push(mid);
    }
  }

  console.log('\n================================================================================');
  console.log('FULL DUPLICATE ANALYSIS - ALL RAW DATA');
  console.log('================================================================================\n');

  console.log('SUMMARY:');
  console.log('--------');
  console.log(`Total RawImportData records:      ${rawRecords.length}`);
  console.log(`Total messages extracted:         ${allMsgs.length}`);
  console.log(`Unique message IDs:               ${byId.size}`);
  console.log('');
  console.log('DUPLICATE ANALYSIS:');
  console.log('-------------------');
  console.log(`Exact duplicates:                 ${exactCount} messages`);
  console.log(`  (same id + parent_id + children)`);
  console.log(`  Records to remove:              ${toRemove} copies`);
  console.log('');
  console.log(`Not duplicates:                   ${notExactCount} messages`);
  console.log(`  (same id BUT different connections)`);
  console.log(`  Keep ALL of these`);
  console.log('');
  console.log('================================================================================');
  console.log(`TOTAL RECORDS THAT CAN BE REMOVED: ${toRemove}`);
  console.log('================================================================================\n');

  await prisma.$disconnect();
}

fullAnalysis().catch(console.error);
