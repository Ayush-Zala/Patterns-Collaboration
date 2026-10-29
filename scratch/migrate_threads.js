const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function migrate() {
  console.log("Migrating all threads to default company/global scope to ensure visibility...");
  try {
    const result = await prisma.thread.updateMany({
      data: {
        scopeType: "company",
        scopeId: "global"
      }
    });
    console.log(`Successfully updated ${result.count} threads.`);
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await prisma.$disconnect();
  }
}

migrate();
