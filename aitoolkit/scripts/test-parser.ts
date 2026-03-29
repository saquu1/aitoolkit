import { parseCSHTMLFiles } from '@/lib/cshtml-parser';
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

  // Parse the raw content again
  const parsed = parseCSHTMLFiles([{ 
    name: 'Organization.cshtml', 
    content: org.rawContent 
  }]);

  console.log('=== Re-parsed Results ===');
  console.log('View Name:', parsed[0]?.viewName);
  console.log('Scripts count:', parsed[0]?.scripts?.length);
  
  if (parsed[0]?.scripts && parsed[0].scripts.length > 0) {
    console.log('\n--- First 3 scripts ---');
    parsed[0].scripts.slice(0, 3).forEach((s, i) => {
      console.log(`Script ${i+1} length:`, s.length);
      console.log(`Preview:`, s.substring(0, 100));
    });
  }
  
  // Check AJAX endpoints
  console.log('\n=== AJAX Endpoints ===');
  console.log('Count:', parsed[0]?.ajaxEndpoints?.length || 0);
  if (parsed[0]?.ajaxEndpoints && parsed[0].ajaxEndpoints.length > 0) {
    console.log('Endpoints:', parsed[0].ajaxEndpoints);
  }
  
  // Check fields
  console.log('\n=== Fields ===');
  console.log('Count:', parsed[0]?.fields?.length);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
