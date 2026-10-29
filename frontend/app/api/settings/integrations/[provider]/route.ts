import { NextRequest, NextResponse } from "next/server";

import { parseBackendJson, resolveBackendUrl } from "@/lib/backend-proxy";

type RouteContext = {
  params: Promise<{ provider: string }>;
};

const providerPathMap: Record<string, string> = {
  google: "/auth/google",
  microsoft: "/auth/microsoft",
};

export async function POST(request: NextRequest, context: RouteContext) {
  const { provider } = await context.params;
  const backendPath = providerPathMap[provider];

  if (!backendPath) {
    return NextResponse.json({ error: "Unsupported provider." }, { status: 400 });
  }

  try {
    const body = await request.json();
    const redirectUri = typeof body?.redirect_uri === "string" ? body.redirect_uri : undefined;

    const backendResponse = await fetch(resolveBackendUrl(backendPath), {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        redirect_uri: redirectUri,
      }),
      cache: "no-store",
    });
    const payload = await parseBackendJson(backendResponse);
    return NextResponse.json(payload, { status: backendResponse.status });
  } catch {
    return NextResponse.json({ error: "Unable to start integration flow right now." }, { status: 503 });
  }
}
