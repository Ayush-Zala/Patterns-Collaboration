const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function checkThreads() {
  const threads = await prisma.thread.findMany();
  console.log("Total threads:", threads.length);
  const ids = threads.map(t => t.id);
  const uniqueIds = new Set(ids);
  if (ids.length !== uniqueIds.size) {
    console.log("DUPLICATE IDs FOUND IN THREADS!");
    const counts = {};
    ids.forEach(id => {
      counts[id] = (counts[id] || 0) + 1;
    });
    Object.keys(counts).forEach(id => {
      if (counts[id] > 1) {
        console.log(`ID ${id} appears ${counts[id]} times`);
      }
    });
  } else {
    console.log("No duplicate IDs in threads.");
  }
  await prisma.$disconnect();
}

checkThreads();
