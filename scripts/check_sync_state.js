const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const syncState = await prisma.channelsyncstate.findMany();
  console.log('--- Channel Sync States ---');
  console.log(JSON.stringify(syncState, null, 2));

  const recentMessages = await prisma.message.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  console.log('--- Recent Messages ---');
  console.log(JSON.stringify(recentMessages, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
