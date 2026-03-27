import { prisma } from '../src/lib/db';

async function findDuplicates() {
  console.log('\n=== DUPLICATE CHAT RECORDS ANALYSIS ===\n');

  // 1. Check AISession duplicates by title
  console.log('1. AISession duplicates by title:');
  const sessionsByTitle = await prisma.$queryRaw<{ title: string; count: bigint }[]>`
    SELECT title, COUNT(*) as count 
    FROM AISession 
    WHERE title IS NOT NULL AND title != ''
    GROUP BY title 
    HAVING COUNT(*) > 1
    ORDER BY count DESC
    LIMIT 30
  `;
  
  if (sessionsByTitle.length === 0) {
    console.log('   No duplicates found');
  } else {
    console.log(`   Found ${sessionsByTitle.length} titles with duplicates:`);
    for (const row of sessionsByTitle) {
      const title = row.title?.substring(0, 50) || '';
      console.log(`   - "${title}..." (${row.count} copies)`);
    }
  }

  // 2. Check ChatLog duplicates by title + sessionDate
  console.log('\n2. ChatLog duplicates by title + sessionDate:');
  const chatLogsByTitleDate = await prisma.$queryRaw<{ title: string; sessionDate: string; count: bigint }[]>`
    SELECT title, sessionDate, COUNT(*) as count 
    FROM ChatLog 
    WHERE title IS NOT NULL AND title != ''
    GROUP BY title, sessionDate 
    HAVING COUNT(*) > 1
    ORDER BY count DESC
    LIMIT 30
  `;
  
  if (chatLogsByTitleDate.length === 0) {
    console.log('   No duplicates found');
  } else {
    console.log(`   Found ${chatLogsByTitleDate.length} duplicate entries:`);
    for (const row of chatLogsByTitleDate) {
      const title = row.title?.substring(0, 50) || '';
      console.log(`   - "${title}..." on ${row.sessionDate} (${row.count} copies)`);
    }
  }

  // 3. Get detailed ChatLog duplicate IDs
  console.log('\n3. Detailed duplicate ChatLog IDs to remove:');
  for (const dup of chatLogsByTitleDate) {
    const logs = await prisma.$queryRaw<{ id: string; title: string; sessionDate: string; importedAt: Date; rawDataId: string | null }[]>`
      SELECT id, title, sessionDate, importedAt, rawDataId 
      FROM ChatLog 
      WHERE title = ${dup.title} AND sessionDate = ${dup.sessionDate}
      ORDER BY importedAt ASC
    `;
    console.log(`\n   Title: "${dup.title?.substring(0, 40)}..." (${logs.length} copies)`);
    for (let i = 0; i < logs.length; i++) {
      const l = logs[i];
      const marker = i === 0 ? '✓ KEEP' : '✗ REMOVE';
      console.log(`     [${marker}] ID: ${l.id}, Imported: ${l.importedAt?.toISOString()?.split('.')[0] || 'N/A'}`);
    }
  }

  // 4. Get detailed AISession duplicate IDs
  console.log('\n4. Detailed duplicate AISession IDs to remove:');
  for (const dup of sessionsByTitle.slice(0, 8)) {
    const sessions = await prisma.$queryRaw<{ id: string; title: string; sessionDate: Date; createdAt: Date; totalTokens: number | null }[]>`
      SELECT id, title, sessionDate, createdAt, totalTokens 
      FROM AISession 
      WHERE title = ${dup.title}
      ORDER BY createdAt ASC
    `;
    console.log(`\n   Title: "${dup.title?.substring(0, 40)}..." (${sessions.length} copies)`);
    for (let i = 0; i < sessions.length; i++) {
      const s = sessions[i];
      const marker = i === 0 ? '✓ KEEP' : '✗ REMOVE';
      const dateStr = s.sessionDate?.toISOString?.()?.split('T')[0] || 'null';
      console.log(`     [${marker}] ID: ${s.id}, Date: ${dateStr}, Tokens: ${s.totalTokens || 0}`);
    }
  }

  // Summary counts
  console.log('\n=== SUMMARY ===');
  const totalSessions = await prisma.aISession.count();
  const totalChatLogs = await prisma.chatLog.count();
  
  // Count total duplicate records (keeping first, removing rest)
  const totalDupSessions = sessionsByTitle.reduce((sum, r) => sum + Number(r.count) - 1, 0);
  const totalDupChatLogs = chatLogsByTitleDate.reduce((sum, r) => sum + Number(r.count) - 1, 0);
  
  console.log(`Total AISessions: ${totalSessions}`);
  console.log(`Total ChatLogs: ${totalChatLogs}`);
  console.log(`\nDuplicates to Remove:`);
  console.log(`- AISessions: ${totalDupSessions} (keeping 1 of each group)`);
  console.log(`- ChatLogs: ${totalDupChatLogs} (keeping 1 of each group)`);
  console.log(`\nTotal records to remove: ${totalDupSessions + totalDupChatLogs}`);

  await prisma.$disconnect();
}

findDuplicates().catch(console.error);
