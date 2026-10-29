import { NextRequest, NextResponse } from "next/server";

import { getBackendHeaders, parseBackendJson, resolveBackendUrl } from "@/lib/backend-proxy";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  try {
    const body = await request.json();
    const text = typeof body?.body_text === "string" ? body.body_text.trim() : "";
    if (!text) {
      return NextResponse.json({ error: "body_text is required." }, { status: 400 });
    }

    const backendResponse = await fetch(resolveBackendUrl(`/threads/${id}/reply`), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(await getBackendHeaders(request)),
      },
      body: JSON.stringify({
        from: body?.from || "",
        sender_name: body?.sender_name || null,
        to: Array.isArray(body?.to) ? body.to : [],
        cc: Array.isArray(body?.cc) ? body.cc : [],
        body_text: text,
        body_html: typeof body?.body_html === "string" ? body.body_html : "",
        attachments: Array.isArray(body?.attachments) ? body.attachments : [],
      }),
      cache: "no-store",
    });
    const payload = await parseBackendJson(backendResponse);
    return NextResponse.json(payload, { status: backendResponse.status });
  } catch (err) {
    console.error("Reply API Error:", err);
    return NextResponse.json({ 
      error: "Unable to send reply right now.",
      details: err instanceof Error ? err.message : String(err)
    }, { status: 503 });
  }
}
