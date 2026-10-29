import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { ensureOrgMembership } from "@/lib/ensure-org-membership";

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await ensureOrgMembership(session, request.headers).catch(() => null);

  if (!result) {
    return NextResponse.json({ error: "Unable to ensure organization membership." }, { status: 500 });
  }

  return NextResponse.json(result, { status: 200 });
}
