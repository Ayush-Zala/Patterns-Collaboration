import { NextRequest, NextResponse } from "next/server";
import { getBackendHeaders, parseBackendJson, resolveBackendUrl } from "@/lib/backend-proxy";

type Context = {
  params: Promise<{ id: string }>;
};

export async function DELETE(request: NextRequest, context: Context) {
  try {
    const { id } = await context.params;
    const headers = await getBackendHeaders(request);
    const backendResponse = await fetch(resolveBackendUrl(`/contacts/lists/${id}`), {
      method: "DELETE",
      headers,
      cache: "no-store",
    });
    const payload = await parseBackendJson(backendResponse);
    return NextResponse.json(payload, { status: backendResponse.status });
  } catch {
    return NextResponse.json({ error: "Unable to delete contact list right now." }, { status: 503 });
  }
}
