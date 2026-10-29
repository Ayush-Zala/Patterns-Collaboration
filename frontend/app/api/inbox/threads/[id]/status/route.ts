import { NextRequest, NextResponse } from "next/server";

import { getBackendHeaders, parseBackendJson, resolveBackendUrl } from "@/lib/backend-proxy";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const ALLOWED_STATUSES = new Set(["open", "pending", "closed", "snoozed"]);

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  try {
    const body = await request.json();
    if (!ALLOWED_STATUSES.has(body?.status)) {
      return NextResponse.json({ error: "Invalid status value." }, { status: 400 });
    }

    const backendResponse = await fetch(resolveBackendUrl(`/threads/${id}`), {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        ...(await getBackendHeaders(request)),
      },
      body: JSON.stringify({
        status: body.status,
      }),
      cache: "no-store",
    });
    const payload = await parseBackendJson(backendResponse);
    return NextResponse.json(payload, { status: backendResponse.status });
  } catch {
    return NextResponse.json({ error: "Unable to update status right now." }, { status: 503 });
  }
}
