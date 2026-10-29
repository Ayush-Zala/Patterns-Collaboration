import { NextRequest, NextResponse } from "next/server";

import { getBackendHeaders, parseBackendJson, resolveBackendUrl } from "@/lib/backend-proxy";

type InboxCreateBody = {
  name?: string;
  description?: string;
};

export async function GET(request: NextRequest) {
  try {
    const headers = await getBackendHeaders(request);
    const backendResponse = await fetch(resolveBackendUrl("/inboxes"), {
      method: "GET",
      headers,
      cache: "no-store",
    });
    const payload = await parseBackendJson(backendResponse);
    return NextResponse.json(payload, { status: backendResponse.status });
  } catch {
    return NextResponse.json({ error: "Unable to load inboxes right now." }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as InboxCreateBody;
    const name = body.name?.trim();
    const description = body.description?.trim();
    if (!name) {
      return NextResponse.json({ error: "name is required." }, { status: 400 });
    }

    const authHeaders = await getBackendHeaders(request);
    const backendResponse = await fetch(resolveBackendUrl("/inboxes"), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...authHeaders,
      },
      body: JSON.stringify({
        name,
        description: description || "",
      }),
      cache: "no-store",
    });
    const payload = await parseBackendJson(backendResponse);
    return NextResponse.json(payload, { status: backendResponse.status });
  } catch {
    return NextResponse.json({ error: "Unable to create inbox right now." }, { status: 503 });
  }
}
