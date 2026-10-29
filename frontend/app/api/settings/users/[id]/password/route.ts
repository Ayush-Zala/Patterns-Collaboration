import { NextRequest, NextResponse } from "next/server";

import { getRequestSession, getSessionRole } from "@/lib/auth-session";
import { resolveManagedOrgId, setManagedUserPassword } from "@/lib/user-admin";

type PasswordBody = {
  password?: string;
};

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await getRequestSession(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (getSessionRole(session) !== "admin") {
    return NextResponse.json({ error: "Only admin can reset passwords." }, { status: 403 });
  }

  const organizationId = await resolveManagedOrgId(session);
  if (!organizationId) {
    return NextResponse.json({ error: "No active organization found." }, { status: 400 });
  }

  const { id } = await context.params;
  const body = (await request.json()) as PasswordBody;
  const password = body.password?.trim();

  if (!password || password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  try {
    await setManagedUserPassword(id, organizationId, password);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to reset password right now." },
      { status: 400 }
    );
  }
}
