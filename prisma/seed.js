require("dotenv").config();
const crypto = require("crypto");
const { PrismaClient } = require("@prisma/client");

function attachPrismaModelAliases(prisma) {
  const aliases = {
    activityLog: "activitylog",
    authAccount: "authaccount",
    authInvitation: "authinvitation",
    authMember: "authmember",
    authOrganization: "authorganization",
    authSession: "authsession",
    authVerification: "authverification",
    automationRule: "automationrule",
    channelSyncState: "channelsyncstate",
    inboxChannel: "inboxchannel",
    messageTemplate: "messagetemplate",
    oAuthAccount: "oauthaccount",
    signatureChannel: "signaturechannel",
    templateFolder: "templatefolder",
  };

  for (const [alias, source] of Object.entries(aliases)) {
    if (!prisma[alias] && prisma[source]) {
      prisma[alias] = prisma[source];
    }
  }

  return prisma;
}

const prisma = attachPrismaModelAliases(new PrismaClient());

async function seedUsers() {
  const users = [
    {
      id: "u-sales-1",
      name: "Sales Agent",
      firstName: "Sales",
      lastName: "Agent",
      username: "sales_agent",
      email: "agent@company.com",
      role: "sales_agent",
      status: "available",
      twoFactorEnabled: false,
    },
    {
      id: "u-lead-1",
      name: "Team Lead",
      firstName: "Team",
      lastName: "Lead",
      username: "team_lead",
      email: "lead@company.com",
      role: "team_lead",
      status: "available",
      twoFactorEnabled: false,
    },
    {
      id: "u-admin-1",
      name: "Admin",
      firstName: "Admin",
      lastName: "User",
      username: "admin",
      email: "admin@company.com",
      role: "admin",
      status: "available",
      twoFactorEnabled: true,
    },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { id: user.id },
      update: {
        name: user.name,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        email: user.email,
        role: user.role,
        status: user.status,
        twoFactorEnabled: user.twoFactorEnabled,
        updatedAt: new Date(),
      },
      create: {
        ...user,
        updatedAt: new Date(),
      },
    });

    if (user.id === "u-admin-1") {
      await prisma.authaccount.upsert({
        where: {
          providerId_accountId: {
            providerId: "credential",
            accountId: "admin@company.com"
          }
        },
        update: {},
        create: {
          id: crypto.randomUUID(),
          accountId: "admin@company.com",
          providerId: "credential",
          userId: "u-admin-1",
          password: "c8f3709453aa7662f65b2be1b108a584:1083bd9b7b8c2b2a65a92faea9147c968db782c7801b705cfca7acf21201f13a27b902678bcd231408aa3264beed17cebc10ef6e78a5cd0286ac19c746a94989",
          updatedAt: new Date()
        }
      });
    }
  }
}

async function seedOrganization() {
  const orgId = "org-patterns-1";
  const org = await prisma.authOrganization.upsert({
    where: { slug: "patterns-group" },
    update: {
      name: "Patterns Group",
    },
    create: {
      id: orgId,
      name: "Patterns Group",
      slug: "patterns-group",
    },
  });

  // Link members to the organization
  const members = [
    { id: "mem-admin-1", userId: "u-admin-1", role: "admin" },
    { id: "mem-sales-1", userId: "u-sales-1", role: "member" },
    { id: "mem-lead-1", userId: "u-lead-1", role: "member" },
  ];

  for (const member of members) {
    await prisma.authMember.upsert({
      where: {
        organizationId_userId: {
          organizationId: org.id,
          userId: member.userId,
        },
      },
      update: {
        role: member.role,
      },
      create: {
        id: member.id,
        organizationId: org.id,
        userId: member.userId,
        role: member.role,
      },
    });
  }

  return org.id;
}

async function seedChannels() {
  const channels = [
    { name: "Sales Inbox", emailAddress: "sales@company.com", provider: "gmail" },
    { name: "Support Inbox", emailAddress: "support@company.com", provider: "outlook" },
  ];

  const ids = {};
  for (const channel of channels) {
    const row = await prisma.channel.upsert({
      where: { emailAddress: channel.emailAddress },
      update: {
        name: channel.name,
        provider: channel.provider,
        isActive: true,
      },
      create: {
        id: crypto.randomUUID(),
        ...channel,
        isActive: true,
      },
    });
    ids[channel.emailAddress] = row.id;
    await prisma.channelSyncState.upsert({
      where: { channelId: row.id },
      update: {
        provider: row.provider,
      },
      create: {
        id: crypto.randomUUID(),
        channelId: row.id,
        provider: row.provider,
        syncEnabled: false,
        status: "idle",
        updatedAt: new Date(),
      },
    });
  }
  return ids;
}

async function seedInboxes() {
  const inboxes = [
    {
      name: "Sales Inquiries",
      description: "Inbound leads and pricing conversations.",
    },
    {
      name: "Customer Support",
      description: "Customer support requests and issue resolution.",
    },
  ];

  const orgId = "org-patterns-1";
  const ids = {};
  for (const inbox of inboxes) {
    const existing = await prisma.inbox.findFirst({
      where: { name: inbox.name },
      select: { id: true },
    });
    if (existing) {
      await prisma.inbox.update({
        where: { id: existing.id },
        data: { 
          description: inbox.description,
          scopeType: "organization",
          scopeId: orgId
        },
      });
      ids[inbox.name] = existing.id;
      continue;
    }
    const created = await prisma.inbox.create({
      data: {
        id: crypto.randomUUID(),
        ...inbox,
        scopeType: "organization",
        scopeId: orgId,
        createdBy: "u-admin-1",
      },
    });
    ids[inbox.name] = created.id;
  }
  return ids;
}

async function seedInboxChannels(channelIdsByEmail, inboxIdsByName) {
  const salesChannelId = channelIdsByEmail["sales@company.com"];
  const supportChannelId = channelIdsByEmail["support@company.com"];
  const salesInboxId = inboxIdsByName["Sales Inquiries"];
  const supportInboxId = inboxIdsByName["Customer Support"];

  if (salesChannelId && salesInboxId) {
    await prisma.inboxChannel.upsert({
      where: {
        inboxId_channelId: {
          inboxId: salesInboxId,
          channelId: salesChannelId,
        },
      },
      update: {},
      create: {
        id: crypto.randomUUID(),
        inboxId: salesInboxId,
        channelId: salesChannelId,
        createdBy: "u-admin-1",
      },
    });
  }

  if (supportChannelId && supportInboxId) {
    await prisma.inboxChannel.upsert({
      where: {
        inboxId_channelId: {
          inboxId: supportInboxId,
          channelId: supportChannelId,
        },
      },
      update: {},
      create: {
        id: crypto.randomUUID(),
        inboxId: supportInboxId,
        channelId: supportChannelId,
        createdBy: "u-admin-1",
      },
    });
  }
}

async function seedTemplateData() {
  const generalFolderExisting = await prisma.templateFolder.findFirst({
    where: { name: "General" },
  });
  const salesFolderExisting = await prisma.templateFolder.findFirst({
    where: { name: "Sales" },
  });

  const generalFolder =
    generalFolderExisting ||
    (await prisma.templateFolder.create({
      data: { id: crypto.randomUUID(), name: "General" },
    }));

  const salesFolder =
    salesFolderExisting ||
    (await prisma.templateFolder.create({
      data: { id: crypto.randomUUID(), name: "Sales" },
    }));

  const welcomeExisting = await prisma.messageTemplate.findFirst({
    where: { name: "Welcome Reply" },
    select: { id: true },
  });
  if (welcomeExisting) {
    await prisma.messageTemplate.update({
      where: { id: welcomeExisting.id },
      data: {
        subject: "Thanks for reaching out",
        folderId: generalFolder.id,
      },
    });
  } else {
    await prisma.messageTemplate.create({
      data: {
        id: crypto.randomUUID(),
        name: "Welcome Reply",
        subject: "Thanks for reaching out",
        folderId: generalFolder.id,
        createdBy: "u-admin-1",
      },
    });
  }

  const pricingExisting = await prisma.messageTemplate.findFirst({
    where: { name: "Pricing Follow-up" },
    select: { id: true },
  });
  if (pricingExisting) {
    await prisma.messageTemplate.update({
      where: { id: pricingExisting.id },
      data: {
        subject: "Sharing pricing details",
        folderId: salesFolder.id,
      },
    });
  } else {
    await prisma.messageTemplate.create({
      data: {
        id: crypto.randomUUID(),
        name: "Pricing Follow-up",
        subject: "Sharing pricing details",
        folderId: salesFolder.id,
        createdBy: "u-admin-1",
      },
    });
  }
}

async function seedSignature(channelIdsByEmail) {
  const salesId = channelIdsByEmail["sales@company.com"];
  const supportId = channelIdsByEmail["support@company.com"];
  if (!salesId || !supportId) return;

  const existing = await prisma.signature.findFirst({
    where: { name: "Default Team Signature", createdBy: "u-admin-1" },
    select: { id: true },
  });
  let signatureId = existing?.id;

  if (!signatureId) {
    const row = await prisma.signature.create({
      data: {
        id: crypto.randomUUID(),
        name: "Default Team Signature",
        displayName: "Admin",
        senderFromLines: JSON.stringify([
          "Admin <sales@company.com>",
          "Admin <support@company.com>",
        ]),
        createdBy: "u-admin-1",
      },
      select: { id: true },
    });
    signatureId = row.id;
  }

  await prisma.signatureChannel.upsert({
    where: {
      signatureId_channelId: {
        signatureId,
        channelId: salesId,
      },
    },
    update: {},
    create: {
      id: crypto.randomUUID(),
      signatureId,
      channelId: salesId,
    },
  });

  await prisma.signatureChannel.upsert({
    where: {
      signatureId_channelId: {
        signatureId,
        channelId: supportId,
      },
    },
    update: {},
    create: {
      id: crypto.randomUUID(),
      signatureId,
      channelId: supportId,
    },
  });
}

async function main() {
  await seedUsers();
  const orgId = await seedOrganization();
  const channelIdsByEmail = await seedChannels();
  const inboxIdsByName = await seedInboxes();
  await seedInboxChannels(channelIdsByEmail, inboxIdsByName);
  await seedTemplateData();
  await seedSignature(channelIdsByEmail);
  await seedTicketingStatuses();
  await seedContacts(orgId);
  console.log(`Seed complete. Organization ID: ${orgId}`);
}

async function seedContacts(orgId) {
  const accounts = [
    { id: "acc-northlane", name: "Northlane", domain: "northlane.io", description: "Strategic customer" },
    { id: "acc-patterns", name: "Patterns247", domain: "patterns247.net", description: "Internal workspace" },
    { id: "acc-orbita", name: "Orbita", domain: "orbita.app", description: "Trial account" },
  ];

  for (const acc of accounts) {
    await prisma.contactaccount.upsert({
      where: { id: acc.id },
      update: {
        name: acc.name,
        domain: acc.domain,
        description: acc.description,
        organizationId: orgId,
      },
      create: {
        id: acc.id,
        name: acc.name,
        domain: acc.domain,
        description: acc.description,
        organizationId: orgId,
      },
    });
  }

  const lists = [
    { id: "lst-enterprise", name: "Enterprise renewals", visibility: "Shared", ownerId: orgId },
    { id: "lst-vip", name: "VIP founders", visibility: "Private", ownerId: "u-admin-1" },
    { id: "lst-product", name: "Product research panel", visibility: "Shared", ownerId: orgId },
  ];

  for (const lst of lists) {
    await prisma.contactlist.upsert({
      where: { id: lst.id },
      update: {
        name: lst.name,
        visibility: lst.visibility,
        ownerId: lst.ownerId,
        organizationId: orgId,
      },
      create: {
        id: lst.id,
        name: lst.name,
        visibility: lst.visibility,
        ownerId: lst.ownerId,
        organizationId: orgId,
      },
    });
  }

  const contacts = [
    {
      id: "cnt_001",
      name: "Nirav Mandli",
      email: "nirav.mandli@patterns247.net",
      phone: "+91 99999 88888",
      x: "@niravm",
      description: "Operations owner",
      access: "Auto-created",
      accountId: "acc-patterns",
    },
    {
      id: "cnt_002",
      name: "ChatGPT OpenAI",
      email: "32.mrtvix3qo5zueqkqmfuhuqrtgfx@mail.openai.com",
      phone: "",
      x: "",
      description: "AI bot conversation",
      access: "Auto-created",
      accountId: null,
    },
    {
      id: "cnt_003",
      name: "Aditi Mehra",
      email: "aditi@northlane.io",
      phone: "+1 415 555 0194",
      x: "@aditimer",
      description: "Customer success lead",
      access: "Shared",
      accountId: "acc-northlane",
    },
    {
      id: "cnt_004",
      name: "Rohan Patel",
      email: "rohan.personal@example.com",
      phone: "+91 98765 43210",
      x: "",
      description: "Private vendor contact",
      access: "Private",
      accountId: null,
    },
  ];

  for (const c of contacts) {
    await prisma.contact.upsert({
      where: { email: c.email },
      update: {
        name: c.name,
        phone: c.phone || null,
        x: c.x || null,
        description: c.description || null,
        access: c.access,
        accountId: c.accountId,
        organizationId: orgId,
      },
      create: {
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone || null,
        x: c.x || null,
        description: c.description || null,
        access: c.access,
        accountId: c.accountId,
        organizationId: orgId,
        createdBy: "u-admin-1",
      },
    });
  }

  const listMembers = [
    { id: "lm-1", contactListId: "lst-enterprise", contactId: "cnt_003" },
    { id: "lm-2", contactListId: "lst-vip", contactId: "cnt_001" },
  ];

  for (const lm of listMembers) {
    await prisma.contactlistmember.upsert({
      where: {
        contactListId_contactId: {
          contactListId: lm.contactListId,
          contactId: lm.contactId
        }
      },
      update: {},
      create: {
        id: lm.id,
        contactListId: lm.contactListId,
        contactId: lm.contactId,
      }
    });
  }
}


async function seedTicketingStatuses() {
  const defaultStatuses = [
    { name: "Open", category: "open", isDefault: true, isReopen: false },
    { name: "Waiting", category: "waiting", isDefault: false, isReopen: false },
    { name: "Resolved", category: "resolved", isDefault: false, isReopen: false },
    { name: "Closed", category: "resolved", isDefault: false, isReopen: false },
  ];

  const orgId = "org-patterns-1";
  for (const s of defaultStatuses) {
    const id = `status-${s.name.toLowerCase()}`;
    await prisma.ticketstatus.upsert({
      where: { id },
      update: { 
        ...s, 
        organizationId: orgId,
        updatedAt: new Date()
      },
      create: {
        id,
        ...s,
        organizationId: orgId,
        updatedAt: new Date()
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error("Seed failed:", error);
    await prisma.$disconnect();
    process.exit(1);
  });
