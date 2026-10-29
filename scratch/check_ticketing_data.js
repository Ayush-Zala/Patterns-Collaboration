const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const statuses = await prisma.ticketstatus.findMany();
  const groups = await prisma.ticketstatusgroup.findMany({
    include: {
      statuses: true,
      inboxes: true
    }
  });
  
  console.log('--- STATUSES ---');
  console.log(JSON.stringify(statuses, null, 2));
  console.log('--- GROUPS ---');
  console.log(JSON.stringify(groups, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
