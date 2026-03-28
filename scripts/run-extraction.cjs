const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const MODEL_PRICING = {
  'glm-5': { input: 0.001, output: 0.002 },
  'glm-4': { input: 0.002, output: 0.004 },
  'claude-3-opus': { input: 0.015, output: 0.075 },
  'claude-3-sonnet': { input: 0.003, output: 0.015 },
  'claude-3-haiku': { input: 0.00025, output: 0.00125 },
  'gpt-4-turbo': { input: 0.01, output: 0.03 },
  'gpt-4': { input: 0.03, output: 0.06 },
  'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
  'unknown': { input: 0.003, output: 0.006 }
};

async function main() {
  console.log('[Extraction] Starting...');
  
  const raw = await prisma.rawImportData.findFirst({
    where: { parseStatus: 'pending' }
  });
  
  if (!raw) {
    console.log('[Extraction] No pending raw data');
    return;
  }
  
  console.log('[Extraction] Found raw data:', raw.id);
  
  const parsed = JSON.parse(raw.rawJson);
  
  let messages = [];
  if (parsed.data && typeof parsed.data === 'object') {
    messages = Object.values(parsed.data);
  } else if (Array.isArray(parsed.messages)) {
    messages = parsed.messages;
  } else if (Array.isArray(parsed)) {
    messages = parsed;
  }
  
  console.log('[Extraction] Messages:', messages.length);
  
  messages.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
  
  const chatId = `parsed_${raw.id}_${Date.now()}`;
  
  // Extract data
  const allToolCalls = [];
  const allUserContent = [];
  const allReasoning = [];
  
  for (const msg of messages) {
    if (msg.role === 'user' && msg.content) {
      allUserContent.push(msg.content);
    }
    
    if (msg.content_blocks) {
      for (const block of msg.content_blocks) {
        if (block.type === 'tool_calls' && Array.isArray(block.content)) {
          for (const tc of block.content) {
            if (tc.function) {
              try {
                const args = typeof tc.function.arguments === 'string'
                  ? JSON.parse(tc.function.arguments)
                  : tc.function.arguments;
                
                const result = block.results?.find(r => r.tool_call_id === tc.id);
                
                allToolCalls.push({
                  name: tc.function.name,
                  args,
                  timestamp: block.started_at || msg.timestamp,
                  resultContent: result?.content?.slice(0, 10000) || null,
                  resultStatus: result?.status || 'completed'
                });
              } catch (e) {
                console.log('[Extraction] Failed to parse tool call:', tc.function?.name);
              }
            }
          }
        }
        
        if (block.type === 'reasoning' && typeof block.content === 'string') {
          allReasoning.push(block.content);
        }
      }
    }
  }
  
  console.log('[Extraction] Tool calls:', allToolCalls.length);
  
  // Extract files
  const filesCreated = new Set();
  const filesModified = new Set();
  
  for (const tc of allToolCalls) {
    if (tc.name === 'Write' && tc.args?.filepath) {
      filesCreated.add(tc.args.filepath);
    }
    if (tc.name === 'Edit' && tc.args?.filepath) {
      filesModified.add(tc.args.filepath);
    }
  }
  
  console.log('[Extraction] Files created:', filesCreated.size);
  console.log('[Extraction] Files modified:', filesModified.size);
  
  // Calculate tokens
  const totalContent = allUserContent.join('\n') + allReasoning.join('\n');
  const inputTokens = Math.ceil(totalContent.length / 4);
  const outputTokens = Math.ceil(allToolCalls.length * 500 + filesCreated.size * 200);
  const totalTokens = inputTokens + outputTokens;
  
  // Get model
  const lastMsg = messages[messages.length - 1];
  const model = lastMsg?.model || lastMsg?.model_name || 'unknown';
  
  // Calculate cost
  const pricing = MODEL_PRICING[model] || MODEL_PRICING['unknown'];
  const estimatedCost = (inputTokens / 1000 * pricing.input) + (outputTokens / 1000 * pricing.output);
  
  // Generate title
  const title = (allUserContent[0] || 'Development Session').slice(0, 100);
  
  // Calculate session dates
  const firstMsg = messages[0];
  const startTime = new Date((firstMsg?.timestamp || 0) * 1000);
  const endTime = new Date((lastMsg?.timestamp || 1) * 1000);
  const sessionDate = new Date(startTime.toISOString().split('T')[0]);
  const duration = Math.round((endTime.getTime() - startTime.getTime()) / 60000) || 1;
  
  console.log('[Extraction] Creating AISession...');
  
  // Create AISession
  const session = await prisma.aISession.create({
    data: {
      chatId,
      sessionDate,
      startTime,
      endTime,
      duration,
      inputTokens,
      outputTokens,
      totalTokens,
      estimatedCost,
      model,
      title,
      filesModified: filesModified.size,
      filesCreated: filesCreated.size,
      status: 'completed'
    }
  });
  
  console.log('[Extraction] Session created:', session.id);
  
  // Create ContentBlocks
  let blockIndex = 0;
  for (const msg of messages) {
    if (!msg.content_blocks) continue;
    
    for (const block of msg.content_blocks) {
    const blockType = block.type?.toUpperCase() === 'TOOL_CALLS' ? 'TOOL_CALLS' :
                   block.type?.toUpperCase() === 'REASONING' ? 'REASONING' : 'TEXT';
    
    const content = typeof block.content === 'string'
      ? block.content
      : JSON.stringify(block.content);
    
    await prisma.contentBlock.create({
      data: {
        sessionId: session.id,
        blockIndex: blockIndex++,
        blockType,
        content: content.slice(0, 50000),
        contentLength: content.length
      }
    });
  }
  }
  
  console.log('[Extraction] ContentBlocks:', blockIndex);
  
  // Create ToolCalls
  let toolCallsCreated = 0;
  for (const tc of allToolCalls) {
    // Map tool name to valid enum values
    let toolName = 'OTHER';
    const name = tc.name?.toUpperCase();
    if (name === 'BASH') toolName = 'BASH';
    else if (name === 'WRITE') toolName = 'WRITE';
    else if (name === 'READ') toolName = 'READ';
    else if (name === 'EDIT' || name === 'MULTIEDIT') toolName = 'EDIT';
    else if (name === 'TODOWRITE') toolName = 'TODO_WRITE';
    
    await prisma.toolCall.create({
      data: {
        sessionId: session.id,
        toolName,
        command: toolName === 'BASH' && tc.args?.command ? tc.args.command.slice(0, 5000) : null,
        filepath: tc.args?.filepath || null,
        resultContent: tc.resultContent,
        resultStatus: tc.resultStatus,
        hasError: tc.resultStatus === 'error'
      }
    });
    toolCallsCreated++;
  }
  
  console.log('[Extraction] ToolCalls:', toolCallsCreated);
  
  // Create FileOperations
  for (const filepath of filesCreated) {
    await prisma.fileOperation.create({
      data: {
        sessionId: session.id,
        filepath,
        operation: 'CREATED'
      }
    });
  }
  
  for (const filepath of filesModified) {
    if (!filesCreated.has(filepath)) {
      await prisma.fileOperation.create({
        data: {
          sessionId: session.id,
          filepath,
          operation: 'MODIFIED'
        }
      });
    }
  }
  
  console.log('[Extraction] FileOperations:', filesCreated.size + filesModified.size);
  
  // Update raw data status
  await prisma.rawImportData.update({
    where: { id: raw.id },
    data: {
    parseStatus: 'parsed',
    parsedAt: new Date()
  }
  });
  
  console.log('[Extraction] ========== SUCCESS ==========');
  console.log('[Extraction] Title:', title.slice(0, 50));
  console.log('[Extraction] Tokens:', totalTokens);
  console.log('[Extraction] Files created:', filesCreated.size);
  console.log('[Extraction] Files modified:', filesModified.size);
}

main().then(() => prisma.$disconnect());
