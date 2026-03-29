import { prisma } from '../src/lib/db';

async function checkRealDuplicates() {
  console.log('\n=== PROPER DUPLICATE ANALYSIS BY chat_id ===\n');

  // 1. Check if chatId is being stored properly in AISession
  console.log('1. AISession - checking chatId field:');
  const sessionsWithChatId = await prisma.$queryRaw<{ id: string; chatId: string | null; title: string }[]>`
    SELECT id, chatId, title FROM AISession WHERE chatId IS NOT NULL AND chatId != '' LIMIT 5
  `;
  console.log(`   Sessions with chatId: ${sessionsWithChatId.length}`);
  for (const s of sessionsWithChatId) {
    console.log(`   - ID: ${s.id}, chatId: ${s.chatId}, title: ${s.title?.substring(0, 30)}`);
  }

  // 2. Check AISessions without chatId
  const sessionsWithoutChatId = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*) as count FROM AISession WHERE chatId IS NULL OR chatId = ''
  `;
  console.log(`   Sessions WITHOUT chatId: ${sessionsWithoutChatId[0].count}`);

  // 3. Check ChatLog rawData - look at raw JSON structure
  console.log('\n2. ChatLog - checking rawData structure:');
  const chatLogWithRaw = await prisma.$queryRaw<{ id: string; title: string; rawDataId: string | null }[]>`
    SELECT id, title, rawDataId FROM ChatLog LIMIT 5
  `;
  for (const l of chatLogWithRaw) {
    console.log(`   - ID: ${l.id}, title: ${l.title?.substring(0, 30)}, rawDataId: ${l.rawDataId}`);
  }

  // 4. Check RawChatData for chat_id
  console.log('\n3. RawChatData - checking chat_id field:');
  const rawDataCheck = await prisma.$queryRaw<{ id: string; chatId: string | null }[]>`
    SELECT id, chatId FROM RawChatData WHERE chatId IS NOT NULL LIMIT 5
  `;
  if (rawDataCheck.length > 0) {
    console.log(`   Found ${rawDataCheck.length} records with chatId:`);
    for (const r of rawDataCheck) {
      console.log(`   - ID: ${r.id}, chatId: ${r.chatId}`);
    }
  } else {
    console.log('   No chatId found in RawChatData');
    // Check the raw JSON structure
    const rawSample = await prisma.$queryRaw<{ id: string; rawJson: string | null }[]>`
      SELECT id, rawJson FROM RawChatData WHERE rawJson IS NOT NULL LIMIT 1
    `;
    if (rawSample.length > 0 && rawSample[0].rawJson) {
      try {
        const parsed = JSON.parse(rawSample[0].rawJson);
        console.log('\n   Raw JSON structure:');
        console.log('   - Top-level keys:', Object.keys(parsed).slice(0, 10));
        if (parsed.chat_id) {
          console.log(`   - chat_id: ${parsed.chat_id}`);
        }
        if (parsed.data) {
          const firstKey = Object.keys(parsed.data)[0];
          if (firstKey && parsed.data[firstKey]) {
            console.log(`   - First message keys:`, Object.keys(parsed.data[firstKey]).slice(0, 10));
          }
        }
      } catch (e) {
        console.log('   Could not parse rawJson');
      }
    }
  }

  // 5. Check what's actually stored in ChatLog.summary or notes about chat_id
  console.log('\n4. Checking ChatLog for embedded chat_id:');
  const chatLogSample = await prisma.chatLog.findFirst({
    where: { notes: { not: null } },
    select: { id: true, title: true, notes: true, summary: true }
  });
  if (chatLogSample) {
    console.log(`   Sample ChatLog notes: ${chatLogSample.notes?.substring(0, 100)}`);
    console.log(`   Sample ChatLog summary: ${chatLogSample.summary?.substring(0, 100)}`);
  }

  // 6. The REAL check - are we storing the chat_id from raw data?
  console.log('\n5. Checking if imports created duplicates by chat_id:');
  
  // Get all unique chat_ids from raw data
  const uniqueChatIds = await prisma.$queryRaw<{ chatId: string; count: bigint }[]>`
    SELECT chatId, COUNT(*) as count 
    FROM RawChatData 
    WHERE chatId IS NOT NULL AND chatId != ''
    GROUP BY chatId
    HAVING COUNT(*) > 1
    LIMIT 10
  `;
  console.log(`   Chat IDs appearing multiple times in RawChatData: ${uniqueChatIds.length}`);

  // 7. Summary of current data
  console.log('\n=== DATA STRUCTURE SUMMARY ===');
  const totalRaw = await prisma.rawChatData.count();
  const totalSessions = await prisma.aISession.count();
  const totalChatLogs = await prisma.chatLog.count();
  
  console.log(`RawChatData records: ${totalRaw}`);
  console.log(`AISession records: ${totalSessions}`);
  console.log(`ChatLog records: ${totalChatLogs}`);
  
  // Check if chatId is populated
  const rawWithChatId = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*) as count FROM RawChatData WHERE chatId IS NOT NULL AND chatId != ''
  `;
  console.log(`\nRawChatData with chatId: ${rawWithChatId[0].count}`);
  
  const sessionsWithChatIdCount = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*) as count FROM AISession WHERE chatId IS NOT NULL AND chatId != ''
  `;
  console.log(`AISession with chatId: ${sessionsWithChatIdCount[0].count}`);

  await prisma.$disconnect();
}

checkRealDuplicates().catch(console.error);
