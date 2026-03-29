import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const org = await prisma.cSHTMLAnalysisCache.findFirst({
    where: { viewName: 'Organization' }
  });

  if (!org || !org.rawContent) {
    console.log('No content found');
    return;
  }

  // Test the parse-all API
  const response = await fetch('http://localhost:3000/api/parsers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'parse-all',
      files: [{
        name: 'Organization.cshtml',
        content: org.rawContent
      }]
    })
  });

  const data = await response.json();
  
  console.log('=== API Response ===');
  console.log('Project ID:', data.projectId);
  console.log('\nClassification:', data.classification);
  
  console.log('\n=== CSHTML Summary ===');
  console.log('Total Files:', data.cshtml?.summary?.totalFiles);
  console.log('Total AJAX Calls:', data.cshtml?.summary?.totalAjaxCalls);
  console.log('Total Event Handlers:', data.cshtml?.summary?.totalEventHandlers);
  console.log('Total Tables:', data.cshtml?.summary?.totalTables);
  console.log('Total Fields:', data.cshtml?.summary?.totalFields);
  
  console.log('\n=== Overall Summary ===');
  console.log('Total AJAX Calls:', data.summary?.totalAjaxCalls);
  console.log('Total Event Handlers:', data.summary?.totalEventHandlers);
  console.log('Total Tables:', data.summary?.totalTables);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
