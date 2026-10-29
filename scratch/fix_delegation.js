const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function checkDelegation() {
  const email = "contenthouse21@gmail.com";
  console.log(`Checking delegation for ${email}...`);

  const delegations = await prisma.delegationdelegate.findMany({
    where: {
      delegateEmail: email
    },
    include: {
      delegation: {
        include: {
          delegationinbox: true
        }
      }
    }
  });

  if (delegations.length === 0) {
    console.log("NO DELEGATION FOUND! Creating one...");
    
    // Get an organization ID
    const org = await prisma.authorganization.findFirst();
    if (!org) {
      console.error("No organization found to link delegation to.");
      return;
    }

    // Get all inboxes
    const inboxes = await prisma.inbox.findMany();
    console.log(`Found ${inboxes.length} inboxes.`);

    // Create delegation
    const delegation = await prisma.delegation.create({
      data: {
        id: "del_" + Math.random().toString(36).substring(2, 15),
        name: `Initial access for ${email}`,
        permissionScope: "share_specific_inboxes",
        delegationdelegate: {
          create: {
            id: "dd_" + Math.random().toString(36).substring(2, 15),
            delegateEmail: email
          }
        },
        delegationinbox: {
          create: inboxes.map(inbox => ({
            id: "di_" + Math.random().toString(36).substring(2, 15),
            inboxId: inbox.id
          }))
        }
      }
    });

    console.log("Delegation created successfully:", delegation.id);
  } else {
    console.log(`Found ${delegations.length} delegations.`);
    delegations.forEach(d => {
      console.log(`- Delegation: ${d.delegation.name} (${d.delegation.permissionScope})`);
      console.log(`  Inboxes: ${d.delegation.delegationinbox.length}`);
    });
  }
}

checkDelegation()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
