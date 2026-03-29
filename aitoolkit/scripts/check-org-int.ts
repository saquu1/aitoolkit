import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const org = await prisma.cSHTMLAnalysisCache.findFirst({
    where: { viewName: 'Organization' }
  });

  if (!org) {
    console.log('No Organization entry found');
    return;
  }

  console.log('=== Organization.cshtml Detailed Analysis ===\n');
  
  // Check fields
  const fields = JSON.parse(org.fields || '[]');
  console.log('Fields:', fields.length);
  
  // Check cascading dropdowns
  const listConfig = JSON.parse(org.listConfig || '{}');
  console.log('\nCascading Dropdowns (from listConfig):');
  if (listConfig.cascadingDropdowns) {
    listConfig.cascadingDropdowns.forEach((c: any) => {
      console.log(`  ${c.parentField} -> ${c.childField} (${c.ajaxEndpoint})`);
    });
  }
  
  // Check scripts
  const scripts = JSON.parse(org.scripts || '[]');
  const nonEmptyScripts = scripts.filter((s: string) => s.length > 0);
  console.log('\nScripts with content:', nonEmptyScripts.length);
  
  // Extract permissions from scripts
  console.log('\n=== Permission Analysis ===');
  nonEmptyScripts.forEach((script: string, i: number) => {
    const roleMatches = script.match(/User\.IsInRole\s*\(\s*["']([^"']+)["']\)/gi) || [];
    if (roleMatches.length > 0) {
      console.log(`  Script ${i+1}: Found ${roleMatches.length} role checks`);
      roleMatches.forEach((m: any) => console.log(`    - Role: ${m}`));
    }
  });
  
  // Extract validations from scripts
  console.log('\n=== Validation Analysis ===');
  nonEmptyScripts.forEach((script: string, i: number) => {
    const rulesMatch = script.match(/rules\s*:\s*\{/);
    if (rulesMatch) {
      const rulesBlock = script.substring(rulesMatch.index!);
      const rulesEnd = rulesBlock.indexOf('}');
      if (rulesEnd > 0) {
        const rulesContent = rulesBlock.substring(0, rulesEnd + 1);
        console.log(`  Script ${i+1}: Validation rules block found`);
        console.log(`    ${rulesContent.substring(0, 200)}...`);
      }
    }
  });
  
  // Extract AJAX endpoints
  console.log('\n=== AJAX Endpoints ===');
  nonEmptyScripts.forEach((script: string, i: number) => {
    const ajaxMatches = script.match(/\.(?:ajax|post|get)\s*\(\s*\{[^}]+url\s*:\s*["']([^"']+)["']/gi) || [];
    ajaxMatches.forEach((m: any) => console.log(`  Script ${i+1}: ${m}`));
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
