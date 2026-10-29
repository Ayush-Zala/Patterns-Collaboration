import { NextRequest, NextResponse } from "next/server";

import { getBackendHeaders, parseBackendJson, resolveBackendUrl } from "@/lib/backend-proxy";

export async function GET(request: NextRequest) {
  const limit = request.nextUrl.searchParams.get("limit") || "100";

  try {
    const backendResponse = await fetch(resolveBackendUrl(`/activity?limit=${encodeURIComponent(limit)}`), {
      method: "GET",
      headers: await getBackendHeaders(request),
      cache: "no-store",
    });
    const payload = await parseBackendJson(backendResponse);
    return NextResponse.json(payload, { status: backendResponse.status });
  } catch {
    return NextResponse.json({ error: "Unable to load activity logs right now." }, { status: 503 });
  }
}
