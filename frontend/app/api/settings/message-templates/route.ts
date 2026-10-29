import { NextRequest, NextResponse } from "next/server";

import { getBackendHeaders, parseBackendJson, resolveBackendUrl } from "@/lib/backend-proxy";

type MessageTemplateCreateBody = {
  name?: string;
  subject?: string;
  folder_id?: string;
};

export async function GET(request: NextRequest) {
  try {
    const headers = await getBackendHeaders(request);
    const backendResponse = await fetch(resolveBackendUrl("/message-templates"), {
      method: "GET",
      headers,
      cache: "no-store",
    });
    const payload = await parseBackendJson(backendResponse);
    return NextResponse.json(payload, { status: backendResponse.status });
  } catch {
    return NextResponse.json({ error: "Unable to load message templates right now." }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as MessageTemplateCreateBody;
    const name = body.name?.trim();
    const subject = body.subject?.trim();
    const folderId = body.folder_id?.trim();

    if (!name || !subject || !folderId) {
      return NextResponse.json({ error: "name, subject and folder_id are required." }, { status: 400 });
    }

    const authHeaders = await getBackendHeaders(request);
    const backendResponse = await fetch(resolveBackendUrl("/message-templates"), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...authHeaders,
      },
      body: JSON.stringify({
        name,
        subject,
        folder_id: folderId,
      }),
      cache: "no-store",
    });
    const payload = await parseBackendJson(backendResponse);
    return NextResponse.json(payload, { status: backendResponse.status });
  } catch {
    return NextResponse.json({ error: "Unable to create message template right now." }, { status: 503 });
  }
}
