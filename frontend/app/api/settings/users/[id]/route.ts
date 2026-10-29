import { NextRequest, NextResponse } from "next/server";

import { getRequestSession, getSessionRole } from "@/lib/auth-session";
import { normalizeAppRole } from "@/lib/auth-roles";
import { removeMember, resolveManagedOrgId, updateMemberRole } from "@/lib/user-admin";
import { auth } from "@/lib/auth";

type UpdateUserBody = {
  firstName?: string;
  lastName?: string;
  username?: string;
  email?: string;
  role?: string;
  status?: string;
};

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await getRequestSession(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sessionRole = getSessionRole(session);
  const { id: targetUserId } = await context.params;

  // Only admin/owner can update others; users can update themselves
  if (sessionRole !== "admin" && sessionRole !== "owner" && session.user.id !== targetUserId) {
    return NextResponse.json({ error: "Insufficient permissions." }, { status: 403 });
  }

  const organizationId = await resolveManagedOrgId(session);
  if (!organizationId) {
    return NextResponse.json({ error: "No active organization found." }, { status: 400 });
  }

  const body = (await request.json()) as UpdateUserBody;

  try {
    const ctx = await auth.$context;
    
    // 1. Update User Profile (using internal adapter for additional fields)
    const updatedUser = await ctx.internalAdapter.updateUser(targetUserId, {
      ...(body.firstName !== undefined ? { firstName: body.firstName || null } : {}),
      ...(body.lastName !== undefined ? { lastName: body.lastName || null } : {}),
      ...(body.username !== undefined ? { username: body.username || null } : {}),
      ...(body.status !== undefined ? { status: body.status || "available" } : {}),
      ...(body.email !== undefined ? { email: body.email } : {}),
    });

    // 2. Update Member Role if provided and permitted
    if (body.role && (sessionRole === "admin" || sessionRole === "owner")) {
      // Find the member record for this user in this org
      const response = await auth.api.listMembers({
        query: { organizationId },
        headers: request.headers,
      });
      const member = response?.members?.find((m: any) => m.userId === targetUserId);
      
      if (member) {
        await updateMemberRole(member.id, organizationId, normalizeAppRole(body.role), request.headers);
      }
    }

    return NextResponse.json({ user: updatedUser });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update user right now." },
      { status: 400 }
    );
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await getRequestSession(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sessionRole = getSessionRole(session);
  if (sessionRole !== "admin" && sessionRole !== "owner") {
    return NextResponse.json({ error: "Only admins can remove members." }, { status: 403 });
  }

  const { id: targetUserId } = await context.params;

  if (session.user.id === targetUserId) {
    return NextResponse.json({ error: "You cannot remove yourself from the organization." }, { status: 400 });
  }

  const organizationId = await resolveManagedOrgId(session);
  if (!organizationId) {
    return NextResponse.json({ error: "No active organization found." }, { status: 400 });
  }

  try {
    // Find the member record
    const response = await auth.api.listMembers({
      query: { organizationId },
      headers: request.headers,
    });
    const member = response?.members?.find((m: any) => m.userId === targetUserId);

    if (!member) {
      return NextResponse.json({ error: "Member not found in this organization." }, { status: 404 });
    }

    await removeMember(member.id, organizationId, request.headers);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to remove member right now." },
      { status: 400 }
    );
  }
}
