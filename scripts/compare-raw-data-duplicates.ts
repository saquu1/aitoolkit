import { prisma } from '../src/lib/db';

async function compareRawDataDuplicates() {
  console.log('\n=== RAW DATA DUPLICATE ANALYSIS ===\n');
  console.log('Comparing messages by: id + parent_id + childrenIds\n');

  // Get all raw import records
  const rawRecords = await prisma.$queryRaw<{ 
    id: string; 
    rawJson: string;
    sourceChatId: string | null;
  }[]>`
    SELECT id, rawJson, sourceChatId FROM RawImportData
  `;

  console.log(`Total RawImportData records: ${rawRecords.length}\n`);

  // Extract all messages from all raw records
  interface MessageKey {
    messageId: string;
    parentId: string;
    childrenIds: string;
    rawImportId: string;
    chatId: string;
    role: string;
    contentPreview: string;
  }

  const allMessages: MessageKey[] = [];
  const chatIds = new Set<string>();

  for (const raw of rawRecords) {
    if (!raw.rawJson) continue;
    
    try {
      const parsed = JSON.parse(raw.rawJson);
      const chatId = parsed.chat_id || 'unknown';
      chatIds.add(chatId);
      
      if (parsed.data) {
        for (const msgId of Object.keys(parsed.data)) {
          const msg = parsed.data[msgId];
          const parentId = msg.parent_id || msg.parentId || 'NULL';
          const childrenIds = (msg.childrenIds || []).sort().join(',');
          const role = msg.role || 'unknown';
          const content = (msg.content || '').substring(0, 50).replace(/\n/g, ' ');
          
          allMessages.push({
            messageId: msgId,
            parentId,
            childrenIds,
            rawImportId: raw.id,
            chatId,
            role,
            contentPreview: content
          });
        }
      }
    } catch (e) {}
  }

  console.log(`Unique chat_ids: ${chatIds.size}`);
  console.log(`Total messages extracted: ${allMessages.length}\n`);

  // Group by message.id
  const byMessageId = new Map<string, MessageKey[]>();
  for (const msg of allMessages) {
    if (!byMessageId.has(msg.messageId)) {
      byMessageId.set(msg.messageId, []);
    }
    byMessageId.get(msg.messageId)!.push(msg);
  }

  console.log('1. DUPLICATES BY message.id:');
  let duplicateCount = 0;
  const duplicates: { messageId: string; copies: MessageKey[] }[] = [];

  for (const [msgId, copies] of byMessageId) {
    if (copies.length > 1) {
      duplicateCount++;
      duplicates.push({ messageId: msgId, copies });
    }
  }

  if (duplicates.length === 0) {
    console.log('   ✓ NO DUPLICATES by message.id');
  } else {
    console.log(`   ⚠️ Found ${duplicates.length} message.id appearing multiple times:\n`);
    
    for (const dup of duplicates.slice(0, 10)) {
      console.log(`   Message ID: ${dup.messageId}`);
      console.log(`   Appears in ${dup.copies.length} raw imports:`);
      
      for (const copy of dup.copies) {
        console.log(`     - rawImportId: ${copy.rawImportId}`);
        console.log(`       chatId: ${copy.chatId}`);
        console.log(`       role: ${copy.role}`);
        console.log(`       parent_id: ${copy.parentId.substring(0, 8)}...`);
        console.log(`       childrenIds: ${copy.childrenIds.substring(0, 30)}...`);
      }
      console.log('');
    }
  }

  // 2. Check if parent_id and childrenIds also match (exact duplicate)
  console.log('\n2. EXACT DUPLICATES (message.id + parent_id + childrenIds ALL match):');
  
  const exactDuplicates: { messageId: string; copies: MessageKey[] }[] = [];
  
  for (const dup of duplicates) {
    // Check if all copies have same parent_id and childrenIds
    const firstCopy = dup.copies[0];
    const allMatch = dup.copies.every(c => 
      c.parentId === firstCopy.parentId && 
      c.childrenIds === firstCopy.childrenIds
    );
    
    if (allMatch) {
      exactDuplicates.push(dup);
    }
  }

  if (exactDuplicates.length === 0) {
    console.log('   ✓ NO EXACT DUPLICATES');
  } else {
    console.log(`   ⚠️ Found ${exactDuplicates.length} EXACT duplicates:\n`);
    
    for (const dup of exactDuplicates.slice(0, 5)) {
      const copy = dup.copies[0];
      console.log(`   [${dup.messageId.split('-')[0]}] (${copy.role})`);
      console.log(`     parent_id: ${copy.parentId.split('-')[0]}...`);
      console.log(`     childrenIds: ${copy.childrenIds.substring(0, 40)}...`);
      console.log(`     Found in ${dup.copies.length} raw imports:`);
      
      for (const c of dup.copies) {
        console.log(`       - ${c.rawImportId}`);
      }
      console.log('');
    }
  }

  // 3. Summary
  console.log('\n=== SUMMARY ===');
  console.log(`RawImportData records: ${rawRecords.length}`);
  console.log(`Unique chat_ids: ${chatIds.size}`);
  console.log(`Total messages: ${allMessages.length}`);
  console.log(`Unique message.ids: ${byMessageId.size}`);
  console.log(`Duplicate message.ids: ${duplicateCount}`);
  console.log(`Exact duplicates (all 3 fields match): ${exactDuplicates.length}`);

  if (exactDuplicates.length > 0) {
    const totalDuplicateCopies = exactDuplicates.reduce((sum, d) => sum + d.copies.length - 1, 0);
    console.log(`\n   🗑️ Records that can be removed: ${totalDuplicateCopies}`);
    console.log(`   (Keeping first occurrence of each duplicate)`);
  }

  await prisma.$disconnect();
}

compareRawDataDuplicates().catch(console.error);
