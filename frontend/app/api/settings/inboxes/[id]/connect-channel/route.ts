import { NextRequest, NextResponse } from "next/server";

import { getBackendHeaders, parseBackendJson, resolveBackendUrl } from "@/lib/backend-proxy";

type ConnectBody = {
  channel_id?: string;
};

type Params = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: NextRequest, context: Params) {
  const { id } = await context.params;

  try {
    const body = (await request.json()) as ConnectBody;
    const channelId = body.channel_id?.trim();

    if (!channelId) {
      return NextResponse.json({ error: "channel_id is required." }, { status: 400 });
    }

    const backendResponse = await fetch(resolveBackendUrl(`/inboxes/${id}/connect-channel`), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(await getBackendHeaders(request)),
      },
      body: JSON.stringify({ channel_id: channelId }),
      cache: "no-store",
    });
    const payload = await parseBackendJson(backendResponse);
    return NextResponse.json(payload, { status: backendResponse.status });
  } catch {
    return NextResponse.json({ error: "Unable to connect channel right now." }, { status: 503 });
  }
}
