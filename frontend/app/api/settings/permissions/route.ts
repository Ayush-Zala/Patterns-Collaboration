import { NextRequest, NextResponse } from "next/server";

import { getRequestSession, getSessionRole } from "@/lib/auth-session";
import { resolveManagedOrgId } from "@/lib/user-admin";
import { getWorkspaceSettings, updateWorkspaceSettings } from "@/lib/workspace-settings";
import type { PermissionAssignments } from "@/lib/permissions";

type PermissionsUpdateBody = {
  assignments?: PermissionAssignments;
};

export async function GET(request: NextRequest) {
  const session = await getRequestSession(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (getSessionRole(session) !== "admin") {
    return NextResponse.json({ error: "Only admins can manage permissions." }, { status: 403 });
  }

  const organizationId = await resolveManagedOrgId(session);
  if (!organizationId) {
    return NextResponse.json({ error: "No active organization found." }, { status: 400 });
  }

  const settings = await getWorkspaceSettings(organizationId);
  return NextResponse.json({ assignments: settings.permissions }, { status: 200 });
}

export async function PUT(request: NextRequest) {
  const session = await getRequestSession(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (getSessionRole(session) !== "admin") {
    return NextResponse.json({ error: "Only admins can manage permissions." }, { status: 403 });
  }

  const organizationId = await resolveManagedOrgId(session);
  if (!organizationId) {
    return NextResponse.json({ error: "No active organization found." }, { status: 400 });
  }

  const body = (await request.json()) as PermissionsUpdateBody;
  if (!body.assignments || typeof body.assignments !== "object") {
    return NextResponse.json({ error: "assignments payload is required." }, { status: 400 });
  }

  const settings = await updateWorkspaceSettings(organizationId, {
    permissions: body.assignments,
  });

  return NextResponse.json({ assignments: settings.permissions }, { status: 200 });
}
