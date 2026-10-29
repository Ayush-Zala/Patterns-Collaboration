import { NextRequest, NextResponse } from "next/server";
import { getBackendHeaders, parseBackendJson, resolveBackendUrl } from "@/lib/backend-proxy";

export async function GET(request: NextRequest) {
  try {
    const headers = await getBackendHeaders(request);
    const backendResponse = await fetch(resolveBackendUrl("/workspaces"), {
      method: "GET",
      headers,
      cache: "no-store",
    });
    const payload = await parseBackendJson(backendResponse);
    return NextResponse.json(payload, { status: backendResponse.status });
  } catch (error) {
    console.error("[API] Error fetching workspaces:", error);
    return NextResponse.json({ error: "Unable to load workspaces." }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const headers = await getBackendHeaders(request);
    const backendResponse = await fetch(resolveBackendUrl("/workspaces"), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...headers,
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const payload = await parseBackendJson(backendResponse);
    return NextResponse.json(payload, { status: backendResponse.status });
  } catch (error) {
    console.error("[API] Error creating workspace:", error);
    return NextResponse.json({ error: "Unable to create workspace." }, { status: 503 });
  }
}
