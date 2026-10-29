const express = require("express");
const { asyncHandler } = require("../utils/asyncHandler");
const { InboxService } = require("../services/inboxService");

function buildInboxRoutes({ store, realtime }) {
  const router = express.Router();
  const inboxService = new InboxService({ store, realtime });

  router.get("/", asyncHandler(async (req, res) => {
    const result = await inboxService.listInboxes(req.auth);
    return res.status(200).json(result);
  }));

  router.post("/", asyncHandler(async (req, res) => {
    const { name, description } = req.body;
    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: "name is required" });
    }
    
    try {
      const inbox = await inboxService.createInbox({ name: String(name).trim(), description, auth: req.auth });
      return res.status(201).json({ inbox });
    } catch (e) {
      return res.status(req.auth.role !== "admin" ? 403 : 500).json({ error: e.message });
    }
  }));

  router.post("/custom-fields/bulk", asyncHandler(async (req, res) => {
    if (req.auth.role !== "admin") {
      return res.status(403).json({ error: "Only admin can bulk edit inbox custom fields" });
    }

    const updates = Array.isArray(req.body?.updates) ? req.body.updates : [];
    if (!updates.length) {
      return res.status(400).json({ error: "updates is required." });
    }

    if (typeof store.bulkUpdateInboxCustomFields !== "function") {
      return res.status(500).json({ error: "Bulk custom field editing is not available for current store mode." });
    }

    const result = await store.bulkUpdateInboxCustomFields(updates);
    return res.status(200).json({ updated: result?.updated || 0 });
  }));

  router.delete("/:id", asyncHandler(async (req, res) => {
    try {
      const deletedInbox = await inboxService.deleteInbox({ inboxId: req.params.id, auth: req.auth });
      return res.status(200).json({ inbox: deletedInbox });
    } catch (e) {
      const status = e.message.includes("Only admin") ? 403 : e.message.includes("not found") ? 404 : 500;
      return res.status(status).json({ error: e.message });
    }
  }));

  router.get("/:id", asyncHandler(async (req, res) => {
    try {
      const result = await inboxService.getInbox({ inboxId: req.params.id, auth: req.auth });
      return res.status(200).json(result);
    } catch (e) {
      const status = e.message.includes("access") ? 403 : 404;
      return res.status(status).json({ error: e.message });
    }
  }));

  router.patch("/:id", asyncHandler(async (req, res) => {
    try {
      const updatedInbox = await inboxService.updateInbox({
        inboxId: req.params.id,
        updates: req.body,
        auth: req.auth,
      });
      return res.status(200).json({ inbox: updatedInbox });
    } catch (e) {
      const status = e.message.includes("admin") ? 403 : e.message.includes("not found") ? 404 : 500;
      return res.status(status).json({ error: e.message });
    }
  }));

  router.post("/:id/connect-channel", asyncHandler(async (req, res) => {
    const channelId = req.body.channel_id;
    if (!channelId || !String(channelId).trim()) {
      return res.status(400).json({ error: "channel_id is required." });
    }

    try {
      const result = await inboxService.connectChannel({ inboxId: req.params.id, channelId, auth: req.auth });
      return res.status(201).json(result);
    } catch (e) {
      const status = e.message.includes("admin") ? 403 : e.message.includes("not found") ? 404 : 500;
      return res.status(status).json({ error: e.message });
    }
  }));

  // NEW: Move Thread Workflow
  router.post("/:id/move-thread", asyncHandler(async (req, res) => {
    const threadId = req.body.thread_id;
    if (!threadId) {
      return res.status(400).json({ error: "thread_id is required." });
    }

    try {
      const updatedThread = await inboxService.moveThreadToInbox({ 
        threadId, 
        targetInboxId: req.params.id, 
        auth: req.auth 
      });
      return res.status(200).json({ thread: updatedThread });
    } catch (e) {
      return res.status(400).json({ error: e.message });
    }
  }));

  return router;
}

module.exports = { buildInboxRoutes };
