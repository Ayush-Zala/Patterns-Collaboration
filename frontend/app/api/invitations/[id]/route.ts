import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // In Next.js 15+, params is a Promise
  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: "Missing invitation ID" }, { status: 400 });
  }

  try {
    // 1. Fetch invitation
    // @ts-ignore
    const invitation = await (prisma.authinvitation || prisma.authInvitation).findUnique({
      where: { id }
    });

    if (!invitation) {
      return NextResponse.json({ error: "Invitation not found", providedId: id }, { status: 404 });
    }

    if (new Date() > invitation.expiresAt) {
      return NextResponse.json({ error: "Invitation has expired" }, { status: 410 });
    }

    // 2. Fetch organization separately to be extremely safe with model naming
    // @ts-ignore
    const org = await (prisma.authorganization || prisma.authOrganization).findUnique({
      where: { id: invitation.organizationId }
    });

    return NextResponse.json({
      id: invitation.id,
      email: invitation.email,
      organizationName: org?.name || "Shared Inbox",
      role: invitation.role
    });
  } catch (error: any) {
    console.error("Failed to fetch invitation:", error);
    return NextResponse.json({ 
      error: "Internal server error", 
      message: error.message,
      stack: error.stack,
      type: error.constructor.name
    }, { status: 500 });
  }
}
