import { NextRequest, NextResponse } from "next/server";

import { getBackendHeaders, resolveBackendUrl, parseBackendJson } from "@/lib/backend-proxy";

export async function GET(request: NextRequest) {
  try {
    const backendResponse = await fetch(resolveBackendUrl("/delegations/me/scope"), {
      method: "GET",
      headers: await getBackendHeaders(request),
      cache: "no-store",
    });
    const payload = await parseBackendJson(backendResponse);
    return NextResponse.json(payload, { status: backendResponse.status });
  } catch {
    return NextResponse.json({ error: "Unable to load delegation access scope right now." }, { status: 503 });
  }
}
