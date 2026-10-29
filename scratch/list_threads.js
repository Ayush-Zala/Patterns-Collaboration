const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function checkThreads() {
  const threads = await prisma.thread.findMany();
  console.log("Total threads:", threads.length);
  threads.forEach(t => {
    console.log(`Thread ID: ${t.id}, Subject: ${t.subject}`);
  });
  await prisma.$disconnect();
}

checkThreads();
