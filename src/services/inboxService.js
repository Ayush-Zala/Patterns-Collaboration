const { canAccessInbox, getAccessibleInboxIds, resolveDelegationScope } = require("./delegationAccess");

class InboxService {
  constructor({ store, realtime }) {
    this.store = store;
    this.realtime = realtime;
  }

  async listInboxes(auth) {
    const inboxes = await this.store.listInboxes();
    const scope = await resolveDelegationScope({ store: this.store, auth });
    
    if (scope.has_full_access) {
      return { inboxes, access_scope: scope };
    }

    const allowedInboxIds = new Set(await getAccessibleInboxIds({ store: this.store, scope }));
    const filtered = inboxes.filter((inbox) => allowedInboxIds.has(inbox.id));
    return { inboxes: filtered, access_scope: scope };
  }

  async createInbox({ name, description, auth }) {
    if (auth.role !== "admin") {
      throw new Error("Only admin can create inboxes");
    }

    const inbox = await this.store.createInbox({
      name,
      description: description || "",
      scopeType: auth.organization_id ? "organization" : "company",
      scopeId: auth.organization_id || "global",
      created_by: auth.user_id,
    });

    if (typeof this.store.logActivity === "function") {
      await this.store.logActivity({
        type: "inbox_created",
        actor_id: auth.user_id,
        entity_type: "inbox",
        entity_id: inbox.id,
        metadata: { name: inbox.name },
      });
    }

    return inbox;
  }

  async getInbox({ inboxId, auth }) {
    const inbox = await this.store.getInbox(inboxId);
    if (!inbox) {
      throw new Error("Inbox not found.");
    }

    const scope = await resolveDelegationScope({ store: this.store, auth });
    const allowed = await canAccessInbox({ store: this.store, scope, inboxId: inbox.id });
    if (!allowed) {
      throw new Error("You do not have access to this inbox.");
    }

    const connectedChannels = typeof this.store.listInboxChannels === "function"
      ? await this.store.listInboxChannels(inbox.id)
      : [];

    return {
      inbox,
      connected_channels: connectedChannels,
      access_scope: scope,
    };
  }

  async deleteInbox({ inboxId, auth }) {
    if (auth.role !== "admin") {
      throw new Error("Only admin can delete inboxes");
    }

    if (typeof this.store.deleteInbox !== "function") {
      throw new Error("Inbox delete is not available for current store mode.");
    }

    const deletedInbox = await this.store.deleteInbox(inboxId);
    if (!deletedInbox) {
      throw new Error("Inbox not found.");
    }

    if (typeof this.store.logActivity === "function") {
      await this.store.logActivity({
        type: "inbox_deleted",
        actor_id: auth.user_id,
        entity_type: "inbox",
        entity_id: deletedInbox.id,
        metadata: { name: deletedInbox.name },
      });
    }

    return deletedInbox;
  }

  async connectChannel({ inboxId, channelId, auth }) {
    if (auth.role !== "admin") {
      throw new Error("Only admin can connect inbox channels.");
    }

    const inbox = await this.store.getInbox(inboxId);
    if (!inbox) throw new Error("Inbox not found.");

    const channel = await this.store.getChannel(String(channelId));
    if (!channel) throw new Error("Channel not found.");

    if (typeof this.store.connectInboxChannel !== "function") {
      throw new Error("Inbox-channel mapping is not available for current store mode.");
    }

    const connection = await this.store.connectInboxChannel({
      inbox_id: inbox.id,
      channel_id: channel.id,
      created_by: auth.user_id,
    });

    if (typeof this.store.logActivity === "function") {
      await this.store.logActivity({
        type: "inbox_channel_connected",
        actor_id: auth.user_id,
        entity_type: "inbox",
        entity_id: inbox.id,
        metadata: {
          inbox_id: inbox.id,
          channel_id: channel.id,
          channel_email: channel.email_address,
        },
      });
    }

    return { inbox, channel, connection };
  }

  async moveThreadToInbox({ threadId, targetInboxId, auth }) {
    // 1. Verify thread exists
    const thread = await this.store.getThread(threadId);
    if (!thread) {
      throw new Error("Thread not found.");
    }

    // 2. Verify target inbox exists and user has access
    const { inbox } = await this.getInbox({ inboxId: targetInboxId, auth });
    
    // 3. Perform move (Update thread's inboxId)
    // We assume the store provides an updateThread method that allows setting inboxId
    const updatedThread = await this.store.updateThread(threadId, {
      inboxId: targetInboxId
    });

    // 4. Log activity
    if (typeof this.store.logActivity === "function") {
      await this.store.logActivity({
        type: "thread_moved",
        actor_id: auth.user_id,
        entity_type: "thread",
        entity_id: threadId,
        metadata: {
          previous_inbox_id: thread.inboxId,
          new_inbox_id: targetInboxId,
        },
      });
    }

    // 5. Broadcast to real-time clients (Optional: broadcast to new inbox room)
    if (this.realtime) {
      // Broadcast to old channel/inbox and new inbox
      this.realtime.broadcastThreadUpdated(thread.channelId, updatedThread);
    }

    return updatedThread;
  }

  async updateInbox({ inboxId, updates, auth }) {
    if (auth.role !== "admin") {
      throw new Error("Only admin can update inbox settings.");
    }

    const existing = await this.store.getInbox(inboxId);
    if (!existing) {
      throw new Error("Inbox not found.");
    }

    // Build the update payload from the settings object
    const updatePayload = {};
    if (updates.name !== undefined) updatePayload.name = updates.name;
    if (updates.description !== undefined) updatePayload.description = updates.description;

    // Handle the nested settings object from the frontend
    if (updates.settings) {
      if (updates.settings.enable_ticket_statuses !== undefined) {
        updatePayload.ticketStatusesEnabled = updates.settings.enable_ticket_statuses;
      }
      if (updates.settings.enable_ticket_ids !== undefined) {
        updatePayload.ticketIdEnabled = updates.settings.enable_ticket_ids;
      }
    }

    // Also allow flat field updates
    if (updates.ticketStatusesEnabled !== undefined) updatePayload.ticketStatusesEnabled = updates.ticketStatusesEnabled;
    if (updates.ticketIdEnabled !== undefined) updatePayload.ticketIdEnabled = updates.ticketIdEnabled;

    const updatedInbox = await this.store.updateInbox(inboxId, updatePayload);

    if (typeof this.store.logActivity === "function") {
      await this.store.logActivity({
        type: "inbox_updated",
        actor_id: auth.user_id,
        entity_type: "inbox",
        entity_id: inboxId,
        metadata: { name: updatedInbox.name, changes: Object.keys(updatePayload) },
      });
    }

    return updatedInbox;
  }
}

module.exports = { InboxService };
