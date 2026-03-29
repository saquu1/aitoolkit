import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const org = await prisma.cSHTMLAnalysisCache.findFirst({
    where: { viewName: 'Organization' }
  });

  if (!org) {
    console.log('No entry found');
    return;
  }

  const scripts = JSON.parse(org.scripts || '[]');
  const listConfig = JSON.parse(org.listConfig || '{}');

  console.log('=== Organization.cshtml (Fixed) ===\n');
  console.log('Scripts stored:', scripts.length);
  console.log('Scripts with content:', scripts.filter((s: string) => s.length > 0).length);
  console.log('\nAJAX Endpoints:', listConfig.ajaxEndpoints?.length || 0);
  
  if (listConfig.ajaxEndpoints) {
    console.log('\nEndpoints:');
    listConfig.ajaxEndpoints.forEach((ep: any) => {
      console.log(`  - ${ep.method} ${ep.url}`);
    });
  }
  
  // Count event handlers
  const eventHandlers = scripts.reduce((count: number, s: string) => {
    const matches = s.match(/\.click\s*\(|\.on\s*\(|\.change\s*\(|\.submit\s*\(/gi) || [];
    return count + matches.length;
  }, 0);
  
  console.log('\nEvent Handlers:', eventHandlers);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
