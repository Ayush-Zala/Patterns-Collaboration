class RealtimeGateway {
  constructor(io, store) {
    this.io = io;
    this.store = store;
  }

  install() {
    this.io.on("connection", async (socket) => {
      const userId = socket.handshake.auth?.user_id || socket.handshake.query?.user_id || "u-sales-1";
      let user = null;
      try {
        user = await this.store.getUser(userId);
      } catch {
        user = null;
      }

      socket.data.userId = userId;
      socket.data.userName = user?.name || userId;

      socket.on("join_channel", ({ channel_id, scope_type = "company", scope_id = "global" }) => {
        if (!channel_id) return;
        socket.join(`scope:${scope_type}:${scope_id}:channel:${channel_id}`);
      });

      socket.on("join_thread", ({ thread_id }) => {
        if (!thread_id) return;
        socket.join(`thread:${thread_id}`);
      });

      // Analytics dashboard room — client emits this when viewing analytics page
      socket.on("join_analytics", ({ org_id }) => {
        if (!org_id) return;
        socket.join(`analytics:${org_id}`);
      });

      socket.on("typing", ({ thread_id, is_typing }) => {
        if (!thread_id) return;
        socket.to(`thread:${thread_id}`).emit("typing", {
          thread_id,
          user_id: socket.data.userId,
          name: socket.data.userName,
          is_typing: Boolean(is_typing),
        });
      });
    });
  }

  broadcastThreadUpdated(channelId, thread, scopeType = "company", scopeId = "global") {
    this.io.to(`scope:${scopeType}:${scopeId}:channel:${channelId}`).emit("thread_updated", thread);
    this.io.to(`thread:${thread.id}`).emit("thread_updated", thread);
  }

  broadcastAssignment(channelId, threadId, payload, scopeType = "company", scopeId = "global") {
    this.io.to(`scope:${scopeType}:${scopeId}:channel:${channelId}`).emit("assignment", payload);
    this.io.to(`thread:${threadId}`).emit("assignment", payload);
  }

  broadcastNewMessage(channelId, threadId, message, scopeType = "company", scopeId = "global") {
    this.io.to(`scope:${scopeType}:${scopeId}:channel:${channelId}`).emit("new_message", message);
    this.io.to(`thread:${threadId}`).emit("new_message", message);
  }

  broadcastComment(channelId, threadId, comment, scopeType = "company", scopeId = "global") {
    this.io.to(`scope:${scopeType}:${scopeId}:channel:${channelId}`).emit("comment_added", comment);
    this.io.to(`thread:${threadId}`).emit("comment_added", comment);
  }

  broadcastDraftLock(channelId, threadId, lock, scopeType = "company", scopeId = "global") {
    this.io.to(`scope:${scopeType}:${scopeId}:channel:${channelId}`).emit("draft_lock", lock);
    this.io.to(`thread:${threadId}`).emit("draft_lock", lock);
  }

  /**
   * Push an updated analytics snapshot to all clients viewing the analytics
   * dashboard for a given organisation.
   * Room: `analytics:{orgId}`
   * Event: `analytics_update`
   */
  broadcastAnalytics(orgId, snapshot) {
    this.io.to(`analytics:${orgId}`).emit("analytics_update", {
      orgId,
      snapshot,
      serverTs: new Date().toISOString(),
    });
  }
}

module.exports = { RealtimeGateway };

