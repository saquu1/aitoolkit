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

  // Re-parse the raw content
  const parsed = parseCSHTMLFiles([{ 
    name: 'Organization.cshtml', 
    content: org.rawContent 
  }])[0];

  // Update with correct data
  await prisma.cSHTMLAnalysisCache.update({
    where: { id: org.id },
    data: {
      scripts: JSON.stringify(parsed.scripts || []),
      // Also store AJAX endpoints for reference
      listConfig: JSON.stringify({
        ...JSON.parse(org.listConfig || '{}'),
        ajaxEndpoints: parsed.ajaxEndpoints || []
      })
    }
  });

  console.log('✅ Updated Organization.cshtml with correct data');
  console.log('Scripts:', parsed.scripts?.filter(s => s.length > 0).length, 'with content');
  console.log('AJAX Endpoints:', parsed.ajaxEndpoints?.length);
  console.log('Fields:', parsed.fields?.length);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
