// =============================================================================
// Prompts Management API Route
// Handles CRUD operations for AI Prompt Templates
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// =============================================================================
// DEFAULT PROMPTS TO SEED
// =============================================================================

const DEFAULT_PROMPTS = [
  {
    name: 'Schema Analysis',
    key: 'schema_analysis',
    category: 'analysis',
    description: 'Analyze database table structure and extract intelligence',
    template: `You are a database schema analyst. Analyze the following table structure and provide insights.

Table: {table_name}

Columns:
{columns}

Constraints:
{constraints}

Please provide:
1. Table purpose and business context
2. Column analysis with data types and usage
3. Suggested indexes for performance
4. Potential data quality issues
5. Security and compliance considerations`,
    variables: '["table_name", "columns", "constraints"]',
    isDefault: true,
  },
  {
    name: 'FK Resolution',
    key: 'fk_resolution',
    category: 'resolution',
    description: 'Resolve foreign key relationships and dependencies',
    template: `You are a database relationship expert. Analyze the following foreign key and suggest resolution strategies.

Foreign Key: {fk_name}
Referenced Table: {referenced_table}
Column: {column}

Please provide:
1. Relationship type (one-to-one, one-to-many, many-to-many)
2. Suggested constraint actions (CASCADE, SET NULL, etc.)
3. Index recommendations
4. Data integrity considerations
5. Migration strategy if the referenced table is missing`,
    variables: '["fk_name", "referenced_table", "column"]',
    isDefault: true,
  },
  {
    name: 'Column Intelligence',
    key: 'column_intelligence',
    category: 'analysis',
    description: 'Extract semantic intelligence from column definitions',
    template: `You are a data intelligence expert. Analyze the following column and extract metadata.

Table: {table_name}
Column: {column_name}
Data Type: {data_type}

Please provide:
1. Semantic type (name, email, phone, address, date, money, etc.)
2. UI component suggestion (text_input, dropdown, date_picker, checkbox, etc.)
3. Validation rules
4. Is it PII/PHI data?
5. Display formatting suggestions
6. Search and filter recommendations`,
    variables: '["column_name", "data_type", "table_name"]',
    isDefault: true,
  },
  {
    name: 'Prisma Generation',
    key: 'prisma_generation',
    category: 'generation',
    description: 'Generate Prisma schema from table definitions',
    template: `You are a Prisma schema expert. Generate a Prisma schema model from the following table definition.

Table: {table_name}

Columns:
{columns}

Relations:
{relations}

Please generate:
1. Complete Prisma model with proper types
2. Relations with proper decorators
3. Indexes and unique constraints
4. Default values and optional fields
5. Comments for documentation`,
    variables: '["table_name", "columns", "relations"]',
    isDefault: true,
  },
  {
    name: 'React Component Generation',
    key: 'react_component_generation',
    category: 'generation',
    description: 'Generate React components from entity definitions',
    template: `You are a React/Next.js expert. Generate a React component from the following entity definition.

Entity: {entity_name}

Fields:
{fields}

Form Type: {form_type}

Please generate:
1. Complete React component with TypeScript
2. Form validation with react-hook-form and zod
3. Proper styling with Tailwind CSS
4. Error handling and loading states
5. Accessibility features`,
    variables: '["entity_name", "fields", "form_type"]',
    isDefault: true,
  },
  {
    name: 'API Route Generation',
    key: 'api_route_generation',
    category: 'generation',
    description: 'Generate Next.js API routes from entity definitions',
    template: `You are a Next.js API expert. Generate API routes from the following entity definition.

Entity: {entity_name}
Table: {table_name}

Operations:
{operations}

Please generate:
1. Complete Next.js API route handlers (GET, POST, PUT, DELETE)
2. Request validation with Zod schemas
3. Error handling with proper HTTP status codes
4. Database operations with Prisma
5. Query parameters for filtering, sorting, and pagination`,
    variables: '["entity_name", "table_name", "operations"]',
    isDefault: true,
  },
  {
    name: 'Chat Assistant',
    key: 'chat_assistant',
    category: 'chat',
    description: 'AI chat assistant for schema and code assistance',
    template: `You are an AI assistant for the Schema Architect project. Help users with database schema design, code generation, and technical questions.

Context:
{context}

User Question:
{question}

Please provide:
1. Clear and concise answer
2. Code examples if relevant
3. Best practices and recommendations
4. Related documentation or resources`,
    variables: '["context", "question"]',
    isDefault: true,
  },
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function extractVariables(template: string): string[] {
  const regex = /\{(\w+)\}/g;
  const variables: string[] = [];
  let match;
  
  while ((match = regex.exec(template)) !== null) {
    if (!variables.includes(match[1])) {
      variables.push(match[1]);
    }
  }
  
  return variables;
}

function renderTemplate(template: string, variables: Record<string, string>): string {
  let rendered = template;
  
  for (const [key, value] of Object.entries(variables)) {
    rendered = rendered.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  }
  
  return rendered;
}

// =============================================================================
// GET ROUTES
// =============================================================================

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');
    const id = searchParams.get('id');
    const key = searchParams.get('key');
    const category = searchParams.get('category');

    switch (action) {
      case 'list':
        return await listPrompts(category);
      
      case 'get':
        return await getPrompt(id);
      
      case 'get-by-key':
        return await getPromptByKey(key);
      
      case 'categories':
        return await getCategories();
      
      case 'stats':
        return await getStats();
      
      case 'seed':
        return await seedDefaultPrompts();
      
      default:
        return await listPrompts(category);
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Prompts API error:', error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

async function listPrompts(category: string | null) {
  const where = category ? { category } : {};
  
  const prompts = await db.promptTemplate.findMany({
    where,
    orderBy: [
      { category: 'asc' },
      { name: 'asc' },
    ],
  });

  // Group by category
  const grouped = prompts.reduce((acc, prompt) => {
    if (!acc[prompt.category]) {
      acc[prompt.category] = [];
    }
    acc[prompt.category].push(prompt);
    return acc;
  }, {} as Record<string, typeof prompts>);

  return NextResponse.json({
    success: true,
    prompts,
    grouped,
    total: prompts.length,
  });
}

async function getPrompt(id: string | null) {
  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  const prompt = await db.promptTemplate.findUnique({
    where: { id },
  });

  if (!prompt) {
    return NextResponse.json({ error: 'Prompt not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true, prompt });
}

async function getPromptByKey(key: string | null) {
  if (!key) {
    return NextResponse.json({ error: 'key is required' }, { status: 400 });
  }

  const prompt = await db.promptTemplate.findUnique({
    where: { key },
  });

  if (!prompt) {
    return NextResponse.json({ error: 'Prompt not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true, prompt });
}

async function getCategories() {
  const categories = await db.promptTemplate.groupBy({
    by: ['category'],
    _count: {
      id: true,
    },
    orderBy: {
      category: 'asc',
    },
  });

  return NextResponse.json({
    success: true,
    categories: categories.map(c => ({
      name: c.category,
      count: c._count.id,
    })),
  });
}

async function getStats() {
  const total = await db.promptTemplate.count();
  const active = await db.promptTemplate.count({ where: { isActive: true } });
  const defaults = await db.promptTemplate.count({ where: { isDefault: true } });
  
  const byCategory = await db.promptTemplate.groupBy({
    by: ['category'],
    _count: { id: true },
  });

  return NextResponse.json({
    success: true,
    stats: {
      total,
      active,
      defaults,
      byCategory: byCategory.map(c => ({
        category: c.category,
        count: c._count.id,
      })),
    },
  });
}

async function seedDefaultPrompts() {
  let created = 0;
  let skipped = 0;

  for (const prompt of DEFAULT_PROMPTS) {
    const existing = await db.promptTemplate.findUnique({
      where: { key: prompt.key },
    });

    if (!existing) {
      await db.promptTemplate.create({
        data: {
          ...prompt,
          isActive: true,
          version: 1,
        },
      });
      created++;
    } else {
      skipped++;
    }
  }

  return NextResponse.json({
    success: true,
    message: `Seeded ${created} prompts, skipped ${skipped} existing`,
    created,
    skipped,
  });
}

// =============================================================================
// POST ROUTES
// =============================================================================

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    switch (action) {
      case 'create':
        return await createPrompt(body);
      
      case 'update':
        return await updatePrompt(body);
      
      case 'delete':
        return await deletePrompt(body);
      
      case 'duplicate':
        return await duplicatePrompt(body);
      
      case 'set-default':
        return await setDefault(body);
      
      case 'render':
        return await renderPromptPreview(body);
      
      case 'toggle-active':
        return await toggleActive(body);
      
      case 'seed':
        return await seedDefaultPrompts();
      
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Prompts API error:', error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

async function createPrompt(body: {
  name: string;
  key: string;
  category: string;
  description?: string;
  template: string;
  variables?: string;
  isDefault?: boolean;
}) {
  // Check if key already exists
  const existing = await db.promptTemplate.findUnique({
    where: { key: body.key },
  });

  if (existing) {
    return NextResponse.json({ error: 'Key already exists' }, { status: 400 });
  }

  // Auto-extract variables from template
  const extractedVars = extractVariables(body.template);
  const variables = body.variables || JSON.stringify(extractedVars);

  const prompt = await db.promptTemplate.create({
    data: {
      name: body.name,
      key: body.key,
      category: body.category,
      description: body.description || null,
      template: body.template,
      variables,
      isDefault: body.isDefault || false,
      isActive: true,
      version: 1,
    },
  });

  return NextResponse.json({ success: true, prompt });
}

async function updatePrompt(body: {
  id: string;
  name?: string;
  key?: string;
  category?: string;
  description?: string;
  template?: string;
  variables?: string;
  isDefault?: boolean;
  isActive?: boolean;
}) {
  const { id, ...updates } = body;

  const existing = await db.promptTemplate.findUnique({
    where: { id },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Prompt not found' }, { status: 404 });
  }

  // If template changed, auto-extract variables
  let variables = updates.variables;
  if (updates.template && !updates.variables) {
    const extractedVars = extractVariables(updates.template);
    variables = JSON.stringify(extractedVars);
  }

  // Check if key is being changed to one that exists
  if (updates.key && updates.key !== existing.key) {
    const keyExists = await db.promptTemplate.findUnique({
      where: { key: updates.key },
    });

    if (keyExists) {
      return NextResponse.json({ error: 'Key already exists' }, { status: 400 });
    }
  }

  const prompt = await db.promptTemplate.update({
    where: { id },
    data: {
      ...updates,
      variables,
      version: existing.version + 1,
    },
  });

  return NextResponse.json({ success: true, prompt });
}

async function deletePrompt(body: { id: string }) {
  const { id } = body;

  const existing = await db.promptTemplate.findUnique({
    where: { id },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Prompt not found' }, { status: 404 });
  }

  await db.promptTemplate.delete({
    where: { id },
  });

  return NextResponse.json({ success: true, message: 'Prompt deleted' });
}

async function duplicatePrompt(body: { id: string; name?: string; key?: string }) {
  const { id, name, key } = body;

  const existing = await db.promptTemplate.findUnique({
    where: { id },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Prompt not found' }, { status: 404 });
  }

  const newKey = key || `${existing.key}_copy`;
  
  // Check if key exists
  const keyExists = await db.promptTemplate.findUnique({
    where: { key: newKey },
  });

  if (keyExists) {
    return NextResponse.json({ error: 'Key already exists' }, { status: 400 });
  }

  const prompt = await db.promptTemplate.create({
    data: {
      name: name || `${existing.name} (Copy)`,
      key: newKey,
      category: existing.category,
      description: existing.description,
      template: existing.template,
      variables: existing.variables,
      isDefault: false,
      isActive: true,
      version: 1,
    },
  });

  return NextResponse.json({ success: true, prompt });
}

async function setDefault(body: { id: string }) {
  const { id } = body;

  const existing = await db.promptTemplate.findUnique({
    where: { id },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Prompt not found' }, { status: 404 });
  }

  // Unset default for other prompts in same category
  await db.promptTemplate.updateMany({
    where: {
      category: existing.category,
      isDefault: true,
      id: { not: id },
    },
    data: { isDefault: false },
  });

  // Set this prompt as default
  const prompt = await db.promptTemplate.update({
    where: { id },
    data: { isDefault: true },
  });

  return NextResponse.json({ success: true, prompt });
}

async function renderPromptPreview(body: { id?: string; key?: string; variables: Record<string, string> }) {
  const { id, key, variables } = body;

  let prompt;
  
  if (id) {
    prompt = await db.promptTemplate.findUnique({ where: { id } });
  } else if (key) {
    prompt = await db.promptTemplate.findUnique({ where: { key } });
  }

  if (!prompt) {
    return NextResponse.json({ error: 'Prompt not found' }, { status: 404 });
  }

  const rendered = renderTemplate(prompt.template, variables || {});

  return NextResponse.json({
    success: true,
    original: prompt.template,
    rendered,
    variables: prompt.variables ? JSON.parse(prompt.variables) : [],
  });
}

async function toggleActive(body: { id: string }) {
  const { id } = body;

  const existing = await db.promptTemplate.findUnique({
    where: { id },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Prompt not found' }, { status: 404 });
  }

  const prompt = await db.promptTemplate.update({
    where: { id },
    data: { isActive: !existing.isActive },
  });

  return NextResponse.json({ success: true, prompt });
}
