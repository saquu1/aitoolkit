import { prisma } from '../src/lib/db';

async function showDbRawData() {
  console.log('\n=== RAW DATA STORED IN DATABASE ===\n');

  // 1. Check RawImportData table
  console.log('1. RawImportData TABLE:');
  try {
    const rawImportData = await prisma.$queryRaw<{ 
      id: string; 
      sourceChatId: string | null;
      fileName: string | null;
      importedAt: Date;
    }[]>`
      SELECT id, sourceChatId, fileName, importedAt FROM RawImportData LIMIT 10
    `;
    
    console.log(`   Records: ${rawImportData.length}`);
    for (const r of rawImportData) {
      console.log(`   - ID: ${r.id}`);
      console.log(`     sourceChatId: ${r.sourceChatId}`);
      console.log(`     fileName: ${r.fileName}`);
      console.log(`     importedAt: ${r.importedAt}`);
    }
  } catch (e) {
    console.log(`   Error: ${e}`);
  }

  // 2. Check RawImportData structure (columns)
  console.log('\n2. RawImportData COLUMNS:');
  const columns = await prisma.$queryRaw<{ name: string; type: string }[]>`
    PRAGMA table_info(RawImportData)
  `;
  for (const col of columns) {
    console.log(`   - ${col.name} (${col.type})`);
  }

  // 3. Check if there's rawJson or data column
  console.log('\n3. RAW DATA CONTENT:');
  try {
    const rawDataContent = await prisma.$queryRaw<{ 
      id: string; 
      rawJson: string | null;
      sourceChatId: string | null;
    }[]>`
      SELECT id, rawJson, sourceChatId FROM RawImportData LIMIT 3
    `;
    
    for (const r of rawDataContent) {
      console.log(`\n   Record ID: ${r.id}`);
      console.log(`   sourceChatId: ${r.sourceChatId}`);
      
      if (r.rawJson) {
        try {
          const parsed = JSON.parse(r.rawJson);
          console.log(`   JSON keys: ${Object.keys(parsed).slice(0, 5).join(', ')}`);
          
          if (parsed.chat_id) {
            console.log(`   chat_id: ${parsed.chat_id}`);
          }
          
          if (parsed.data) {
            const msgIds = Object.keys(parsed.data);
            console.log(`   Messages: ${msgIds.length}`);
            
            // Show first 3 messages with id, parent_id, childrenIds
            console.log('\n   Message samples (id | parent_id | childrenIds):');
            for (const msgId of msgIds.slice(0, 5)) {
              const msg = parsed.data[msgId];
              const parentId = msg.parent_id || msg.parentId || 'NULL';
              const childrenIds = msg.childrenIds || [];
              const role = msg.role || 'unknown';
              
              const shortId = msgId.split('-')[0];
              const shortParent = parentId !== 'NULL' ? parentId.split('-')[0] : 'NULL';
              const childCount = childrenIds.length;
              
              console.log(`     [${shortId}] parent:[${shortParent}] children:${childCount} (${role})`);
            }
          }
        } catch (e) {
          console.log(`   Parse error: ${e}`);
        }
      } else {
        console.log('   rawJson: NULL');
      }
    }
  } catch (e) {
    console.log(`   Error: ${e}`);
  }

  // 4. Check RawDataLink table
  console.log('\n\n4. RawDataLink TABLE:');
  try {
    const rawDataLinks = await prisma.$queryRaw<{ 
      id: string; 
      rawImportId: string;
      targetType: string;
      targetId: string;
    }[]>`
      SELECT id, rawImportId, targetType, targetId FROM RawDataLink LIMIT 10
    `;
    
    console.log(`   Records: ${rawDataLinks.length}`);
    for (const r of rawDataLinks) {
      console.log(`   - ${r.id} | rawImport: ${r.rawImportId?.substring(0, 10)} | target: ${r.targetType}/${r.targetId?.substring(0, 10)}`);
    }
  } catch (e) {
    console.log(`   Error: ${e}`);
  }

  // 5. Count totals
  console.log('\n\n5. TOTALS:');
  const rawImportCount = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*) as count FROM RawImportData
  `;
  const rawDataLinkCount = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*) as count FROM RawDataLink
  `;
  
  console.log(`   RawImportData: ${rawImportCount[0].count} records`);
  console.log(`   RawDataLink: ${rawDataLinkCount[0].count} records`);

  await prisma.$disconnect();
}

showDbRawData().catch(console.error);
