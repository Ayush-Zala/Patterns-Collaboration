const { PrismaClient } = require('@prisma/client'); 
const prisma = new PrismaClient(); 
prisma.automationrule.deleteMany({where: {name: 'Personal Tagging'}}).then(console.log).catch(console.error).finally(() => prisma.$disconnect());
