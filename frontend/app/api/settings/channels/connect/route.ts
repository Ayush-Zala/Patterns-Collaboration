import { NextRequest, NextResponse } from "next/server";

import { getBackendHeaders, parseBackendJson, resolveBackendUrl } from "@/lib/backend-proxy";

type ConnectBody = {
  provider?: "gmail" | "outlook" | "whatsapp";
  account_email?: string;
  channel_name?: string;
  inbox_id?: string;
  channel_id?: string;
  oauth_code?: string;
  oauth_state?: string;
  redirect_uri?: string;
};

const SUPPORTED_PROVIDERS = new Set(["gmail", "outlook"]);

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ConnectBody;
    const provider = body.provider || "gmail";
    const accountEmail = body.account_email?.trim().toLowerCase();
    const channelName = body.channel_name?.trim();
    const inboxId = body.inbox_id?.trim();
    const channelId = body.channel_id?.trim();
    const oauthCode = body.oauth_code?.trim();
    const oauthState = body.oauth_state?.trim();
    const redirectUri = body.redirect_uri?.trim();

    if (!SUPPORTED_PROVIDERS.has(provider)) {
      return NextResponse.json({ error: "Provider is not supported yet in this prototype." }, { status: 400 });
    }
    if (provider === "gmail" && !oauthCode) {
      return NextResponse.json({ error: "oauth_code is required for Gmail connect." }, { status: 400 });
    }
    if (provider !== "gmail" && !accountEmail) {
      return NextResponse.json({ error: "account_email is required." }, { status: 400 });
    }

    console.log(`[API Connect] Starting OAuth callback for provider: ${provider}`);
    const authResponse = await fetch(resolveBackendUrl("/auth/callback"), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(await getBackendHeaders(request)),
      },
      body: JSON.stringify({
        provider,
        email: accountEmail,
        code: oauthCode || "mock-connect-flow",
        state: oauthState,
        redirect_uri: redirectUri,
      }),
      cache: "no-store",
    });
    console.log(`[API Connect] Auth response status: ${authResponse.status}`);
    if (!authResponse.ok) {
      const authPayload = await parseBackendJson(authResponse);
      return NextResponse.json(authPayload, { status: authResponse.status });
    }
    const accountPayload = await parseBackendJson(authResponse);

    const oauthAccount = (accountPayload as { account?: { id?: string; email?: string } }).account || null;
    const resolvedEmail = provider === "gmail" ? oauthAccount?.email?.toLowerCase?.() : accountEmail;
    console.log(`[API Connect] Resolved email: ${resolvedEmail}`);
    if (!resolvedEmail) {
      return NextResponse.json({ error: "Unable to resolve account email from OAuth response." }, { status: 502 });
    }

    let channelPayload = null;
    if (channelId) {
      console.log(`[API Connect] Reconnecting channel: ${channelId}`);
      const reconnectResponse = await fetch(resolveBackendUrl(`/channels/${channelId}/oauth-account`), {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          ...(await getBackendHeaders(request)),
        },
        body: JSON.stringify({
          oauth_account_id: oauthAccount?.id || null,
          is_active: true,
        }),
        cache: "no-store",
      });
      console.log(`[API Connect] Reconnect response status: ${reconnectResponse.status}`);
      channelPayload = await parseBackendJson(reconnectResponse);
      if (!reconnectResponse.ok) {
        return NextResponse.json(channelPayload, { status: reconnectResponse.status });
      }
    } else {
      console.log(`[API Connect] Creating new channel...`);
      const generatedName = channelName || `${resolvedEmail.split("@")[0]} ${provider} channel`;
      const channelResponse = await fetch(resolveBackendUrl("/channels"), {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(await getBackendHeaders(request)),
        },
        body: JSON.stringify({
          name: generatedName,
          email_address: resolvedEmail,
          provider,
          oauth_account_id: oauthAccount?.id || null,
        }),
        cache: "no-store",
      });
      console.log(`[API Connect] Channel create response status: ${channelResponse.status}`);
      channelPayload = await parseBackendJson(channelResponse);
      if (!channelResponse.ok) {
        return NextResponse.json(channelPayload, { status: channelResponse.status });
      }
    }

    if (inboxId) {
      const channelId = (channelPayload as { channel?: { id?: string } }).channel?.id;
      console.log(`[API Connect] Connecting channel ${channelId} to inbox ${inboxId}`);
      if (!channelId) {
        return NextResponse.json({ error: "Connected channel payload is missing id." }, { status: 502 });
      }

      const connectResponse = await fetch(resolveBackendUrl(`/inboxes/${inboxId}/connect-channel`), {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(await getBackendHeaders(request)),
        },
        body: JSON.stringify({
          channel_id: channelId,
        }),
        cache: "no-store",
      });
      console.log(`[API Connect] Inbox connect response status: ${connectResponse.status}`);
      if (!connectResponse.ok) {
        const connectPayload = await parseBackendJson(connectResponse);
        return NextResponse.json(connectPayload, { status: connectResponse.status });
      }
    }

    console.log(`[API Connect] Success! Returning payload.`);
    return NextResponse.json(
      {
        account: (accountPayload as { account?: unknown }).account || null,
        channel: (channelPayload as { channel?: unknown }).channel || null,
        inbox_id: inboxId || null,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error(`[API Connect] Fatal error:`, err);
    return NextResponse.json({ error: "Unable to connect channel right now." }, { status: 503 });
  }
}
