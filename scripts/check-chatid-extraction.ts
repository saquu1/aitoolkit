import { prisma } from '../src/lib/db';
import fs from 'fs';

async function checkChatIdExtraction() {
  console.log('\n=== CHECKING chat_id EXTRACTION ===\n');

  // 1. Check the actual chatIds being used
  console.log('1. All unique chatId patterns in AISession:');
  const chatIdPatterns = await prisma.$queryRaw<{ chatId: string; count: bigint }[]>`
    SELECT chatId, COUNT(*) as count 
    FROM AISession 
    GROUP BY chatId
    ORDER BY chatId
  `;
  
  for (const row of chatIdPatterns) {
    const pattern = row.chatId.length > 50 ? row.chatId.substring(0, 50) + '...' : row.chatId;
    console.log(`   "${pattern}" (${row.count} sessions)`);
  }

  // 2. Check if there are sessions with REAL chat_id (UUID format)
  console.log('\n2. Sessions with real UUID chat_id:');
  const realUuidSessions = await prisma.$queryRaw<{ id: string; chatId: string; title: string }[]>`
    SELECT id, chatId, title FROM AISession 
    WHERE chatId LIKE '________-____-____-____-____________'
    LIMIT 10
  `;
  console.log(`   Found ${realUuidSessions.length} sessions with UUID-format chatId`);
  for (const s of realUuidSessions) {
    console.log(`   - chatId: ${s.chatId}, title: ${s.title?.substring(0, 40)}`);
  }

  // 3. Check ChatLog rawDataId patterns
  console.log('\n3. ChatLog rawDataId patterns:');
  const rawDataPatterns = await prisma.$queryRaw<{ rawDataId: string; count: bigint }[]>`
    SELECT rawDataId, COUNT(*) as count 
    FROM ChatLog 
    WHERE rawDataId IS NOT NULL
    GROUP BY rawDataId
    ORDER BY count DESC
    LIMIT 10
  `;
  for (const row of rawDataPatterns) {
    console.log(`   rawDataId: ${row.rawDataId} (${row.count} logs)`);
  }

  // 4. Check if there are ChatLogs with same rawDataId (actual duplicates)
  console.log('\n4. ChatLogs with SAME rawDataId (REAL duplicates):');
  const duplicateRawDataIds = await prisma.$queryRaw<{ rawDataId: string; count: bigint }[]>`
    SELECT rawDataId, COUNT(*) as count 
    FROM ChatLog 
    WHERE rawDataId IS NOT NULL
    GROUP BY rawDataId 
    HAVING COUNT(*) > 1
  `;
  console.log(`   Found ${duplicateRawDataIds.length} rawDataIds with multiple ChatLogs`);
  if (duplicateRawDataIds.length > 0) {
    console.log('   ⚠️ These are ACTUAL duplicates from same raw data!');
    for (const d of duplicateRawDataIds) {
      console.log(`   - rawDataId: ${d.rawDataId} (${d.count} copies)`);
    }
  }

  // 5. Check if we can find the raw JSON files
  console.log('\n5. Checking raw JSON files in /download:');
  const downloadDir = '/home/z/my-project/download';
  const files = fs.readdirSync(downloadDir).filter(f => f.endsWith('.json'));
  console.log(`   JSON files found: ${files.length}`);
  
  if (files.length > 0) {
    const sampleFile = files.find(f => f.includes('chat') || f.includes('raw')) || files[0];
    const filePath = `${downloadDir}/${sampleFile}`;
    try {
      const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      console.log(`\n   Sample file: ${sampleFile}`);
      console.log(`   Top-level keys: ${Object.keys(content).slice(0, 5).join(', ')}`);
      
      if (content.chat_id) {
        console.log(`   ✓ chat_id found: ${content.chat_id}`);
      } else {
        console.log('   ✗ No chat_id at top level');
      }
      
      // Check data structure
      if (content.data && typeof content.data === 'object') {
        const firstMsgKey = Object.keys(content.data)[0];
        if (firstMsgKey) {
          const firstMsg = content.data[firstMsgKey];
          console.log(`   First message keys: ${Object.keys(firstMsg).slice(0, 10).join(', ')}`);
          if (firstMsg.chat_id) {
            console.log(`   ✓ chat_id in message: ${firstMsg.chat_id}`);
          }
        }
      }
    } catch (e) {
      console.log(`   Could not parse ${sampleFile}`);
    }
  }

  // 6. Summary
  console.log('\n=== SUMMARY ===');
  console.log(`Total AISessions: ${await prisma.aISession.count()}`);
  console.log(`Total ChatLogs: ${await prisma.chatLog.count()}`);
  console.log(`\nChatId patterns found:`);
  const batchCount = chatIdPatterns.filter(p => p.chatId.startsWith('batch_')).length;
  const parsedCount = chatIdPatterns.filter(p => p.chatId.startsWith('parsed_')).length;
  const uuidCount = chatIdPatterns.filter(p => p.chatId.match(/^[a-f0-9-]{36}$/)).length;
  console.log(`  - batch_* (generated): ${batchCount}`);
  console.log(`  - parsed_* (generated): ${parsedCount}`);
  console.log(`  - UUID format (real): ${uuidCount}`);
  
  console.log(`\n⚠️ Issue: chatId is being generated instead of using actual chat_id from raw data!`);
  console.log(`   This breaks proper deduplication.`);

  await prisma.$disconnect();
}

checkChatIdExtraction().catch(console.error);
