import { NextRequest, NextResponse } from "next/server";

import { getBackendHeaders, parseBackendJson, resolveBackendUrl } from "@/lib/backend-proxy";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

export async function DELETE(request: NextRequest, context: Params) {
  const { id } = await context.params;

  try {
    const backendResponse = await fetch(resolveBackendUrl(`/delegations/${id}`), {
      method: "DELETE",
      headers: await getBackendHeaders(request),
      cache: "no-store",
    });
    const payload = await parseBackendJson(backendResponse);
    return NextResponse.json(payload, { status: backendResponse.status });
  } catch {
    return NextResponse.json({ error: "Unable to delete delegation right now." }, { status: 503 });
  }
}
