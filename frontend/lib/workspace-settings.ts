import type { PermissionAssignments } from "@/lib/permissions";
import { createPermissionAssignments } from "@/lib/permissions";
import type { ShiftEntry } from "@/lib/shifts";
import type { TimeOffEntry } from "@/lib/time-off";
import {
  createDefaultWorkspaceHoursSettings,
  type WorkspaceHoursSettings,
} from "@/lib/workspace-hours";
import { prisma } from "@/lib/prisma";

export type ScheduleSettings = {
  timeOffEntries: TimeOffEntry[];
  shiftEntries: ShiftEntry[];
  workspaceHours: WorkspaceHoursSettings;
};

export type WorkspaceSettings = {
  schedule: ScheduleSettings;
  permissions: PermissionAssignments;
};

type WorkspaceSettingsUpdate = {
  schedule?: Partial<ScheduleSettings>;
  permissions?: PermissionAssignments;
};

function createDefaultScheduleSettings(): ScheduleSettings {
  return {
    timeOffEntries: [],
    shiftEntries: [],
    workspaceHours: createDefaultWorkspaceHoursSettings("UTC"),
  };
}

export function createDefaultWorkspaceSettings(): WorkspaceSettings {
  return {
    schedule: createDefaultScheduleSettings(),
    permissions: createPermissionAssignments("workspace_admins"),
  };
}

function parseMetadataRecord(metadata: string | null | undefined): Record<string, unknown> {
  if (!metadata) return {};

  try {
    const parsed = JSON.parse(metadata) as Record<string, unknown>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function normalizeTimeOffEntries(value: unknown): TimeOffEntry[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is TimeOffEntry => Boolean(entry && typeof entry === "object"));
}

function normalizeShiftEntries(value: unknown): ShiftEntry[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry): entry is ShiftEntry => Boolean(entry && typeof entry === "object"))
    .map((entry) => ({
      ...entry,
      enabled: entry.enabled !== false,
    }));
}

function normalizeWorkspaceHours(value: unknown): WorkspaceHoursSettings {
  const fallback = createDefaultWorkspaceHoursSettings("UTC");
  if (!value || typeof value !== "object") return fallback;

  const candidate = value as Partial<WorkspaceHoursSettings>;
  return {
    timeZone: typeof candidate.timeZone === "string" ? candidate.timeZone : fallback.timeZone,
    days: {
      sun: { ...fallback.days.sun, ...(candidate.days?.sun || {}) },
      mon: { ...fallback.days.mon, ...(candidate.days?.mon || {}) },
      tue: { ...fallback.days.tue, ...(candidate.days?.tue || {}) },
      wed: { ...fallback.days.wed, ...(candidate.days?.wed || {}) },
      thu: { ...fallback.days.thu, ...(candidate.days?.thu || {}) },
      fri: { ...fallback.days.fri, ...(candidate.days?.fri || {}) },
      sat: { ...fallback.days.sat, ...(candidate.days?.sat || {}) },
    },
  };
}

function normalizePermissions(value: unknown): PermissionAssignments {
  const fallback = createPermissionAssignments("workspace_admins");
  if (!value || typeof value !== "object") return fallback;

  const candidate = value as Record<string, unknown>;
  for (const key of Object.keys(fallback)) {
    const nextValue = candidate[key];
    fallback[key] = Array.isArray(nextValue)
      ? nextValue.filter((entry): entry is string => typeof entry === "string")
      : fallback[key];
  }

  return fallback;
}

export async function getWorkspaceSettings(organizationId: string): Promise<WorkspaceSettings> {
  const organization = await prisma.authorganization.findUnique({
    where: { id: organizationId },
    select: { metadata: true },
  });

  const metadata = parseMetadataRecord(organization?.metadata);
  const settings = (metadata.settings as Record<string, unknown> | undefined) || {};
  const schedule = (settings.schedule as Record<string, unknown> | undefined) || {};

  return {
    schedule: {
      timeOffEntries: normalizeTimeOffEntries(schedule.timeOffEntries),
      shiftEntries: normalizeShiftEntries(schedule.shiftEntries),
      workspaceHours: normalizeWorkspaceHours(schedule.workspaceHours),
    },
    permissions: normalizePermissions(settings.permissions),
  };
}

export async function updateWorkspaceSettings(
  organizationId: string,
  nextSettings: WorkspaceSettingsUpdate
): Promise<WorkspaceSettings> {
  const organization = await prisma.authorganization.findUnique({
    where: { id: organizationId },
    select: { metadata: true },
  });

  const metadata = parseMetadataRecord(organization?.metadata);
  const currentSettings = await getWorkspaceSettings(organizationId);
  const mergedSettings: WorkspaceSettings = {
    schedule: {
      ...currentSettings.schedule,
      ...(nextSettings.schedule || {}),
    },
    permissions: nextSettings.permissions || currentSettings.permissions,
  };

  const nextMetadata = {
    ...metadata,
    settings: mergedSettings,
  };

  await prisma.authorganization.update({
    where: { id: organizationId },
    data: {
      metadata: JSON.stringify(nextMetadata),
    },
  });

  return mergedSettings;
}
