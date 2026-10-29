import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const logs = await prisma.activitylog.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    
    const actorIds = [...new Set(logs.map(l => l.actorId).filter(Boolean))];
    const users = await prisma.user.findMany({
      where: { id: { in: actorIds as string[] } }
    });
    
    const userMap = Object.fromEntries(users.map(u => [u.id, u.name]));
    
    const mappedLogs = logs.map(log => ({
      ...log,
      actorName: log.actorId ? userMap[log.actorId] || "Unknown User" : "System",
      metadataObj: log.metadata ? JSON.parse(log.metadata) : {}
    }));

    return NextResponse.json(mappedLogs);
  } catch (error: any) {
    console.error("Audit log error:", error);
    return NextResponse.json({ error: "Failed to fetch audit logs" }, { status: 500 });
  }
}
