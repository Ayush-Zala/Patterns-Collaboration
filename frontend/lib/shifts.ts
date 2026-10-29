export type ShiftDay = "sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat";

export type ShiftEntry = {
  id: string;
  teammateId: string;
  teammateName: string;
  name: string;
  days: ShiftDay[];
  color: string;
  enabled: boolean;
  createdAt: string;
};

export const SHIFT_STORAGE_KEY = "patterns-shared-inbox:shift-entries";

export const SHIFT_DAY_OPTIONS: Array<{ id: ShiftDay; label: string }> = [
  { id: "sun", label: "S" },
  { id: "mon", label: "M" },
  { id: "tue", label: "T" },
  { id: "wed", label: "W" },
  { id: "thu", label: "T" },
  { id: "fri", label: "F" },
  { id: "sat", label: "S" },
];

export const SHIFT_COLOR_OPTIONS = [
  "#22c55e",
  "#38bdf8",
  "#f59e0b",
  "#f97316",
  "#ec4899",
  "#a855f7",
  "#ef4444",
  "#14b8a6",
];

export function readShiftEntries(): ShiftEntry[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(SHIFT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ShiftEntry[];
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((entry) => entry && typeof entry.id === "string")
      .map((entry) => ({
        ...entry,
        enabled: entry.enabled !== false,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    return [];
  }
}

export function writeShiftEntries(entries: ShiftEntry[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SHIFT_STORAGE_KEY, JSON.stringify(entries));
}

export function createShiftEntry(input: Omit<ShiftEntry, "id" | "createdAt">): ShiftEntry {
  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    ...input,
  };
}
