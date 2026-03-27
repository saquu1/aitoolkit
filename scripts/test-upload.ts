import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Check for projects
  const projects = await prisma.toolkitProject.findMany();
  console.log('=== Projects ===');
  projects.forEach(p => console.log(`- ${p.id}: ${p.name}`));
  
  // Check for CSHTML cache
  const cache = await prisma.cSHTMLAnalysisCache.findMany();
  console.log('\n=== CSHTML Cache ===');
  console.log(`Total entries: ${cache.length}`);
  cache.forEach(c => {
    const fields = JSON.parse(c.fields || '[]');
    console.log(`- ${c.viewName}: ${fields.length} fields (${c.viewType})`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
