import { prisma } from '../src/lib/db';

async function show3RawImports() {
  console.log('\n=== COMPARING 3 RAW IMPORT RECORDS ===\n');

  const rawIds = [
    'cmn42yrp50000m2lje16nwvef',
    'cmn42yugf0001m2ljjh6l3hda',
    'cmn4elwtv0005m2ol9bzl48sf'
  ];

  for (const rawId of rawIds) {
    console.log(`\n${'═'.repeat(80)}`);
    console.log(`RAW IMPORT: ${rawId}`);
    console.log('═'.repeat(80));

    const raw = await prisma.$queryRaw<{ 
      id: string; 
      rawJson: string;
      sourceChatId: string | null;
      sourceType: string | null;
      rawSizeBytes: number | null;
      messageCount: number | null;
      importedAt: Date;
    }[]>`
      SELECT id, rawJson, sourceChatId, sourceType, rawSizeBytes, messageCount, importedAt 
      FROM RawImportData 
      WHERE id = ${rawId}
    `;

    if (raw.length === 0) {
      console.log('   NOT FOUND');
      continue;
    }

    const r = raw[0];
    console.log(`\nMetadata:`);
    console.log(`   sourceChatId: ${r.sourceChatId}`);
    console.log(`   sourceType: ${r.sourceType}`);
    console.log(`   rawSizeBytes: ${r.rawSizeBytes}`);
    console.log(`   messageCount: ${r.messageCount}`);
    console.log(`   importedAt: ${r.importedAt}`);

    if (r.rawJson) {
      const parsed = JSON.parse(r.rawJson);
      console.log(`\nJSON Structure:`);
      console.log(`   chat_id: ${parsed.chat_id}`);
      console.log(`   message_version: ${parsed.message_version}`);
      
      if (parsed.data) {
        const msgIds = Object.keys(parsed.data);
        console.log(`   Total messages: ${msgIds.length}`);
        
        console.log(`\n   Messages (id | parent_id | childrenIds | role | content preview):`);
        console.log('   ' + '─'.repeat(76));
        
        for (const msgId of msgIds) {
          const msg = parsed.data[msgId];
          const parentId = msg.parent_id || msg.parentId || 'NULL';
          const childrenIds = msg.childrenIds || [];
          const role = msg.role || 'unknown';
          const content = (msg.content || '').substring(0, 30).replace(/\n/g, ' ');
          
          const shortId = msgId.split('-')[0];
          const shortParent = parentId !== 'NULL' ? parentId.split('-')[0] : 'NULL';
          const shortChildren = childrenIds.slice(0, 1).map((c: string) => c.split('-')[0]).join(',');
          
          console.log(`   [${shortId}] → [${shortParent}] → [${shortChildren}] (${role.padEnd(9)}) "${content}..."`);
        }
      }
    }
  }

  // Now compare side by side
  console.log('\n\n');
  console.log('═'.repeat(80));
  console.log('SIDE BY SIDE COMPARISON');
  console.log('═'.repeat(80));

  const allData: { rawId: string; chatId: string; messages: Map<string, any> }[] = [];

  for (const rawId of rawIds) {
    const raw = await prisma.$queryRaw<{ rawJson: string }[]>`
      SELECT rawJson FROM RawImportData WHERE id = ${rawId}
    `;
    
    if (raw.length > 0 && raw[0].rawJson) {
      const parsed = JSON.parse(raw[0].rawJson);
      const msgMap = new Map<string, any>();
      
      for (const msgId of Object.keys(parsed.data || {})) {
        msgMap.set(msgId, parsed.data[msgId]);
      }
      
      allData.push({
        rawId: rawId.split('_')[0],
        chatId: parsed.chat_id,
        messages: msgMap
      });
    }
  }

  // Get all unique message IDs
  const allMsgIds = new Set<string>();
  for (const d of allData) {
    for (const msgId of d.messages.keys()) {
      allMsgIds.add(msgId);
    }
  }

  console.log(`\nComparing ${allMsgIds.size} unique message IDs across 3 imports:\n`);

  // Show comparison table
  console.log('Message ID'.padEnd(12) + '| Import 1'.padEnd(12) + '| Import 2'.padEnd(12) + '| Import 3'.padEnd(12) + '| All Same?');
  console.log('─'.repeat(60));

  let sameCount = 0;
  let diffCount = 0;

  for (const msgId of [...allMsgIds].slice(0, 15)) {
    const shortId = msgId.split('-')[0];
    const results: string[] = [];
    
    for (const d of allData) {
      const msg = d.messages.get(msgId);
      if (msg) {
        const parentId = (msg.parent_id || msg.parentId || 'NULL').split('-')[0];
        results.push(parentId);
      } else {
        results.push('MISSING');
      }
    }
    
    const allSame = results.every(r => r === results[0]);
    const status = allSame ? '✓ SAME' : '✗ DIFF';
    
    if (allSame) sameCount++; else diffCount++;
    
    console.log(
      shortId.padEnd(12) + '| ' + 
      results[0].padEnd(10) + '| ' + 
      results[1].padEnd(10) + '| ' + 
      results[2].padEnd(10) + '| ' + status
    );
  }

  console.log('─'.repeat(60));
  console.log(`\n... (showing 15 of ${allMsgIds.size} messages)`);
  console.log(`Same: ${sameCount}, Different: ${diffCount}`);

  await prisma.$disconnect();
}

show3RawImports().catch(console.error);
