const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function debug() {
  const orgs = await prisma.authorganization.findMany();
  console.log("Organizations:", JSON.stringify(orgs, null, 2));
  
  const members = await prisma.authmember.findMany({
    include: {
      user: true
    }
  });
  console.log("Members:", JSON.stringify(members, null, 2));
}

debug().finally(() => prisma.$disconnect());
