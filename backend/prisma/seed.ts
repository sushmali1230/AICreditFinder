import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Ensuring essential system users and policy configuration exist...');

  // 1. Create Default Lending Policy if missing
  const existingPolicy = await prisma.lendingPolicyConfig.findFirst({
    where: { isDefault: true },
  });

  if (!existingPolicy) {
    await prisma.lendingPolicyConfig.create({
      data: {
        policyName: 'Retail & Commercial Underwriting Policy 2024.2',
        description:
          'Standard institutional retail lending guidelines with FOIR ceilings, CIBIL benchmarks, and multi-year ITR cross-verification rules.',
        maxFoirSalaried: 50.0,
        maxFoirSelfEmployed: 55.0,
        minCreditScore: 650,
        minAverageMonthlyBalance: 10000.0,
        baseInterestRate: 10.5,
        haircutUnverifiedIncome: 20.0,
        maxAllowedBouncesLast6Months: 1,
        isDefault: true,
      },
    });
    console.log('Default Lending Policy configured.');
  }

  // 2. Ensure default bank staff accounts exist for authentication
  const passwordHash = await bcrypt.hash('password123', 10);

  const staff = [
    {
      email: 'analyst@apexbank.com',
      name: 'Vikram Mehta',
      role: 'ANALYST',
      employeeId: 'EMP-ANL-1042',
      department: 'Retail Credit Risk & Underwriting',
    },
    {
      email: 'approver@apexbank.com',
      name: 'Ananya Deshmukh',
      role: 'APPROVER',
      employeeId: 'EMP-APP-8901',
      department: 'Commercial Credit Committee',
    },
    {
      email: 'admin@apexbank.com',
      name: 'Suresh Nambiar',
      role: 'ADMIN',
      employeeId: 'EMP-ADM-0021',
      department: 'Risk Operations & Compliance',
    },
  ];

  for (const s of staff) {
    const existing = await prisma.user.findUnique({
      where: { email: s.email },
    });
    if (!existing) {
      await prisma.user.create({
        data: {
          email: s.email,
          passwordHash,
          name: s.name,
          role: s.role,
          employeeId: s.employeeId,
          department: s.department,
        },
      });
      console.log(`Created staff account: ${s.email} (${s.role})`);
    }
  }

  console.log('System initialization complete. No dummy customer or transaction data present.');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
