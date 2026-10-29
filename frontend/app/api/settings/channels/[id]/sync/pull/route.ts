import { NextRequest, NextResponse } from "next/server";

import { getBackendHeaders, parseBackendJson, resolveBackendUrl } from "@/lib/backend-proxy";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

type PullBody = {
  start_history_id?: string;
};

export async function POST(request: NextRequest, context: Params) {
  const { id } = await context.params;

  try {
    const body = (await request.json().catch(() => ({}))) as PullBody;
    const headers = await getBackendHeaders(request);

    const backendResponse = await fetch(resolveBackendUrl(`/channels/${id}/sync/pull`), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...headers,
      },
      body: JSON.stringify({
        start_history_id: body.start_history_id,
      }),
      cache: "no-store",
    });
    const payload = await parseBackendJson(backendResponse);
    return NextResponse.json(payload, { status: backendResponse.status });
  } catch {
    return NextResponse.json({ error: "Unable to pull channel sync right now." }, { status: 503 });
  }
}
