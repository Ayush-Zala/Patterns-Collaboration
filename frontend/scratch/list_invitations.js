const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const invitations = await prisma.authinvitation.findMany();
  console.log(JSON.stringify(invitations, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
