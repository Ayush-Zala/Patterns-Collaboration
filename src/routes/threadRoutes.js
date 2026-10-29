const express = require("express");
const { asyncHandler } = require("../utils/asyncHandler");
const {
  canAccessChannel,
  canAccessInbox,
  getAccessibleChannelIds,
  resolveDelegationScope,
} = require("../services/delegationAccess");
const { analyticsEventBus } = require("../analytics/analyticsEventBus");


const THREAD_STATUSES = new Set(["open", "pending", "closed", "snoozed", "trashed"]);
const THREAD_PRIORITIES = new Set(["low", "normal", "high", "urgent"]);

function buildThreadRoutes({ store, threadService, draftLockManager, lockTtlSeconds }) {
  const router = express.Router();

  async function getThreadWithAccess(req, threadId) {
    const thread = await threadService.getThread(threadId);
    if (!thread) {
      return { error: "Thread not found", status: 404 };
    }

    const scope = await resolveDelegationScope({ store, auth: req.auth });
    const allowed = await canAccessChannel({ store, scope, channelId: thread.channel_id });
    if (!allowed) {
      return { error: "You do not have access to this thread.", status: 403 };
    }

    return { thread, scope };
  }

  router.get("/", asyncHandler(async (req, res) => {
    const scope = await resolveDelegationScope({ store, auth: req.auth });
    let effectiveChannelIds = null;

    if (!scope.has_full_access) {
      effectiveChannelIds = new Set(await getAccessibleChannelIds({ store, scope }));
    }

    const inboxId = req.query.inbox_id ? String(req.query.inbox_id).trim() : "";
    if (inboxId) {
      const inbox = typeof store?.getInbox === "function" ? await store.getInbox(inboxId) : null;
      if (!inbox) {
        return res.status(404).json({ error: "Inbox not found." });
      }
      const allowedInbox = await canAccessInbox({ store, scope, inboxId });
      if (!allowedInbox) {
        return res.status(403).json({ error: "You do not have access to this inbox." });
      }

      const connectedChannels =
        typeof store?.listInboxChannels === "function"
          ? await store.listInboxChannels(inboxId)
          : [];
      const inboxChannelIds = new Set(connectedChannels.map((channel) => channel.id));
      effectiveChannelIds = effectiveChannelIds
        ? new Set([...effectiveChannelIds].filter((channelId) => inboxChannelIds.has(channelId)))
        : inboxChannelIds;
      if (effectiveChannelIds.size === 0) {
        return res.status(200).json({ threads: [] });
      }
    }

    const channelId = req.query.channel_id ? String(req.query.channel_id).trim() : "";
    if (channelId) {
      const hasChannelAccess = await canAccessChannel({ store, scope, channelId });
      if (!hasChannelAccess) {
        return res.status(403).json({ error: "You do not have access to this channel." });
      }
      const requestedChannelSet = new Set([channelId]);
      effectiveChannelIds = effectiveChannelIds
        ? new Set([...effectiveChannelIds].filter((id) => requestedChannelSet.has(id)))
        : requestedChannelSet;
      if (effectiveChannelIds.size === 0) {
        return res.status(200).json({ threads: [] });
      }
    }

    if (effectiveChannelIds && effectiveChannelIds.size === 0) {
      return res.status(200).json({ threads: [], access_scope: scope });
    }

    const threads = await threadService.listThreads({
      channel_ids: effectiveChannelIds ? [...effectiveChannelIds] : undefined,
      assignment_filter: req.query.filter,
      search: req.query.search,
      tag: req.query.tag,
      assignee_id: req.query.assignee_id,
      status: req.query.status,
      sort: req.query.sort,
      scopeType: req.scopeContext?.type,
      scopeId: req.scopeContext?.id,
    });
    return res.status(200).json({ threads, access_scope: scope });
  }));

  router.post("/", asyncHandler(async (req, res) => {
    const { from, to, cc, subject, body_text, body_html, attachments } = req.body;
    
    if (!from) return res.status(400).json({ error: "from is required" });
    if (!to || !Array.isArray(to) || to.length === 0) return res.status(400).json({ error: "to must be a non-empty array" });

    try {
      const result = await threadService.createThread({
        userId: req.auth.user_id,
        from,
        to,
        cc: cc || [],
        subject: subject || "(no subject)",
        bodyText: body_text || "",
        bodyHtml: body_html || "",
        attachments: attachments || [],
      });

      // Emit analytics event
      const orgId = req.auth?.organization_id;
      if (orgId && result?.thread?.id) {
        const channelId = result.thread.channelId;
        const resolvedInboxId = typeof store.getInboxIdByChannelId === "function"
          ? await store.getInboxIdByChannelId(channelId)
          : null;

        analyticsEventBus.publish("thread.created", {
          orgId,
          threadId: result.thread.id,
          channelId,
          inboxId: resolvedInboxId,
          actorId: req.auth.user_id,
        });
        analyticsEventBus.publish("message.sent", {
          orgId,
          threadId: result.thread.id,
          channelId,
          inboxId: resolvedInboxId,
          actorId: req.auth.user_id,
        });
      }

      return res.status(201).json(result);
    } catch (error) {
      console.error("[ThreadRoutes] Create Thread Error:", error);
      if (error.message && error.message.includes("No configured channel for sender")) {
        return res.status(400).json({ error: error.message });
      }
      return res.status(500).json({ error: error.message || "Failed to create thread." });
    }
  }));

  router.get("/:id", asyncHandler(async (req, res) => {
    const resolved = await getThreadWithAccess(req, req.params.id);
    if (resolved.error) return res.status(resolved.status).json({ error: resolved.error });
    return res.status(200).json({ thread: resolved.thread });
  }));

  router.patch("/:id", asyncHandler(async (req, res) => {
    const resolved = await getThreadWithAccess(req, req.params.id);
    if (resolved.error) return res.status(resolved.status).json({ error: resolved.error });

    const patch = {};
    if (req.body.status) {
      if (!THREAD_STATUSES.has(req.body.status)) {
        return res.status(400).json({ error: `Invalid status. Use one of: ${[...THREAD_STATUSES].join(", ")}` });
      }
      patch.status = req.body.status;
    }
    if (req.body.priority) {
      if (!THREAD_PRIORITIES.has(req.body.priority)) {
        return res.status(400).json({ error: `Invalid priority. Use one of: ${[...THREAD_PRIORITIES].join(", ")}` });
      }
      patch.priority = req.body.priority;
    }
    if (req.body.tags) {
      if (!Array.isArray(req.body.tags)) {
        return res.status(400).json({ error: "tags must be array of strings" });
      }
      patch.tags = req.body.tags;
    }
    const thread = await threadService.updateThread(req.params.id, patch, req.auth.user_id);
    if (!thread) return res.status(404).json({ error: "Thread not found" });

    // Emit analytics event when thread is closed
    if (patch.status === "closed") {
      const orgId = req.auth?.organization_id;
      if (orgId) {
        const channelId = thread.channelId || resolved.thread?.channelId;
        const resolvedInboxId = channelId && typeof store.getInboxIdByChannelId === "function"
          ? await store.getInboxIdByChannelId(channelId)
          : null;

        analyticsEventBus.publish("thread.closed", {
          orgId,
          threadId: req.params.id,
          inboxId: resolvedInboxId,
          actorId: req.auth.user_id,
          createdAt: thread.createdAt || resolved.thread?.createdAt,
        });
      }
    }

    return res.status(200).json({ thread });
  }));

  router.patch("/:id/assign", asyncHandler(async (req, res) => {
    const resolved = await getThreadWithAccess(req, req.params.id);
    if (resolved.error) return res.status(resolved.status).json({ error: resolved.error });

    const { assigned_to } = req.body;
    const thread = await threadService.assignThread({
      threadId: req.params.id,
      assignedTo: assigned_to || null,
      actorId: req.auth.user_id,
    });
    if (!thread) return res.status(404).json({ error: "Thread not found" });

    // Emit analytics event
    const orgId = req.auth?.organization_id;
    if (orgId && assigned_to) {
      const channelId = thread.channelId || resolved.thread?.channelId;
      const resolvedInboxId = channelId && typeof store.getInboxIdByChannelId === "function"
        ? await store.getInboxIdByChannelId(channelId)
        : null;

      analyticsEventBus.publish("thread.assigned", {
        orgId,
        threadId: req.params.id,
        inboxId: resolvedInboxId,
        actorId: req.auth.user_id,
        assignedTo: assigned_to,
      });
    }

    return res.status(200).json({ thread });
  }));

  router.patch("/:id/snooze", asyncHandler(async (req, res) => {
    const resolved = await getThreadWithAccess(req, req.params.id);
    if (resolved.error) return res.status(resolved.status).json({ error: resolved.error });

    const { snoozed_until } = req.body;
    const thread = await threadService.updateThread(req.params.id, {
      status: "snoozed",
      snoozed_until: snoozed_until || null
    }, req.auth.user_id);

    if (!thread) return res.status(404).json({ error: "Thread not found" });
    return res.status(200).json({ thread });
  }));

  router.delete("/:id", asyncHandler(async (req, res) => {
    const resolved = await getThreadWithAccess(req, req.params.id);
    if (resolved.error) return res.status(resolved.status).json({ error: resolved.error });

    const thread = await threadService.updateThread(req.params.id, {
      status: "trashed"
    }, req.auth.user_id);

    if (!thread) return res.status(404).json({ error: "Thread not found" });
    return res.status(200).json({ message: "Thread moved to trash", thread });
  }));

  router.post("/:id/drafts", asyncHandler(async (req, res) => {
    const resolved = await getThreadWithAccess(req, req.params.id);
    if (resolved.error) return res.status(resolved.status).json({ error: resolved.error });

    const { body, attachments } = req.body;
    const threadId = req.params.id;
    const userId = req.auth.user_id;

    const saved = await threadService.saveDraft({
      threadId,
      userId,
      body,
      attachments: attachments || [],
    });
    if (!saved) return res.status(404).json({ error: "Thread not found" });

    const lock = await threadService.acquireDraftLock({
      threadId,
      userId,
      ttlSeconds: lockTtlSeconds,
    });

    return res.status(200).json({
      draft: saved.draft,
      lock: lock.lock,
    });
  }));

  router.get("/:id/drafts/me", asyncHandler(async (req, res) => {
    const resolved = await getThreadWithAccess(req, req.params.id);
    if (resolved.error) return res.status(resolved.status).json({ error: resolved.error });

    const draft = await draftLockManager.getDraft({ threadId: req.params.id, userId: req.auth.user_id });
    return res.status(200).json({ draft });
  }));

  router.post("/:id/lock", asyncHandler(async (req, res) => {
    const resolved = await getThreadWithAccess(req, req.params.id);
    if (resolved.error) return res.status(resolved.status).json({ error: resolved.error });

    const result = await threadService.acquireDraftLock({
      threadId: req.params.id,
      userId: req.auth.user_id,
      ttlSeconds: req.body.ttl_seconds || lockTtlSeconds,
    });
    if (!result) return res.status(404).json({ error: "Thread not found" });
    if (!result.lock.acquired) {
      return res.status(409).json({ error: "Draft locked", lock: result.lock });
    }
    return res.status(200).json({ lock: result.lock });
  }));

  router.post("/:id/lock/heartbeat", asyncHandler(async (req, res) => {
    const resolved = await getThreadWithAccess(req, req.params.id);
    if (resolved.error) return res.status(resolved.status).json({ error: resolved.error });

    const refresh = await threadService.heartbeatDraftLock({
      threadId: req.params.id,
      userId: req.auth.user_id,
      ttlSeconds: req.body.ttl_seconds || lockTtlSeconds,
    });
    if (!refresh.refreshed) {
      return res.status(409).json({ error: "Cannot refresh lock", lock: refresh });
    }
    return res.status(200).json({ lock: refresh });
  }));

  router.delete("/:id/lock", asyncHandler(async (req, res) => {
    const resolved = await getThreadWithAccess(req, req.params.id);
    if (resolved.error) return res.status(resolved.status).json({ error: resolved.error });

    const release = await threadService.releaseDraftLock({
      threadId: req.params.id,
      userId: req.auth.user_id,
    });
    if (!release) return res.status(404).json({ error: "Thread not found" });
    if (!release.lock.released) {
      return res.status(409).json({ error: "Cannot release lock", lock: release.lock });
    }
    return res.status(200).json({ lock: release.lock });
  }));

  router.post("/:id/reply", asyncHandler(async (req, res) => {
    const resolved = await getThreadWithAccess(req, req.params.id);
    if (resolved.error) return res.status(resolved.status).json({ error: resolved.error });

    const threadId = req.params.id;
    const result = await threadService.sendReply({
      threadId,
      userId: req.auth.user_id,
      from: req.body.from || req.auth.user?.email || "agent@company.com",
      senderName: req.body.sender_name || req.auth.user?.name || null,
      to: req.body.to || [],
      cc: req.body.cc || [],
      bodyText: req.body.body_text || "",
      bodyHtml: req.body.body_html || "",
      attachments: req.body.attachments || [],
    });
    if (result.error === "Thread not found") return res.status(404).json(result);
    if (result.code === "LOCKED") return res.status(409).json(result);

    // Emit analytics events for reply
    const orgId = req.auth?.organization_id;
    if (orgId && !result.error) {
      const thread = resolved.thread;
      const channelId = thread?.channelId;
      const resolvedInboxId = channelId && typeof store.getInboxIdByChannelId === "function"
        ? await store.getInboxIdByChannelId(channelId)
        : null;

      const now = new Date();
      let firstResponseMs = null;
      if (thread?.createdAt) {
        firstResponseMs = now.getTime() - new Date(thread.createdAt).getTime();
      }
      analyticsEventBus.publish("message.reply", {
        orgId,
        threadId,
        channelId,
        inboxId: resolvedInboxId,
        actorId: req.auth.user_id,
        firstResponseMs,
      });
    }

    return res.status(201).json(result);
  }));

  return router;
}

module.exports = { buildThreadRoutes };
