const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function checkTags() {
  const tags = await prisma.tag.findMany();
  console.log("Total tags:", tags.length);
  const ids = tags.map(t => t.id);
  const uniqueIds = new Set(ids);
  if (ids.length !== uniqueIds.size) {
    console.log("DUPLICATE IDs FOUND!");
    const counts = {};
    ids.forEach(id => {
      counts[id] = (counts[id] || 0) + 1;
    });
    Object.keys(counts).forEach(id => {
      if (counts[id] > 1) {
        console.log(`ID ${id} appears ${counts[id]} times`);
        const matching = tags.filter(t => t.id === id);
        matching.forEach(t => console.log(`  Scope: ${t.scopeType}, ${t.scopeId}, Name: ${t.name}`));
      }
    });
  } else {
    console.log("No duplicate IDs in database.");
  }
  await prisma.$disconnect();
}

checkTags();
