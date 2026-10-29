const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.user.updateMany({
    data: { role: 'admin' }
  });
  console.log('Updated users to admin');
}

main().finally(() => prisma.$disconnect());
