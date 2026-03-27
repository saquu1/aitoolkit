import { prisma } from '../src/lib/db';

async function findDuplicatesBy3Fields() {
  console.log('\n=== FIND DUPLICATES BY 3-FIELD COMBINATION ===\n');
  console.log('Checking: externalId + parentMessageId + childMessageIds\n');

  // 1. First, show what data we have in these fields
  console.log('1. CURRENT DATA IN THESE FIELDS:');
  
  const allSessions = await prisma.$queryRaw<{ 
    id: string; 
    externalId: string | null;
    parentMessageId: string | null;
    childMessageIds: string | null;
    chatId: string;
    title: string | null;
  }[]>`
    SELECT id, externalId, parentMessageId, childMessageIds, chatId, title
    FROM AISession
    ORDER BY createdAt
    LIMIT 20
  `;

  console.log(`   Total sessions to check: ${allSessions.length}\n`);
  
  for (const s of allSessions) {
    console.log(`   Session: ${s.id}`);
    console.log(`     externalId:      ${s.externalId || 'NULL'}`);
    console.log(`     parentMessageId: ${s.parentMessageId || 'NULL'}`);
    console.log(`     childMessageIds: ${s.childMessageIds || 'NULL'}`);
    console.log(`     chatId:          ${s.chatId}`);
    console.log(`     title:           ${s.title?.substring(0, 40) || 'NULL'}`);
    console.log('');
  }

  // 2. Find duplicates by combination of all 3 fields
  console.log('\n2. DUPLICATES BY 3-FIELD COMBINATION:');
  
  const duplicates = await prisma.$queryRaw<{ 
    externalId: string;
    parentMessageId: string;
    childMessageIds: string;
    count: bigint;
  }[]>`
    SELECT externalId, parentMessageId, childMessageIds, COUNT(*) as count
    FROM AISession
    GROUP BY externalId, parentMessageId, childMessageIds
    HAVING COUNT(*) > 1
  `;

  if (duplicates.length === 0) {
    console.log('   ✓ NO DUPLICATES found by this combination');
    console.log('   (All sessions have unique externalId + parentMessageId + childMessageIds)');
  } else {
    console.log(`   ⚠️ Found ${duplicates.length} duplicate groups:\n`);
    
    for (const d of duplicates) {
      console.log(`   Combination appears ${d.count} times:`);
      console.log(`     externalId:      ${d.externalId || 'NULL'}`);
      console.log(`     parentMessageId: ${d.parentMessageId || 'NULL'}`);
      console.log(`     childMessageIds: ${d.childMessageIds || 'NULL'}`);
      
      // Get the actual session IDs with this combination
      const sessionsWithCombo = await prisma.$queryRaw<{ id: string; title: string | null; chatId: string }[]>`
        SELECT id, title, chatId FROM AISession
        WHERE externalId = ${d.externalId || ''}
        AND parentMessageId = ${d.parentMessageId || ''}
        AND childMessageIds = ${d.childMessageIds || ''}
      `;
      
      console.log(`     Sessions with this combo:`);
      for (const s of sessionsWithCombo) {
        console.log(`       - ${s.id} | chatId: ${s.chatId} | title: ${s.title?.substring(0, 30)}`);
      }
      console.log('');
    }
  }

  // 3. Check how many have NULL values (which means they couldn't be compared)
  console.log('\n3. RECORDS WITH NULL VALUES (cannot compare):');
  
  const nullExternalId = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*) as count FROM AISession 
    WHERE externalId IS NULL OR externalId = ''
  `;
  
  const nullParentId = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*) as count FROM AISession 
    WHERE parentMessageId IS NULL OR parentMessageId = ''
  `;
  
  const nullChildIds = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*) as count FROM AISession 
    WHERE childMessageIds IS NULL OR childMessageIds = '[]'
  `;
  
  const allNull = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*) as count FROM AISession 
    WHERE (externalId IS NULL OR externalId = '')
    AND (parentMessageId IS NULL OR parentMessageId = '')
    AND (childMessageIds IS NULL OR childMessageIds = '[]')
  `;

  console.log(`   externalId NULL/empty: ${nullExternalId[0].count}`);
  console.log(`   parentMessageId NULL/empty: ${nullParentId[0].count}`);
  console.log(`   childMessageIds NULL/empty: ${nullChildIds[0].count}`);
  console.log(`   All 3 fields NULL/empty: ${allNull[0].count}`);

  // 4. Check for duplicates where ALL 3 are NULL (these would match each other)
  if (Number(allNull[0].count) > 1) {
    console.log(`\n   ⚠️ ${allNull[0].count} sessions have ALL 3 fields NULL/empty`);
    console.log('   These would be considered "duplicates" of each other!');
    console.log('   But this is because data is missing, not because they are true duplicates.\n');
  }

  // 5. Summary
  console.log('\n=== SUMMARY ===');
  const total = await prisma.aISession.count();
  console.log(`Total AISessions: ${total}`);
  console.log(`Sessions with all 3 fields populated: ${total - Number(allNull[0].count)}`);
  console.log(`Sessions with missing data: ${allNull[0].count}`);
  console.log(`True duplicates (same 3-field combo): ${duplicates.length}`);

  await prisma.$disconnect();
}

findDuplicatesBy3Fields().catch(console.error);
