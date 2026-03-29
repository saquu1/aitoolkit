import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import ZAI from 'z-ai-web-dev-sdk';

const prisma = new PrismaClient();

interface ExtractedLog {
  sessionDate: string;
  title: string;
  summary: string;
  highlights: string[];
  issuesFixed: string[];
  implementations: string[];
  futurePlans: string[];
  filesModified: string[];
  technicalDetails: string;
}

/**
 * Extract comprehensive chat logs from conversation text using AI
 * POST /api/chat-logs/extract
 * Body: { chatText: string, sessionDate?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { chatText, sessionDate } = body;

    if (!chatText || typeof chatText !== 'string') {
      return NextResponse.json(
        { error: 'chatText is required' },
        { status: 400 }
      );
    }

    // Initialize AI
    const zai = await ZAI.create();

    // Use AI to extract structured information from chat
    const extractionPrompt = `You are an expert at analyzing development chat conversations and extracting structured logs.

Analyze the following chat conversation and extract comprehensive information. Return ONLY a valid JSON object with this exact structure:

{
  "title": "A concise title summarizing the main work done (max 100 chars)",
  "summary": "A detailed summary of what was accomplished in this session (2-3 sentences)",
  "highlights": ["list of key highlights/achievements"],
  "issuesFixed": ["list of bugs/issues that were fixed"],
  "implementations": ["list of features/components that were implemented"],
  "futurePlans": ["list of planned future work or next steps mentioned"],
  "filesModified": ["list of files that were created or modified"],
  "technicalDetails": "Any important technical decisions, patterns used, or architecture notes"
}

Be thorough and comprehensive. Extract ALL relevant information from the conversation.

Chat Conversation:
---
${chatText}
---

Return ONLY the JSON object, no markdown formatting or explanation.`;

    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are a precise data extraction assistant that returns only valid JSON.'
        },
        {
          role: 'user',
          content: extractionPrompt
        }
      ],
      temperature: 0.3,
      max_tokens: 2000
    });

    const responseText = completion.choices[0]?.message?.content || '';
    
    // Parse the JSON response
    let extractedData: ExtractedLog;
    try {
      // Clean up any markdown formatting
      let cleanJson = responseText.trim();
      if (cleanJson.startsWith('```json')) {
        cleanJson = cleanJson.replace(/^```json\n?/, '').replace(/\n?```$/, '');
      } else if (cleanJson.startsWith('```')) {
        cleanJson = cleanJson.replace(/^```\n?/, '').replace(/\n?```$/, '');
      }
      
      const parsed = JSON.parse(cleanJson);
      extractedData = {
        sessionDate: sessionDate || new Date().toISOString().split('T')[0],
        title: parsed.title || 'Untitled Session',
        summary: parsed.summary || '',
        highlights: Array.isArray(parsed.highlights) ? parsed.highlights : [],
        issuesFixed: Array.isArray(parsed.issuesFixed) ? parsed.issuesFixed : [],
        implementations: Array.isArray(parsed.implementations) ? parsed.implementations : [],
        futurePlans: Array.isArray(parsed.futurePlans) ? parsed.futurePlans : [],
        filesModified: Array.isArray(parsed.filesModified) ? parsed.filesModified : [],
        technicalDetails: parsed.technicalDetails || ''
      };
    } catch (parseError) {
      console.error('Failed to parse AI response:', responseText);
      return NextResponse.json(
        { error: 'Failed to parse extraction results', rawResponse: responseText },
        { status: 500 }
      );
    }

    // Generate a unique session ID
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Save to database
    const chatLog = await prisma.chatLog.create({
      data: {
        id: `log-${Date.now()}`,
        sessionId: sessionId,
        sessionDate: extractedData.sessionDate,
        title: extractedData.title,
        summary: extractedData.summary,
        issuesSolved: JSON.stringify(extractedData.issuesFixed),
        featuresAdded: JSON.stringify(extractedData.implementations),
        filesModified: JSON.stringify(extractedData.filesModified),
        commits: JSON.stringify(extractedData.futurePlans),
        notes: JSON.stringify({
          highlights: extractedData.highlights,
          technicalDetails: extractedData.technicalDetails
        }),
        source: 'ai-extract',
        updatedAt: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        ...extractedData,
        id: chatLog.id,
        sessionId: chatLog.sessionId
      }
    });

  } catch (error) {
    console.error('Chat extraction error:', error);
    return NextResponse.json(
      { error: 'Failed to extract chat logs', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

/**
 * Extract and preview without saving
 * PUT /api/chat-logs/extract
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { chatText, sessionDate } = body;

    if (!chatText || typeof chatText !== 'string') {
      return NextResponse.json(
        { error: 'chatText is required' },
        { status: 400 }
      );
    }

    // Initialize AI
    const zai = await ZAI.create();

    const extractionPrompt = `You are an expert at analyzing development chat conversations and extracting structured logs.

Analyze the following chat conversation and extract comprehensive information. Return ONLY a valid JSON object with this exact structure:

{
  "title": "A concise title summarizing the main work done (max 100 chars)",
  "summary": "A detailed summary of what was accomplished in this session (2-3 sentences)",
  "highlights": ["list of key highlights/achievements"],
  "issuesFixed": ["list of bugs/issues that were fixed"],
  "implementations": ["list of features/components that were implemented"],
  "futurePlans": ["list of planned future work or next steps mentioned"],
  "filesModified": ["list of files that were created or modified"],
  "technicalDetails": "Any important technical decisions, patterns used, or architecture notes"
}

Be thorough and comprehensive. Extract ALL relevant information from the conversation.

Chat Conversation:
---
${chatText}
---

Return ONLY the JSON object, no markdown formatting or explanation.`;

    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are a precise data extraction assistant that returns only valid JSON.'
        },
        {
          role: 'user',
          content: extractionPrompt
        }
      ],
      temperature: 0.3,
      max_tokens: 2000
    });

    const responseText = completion.choices[0]?.message?.content || '';
    
    // Parse the JSON response
    let extractedData;
    try {
      let cleanJson = responseText.trim();
      if (cleanJson.startsWith('```json')) {
        cleanJson = cleanJson.replace(/^```json\n?/, '').replace(/\n?```$/, '');
      } else if (cleanJson.startsWith('```')) {
        cleanJson = cleanJson.replace(/^```\n?/, '').replace(/\n?```$/, '');
      }
      
      const parsed = JSON.parse(cleanJson);
      extractedData = {
        sessionDate: sessionDate || new Date().toISOString().split('T')[0],
        title: parsed.title || 'Untitled Session',
        summary: parsed.summary || '',
        highlights: Array.isArray(parsed.highlights) ? parsed.highlights : [],
        issuesFixed: Array.isArray(parsed.issuesFixed) ? parsed.issuesFixed : [],
        implementations: Array.isArray(parsed.implementations) ? parsed.implementations : [],
        futurePlans: Array.isArray(parsed.futurePlans) ? parsed.futurePlans : [],
        filesModified: Array.isArray(parsed.filesModified) ? parsed.filesModified : [],
        technicalDetails: parsed.technicalDetails || ''
      };
    } catch (parseError) {
      console.error('Failed to parse AI response:', responseText);
      return NextResponse.json(
        { error: 'Failed to parse extraction results', rawResponse: responseText },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      preview: true,
      data: extractedData
    });

  } catch (error) {
    console.error('Chat extraction error:', error);
    return NextResponse.json(
      { error: 'Failed to extract chat logs', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
