const express = require("express");
const { asyncHandler } = require("../utils/asyncHandler");

function buildSignatureRoutes({ store }) {
  const router = express.Router();

  router.get("/", asyncHandler(async (_req, res) => {
    const signatureRows = await store.listSignatures();
    const signatures = await Promise.all(signatureRows.map(async (signature) => ({
      ...signature,
      channels: (await Promise.all(signature.channel_ids.map((channelId) => store.getChannel(channelId)))).filter(Boolean),
    })));
    return res.status(200).json({ signatures });
  }));

  router.post("/", asyncHandler(async (req, res) => {
    const name = req.body.name ? String(req.body.name).trim() : "";
    const channelIds = Array.isArray(req.body.channel_ids)
      ? [...new Set(req.body.channel_ids.map((id) => String(id).trim()).filter(Boolean))]
      : [];

    if (!name) {
      return res.status(400).json({ error: "name is required." });
    }
    if (channelIds.length === 0) {
      return res.status(400).json({ error: "Select at least one channel for channel access." });
    }

    const channels = await Promise.all(channelIds.map((channelId) => store.getChannel(channelId)));
    if (channels.some((channel) => !channel)) {
      return res.status(400).json({ error: "One or more selected channel_ids are invalid." });
    }

    const displayName = req.auth.user?.name || "Team Member";
    const senderFromLines = channels.map((channel) => `${displayName} <${channel.email_address}>`);

    const signature = await store.createSignature({
      name,
      display_name: displayName,
      sender_from_lines: senderFromLines,
      channel_ids: channelIds,
      created_by: req.auth.user_id,
    });

    return res.status(201).json({
      signature: {
        ...signature,
        channels,
      },
    });
  }));

  return router;
}

module.exports = { buildSignatureRoutes };
