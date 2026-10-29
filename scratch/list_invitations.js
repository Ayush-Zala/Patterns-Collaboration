const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  try {
    const invitations = await prisma.authinvitation.findMany({
      orderBy: { createdAt: 'desc' }
    });
    
    console.log("PENDING INVITATIONS:");
    console.log("====================");
    invitations.forEach(inv => {
      console.log(`Email: ${inv.email}`);
      console.log(`ID:    ${inv.id}`);
      console.log(`Role:  ${inv.role}`);
      console.log(`Status: ${inv.status || 'pending'}`);
      console.log(`Created: ${inv.createdAt}`);
      console.log("--------------------");
    });
    
    if (invitations.length === 0) {
      console.log("No invitations found.");
    }
  } catch (error) {
    console.error("Database error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
