const express = require("express");
const { asyncHandler } = require("../utils/asyncHandler");
const { canAccessChannel, getAccessibleChannelIds, resolveDelegationScope } = require("../services/delegationAccess");

function isOAuthExpired(account) {
  if (!account?.expires_at) return true;
  const expiresAt = new Date(account.expires_at).getTime();
  return Number.isNaN(expiresAt) || expiresAt <= Date.now();
}

function isWatchExpired(syncState) {
  if (!syncState?.watch_expiration_at) return false;
  const expiresAt = new Date(syncState.watch_expiration_at).getTime();
  return !Number.isNaN(expiresAt) && expiresAt <= Date.now();
}

function requiresOAuthReconnect(syncState) {
  const lastError = String(syncState?.last_error || "").toLowerCase();
  return syncState?.status === "auth_error"
    || lastError.includes("invalid_grant")
    || lastError.includes("oauth refresh failed");
}

async function enrichChannel(store, channel) {
  const syncState = typeof store.getChannelSyncState === "function"
    ? await store.getChannelSyncState(channel.id)
    : null;
  const normalizedSyncState = syncState
    ? {
        ...syncState,
        status: isWatchExpired(syncState) ? "watch_expired" : syncState.status,
        sync_enabled: isWatchExpired(syncState) ? false : syncState.sync_enabled,
      }
    : null;

  const oauthAccount = channel.oauth_account_id && typeof store.getOAuthAccountById === "function"
    ? await store.getOAuthAccountById(channel.oauth_account_id)
    : null;

  const oauthStatus = !channel.oauth_account_id || !oauthAccount
    ? "disconnected"
    : requiresOAuthReconnect(normalizedSyncState)
      ? "reauth_required"
      : isOAuthExpired(oauthAccount) && !oauthAccount.refresh_token
      ? "expired"
      : "connected";

  return {
    ...channel,
    oauth_status: oauthStatus,
    sync_state: normalizedSyncState,
  };
}

function buildChannelRoutes({ store, authService, emailSyncService }) {
  const router = express.Router();

  router.get("/", asyncHandler(async (req, res) => {
    const channels = await store.listChannels();
    const scope = await resolveDelegationScope({ store, auth: req.auth });
    const allowedChannelIds = scope.has_full_access
      ? null
      : new Set(await getAccessibleChannelIds({ store, scope }));
    const visibleChannels = scope.has_full_access
      ? channels
      : channels.filter((channel) => allowedChannelIds.has(channel.id));

    const enriched = [];
    for (const channel of visibleChannels) {
      enriched.push(await enrichChannel(store, channel));
    }
    res.status(200).json({ channels: enriched, access_scope: scope });
  }));

  router.post("/", asyncHandler(async (req, res) => {
    if (req.auth.role !== "admin") {
      return res.status(403).json({ error: "Only admin can create channels" });
    }

    const { name, email_address, provider, oauth_account_id } = req.body;
    if (!name || !email_address) {
      return res.status(400).json({ error: "name and email_address are required" });
    }

    const existing = await store.getChannelByEmail(email_address);
    if (existing) {
      return res.status(409).json({ error: "Channel already exists for this email address." });
    }

    const channel = await store.createChannel({ name, email_address, provider, oauth_account_id });
    if (typeof store.logActivity === "function") {
      await store.logActivity({
        type: "channel_created",
        actor_id: req.auth.user_id,
        entity_type: "channel",
        entity_id: channel.id,
        metadata: {
          provider: channel.provider,
          email_address: channel.email_address,
        },
      });
    }
    return res.status(201).json({ channel });
  }));

  router.patch("/:id/oauth-account", asyncHandler(async (req, res) => {
    if (req.auth.role !== "admin") {
      return res.status(403).json({ error: "Only admin can reconnect channels" });
    }
    if (typeof store.updateChannelOAuthAccount !== "function") {
      return res.status(500).json({ error: "Channel OAuth update is not available for current store mode." });
    }

    const channel = await store.getChannel(req.params.id);
    if (!channel) {
      return res.status(404).json({ error: "Channel not found." });
    }

    const oauthAccountId = req.body.oauth_account_id || null;
    const updated = await store.updateChannelOAuthAccount({
      channel_id: channel.id,
      oauth_account_id: oauthAccountId,
      is_active: req.body.is_active,
    });
    if (oauthAccountId && typeof store.upsertChannelSyncState === "function") {
      await store.upsertChannelSyncState(channel.id, {
        provider: channel.provider,
        sync_enabled: false,
        status: "idle",
        last_error: null,
      });
    }

    if (typeof store.logActivity === "function") {
      await store.logActivity({
        type: "channel_reconnected",
        actor_id: req.auth.user_id,
        entity_type: "channel",
        entity_id: channel.id,
        metadata: {
          oauth_account_id: oauthAccountId,
        },
      });
    }

    return res.status(200).json({ channel: updated });
  }));

  router.post("/:id/reconnect/start", asyncHandler(async (req, res) => {
    if (req.auth.role !== "admin") {
      return res.status(403).json({ error: "Only admin can reconnect channels" });
    }
    const channel = await store.getChannel(req.params.id);
    if (!channel) {
      return res.status(404).json({ error: "Channel not found." });
    }
    if (!authService) {
      return res.status(500).json({ error: "Auth service unavailable." });
    }

    if (channel.provider !== "gmail") {
      return res.status(400).json({ error: "Reconnect flow currently supported for Gmail channels only." });
    }

    const data = authService.startOAuth({
      provider: channel.provider,
      redirectUri: req.body.redirect_uri,
    });
    return res.status(200).json(data);
  }));

  router.post("/:id/sync/start", asyncHandler(async (req, res) => {
    if (req.auth.role !== "admin") {
      return res.status(403).json({ error: "Only admin can start sync" });
    }
    if (!emailSyncService) {
      return res.status(500).json({ error: "Email sync service unavailable." });
    }

    const scope = await resolveDelegationScope({ store, auth: req.auth });
    const canAccess = await canAccessChannel({ store, scope, channelId: req.params.id });
    if (!canAccess) {
      return res.status(403).json({ error: "You do not have access to this channel." });
    }

    const result = await emailSyncService.startChannelSync({
      channelId: req.params.id,
      actorId: req.auth.user_id,
    });
    if (result.error) {
      return res.status(400).json(result);
    }
    return res.status(200).json(result);
  }));

  router.post("/:id/sync/pull", asyncHandler(async (req, res) => {
    if (req.auth.role !== "admin") {
      return res.status(403).json({ error: "Only admin can trigger sync pull" });
    }
    if (!emailSyncService) {
      return res.status(500).json({ error: "Email sync service unavailable." });
    }

    const scope = await resolveDelegationScope({ store, auth: req.auth });
    const canAccess = await canAccessChannel({ store, scope, channelId: req.params.id });
    if (!canAccess) {
      return res.status(403).json({ error: "You do not have access to this channel." });
    }

    const result = await emailSyncService.pullChannelNow({
      channelId: req.params.id,
      actorId: req.auth.user_id,
      startHistoryId: req.body.start_history_id || null,
    });
    if (result.error) {
      return res.status(400).json(result);
    }
    return res.status(200).json(result);
  }));

  return router;
}

module.exports = { buildChannelRoutes };
