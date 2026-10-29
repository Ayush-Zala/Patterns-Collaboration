import { NextRequest, NextResponse } from "next/server";
import { getRequestSession, getSessionRole } from "@/lib/auth-session";
import { resolveManagedOrgId } from "@/lib/user-admin";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await getRequestSession(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (getSessionRole(session) !== "admin") {
    return NextResponse.json({ error: "Only admin can view detailed teammate resources." }, { status: 403 });
  }

  const organizationId = await resolveManagedOrgId(session);
  if (!organizationId) {
    return NextResponse.json({ error: "No active organization found." }, { status: 400 });
  }

  const { id } = await context.params;


  try {
    // 1. Fetch User details
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        firstName: true,
        lastName: true,
        username: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 2. Fetch Individual Inboxes (mapped directly via createdBy)
    const inboxes = await prisma.inbox.findMany({
      where: {
        createdBy: id,
      },
      select: {
        id: true,
        name: true,
        description: true,
      },
    });

    // 3. Fetch Channels (mapped to user either by oauth or scopeId)
    // For now, returning channels where oauthAccountId is the user or it's scoped to them
    const channels = await prisma.channel.findMany({
      where: {
        OR: [
          { oauthAccountId: id },
          { scopeType: "individual", scopeId: id }
        ]
      },
      select: {
        id: true,
        name: true,
        provider: true,
      },
    });

    // 4. Teammate Groups (derived from role as requested)
    const groups = [
      {
        id: `role-${user.role}`,
        name: `patterns247 - ${user.role.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}s`,
        memberCount: await prisma.user.count({ where: { role: user.role } }),
      }
    ];

    return NextResponse.json({
      user,
      inboxes: inboxes.map(i => ({ ...i, access: "Private by default" })),
      channels,
      groups,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to fetch resources right now." },
      { status: 500 }
    );
  }
}
