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

  const parsed = parseCSHTMLFiles([{ 
    name: 'Organization.cshtml', 
    content: org.rawContent 
  }])[0];

  console.log('=== Parsed Structure ===');
  console.log('Keys:', Object.keys(parsed));
  
  console.log('\najaxEndpoints:', parsed.ajaxEndpoints?.length || 'undefined');
  console.log('scripts:', parsed.scripts?.length || 'undefined');
  console.log('fields:', parsed.fields?.length || 'undefined');
  
  // Check what's in ajaxEndpoints
  if (parsed.ajaxEndpoints && parsed.ajaxEndpoints.length > 0) {
    console.log('\nAJAX Endpoints:');
    parsed.ajaxEndpoints.forEach((ep: any, i: number) => {
      console.log(`  ${i+1}. ${ep.method} ${ep.url}`);
    });
  }
  
  // Count event handlers from scripts
  if (parsed.scripts) {
    let handlers = 0;
    parsed.scripts.forEach((script: string) => {
      const matches = script.match(/\.click\s*\(|\.on\s*\(\s*['"]click['"]|\.change\s*\(|\.submit\s*\(/gi) || [];
      handlers += matches.length;
    });
    console.log('\nEvent handlers counted:', handlers);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
