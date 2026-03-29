import { prisma } from '../src/lib/db';

async function showRemaining() {
  const rawRecords = await prisma.$queryRaw<{ id: string; rawJson: string }[]>`
    SELECT id, rawJson FROM RawImportData
  `;

  // Find exact duplicates
  const msgOccurrences = new Map<string, { rawId: string; msgId: string; parentId: string; childrenIds: string }[]>();

  for (const raw of rawRecords) {
    if (!raw.rawJson) continue;
    try {
      const p = JSON.parse(raw.rawJson);
      if (p.data) {
        for (const mid of Object.keys(p.data)) {
          const m = p.data[mid];
          const parentId = m.parent_id || m.parentId || 'NULL';
          const childrenIds = (m.childrenIds || []).sort().join(',');
          const key = `${mid}|${parentId}|${childrenIds}`;
          
          if (!msgOccurrences.has(key)) msgOccurrences.set(key, []);
          msgOccurrences.get(key)!.push({
            rawId: raw.id,
            msgId: mid,
            parentId,
            childrenIds
          });
        }
      }
    } catch (e) {}
  }

  // Show remaining duplicates
  console.log('\n=== REMAINING DUPLICATES ===\n');
  
  const dups = [...msgOccurrences.entries()].filter(([k, v]) => v.length > 1);
  console.log(`Found ${dups.length} messages appearing in multiple imports:\n`);

  for (const [key, occs] of dups.slice(0, 5)) {
    const shortMsgId = key.split('|')[0].substring(0, 15);
    console.log(`Message: ${shortMsgId}...`);
    console.log(`  Appears in ${occs.length} imports:`);
    for (const o of occs) {
      console.log(`    - ${o.rawId}`);
    }
    console.log('');
  }

  // Find which imports to remove (imports where ALL messages are duplicates)
  console.log('\n=== ANALYZING IMPORTS ===\n');

  const rawIdMsgs = new Map<string, string[]>();
  for (const raw of rawRecords) {
    if (!raw.rawJson) continue;
    try {
      const p = JSON.parse(raw.rawJson);
      if (p.data) {
        const keys: string[] = [];
        for (const mid of Object.keys(p.data)) {
          const m = p.data[mid];
          const parentId = m.parent_id || m.parentId || 'NULL';
          const childrenIds = (m.childrenIds || []).sort().join(',');
          keys.push(`${mid}|${parentId}|${childrenIds}`);
        }
        rawIdMsgs.set(raw.id, keys);
      }
    } catch (e) {}
  }

  // For each message key, track first occurrence
  const firstOccurrence = new Map<string, string>();
  const importsToRemove = new Set<string>();

  // Sort imports by id (which contains timestamp)
  const sortedImports = [...rawIdMsgs.entries()].sort((a, b) => a[0].localeCompare(b[0]));

  for (const [rawId, keys] of sortedImports) {
    let allSeen = true;
    for (const k of keys) {
      if (!firstOccurrence.has(k)) {
        firstOccurrence.set(k, rawId);
        allSeen = false;
      }
    }
    if (allSeen && keys.length > 0) {
      importsToRemove.add(rawId);
    }
  }

  console.log(`Additional imports to remove: ${importsToRemove.size}`);
  for (const id of importsToRemove) {
    console.log(`  - ${id}`);
  }

  await prisma.$disconnect();
}

showRemaining().catch(console.error);
