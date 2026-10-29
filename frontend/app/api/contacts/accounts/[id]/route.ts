import { NextRequest, NextResponse } from "next/server";
import { getBackendHeaders, parseBackendJson, resolveBackendUrl } from "@/lib/backend-proxy";

type Context = {
  params: Promise<{ id: string }>;
};

export async function DELETE(request: NextRequest, context: Context) {
  try {
    const { id } = await context.params;
    const headers = await getBackendHeaders(request);
    const backendResponse = await fetch(resolveBackendUrl(`/contacts/accounts/${id}`), {
      method: "DELETE",
      headers,
      cache: "no-store",
    });
    const payload = await parseBackendJson(backendResponse);
    return NextResponse.json(payload, { status: backendResponse.status });
  } catch {
    return NextResponse.json({ error: "Unable to delete account right now." }, { status: 503 });
  }
}

export async function PATCH(request: NextRequest, context: Context) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const headers = await getBackendHeaders(request);
    const backendResponse = await fetch(resolveBackendUrl(`/contacts/accounts/${id}`), {
      method: "PATCH",
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
    return NextResponse.json({ error: "Unable to update account right now." }, { status: 503 });
  }
}
