const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Cleaning up test data...');

  // Delete all messages and threads (Cascade will handle some related fields, but we'll do it explicitly)
  await prisma.message.deleteMany({});
  await prisma.comment.deleteMany({});
  await prisma.eventattendee.deleteMany({});
  await prisma.event.deleteMany({});
  await prisma.thread.deleteMany({});
  
  // Also reset analytics metrics to start fresh
  await prisma.analyticsmetric.deleteMany({});

  console.log('All threads, messages, comments, events, and analytics have been cleared!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
