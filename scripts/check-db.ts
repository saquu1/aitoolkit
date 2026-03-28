import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Check for ToolkitProject
  try {
    const projects = await prisma.toolkitProject.findMany();
    console.log('Projects found:', projects.length);
    projects.forEach(p => console.log(`- ${p.id}: ${p.name}`));
  } catch (e) {
    console.log('Error querying ToolkitProject:', (e as Error).message);
  }
  
  // Check for CSHTMLAnalysisCache
  try {
    const cache = await prisma.cSHTMLAnalysisCache.findMany();
    console.log('CSHTML Cache entries:', cache.length);
  } catch (e) {
    console.log('Error querying CSHTMLAnalysisCache:', (e as Error).message);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
