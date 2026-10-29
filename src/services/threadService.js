const { analyticsEventBus } = require("../analytics/analyticsEventBus");

class ThreadService {
  constructor({ store, draftLockManager, realtime, authService, mailService, systemEvents }) {
    this.store = store;
    this.draftLockManager = draftLockManager;
    this.realtime = realtime;
    this.authService = authService;
    this.mailService = mailService;
    this.systemEvents = systemEvents;
  }

  async listThreads(query) {
    return this.store.listThreads(query);
  }

  async getThread(threadId) {
    return this.store.getThread(threadId);
  }

  async createThread({ userId, from, to, cc, subject, bodyText, bodyHtml, attachments }) {
    const channel = await this.store.getChannelByEmail(from);
    if (!channel) {
      throw new Error(`No configured channel for sender ${from}`);
    }

    const account = await this.store.getOAuthAccountById(channel.oauth_account_id);
    if (!account) {
      throw new Error("Sender OAuth account missing.");
    }

    const refreshed = await this.authService.refreshIfNeeded(account);

    const gmailResult = await this.mailService.sendGmail({
      accessToken: refreshed.access_token,
      from,
      to,
      cc,
      subject,
      bodyText,
    });

    const participants = [from, ...(to || []), ...(cc || [])].filter(Boolean);

    const result = await this.store.upsertSyncedMessage({
      channel_id: channel.id,
      thread_key: gmailResult.provider_thread_id,
      subject,
      from,
      to,
      cc,
      body_text: bodyText,
      body_html: bodyHtml || "",
      attachments: attachments || [],
      participants,
      provider_message_id: gmailResult.provider_message_id,
      received_at: new Date().toISOString(),
      direction: "outbound",
      created_by: userId,
    });

    this.systemEvents.dispatch("realtime:newMessage", { channelId: channel.id, threadId: result.thread.id, message: result.message });
    this.systemEvents.dispatch("realtime:threadUpdated", { channelId: channel.id, thread: result.thread });

    return result;
  }

  async ingestInboundEmail({ provider, payload }) {
    const channelEmail = payload.channel_email || payload.to?.[0] || payload.recipient;
    const channel = await this.store.getChannelByEmail(channelEmail);
    if (!channel) {
      return { error: `No configured channel for ${channelEmail}` };
    }

    const subject = payload.subject || "(no subject)";
    const participants = [payload.from, ...(payload.to || []), ...(payload.cc || [])].filter(Boolean);
    const result = await this.store.upsertInboundMessage({
      channel_id: channel.id,
      thread_key: payload.thread_key || payload.conversation_id || null,
      subject,
      from: payload.from,
      to: payload.to || [channelEmail],
      cc: payload.cc || [],
      body_text: payload.body_text || "",
      body_html: payload.body_html || "",
      attachments: payload.attachments || [],
      participants,
      provider_message_id: payload.provider_message_id || null,
      inReplyTo: payload.inReplyTo || null,
      references: payload.references || null,
      received_at: payload.received_at || new Date().toISOString(),
    });

    this.systemEvents.dispatch("realtime:newMessage", { channelId: result.thread.channelId, threadId: result.thread.id, message: result.message });
    this.systemEvents.dispatch("realtime:threadUpdated", { channelId: result.thread.channelId, thread: result.thread });

    const orgId = "org-patterns-1";
    if (result.isNewThread) {
      this.systemEvents.dispatch("analytics:thread.created", {
        orgId,
        inboxId: result.thread.channelId,
        threadId: result.thread.id,
        ts: result.message.received_at,
      });
    }
    this.systemEvents.dispatch("analytics:message.received", {
      orgId,
      inboxId: result.thread.channelId,
      threadId: result.thread.id,
      ts: result.message.received_at,
    });
    this.systemEvents.dispatch("automation:message.received", {
      orgId,
      channelId: result.thread.channelId,
      threadId: result.thread.id,
      message: result.message,
      isNewThread: result.isNewThread,
    });

    if (typeof this.store.logActivity === "function") {
      await this.store.logActivity({
        type: "inbound_message_ingested",
        actor_id: null,
        entity_type: "thread",
        entity_id: result.thread.id,
        metadata: {
          provider,
          channel_id: channel.id,
          message_id: result.message.id,
        },
      });
    }

    return {
      provider,
      channel_id: channel.id,
      ...result,
    };
  }

  async ingestSyncedEmail({ provider, direction, payload }) {
    const channelEmail = payload.channel_email || payload.to?.[0] || payload.recipient || payload.from;
    const channel = await this.store.getChannelByEmail(channelEmail);
    if (!channel) {
      return { error: `No configured channel for ${channelEmail}` };
    }

    const normalizedDirection = direction === "outbound" ? "outbound" : "inbound";
    const subject = payload.subject || "(no subject)";
    const participants = [payload.from, ...(payload.to || []), ...(payload.cc || [])].filter(Boolean);
    const result =
      typeof this.store.upsertSyncedMessage === "function"
        ? await this.store.upsertSyncedMessage({
            channel_id: channel.id,
            thread_key: payload.thread_key || payload.conversation_id || null,
            subject,
            from: payload.from,
            to: payload.to || [channelEmail],
            cc: payload.cc || [],
            body_text: payload.body_text || "",
            body_html: payload.body_html || "",
            attachments: payload.attachments || [],
            participants,
            provider_message_id: payload.provider_message_id || null,
            inReplyTo: payload.inReplyTo || null,
            references: payload.references || null,
            received_at: payload.received_at || new Date().toISOString(),
            direction: normalizedDirection,
            created_by: normalizedDirection === "outbound" ? payload.created_by || channel.oauth_account_id || null : null,
          })
        : await this.store.upsertInboundMessage({
            channel_id: channel.id,
            thread_key: payload.thread_key || payload.conversation_id || null,
            subject,
            from: payload.from,
            to: payload.to || [channelEmail],
            cc: payload.cc || [],
            body_text: payload.body_text || "",
            body_html: payload.body_html || "",
            attachments: payload.attachments || [],
            participants,
            provider_message_id: payload.provider_message_id || null,
            inReplyTo: payload.inReplyTo || null,
            references: payload.references || null,
            received_at: payload.received_at || new Date().toISOString(),
          });

    if (!result?.duplicate) {
      this.systemEvents.dispatch("realtime:newMessage", { channelId: result.thread.channelId, threadId: result.thread.id, message: result.message });
      this.systemEvents.dispatch("realtime:threadUpdated", { channelId: result.thread.channelId, thread: result.thread });

      const orgId = "org-patterns-1";
      if (result.isNewThread) {
        this.systemEvents.dispatch("analytics:thread.created", {
          orgId,
          inboxId: result.thread.channelId,
          threadId: result.thread.id,
          ts: result.message.received_at,
        });
      }
      
      const eventType = normalizedDirection === "outbound" ? "analytics:message.sent" : "analytics:message.received";
      this.systemEvents.dispatch(eventType, {
        orgId,
        inboxId: result.thread.channelId,
        threadId: result.thread.id,
        actorId: normalizedDirection === "outbound" ? payload.created_by : null,
        ts: result.message.received_at,
      });

      if (normalizedDirection === "inbound") {
        this.systemEvents.dispatch("automation:message.received", {
          orgId,
          channelId: result.thread.channelId,
          threadId: result.thread.id,
          message: result.message,
          isNewThread: result.isNewThread,
        });
      }
    }

    if (typeof this.store.logActivity === "function" && !result?.duplicate) {
      await this.store.logActivity({
        type: normalizedDirection === "outbound" ? "outbound_message_synced" : "inbound_message_ingested",
        actor_id: normalizedDirection === "outbound" ? payload.created_by || null : null,
        entity_type: "thread",
        entity_id: result.thread.id,
        metadata: {
          provider,
          direction: normalizedDirection,
          channel_id: channel.id,
          message_id: result.message.id,
          provider_message_id: payload.provider_message_id || null,
        },
      });
    }

    return {
      provider,
      direction: normalizedDirection,
      channel_id: channel.id,
      ...result,
    };
  }

  async updateThread(threadId, patch, actorId = null) {
    const thread = await this.store.updateThread(threadId, patch);
    if (!thread) return null;
    this.systemEvents.dispatch("realtime:threadUpdated", { channelId: thread.channelId, thread });

    if (typeof this.store.logActivity === "function") {
      await this.store.logActivity({
        type: "thread_updated",
        actor_id: actorId,
        entity_type: "thread",
        entity_id: thread.id,
        metadata: {
          patch,
        },
      });
    }
    return thread;
  }

  async assignThread({ threadId, assignedTo, actorId }) {
    const thread = await this.store.assignThread({
      thread_id: threadId,
      assigned_to: assignedTo,
      from_user: actorId,
    });
    if (!thread) return null;
    this.systemEvents.dispatch("realtime:assignment", {
      channelId: thread.channelId,
      threadId: thread.id,
      data: {
        thread_id: thread.id,
        assigned_to: thread.assigned_to,
        assignment_state: thread.assignment_state,
        actor_id: actorId,
      }
    });
    this.systemEvents.dispatch("realtime:threadUpdated", { channelId: thread.channelId, thread });

    if (typeof this.store.logActivity === "function") {
      await this.store.logActivity({
        type: "thread_assigned",
        actor_id: actorId,
        entity_type: "thread",
        entity_id: thread.id,
        metadata: {
          assigned_to: thread.assigned_to,
          assignment_state: thread.assignment_state,
        },
      });
    }
    return thread;
  }

  async saveDraft({ threadId, userId, body, attachments }) {
    const thread = await this.store.getThread(threadId);
    if (!thread) return null;
    const draft = await this.draftLockManager.autosaveDraft({
      threadId,
      userId,
      body,
      attachments,
    });
    return { thread, draft };
  }

  async acquireDraftLock({ threadId, userId, ttlSeconds }) {
    const thread = await this.store.getThread(threadId);
    if (!thread) return null;
    const lock = await this.draftLockManager.acquireLock({ threadId, userId, ttlSeconds });
    this.systemEvents.dispatch("realtime:draftLock", {
      channelId: thread.channelId,
      threadId: threadId,
      data: {
        thread_id: threadId,
        owner: lock.owner,
        acquired: lock.acquired,
      }
    });
    return { thread, lock };
  }

  async heartbeatDraftLock({ threadId, userId, ttlSeconds }) {
    return this.draftLockManager.heartbeatLock({ threadId, userId, ttlSeconds });
  }

  async releaseDraftLock({ threadId, userId }) {
    const thread = await this.store.getThread(threadId);
    if (!thread) return null;
    const lock = await this.draftLockManager.releaseLock({ threadId, userId });
    this.systemEvents.dispatch("realtime:draftLock", {
      channelId: thread.channelId,
      threadId: threadId,
      data: {
        thread_id: threadId,
        owner: lock.owner,
        released: lock.released,
      }
    });
    return { thread, lock };
  }

  async sendReply({ threadId, userId, from, to, cc, bodyText, bodyHtml, attachments, senderName }) {
    const thread = await this.store.getThread(threadId);
    if (!thread) return { error: "Thread not found" };

    const lock = await this.draftLockManager.getLock(threadId);
    if (lock && lock.owner !== userId) {
      return { error: "Draft locked by another user", lock_owner: lock.owner, code: "LOCKED" };
    }

    // --- REAL SEND LOGIC START ---
    let providerMessageId = `out_${Date.now()}`;
    
    // 1. Get channel and account
    // NOTE: thread object uses camelCase channelId (from mapThreadSummary)
    const channelId = thread.channelId || thread.channel_id;
    const channel = channelId ? await this.store.getChannel(channelId) : null;
    
    if (!channel) {
      console.error(`[ThreadService] sendReply: no channel found for thread ${threadId} (channelId=${channelId})`);
      throw new Error("Channel not found for this thread. Cannot send email.");
    }
    
    if (!channel.oauth_account_id) {
      console.error(`[ThreadService] sendReply: channel ${channel.id} has no OAuth account linked.`);
      throw new Error("No email account connected to this channel. Please reconnect the channel.");
    }
    
    const account = await this.store.getOAuthAccountById(channel.oauth_account_id);
    if (!account) {
      throw new Error("OAuth account record missing. Please reconnect the channel.");
    }
    
    try {
      // 2. Refresh token
      const refreshed = await this.authService.refreshIfNeeded(account);
      if (!refreshed || !refreshed.access_token) {
        throw new Error("Failed to obtain a valid access token. Please reconnect your Gmail account.");
      }
      
      // 3. Get context for threading (In-Reply-To / References)
      const messages = await this.store.listMessages(threadId);
      const lastInbound = messages
        .filter(m => m.direction === 'inbound' && m.provider_message_id)
        .sort((a, b) => new Date(b.created_at || b.receivedAt).getTime() - new Date(a.created_at || a.receivedAt).getTime())[0];

      // 4. Construct 'From' header — always use the channel email as the actual sender
      const finalFromEmail = channel.email_address;
      const fromHeader = senderName 
        ? `${senderName} <${finalFromEmail}>`
        : finalFromEmail;

      console.log(`[ThreadService] Sending reply via Gmail: from=${fromHeader}, to=${JSON.stringify(to)}, threadKey=${thread.externalThreadKey}`);

      // 5. Send via MailService
      const sendResult = await this.mailService.sendMail({
        provider: channel.provider,
        accessToken: refreshed.access_token,
        from: fromHeader,
        to,
        cc,
        subject: thread.subject,
        bodyText,
        threadId: thread.externalThreadKey, // Provider's thread ID for stitching
        inReplyTo: lastInbound?.provider_message_id,
        references: lastInbound?.provider_message_id,
      });
      
      providerMessageId = sendResult.provider_message_id;
      console.log(`[ThreadService] Gmail send success: provider_message_id=${providerMessageId}`);
    } catch (sendError) {
      console.error("[ThreadService] Outbound send failed:", sendError.message);
      throw new Error(`Failed to send email: ${sendError.message}`);
    }
    // --- REAL SEND LOGIC END ---

    const result = await this.store.addOutboundMessage({
      thread_id: threadId,
      from,
      to,
      cc,
      body_text: bodyText,
      body_html: bodyHtml,
      attachments,
      created_by: userId,
      provider_message_id: providerMessageId,
    });
    if (!result) return { error: "Thread not found" };

    await this.draftLockManager.clearDraft({ threadId, userId });
    await this.draftLockManager.releaseLock({ threadId, userId });

    this.systemEvents.dispatch("realtime:newMessage", { channelId: result.thread.channelId, threadId: threadId, message: result.message });
    this.systemEvents.dispatch("realtime:threadUpdated", { channelId: result.thread.channelId, thread: result.thread });

    if (typeof this.store.logActivity === "function") {
      await this.store.logActivity({
        type: "thread_replied",
        actor_id: userId,
        entity_type: "thread",
        entity_id: result.thread.id,
        metadata: {
          message_id: result.message.id,
          to,
          cc,
          provider_message_id: providerMessageId,
        },
      });
    }

    return result;
  }

  async postInternalComment({ threadId, authorId, body }) {
    const thread = await this.store.getThread(threadId);
    if (!thread) return null;
    const comment = await this.store.addComment({ thread_id: threadId, author_id: authorId, body });
    this.systemEvents.dispatch("realtime:comment", { channelId: thread.channelId, threadId: threadId, comment });

    if (typeof this.store.logActivity === "function") {
      await this.store.logActivity({
        type: "internal_comment_added",
        actor_id: authorId,
        entity_type: "thread",
        entity_id: threadId,
        metadata: {
          comment_id: comment.id,
        },
      });
    }
    return comment;
  }
}

module.exports = { ThreadService };
