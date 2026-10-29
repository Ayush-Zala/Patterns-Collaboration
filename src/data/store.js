const { v4: uuidv4 } = require("uuid");

class InMemoryStore {
  constructor() {
    this.channels = new Map();
    this.channelsByEmail = new Map();
    this.channelSyncState = new Map();
    this.inboxes = new Map();
    this.inboxChannels = new Map();
    this.templateFolders = new Map();
    this.messageTemplates = new Map();
    this.delegations = new Map();
    this.signatures = new Map();
    this.users = new Map();
    this.threads = new Map();
    this.threadKeyToId = new Map();
    this.messages = new Map();
    this.comments = new Map();
    this.oauthAccounts = new Map();
    this.activity = [];
    this.notificationSettings = new Map();
    this.notificationRules = new Map();
    this.snoozes = new Map();
    this.teammateGroups = new Map();
    this.teammateGroupMembers = new Map();
    this.teammateGroupSettings = new Map();

    this.seed();
  }

  seed() {
    const seededUsers = [
      { id: "u-sales-1", name: "Sales Agent", email: "agent@company.com", role: "sales_agent" },
      { id: "u-lead-1", name: "Team Lead", email: "lead@company.com", role: "team_lead" },
      { id: "u-admin-1", name: "Admin", email: "admin@company.com", role: "admin" },
    ];

    for (const user of seededUsers) {
      this.users.set(user.id, user);
    }

    const salesChannel = this.createChannel({
      name: "Sales Inbox",
      email_address: "sales@company.com",
      provider: "gmail",
    });
    const supportChannel = this.createChannel({
      name: "Support Inbox",
      email_address: "support@company.com",
      provider: "outlook",
    });

    const salesInbox = this.createInbox({
      name: "Sales Inquiries",
      description: "Inbound leads and pricing conversations.",
      created_by: "u-admin-1",
    });
    const supportInbox = this.createInbox({
      name: "Customer Support",
      description: "Customer support requests and issue resolution.",
      created_by: "u-admin-1",
    });

    const generalFolder = this.createTemplateFolder({ name: "General" });
    const salesFolder = this.createTemplateFolder({ name: "Sales" });
    this.createMessageTemplate({
      name: "Welcome Reply",
      subject: "Thanks for reaching out",
      folder_id: generalFolder.id,
      created_by: "u-admin-1",
    });
    this.createMessageTemplate({
      name: "Pricing Follow-up",
      subject: "Sharing pricing details",
      folder_id: salesFolder.id,
      created_by: "u-admin-1",
    });

    this.createSignature({
      name: "Default Team Signature",
      display_name: "Admin",
      sender_from_lines: [
        `Admin <${salesChannel.email_address}>`,
        `Admin <${supportChannel.email_address}>`,
      ],
      channel_ids: [salesChannel.id, supportChannel.id],
      created_by: "u-admin-1",
    });

    this.connectInboxChannel({
      inbox_id: salesInbox.id,
      channel_id: salesChannel.id,
      created_by: "u-admin-1",
    });
    this.connectInboxChannel({
      inbox_id: supportInbox.id,
      channel_id: supportChannel.id,
      created_by: "u-admin-1",
    });
  }

  getUser(userId) {
    return this.users.get(userId) || null;
  }

  listChannels() {
    return [...this.channels.values()];
  }

  getChannel(channelId) {
    return this.channels.get(channelId) || null;
  }

  getChannelByEmail(email) {
    if (!email) return null;
    return this.channelsByEmail.get(String(email).toLowerCase()) || null;
  }

  createChannel(input) {
    const channel = {
      id: uuidv4(),
      name: input.name,
      email_address: String(input.email_address).toLowerCase(),
      provider: input.provider || "gmail",
      oauth_account_id: input.oauth_account_id || null,
      is_active: true,
      created_at: new Date().toISOString(),
    };
    this.channels.set(channel.id, channel);
    this.channelsByEmail.set(channel.email_address, channel);

    this.upsertChannelSyncState(channel.id, {
      provider: channel.provider,
      sync_enabled: false,
      status: "idle",
    });

    return channel;
  }

  updateChannelOAuthAccount(input) {
    const channel = this.channels.get(input.channel_id);
    if (!channel) return null;
    const next = {
      ...channel,
      oauth_account_id: input.oauth_account_id || null,
      is_active: input.is_active !== undefined ? Boolean(input.is_active) : channel.is_active,
    };
    this.channels.set(next.id, next);
    this.channelsByEmail.set(next.email_address, next);
    return next;
  }

  getOAuthAccountById(accountId) {
    if (!accountId) return null;
    for (const account of this.oauthAccounts.values()) {
      if (account.id === accountId) {
        return account;
      }
    }
    return null;
  }

  listInboxes() {
    return [...this.inboxes.values()].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  async listWorkspaces() {
    return this.databaseStore.listWorkspaces();
  }

  async getWorkspace(id) {
    if (typeof this.databaseStore.getWorkspace === "function") {
      return this.databaseStore.getWorkspace(id);
    }
    return null;
  }

  async updateWorkspace(id, data) {
    if (typeof this.databaseStore.updateWorkspace === "function") {
      return this.databaseStore.updateWorkspace(id, data);
    }
    return null;
  }

  async deleteWorkspace(id) {
    if (typeof this.databaseStore.deleteWorkspace === "function") {
      return this.databaseStore.deleteWorkspace(id);
    }
    return null;
  }

  getInbox(inboxId) {
    return this.inboxes.get(inboxId) || null;
  }

  createInbox(input) {
    const inbox = {
      id: uuidv4(),
      name: input.name,
      description: input.description || "",
      custom_fields: input.custom_fields || {},
      created_by: input.created_by || null,
      created_at: new Date().toISOString(),
    };
    this.inboxes.set(inbox.id, inbox);
    return inbox;
  }

  bulkUpdateInboxCustomFields(updates) {
    const items = Array.isArray(updates) ? updates : [];
    let updated = 0;

    for (const update of items) {
      const inboxId = String(update?.inbox_id || update?.id || "").trim();
      if (!inboxId) continue;
      const existing = this.inboxes.get(inboxId);
      if (!existing) continue;

      this.inboxes.set(inboxId, {
        ...existing,
        custom_fields: update.custom_fields || {},
      });
      updated += 1;
    }

    return { updated };
  }

  deleteInbox(inboxId) {
    const inbox = this.inboxes.get(inboxId);
    if (!inbox) return null;

    this.inboxes.delete(inboxId);

    for (const key of this.inboxChannels.keys()) {
      if (key.startsWith(`${inboxId}:`)) {
        this.inboxChannels.delete(key);
      }
    }

    for (const [delegationId, delegation] of this.delegations.entries()) {
      if (!Array.isArray(delegation.inbox_ids)) continue;
      const nextInboxIds = delegation.inbox_ids.filter((id) => id !== inboxId);
      this.delegations.set(delegationId, {
        ...delegation,
        inbox_ids: nextInboxIds,
      });
    }

    return inbox;
  }

  listInboxChannels(inboxId) {
    const links = [...this.inboxChannels.values()].filter((link) => link.inbox_id === inboxId);
    return links
      .map((link) => this.channels.get(link.channel_id))
      .filter(Boolean)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  getInboxIdByChannelId(channelId) {
    if (!channelId) return null;
    const link = [...this.inboxChannels.values()].find((l) => l.channel_id === channelId);
    return link ? link.inbox_id : null;
  }


  connectInboxChannel(input) {
    const key = `${input.inbox_id}:${input.channel_id}`;
    const existing = this.inboxChannels.get(key);
    if (existing) return existing;

    const link = {
      id: uuidv4(),
      inbox_id: input.inbox_id,
      channel_id: input.channel_id,
      created_by: input.created_by || null,
      created_at: new Date().toISOString(),
    };
    this.inboxChannels.set(key, link);
    return link;
  }

  listTemplateFolders() {
    return [...this.templateFolders.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  createTemplateFolder(input) {
    const folder = {
      id: uuidv4(),
      name: input.name,
      created_at: new Date().toISOString(),
    };
    this.templateFolders.set(folder.id, folder);
    return folder;
  }

  getTemplateFolder(folderId) {
    return this.templateFolders.get(folderId) || null;
  }

  listMessageTemplates() {
    return [...this.messageTemplates.values()].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  createMessageTemplate(input) {
    const template = {
      id: uuidv4(),
      name: input.name,
      subject: input.subject,
      folder_id: input.folder_id,
      created_by: input.created_by || null,
      created_at: new Date().toISOString(),
    };
    this.messageTemplates.set(template.id, template);
    return template;
  }

  listDelegations() {
    return [...this.delegations.values()].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  createDelegation(input) {
    const delegation = {
      id: uuidv4(),
      name: input.name,
      permission_scope: input.permission_scope,
      inbox_ids: input.inbox_ids || [],
      delegate_emails: input.delegate_emails || [],
      created_by: input.created_by || null,
      created_at: new Date().toISOString(),
    };
    this.delegations.set(delegation.id, delegation);
    return delegation;
  }

  deleteDelegation(delegationId) {
    const delegation = this.delegations.get(delegationId) || null;
    if (!delegation) return null;
    this.delegations.delete(delegationId);
    return delegation;
  }

  listSignatures() {
    return [...this.signatures.values()].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  createSignature(input) {
    const signature = {
      id: uuidv4(),
      name: input.name,
      display_name: input.display_name || "",
      sender_from_lines: input.sender_from_lines || [],
      channel_ids: input.channel_ids || [],
      created_by: input.created_by || null,
      created_at: new Date().toISOString(),
    };
    this.signatures.set(signature.id, signature);
    return signature;
  }

  upsertOAuthAccount(input) {
    const key = `${input.provider}:${input.email}`.toLowerCase();
    const existing = this.oauthAccounts.get(key);
    const account = {
      id: existing?.id || uuidv4(),
      provider: input.provider,
      email: input.email,
      user_id: input.user_id || existing?.user_id || null,
      access_token: input.access_token,
      refresh_token:
        input.refresh_token !== undefined
          ? input.refresh_token
          : (existing?.refresh_token || null),
      expires_at: input.expires_at,
      updated_at: new Date().toISOString(),
    };
    this.oauthAccounts.set(key, account);
    return account;
  }

  getChannelSyncState(channelId) {
    return this.channelSyncState.get(channelId) || null;
  }

  upsertChannelSyncState(channelId, patch = {}) {
    const existing = this.channelSyncState.get(channelId) || null;
    const next = {
      id: existing?.id || uuidv4(),
      channel_id: channelId,
      provider: patch.provider || existing?.provider || "gmail",
      sync_enabled: patch.sync_enabled !== undefined ? Boolean(patch.sync_enabled) : Boolean(existing?.sync_enabled),
      status: patch.status || existing?.status || "idle",
      cursor: patch.cursor !== undefined ? patch.cursor : (existing?.cursor || null),
      watch_expiration_at:
        patch.watch_expiration_at !== undefined
          ? patch.watch_expiration_at
          : (existing?.watch_expiration_at || null),
      last_synced_at:
        patch.last_synced_at !== undefined
          ? patch.last_synced_at
          : (existing?.last_synced_at || null),
      last_error: patch.last_error !== undefined ? patch.last_error : (existing?.last_error || null),
      updated_at: new Date().toISOString(),
      created_at: existing?.created_at || new Date().toISOString(),
    };
    this.channelSyncState.set(channelId, next);
    return next;
  }

  logActivity(input) {
    const log = {
      id: uuidv4(),
      type: input.type,
      actor_id: input.actor_id || null,
      entity_type: input.entity_type || null,
      entity_id: input.entity_id || null,
      metadata: input.metadata || {},
      created_at: new Date().toISOString(),
    };
    this.activity.push(log);
    return log;
  }

  listActivityLogs(input = {}) {
    const limit = Number(input.limit || 100);
    return [...this.activity]
      .sort((a, b) => new Date(b.created_at || b.timestamp || 0) - new Date(a.created_at || a.timestamp || 0))
      .slice(0, limit);
  }

  listThreads(filter = {}) {
    let rows = [...this.threads.values()];
    if (Array.isArray(filter.channel_ids) && filter.channel_ids.length === 0) {
      return [];
    }
    if (Array.isArray(filter.channel_ids) && filter.channel_ids.length > 0) {
      const allowed = new Set(filter.channel_ids.map((id) => String(id)));
      rows = rows.filter((t) => allowed.has(t.channel_id));
    }
    if (filter.channel_id) {
      rows = rows.filter((t) => t.channel_id === filter.channel_id);
    }
    if (filter.assignment_filter === "assigned") {
      rows = rows.filter((t) => !!t.assigned_to);
    }
    if (filter.assignment_filter === "unassigned") {
      rows = rows.filter((t) => !t.assigned_to);
    }
    if (filter.search) {
      const q = String(filter.search).toLowerCase();
      rows = rows.filter((t) => {
        const participantHit = t.participants.some((p) => p.toLowerCase().includes(q));
        const subjectHit = t.subject.toLowerCase().includes(q);
        return participantHit || subjectHit;
      });
    }

    return rows.sort((a, b) => new Date(b.last_activity_at) - new Date(a.last_activity_at));
  }

  getThread(threadId) {
    const thread = this.threads.get(threadId);
    if (!thread) return null;
    return this.getHydratedThread(thread.id);
  }

  getHydratedThread(threadId) {
    const thread = this.threads.get(threadId);
    if (!thread) return null;
    const messages = thread.messages.map((id) => this.messages.get(id)).filter(Boolean);
    const comments = [...this.comments.values()].filter((c) => c.thread_id === threadId);
    return {
      ...thread,
      messages,
      comments: comments.sort((a, b) => new Date(a.created_at) - new Date(b.created_at)),
    };
  }

  findExistingSyncedMessage(channelId, providerMessageId) {
    if (!providerMessageId) return null;
    return (
      [...this.messages.values()].find(
        (message) =>
          message.provider_message_id === providerMessageId &&
          this.threads.get(message.thread_id)?.channel_id === channelId
      ) || null
    );
  }

  ensureThreadForSyncedMessage(input) {
    const now = input.received_at || new Date().toISOString();
    const normalizedSubject = (input.subject || "(no subject)").trim();
    const subjectKey = normalizedSubject.toLowerCase();
    const threadKey = input.thread_key || `${input.channel_id}:${subjectKey}`;

    let threadId = this.threadKeyToId.get(threadKey);
    let thread = threadId ? this.threads.get(threadId) : null;

    if (!thread) {
      thread = {
        id: uuidv4(),
        channel_id: input.channel_id,
        subject: normalizedSubject,
        participants: [...new Set(input.participants || [])],
        messages: [],
        status: "open",
        assignment_state: "unassigned",
        assigned_to: null,
        priority: "normal",
        tags: [],
        last_activity_at: now,
        created_at: now,
      };
      this.threads.set(thread.id, thread);
      this.threadKeyToId.set(threadKey, thread.id);
      return thread;
    }

    thread.participants = [...new Set([...thread.participants, ...(input.participants || [])])];
    thread.last_activity_at = now;
    thread.subject = normalizedSubject;
    this.threads.set(thread.id, thread);
    return thread;
  }

  upsertSyncedMessage(input) {
    const direction = input.direction === "outbound" ? "outbound" : "inbound";
    const existingMessage = this.findExistingSyncedMessage(input.channel_id, input.provider_message_id);
    if (existingMessage) {
      return {
        thread: this.getHydratedThread(existingMessage.thread_id),
        message: existingMessage,
        duplicate: true,
      };
    }

    const thread = this.ensureThreadForSyncedMessage(input);
    const now = input.received_at || new Date().toISOString();
    const message = {
      id: uuidv4(),
      thread_id: thread.id,
      provider_message_id: input.provider_message_id || null,
      from: input.from,
      to: input.to || [],
      cc: input.cc || [],
      body_text: input.body_text || "",
      body_html: input.body_html || "",
      attachments: input.attachments || [],
      received_at: now,
      direction,
      created_by: input.created_by || null,
    };

    this.messages.set(message.id, message);
    thread.messages.push(message.id);
    thread.last_activity_at = now;
    thread.status = "open";
    this.threads.set(thread.id, thread);
    this.activity.push({
      id: uuidv4(),
      type: direction === "outbound" ? "new_outbound_message" : "new_inbound_message",
      thread_id: thread.id,
      actor_id: input.created_by || null,
      timestamp: now,
    });

    return {
      thread: this.getHydratedThread(thread.id),
      message,
      duplicate: false,
    };
  }

  upsertInboundMessage(input) {
    return this.upsertSyncedMessage({
      ...input,
      direction: "inbound",
      created_by: null,
    });
  }

  addOutboundMessage(input) {
    const thread = this.threads.get(input.thread_id);
    if (!thread) return null;
    const now = new Date().toISOString();
    const message = {
      id: uuidv4(),
      thread_id: input.thread_id,
      provider_message_id: input.provider_message_id || null,
      from: input.from,
      to: input.to || [],
      cc: input.cc || [],
      body_text: input.body_text || "",
      body_html: input.body_html || "",
      attachments: input.attachments || [],
      received_at: now,
      direction: "outbound",
      created_by: input.created_by,
    };

    this.messages.set(message.id, message);
    thread.messages.push(message.id);
    thread.last_activity_at = now;
    thread.status = "open";
    this.threads.set(thread.id, thread);
    this.activity.push({
      id: uuidv4(),
      type: "new_outbound_message",
      thread_id: thread.id,
      actor_id: input.created_by,
      timestamp: now,
    });

    return {
      thread: this.getHydratedThread(thread.id),
      message,
    };
  }

  updateThread(threadId, patch) {
    const current = this.threads.get(threadId);
    if (!current) return null;

    const next = { ...current };
    if (patch.status) {
      next.status = patch.status;
      if (patch.status === "closed") {
        next.assignment_state = "closed";
      }
    }
    if (patch.priority) next.priority = patch.priority;
    if (Array.isArray(patch.tags)) next.tags = patch.tags;
    next.last_activity_at = new Date().toISOString();

    this.threads.set(threadId, next);
    return this.getHydratedThread(threadId);
  }

  assignThread(input) {
    const thread = this.threads.get(input.thread_id);
    if (!thread) return null;
    thread.assigned_to = input.assigned_to || null;
    thread.assignment_state = thread.status === "closed" ? "closed" : thread.assigned_to ? "assigned" : "unassigned";
    thread.last_activity_at = new Date().toISOString();
    this.threads.set(thread.id, thread);
    this.activity.push({
      id: uuidv4(),
      type: "assignment_changed",
      thread_id: thread.id,
      from_user: input.from_user || null,
      to_user: input.assigned_to || null,
      timestamp: new Date().toISOString(),
    });

    return this.getHydratedThread(thread.id);
  }

  addComment(input) {
    const thread = this.threads.get(input.thread_id);
    if (!thread) return null;
    const comment = {
      id: uuidv4(),
      thread_id: input.thread_id,
      author_id: input.author_id,
      body: input.body,
      visibility: "internal",
      created_at: new Date().toISOString(),
    };
    this.comments.set(comment.id, comment);
    return comment;
  }

  // --- User Settings ---

  getNotificationSetting(userId) {
    return this.notificationSettings.get(userId) || null;
  }

  upsertNotificationSetting(userId, input) {
    let setting = this.notificationSettings.get(userId);
    if (!setting) {
      setting = {
        id: uuidv4(),
        userId,
        desktop: input.desktop || "smart",
        mobile: input.mobile || "smart",
        email: input.email || "smart",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    } else {
      setting = {
        ...setting,
        desktop: input.desktop || setting.desktop,
        mobile: input.mobile || setting.mobile,
        email: input.email || setting.email,
        updatedAt: new Date().toISOString(),
      };
    }
    this.notificationSettings.set(userId, setting);
    return setting;
  }

  listNotificationRules(userId) {
    return Array.from(this.notificationRules.values()).filter(r => r.userId === userId);
  }

  createNotificationRule(input) {
    const rule = {
      id: uuidv4(),
      userId: input.userId,
      trigger: input.trigger,
      inboxId: input.inboxId || null,
      action: input.action,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.notificationRules.set(rule.id, rule);
    return rule;
  }

  deleteNotificationRule(ruleId) {
    this.notificationRules.delete(ruleId);
  }

  listSnoozes(userId) {
    return Array.from(this.snoozes.values()).filter(s => s.userId === userId);
  }

  createSnooze(input) {
    const snooze = {
      id: uuidv4(),
      userId: input.userId,
      name: input.name,
      type: input.type,
      day: input.day || null,
      time: input.time || null,
      duration: input.duration || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.snoozes.set(snooze.id, snooze);
    return snooze;
  }

  deleteSnooze(snoozeId) {
    this.snoozes.delete(snoozeId);
  }

  // --- Teammate Groups ---

  listTeammateGroups(orgId) {
    return Array.from(this.teammateGroups.values()).filter(g => g.organizationId === orgId);
  }

  createTeammateGroup(input) {
    const group = {
      id: uuidv4(),
      organizationId: input.organizationId,
      name: input.name,
      description: input.description || null,
      workspaceAccess: input.workspaceAccess || "[]",
      contactsAccessEnabled: input.contactsAccessEnabled || false,
      canEditGroup: input.canEditGroup || "[]",
      canDeleteGroup: input.canDeleteGroup || "[]",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      members: []
    };
    this.teammateGroups.set(group.id, group);

    if (input.members && Array.isArray(input.members)) {
      input.members.forEach(userId => {
        const member = {
          id: uuidv4(),
          groupId: group.id,
          userId: userId,
          createdAt: new Date().toISOString()
        };
        this.teammateGroupMembers.set(member.id, member);
        group.members.push(member);
      });
    }

    return group;
  }

  getTeammateGroup(groupId) {
    return this.teammateGroups.get(groupId);
  }

  updateTeammateGroup(groupId, input) {
    const group = this.teammateGroups.get(groupId);
    if (!group) return null;

    const updated = {
      ...group,
      ...input,
      updatedAt: new Date().toISOString()
    };
    this.teammateGroups.set(groupId, updated);
    
    if (input.members) {
      // Remove old members
      for (const [id, member] of this.teammateGroupMembers) {
        if (member.groupId === groupId) this.teammateGroupMembers.delete(id);
      }
      // Add new members
      updated.members = input.members.map(userId => {
        const member = {
          id: uuidv4(),
          groupId,
          userId,
          createdAt: new Date().toISOString()
        };
        this.teammateGroupMembers.set(member.id, member);
        return member;
      });
    }

    return updated;
  }

  deleteTeammateGroup(groupId) {
    this.teammateGroups.delete(groupId);
    for (const [id, member] of this.teammateGroupMembers) {
      if (member.groupId === groupId) this.teammateGroupMembers.delete(id);
    }
  }

  getTeammateGroupSettings(orgId) {
    return this.teammateGroupSettings.get(orgId) || {
      organizationId: orgId,
      canCreate: "[]",
      canEdit: "[]",
      canDelete: "[]"
    };
  }

  updateTeammateGroupSettings(orgId, input) {
    const settings = this.getTeammateGroupSettings(orgId);
    const updated = {
      ...settings,
      canCreate: input.canCreate || settings.canCreate,
      canEdit: input.canEdit || settings.canEdit,
      canDelete: input.canDelete || settings.canDelete,
      updatedAt: new Date().toISOString()
    };
    this.teammateGroupSettings.set(orgId, updated);
    return updated;
  }
}

module.exports = { InMemoryStore };
