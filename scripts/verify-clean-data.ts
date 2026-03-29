import { prisma } from '../src/lib/db';

async function verifyCleanData() {
  console.log('\n=== VERIFYING CLEAN DATA ===\n');

  // 1. Get remaining raw imports
  const rawRecords = await prisma.$queryRaw<{ id: string; rawJson: string }[]>`
    SELECT id, rawJson FROM RawImportData
  `;

  console.log(`Remaining RawImportData: ${rawRecords.length}`);

  // 2. Extract all messages
  interface Msg { messageId: string; parentId: string; childrenIds: string; }
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
            childrenIds: (m.childrenIds || []).sort().join(',')
          });
        }
      }
    } catch (e) {}
  }

  // 3. Check for duplicates
  const byId = new Map<string, Msg[]>();
  for (const m of allMsgs) {
    const key = `${m.messageId}|${m.parentId}|${m.childrenIds}`;
    if (!byId.has(key)) byId.set(key, []);
    byId.get(key)!.push(m);
  }

  const duplicates = [...byId.entries()].filter(([k, v]) => v.length > 1);

  console.log(`Total messages: ${allMsgs.length}`);
  console.log(`Unique messages: ${byId.size}`);
  console.log(`Duplicates found: ${duplicates.length}`);

  if (duplicates.length > 0) {
    console.log('\n⚠️ Still have duplicates!');
    for (const [key, msgs] of duplicates.slice(0, 3)) {
      console.log(`  - ${key.substring(0, 40)}... (${msgs.length} copies)`);
    }
  } else {
    console.log('\n✓ NO DUPLICATES - Data is clean!');
  }

  // 4. Show unique message IDs
  const uniqueMsgIds = new Set(allMsgs.map(m => m.messageId));
  console.log(`\nUnique message IDs: ${uniqueMsgIds.size}`);

  // 5. Show chat_ids
  const chatIds = new Set<string>();
  for (const raw of rawRecords) {
    if (!raw.rawJson) continue;
    try {
      const p = JSON.parse(raw.rawJson);
      if (p.chat_id) chatIds.add(p.chat_id);
    } catch (e) {}
  }
  console.log(`Unique chat_ids: ${chatIds.size}`);
  for (const cid of chatIds) {
    console.log(`  - ${cid}`);
  }

  console.log('\n=== VERIFICATION COMPLETE ===');
  await prisma.$disconnect();
}

verifyCleanData().catch(console.error);
