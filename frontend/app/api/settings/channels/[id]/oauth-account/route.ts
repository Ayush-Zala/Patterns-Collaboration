import { NextRequest, NextResponse } from "next/server";

import { getBackendHeaders, parseBackendJson, resolveBackendUrl } from "@/lib/backend-proxy";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

type OAuthPatchBody = {
  oauth_account_id?: string | null;
  is_active?: boolean;
};

export async function PATCH(request: NextRequest, context: Params) {
  const { id } = await context.params;

  try {
    const body = (await request.json()) as OAuthPatchBody;
    const headers = await getBackendHeaders(request);
    const backendResponse = await fetch(resolveBackendUrl(`/channels/${id}/oauth-account`), {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        ...headers,
      },
      body: JSON.stringify({
        oauth_account_id: body.oauth_account_id || null,
        is_active: body.is_active,
      }),
      cache: "no-store",
    });
    const payload = await parseBackendJson(backendResponse);
    return NextResponse.json(payload, { status: backendResponse.status });
  } catch {
    return NextResponse.json({ error: "Unable to update channel OAuth right now." }, { status: 503 });
  }
}
