import { prisma } from '../src/lib/db';
import fs from 'fs';

async function deepMessageAnalysis() {
  console.log('\n=== DEEP MESSAGE CONNECTION ANALYSIS ===\n');

  // Read raw JSON
  const rawFile = '/home/z/my-project/download/raw-chat-sample.json';
  const rawData = JSON.parse(fs.readFileSync(rawFile, 'utf-8'));
  const messages = rawData.data || {};
  const messageIds = Object.keys(messages);

  console.log('1. ALL MESSAGES WITH CONNECTIONS:');
  console.log('   Format: [id] -> parent -> children\n');

  // Build full tree visualization
  interface MsgNode {
    id: string;
    parentId: string | null;
    childrenIds: string[];
    role: string;
    content: string;
  }

  const msgMap = new Map<string, MsgNode>();
  const parentToChildren = new Map<string, string[]>();
  const childToParent = new Map<string, string>();
  
  for (const msgId of messageIds) {
    const msg = messages[msgId];
    const parentId = msg.parent_id || msg.parentId || null;
    const childrenIds = msg.childrenIds || [];
    
    msgMap.set(msgId, {
      id: msgId,
      parentId,
      childrenIds,
      role: msg.role,
      content: (msg.content || '').substring(0, 60).replace(/\n/g, ' ')
    });
    
    if (parentId) {
      childToParent.set(msgId, parentId);
      if (!parentToChildren.has(parentId)) {
        parentToChildren.set(parentId, []);
      }
      parentToChildren.get(parentId)!.push(msgId);
    }
  }

  // Print all messages
  for (const msgId of messageIds) {
    const msg = msgMap.get(msgId)!;
    const shortId = msgId.substring(0, 8);
    const shortParent = msg.parentId ? msg.parentId.substring(0, 8) : 'ROOT';
    const childrenCount = msg.childrenIds.length;
    const childPreview = msg.childrenIds.length > 0 
      ? ' -> [' + msg.childrenIds.map(c => c.substring(0, 8)).join(', ') + ']'
      : '';
    
    console.log(`   [${shortId}] (${msg.role.padEnd(9)}) parent: ${shortParent}${childPreview}`);
    console.log(`      content: "${msg.content}..."`);
  }

  // 2. Find orphan messages (parent not in this dataset)
  console.log('\n2. ORPHAN ANALYSIS:');
  const orphanMessages: string[] = [];
  for (const msgId of messageIds) {
    const msg = msgMap.get(msgId)!;
    if (msg.parentId && !messages[msg.parentId]) {
      orphanMessages.push(msgId);
    }
  }
  console.log(`   Messages whose parent is NOT in dataset: ${orphanMessages.length}`);
  for (const o of orphanMessages) {
    const msg = msgMap.get(o)!;
    console.log(`   - [${o.substring(0, 8)}] parent: ${msg.parentId?.substring(0, 8)} (MISSING)`);
  }

  // 3. Find messages referenced by others but not in dataset
  console.log('\n3. REFERENCED BUT MISSING:');
  const allReferencedParents = new Set<string>();
  for (const msgId of messageIds) {
    const msg = msgMap.get(msgId)!;
    if (msg.parentId) allReferencedParents.add(msg.parentId);
    for (const c of msg.childrenIds) allReferencedParents.add(c);
  }
  
  const missing = [...allReferencedParents].filter(id => !messages[id]);
  console.log(`   IDs referenced but not in dataset: ${missing.length}`);
  for (const m of missing.slice(0, 5)) {
    console.log(`   - ${m.substring(0, 20)}...`);
  }

  // 4. Build actual tree from leaves up
  console.log('\n4. MESSAGE THREAD RECONSTRUCTION:');
  
  // Find message chain (follow parent links up)
  function getAncestorChain(msgId: string, visited: Set<string> = new Set()): string[] {
    if (visited.has(msgId)) return [];
    visited.add(msgId);
    
    const msg = msgMap.get(msgId);
    if (!msg || !msg.parentId) return [msgId];
    
    const parentChain = getAncestorChain(msg.parentId, visited);
    return [...parentChain, msgId];
  }
  
  // Find longest chain
  let longestChain: string[] = [];
  for (const msgId of messageIds) {
    const chain = getAncestorChain(msgId);
    if (chain.length > longestChain.length) {
      longestChain = chain;
    }
  }
  
  console.log(`   Longest message chain: ${longestChain.length} messages`);
  console.log('\n   Thread (from earliest to latest):');
  for (let i = 0; i < longestChain.length; i++) {
    const msgId = longestChain[i];
    const msg = msgMap.get(msgId);
    if (msg) {
      const arrow = i === 0 ? 'START' : '  ↓';
      console.log(`   ${arrow} [${msgId.substring(0, 8)}] (${msg.role}) "${msg.content.substring(0, 40)}..."`);
    }
  }

  // 5. Check what the import process does with this data
  console.log('\n5. DATABASE vs RAW COMPARISON:');
  
  // Check if any session has the real message.id
  const realMessageIds = messageIds.slice(0, 3);
  for (const realId of realMessageIds) {
    const session = await prisma.aISession.findFirst({
      where: {
        OR: [
          { externalId: realId },
          { chatId: realId }
        ]
      }
    });
    if (session) {
      console.log(`   ✓ Message ${realId.substring(0, 8)} found in database!`);
    } else {
      console.log(`   ✗ Message ${realId.substring(0, 8)} NOT in database`);
    }
  }

  // 6. Summary
  console.log('\n=== FINAL ANALYSIS ===');
  console.log(`\nRaw Data:`);
  console.log(`  • chat_id: ${rawData.chat_id}`);
  console.log(`  • Total messages: ${messageIds.length}`);
  console.log(`  • Orphan messages: ${orphanMessages.length}`);
  console.log(`  • Message chain length: ${longestChain.length}`);
  
  console.log(`\nDeduplication Keys Available:`);
  console.log(`  1. chat_id (conversation level): ${rawData.chat_id}`);
  console.log(`  2. message.id (individual message): ${realMessageIds.join(', ').substring(0, 50)}...`);
  console.log(`  3. parent_id (thread structure): connects messages in tree`);
  
  console.log(`\n⚠️ CURRENT IMPORT:`);
  console.log(`  • Creates NEW chatId (batch_*, parsed_*) instead of using chat_id`);
  console.log(`  • Does NOT store message.id as externalId`);
  console.log(`  • Loses parent/child message relationships`);
  console.log(`\n✓ PROPER DEDUPLICATION SHOULD:`);
  console.log(`  • Use chat_id to prevent duplicate conversations`);
  console.log(`  • Use message.id to prevent duplicate messages`);
  console.log(`  • Preserve parent_id/childrenIds for thread structure`);

  await prisma.$disconnect();
}

deepMessageAnalysis().catch(console.error);
