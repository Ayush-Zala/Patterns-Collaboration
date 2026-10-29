import { NextRequest, NextResponse } from "next/server";

import { getBackendHeaders, parseBackendJson, resolveBackendUrl } from "@/lib/backend-proxy";

type SignatureCreateBody = {
  name?: string;
  channel_ids?: string[];
};

export async function GET(request: NextRequest) {
  try {
    const backendResponse = await fetch(resolveBackendUrl("/signatures"), {
      method: "GET",
      headers: await getBackendHeaders(request),
      cache: "no-store",
    });
    const payload = await parseBackendJson(backendResponse);
    return NextResponse.json(payload, { status: backendResponse.status });
  } catch {
    return NextResponse.json({ error: "Unable to load signatures right now." }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SignatureCreateBody;
    const name = body.name?.trim();
    const channelIds = Array.isArray(body.channel_ids)
      ? body.channel_ids.map((id) => id.trim()).filter(Boolean)
      : [];

    if (!name) {
      return NextResponse.json({ error: "name is required." }, { status: 400 });
    }
    if (channelIds.length === 0) {
      return NextResponse.json({ error: "Select at least one channel." }, { status: 400 });
    }

    const backendResponse = await fetch(resolveBackendUrl("/signatures"), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(await getBackendHeaders(request)),
      },
      body: JSON.stringify({
        name,
        channel_ids: channelIds,
      }),
      cache: "no-store",
    });
    const payload = await parseBackendJson(backendResponse);
    return NextResponse.json(payload, { status: backendResponse.status });
  } catch {
    return NextResponse.json({ error: "Unable to create signature right now." }, { status: 503 });
  }
}
