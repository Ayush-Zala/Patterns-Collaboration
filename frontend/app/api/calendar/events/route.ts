import { NextRequest, NextResponse } from "next/server";

import { getBackendHeaders, parseBackendJson, resolveBackendUrl } from "@/lib/backend-proxy";

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

export async function GET(request: NextRequest) {
  try {
    const headers = await getBackendHeaders(request);
    const search = request.nextUrl.searchParams.toString();
    const backendResponse = await fetch(resolveBackendUrl(`/calendar${search ? `?${search}` : ""}`), {
      method: "GET",
      headers,
      cache: "no-store",
    });
    const payload = await parseBackendJson(backendResponse);
    return NextResponse.json(payload, { status: backendResponse.status });
  } catch {
    return NextResponse.json({ error: "Unable to load calendar events right now." }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CalendarEventBody;
    const title = body.title?.trim();

    if (!title || !body.startTime || !body.endTime) {
      return NextResponse.json({ error: "title, startTime, and endTime are required." }, { status: 400 });
    }

    const headers = await getBackendHeaders(request);
    const backendResponse = await fetch(resolveBackendUrl("/calendar"), {
      method: "POST",
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
    const payload = await parseBackendJson(backendResponse);
    return NextResponse.json(payload, { status: backendResponse.status });
  } catch {
    return NextResponse.json({ error: "Unable to create calendar event right now." }, { status: 503 });
  }
}
