import { prisma } from '../src/lib/db';
import fs from 'fs';

async function analyzeMessageConnections() {
  console.log('\n=== MESSAGE CONNECTION ANALYSIS ===\n');

  // 1. Read raw JSON sample
  const rawFile = '/home/z/my-project/download/raw-chat-sample.json';
  let rawData: any = null;
  
  try {
    rawData = JSON.parse(fs.readFileSync(rawFile, 'utf-8'));
  } catch (e) {
    console.log('Could not read raw sample file');
    return;
  }

  console.log('1. RAW JSON STRUCTURE:');
  console.log('   Top-level keys:', Object.keys(rawData));
  console.log('   chat_id:', rawData.chat_id);
  
  // 2. Analyze message tree structure
  console.log('\n2. MESSAGE TREE ANALYSIS:');
  const messages = rawData.data || {};
  const messageIds = Object.keys(messages);
  console.log(`   Total messages: ${messageIds.length}`);
  
  // Build connection map
  const connectionMap: Map<string, { 
    id: string; 
    parentId: string | null; 
    childrenIds: string[];
    role: string;
    contentPreview: string;
  }> = new Map();
  
  let rootMessages: string[] = [];
  let messageWithParent: string[] = [];
  
  for (const msgId of messageIds) {
    const msg = messages[msgId];
    const parentId = msg.parent_id || msg.parentId || null;
    const childrenIds = msg.childrenIds || [];
    const role = msg.role || 'unknown';
    const content = msg.content || '';
    const contentPreview = content.substring(0, 50).replace(/\n/g, ' ');
    
    connectionMap.set(msgId, {
      id: msgId,
      parentId,
      childrenIds,
      role,
      contentPreview
    });
    
    if (!parentId) {
      rootMessages.push(msgId);
    } else {
      messageWithParent.push(msgId);
    }
  }
  
  console.log(`   Root messages (no parent): ${rootMessages.length}`);
  console.log(`   Child messages (have parent): ${messageWithParent.length}`);
  
  // 3. Show message tree
  console.log('\n3. MESSAGE TREE (first 10 messages):');
  
  // Find first root and traverse
  function printTree(msgId: string, indent: number = 0, visited: Set<string> = new Set()) {
    if (visited.has(msgId) || indent > 3) return;
    visited.add(msgId);
    
    const msg = connectionMap.get(msgId);
    if (!msg) return;
    
    const prefix = '   ' + '  '.repeat(indent) + (indent > 0 ? '└─ ' : '• ');
    console.log(`${prefix}[${msg.role}] ${msg.id.substring(0, 8)}... "${msg.contentPreview.substring(0, 30)}..."`);
    console.log(`${'   ' + '  '.repeat(indent)}   parent: ${msg.parentId?.substring(0, 8) || 'ROOT'}`);
    console.log(`${'   ' + '  '.repeat(indent)}   children: ${msg.childrenIds.length}`);
    
    for (const childId of msg.childrenIds.slice(0, 2)) {
      printTree(childId, indent + 1, visited);
    }
  }
  
  // Print from root messages
  for (const rootId of rootMessages.slice(0, 2)) {
    printTree(rootId, 0);
  }
  
  // 4. Check if database stores this structure
  console.log('\n4. DATABASE SCHEMA CHECK:');
  
  // Check AISession fields
  const sessionSample = await prisma.aISession.findFirst({
    select: { 
      id: true, 
      chatId: true, 
      parentMessageId: true, 
      childMessageIds: true,
      messageIndex: true,
      title: true 
    }
  });
  
  if (sessionSample) {
    console.log('   AISession sample:');
    console.log(`   - id: ${sessionSample.id}`);
    console.log(`   - chatId: ${sessionSample.chatId}`);
    console.log(`   - parentMessageId: ${sessionSample.parentMessageId || 'NULL'}`);
    console.log(`   - childMessageIds: ${JSON.stringify(sessionSample.childMessageIds) || 'NULL'}`);
    console.log(`   - messageIndex: ${sessionSample.messageIndex}`);
  }
  
  // 5. Check if same message IDs exist in multiple sessions
  console.log('\n5. CHECKING FOR DUPLICATE MESSAGE IDs:');
  
  // Get all externalId from AISession (should store message.id)
  const sessionsWithExternalId = await prisma.$queryRaw<{ id: string; externalId: string; title: string }[]>`
    SELECT id, externalId, title FROM AISession 
    WHERE externalId IS NOT NULL AND externalId != ''
    LIMIT 10
  `;
  
  console.log(`   Sessions with externalId: ${sessionsWithExternalId.length}`);
  for (const s of sessionsWithExternalId.slice(0, 5)) {
    console.log(`   - externalId: ${s.externalId?.substring(0, 20)}... title: ${s.title?.substring(0, 30)}`);
  }
  
  // Check for duplicate externalIds
  const duplicateExtIds = await prisma.$queryRaw<{ externalId: string; count: bigint }[]>`
    SELECT externalId, COUNT(*) as count 
    FROM AISession 
    WHERE externalId IS NOT NULL AND externalId != ''
    GROUP BY externalId 
    HAVING COUNT(*) > 1
  `;
  
  if (duplicateExtIds.length > 0) {
    console.log(`\n   ⚠️ Found ${duplicateExtIds.length} duplicate externalIds!`);
    for (const d of duplicateExtIds) {
      console.log(`   - ${d.externalId} appears ${d.count} times`);
    }
  } else {
    console.log(`\   ✓ No duplicate externalIds found`);
  }
  
  // 6. Analyze ChatLog structure
  console.log('\n6. CHATLOG MESSAGE CONNECTION:');
  const chatLogSample = await prisma.chatLog.findFirst({
    select: { id: true, title: true, issuesSolved: true, featuresAdded: true }
  });
  if (chatLogSample) {
    console.log(`   ChatLog ID: ${chatLogSample.id}`);
    console.log(`   Title: ${chatLogSample.title}`);
    console.log(`   Issues: ${JSON.stringify(chatLogSample.issuesSolved)?.substring(0, 50)}`);
  }

  // 7. Summary of connection structure
  console.log('\n=== SUMMARY ===');
  console.log('Raw JSON Message Structure:');
  console.log('  • Each message has: id, parent_id, childrenIds');
  console.log('  • Forms a tree with root messages having no parent');
  console.log(`  • Sample: ${rootMessages.length} roots, ${messageWithParent.length} children`);
  console.log('');
  console.log('Database Storage:');
  console.log(`  • AISession has parentMessageId, childMessageIds fields`);
  console.log(`  • But import creates GENERATED chatId instead of using message.id`);
  console.log('');
  console.log('⚠️ DEDUPLICATION ISSUE:');
  console.log('  • Message.id should be stored as externalId');
  console.log('  • chat_id should be stored as chatId');
  console.log('  • Currently using generated IDs, breaking proper deduplication');

  await prisma.$disconnect();
}

analyzeMessageConnections().catch(console.error);
