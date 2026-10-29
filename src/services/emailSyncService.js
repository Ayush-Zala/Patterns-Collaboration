const config = require("../config");

function decodeBase64Url(value) {
  if (!value) return "";
  const normalized = String(value).replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  return Buffer.from(padded, "base64").toString("utf8");
}

function normalizeEmailList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  return String(value)
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function normalizeWatchLabelIds(value) {
  const configured = String(value || "INBOX,SENT")
    .split(",")
    .map((entry) => entry.trim().toUpperCase())
    .filter(Boolean);
  return configured.length > 0 ? [...new Set(configured)] : ["INBOX", "SENT"];
}

function flattenPayloadParts(payload, output = []) {
  if (!payload) return output;
  if (payload.body?.data) {
    output.push({
      mimeType: payload.mimeType || "",
      data: payload.body.data,
    });
  }
  for (const part of payload.parts || []) {
    flattenPayloadParts(part, output);
  }
  return output;
}

const { GmailAdapter } = require("./providers/GmailAdapter");

class EmailSyncService {
  constructor({ threadService, store, authService }) {
    this.threadService = threadService;
    this.store = store;
    this.authService = authService;
    this.gmailAdapter = new GmailAdapter(authService, store, threadService);
  }

  async processWebhook({ provider, payload }) {
    if (provider === "gmail" && payload?.message?.data) {
      return this.processGmailPushNotification(payload);
    }
    return this.threadService.ingestInboundEmail({ provider, payload });
  }

  async runPollingCycle({ provider, messages }) {
    const processed = [];
    for (const payload of messages || []) {
      const result = await this.processWebhook({ provider, payload });
      processed.push(result);
    }
    return processed;
  }

  async startChannelSync({ channelId, actorId }) {
    const channel = await this.store.getChannel(channelId);
    if (!channel) return { error: "Channel not found." };
    if (channel.provider !== "gmail") {
      return { error: "Realtime sync start is currently supported for Gmail channels only." };
    }

    const account = await this.store.getOAuthAccountById(channel.oauth_account_id);
    if (!account) return { error: "OAuth account is missing. Reconnect this channel first." };

    const result = await this.gmailAdapter.setupWatch(channel, account);
    if (result.error) {
      await this.store.upsertChannelSyncState(channel.id, {
        provider: "gmail",
        sync_enabled: false,
        status: "watch_error",
        last_error: result.error,
      });
      return result;
    }

    const syncState = await this.store.upsertChannelSyncState(channel.id, {
      provider: "gmail",
      sync_enabled: true,
      status: "watching",
      cursor: result.historyId,
      watch_expiration_at: result.watchExpirationAt,
      last_error: null,
    });

    if (typeof this.store.logActivity === "function") {
      await this.store.logActivity({
        type: "channel_sync_started",
        actor_id: actorId || null,
        entity_type: "channel",
        entity_id: channel.id,
        metadata: {
          provider: channel.provider,
          email_address: channel.email_address,
          watch_label_ids: result.watchLabelIds,
          history_id: result.historyId || null,
          watch_expiration_at: result.watchExpirationAt,
        },
      });
    }

    return {
      channel_id: channel.id,
      provider: channel.provider,
      watch_label_ids: result.watchLabelIds,
      sync_state: syncState,
      history_id: result.historyId || null,
      watch_expiration_at: result.watchExpirationAt,
    };
  }

  async pullChannelNow({ channelId, actorId, startHistoryId }) {
    const channel = await this.store.getChannel(channelId);
    if (!channel) return { error: "Channel not found." };
    if (channel.provider !== "gmail") return { error: "Pull sync is currently supported for Gmail channels only." };

    const syncState = await this.store.getChannelSyncState(channel.id);
    const cursor = startHistoryId || syncState?.cursor || null;
    const account = await this.store.getOAuthAccountById(channel.oauth_account_id);
    if (!account) return { error: "OAuth account is missing. Reconnect this channel first." };

    const result = await this.gmailAdapter.pullMessages(channel, account, cursor);
    if (result.error) {
      await this.store.upsertChannelSyncState(channel.id, {
        provider: "gmail",
        status: "sync_error",
        last_error: result.error,
      });
      return result;
    }

    const nextState = await this.store.upsertChannelSyncState(channel.id, {
      provider: "gmail",
      sync_enabled: true,
      status: "watching",
      cursor: result.nextCursor,
      last_synced_at: new Date().toISOString(),
      last_error: null,
    });

    if (typeof this.store.logActivity === "function") {
      await this.store.logActivity({
        type: "channel_sync_pull",
        actor_id: actorId || null,
        entity_type: "channel",
        entity_id: channel.id,
        metadata: {
          provider: "gmail",
          synced_count: result.syncedCount,
          inbound_count: result.inboundCount,
          outbound_count: result.outboundCount,
          start_history_id: cursor,
          next_history_id: result.nextCursor,
        },
      });
    }

    return {
      channel_id: channel.id,
      provider: "gmail",
      synced_count: result.syncedCount,
      inbound_count: result.inboundCount,
      outbound_count: result.outboundCount,
      sync_state: nextState,
      note: result.note,
    };
  }

  async processGmailPushNotification(payload) {
    const parsed = this.gmailAdapter.parseWebhookPayload(payload);
    if (parsed.error) return parsed;

    const channel = await this.store.getChannelByEmail(parsed.emailAddress);
    if (!channel) return { error: `No configured channel for ${parsed.emailAddress}` };

    const state = await this.store.getChannelSyncState(channel.id);
    if (!state?.cursor && parsed.historyId) {
      const nextState = await this.store.upsertChannelSyncState(channel.id, {
        provider: "gmail",
        sync_enabled: true,
        status: "watching",
        cursor: parsed.historyId,
        last_error: null,
      });
      return {
        provider: "gmail",
        channel_id: channel.id,
        synced_count: 0,
        sync_state: nextState,
        note: "Webhook received. Initial history cursor established.",
      };
    }

    return this.pullChannelNow({
      channelId: channel.id,
      actorId: null,
      startHistoryId: state?.cursor || null,
    });
  }
}

module.exports = { EmailSyncService };
