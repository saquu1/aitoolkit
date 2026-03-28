/**
 * Check if a specific message entry already exists in RawImportData
 * Deduplication logic: message.id + parent_id + childrenIds
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// The entry to check
const ENTRY_TO_CHECK = {
  chat_id: "3286341f-bf13-4a10-be2d-eea782660c9d",
  data: {
    "23914801-3f4b-4fd1-8641-2413fd6bad0b": {
      id: "23914801-3f4b-4fd1-8641-2413fd6bad0b",
      chat_id: "3286341f-bf13-4a10-be2d-eea782660c9d",
      user_id: "62ebb535-8355-4f32-9432-84fa0a9631a1",
      parent_id: "7cc6b06a-5a94-4187-829a-5677ec72daee",
      parentId: "7cc6b06a-5a94-4187-829a-5677ec72daee",
      childrenIds: ["aa17f698-e7e1-43ee-94d5-59744d4e99a8"]
    }
  }
}

// Target message to check
const TARGET_MESSAGE_ID = "23914801-3f4b-4fd1-8641-2413fd6bad0b"
const TARGET_PARENT_ID = "7cc6b06a-5a94-4187-829a-5677ec72daee"
const TARGET_CHILDREN_IDS = ["aa17f698-e7e1-43ee-94d5-59744d4e99a8"].sort().join(',')

async function checkDuplicate() {
  console.log('=== DUPLICATE CHECK ===')
  console.log(`Checking message ID: ${TARGET_MESSAGE_ID}`)
  console.log(`Parent ID: ${TARGET_PARENT_ID}`)
  console.log(`Children IDs: ${TARGET_CHILDREN_IDS}`)
  console.log('')
  
  // Get all raw imports
  const rawImports = await prisma.rawImportData.findMany({
    select: { 
      id: true, 
      rawJson: true,
      importedAt: true,
      chatLog: {
        select: { id: true, title: true, sessionId: true }
      }
    },
    orderBy: { importedAt: 'desc' }
  })
  
  console.log(`Total RawImportData records: ${rawImports.length}\n`)
  
  let exactMatches: any[] = []
  let evolvedMatches: any[] = []
  let chatIdMatches: any[] = []
  
  for (const raw of rawImports) {
    if (!raw.rawJson) continue
    
    try {
      const parsed = JSON.parse(raw.rawJson)
      let messages: any[] = []
      
      // Handle different JSON formats
      if (parsed.data && typeof parsed.data === 'object') {
        messages = Object.values(parsed.data)
      } else if (Array.isArray(parsed.messages)) {
        messages = parsed.messages
      } else if (Array.isArray(parsed)) {
        messages = parsed
      }
      
      // Check each message
      for (const msg of messages) {
        if (!msg || !msg.id) continue
        
        // Check if this is the same chat_id
        if (msg.chat_id === ENTRY_TO_CHECK.chat_id || parsed.chat_id === ENTRY_TO_CHECK.chat_id) {
          chatIdMatches.push({
            rawDataId: raw.id,
            chatLog: raw.chatLog,
            importedAt: raw.importedAt
          })
        }
        
        // Check for message.id match
        if (msg.id === TARGET_MESSAGE_ID) {
          const msgParentId = msg.parent_id || msg.parentId || 'NULL'
          const msgChildrenIds = (msg.childrenIds || []).sort().join(',')
          
          if (msgParentId === TARGET_PARENT_ID && msgChildrenIds === TARGET_CHILDREN_IDS) {
            // EXACT DUPLICATE
            exactMatches.push({
              rawDataId: raw.id,
              chatLog: raw.chatLog,
              importedAt: raw.importedAt,
              message: msg
            })
          } else {
            // EVOLVED - Same message.id but different parent/children
            evolvedMatches.push({
              rawDataId: raw.id,
              chatLog: raw.chatLog,
              importedAt: raw.importedAt,
              message: msg,
              differences: {
                parentId: { expected: TARGET_PARENT_ID, actual: msgParentId },
                childrenIds: { expected: TARGET_CHILDREN_IDS, actual: msgChildrenIds }
              }
            })
          }
        }
      }
    } catch (e) {
      // Skip invalid JSON
    }
  }
  
  // Remove duplicates from arrays
  const uniqueChatIdMatches = [...new Map(chatIdMatches.map(m => [m.rawDataId, m])).values()]
  
  console.log('=== RESULTS ===\n')
  
  if (exactMatches.length > 0) {
    console.log(`🔴 EXACT DUPLICATE FOUND: ${exactMatches.length} match(es)`)
    console.log('   This message with same id + parent_id + childrenIds already exists!\n')
    
    for (const match of exactMatches) {
      console.log(`   Raw Data ID: ${match.rawDataId}`)
      console.log(`   Chat Log: ${match.chatLog?.title || 'N/A'}`)
      console.log(`   Chat Log ID: ${match.chatLog?.id || 'N/A'}`)
      console.log(`   Session ID: ${match.chatLog?.sessionId || 'N/A'}`)
      console.log(`   Imported At: ${match.importedAt}`)
      console.log(`   View Link: /raw-data/${match.rawDataId}`)
      console.log('')
    }
    
    return { status: 'exact_duplicate', matches: exactMatches }
  }
  
  if (evolvedMatches.length > 0) {
    console.log(`🟡 EVOLVED CONVERSATION FOUND: ${evolvedMatches.length} match(es)`)
    console.log('   Same message.id exists but with different parent_id or childrenIds')
    console.log('   This means the conversation has evolved.\n')
    
    for (const match of evolvedMatches) {
      console.log(`   Raw Data ID: ${match.rawDataId}`)
      console.log(`   Chat Log: ${match.chatLog?.title || 'N/A'}`)
      console.log(`   Imported At: ${match.importedAt}`)
      console.log(`   Differences:`)
      console.log(`     - Parent ID: expected="${match.differences.parentId.expected}" actual="${match.differences.parentId.actual}"`)
      console.log(`     - Children IDs: expected="${match.differences.childrenIds.expected}" actual="${match.differences.childrenIds.actual}"`)
      console.log('')
    }
    
    return { status: 'evolved', matches: evolvedMatches }
  }
  
  if (uniqueChatIdMatches.length > 0) {
    console.log(`🟢 SAME CHAT_ID FOUND: ${uniqueChatIdMatches.length} record(s)`)
    console.log('   Records exist for the same chat_id, but this message is new.')
    console.log('   You can import this as a new message in the existing conversation.\n')
    
    for (const match of uniqueChatIdMatches.slice(0, 5)) {
      console.log(`   Raw Data ID: ${match.rawDataId}`)
      console.log(`   Chat Log: ${match.chatLog?.title || 'N/A'}`)
      console.log(`   Imported At: ${match.importedAt}`)
      console.log('')
    }
    
    if (uniqueChatIdMatches.length > 5) {
      console.log(`   ... and ${uniqueChatIdMatches.length - 5} more records`)
    }
    
    return { status: 'new_message', existingChat: uniqueChatIdMatches }
  }
  
  console.log('✅ NO DUPLICATES FOUND')
  console.log('   This message does not exist in the database.')
  console.log('   Safe to import as new data.\n')
  
  return { status: 'new', matches: [] }
}

checkDuplicate()
  .then((result) => {
    console.log('\n=== SUMMARY ===')
    console.log(`Status: ${result.status.toUpperCase()}`)
    
    if (result.status === 'exact_duplicate') {
      console.log('\n⚠️  ACTION REQUIRED:')
      console.log('   Do NOT save this data - it is an exact duplicate.')
      console.log('   Use the existing raw data record instead.')
    } else if (result.status === 'evolved') {
      console.log('\n⚠️  ACTION REQUIRED:')
      console.log('   This is an EVOLVED conversation.')
      console.log('   You may save this as an updated version.')
    } else if (result.status === 'new_message') {
      console.log('\n✅ ACTION:')
      console.log('   This is a NEW message in an existing chat.')
      console.log('   Safe to import.')
    } else {
      console.log('\n✅ ACTION:')
      console.log('   Safe to import as completely new data.')
    }
  })
  .catch(console.error)
  .finally(() => prisma.$disconnect())
