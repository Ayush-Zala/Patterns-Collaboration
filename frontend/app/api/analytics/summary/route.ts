import { NextRequest, NextResponse } from "next/server";
import { getBackendHeaders, parseBackendJson, resolveBackendUrl } from "@/lib/backend-proxy";

export async function GET(request: NextRequest) {
  try {
    const headers = await getBackendHeaders(request);

    // We expect getBackendHeaders to resolve the active organization and put it in x-org-id
    const orgId = headers["x-org-id"];
    const url = resolveBackendUrl(`/analytics-v2/summary${orgId ? `?orgId=${orgId}` : ""}`);

    const backendResponse = await fetch(url, {
      method: "GET",
      headers,
      cache: "no-store",
    });

    const payload = await parseBackendJson(backendResponse);
    return NextResponse.json(payload, { status: backendResponse.status });
  } catch (error) {
    return NextResponse.json({ error: "Unable to load analytics right now." }, { status: 503 });
  }
}
