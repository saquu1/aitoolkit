import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Get the Organization entry
  const org = await prisma.cSHTMLAnalysisCache.findFirst({
    where: { viewName: 'Organization' }
  });

  if (!org) {
    console.log('No Organization entry found');
    return;
  }

  console.log('=== Organization.cshtml Analysis ===\n');
  console.log('View Name:', org.viewName);
  console.log('View Type:', org.viewType);
  console.log('Model:', org.modelName);
  console.log('Linked Table:', org.linkedTable);
  console.log('Title:', org.title);
  
  // Parse fields
  const fields = JSON.parse(org.fields || '[]');
  console.log('\n=== Fields ===');
  console.log('Count:', fields.length);
  if (fields.length > 0) {
    console.log('Sample fields:', fields.slice(0, 3));
  }

  // Parse scripts
  const scripts = JSON.parse(org.scripts || '[]');
  console.log('\n=== Scripts ===');
  console.log('Count:', scripts.length);
  if (scripts.length > 0) {
    console.log('First script length:', scripts[0]?.length || 0);
    console.log('Script preview:', scripts[0]?.substring(0, 200));
  }

  // Check raw content
  console.log('\n=== Raw Content ===');
  console.log('Has raw content:', !!org.rawContent);
  console.log('Raw content length:', org.rawContent?.length || 0);
  
  if (org.rawContent) {
    // Check for AJAX in raw content
    const ajaxMatches = org.rawContent.match(/\.ajax\s*\(/gi) || [];
    console.log('AJAX calls in raw:', ajaxMatches.length);
    
    // Check for event handlers
    const clickMatches = org.rawContent.match(/\.click\s*\(|\.on\s*\(/gi) || [];
    console.log('Event handlers in raw:', clickMatches.length);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
