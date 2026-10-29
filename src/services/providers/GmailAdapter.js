const config = require("../../config");

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

class GmailAdapter {
  constructor(authService, store, threadService) {
    this.authService = authService;
    this.store = store;
    this.threadService = threadService;
  }

  async setupWatch(channel, account) {
    let refreshed = null;
    try {
      refreshed = await this.authService.refreshIfNeeded(account);
    } catch (error) {
      const message = error instanceof Error ? error.message : "OAuth refresh failed.";
      return { error: message, code: "AUTH_REFRESH_FAILED" };
    }

    if (!config.googlePubSubTopic) {
      return { error: "GOOGLE_PUBSUB_TOPIC is required to start Gmail watch.", code: "WATCH_CONFIG_MISSING" };
    }

    const watchLabelIds = normalizeWatchLabelIds(config.googleWatchLabelIds);
    const watchResponse = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/watch", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${refreshed.access_token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        topicName: config.googlePubSubTopic,
        labelIds: watchLabelIds,
      }),
    });

    const watchPayload = await watchResponse.json();
    if (!watchResponse.ok) {
      const reason = watchPayload.error?.message || watchPayload.error || "Gmail watch setup failed.";
      return { error: reason, code: "WATCH_SETUP_FAILED" };
    }

    return {
      historyId: watchPayload.historyId ? String(watchPayload.historyId) : undefined,
      watchExpirationAt: watchPayload.expiration
        ? new Date(Number(watchPayload.expiration)).toISOString()
        : null,
      watchLabelIds
    };
  }

  async pullMessages(channel, account, cursor) {
    let refreshed = null;
    try {
      refreshed = await this.authService.refreshIfNeeded(account);
    } catch (error) {
      const message = error instanceof Error ? error.message : "OAuth refresh failed.";
      return { error: message, code: "AUTH_REFRESH_FAILED" };
    }

    if (!cursor) {
      const profileResponse = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/profile", {
        headers: {
          Authorization: `Bearer ${refreshed.access_token}`,
        },
      });
      const profilePayload = await profileResponse.json();
      if (!profileResponse.ok || !profilePayload.historyId) {
        const reason = profilePayload.error?.message || "Unable to fetch Gmail profile history cursor.";
        return { error: reason };
      }
      return {
        nextCursor: String(profilePayload.historyId),
        syncedCount: 0,
        inboundCount: 0,
        outboundCount: 0,
        note: "Initial sync cursor established. Next pull will ingest messages."
      };
    }

    const historyUrl = new URL("https://gmail.googleapis.com/gmail/v1/users/me/history");
    historyUrl.searchParams.set("startHistoryId", String(cursor));
    historyUrl.searchParams.set("historyTypes", "messageAdded");

    const historyResponse = await fetch(historyUrl.toString(), {
      headers: {
        Authorization: `Bearer ${refreshed.access_token}`,
      },
    });
    const historyPayload = await historyResponse.json();

    if (!historyResponse.ok) {
      const reason = historyPayload.error?.message || "Unable to fetch Gmail history.";
      const isHistoryExpired = String(reason).toLowerCase().includes("start historyid");
      if (isHistoryExpired && historyPayload.error?.code === 404) {
        const profileResponse = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/profile", {
          headers: {
            Authorization: `Bearer ${refreshed.access_token}`,
          },
        });
        const profilePayload = await profileResponse.json();
        if (profileResponse.ok && profilePayload.historyId) {
          return {
            nextCursor: String(profilePayload.historyId),
            syncedCount: 0,
            inboundCount: 0,
            outboundCount: 0,
            note: "History cursor expired and was reset."
          };
        }
      }
      return { error: reason, code: "SYNC_FAILED" };
    }

    const addedMessageIds = [...new Set(
      (historyPayload.history || [])
        .flatMap((entry) => entry.messagesAdded || [])
        .map((entry) => entry.message?.id)
        .filter(Boolean)
    )];

    let syncedCount = 0;
    let outboundCount = 0;
    let inboundCount = 0;
    for (const messageId of addedMessageIds) {
      const messageResponse = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(messageId)}?format=full`,
        {
          headers: {
            Authorization: `Bearer ${refreshed.access_token}`,
          },
        }
      );
      const messagePayload = await messageResponse.json();
      if (!messageResponse.ok) continue;

      const headers = new Map(
        (messagePayload.payload?.headers || []).map((header) => [String(header.name || "").toLowerCase(), header.value])
      );
      const from = headers.get("from") || "";
      const to = normalizeEmailList(headers.get("to"));
      const cc = normalizeEmailList(headers.get("cc"));
      const subject = headers.get("subject") || "(no subject)";
      const inReplyTo = headers.get("in-reply-to") || null;
      const references = headers.get("references") || null;
      const messageIdHeader = headers.get("message-id") || messagePayload.id || null;
      
      const labelIds = Array.isArray(messagePayload.labelIds)
        ? messagePayload.labelIds.map((labelId) => String(labelId).toUpperCase())
        : [];
      const direction = labelIds.includes("SENT") ? "outbound" : "inbound";

      const flattenedParts = flattenPayloadParts(messagePayload.payload);
      const textPart = flattenedParts.find((part) => String(part.mimeType).startsWith("text/plain"));
      const htmlPart = flattenedParts.find((part) => String(part.mimeType).startsWith("text/html"));
      const bodyText = textPart?.data ? decodeBase64Url(textPart.data) : "";
      const bodyHtml = htmlPart?.data ? decodeBase64Url(htmlPart.data) : "";

      const result = await this.threadService.ingestSyncedEmail({
        provider: "gmail",
        direction,
        payload: {
          channel_email: channel.email_address,
          thread_key: messagePayload.threadId || null,
          subject,
          from,
          to,
          cc,
          body_text: bodyText,
          body_html: bodyHtml,
          provider_message_id: messageIdHeader,
          inReplyTo,
          references,
          received_at: messagePayload.internalDate
            ? new Date(Number(messagePayload.internalDate)).toISOString()
            : new Date().toISOString(),
          attachments: [],
        },
      });
      
      if (result?.error || result?.duplicate) continue;
      syncedCount += 1;
      if (direction === "outbound") outboundCount += 1;
      else inboundCount += 1;
    }

    const nextCursor = historyPayload.historyId
      ? String(historyPayload.historyId)
      : (historyPayload.history || []).at(-1)?.id
        ? String((historyPayload.history || []).at(-1).id)
        : String(cursor);

    return { nextCursor, syncedCount, inboundCount, outboundCount };
  }

  parseWebhookPayload(payload) {
    let decoded = null;
    try {
      decoded = JSON.parse(decodeBase64Url(payload.message.data));
    } catch {
      return { error: "Invalid Gmail push payload format." };
    }
    
    return {
      emailAddress: String(decoded.emailAddress || "").toLowerCase(),
      historyId: decoded.historyId ? String(decoded.historyId) : null
    };
  }
}

module.exports = { GmailAdapter };
