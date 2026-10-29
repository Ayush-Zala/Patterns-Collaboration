import { NextRequest, NextResponse } from "next/server";

import { getRequestSession, getSessionRole } from "@/lib/auth-session";
import { normalizeAppRole } from "@/lib/auth-roles";
import { inviteMember, listManagedMembers, resolveManagedOrgId } from "@/lib/user-admin";
import { resolveBackendUrl } from "@/lib/backend-proxy";

type InviteUserBody = {
  email?: string;
  role?: string;
};

export async function GET(request: NextRequest) {
  const session = await getRequestSession(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const organizationId = await resolveManagedOrgId(session);
  if (!organizationId) {
    return NextResponse.json({ error: "No active organization found." }, { status: 400 });
  }

  const members = await listManagedMembers(organizationId, request.headers);
  const scope = request.nextUrl.searchParams.get("scope");

  if (scope === "assignable") {
    return NextResponse.json({
      users: members.map((m: any) => ({
        id: m.userId,
        name: m.user.name,
        email: m.user.email,
        role: m.role,
      })),
    });
  }

  const role = getSessionRole(session);
  if (role !== "admin" && role !== "owner") {
    return NextResponse.json({ error: "Insufficient permissions." }, { status: 403 });
  }

  return NextResponse.json({ members });
}

export async function POST(request: NextRequest) {
  const session = await getRequestSession(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = getSessionRole(session);
  if (role !== "admin" && role !== "owner") {
    return NextResponse.json({ error: "Only admins can invite members." }, { status: 403 });
  }

  const organizationId = await resolveManagedOrgId(session);
  if (!organizationId) {
    return NextResponse.json({ error: "No active organization found." }, { status: 400 });
  }

  const body = (await request.json()) as InviteUserBody;
  const email = body.email?.trim().toLowerCase();
  const invitedRole = normalizeAppRole(body.role);

  if (!email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  try {
    const invite = await inviteMember(organizationId, email, invitedRole, request.headers);

    // If invite succeeded, send the email via our backend
    if (invite) {
      // @ts-ignore
      const inviteId = invite.id || invite.data?.id;
      console.log("[InviteAPI] Invite created:", invite);
      
      if (inviteId) {
        const inviteLink = `${new URL(request.url).origin}/accept-invitation?id=${inviteId}`;
        console.log(`[InviteAPI] Triggering email for ${email} with link: ${inviteLink}`);
        try {
          const backendUrl = resolveBackendUrl("/auth/send-invite");
          console.log(`[InviteAPI] Fetching backend URL: ${backendUrl}`);
          
          const emailResponse = await fetch(backendUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email,
              inviteLink,
            }),
          });
          
          if (!emailResponse.ok) {
            const errorText = await emailResponse.text().catch(() => "N/A");
            console.error(`[InviteAPI] Backend returned ${emailResponse.status}: ${errorText}`);
          } else {
            console.log(`[InviteAPI] Backend successfully accepted send-invite for ${email}`);
          }
        } catch (emailError) {
          console.error("[InviteAPI] Failed to fetch backend send-invite:", emailError);
        }
      } else {
        console.warn("[InviteAPI] Invite object missing ID, cannot send email.", invite);
      }
    }

    // If metadata.initialInboxes is present, create a delegation in the backend
    // @ts-ignore
    const initialInboxes = body.metadata?.initialInboxes;
    if (Array.isArray(initialInboxes) && initialInboxes.length > 0) {
      try {
        await fetch(resolveBackendUrl("/delegations"), {
          method: "POST",
          headers: {
            ...Object.fromEntries(request.headers.entries()),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: `Initial access for ${email}`,
            permission_scope: "share_specific_inboxes",
            inbox_ids: initialInboxes,
            delegate_emails: [email],
          }),
        });
      } catch (delegationError) {
        console.error("Failed to create initial delegation:", delegationError);
        // We don't fail the whole invite if delegation fails, but we log it.
      }
    }

    return NextResponse.json({ invite }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to invite member right now." },
      { status: 400 }
    );
  }
}
