import { prisma } from '../src/lib/db';
import fs from 'fs';

async function showRawDataRecords() {
  console.log('\n=== RAW DATA RECORDS ===\n');

  // 1. Check JSON files in download folder
  console.log('1. JSON FILES IN /download:');
  const downloadDir = '/home/z/my-project/download';
  const jsonFiles = fs.readdirSync(downloadDir).filter(f => f.endsWith('.json'));
  
  for (const file of jsonFiles) {
    const filePath = `${downloadDir}/${file}`;
    const stats = fs.statSync(filePath);
    console.log(`   - ${file} (${(stats.size / 1024).toFixed(1)} KB)`);
  }

  // 2. Read each JSON file and show message structure
  console.log('\n2. RAW DATA CONTENT:');
  
  for (const file of jsonFiles) {
    const filePath = `${downloadDir}/${file}`;
    console.log(`\n   ═══ ${file} ═══`);
    
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(content);
      
      // Show top-level structure
      console.log(`   Top-level keys: ${Object.keys(data).join(', ')}`);
      
      if (data.chat_id) {
        console.log(`   chat_id: ${data.chat_id}`);
      }
      
      // Show messages
      if (data.data) {
        const messages = data.data;
        const msgIds = Object.keys(messages);
        console.log(`   Total messages: ${msgIds.length}`);
        
        console.log('\n   Messages (id | parent_id | childrenIds | role):');
        console.log('   ' + '─'.repeat(80));
        
        for (const msgId of msgIds) {
          const msg = messages[msgId];
          const parentId = msg.parent_id || msg.parentId || 'NULL';
          const childrenIds = msg.childrenIds || [];
          const role = msg.role || 'unknown';
          const content = (msg.content || '').substring(0, 40).replace(/\n/g, ' ');
          
          const shortId = msgId.split('-')[0];
          const shortParent = parentId !== 'NULL' ? parentId.split('-')[0] : 'NULL';
          const childCount = childrenIds.length;
          const childPreview = childrenIds.length > 0 
            ? childrenIds.slice(0, 2).map((c: string) => c.split('-')[0]).join(',')
            : '-';
          
          console.log(`   [${shortId}] parent:[${shortParent}] children:[${childPreview}] (${role}) "${content}..."`);
        }
      }
    } catch (e) {
      console.log(`   Error parsing: ${e}`);
    }
  }

  // 3. Check if there's raw data in database
  console.log('\n\n3. RAW DATA IN DATABASE:');
  
  // Check for tables that might store raw data
  const tables = await prisma.$queryRaw<{ name: string }[]>`
    SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%raw%' OR name LIKE '%chat%'
  `;
  
  console.log(`   Tables with 'raw' or 'chat': ${tables.map(t => t.name).join(', ') || 'None'}`);

  // Check ChatLog table for raw data reference
  const chatLogs = await prisma.chatLog.findMany({
    select: { id: true, title: true, sessionDate: true, rawDataId: true },
    take: 10
  });
  
  console.log(`\n   ChatLog entries: ${chatLogs.length}`);
  for (const log of chatLogs) {
    console.log(`   - ${log.id} | ${log.title?.substring(0, 30)} | rawDataId: ${log.rawDataId}`);
  }

  // 4. Summary
  console.log('\n\n=== SUMMARY ===');
  console.log(`JSON files found: ${jsonFiles.length}`);
  
  let totalMessages = 0;
  let totalChats = 0;
  
  for (const file of jsonFiles) {
    const filePath = `${downloadDir}/${file}`;
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      if (data.data) {
        totalMessages += Object.keys(data.data).length;
        totalChats++;
      }
    } catch (e) {}
  }
  
  console.log(`Total chat sessions in files: ${totalChats}`);
  console.log(`Total messages in files: ${totalMessages}`);

  await prisma.$disconnect();
}

showRawDataRecords().catch(console.error);
