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

  // Check for script tags
  const scriptMatches = org.rawContent.match(/<script[^>]*>/gi) || [];
  const scriptEndMatches = org.rawContent.match(/<\/script>/gi) || [];
  
  console.log('=== Script Tags in Raw Content ===');
  console.log('Opening <script> tags:', scriptMatches.length);
  console.log('Closing </script> tags:', scriptEndMatches.length);
  
  // Find actual script content
  const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  let scriptCount = 0;
  
  while ((match = scriptRegex.exec(org.rawContent)) !== null) {
    scriptCount++;
    const content = match[1].trim();
    if (content.length > 0) {
      console.log(`\n--- Script ${scriptCount} (length: ${content.length}) ---`);
      console.log('Preview:', content.substring(0, 200));
    } else {
      console.log(`\n--- Script ${scriptCount} is EMPTY ---`);
    }
  }
  
  console.log('\nTotal scripts found:', scriptCount);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
