// =============================================================================
// Step 4 Intelligence API Route
// Handles AI Questions, Screen Blueprints, Business Rules, User Stories
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { aiQuestionEngine } from '@/lib/ai-question-engine';
import { screenBlueprintGenerator } from '@/lib/screen-blueprint-generator';
import { businessRuleEngine } from '@/lib/business-rule-engine';
import { parseSqlServer } from '@/lib/sql-parser';
import { getAllModules } from '@/lib/layer-definitions';

// ═══════════════════════════════════════════════════════════════════════════
// MAIN ROUTER
// ═══════════════════════════════════════════════════════════════════════════

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    switch (action) {
      case 'generate-questions':
        return await generateQuestions(body);
      
      case 'answer-question':
        return await answerQuestion(body);
      
      case 'generate-blueprints':
        return await generateBlueprints(body);
      
      case 'generate-rules':
        return await generateRules(body);
      
      case 'update-rule':
        return await updateRule(body);
      
      case 'approve-rule':
        return await approveRule(body);
      
      case 'generate-user-stories':
        return await generateUserStories(body);
      
      case 'export-rules':
        return await exportRules(body);
      
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Step 4 API error:', error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'get-all-rules':
        return await getAllRules();
      
      case 'get-rule':
        return await getRule(searchParams);
      
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// AI QUESTION ENGINE
// ═══════════════════════════════════════════════════════════════════════════

async function generateQuestions(body: { sql?: string; tables?: unknown[]; modules?: unknown[] }) {
  let tables = body.tables || [];
  const modules = body.modules || getAllModules();

  // Parse SQL if provided
  if (body.sql && tables.length === 0) {
    const parseResult = parseSqlServer(body.sql);
    tables = parseResult.tables;
  }

  const session = aiQuestionEngine.generateProjectQuestions(tables as any[], modules as any[]);

  return NextResponse.json({
    success: true,
    session,
    statistics: {
      totalQuestions: session.progress.total,
      criticalQuestions: session.progress.criticalTotal,
      groups: session.groups.length
    }
  });
}

async function answerQuestion(body: { session: any; questionId: string; answer: string | string[] }) {
  const { session, questionId, answer } = body;

  const updatedSession = aiQuestionEngine.answerQuestion(session, questionId, answer);

  return NextResponse.json({
    success: true,
    session: updatedSession,
    nextQuestion: aiQuestionEngine.getNextQuestion(updatedSession)
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// SCREEN BLUEPRINT GENERATOR
// ═══════════════════════════════════════════════════════════════════════════

async function generateBlueprints(body: { sql?: string; tables?: unknown[]; options?: any }) {
  let tables = body.tables || [];

  // Parse SQL if provided
  if (body.sql && tables.length === 0) {
    const parseResult = parseSqlServer(body.sql);
    tables = parseResult.tables;
  }

  const results: Record<string, any> = {};

  for (const table of tables as any[]) {
    results[table.tableName] = screenBlueprintGenerator.generateAllScreens(table, body.options);
  }

  return NextResponse.json({
    success: true,
    blueprints: results,
    summary: {
      totalTables: tables.length,
      totalScreens: Object.values(results).reduce((sum) => sum + 3, 0), // 3 screens per table
      totalWidgets: Object.values(results).reduce((sum: number, r: any) => sum + r.dashboardWidgets.length, 0)
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// BUSINESS RULE ENGINE
// ═══════════════════════════════════════════════════════════════════════════

async function generateRules(body: { sql?: string; tables?: unknown[]; modules?: unknown[] }) {
  let tables = body.tables || [];
  const modules = body.modules || getAllModules();

  // Parse SQL if provided
  if (body.sql && tables.length === 0) {
    const parseResult = parseSqlServer(body.sql);
    tables = parseResult.tables;
  }

  // Convert tables to expected format
  const tableDefs = (tables as any[]).map(t => ({
    tableName: t.tableName,
    columns: t.columns || []
  }));

  const groups = businessRuleEngine.generateAllRules(tableDefs as any, modules as any[]);

  return NextResponse.json({
    success: true,
    groups,
    statistics: {
      totalRules: groups.reduce((sum: number, g: any) => sum + g.rules.length, 0),
      criticalRules: groups.reduce(
        (sum: number, g: any) => sum + g.rules.filter((r: any) => r.priority === 'critical').length, 
        0
      ),
      groupsCount: groups.length
    }
  });
}

async function updateRule(body: { ruleId: string; updates: Record<string, unknown> }) {
  const { ruleId, updates } = body;

  const updatedRule = businessRuleEngine.updateRule(ruleId, updates as any);

  if (!updatedRule) {
    return NextResponse.json({
      success: false,
      error: 'Rule not found'
    }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    rule: updatedRule
  });
}

async function approveRule(body: { ruleId: string; approvedBy: string }) {
  const { ruleId, approvedBy } = body;

  const updatedRule = businessRuleEngine.approveRule(ruleId, approvedBy);

  if (!updatedRule) {
    return NextResponse.json({
      success: false,
      error: 'Rule not found'
    }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    rule: updatedRule
  });
}

async function getAllRules() {
  const rules = businessRuleEngine.getAllRules();

  return NextResponse.json({
    success: true,
    rules,
    count: rules.length
  });
}

async function getRule(searchParams: URLSearchParams) {
  const ruleId = searchParams.get('ruleId');
  
  if (!ruleId) {
    return NextResponse.json({
      success: false,
      error: 'ruleId is required'
    }, { status: 400 });
  }

  const rule = businessRuleEngine.getRule(ruleId);

  if (!rule) {
    return NextResponse.json({
      success: false,
      error: 'Rule not found'
    }, { status: 404 });
  }

  const validation = businessRuleEngine.validateRule(rule);

  return NextResponse.json({
    success: true,
    rule,
    validation
  });
}

async function exportRules(body: { format: 'json' | 'markdown' | 'csv' }) {
  const { format = 'json' } = body;
  const content = businessRuleEngine.exportRules(format);

  return NextResponse.json({
    success: true,
    format,
    content,
    mimeType: format === 'json' ? 'application/json' : 
              format === 'markdown' ? 'text/markdown' : 
              'text/csv'
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// USER STORY GENERATOR
// ═══════════════════════════════════════════════════════════════════════════

interface UserStory {
  id: string;
  code: string;
  title: string;
  role: string;
  feature: string;
  benefit: string;
  acceptanceCriteria: string[];
  priority: 'must_have' | 'should_have' | 'could_have' | 'wont_have';
  storyPoints: number;
  tableName: string;
  moduleName?: string;
  relatedColumns: string[];
}

async function generateUserStories(body: { sql?: string; tables?: unknown[]; moduleName?: string }) {
  let tables = body.tables || [];

  // Parse SQL if provided
  if (body.sql && tables.length === 0) {
    const parseResult = parseSqlServer(body.sql);
    tables = parseResult.tables;
  }

  const stories: UserStory[] = [];
  let storyIndex = 1;

  for (const table of tables as any[]) {
    const tableStories = generateTableUserStories(table, body.moduleName, storyIndex);
    stories.push(...tableStories);
    storyIndex += tableStories.length;
  }

  return NextResponse.json({
    success: true,
    stories,
    statistics: {
      totalStories: stories.length,
      mustHave: stories.filter(s => s.priority === 'must_have').length,
      shouldHave: stories.filter(s => s.priority === 'should_have').length,
      totalStoryPoints: stories.reduce((sum, s) => sum + s.storyPoints, 0)
    }
  });
}

function generateTableUserStories(table: any, moduleName?: string, startIndex: number = 1): UserStory[] {
  const stories: UserStory[] = [];
  const tableName = table.tableName;
  const singularName = singularize(tableName);
  const columns = table.columns || [];

  // CRUD stories
  stories.push({
    id: `US-${tableName}-${startIndex}`,
    code: `US-${tableName.substring(0, 3).toUpperCase()}-${String(startIndex).padStart(3, '0')}`,
    title: `Create ${singularName}`,
    role: 'User',
    feature: `create a new ${singularName} record`,
    benefit: `I can add new ${tableName.toLowerCase()} to the system`,
    acceptanceCriteria: [
      `Given I am on the ${tableName} list page`,
      `When I click the "Add ${singularName}" button`,
      `Then I should see a form with all required fields`,
      `And I can fill in the form and save the ${singularName}`,
      `And I should see a success message after saving`
    ],
    priority: 'must_have',
    storyPoints: 3,
    tableName,
    moduleName,
    relatedColumns: columns.filter((c: any) => !c.isNullable && !c.isIdentity).map((c: any) => c.name)
  });

  stories.push({
    id: `US-${tableName}-${startIndex + 1}`,
    code: `US-${tableName.substring(0, 3).toUpperCase()}-${String(startIndex + 1).padStart(3, '0')}`,
    title: `View ${singularName} List`,
    role: 'User',
    feature: `view a list of all ${tableName.toLowerCase()}`,
    benefit: `I can see all ${tableName.toLowerCase()} at a glance`,
    acceptanceCriteria: [
      `Given I navigate to the ${tableName} module`,
      `Then I should see a list of all ${tableName.toLowerCase()}`,
      `And the list should show key columns`,
      `And I can sort by any column`,
      `And I can paginate through results`
    ],
    priority: 'must_have',
    storyPoints: 2,
    tableName,
    moduleName,
    relatedColumns: columns.slice(0, 5).map((c: any) => c.name)
  });

  stories.push({
    id: `US-${tableName}-${startIndex + 2}`,
    code: `US-${tableName.substring(0, 3).toUpperCase()}-${String(startIndex + 2).padStart(3, '0')}`,
    title: `Update ${singularName}`,
    role: 'User',
    feature: `edit an existing ${singularName} record`,
    benefit: `I can keep ${tableName.toLowerCase()} information up to date`,
    acceptanceCriteria: [
      `Given I am viewing a ${singularName} record`,
      `When I click the "Edit" button`,
      `Then I should see an editable form`,
      `And I can modify the fields and save changes`,
      `And I should see a success message after saving`
    ],
    priority: 'must_have',
    storyPoints: 2,
    tableName,
    moduleName,
    relatedColumns: columns.filter((c: any) => !c.isPrimaryKey).map((c: any) => c.name)
  });

  stories.push({
    id: `US-${tableName}-${startIndex + 3}`,
    code: `US-${tableName.substring(0, 3).toUpperCase()}-${String(startIndex + 3).padStart(3, '0')}`,
    title: `Delete ${singularName}`,
    role: 'User',
    feature: `delete a ${singularName} record`,
    benefit: `I can remove outdated or incorrect ${tableName.toLowerCase()}`,
    acceptanceCriteria: [
      `Given I am viewing a ${singularName} record`,
      `When I click the "Delete" button`,
      `Then I should see a confirmation dialog`,
      `And when I confirm, the record should be removed`,
      `And I should see a success message`
    ],
    priority: 'should_have',
    storyPoints: 1,
    tableName,
    moduleName,
    relatedColumns: []
  });

  // Search story
  stories.push({
    id: `US-${tableName}-${startIndex + 4}`,
    code: `US-${tableName.substring(0, 3).toUpperCase()}-${String(startIndex + 4).padStart(3, '0')}`,
    title: `Search ${tableName}`,
    role: 'User',
    feature: `search for specific ${tableName.toLowerCase()}`,
    benefit: `I can quickly find the ${singularName} I need`,
    acceptanceCriteria: [
      `Given I am on the ${tableName} list page`,
      `When I type in the search box`,
      `Then the list should filter in real-time`,
      `And search should cover name and key fields`,
      `And I should see matching results highlighted`
    ],
    priority: 'should_have',
    storyPoints: 2,
    tableName,
    moduleName,
    relatedColumns: columns.filter((c: any) => 
      c.name.toLowerCase().includes('name') || 
      c.name.toLowerCase().includes('code') ||
      c.name.toLowerCase().includes('email') ||
      c.name.toLowerCase().includes('phone')
    ).map((c: any) => c.name)
  });

  return stories;
}

function singularize(tableName: string): string {
  const singulars: Record<string, string> = {
    'patients': 'Patient',
    'appointments': 'Appointment',
    'users': 'User',
    'doctors': 'Doctor',
    'organizations': 'Organization',
    'branches': 'Branch',
    'departments': 'Department',
    'invoices': 'Invoice',
    'payments': 'Payment',
    'prescriptions': 'Prescription',
    'laboratories': 'Laboratory',
    'pharmacies': 'Pharmacy'
  };
  
  const lower = tableName.toLowerCase();
  if (singulars[lower]) return singulars[lower];
  
  if (lower.endsWith('ies')) return lower.slice(0, -3) + 'y';
  if (lower.endsWith('ses') || lower.endsWith('xes') || lower.endsWith('ches')) return lower.slice(0, -2);
  if (lower.endsWith('s')) return lower.slice(0, -1);
  
  return tableName;
}
