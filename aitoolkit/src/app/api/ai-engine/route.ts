// =============================================================================
// AI Engine API Route
// Handles AI-powered analysis, column intelligence, and chat
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { aiEngine } from '@/lib/ai-engine';
import { columnIntelligence } from '@/lib/column-intelligence';
import { parseSqlServer } from '@/lib/sql-parser';
import { HIS_LAYERS, getAllModules, getModuleStatistics, getModuleBuildOrder } from '@/lib/layer-definitions';
import { prisma } from '@/lib/db';

// Initialize AI engine on first request
let engineInitialized = false;

async function ensureEngineInitialized() {
  if (!engineInitialized) {
    await aiEngine.initialize();
    engineInitialized = true;
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureEngineInitialized();
    
    const body = await req.json();
    const { action } = body;

    switch (action) {
      case 'analyze-schema':
        return await analyzeSchema(body);
      
      case 'analyze-column':
        return await analyzeColumn(body);
      
      case 'analyze-fk':
        return await analyzeFKDependencies(body);
      
      case 'map-modules':
        return await mapTablesToModules(body);
      
      case 'chat':
        return await chat(body);
      
      case 'get-suggestions':
        return await getSchemaSuggestions(body);
      
      case 'save-conversation':
        return await saveConversation(body);
      
      case 'get-conversations':
        return await getConversations(body);
      
      case 'seed-modules':
        return await seedModules();
      
      case 'get-modules':
        return await getModules(body);
      
      case 'get-layers':
        return await getLayers();
      
      case 'get-statistics':
        return await getStatistics();
      
      case 'get-build-order':
        return await getBuildOrder();
      
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('AI Engine API error:', error);
    return NextResponse.json({ 
      error: errorMessage || 'Internal server error',
      stack: process.env.NODE_ENV === 'development' ? errorStack : undefined
    }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    await ensureEngineInitialized();
    
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');
    
    switch (action) {
      case 'get-modules':
        return await getModules({
          layer: searchParams.get('layer') ? parseInt(searchParams.get('layer')!) : undefined,
          status: searchParams.get('status') || undefined,
          search: searchParams.get('search') || undefined
        });
      
      case 'get-layers':
        return await getLayers();
      
      case 'get-statistics':
        return await getStatistics();
      
      case 'get-build-order':
        return await getBuildOrder();
      
      case 'get-conversations':
        return await getConversations({
          projectId: searchParams.get('projectId') || undefined
        });
      
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('AI Engine API error:', error);
    return NextResponse.json({ 
      error: errorMessage || 'Internal server error' 
    }, { status: 500 });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SCHEMA ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════

async function analyzeSchema(body: { sql: string }) {
  const { sql } = body;
  
  if (!sql) {
    return NextResponse.json({ error: 'SQL is required' }, { status: 400 });
  }
  
  // Parse SQL
  const parseResult = parseSqlServer(sql);
  
  if (parseResult.errors.length > 0) {
    return NextResponse.json({ 
      error: 'Parse errors', 
      errors: parseResult.errors 
    }, { status: 400 });
  }
  
  // Analyze columns
  const columnAnalysis = new Map();
  for (const table of parseResult.tables) {
    const tableAnalysis = columnIntelligence.analyzeTable(table);
    columnAnalysis.set(table.tableName, Object.fromEntries(tableAnalysis));
  }
  
  // Map to modules
  const moduleMapping = await aiEngine.mapTablesToModules(parseResult.tables);
  
  // Analyze FK dependencies
  const fkAnalysis = await aiEngine.analyzeFKDependencies(parseResult.tables);
  
  // Get schema suggestions
  const suggestions = await aiEngine.generateSchemaSuggestions(parseResult.tables);
  
  return NextResponse.json({
    success: true,
    parseResult: {
      tables: parseResult.tables,
      storedProcedures: parseResult.storedProcedures,
      stats: parseResult.stats
    },
    columnAnalysis: Object.fromEntries(columnAnalysis),
    moduleMapping: moduleMapping.data,
    fkAnalysis,
    suggestions: suggestions.data,
    engineMode: aiEngine.getMode()
  });
}

async function analyzeColumn(body: { column: Record<string, unknown>; tableName: string }) {
  const { column, tableName } = body;
  
  if (!column || !tableName) {
    return NextResponse.json({ error: 'Column and tableName are required' }, { status: 400 });
  }
  
  const result = columnIntelligence.analyzeColumn(column as any, tableName);
  
  return NextResponse.json({
    success: true,
    result
  });
}

async function analyzeFKDependencies(body: { sql: string }) {
  const { sql } = body;
  
  if (!sql) {
    return NextResponse.json({ error: 'SQL is required' }, { status: 400 });
  }
  
  const parseResult = parseSqlServer(sql);
  const analysis = await aiEngine.analyzeFKDependencies(parseResult.tables);
  
  return NextResponse.json({
    success: true,
    analysis
  });
}

async function mapTablesToModules(body: { sql: string }) {
  const { sql } = body;
  
  if (!sql) {
    return NextResponse.json({ error: 'SQL is required' }, { status: 400 });
  }
  
  const parseResult = parseSqlServer(sql);
  const mapping = await aiEngine.mapTablesToModules(parseResult.tables);
  
  return NextResponse.json({
    success: true,
    mapping: mapping.data,
    confidence: mapping.confidence,
    metadata: mapping.metadata
  });
}

async function getSchemaSuggestions(body: { sql: string }) {
  const { sql } = body;
  
  if (!sql) {
    return NextResponse.json({ error: 'SQL is required' }, { status: 400 });
  }
  
  const parseResult = parseSqlServer(sql);
  const result = await aiEngine.generateSchemaSuggestions(parseResult.tables);
  
  return NextResponse.json({
    success: true,
    ...result
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// CHAT
// ═══════════════════════════════════════════════════════════════════════════

async function chat(body: { messages: Array<{ role: string; content: string }> }) {
  const { messages } = body;
  
  if (!messages || !Array.isArray(messages)) {
    return NextResponse.json({ error: 'Messages array is required' }, { status: 400 });
  }
  
  if (aiEngine.getMode() !== 'cloud') {
    return NextResponse.json({
      success: false,
      error: 'Chat requires cloud mode. Set AI_MODE=cloud in environment.',
      mode: aiEngine.getMode()
    }, { status: 400 });
  }
  
  try {
    const response = await aiEngine.chat(messages);
    
    return NextResponse.json({
      success: true,
      response,
      mode: aiEngine.getMode()
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({
      success: false,
      error: errorMessage,
      mode: aiEngine.getMode()
    }, { status: 500 });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// CONVERSATIONS
// ═══════════════════════════════════════════════════════════════════════════

async function saveConversation(body: { 
  title?: string; 
  context?: string; 
  projectId?: string;
  messages: Array<{ role: string; content: string; metadata?: unknown }>;
}) {
  const { title, context, projectId, messages } = body;
  
  const conversation = await prisma.aIConversation.create({
    data: {
      title: title || `Conversation ${new Date().toLocaleString()}`,
      context: context || 'general',
      projectId: projectId || null,
      messages: {
        create: messages.map(m => ({
          role: m.role,
          content: m.content,
          metadata: m.metadata ? JSON.stringify(m.metadata) : null
        }))
      }
    },
    include: {
      messages: true
    }
  });
  
  return NextResponse.json({
    success: true,
    conversation
  });
}

async function getConversations(body: { projectId?: string }) {
  const { projectId } = body;
  
  const where: { projectId?: string } = {};
  if (projectId) where.projectId = projectId;
  
  const conversations = await prisma.aIConversation.findMany({
    where,
    include: {
      messages: {
        orderBy: { createdAt: 'asc' }
      }
    },
    orderBy: { updatedAt: 'desc' }
  });
  
  return NextResponse.json({
    success: true,
    conversations
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// MODULES
// ═══════════════════════════════════════════════════════════════════════════

async function seedModules() {
  const modules = getAllModules();
  let created = 0;
  let updated = 0;
  
  for (const mod of modules) {
    const existing = await prisma.hISModule.findUnique({
      where: { moduleKey: mod.key }
    });
    
    const layer = HIS_LAYERS.find(l => l.number === mod.layer);
    
    const data = {
      moduleKey: mod.key,
      moduleName: mod.name,
      description: mod.description || null,
      layer: mod.layer,
      layerName: layer?.name || '',
      priority: mod.priority,
      estimatedDays: mod.estimatedDays,
      tables: JSON.stringify(mod.tables),
      dependsOn: JSON.stringify(mod.dependsOn),
      features: JSON.stringify(mod.features),
      userRoles: JSON.stringify(mod.userRoles),
      revenue: mod.revenue
    };
    
    if (existing) {
      await prisma.hISModule.update({
        where: { moduleKey: mod.key },
        data
      });
      updated++;
    } else {
      await prisma.hISModule.create({ data });
      created++;
    }
  }
  
  return NextResponse.json({
    success: true,
    created,
    updated,
    total: modules.length
  });
}

async function getModules(body: { layer?: number; status?: string; search?: string }) {
  const { layer, status, search } = body;
  
  const where: {
    layer?: number;
    status?: string;
    OR?: Array<{
      moduleName?: { contains: string };
      moduleKey?: { contains: string };
      description?: { contains: string };
    }>;
  } = {};
  
  if (layer) where.layer = layer;
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { moduleName: { contains: search } },
      { moduleKey: { contains: search } },
      { description: { contains: search } }
    ];
  }
  
  const modules = await prisma.hISModule.findMany({
    where,
    orderBy: [
      { layer: 'asc' },
      { priority: 'desc' },
      { moduleName: 'asc' }
    ]
  });
  
  return NextResponse.json({
    success: true,
    modules,
    count: modules.length
  });
}

async function getLayers() {
  const layers = HIS_LAYERS.map(l => ({
    number: l.number,
    name: l.name,
    title: l.title,
    description: l.description,
    icon: l.icon,
    color: l.color,
    moduleCount: l.modules.length,
    estimatedDays: l.modules.reduce((sum, m) => sum + m.estimatedDays, 0)
  }));
  
  return NextResponse.json({
    success: true,
    layers
  });
}

async function getStatistics() {
  const stats = getModuleStatistics();
  const dbCount = await prisma.hISModule.count();
  
  return NextResponse.json({
    success: true,
    statistics: {
      ...stats,
      databaseCount: dbCount,
      engineMode: aiEngine.getMode()
    }
  });
}

async function getBuildOrder() {
  const order = getModuleBuildOrder();
  
  return NextResponse.json({
    success: true,
    buildOrder: order,
    totalSteps: order.length
  });
}
