const { PrismaClient } = require('@prisma/client');
const { extractAnalyticsFromBatchResponse } = require('./src/lib/analytics-extraction-service');

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('[Extraction Script] Starting...');
    
    // Get raw data
    const raw = await prisma.rawImportData.findFirst({
      where: { parseStatus: 'pending' },
      select: { id: true, rawJson: true }
    });
    
    if (!raw) {
      console.log('[Extraction Script] No pending raw data found');
      return;
    }
    
    console.log('[Extraction Script] Found raw data:', raw.id);
    
    // Parse JSON
    const parsed = JSON.parse(raw.rawJson);
    
    // Extract messages
    let messages = [];
    if (parsed.data && typeof parsed.data === 'object') {
      messages = Object.values(parsed.data);
    } else if (Array.isArray(parsed.messages)) {
      messages = parsed.messages;
    } else if (Array.isArray(parsed)) {
      messages = parsed;
    }
    
    console.log('[Extraction Script] Messages count:', messages.length);
    
    // Get chat ID
    const chatId = parsed.chat_id || `parsed_${raw.id}`;
    
    console.log('[Extraction Script] Running extraction for chatId:', chatId);
    
    // Run extraction
    const result = await extractAnalyticsFromBatchResponse(chatId, messages, {
      saveToDb: true,
      enhanceWithAI: false
    });
    
    console.log('[Extraction Script] Extraction complete!');
    console.log('[Extraction Script] Session title:', result.session.title);
    console.log('[Extraction Script] Total tokens:', result.session.totalTokens);
    console.log('[Extraction Script] Files modified:', result.session.filesModified);
    console.log('[Extraction Script] Files created:', result.session.filesCreated);
    console.log('[Extraction Script] Features:', result.features.length);
    console.log('[Extraction Script] Issues:', result.issues.length);
    
    // Update raw data status
    await prisma.rawImportData.update({
      where: { id: raw.id },
      data: {
        parseStatus: 'parsed',
        parsedAt: new Date()
      }
    });
    
    console.log('[Extraction Script] SUCCESS!');
    
  } catch (error) {
    console.error('[Extraction Script] ERROR:', error);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

main();
