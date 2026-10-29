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
    customField: "customfield",
    workspace: "workspace",
  };

  for (const [alias, source] of Object.entries(aliases)) {
    if (!prisma[alias] && prisma[source]) {
      prisma[alias] = prisma[source];
    }
  }

  return prisma;
}

function toIso(value) {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function uniqueStrings(items) {
  return [...new Set(asArray(items).map((item) => String(item).trim()).filter(Boolean))];
}

function parseStoredStringList(value) {
  if (Array.isArray(value)) {
    return uniqueStrings(value);
  }
  if (typeof value !== "string") {
    return [];
  }

  const trimmed = value.trim();
  if (!trimmed) return [];

  try {
    const parsed = JSON.parse(trimmed);
    return Array.isArray(parsed) ? uniqueStrings(parsed) : uniqueStrings([trimmed]);
  } catch {
    return uniqueStrings(
      trimmed
        .split(/\r?\n|,/)
        .map((entry) => entry.trim())
        .filter(Boolean)
    );
  }
}

function asDateOrNow(value) {
  if (!value) return new Date();
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return new Date();
  return parsed;
}

class DatabaseStore {
  constructor({ prisma } = {}) {
    this.prisma = attachPrismaModelAliases(prisma || new PrismaClient());
  }

  async init({ seed = true } = {}) {
    if (!seed) return;
    const userCount = await this.prisma.user.count();
    if (userCount > 0) return;
    await this.seed();
  }

  async close() {
    await this.prisma.$disconnect();
  }

  async seed() {
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
      await this.prisma.user.upsert({
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
        },
        create: user,
      });
    }

    const channels = [
      { name: "Sales Inbox", emailAddress: "sales@company.com", provider: "gmail" },
      { name: "Support Inbox", emailAddress: "support@company.com", provider: "outlook" },
    ];

    const channelIds = {};
    for (const channel of channels) {
      const row = await this.prisma.channel.upsert({
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
      channelIds[channel.emailAddress] = row.id;
      await this.prisma.channelSyncState.upsert({
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

    const inboxIds = {};
    for (const inbox of inboxes) {
      const existing = await this.prisma.inbox.findFirst({ where: { name: inbox.name }, select: { id: true } });
      if (existing) {
        await this.prisma.inbox.update({
          where: { id: existing.id },
          data: { description: inbox.description },
        });
        inboxIds[inbox.name] = existing.id;
      } else {
        const created = await this.prisma.inbox.create({
          data: {
            id: crypto.randomUUID(),
            ...inbox,
            createdBy: "u-admin-1",
          },
        });
        inboxIds[inbox.name] = created.id;
      }
    }

    const salesInboxId = inboxIds["Sales Inquiries"];
    const supportInboxId = inboxIds["Customer Support"];
    const salesChannelId = channelIds["sales@company.com"];
    const supportChannelId = channelIds["support@company.com"];

    if (salesInboxId && salesChannelId) {
      await this.prisma.inboxChannel.upsert({
        where: { inboxId_channelId: { inboxId: salesInboxId, channelId: salesChannelId } },
        update: {},
        create: {
          id: crypto.randomUUID(),
          inboxId: salesInboxId,
          channelId: salesChannelId,
          createdBy: "u-admin-1",
        },
      });
    }
    if (supportInboxId && supportChannelId) {
      await this.prisma.inboxChannel.upsert({
        where: { inboxId_channelId: { inboxId: supportInboxId, channelId: supportChannelId } },
        update: {},
        create: {
          id: crypto.randomUUID(),
          inboxId: supportInboxId,
          channelId: supportChannelId,
          createdBy: "u-admin-1",
        },
      });
    }

    const generalFolder =
      (await this.prisma.templateFolder.findFirst({ where: { name: "General" } })) ||
      (await this.prisma.templateFolder.create({ data: { id: crypto.randomUUID(), name: "General" } }));
    const salesFolder =
      (await this.prisma.templateFolder.findFirst({ where: { name: "Sales" } })) ||
      (await this.prisma.templateFolder.create({ data: { id: crypto.randomUUID(), name: "Sales" } }));

    const templateSeeds = [
      { name: "Welcome Reply", subject: "Thanks for reaching out", folderId: generalFolder.id },
      { name: "Pricing Follow-up", subject: "Sharing pricing details", folderId: salesFolder.id },
    ];
    for (const templateSeed of templateSeeds) {
      const existing = await this.prisma.messageTemplate.findFirst({
        where: { name: templateSeed.name },
        select: { id: true },
      });
      if (existing) {
        await this.prisma.messageTemplate.update({
          where: { id: existing.id },
          data: { subject: templateSeed.subject, folderId: templateSeed.folderId },
        });
      } else {
        await this.prisma.messageTemplate.create({
          data: {
            id: crypto.randomUUID(),
            ...templateSeed,
            createdBy: "u-admin-1",
          },
        });
      }
    }

    const existingSignature = await this.prisma.signature.findFirst({
      where: { name: "Default Team Signature", createdBy: "u-admin-1" },
      select: { id: true },
    });
    let signatureId = existingSignature?.id;

    if (!signatureId) {
      const created = await this.prisma.signature.create({
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
      signatureId = created.id;
    }

    if (signatureId && salesChannelId) {
      await this.prisma.signatureChannel.upsert({
        where: { signatureId_channelId: { signatureId, channelId: salesChannelId } },
        update: {},
        create: { id: crypto.randomUUID(), signatureId, channelId: salesChannelId },
      });
    }
    if (signatureId && supportChannelId) {
      await this.prisma.signatureChannel.upsert({
        where: { signatureId_channelId: { signatureId, channelId: supportChannelId } },
        update: {},
        create: { id: crypto.randomUUID(), signatureId, channelId: supportChannelId },
      });
    }

    const defaultStatuses = [
      { name: "Open", category: "open", isDefault: true, isReopen: false },
      { name: "Waiting", category: "waiting", isDefault: false, isReopen: false },
      { name: "Resolved", category: "resolved", isDefault: false, isReopen: false },
      { name: "Closed", category: "resolved", isDefault: false, isReopen: false },
    ];

    const orgId = "org-1"; // Assuming a default org for seeding
    for (const s of defaultStatuses) {
      await this.prisma.ticketstatus.upsert({
        where: { id: `status-${s.name.toLowerCase()}` },
        update: { ...s, organizationId: orgId },
        create: {
          id: `status-${s.name.toLowerCase()}`,
          ...s,
          organizationId: orgId,
        },
      });
    }
  }

  mapUser(row) {
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
      first_name: row.firstName || null,
      last_name: row.lastName || null,
      username: row.username || null,
      two_factor_enabled: row.twoFactorEnabled,
      status: row.status,
      created_at: toIso(row.createdAt),
      updated_at: toIso(row.updatedAt),
    };
  }

  mapChannel(row) {
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      email_address: row.emailAddress,
      provider: row.provider,
      oauth_account_id: row.oauthAccountId || null,
      is_active: row.isActive,
      created_at: toIso(row.createdAt),
    };
  }

  mapChannelSyncState(row) {
    if (!row) return null;
    return {
      id: row.id,
      channel_id: row.channelId,
      provider: row.provider,
      sync_enabled: row.syncEnabled,
      status: row.status,
      cursor: row.cursor || null,
      watch_expiration_at: toIso(row.watchExpirationAt),
      last_synced_at: toIso(row.lastSyncedAt),
      last_error: row.lastError || null,
      updated_at: toIso(row.updatedAt),
      created_at: toIso(row.createdAt),
    };
  }

  mapInbox(row) {
    if (!row) return null;
    let customFields = {};
    if (typeof row.customFields === "string" && row.customFields.trim()) {
      try {
        customFields = JSON.parse(row.customFields);
      } catch {
        customFields = {};
      }
    }
    return {
      id: row.id,
      name: row.name,
      description: row.description || "",
      custom_fields: customFields,
      scope_type: row.scopeType,
      scope_id: row.scopeId,
      created_by: row.createdBy || null,
      created_at: toIso(row.createdAt),
      ticket_statuses_enabled: row.ticketStatusesEnabled ?? false,
      ticket_id_enabled: row.ticketIdEnabled ?? false,
      ticket_id_counter: row.ticketIdCounter ?? 0,
      channels: row.inboxchannel?.map((ic) => this.mapChannel(ic.channel)).filter(Boolean) || [],
    };
  }

  mapTemplateFolder(row) {
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      created_at: toIso(row.createdAt),
    };
  }

  mapMessageTemplate(row) {
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      subject: row.subject,
      folder_id: row.folderId,
      created_by: row.createdBy || null,
      created_at: toIso(row.createdAt),
    };
  }

  mapDelegation(row) {
    if (!row) return null;
    const inboxLinks = row.inboxLinks || row.delegationinbox || [];
    const delegates = row.delegates || row.delegationdelegate || [];
    return {
      id: row.id,
      name: row.name,
      permission_scope: row.permissionScope,
      inbox_ids: inboxLinks.map((link) => link.inboxId),
      delegate_emails: delegates.map((delegate) => delegate.delegateEmail),
      created_by: row.createdBy || null,
      created_at: toIso(row.createdAt),
    };
  }

  mapSignature(row) {
    if (!row) return null;
    const channelLinks = row.channelLinks || row.signaturechannel || [];
    return {
      id: row.id,
      name: row.name,
      display_name: row.displayName,
      sender_from_lines: parseStoredStringList(row.senderFromLines),
      channel_ids: channelLinks.map((link) => link.channelId),
      created_by: row.createdBy || null,
      created_at: toIso(row.createdAt),
    };
  }

  mapOAuthAccount(row) {
    if (!row) return null;
    return {
      id: row.id,
      provider: row.provider,
      email: row.email,
      access_token: row.accessToken,
      refresh_token: row.refreshToken,
      expires_at: toIso(row.expiresAt),
      updated_at: toIso(row.updatedAt),
    };
  }

  mapMessage(row) {
    if (!row) return null;
    return {
      id: row.id,
      thread_id: row.threadId,
      provider_message_id: row.providerMessageId || null,
      from: row.fromEmail,
      to: parseStoredStringList(row.toRecipients),
      cc: parseStoredStringList(row.ccRecipients),
      body_text: row.bodyText || "",
      body_html: row.bodyHtml || "",
      attachments: parseStoredStringList(row.attachments),
      received_at: toIso(row.receivedAt),
      direction: row.direction,
      created_by: row.createdBy || null,
    };
  }

  mapComment(row) {
    if (!row) return null;
    return {
      id: row.id,
      thread_id: row.threadId,
      author_id: row.authorId,
      body: row.body,
      visibility: row.visibility,
      created_at: toIso(row.createdAt),
    };
  }

  mapActivityLog(row) {
    if (!row) return null;
    let metadata = {};
    if (typeof row.metadata === "string" && row.metadata.trim()) {
      try {
        metadata = JSON.parse(row.metadata);
      } catch {
        metadata = {};
      }
    } else if (row.metadata && typeof row.metadata === "object") {
      metadata = row.metadata;
    }
    return {
      id: row.id,
      type: row.type,
      actor_id: row.actorId || null,
      entity_type: row.entityType || null,
      entity_id: row.entityId || null,
      metadata,
      created_at: toIso(row.createdAt),
    };
  }

  mapThreadSummary(row) {
    if (!row) return null;
    const participants = parseStoredStringList(row.participants);
    const channelEmail = row.channel?.emailAddress || null;
    const others = participants.filter(p => p.toLowerCase() !== channelEmail?.toLowerCase());
    const senderContact = others[0] || participants[0] || "unknown@customer.com";
    const sender = senderContact.split("@")[0];
    
    return {
      id: row.id,
      channelId: row.channelId,
      channelEmail: row.channel?.emailAddress || null,
      subject: row.subject,
      participants,
      sender,
      senderContact,
      snippet: row.message?.[0]?.bodyText?.slice(0, 100) || "No messages",
      unreadCount: 0,
      replyCount: row.message?.length || 0,
      messages: [],
      status: row.status,
      assignmentState: row.assignmentState,
      assignedTo: row.assignedTo || null,
      priority: row.priority,
      tags: parseStoredStringList(row.tags),
      snoozedUntil: row.snoozedUntil ? toIso(row.snoozedUntil) : null,
      lastActivityAt: toIso(row.lastActivityAt),
      createdAt: toIso(row.createdAt),
      isUnreplied: row.message?.[0]?.direction === "inbound",
      // Provider-specific fields for outbound email threading
      externalThreadKey: row.externalThreadKey || null,
      inboxId: row.inboxId || null,
    };
  }

  async getUser(userId) {
    const row = await this.prisma.user.findUnique({ where: { id: userId } });
    return this.mapUser(row);
  }

  async listChannels() {
    const rows = await this.prisma.channel.findMany({
      orderBy: { createdAt: "desc" },
    });
    return rows.map((row) => this.mapChannel(row));
  }

  async getChannel(channelId) {
    const row = await this.prisma.channel.findUnique({ where: { id: channelId } });
    return this.mapChannel(row);
  }

  async getChannelByEmail(email) {
    if (!email) return null;
    const row = await this.prisma.channel.findUnique({
      where: { emailAddress: String(email).toLowerCase() },
    });
    return this.mapChannel(row);
  }

  async createChannel(input) {
    const row = await this.prisma.channel.create({
      data: {
        id: crypto.randomUUID(),
        name: String(input.name || "").trim(),
        emailAddress: String(input.email_address || "").toLowerCase().trim(),
        provider: input.provider || "gmail",
        oauthAccountId: input.oauth_account_id || null,
        isActive: true,
      },
    });
    await this.prisma.channelSyncState.upsert({
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
    return this.mapChannel(row);
  }

  async updateChannelOAuthAccount(input) {
    const row = await this.prisma.channel.update({
      where: { id: String(input.channel_id) },
      data: {
        oauthAccountId: input.oauth_account_id || null,
        isActive: input.is_active !== undefined ? Boolean(input.is_active) : undefined,
      },
    });
    return this.mapChannel(row);
  }

  async listInboxes() {
    const rows = await this.prisma.inbox.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        inboxchannel: {
          include: {
            channel: true,
          },
        },
      },
    });
    return rows.map((row) => this.mapInbox(row));
  }

  async getInbox(inboxId) {
    const row = await this.prisma.inbox.findUnique({ where: { id: inboxId } });
    return this.mapInbox(row);
  }

  async createInbox(input) {
    const row = await this.prisma.inbox.create({
      data: {
        id: crypto.randomUUID(),
        name: String(input.name || "").trim(),
        description: input.description ? String(input.description).trim() : "",
        customFields: JSON.stringify(input.custom_fields || {}),
        scopeType: input.scopeType || "company",
        scopeId: input.scopeId || "global",
        createdBy: input.created_by || null,
        workspaceId: input.workspaceId || null,
      },
    });
    return this.mapInbox(row);
  }

  async bulkUpdateInboxCustomFields(updates) {
    const items = Array.isArray(updates) ? updates : [];
    const validItems = items
      .map((update) => {
        const inboxId = String(update?.inbox_id || update?.id || "").trim();
        if (!inboxId) return null;
        return {
          inboxId,
          customFields: JSON.stringify(update.custom_fields || {}),
        };
      })
      .filter(Boolean);

    if (!validItems.length) {
      return { updated: 0 };
    }

    const results = await this.prisma.$transaction(
      validItems.map((item) =>
        this.prisma.inbox.update({
          where: { id: item.inboxId },
          data: { customFields: item.customFields },
          select: { id: true },
        })
      )
    );

    return { updated: results.length };
  }

  async deleteInbox(inboxId) {
    try {
      const row = await this.prisma.inbox.delete({
        where: { id: String(inboxId) },
      });
      return this.mapInbox(row);
    } catch (error) {
      if (error && error.code === "P2025") {
        return null;
      }
      throw error;
    }
  }

  async updateInbox(inboxId, input) {
    const data = {};
    if (input.name !== undefined) data.name = String(input.name).trim();
    if (input.description !== undefined) data.description = String(input.description).trim();
    if (input.ticketStatusesEnabled !== undefined) data.ticketStatusesEnabled = Boolean(input.ticketStatusesEnabled);
    if (input.ticketIdEnabled !== undefined) data.ticketIdEnabled = Boolean(input.ticketIdEnabled);
    if (input.customFields !== undefined) data.customFields = JSON.stringify(input.customFields);

    const row = await this.prisma.inbox.update({
      where: { id: String(inboxId) },
      data,
      include: {
        inboxchannel: {
          include: {
            channel: true,
          },
        },
      },
    });
    return this.mapInbox(row);
  }

  async nextTicketId(inboxId) {
    const updated = await this.prisma.inbox.update({
      where: { id: String(inboxId) },
      data: { ticketIdCounter: { increment: 1 } },
      select: { ticketIdCounter: true },
    });
    return updated.ticketIdCounter;
  }

  async listInboxChannels(inboxId) {
    const rows = await this.prisma.inboxChannel.findMany({
      where: { inboxId: String(inboxId) },
      include: {
        channel: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((row) => this.mapChannel(row.channel));
  }

  /**
   * Look up which inbox a channel belongs to.
   * Returns the inboxId string or null if not found.
   */
  async getInboxIdByChannelId(channelId) {
    if (!channelId) return null;
    const row = await this.prisma.inboxChannel.findFirst({
      where: { channelId: String(channelId) },
      select: { inboxId: true },
    });
    return row ? row.inboxId : null;
  }


  async connectInboxChannel(input) {
    const row = await this.prisma.inboxChannel.upsert({
      where: {
        inboxId_channelId: {
          inboxId: String(input.inbox_id),
          channelId: String(input.channel_id),
        },
      },
      update: {},
      create: {
        id: crypto.randomUUID(),
        inboxId: String(input.inbox_id),
        channelId: String(input.channel_id),
        createdBy: input.created_by || null,
      },
    });

    return {
      id: row.id,
      inbox_id: row.inboxId,
      channel_id: row.channelId,
      created_by: row.createdBy || null,
      created_at: toIso(row.createdAt),
    };
  }

  async listTemplateFolders() {
    const rows = await this.prisma.templateFolder.findMany({
      orderBy: { name: "asc" },
    });
    return rows.map((row) => this.mapTemplateFolder(row));
  }

  async createTemplateFolder(input) {
    const row = await this.prisma.templateFolder.create({
      data: {
        id: crypto.randomUUID(),
        name: String(input.name || "").trim(),
      },
    });
    return this.mapTemplateFolder(row);
  }

  async getTemplateFolder(folderId) {
    const row = await this.prisma.templateFolder.findUnique({ where: { id: folderId } });
    return this.mapTemplateFolder(row);
  }

  async listMessageTemplates() {
    const rows = await this.prisma.messageTemplate.findMany({
      orderBy: { createdAt: "desc" },
    });
    return rows.map((row) => this.mapMessageTemplate(row));
  }

  async createMessageTemplate(input) {
    const row = await this.prisma.messageTemplate.create({
      data: {
        id: crypto.randomUUID(),
        name: String(input.name || "").trim(),
        subject: String(input.subject || "").trim(),
        folderId: input.folder_id,
        createdBy: input.created_by || null,
      },
    });
    return this.mapMessageTemplate(row);
  }

  async listDelegations() {
    const rows = await this.prisma.delegation.findMany({
      include: {
        delegationinbox: true,
        delegationdelegate: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((row) => this.mapDelegation(row));
  }

  async createDelegation(input) {
    const row = await this.prisma.delegation.create({
      data: {
        id: crypto.randomUUID(),
        name: input.name,
        permissionScope: input.permission_scope,
        createdBy: input.created_by || null,
        delegationinbox: {
          create: uniqueStrings(input.inbox_ids).map((inboxId) => ({ id: crypto.randomUUID(), inboxId })),
        },
        delegationdelegate: {
          create: uniqueStrings(input.delegate_emails).map((delegateEmail) => ({ id: crypto.randomUUID(), delegateEmail })),
        },
      },
      include: {
        delegationinbox: true,
        delegationdelegate: true,
      },
    });
    return this.mapDelegation(row);
  }

  async deleteDelegation(delegationId) {
    try {
      const row = await this.prisma.delegation.delete({
        where: { id: String(delegationId) },
        include: {
          delegationinbox: true,
          delegationdelegate: true,
        },
      });
      return this.mapDelegation(row);
    } catch (error) {
      if (error && error.code === "P2025") {
        return null;
      }
      throw error;
    }
  }

  async listSignatures() {
    const rows = await this.prisma.signature.findMany({
      include: {
        signaturechannel: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((row) => this.mapSignature(row));
  }

  async createSignature(input) {
    const row = await this.prisma.signature.create({
      data: {
        id: crypto.randomUUID(),
        name: input.name,
        displayName: input.display_name || "",
        senderFromLines: JSON.stringify(uniqueStrings(input.sender_from_lines)),
        createdBy: input.created_by || null,
        signaturechannel: {
          create: uniqueStrings(input.channel_ids).map((channelId) => ({ id: crypto.randomUUID(), channelId })),
        },
      },
      include: {
        signaturechannel: true,
      },
    });
    return this.mapSignature(row);
  }

  async upsertOAuthAccount(input) {
    const provider = String(input.provider || "").toLowerCase();
    const email = String(input.email || "").toLowerCase();
    const updateData = {
      userId: input.user_id || null,
      accessToken: input.access_token,
      expiresAt: asDateOrNow(input.expires_at),
    };
    if (input.refresh_token !== undefined) {
      updateData.refreshToken = input.refresh_token || null;
    }

    console.log(`[DatabaseStore] Upserting OAuthAccount: ${provider}:${email}`);
    try {
      const row = await this.prisma.oAuthAccount.upsert({
        where: {
          provider_email: {
            provider,
            email,
          },
        },
        update: updateData,
        create: {
          id: crypto.randomUUID(),
          userId: input.user_id || null,
          provider,
          email,
          accessToken: input.access_token,
          refreshToken: input.refresh_token || null,
          expiresAt: asDateOrNow(input.expires_at),
          updatedAt: new Date(),
        },
      });
      console.log(`[DatabaseStore] Upserted OAuthAccount successfully: ${row.id}`);
      return this.mapOAuthAccount(row);
    } catch (dbError) {
      console.error(`[DatabaseStore] Upsert error:`, dbError);
      throw dbError;
    }
  }

  async getOAuthAccountById(accountId) {
    if (!accountId) return null;
    const row = await this.prisma.oAuthAccount.findUnique({
      where: { id: String(accountId) },
    });
    return this.mapOAuthAccount(row);
  }

  async getChannelSyncState(channelId) {
    const row = await this.prisma.channelSyncState.findUnique({
      where: { channelId: String(channelId) },
    });
    return this.mapChannelSyncState(row);
  }

  async upsertChannelSyncState(channelId, patch = {}) {
    const updateData = {};
    if (patch.provider !== undefined) updateData.provider = patch.provider;
    if (patch.sync_enabled !== undefined) updateData.syncEnabled = Boolean(patch.sync_enabled);
    if (patch.status !== undefined) updateData.status = patch.status;
    if (patch.cursor !== undefined) updateData.cursor = patch.cursor;
    if (patch.watch_expiration_at !== undefined) {
      updateData.watchExpirationAt = patch.watch_expiration_at ? new Date(patch.watch_expiration_at) : null;
    }
    if (patch.last_synced_at !== undefined) {
      updateData.lastSyncedAt = patch.last_synced_at ? new Date(patch.last_synced_at) : null;
    }
    if (patch.last_error !== undefined) updateData.lastError = patch.last_error;

    const row = await this.prisma.channelSyncState.upsert({
      where: { channelId: String(channelId) },
      update: updateData,
      create: {
        id: crypto.randomUUID(),
        channelId: String(channelId),
        provider: patch.provider || "gmail",
        syncEnabled: patch.sync_enabled !== undefined ? Boolean(patch.sync_enabled) : false,
        status: patch.status || "idle",
        cursor: patch.cursor || null,
        watchExpirationAt: patch.watch_expiration_at ? new Date(patch.watch_expiration_at) : null,
        lastSyncedAt: patch.last_synced_at ? new Date(patch.last_synced_at) : null,
        lastError: patch.last_error || null,
        updatedAt: new Date(),
      },
    });
    return this.mapChannelSyncState(row);
  }

  async logActivity(input) {
    const row = await this.prisma.activityLog.create({
      data: {
        id: crypto.randomUUID(),
        type: String(input.type || "event"),
        actorId: input.actor_id || null,
        entityType: input.entity_type || null,
        entityId: input.entity_id || null,
        metadata: JSON.stringify(input.metadata || {}),
      },
    });
    return this.mapActivityLog(row);
  }


  async listActivityLogs(input = {}) {
    const limit = Math.max(1, Math.min(500, Number(input.limit || 100)));
    const rows = await this.prisma.activityLog.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.map((row) => this.mapActivityLog(row));
  }

  async listThreads(filter = {}) {
    const where = {};
    // Removed scope-specific filtering to ensure inbox remains global as per user request

    const channelIds = Array.isArray(filter.channel_ids)
      ? filter.channel_ids.map((id) => String(id).trim()).filter(Boolean)
      : [];
    if (Array.isArray(filter.channel_ids) && channelIds.length === 0) {
      return [];
    }
    if (channelIds.length > 0) {
      where.channelId = { in: channelIds };
    }
    if (filter.channel_id) {
      where.channelId = String(filter.channel_id);
    }
    if (filter.assignment_filter === "assigned") {
      where.assignedTo = { not: null };
    }
    if (filter.assignment_filter === "unassigned") {
      where.assignedTo = null;
    }
    if (filter.search) {
      where.subject = {
        contains: String(filter.search),
      };
    }
    if (filter.tag) {
      where.tags = {
        contains: String(filter.tag),
      };
    }
    if (filter.assignee_id) {
      where.assignedTo = String(filter.assignee_id);
    }
    if (filter.status) {
      if (filter.status === "archived") {
        where.status = "closed";
      } else if (filter.status === "trash") {
        where.status = "trashed";
      } else {
        where.status = String(filter.status);
      }
    }

    let orderBy = { lastActivityAt: "desc" };
    if (filter.sort === "oldest") {
      orderBy = { lastActivityAt: "asc" };
    } else if (filter.sort === "newest") {
      orderBy = { lastActivityAt: "desc" };
    }

    try {
      console.log("[DatabaseStore] listThreads building query...");
      console.log("[DatabaseStore] listThreads where:", JSON.stringify(where, null, 2));
      const rows = await this.prisma.thread.findMany({
        where,
        orderBy,
        include: {
          channel: true,
          message: {
            orderBy: { receivedAt: "desc" },
            take: 1,
          }
        }
      });

      console.log(`[DatabaseStore] listThreads found ${rows.length} rows`);
      let mapped = rows.map((row) => this.mapThreadSummary(row));
      
      if (filter.search) {
        const query = String(filter.search).toLowerCase();
        mapped = mapped.filter((thread) => {
          const participantHit = thread.participants?.some((participant) => participant.toLowerCase().includes(query));
          const subjectHit = thread.subject.toLowerCase().includes(query);
          return participantHit || subjectHit;
        });
      }


    if (filter.sort === "newest_unreplied" || filter.sort === "oldest_unreplied") {
      mapped = mapped.filter(t => t.isUnreplied);
      if (filter.sort === "newest_unreplied") {
        mapped.sort((a, b) => new Date(b.lastActivityAt) - new Date(a.lastActivityAt));
      } else {
        mapped.sort((a, b) => new Date(a.lastActivityAt) - new Date(b.lastActivityAt));
      }
    } else if (filter.sort === "closest_to_goal") {
      mapped.sort((a, b) => {
        if (a.snoozedUntil && b.snoozedUntil) {
          return new Date(a.snoozedUntil) - new Date(b.snoozedUntil);
        }
        if (a.snoozedUntil) return -1;
        if (b.snoozedUntil) return 1;
        return new Date(b.lastActivityAt) - new Date(a.lastActivityAt);
      });
    }

    return mapped;
  } catch (err) {
    console.error("[DatabaseStore] CRITICAL ERROR in listThreads:", err);
    throw err;
  }
}

  async listMessages(threadId) {
    const rows = await this.prisma.message.findMany({
      where: { threadId: String(threadId) },
      orderBy: { receivedAt: "asc" },
    });
    return rows.map((row) => this.mapMessage(row));
  }

  async getThread(threadId) {
    return this.getHydratedThread(threadId);
  }

  async getHydratedThread(threadId) {
    const row = await this.prisma.thread.findUnique({
      where: { id: threadId },
      include: {
        message: {
          orderBy: { receivedAt: "asc" },
        },
        comment: {
          orderBy: { createdAt: "asc" },
        },
      },
    });
    if (!row) return null;

    return {
      ...this.mapThreadSummary(row),
      messages: row.message.map((message) => this.mapMessage(message)),
      comments: row.comment.map((comment) => this.mapComment(comment)),
    };
  }

  async findExistingSyncedMessage(channelId, providerMessageId) {
    if (!providerMessageId) return null;
    const row = await this.prisma.message.findFirst({
      where: {
        channelId: String(channelId),
        providerMessageId: String(providerMessageId),
      },
    });
    return row ? this.mapMessage(row) : null;
  }

  async ensureThreadForSyncedMessage(input) {
    const receivedAt = asDateOrNow(input.received_at);
    const normalizedSubject = (input.subject || "(no subject)").trim();
    const subjectKey = normalizedSubject.toLowerCase();
    const participants = uniqueStrings(input.participants);
    const threadKey = input.thread_key ? String(input.thread_key).trim() : null;
    const inReplyTo = input.inReplyTo ? String(input.inReplyTo).trim() : null;

    let threadRow = null;
    if (threadKey) {
      threadRow = await this.prisma.thread.findUnique({
        where: { externalThreadKey: threadKey },
      });
    }
    
    if (!threadRow && inReplyTo) {
      const parentMessage = await this.prisma.message.findFirst({
        where: { channelId: input.channel_id, providerMessageId: inReplyTo }
      });
      if (parentMessage) {
        threadRow = await this.prisma.thread.findUnique({
          where: { id: parentMessage.threadId }
        });
      }
    }

    if (!threadRow) {
      const defaultTags = [];
      const inboxChannels = await this.prisma.inboxchannel.findMany({
        where: { channelId: input.channel_id },
        include: { inbox: true }
      });
      const isIndividual = inboxChannels.some(ic => ic.inbox.scopeType === "individual");
      if (isIndividual) {
        defaultTags.push("Inbox");
      }
      
      // Phase 2: Resolve default inbox for the thread
      const defaultInbox = inboxChannels.length > 0 ? inboxChannels[0].inboxId : null;

      return this.prisma.thread.create({
        data: {
          id: crypto.randomUUID(),
          channelId: input.channel_id,
          inboxId: defaultInbox,
          externalThreadKey: threadKey,
          subject: normalizedSubject,
          subjectKey,
          participants: JSON.stringify(participants),
          status: "open",
          assignmentState: "unassigned",
          assignedTo: null,
          priority: "normal",
          tags: JSON.stringify(defaultTags),
          lastActivityAt: receivedAt,
          createdAt: receivedAt,
        },
      });
    }

    const mergedParticipants = uniqueStrings([...asArray(threadRow.participants), ...participants]);
    return this.prisma.thread.update({
      where: { id: threadRow.id },
      data: {
        subject: normalizedSubject,
        participants: JSON.stringify(mergedParticipants),
        lastActivityAt: receivedAt,
      },
    });
  }

  async upsertSyncedMessage(input) {
    const direction = input.direction === "outbound" ? "outbound" : "inbound";
    const existingMessage = await this.findExistingSyncedMessage(input.channel_id, input.provider_message_id);
    if (existingMessage) {
      return {
        thread: await this.getHydratedThread(existingMessage.thread_id),
        message: existingMessage,
        duplicate: true,
      };
    }

    const receivedAt = asDateOrNow(input.received_at);
    const threadRow = await this.ensureThreadForSyncedMessage(input);
    const messageRow = await this.prisma.message.create({
      data: {
        id: crypto.randomUUID(),
        threadId: threadRow.id,
        channelId: input.channel_id,
        providerMessageId: input.provider_message_id || null,
        fromEmail: input.from || "",
        toRecipients: JSON.stringify(uniqueStrings(input.to)),
        ccRecipients: JSON.stringify(uniqueStrings(input.cc)),
        bodyText: input.body_text || "",
        bodyHtml: input.body_html || "",
        attachments: JSON.stringify(asArray(input.attachments)),
        receivedAt,
        direction,
        createdBy: input.created_by || null,
        inReplyTo: input.inReplyTo || null,
        references: input.references || null,
      },
    });

    await this.prisma.thread.update({
      where: { id: threadRow.id },
      data: {
        lastActivityAt: receivedAt,
        status: "open",
      },
    });

    return {
      thread: await this.getHydratedThread(threadRow.id),
      message: this.mapMessage(messageRow),
      duplicate: false,
    };
  }

  async upsertInboundMessage(input) {
    return this.upsertSyncedMessage({
      ...input,
      direction: "inbound",
      created_by: null,
    });
  }

  async addOutboundMessage(input) {
    const existing = await this.prisma.thread.findUnique({ where: { id: input.thread_id } });
    if (!existing) return null;
    const now = new Date();

    const messageRow = await this.prisma.message.create({
      data: {
        id: crypto.randomUUID(),
        threadId: existing.id,
        channelId: existing.channelId,
        providerMessageId: input.provider_message_id || null,
        fromEmail: input.from || "",
        toRecipients: JSON.stringify(uniqueStrings(input.to)),
        ccRecipients: JSON.stringify(uniqueStrings(input.cc)),
        bodyText: input.body_text || "",
        bodyHtml: input.body_html || "",
        attachments: JSON.stringify(asArray(input.attachments)),
        receivedAt: now,
        direction: "outbound",
        createdBy: input.created_by || null,
      },
    });

    await this.prisma.thread.update({
      where: { id: existing.id },
      data: {
        lastActivityAt: now,
        status: "open",
      },
    });

    const thread = await this.getHydratedThread(existing.id);
    return {
      thread,
      message: this.mapMessage(messageRow),
    };
  }

  async updateThread(threadId, patch) {
    const current = await this.prisma.thread.findUnique({ where: { id: threadId } });
    if (!current) return null;

    const next = {
      status: patch.status || current.status,
      priority: patch.priority || current.priority,
      tags: Array.isArray(patch.tags) ? JSON.stringify(uniqueStrings(patch.tags)) : current.tags,
      snoozedUntil: patch.snoozed_until !== undefined ? (patch.snoozed_until ? new Date(patch.snoozed_until) : null) : current.snoozedUntil,
      inboxId: patch.inboxId !== undefined ? patch.inboxId : current.inboxId,
      lastActivityAt: new Date(),
      assignmentState:
        patch.status === "closed" ? "closed" : current.assignmentState,
    };

    await this.prisma.thread.update({
      where: { id: threadId },
      data: next,
    });

    return this.getHydratedThread(threadId);
  }

  async assignThread(input) {
    const current = await this.prisma.thread.findUnique({ where: { id: input.thread_id } });
    if (!current) return null;

    const assignedTo = input.assigned_to || null;
    const assignmentState = current.status === "closed" ? "closed" : assignedTo ? "assigned" : "unassigned";

    await this.prisma.thread.update({
      where: { id: input.thread_id },
      data: {
        assignedTo,
        assignmentState,
        lastActivityAt: new Date(),
      },
    });

    return this.getHydratedThread(input.thread_id);
  }

  async addComment(input) {
    const thread = await this.prisma.thread.findUnique({ where: { id: input.thread_id } });
    if (!thread) return null;

    const row = await this.prisma.comment.create({
      data: {
        id: crypto.randomUUID(),
        threadId: input.thread_id,
        authorId: input.author_id,
        body: input.body,
        visibility: "internal",
      },
    });
    return this.mapComment(row);
  }

  // --- User Settings ---

  async getNotificationSetting(userId) {
    return this.prisma.notificationsetting.findUnique({ where: { userId } });
  }

  async upsertNotificationSetting(userId, input) {
    return this.prisma.notificationsetting.upsert({
      where: { userId },
      update: {
        desktop: input.desktop,
        mobile: input.mobile,
        email: input.email,
      },
      create: {
        id: crypto.randomUUID(),
        userId,
        desktop: input.desktop || "smart",
        mobile: input.mobile || "smart",
        email: input.email || "smart",
      },
    });
  }

  async listNotificationRules(userId) {
    return this.prisma.notificationrule.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    });
  }

  async createNotificationRule(input) {
    return this.prisma.notificationrule.create({
      data: {
        id: crypto.randomUUID(),
        userId: input.userId,
        trigger: input.trigger,
        inboxId: input.inboxId || null,
        action: input.action,
        isActive: true,
      },
    });
  }

  async deleteNotificationRule(ruleId) {
    await this.prisma.notificationrule.delete({ where: { id: ruleId } });
  }

  async listSnoozes(userId) {
    return this.prisma.snooze.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    });
  }

  async createSnooze(input) {
    return this.prisma.snooze.create({
      data: {
        id: crypto.randomUUID(),
        userId: input.userId,
        name: input.name,
        type: input.type,
        day: input.day || null,
        time: input.time || null,
        duration: input.duration || null,
      },
    });
  }

  async deleteSnooze(snoozeId) {
    await this.prisma.snooze.delete({ where: { id: snoozeId } });
  }

  // --- Teammate Groups ---

  async listTeammateGroups(orgId) {
    return this.prisma.teammategroup.findMany({
      where: { organizationId: orgId },
      include: {
        members: true
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async createTeammateGroup(input) {
    return this.prisma.teammategroup.create({
      data: {
        id: crypto.randomUUID(),
        organizationId: input.organizationId,
        name: input.name,
        description: input.description || null,
        workspaceAccess: input.workspaceAccess || "[]",
        contactsAccessEnabled: input.contactsAccessEnabled || false,
        canEditGroup: input.canEditGroup || "[]",
        canDeleteGroup: input.canDeleteGroup || "[]",
        members: {
          create: (input.members || []).map((userId) => ({
            id: crypto.randomUUID(),
            userId: userId,
          })),
        },
      },
      include: {
        members: {
          include: {
            user: true
          }
        }
      }
    });
  }

  async getTeammateGroup(groupId) {
    return this.prisma.teammategroup.findUnique({
      where: { id: groupId },
      include: {
        members: {
          include: {
            user: true
          }
        }
      }
    });
  }

  async updateTeammateGroup(groupId, input) {
    // Handling members update is tricky with Prisma; we'll do it by deleting and re-creating for simplicity in MVP
    if (input.members) {
      await this.prisma.teammategroupmember.deleteMany({
        where: { groupId }
      });
      
      await this.prisma.teammategroupmember.createMany({
        data: (input.members || []).map((userId) => ({
          id: crypto.randomUUID(),
          groupId: groupId,
          userId: userId,
        }))
      });
    }

    return this.prisma.teammategroup.update({
      where: { id: groupId },
      data: {
        name: input.name,
        description: input.description,
        workspaceAccess: input.workspaceAccess,
        contactsAccessEnabled: input.contactsAccessEnabled,
        canEditGroup: input.canEditGroup,
        canDeleteGroup: input.canDeleteGroup,
      },
      include: {
        members: {
          include: {
            user: true
          }
        }
      }
    });
  }

  async deleteTeammateGroup(groupId) {
    return this.prisma.teammategroup.delete({
      where: { id: groupId }
    });
  }

  async getTeammateGroupSettings(orgId) {
    const settings = await this.prisma.teammategroupsettings.findUnique({
      where: { organizationId: orgId }
    });
    return settings || {
      organizationId: orgId,
      canCreate: "[]",
      canEdit: "[]",
      canDelete: "[]"
    };
  }

  async updateTeammateGroupSettings(orgId, input) {
    return this.prisma.teammategroupsettings.upsert({
      where: { organizationId: orgId },
      update: {
        canCreate: input.canCreate,
        canEdit: input.canEdit,
        canDelete: input.canDelete,
      },
      create: {
        id: crypto.randomUUID(),
        organizationId: orgId,
        canCreate: input.canCreate || "[]",
        canEdit: input.canEdit || "[]",
        canDelete: input.canDelete || "[]",
      }
    });
  }

  // --- Ticket Statuses ---

  async listTicketStatuses(orgId) {
    return this.prisma.ticketstatus.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "asc" },
    });
  }

  async createTicketStatus(input) {
    return this.prisma.ticketstatus.create({
      data: {
        id: crypto.randomUUID(),
        organizationId: input.organizationId,
        category: input.category,
        name: input.name,
        description: input.description || null,
        customerLabel: input.customerLabel || null,
        isDefault: input.isDefault || false,
        isReopen: input.isReopen || false,
      },
    });
  }

  async deleteTicketStatus(statusId) {
    return this.prisma.ticketstatus.delete({
      where: { id: statusId }
    });
  }

  // --- Ticket Status Groups ---

  async listTicketStatusGroups(orgId) {
    return this.prisma.ticketstatusgroup.findMany({
      where: { organizationId: orgId },
      include: {
        statuses: {
          include: {
            status: true
          }
        },
        inboxes: true
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async getTicketStatusGroup(groupId) {
    return this.prisma.ticketstatusgroup.findUnique({
      where: { id: groupId },
      include: {
        statuses: {
          include: {
            status: true
          }
        },
        inboxes: true
      }
    });
  }

  async createTicketStatusGroup(input) {
    const result = await this.prisma.ticketstatusgroup.create({
      data: {
        id: crypto.randomUUID(),
        organizationId: input.organizationId,
        name: input.name,
        statuses: {
          create: (input.statusIds || []).map((statusId) => ({
            id: crypto.randomUUID(),
            statusId: statusId,
          })),
        },
        inboxes: {
          create: (input.inboxIds || []).map((inboxId) => ({
            id: crypto.randomUUID(),
            inboxId: inboxId,
          })),
        }
      },
      include: {
        statuses: {
          include: {
            status: true
          }
        },
        inboxes: true
      }
    });

    if (input.inboxIds && input.inboxIds.length > 0) {
      await this.prisma.inbox.updateMany({
        where: { id: { in: input.inboxIds } },
        data: { ticketStatusesEnabled: true }
      });
    }

    return result;
  }

  async updateTicketStatusGroup(groupId, input) {
    if (input.statusIds) {
      await this.prisma.ticketstatusgroupstatus.deleteMany({ where: { groupId } });
      await this.prisma.ticketstatusgroupstatus.createMany({
        data: input.statusIds.map(statusId => ({
          id: crypto.randomUUID(),
          groupId,
          statusId
        }))
      });
    }

    if (input.inboxIds) {
      await this.prisma.ticketstatusgroupinbox.deleteMany({ where: { groupId } });
      await this.prisma.ticketstatusgroupinbox.createMany({
        data: input.inboxIds.map(inboxId => ({
          id: crypto.randomUUID(),
          groupId,
          inboxId
        }))
      });
    }

    const result = await this.prisma.ticketstatusgroup.update({
      where: { id: groupId },
      data: {
        name: input.name,
      },
      include: {
        statuses: {
          include: {
            status: true
          }
        },
        inboxes: true
      }
    });

    if (input.inboxIds && input.inboxIds.length > 0) {
      await this.prisma.inbox.updateMany({
        where: { id: { in: input.inboxIds } },
        data: { ticketStatusesEnabled: true }
      });
    }

    return result;
  }

  async deleteTicketStatusGroup(groupId) {
    return this.prisma.ticketstatusgroup.delete({
      where: { id: groupId }
    });
  }

  // --- Tags ---
  async listTags(orgId, scopeType, scopeId) {
    const where = {};
    if (orgId && orgId !== 'global') {
      where.organizationId = orgId;
    }
    // Note: scopeType/scopeId filtering removed to allow global tags in the inbox
    // Note: when scopeType is 'all', no filter is applied — all tags are returned
    return this.prisma.tag.findMany({
      where,
      include: {
        inboxes: true,
        parent: true
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async createTag(input) {
    return this.prisma.tag.create({
      data: {
        id: crypto.randomUUID(),
        organizationId: input.organizationId,
        name: input.name,
        description: input.description || null,
        color: input.color || null,
        emoji: input.emoji || null,
        parentId: input.parentId || null,
        showInList: input.showInList !== undefined ? input.showInList : true,
        scopeType: input.scopeType || "company",
        scopeId: input.scopeId || "global",
        inboxes: {
          create: (input.inboxIds || []).map(inboxId => ({
            id: crypto.randomUUID(),
            inboxId
          }))
        }
      },
      include: {
        inboxes: true,
        parent: true
      }
    });
  }

  async updateTag(tagId, input) {
    if (input.inboxIds) {
      await this.prisma.taginbox.deleteMany({ where: { tagId } });
      await this.prisma.taginbox.createMany({
        data: input.inboxIds.map(inboxId => ({
          id: crypto.randomUUID(),
          tagId,
          inboxId
        }))
      });
    }

    return this.prisma.tag.update({
      where: { id: tagId },
      data: {
        name: input.name,
        description: input.description,
        color: input.color,
        emoji: input.emoji,
        parentId: input.parentId,
        showInList: input.showInList,
        isArchived: input.isArchived
      },
      include: {
        inboxes: true,
        parent: true
      }
    });
  }

  async deleteTag(tagId) {
    return this.prisma.tag.delete({
      where: { id: tagId }
    });
  }

  async bulkUpdateTags(tagIds, patch) {
    return this.prisma.tag.updateMany({
      where: { id: { in: tagIds } },
      data: patch
    });
  }

  // --- User Preferences ---

  async getUserPreferences(userId) {
    const row = await this.prisma.userpreference.findUnique({
      where: { userId: String(userId) }
    });
    if (!row) return null;
    try {
      return JSON.parse(row.settings);
    } catch {
      return {};
    }
  }

  async upsertUserPreferences(userId, settings) {
    const row = await this.prisma.userpreference.upsert({
      where: { userId: String(userId) },
      update: {
        settings: JSON.stringify(settings),
        updatedAt: new Date()
      },
      create: {
        id: crypto.randomUUID(),
        userId: String(userId),
        settings: JSON.stringify(settings),
        updatedAt: new Date()
      }
    });
    try {
      return JSON.parse(row.settings);
    } catch {
      return {};
    }
  }

  async listCustomFields() {
    return this.prisma.customField.findMany({
      orderBy: { createdAt: "desc" },
    });
  }

  async createCustomField({ organizationId, name, description, type, model }) {
    return this.prisma.customField.upsert({
      where: {
        organizationId_model_name: {
          organizationId,
          model,
          name,
        }
      },
      update: {
        description: description || "",
        type,
      },
      create: {
        id: `cf-${crypto.randomBytes(4).toString("hex")}`,
        organizationId,
        name,
        description: description || "",
        type,
        model,
      },
    });
  }

  async deleteCustomField(id) {
    return this.prisma.customField.deleteMany({
      where: { id },
    });
  }

  async listWorkspaces() {
    const organizations = await this.prisma.authorganization.findMany({
      orderBy: { createdAt: "desc" },
    });

    const results = [];
    for (const org of organizations) {
      const inboxes = await this.prisma.inbox.findMany({
        where: {
          scopeType: "organization",
          scopeId: org.id,
        },
        select: {
          id: true,
          name: true,
        },
      });

      results.push({
        id: org.id,
        name: org.name,
        slug: org.slug,
        color: "#6366f1", 
        inboxes: inboxes,
        createdAt: org.createdAt,
      });
    }

    const customWorkspaces = await this.prisma.workspace.findMany({
      include: { inboxes: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });

    return [...results, ...customWorkspaces];
  }

  async getWorkspace(id) {
    if (id.startsWith("org-")) {
      const org = await this.prisma.authorganization.findUnique({
        where: { id },
      });
      if (!org) return null;
      return {
        id: org.id,
        name: org.name,
        color: "#6366f1",
      };
    } else {
      const ws = await this.prisma.workspace.findUnique({
        where: { id },
      });
      if (!ws) return null;
      return {
        id: ws.id,
        name: ws.name,
        color: ws.color || "#6366f1",
      };
    }
  }

  async updateWorkspace(id, { name, color }) {
    if (id.startsWith("org-")) {
      await this.prisma.authorganization.update({
        where: { id },
        data: { name },
      });
      return this.getWorkspace(id);
    } else {
      const ws = await this.prisma.workspace.update({
        where: { id },
        data: { name, color },
      });
      return {
        id: ws.id,
        name: ws.name,
        color: ws.color || "#6366f1",
      };
    }
  }

  async deleteWorkspace(id) {
    if (id.startsWith("org-")) {
      // Find how many orgs there are to prevent deleting the very last one
      const count = await this.prisma.authorganization.count();
      if (count <= 1) {
        throw new Error("Cannot delete the last remaining organization workspace.");
      }
      
      // We can safely delete this organization workspace
      await this.prisma.authorganization.delete({
        where: { id },
      });
      return true;
    }
    await this.prisma.workspace.delete({
      where: { id },
    });
    return true;
  }

  async createWorkspace({ name, color }) {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const randomSuffix = crypto.randomBytes(3).toString("hex");
    
    return this.prisma.authorganization.create({
      data: {
        id: `org-${crypto.randomBytes(8).toString("hex")}`,
        name,
        slug: `${slug}-${randomSuffix}`,
        createdAt: new Date(),
      },
    });
  }

  // --- Views ---

  _mapView(row) {
    if (!row) return null;
    return {
      id: row.id,
      organizationId: row.organizationId,
      name: row.name,
      color: row.color || null,
      emoji: row.emoji || null,
      inboxIds: JSON.parse(row.inboxIds || "[]"),
      includeTags: JSON.parse(row.includeTags || "[]"),
      excludeTags: JSON.parse(row.excludeTags || "[]"),
      assigneeIds: JSON.parse(row.assigneeIds || "[]"),
      teammateIds: JSON.parse(row.teammateIds || "[]"),
      createdBy: row.createdBy || null,
      createdAt: toIso(row.createdAt),
      updatedAt: toIso(row.updatedAt),
    };
  }

  async listViews(orgId) {
    const rows = await this.prisma.view.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "asc" },
    });
    return rows.map((r) => this._mapView(r));
  }

  async getView(id) {
    const row = await this.prisma.view.findUnique({ where: { id } });
    return this._mapView(row);
  }

  async createView({ organizationId, name, color, emoji, inboxIds, includeTags, excludeTags, assigneeIds, teammateIds, createdBy }) {
    const row = await this.prisma.view.create({
      data: {
        id: crypto.randomUUID(),
        organizationId,
        name,
        color: color || null,
        emoji: emoji || null,
        inboxIds: JSON.stringify(inboxIds || []),
        includeTags: JSON.stringify(includeTags || []),
        excludeTags: JSON.stringify(excludeTags || []),
        assigneeIds: JSON.stringify(assigneeIds || []),
        teammateIds: JSON.stringify(teammateIds || []),
        createdBy: createdBy || null,
        updatedAt: new Date(),
      },
    });
    return this._mapView(row);
  }

  async updateView(id, { name, color, emoji, inboxIds, includeTags, excludeTags, assigneeIds, teammateIds }) {
    const data = { updatedAt: new Date() };
    if (name !== undefined) data.name = name;
    if (color !== undefined) data.color = color;
    if (emoji !== undefined) data.emoji = emoji;
    if (inboxIds !== undefined) data.inboxIds = JSON.stringify(inboxIds);
    if (includeTags !== undefined) data.includeTags = JSON.stringify(includeTags);
    if (excludeTags !== undefined) data.excludeTags = JSON.stringify(excludeTags);
    if (assigneeIds !== undefined) data.assigneeIds = JSON.stringify(assigneeIds);
    if (teammateIds !== undefined) data.teammateIds = JSON.stringify(teammateIds);
    const row = await this.prisma.view.update({ where: { id }, data });
    return this._mapView(row);
  }

  async deleteView(id) {
    await this.prisma.view.delete({ where: { id } });
  }

  _mapEvent(row) {
    if (!row) return null;
    return {
      id: row.id,
      organizationId: row.organizationId,
      threadId: row.threadId,
      title: row.title,
      description: row.description,
      startTime: toIso(row.startTime),
      endTime: toIso(row.endTime),
      createdBy: row.createdBy,
      provider: row.provider,
      externalEventId: row.externalEventId,
      meetingLink: row.meetingLink,
      status: row.status,
      createdAt: toIso(row.createdAt),
      updatedAt: toIso(row.updatedAt),
      attendees: (row.eventattendee || []).map((a) => ({
        id: a.id,
        email: a.email,
        status: a.status,
      })),
    };
  }

  async listEvents({ organizationId, threadId, startDate, endDate }) {
    const where = { organizationId };
    if (threadId) where.threadId = threadId;
    if (startDate || endDate) {
      where.startTime = {};
      if (startDate) where.startTime.gte = startDate;
      if (endDate) where.startTime.lte = endDate;
    }

    const rows = await this.prisma.event.findMany({
      where,
      include: { eventattendee: true },
      orderBy: { startTime: "asc" },
    });
    return rows.map((row) => this._mapEvent(row));
  }

  async getEvent(id) {
    const row = await this.prisma.event.findUnique({
      where: { id },
      include: { eventattendee: true },
    });
    return this._mapEvent(row);
  }

  async createEvent(data) {
    const row = await this.prisma.event.create({
      data: {
        id: crypto.randomUUID(),
        organizationId: data.organizationId,
        threadId: data.threadId || null,
        title: data.title,
        description: data.description || null,
        startTime: data.startTime,
        endTime: data.endTime,
        createdBy: data.createdBy,
        provider: data.provider || "google",
        externalEventId: data.externalEventId || null,
        meetingLink: data.meetingLink || null,
        status: data.status || "confirmed",
        updatedAt: new Date(),
        eventattendee: {
          create: (data.attendees || []).map((email) => ({
            id: crypto.randomUUID(),
            email,
          })),
        },
      },
      include: { eventattendee: true },
    });
    return this._mapEvent(row);
  }

  async updateEvent(id, data) {
    await this.prisma.eventattendee.deleteMany({ where: { eventId: id } });
    const row = await this.prisma.event.update({
      where: { id },
      data: {
        threadId: data.threadId || null,
        title: data.title,
        description: data.description || null,
        startTime: data.startTime,
        endTime: data.endTime,
        provider: data.provider || "google",
        externalEventId: data.externalEventId || null,
        meetingLink: data.meetingLink || null,
        updatedAt: new Date(),
        eventattendee: {
          create: (data.attendees || []).map((email) => ({
            id: crypto.randomUUID(),
            email,
          })),
        },
      },
      include: { eventattendee: true },
    });
    return this._mapEvent(row);
  }

  async deleteEvent(id) {
    try {
      await this.prisma.event.delete({ where: { id } });
    } catch (error) {
      if (error.code === 'P2025') {
        // Record already deleted or does not exist
        return;
      }
      throw error;
    }
  }

  _mapContact(row) {
    if (!row) return null;
    const initials = row.name
      ? row.name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2)
      : "??";
    
    const email = row.email && row.email.startsWith("no-email-") && row.email.endsWith("@patterns.local")
      ? null
      : row.email;

    return {
      id: row.id,
      name: row.name,
      email,
      phone: row.phone || "--",
      x: row.x || "--",
      description: row.description || "--",
      access: row.access,
      account: row.contactaccount?.name || null,
      initials,
      createdBy: row.createdBy,
      organizationId: row.organizationId,
      listId: row.contactlistmember?.[0]?.contactListId || null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async listContacts({ organizationId, access, query, userId, listId, accountId }) {
    const andConditions = [{ organizationId }];

    if (access) {
      if (access === "Private") {
        andConditions.push({ access: "Private" });
        if (userId) {
          andConditions.push({ createdBy: userId });
        }
      } else {
        andConditions.push({ access });
      }
    } else {
      if (userId) {
        andConditions.push({
          OR: [
            { access: { not: "Private" } },
            { access: "Private", createdBy: userId },
          ]
        });
      } else {
        andConditions.push({ access: { not: "Private" } });
      }
    }

    if (listId) {
      andConditions.push({
        contactlistmember: {
          some: {
            contactListId: listId
          }
        }
      });
    }

    if (accountId) {
      andConditions.push({ accountId });
    }

    if (query) {
      const search = query.trim().toLowerCase();
      andConditions.push({
        OR: [
          { name: { contains: search } },
          { email: { contains: search } },
          { phone: { contains: search } },
          { description: { contains: search } },
        ]
      });
    }

    const where = { AND: andConditions };

    const rows = await this.prisma.contact.findMany({
      where,
      include: {
        contactaccount: true,
        contactlistmember: true,
      },
      orderBy: { name: "asc" },
    });
    return rows.map((row) => this._mapContact(row));
  }

  async getContact(id) {
    const row = await this.prisma.contact.findUnique({
      where: { id },
      include: {
        contactaccount: true,
        contactlistmember: true,
      },
    });
    return this._mapContact(row);
  }

  async createContact(data) {
    let accountId = data.accountId || null;
    if (data.accountName && !accountId) {
      const accountDomain = data.accountDomain || data.accountName.toLowerCase().replace(/[^a-z0-9]+/g, "") + ".com";
      const existingAccount = await this.prisma.contactaccount.findFirst({
        where: { name: data.accountName, organizationId: data.organizationId },
      });
      if (existingAccount) {
        accountId = existingAccount.id;
      } else {
        const newAccount = await this.prisma.contactaccount.create({
          data: {
            id: crypto.randomUUID(),
            organizationId: data.organizationId,
            name: data.accountName,
            domain: accountDomain,
          },
        });
        accountId = newAccount.id;
      }
    }

    let email = data.email;
    if (!email) {
      email = `no-email-${crypto.randomUUID()}@patterns.local`;
    }

    const row = await this.prisma.contact.create({
      data: {
        id: crypto.randomUUID(),
        organizationId: data.organizationId,
        name: data.name,
        email,
        phone: data.phone || null,
        x: data.x || null,
        description: data.description || null,
        access: data.access || "Shared",
        accountId,
        createdBy: data.createdBy || "u-admin-1",
        ...(data.listId && data.listId !== "none" ? {
          contactlistmember: {
            create: {
              id: crypto.randomUUID(),
              contactListId: data.listId,
            }
          }
        } : {}),
      },
      include: { contactaccount: true },
    });
    return this._mapContact(row);
  }

  async updateContact(id, data) {
    let accountId = data.accountId;
    if (data.accountName && !accountId) {
      const accountDomain = data.accountDomain || data.accountName.toLowerCase().replace(/[^a-z0-9]+/g, "") + ".com";
      const existingAccount = await this.prisma.contactaccount.findFirst({
        where: { name: data.accountName, organizationId: data.organizationId },
      });
      if (existingAccount) {
        accountId = existingAccount.id;
      } else {
        const newAccount = await this.prisma.contactaccount.create({
          data: {
            id: crypto.randomUUID(),
            organizationId: data.organizationId,
            name: data.accountName,
            domain: accountDomain,
          },
        });
        accountId = newAccount.id;
      }
    }

    let email = data.email;
    if (email === null || email === "") {
      const existing = await this.prisma.contact.findUnique({ where: { id } });
      if (existing && existing.email.startsWith("no-email-") && existing.email.endsWith("@patterns.local")) {
        email = existing.email;
      } else {
        email = `no-email-${crypto.randomUUID()}@patterns.local`;
      }
    }

    if (data.listId !== undefined) {
      await this.prisma.contactlistmember.deleteMany({
        where: { contactId: id }
      });
      if (data.listId && data.listId !== "none") {
        await this.prisma.contactlistmember.create({
          data: {
            id: crypto.randomUUID(),
            contactId: id,
            contactListId: data.listId,
          }
        });
      }
    }

    const updateData = {
      name: data.name,
      email,
      phone: data.phone !== undefined ? data.phone : undefined,
      x: data.x !== undefined ? data.x : undefined,
      description: data.description !== undefined ? data.description : undefined,
      access: data.access,
      accountId: accountId !== undefined ? accountId : undefined,
    };

    const row = await this.prisma.contact.update({
      where: { id },
      data: updateData,
      include: {
        contactaccount: true,
        contactlistmember: true,
      },
    });
    return this._mapContact(row);
  }

  async deleteContact(id) {
    await this.prisma.contact.delete({ where: { id } });
  }

  async listContactLists(organizationId, userId) {
    const lists = await this.prisma.contactlist.findMany({
      where: { 
        organizationId,
        OR: [
          { visibility: "Shared" },
          { visibility: "Private", ownerId: userId }
        ]
      },
      include: {
        contactlistmember: {
          include: { contact: true }
        }
      },
      orderBy: { name: "asc" }
    });

    return lists.map(list => ({
      id: list.id,
      name: list.name,
      visibility: list.visibility,
      contacts: list.contactlistmember.length,
      owner: list.visibility === "Private" ? "You" : "Workspace",
    }));
  }

  async listContactAccounts(organizationId) {
    const accounts = await this.prisma.contactaccount.findMany({
      where: { organizationId },
      include: {
        contact: true
      },
      orderBy: { name: "asc" }
    });

    return accounts.map(account => ({
      id: account.id,
      name: account.name,
      domain: account.domain,
      contacts: account.contact.length,
      description: account.description || "--"
    }));
  }

  async createContactList(data) {
    const row = await this.prisma.contactlist.create({
      data: {
        id: crypto.randomUUID(),
        organizationId: data.organizationId,
        name: data.name,
        visibility: data.visibility || "Shared",
        ownerId: data.ownerId || "u-admin-1",
      }
    });
    return {
      id: row.id,
      name: row.name,
      visibility: row.visibility,
      contacts: 0,
      owner: row.visibility === "Private" ? "You" : "Workspace",
    };
  }

  async deleteContactList(id) {
    await this.prisma.contactlist.delete({ where: { id } });
  }

  async createContactAccount(data) {
    const row = await this.prisma.contactaccount.create({
      data: {
        id: crypto.randomUUID(),
        organizationId: data.organizationId,
        name: data.name,
        domain: data.domain || data.name.toLowerCase().replace(/[^a-z0-9]+/g, "") + ".com",
        description: data.description || null,
      }
    });
    return {
      id: row.id,
      name: row.name,
      domain: row.domain,
      contacts: 0,
      description: row.description || "--",
    };
  }

  async deleteContactAccount(id) {
    await this.prisma.contactaccount.delete({ where: { id } });
  }

  async updateContactAccount(id, data) {
    const row = await this.prisma.contactaccount.update({
      where: { id },
      data: {
        name: data.name,
        domain: data.domain,
        description: data.description,
      }
    });
    return {
      id: row.id,
      name: row.name,
      domain: row.domain,
      description: row.description || "--",
    };
  }
}

module.exports = { DatabaseStore };
