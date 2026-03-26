import { prisma } from '../src/lib/db';
import fs from 'fs';

async function properDuplicateAnalysis() {
  console.log('\n=== PROPER DUPLICATE ANALYSIS BY message.id ===\n');

  // 1. Read raw JSON
  const rawFile = '/home/z/my-project/download/raw-chat-sample.json';
  const rawData = JSON.parse(fs.readFileSync(rawFile, 'utf-8'));
  const messages = rawData.data || {};
  const messageIds = Object.keys(messages);

  console.log('1. RAW DATA STRUCTURE:');
  console.log(`   chat_id (room): ${rawData.chat_id}`);
  console.log(`   Total messages: ${messageIds.length}`);

  // 2. Show message connection graph
  console.log('\n2. MESSAGE CONNECTION GRAPH:');
  console.log('   id → parent_id → childrenIds\n');

  for (const msgId of messageIds) {
    const msg = messages[msgId];
    const parentId = msg.parent_id || msg.parentId || 'ROOT';
    const childrenIds = msg.childrenIds || [];
    const role = msg.role || 'unknown';
    
    const shortId = msgId.split('-')[0];
    const shortParent = parentId !== 'ROOT' ? parentId.split('-')[0] : 'ROOT';
    const shortChildren = childrenIds.map((c: string) => c.split('-')[0]).join(', ');
    
    console.log(`   [${shortId}] (${role.padEnd(9)}) → parent: [${shortParent}] → children: [${shortChildren || 'none'}]`);
  }

  // 3. Check database for these message IDs
  console.log('\n3. CHECKING DATABASE FOR message.id (externalId):');
  
  // First check if externalId is populated at all
  const sessionsWithExtId = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*) as count FROM AISession 
    WHERE externalId IS NOT NULL AND externalId != ''
  `;
  console.log(`   Sessions with externalId populated: ${sessionsWithExtId[0].count}`);

  // Check if any of our raw message IDs exist in database
  let foundInDb = 0;
  let notFoundInDb = 0;
  
  for (const msgId of messageIds) {
    const session = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM AISession WHERE externalId = ${msgId} LIMIT 1
    `;
    if (session.length > 0) {
      foundInDb++;
      console.log(`   ✓ [${msgId.split('-')[0]}] FOUND in database`);
    } else {
      notFoundInDb++;
    }
  }
  console.log(`\n   Found: ${foundInDb}, Not found: ${notFoundInDb}`);

  // 4. Check for actual duplicates (same message.id multiple times)
  console.log('\n4. ACTUAL DUPLICATES (same message.id appearing multiple times):');
  
  const duplicateExtIds = await prisma.$queryRaw<{ externalId: string; count: bigint; ids: string }[]>`
    SELECT externalId, COUNT(*) as count, GROUP_CONCAT(id) as ids
    FROM AISession 
    WHERE externalId IS NOT NULL AND externalId != ''
    GROUP BY externalId 
    HAVING COUNT(*) > 1
  `;

  if (duplicateExtIds.length === 0) {
    console.log('   ✓ NO DUPLICATES FOUND by message.id (externalId)');
  } else {
    console.log(`   ⚠️ Found ${duplicateExtIds.length} duplicate message.id entries:`);
    for (const d of duplicateExtIds) {
      console.log(`   - message.id: ${d.externalId.substring(0, 20)}... appears ${d.count} times`);
      console.log(`     DB IDs: ${d.ids}`);
    }
  }

  // 5. Show how parent-child connections are stored (or not)
  console.log('\n5. PARENT-CHILD CONNECTIONS IN DATABASE:');
  
  const sampleWithConnections = await prisma.$queryRaw<{ 
    id: string; 
    externalId: string | null;
    parentMessageId: string | null; 
    childMessageIds: string | null;
    chatId: string;
  }[]>`
    SELECT id, externalId, parentMessageId, childMessageIds, chatId 
    FROM AISession 
    WHERE parentMessageId IS NOT NULL OR childMessageIds != '[]'
    LIMIT 5
  `;

  if (sampleWithConnections.length === 0) {
    console.log('   ⚠️ NO parent-child connections stored in database!');
    console.log('   All parentMessageId are NULL and childMessageIds are empty []');
  } else {
    for (const s of sampleWithConnections) {
      console.log(`   Session: ${s.id}`);
      console.log(`     externalId (message.id): ${s.externalId}`);
      console.log(`     parentMessageId: ${s.parentMessageId}`);
      console.log(`     childMessageIds: ${s.childMessageIds}`);
    }
  }

  // 6. Summary
  console.log('\n=== SUMMARY ===');
  console.log('\nRaw Data Message IDs (for deduplication):');
  for (const msgId of messageIds) {
    console.log(`   • ${msgId}`);
  }
  
  console.log(`\nDatabase Status:`);
  console.log(`   • message.id stored as externalId: ${foundInDb}/${messageIds.length}`);
  console.log(`   • Actual duplicates found: ${duplicateExtIds.length}`);
  console.log(`   • Parent-child connections preserved: ${sampleWithConnections.length > 0 ? 'Yes' : 'No'}`);

  console.log('\n⚠️ CURRENT ISSUE:');
  console.log('   • Import is NOT storing message.id as externalId');
  console.log('   • Parent-child relationships are NOT being preserved');
  console.log('   • This makes proper deduplication impossible');

  await prisma.$disconnect();
}

properDuplicateAnalysis().catch(console.error);
