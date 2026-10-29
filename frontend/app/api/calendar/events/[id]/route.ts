import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

import { getBackendHeaders, parseBackendJson, resolveBackendUrl } from "@/lib/backend-proxy";
import { getRequestSession, getSessionRole } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { resolveManagedOrgId } from "@/lib/user-admin";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type CalendarEventBody = {
  title?: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  threadId?: string | null;
  channelId?: string | null;
  attendees?: string[];
  generateMeetLink?: boolean;
};

function toIso(value: Date | string | null | undefined) {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function mapEvent(row: {
  id: string;
  organizationId: string;
  threadId: string | null;
  title: string;
  description: string | null;
  startTime: Date;
  endTime: Date;
  createdBy: string;
  provider: string;
  externalEventId: string | null;
  meetingLink: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  eventattendee: Array<{ id: string; email: string; status: string }>;
}) {
  return {
    id: row.id,
    organizationId: row.organizationId,
    threadId: row.threadId,
    title: row.title,
    description: row.description,
    startTime: toIso(row.startTime),
    endTime: toIso(row.endTime),
    createdBy: row.createdBy,
    provider: row.provider,
    externalEventId: row.externalEventId,
    meetingLink: row.meetingLink,
    status: row.status,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
    attendees: row.eventattendee.map((attendee) => ({
      id: attendee.id,
      email: attendee.email,
      status: attendee.status,
    })),
  };
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const headers = await getBackendHeaders(request);
    const backendResponse = await fetch(resolveBackendUrl(`/calendar/${encodeURIComponent(id)}`), {
      method: "GET",
      headers,
      cache: "no-store",
    });
    const payload = await parseBackendJson(backendResponse);
    return NextResponse.json(payload, { status: backendResponse.status });
  } catch {
    return NextResponse.json({ error: "Unable to load calendar event right now." }, { status: 503 });
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as CalendarEventBody;
    const title = body.title?.trim();

    if (!title || !body.startTime || !body.endTime) {
      return NextResponse.json({ error: "title, startTime, and endTime are required." }, { status: 400 });
    }

    const headers = await getBackendHeaders(request);
    const backendResponse = await fetch(resolveBackendUrl(`/calendar/${encodeURIComponent(id)}`), {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        ...headers,
      },
      body: JSON.stringify({
        title,
        description: body.description?.trim() || "",
        startTime: body.startTime,
        endTime: body.endTime,
        threadId: body.threadId || null,
        channelId: body.channelId || null,
        attendees: Array.isArray(body.attendees) ? body.attendees : [],
        generateMeetLink: Boolean(body.generateMeetLink),
      }),
      cache: "no-store",
    });

    if (backendResponse.status === 404) {
      const session = await getRequestSession(request);
      if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const organizationId = await resolveManagedOrgId(session);
      if (!organizationId) {
        return NextResponse.json({ error: "No active organization found." }, { status: 400 });
      }

      const existing = await prisma.event.findUnique({
        where: { id },
        include: { eventattendee: true },
      });

      if (!existing || existing.organizationId !== organizationId) {
        return NextResponse.json({ error: "Event not found" }, { status: 404 });
      }

      const role = getSessionRole(session);
      if (existing.createdBy !== session.user.id && role !== "admin") {
        return NextResponse.json({ error: "Not authorized to edit this event" }, { status: 403 });
      }

      await prisma.eventattendee.deleteMany({
        where: { eventId: id },
      });

      const updated = await prisma.event.update({
        where: { id },
        data: {
          threadId: body.threadId || null,
          title,
          description: body.description?.trim() || "",
          startTime: new Date(body.startTime),
          endTime: new Date(body.endTime),
          provider: body.channelId || existing.provider || "google",
          meetingLink: body.generateMeetLink ? existing.meetingLink : existing.meetingLink,
          updatedAt: new Date(),
          eventattendee: {
            create: (Array.isArray(body.attendees) ? body.attendees : []).map((email) => ({
              id: crypto.randomUUID(),
              email,
            })),
          },
        },
        include: { eventattendee: true },
      });

      return NextResponse.json({ event: mapEvent(updated) }, { status: 200 });
    }

    const payload = await parseBackendJson(backendResponse);
    return NextResponse.json(payload, { status: backendResponse.status });
  } catch {
    return NextResponse.json({ error: "Unable to update calendar event right now." }, { status: 503 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const headers = await getBackendHeaders(request);
    const backendResponse = await fetch(resolveBackendUrl(`/calendar/${encodeURIComponent(id)}`), {
      method: "DELETE",
      headers,
      cache: "no-store",
    });
    const payload = await parseBackendJson(backendResponse);
    return NextResponse.json(payload, { status: backendResponse.status });
  } catch {
    return NextResponse.json({ error: "Unable to delete calendar event right now." }, { status: 503 });
  }
}
