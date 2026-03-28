// =============================================================================
// UI Intelligence Extraction Script
// Extracts: Workflows, Permissions, Validations, Cascading Dropdowns,// =============================================================================

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const projectId = 'cmmqlzpgf0000q5ge896s0k29'; // HIS Production
  
  // Get Organization.cshtml from cache
  const org = await prisma.cSHTMLAnalysisCache.findFirst({
    where: { viewName: 'Organization' }
  });

  if (!org || !org.rawContent) {
    console.log('No Organization.cshtml found in cache');
    return;
  }

  const content = org.rawContent;
  const viewName = 'Organization';

  console.log('=== Extracting UI Intelligence from Organization.cshtml ===\n');

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. PERMISSIONS
  // ═══════════════════════════════════════════════════════════════════════════
  const permissions: any[] = [];

  // Extract User.IsInRole checks
  const roleRegex = /User\.IsInRole\s*\(\s*["']([^"']+)["']\)/g;
  let roleMatch;
  while ((roleMatch = roleRegex.exec(content)) !== null) {
    permissions.push({
      viewName,
      permissionType: 'role',
      permissionValue: roleMatch[1],
      action: 'show',
      sourceLine: content.substring(0, roleMatch.index).split('\n').length,
    });
  }

  // Extract [Authorize] attributes
  const authRegex = /\[Authorize\s*\(\s*Roles\s*=\s*["']([^"']+)["']\s*\)\]/g;
  while ((roleMatch = authRegex.exec(content)) !== null) {
    permissions.push({
      viewName,
      permissionType: 'authorize',
      permissionValue: roleMatch[1],
      action: 'access',
      sourceLine: content.substring(0, roleMatch.index).split('\n').length,
    });
  }

  // Extract ClaimsPrincipal checks
  const claimRegex = /User\.HasClaim\s*\(\s*["']([^"']+)["']\s*,\s*["']([^"']+)["']\s*\)/g;
  while ((roleMatch = claimRegex.exec(content)) !== null) {
    permissions.push({
      viewName,
      permissionType: 'claim',
      permissionValue: `${roleMatch[1]}=${roleMatch[2]}`,
      action: 'show',
      sourceLine: content.substring(0, roleMatch.index).split('\n').length,
    });
  }

  console.log(`Permissions found: ${permissions.length}`);

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. VALIDATIONS
  // ═══════════════════════════════════════════════════════════════════════════
  const validations: any[] = [];

  // Extract jQuery validate rules
  const validateBlockMatch = content.match(/\$\("#OrganizationForm"\)\.validate\s*\(\s*\{([\s\S]*?)\}\s*\)/);
  if (validateBlockMatch) {
    const validateBlock = validateBlockMatch[1];
    
    // Extract rules
    const rulesMatch = validateBlock.match(/rules\s*:\s*\{([\s\S]*?)\n\s*\}/);
    if (rulesMatch) {
      const rulesBlock = rulesMatch[1];
      
      // Parse individual field rules
      const fieldRuleRegex = /(\w+)\s*:\s*\{([^}]+)\}/g;
      let fieldMatch;
      while ((fieldMatch = fieldRuleRegex.exec(rulesBlock)) !== null) {
        const fieldName = fieldMatch[1];
        const fieldRules = fieldMatch[2];
        
        // Check for required
        if (fieldRules.includes('required: true')) {
          validations.push({
            viewName,
            fieldName,
            validationType: 'required',
            message: `${fieldName} is required`,
            source: 'jquery',
          });
        }
        
        // Check for min
        const minMatch = fieldRules.match(/min:\s*(\d+)/);
        if (minMatch) {
          validations.push({
            viewName,
            fieldName,
            validationType: 'min_length',
            value: minMatch[1],
            message: `${fieldName} must be at least ${minMatch[1]} characters`,
            source: 'jquery',
          });
        }
      }
    }
  }

  // Extract HTML5 validations from fields
  const fields = JSON.parse(org.fields || '[]');
  for (const field of fields) {
    if (field.validation && Array.isArray(field.validation)) {
      for (const val of field.validation) {
        validations.push({
          viewName,
          fieldName: field.name,
          validationType: val.type,
          value: val.value?.toString(),
          source: 'html',
        });
      }
    }
  }

  console.log(`Validations found: ${validations.length}`);

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. CASCADING DROPDOWNS
  // ═══════════════════════════════════════════════════════════════════════════
  const cascadingDropdowns: any[] = [];

  // Look for cascade patterns in scripts
  const scripts = JSON.parse(org.scripts || '[]');
  const allScriptContent = scripts.join('\n');

  // Pattern: $("#ParentId").change(function() { ... load ChildId ... })
  const cascadeRegex = /\$\(["']#(\w+)["']\)\.(?:change|on)\s*\([^)]*\)\s*(?:function\s*\([^)]*\)\s*)?\{[^}]*TargetSelector\s*:\s*['"]#(\w+)['"][^}]*URL\s*:\s*["']([^"']+)["']/gi;
  let cascadeMatch;
  while ((cascadeMatch = cascadeRegex.exec(allScriptContent)) !== null) {
    cascadingDropdowns.push({
      viewName,
      parentField: cascadeMatch[1],
      childField: cascadeMatch[2],
      endpoint: cascadeMatch[3],
      confidence: 0.95,
    });
  }

  console.log(`Cascading dropdowns found: ${cascadingDropdowns.length}`);

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. WORKFLOWS
  // ═══════════════════════════════════════════════════════════════════════════
  const workflows: any[] = [];
  
  // Detect form submission workflow
  const formActionMatch = content.match(/url\s*:\s*["']\/Organization\/(\w+)["']/g);
  if (formActionMatch) {
    const endpoints = formActionMatch.map((m: string) => {
      const match = m.match(/\/Organization\/(\w+)/);
      return match ? match[1] : null;
    }).filter(Boolean);

    workflows.push({
      name: 'Organization CRUD Workflow',
      sourceView: viewName,
      type: 'crud',
      triggerType: 'submit',
      endpoints,
      steps: [
        { step: 1, action: 'Fill Form', type: 'form_fill' },
        { step: 2, action: 'Validate', type: 'validation' },
        { step: 3, action: 'Submit', type: 'api_call' },
        { step: 4, action: 'Handle Response', type: 'response' },
      ],
      transitions: [
        { from: 'form_fill', to: 'validation', on: 'input' },
        { from: 'validation', to: 'api_call', on: 'submit' },
        { from: 'api_call', to: 'response', on: 'success' },
        { from: 'api_call', to: 'validation', on: 'error' },
      ],
    });
  }

  console.log(`Workflows found: ${workflows.length}`);

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. PAGE TRANSITIONS
  // ═══════════════════════════════════════════════════════════════════════════
  const pageTransitions: any[] = [];

  // Extract redirect patterns from AJAX success handlers
  const redirectMatch = content.match(/window\.location\.href\s*=\s*["']([^"']+)["']/g);
  if (redirectMatch) {
    for (const r of redirectMatch) {
      const match = r.match(/["']([^"']+)["']/);
      if (match) {
        pageTransitions.push({
          sourceView: viewName,
          targetView: match[1],
          type: 'redirect',
          trigger: 'success',
        });
      }
    }
  }

  // Extract form action URLs
  const actionUrlMatch = content.match(/url\s*:\s*["']([^"']+)["']/g);
  if (actionUrlMatch) {
    for (const u of actionUrlMatch) {
      const match = u.match(/["']([^"']+)["']/);
      if (match) {
        pageTransitions.push({
          sourceView: viewName,
          targetView: match[1],
          type: 'ajax',
          trigger: 'submit',
        });
      }
    }
  }

  console.log(`Page transitions found: ${pageTransitions.length}`);

  // ═══════════════════════════════════════════════════════════════════════════
  // STORE ALL INTELLIGENCE
  // ═══════════════════════════════════════════════════════════════════════════

  console.log('\n=== Storing UI Intelligence ===\n');

  // Store via API
  const response = await fetch('http://localhost:3000/api/ui-intelligence', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'store-all-intelligence',
      projectId,
      viewName,
      permissions,
      validations,
      cascadingDropdowns,
      workflows,
      pageTransitions,
    }),
  });

  const result = await response.json();
  console.log('Store result:', result);

  // Get summary
  const summaryResponse = await fetch(`http://localhost:3000/api/ui-intelligence`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'get-intelligence-summary',
      projectId,
    }),
  });

  const summary = await summaryResponse.json();
  console.log('\n=== Final Summary ===');
  console.log(JSON.stringify(summary.summary, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
