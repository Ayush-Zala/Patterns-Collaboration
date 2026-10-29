const express = require("express");
const { asyncHandler } = require("../utils/asyncHandler");
const { canAccessChannel, resolveDelegationScope } = require("../services/delegationAccess");

function buildCommentRoutes({ store, threadService }) {
  const router = express.Router();

  router.post("/", asyncHandler(async (req, res) => {
    const { thread_id, body } = req.body;
    if (!thread_id || !body) {
      return res.status(400).json({ error: "thread_id and body are required" });
    }

    const thread = await threadService.getThread(thread_id);
    if (!thread) return res.status(404).json({ error: "Thread not found" });

    const scope = await resolveDelegationScope({ store, auth: req.auth });
    const allowed = await canAccessChannel({ store, scope, channelId: thread.channel_id });
    if (!allowed) {
      return res.status(403).json({ error: "You do not have access to this thread." });
    }

    const comment = await threadService.postInternalComment({
      threadId: thread_id,
      authorId: req.auth.user_id,
      body,
    });

    if (!comment) return res.status(404).json({ error: "Thread not found" });
    return res.status(201).json({ comment });
  }));

  return router;
}

module.exports = { buildCommentRoutes };
