const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
async function main() {
  const orgs = await prisma.authorganization.findMany();
  console.log(JSON.stringify(orgs, null, 2));
  const inboxes = await prisma.inbox.findMany();
  console.log(JSON.stringify(inboxes, null, 2));
}
main().finally(() => prisma.$disconnect());
