import { NextRequest, NextResponse } from "next/server";

import { getBackendHeaders, parseBackendJson, resolveBackendUrl } from "@/lib/backend-proxy";

type DelegationCreateBody = {
  name?: string;
  permission_scope?: "share_all_sections" | "share_specific_inboxes";
  inbox_ids?: string[];
  delegate_emails?: string[];
};

export async function GET(request: NextRequest) {
  try {
    const backendResponse = await fetch(resolveBackendUrl("/delegations"), {
      method: "GET",
      headers: await getBackendHeaders(request),
      cache: "no-store",
    });
    const payload = await parseBackendJson(backendResponse);
    return NextResponse.json(payload, { status: backendResponse.status });
  } catch {
    return NextResponse.json({ error: "Unable to list delegations right now." }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as DelegationCreateBody;
    const permissionScope = body.permission_scope || "share_all_sections";
    const inboxIds = Array.isArray(body.inbox_ids)
      ? body.inbox_ids.map((id) => id.trim()).filter(Boolean)
      : [];
    const delegateEmails = Array.isArray(body.delegate_emails)
      ? body.delegate_emails.map((email) => email.trim()).filter(Boolean)
      : [];

    if (delegateEmails.length === 0) {
      return NextResponse.json({ error: "At least one delegate email is required." }, { status: 400 });
    }

    const backendResponse = await fetch(resolveBackendUrl("/delegations"), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(await getBackendHeaders(request)),
      },
      body: JSON.stringify({
        name: body.name?.trim(),
        permission_scope: permissionScope,
        inbox_ids: inboxIds,
        delegate_emails: delegateEmails,
      }),
      cache: "no-store",
    });
    const payload = await parseBackendJson(backendResponse);
    return NextResponse.json(payload, { status: backendResponse.status });
  } catch {
    return NextResponse.json({ error: "Unable to create delegation right now." }, { status: 503 });
  }
}
