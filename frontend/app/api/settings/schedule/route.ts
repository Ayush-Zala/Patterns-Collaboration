import { NextRequest, NextResponse } from "next/server";

import { getRequestSession, getSessionRole } from "@/lib/auth-session";
import { resolveManagedOrgId } from "@/lib/user-admin";
import { getWorkspaceSettings, updateWorkspaceSettings } from "@/lib/workspace-settings";
import type { ShiftEntry } from "@/lib/shifts";
import type { TimeOffEntry } from "@/lib/time-off";
import type { WorkspaceHoursSettings } from "@/lib/workspace-hours";

type ScheduleUpdateBody = {
  timeOffEntries?: TimeOffEntry[];
  shiftEntries?: ShiftEntry[];
  workspaceHours?: WorkspaceHoursSettings;
};

function canManageSchedule(role: ReturnType<typeof getSessionRole>) {
  return role === "admin" || role === "owner";
}

export async function GET(request: NextRequest) {
  const session = await getRequestSession(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const organizationId = await resolveManagedOrgId(session);
  if (!organizationId) {
    return NextResponse.json({ error: "No active organization found." }, { status: 400 });
  }

  const settings = await getWorkspaceSettings(organizationId);
  return NextResponse.json({ schedule: settings.schedule }, { status: 200 });
}

export async function PUT(request: NextRequest) {
  const session = await getRequestSession(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canManageSchedule(getSessionRole(session))) {
    return NextResponse.json({ error: "Only admins and team leads can update schedule settings." }, { status: 403 });
  }

  const organizationId = await resolveManagedOrgId(session);
  if (!organizationId) {
    return NextResponse.json({ error: "No active organization found." }, { status: 400 });
  }

  const body = (await request.json()) as ScheduleUpdateBody;
  const nextSchedule: ScheduleUpdateBody = {};

  if (body.timeOffEntries) {
    nextSchedule.timeOffEntries = body.timeOffEntries;
  }
  if (body.shiftEntries) {
    nextSchedule.shiftEntries = body.shiftEntries;
  }
  if (body.workspaceHours) {
    nextSchedule.workspaceHours = body.workspaceHours;
  }

  const settings = await updateWorkspaceSettings(organizationId, {
    schedule: nextSchedule,
  });

  return NextResponse.json({ schedule: settings.schedule }, { status: 200 });
}
