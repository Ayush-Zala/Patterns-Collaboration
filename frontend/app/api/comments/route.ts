import { NextRequest, NextResponse } from "next/server";

import { getBackendHeaders, parseBackendJson, resolveBackendUrl } from "@/lib/backend-proxy";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const thread_id = body?.thread_id;
    const text = typeof body?.body === "string" ? body.body.trim() : "";

    if (!thread_id || !text) {
      return NextResponse.json({ error: "thread_id and body are required." }, { status: 400 });
    }

    const backendResponse = await fetch(resolveBackendUrl("/comments"), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(await getBackendHeaders(request)),
      },
      body: JSON.stringify({
        thread_id,
        body: text,
      }),
      cache: "no-store",
    });

    const payload = await parseBackendJson(backendResponse);
    return NextResponse.json(payload, { status: backendResponse.status });
  } catch (error) {
    console.error("Comment proxy error:", error);
    return NextResponse.json({ error: "Unable to post comment right now." }, { status: 503 });
  }
}
