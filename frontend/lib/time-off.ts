export type TimeOffEntry = {
  id: string;
  teammateId: string;
  teammateName: string;
  name: string;
  startAt: string;
  endAt: string;
  timeZone: string;
  createdAt: string;
};

export type TeammateOption = {
  id: string;
  name: string;
  email: string;
};

export const TIME_OFF_STORAGE_KEY = "patterns-shared-inbox:time-off-entries";

const FALLBACK_TIME_ZONES = [
  "UTC",
  "Asia/Kolkata",
  "Asia/Dubai",
  "Europe/London",
  "Europe/Berlin",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Australia/Sydney",
];

export function getTimeZoneOptions(): string[] {
  const supportedValuesOf = (Intl as typeof Intl & {
    supportedValuesOf?: (key: string) => string[];
  }).supportedValuesOf;

  if (typeof supportedValuesOf === "function") {
    try {
      return supportedValuesOf("timeZone");
    } catch {
      return FALLBACK_TIME_ZONES;
    }
  }

  return FALLBACK_TIME_ZONES;
}

export function readTimeOffEntries(): TimeOffEntry[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(TIME_OFF_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as TimeOffEntry[];
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((entry) => entry && typeof entry.id === "string")
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  } catch {
    return [];
  }
}

export function writeTimeOffEntries(entries: TimeOffEntry[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TIME_OFF_STORAGE_KEY, JSON.stringify(entries));
}

export function createTimeOffEntry(
  input: Omit<TimeOffEntry, "id" | "createdAt">
): TimeOffEntry {
  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    ...input,
  };
}
