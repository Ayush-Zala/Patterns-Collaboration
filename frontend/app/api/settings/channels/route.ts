import { NextRequest, NextResponse } from "next/server";

import { getBackendHeaders, parseBackendJson, resolveBackendUrl } from "@/lib/backend-proxy";

type ChannelCreateBody = {
  name?: string;
  email_address?: string;
  provider?: "gmail" | "outlook";
};

export async function GET(request: NextRequest) {
  try {
    const headers = await getBackendHeaders(request);
    const backendResponse = await fetch(resolveBackendUrl("/channels"), {
      method: "GET",
      headers,
      cache: "no-store",
    });
    const payload = await parseBackendJson(backendResponse);
    return NextResponse.json(payload, { status: backendResponse.status });
  } catch {
    return NextResponse.json({ error: "Unable to load channels right now." }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ChannelCreateBody;
    const name = body.name?.trim();
    const emailAddress = body.email_address?.trim().toLowerCase();
    const provider = body.provider === "outlook" ? "outlook" : "gmail";

    if (!name || !emailAddress) {
      return NextResponse.json({ error: "name and email_address are required." }, { status: 400 });
    }

    const authHeaders = await getBackendHeaders(request);
    const backendResponse = await fetch(resolveBackendUrl("/channels"), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...authHeaders,
      },
      body: JSON.stringify({
        name,
        email_address: emailAddress,
        provider,
      }),
      cache: "no-store",
    });
    const payload = await parseBackendJson(backendResponse);
    return NextResponse.json(payload, { status: backendResponse.status });
  } catch {
    return NextResponse.json({ error: "Unable to create channel right now." }, { status: 503 });
  }
}
