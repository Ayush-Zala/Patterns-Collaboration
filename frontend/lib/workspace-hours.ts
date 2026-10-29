import type { ShiftDay } from "@/lib/shifts";

export type WorkspaceHoursDayConfig = {
  enabled: boolean;
  startTime: string;
  endTime: string;
};

export type WorkspaceHoursSettings = {
  timeZone: string;
  days: Record<ShiftDay, WorkspaceHoursDayConfig>;
};

export const WORKSPACE_HOURS_STORAGE_KEY = "patterns-shared-inbox:workspace-hours";

const DEFAULT_DAY_CONFIG: WorkspaceHoursDayConfig = {
  enabled: false,
  startTime: "09:00",
  endTime: "17:00",
};

export function createDefaultWorkspaceHoursSettings(timeZone: string): WorkspaceHoursSettings {
  return {
    timeZone,
    days: {
      sun: { ...DEFAULT_DAY_CONFIG },
      mon: { ...DEFAULT_DAY_CONFIG, enabled: true },
      tue: { ...DEFAULT_DAY_CONFIG, enabled: true },
      wed: { ...DEFAULT_DAY_CONFIG, enabled: true },
      thu: { ...DEFAULT_DAY_CONFIG, enabled: true },
      fri: { ...DEFAULT_DAY_CONFIG, enabled: true },
      sat: { ...DEFAULT_DAY_CONFIG },
    },
  };
}

export function readWorkspaceHoursSettings(defaultTimeZone: string): WorkspaceHoursSettings {
  if (typeof window === "undefined") {
    return createDefaultWorkspaceHoursSettings(defaultTimeZone);
  }

  try {
    const raw = window.localStorage.getItem(WORKSPACE_HOURS_STORAGE_KEY);
    if (!raw) return createDefaultWorkspaceHoursSettings(defaultTimeZone);
    const parsed = JSON.parse(raw) as WorkspaceHoursSettings;
    if (!parsed || typeof parsed !== "object") {
      return createDefaultWorkspaceHoursSettings(defaultTimeZone);
    }

    return {
      timeZone: typeof parsed.timeZone === "string" ? parsed.timeZone : defaultTimeZone,
      days: {
        sun: { ...DEFAULT_DAY_CONFIG, ...parsed.days?.sun },
        mon: { ...DEFAULT_DAY_CONFIG, ...parsed.days?.mon },
        tue: { ...DEFAULT_DAY_CONFIG, ...parsed.days?.tue },
        wed: { ...DEFAULT_DAY_CONFIG, ...parsed.days?.wed },
        thu: { ...DEFAULT_DAY_CONFIG, ...parsed.days?.thu },
        fri: { ...DEFAULT_DAY_CONFIG, ...parsed.days?.fri },
        sat: { ...DEFAULT_DAY_CONFIG, ...parsed.days?.sat },
      },
    };
  } catch {
    return createDefaultWorkspaceHoursSettings(defaultTimeZone);
  }
}

export function writeWorkspaceHoursSettings(settings: WorkspaceHoursSettings) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(WORKSPACE_HOURS_STORAGE_KEY, JSON.stringify(settings));
}
