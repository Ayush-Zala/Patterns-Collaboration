import { NextRequest, NextResponse } from "next/server";

import { getBackendHeaders, parseBackendJson, resolveBackendUrl } from "@/lib/backend-proxy";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(request: NextRequest, context: Params) {
  const { id } = await context.params;

  try {
    const headers = await getBackendHeaders(request);
    const backendResponse = await fetch(resolveBackendUrl(`/inboxes/${id}`), {
      method: "GET",
      headers,
      cache: "no-store",
    });
    const payload = await parseBackendJson(backendResponse);
    return NextResponse.json(payload, { status: backendResponse.status });
  } catch (error) {
    console.error("Error in GET /inboxes/[id]:", error);
    return NextResponse.json({ error: "Unable to load inbox details right now." }, { status: 503 });
  }
}

export async function DELETE(request: NextRequest, context: Params) {
  const { id } = await context.params;

  try {
    const headers = await getBackendHeaders(request);
    const backendResponse = await fetch(resolveBackendUrl(`/inboxes/${id}`), {
      method: "DELETE",
      headers,
      cache: "no-store",
    });
    const payload = await parseBackendJson(backendResponse);
    return NextResponse.json(payload, { status: backendResponse.status });
  } catch {
    return NextResponse.json({ error: "Unable to delete inbox right now." }, { status: 503 });
  }
}

export async function PATCH(request: NextRequest, context: Params) {
  const { id } = await context.params;

  try {
    const body = await request.json();
    const headers = await getBackendHeaders(request);
    const backendResponse = await fetch(resolveBackendUrl(`/inboxes/${id}`), {
      method: "PATCH",
      headers: {
        ...headers,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const payload = await parseBackendJson(backendResponse);
    return NextResponse.json(payload, { status: backendResponse.status });
  } catch {
    return NextResponse.json({ error: "Unable to update inbox right now." }, { status: 503 });
  }
}
