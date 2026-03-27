import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  const now = new Date();
  
  // Create default admin user
  const passwordHash = await bcrypt.hash('Admin123!', 12);
  
  const user = await prisma.user.upsert({
    where: { email: 'admin@schema-architect.com' },
    update: {},
    create: {
      id: 'user_admin_001',
      email: 'admin@schema-architect.com',
      name: 'Admin User',
      displayName: 'Admin',
      passwordHash,
      isActive: true,
      emailVerified: true,
      emailVerifiedAt: now,
      updatedAt: now,
    },
  });

  console.log('Created user:', user.email);

  // Create default company
  const company = await prisma.company.upsert({
    where: { slug: 'schema-architect' },
    update: {},
    create: {
      id: 'company_default_001',
      name: 'Schema Architect',
      slug: 'schema-architect',
      subscriptionTier: 'enterprise',
      subscriptionStatus: 'active',
      isActive: true,
      updatedAt: now,
    },
  });

  console.log('Created company:', company.name);

  // Link user to company as owner
  const userCompany = await prisma.userCompany.upsert({
    where: {
      userId_companyId: {
        userId: user.id,
        companyId: company.id,
      },
    },
    update: {},
    create: {
      id: 'usercompany_admin_001',
      userId: user.id,
      companyId: company.id,
      role: 'owner',
      status: 'active',
      joinedAt: now,
      updatedAt: now,
    },
  });

  console.log('Linked user to company with role:', userCompany.role);

  // Create a demo project
  const project = await prisma.project.upsert({
    where: { id: 'project_demo_001' },
    update: {},
    create: {
      id: 'project_demo_001',
      companyId: company.id,
      name: 'Hospital Information System',
      slug: 'his-demo',
      description: 'A comprehensive Hospital Information System migration project from ASP.NET to Next.js',
      softwareType: 'Healthcare',
      status: 'active',
      createdBy: user.id,
      updatedAt: now,
    },
  });

  console.log('Created project:', project.name);

  // Create additional test user
  const testPasswordHash = await bcrypt.hash('Test123!', 12);
  
  const testUser = await prisma.user.upsert({
    where: { email: 'test@schema-architect.com' },
    update: {},
    create: {
      id: 'user_test_001',
      email: 'test@schema-architect.com',
      name: 'Test User',
      displayName: 'Tester',
      passwordHash: testPasswordHash,
      isActive: true,
      emailVerified: true,
      emailVerifiedAt: now,
      updatedAt: now,
    },
  });

  console.log('Created test user:', testUser.email);

  // Link test user to company as member
  await prisma.userCompany.upsert({
    where: {
      userId_companyId: {
        userId: testUser.id,
        companyId: company.id,
      },
    },
    update: {},
    create: {
      id: 'usercompany_test_001',
      userId: testUser.id,
      companyId: company.id,
      role: 'member',
      status: 'active',
      joinedAt: now,
      updatedAt: now,
    },
  });

  console.log('\n========================================');
  console.log('Seed completed successfully!');
  console.log('========================================');
  console.log('\nDefault Credentials:');
  console.log('--------------------');
  console.log('Admin User:');
  console.log('  Email: admin@schema-architect.com');
  console.log('  Password: Admin123!');
  console.log('');
  console.log('Test User:');
  console.log('  Email: test@schema-architect.com');
  console.log('  Password: Test123!');
  console.log('========================================\n');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
