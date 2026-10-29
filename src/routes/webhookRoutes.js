const express = require("express");
const { asyncHandler } = require("../utils/asyncHandler");

function buildWebhookRoutes({ systemEvents }) {
  const router = express.Router();

  router.post("/gmail", asyncHandler(async (req, res) => {
    await systemEvents.dispatch("inbound:webhook", { provider: "gmail", payload: req.body });
    return res.status(202).json({ ok: true });
  }));

  router.post("/outlook", asyncHandler(async (req, res) => {
    await systemEvents.dispatch("inbound:webhook", { provider: "outlook", payload: req.body });
    return res.status(202).json({ ok: true });
  }));

  router.post("/poll", asyncHandler(async (req, res) => {
    const provider = req.body.provider || "gmail";
    const messages = Array.isArray(req.body.messages) ? req.body.messages : [];
    const results = await emailSyncService.runPollingCycle({ provider, messages });
    return res.status(200).json({ count: results.length, results });
  }));

  return router;
}

module.exports = { buildWebhookRoutes };
