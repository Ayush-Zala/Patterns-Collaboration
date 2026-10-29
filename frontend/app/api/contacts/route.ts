import { NextRequest, NextResponse } from "next/server";
import { getBackendHeaders, parseBackendJson, resolveBackendUrl } from "@/lib/backend-proxy";

export async function GET(request: NextRequest) {
  try {
    const headers = await getBackendHeaders(request);
    const search = request.nextUrl.searchParams.toString();
    const backendResponse = await fetch(resolveBackendUrl(`/contacts${search ? `?${search}` : ""}`), {
      method: "GET",
      headers,
      cache: "no-store",
    });
    const payload = await parseBackendJson(backendResponse);
    return NextResponse.json(payload, { status: backendResponse.status });
  } catch {
    return NextResponse.json({ error: "Unable to load contacts right now." }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const headers = await getBackendHeaders(request);
    const backendResponse = await fetch(resolveBackendUrl("/contacts"), {
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
  } catch {
    return NextResponse.json({ error: "Unable to create contact right now." }, { status: 503 });
  }
}
