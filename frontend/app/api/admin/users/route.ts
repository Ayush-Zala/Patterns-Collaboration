import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      console.log("[API Admin Users] No session found");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
    });
    console.log(`[API Admin Users] Found ${users.length} users in DB for session:`, session.user.email);
    if (users.length > 0) {
      console.log(`[API Admin Users] First user:`, users[0].name, users[0].role);
    }
    return NextResponse.json(users);
  } catch (error) {
    console.error("Error fetching users for admin:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
