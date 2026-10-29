"use client";

import Link from "next/link";
import { useMemo, useEffect, useState } from "react";
import { format } from "date-fns";
import { Briefcase, CalendarClock, Clock3, Plus, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { getTimeZoneOptions, type TeammateOption, type TimeOffEntry } from "@/lib/time-off";
import { SHIFT_DAY_OPTIONS, type ShiftEntry } from "@/lib/shifts";
import {
  createDefaultWorkspaceHoursSettings,
  type WorkspaceHoursSettings,
} from "@/lib/workspace-hours";

type ScheduleSection = "time-off" | "shifts" | "business-hours";

type SettingsScheduleProps = {
  initialSection?: ScheduleSection;
};

const SECTION_ITEMS: Array<{
  id: ScheduleSection;
  title: string;
  description: string;
  icon: typeof Briefcase;
}> = [
  {
    id: "time-off",
    title: "Time Off",
    description: "Track away windows and coverage gaps.",
    icon: Briefcase,
  },
  {
    id: "shifts",
    title: "Shifts",
    description: "Plan teammate coverage across the day.",
    icon: Clock3,
  },
  {
    id: "business-hours",
    title: "Workspace Business Hours",
    description: "Define your shared response window.",
    icon: CalendarClock,
  },
];

const DAY_NAMES: Record<keyof WorkspaceHoursSettings["days"], string> = {
  sun: "Sunday",
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
};

async function fetchTeammates(): Promise<TeammateOption[]> {
  const response = await fetch("/api/settings/users?scope=assignable", {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Unable to load teammates.");
  }

  const payload = (await response.json()) as {
    users?: Array<{ id: string; name: string; email: string }>;
  };

  return (payload.users || []).map((user) => ({
    id: user.id,
    name: user.name || user.email,
    email: user.email,
  }));
}

async function fetchSchedule() {
  const response = await fetch("/api/settings/schedule", {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    const errorPayload = await response.json().catch(() => ({}));
    throw new Error(errorPayload.error || "Unable to load schedule settings.");
  }

  const payload = (await response.json()) as {
    schedule?: {
      timeOffEntries?: TimeOffEntry[];
      shiftEntries?: ShiftEntry[];
      workspaceHours?: WorkspaceHoursSettings;
    };
  };

  return payload.schedule;
}

async function saveSchedule(update: {
  timeOffEntries?: TimeOffEntry[];
  shiftEntries?: ShiftEntry[];
  workspaceHours?: WorkspaceHoursSettings;
}) {
  const response = await fetch("/api/settings/schedule", {
    method: "PUT",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(update),
  });
  const payload = (await response.json()) as {
    schedule?: {
      timeOffEntries?: TimeOffEntry[];
      shiftEntries?: ShiftEntry[];
      workspaceHours?: WorkspaceHoursSettings;
    };
    error?: string;
  };

  if (!response.ok || !payload.schedule) {
    throw new Error(payload.error || "Unable to save schedule settings.");
  }

  return payload.schedule;
}

export function SettingsSchedule({ initialSection = "time-off" }: SettingsScheduleProps) {
  const timeZoneOptions = useMemo(() => getTimeZoneOptions(), []);
  const guessedTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const [teammates, setTeammates] = useState<TeammateOption[]>([]);
  const [selectedTimeOffTeammateId, setSelectedTimeOffTeammateId] = useState("all");
  const [selectedShiftTeammateId, setSelectedShiftTeammateId] = useState("all");
  const [excludePastTimeOff, setExcludePastTimeOff] = useState(true);
  const [excludeDisabledShifts, setExcludeDisabledShifts] = useState(true);
  const [entries, setEntries] = useState<TimeOffEntry[]>([]);
  const [shiftEntries, setShiftEntries] = useState<ShiftEntry[]>([]);
  const [workspaceHours, setWorkspaceHours] = useState<WorkspaceHoursSettings>(
    createDefaultWorkspaceHoursSettings(guessedTimeZone)
  );
  const [savedWorkspaceHours, setSavedWorkspaceHours] = useState<WorkspaceHoursSettings>(
    createDefaultWorkspaceHoursSettings(guessedTimeZone)
  );
  const [selectedBusinessDay, setSelectedBusinessDay] = useState<keyof WorkspaceHoursSettings["days"]>("tue");
  const [isLoadingTeammates, setIsLoadingTeammates] = useState(true);
  const [isRefreshingEntries, setIsRefreshingEntries] = useState(false);
  const [workspaceHoursMessage, setWorkspaceHoursMessage] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const activeSection = initialSection;

  useEffect(() => {
    let isMounted = true;

    async function loadTeammates() {
      setIsLoadingTeammates(true);
      setLoadError(null);

      try {
        const nextTeammates = await fetchTeammates();
        if (!isMounted) return;
        setTeammates(nextTeammates);
      } catch (error) {
        if (!isMounted) return;
        setLoadError(error instanceof Error ? error.message : "Unable to load teammates.");
      } finally {
        if (!isMounted) return;
        setIsLoadingTeammates(false);
      }
    }

    void loadTeammates();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const resolvedTimeZone = timeZoneOptions.includes(guessedTimeZone) ? guessedTimeZone : "UTC";
    let isMounted = true;

    async function loadEntries() {
      try {
        const schedule = await fetchSchedule();
        if (!isMounted) return;
        if (schedule) {
          setEntries(schedule.timeOffEntries || []);
          setShiftEntries(schedule.shiftEntries || []);
          const nextWorkspaceHours = schedule.workspaceHours || createDefaultWorkspaceHoursSettings(resolvedTimeZone);
          setWorkspaceHours(nextWorkspaceHours);
          setSavedWorkspaceHours(nextWorkspaceHours);
        }
      } catch (error) {
        if (!isMounted) return;
        setLoadError(error instanceof Error ? error.message : "Unable to load schedule settings.");
        const fallbackWorkspaceHours = createDefaultWorkspaceHoursSettings(resolvedTimeZone);
        setEntries([]);
        setShiftEntries([]);
        setWorkspaceHours(fallbackWorkspaceHours);
        setSavedWorkspaceHours(fallbackWorkspaceHours);
      }
    }

    void loadEntries();

    return () => {
      isMounted = false;
    };
  }, [guessedTimeZone, timeZoneOptions]);

  async function refreshEntries() {
    setIsRefreshingEntries(true);
    try {
      const schedule = await fetchSchedule();
      if (schedule) {
        setEntries(schedule.timeOffEntries || []);
        setShiftEntries(schedule.shiftEntries || []);
        if (schedule.workspaceHours) {
          setWorkspaceHours(schedule.workspaceHours);
          setSavedWorkspaceHours(schedule.workspaceHours);
        }
      }
      setLoadError(null);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Unable to refresh schedule settings.");
    } finally {
      setIsRefreshingEntries(false);
    }
  }

  const filteredEntries = useMemo(() => {
    const now = Date.now();

    return entries.filter((entry) => {
      if (selectedTimeOffTeammateId !== "all" && entry.teammateId !== selectedTimeOffTeammateId) {
        return false;
      }
      if (excludePastTimeOff && new Date(entry.endAt).getTime() < now) {
        return false;
      }
      return true;
    });
  }, [entries, excludePastTimeOff, selectedTimeOffTeammateId]);

  const filteredShiftEntries = useMemo(() => {
    return shiftEntries.filter((entry) => {
      if (selectedShiftTeammateId !== "all" && entry.teammateId !== selectedShiftTeammateId) {
        return false;
      }
      if (excludeDisabledShifts && !entry.enabled) {
        return false;
      }
      return true;
    });
  }, [excludeDisabledShifts, selectedShiftTeammateId, shiftEntries]);

  async function toggleShiftEnabled(shiftId: string, enabled: boolean) {
    const nextEntries = shiftEntries.map((entry) =>
      entry.id === shiftId ? { ...entry, enabled } : entry
    );
    setShiftEntries(nextEntries);
    try {
      await saveSchedule({ shiftEntries: nextEntries });
      setLoadError(null);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Unable to update shifts.");
      setShiftEntries(shiftEntries);
    }
  }

  function updateSelectedBusinessDay(
    field: "enabled" | "startTime" | "endTime",
    value: boolean | string
  ) {
    setWorkspaceHours((current) => ({
      ...current,
      days: {
        ...current.days,
        [selectedBusinessDay]: {
          ...current.days[selectedBusinessDay],
          [field]: value,
        },
      },
    }));
    setWorkspaceHoursMessage(null);
  }

  async function saveWorkspaceHours() {
    try {
      const schedule = await saveSchedule({ workspaceHours });
      const nextWorkspaceHours = schedule.workspaceHours || workspaceHours;
      setWorkspaceHours(nextWorkspaceHours);
      setSavedWorkspaceHours(nextWorkspaceHours);
      setWorkspaceHoursMessage("Workspace business hours saved.");
      setLoadError(null);
    } catch (error) {
      setWorkspaceHoursMessage(null);
      setLoadError(error instanceof Error ? error.message : "Unable to save workspace hours.");
    }
  }

  function cancelWorkspaceHoursChanges() {
    setWorkspaceHours(savedWorkspaceHours);
    setWorkspaceHoursMessage(null);
  }

  const selectedDayConfig = workspaceHours.days[selectedBusinessDay];

  return (
    <div className="flex flex-col gap-6 p-10 w-full animate-in fade-in duration-500 min-h-full">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="size-4 bg-emerald-500 rounded-sm shadow-[0_0_10px_rgba(16,185,129,0.3)]" />
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Team Management</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Schedule</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage teammate availability, shift planning, and workspace operating hours.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3 mt-4">
        {SECTION_ITEMS.map((section) => {
          const isActive = section.id === activeSection;
          const Icon = section.icon;

          return (
            <Link
              key={section.id}
              href={`/settings/schedule?section=${section.id}`}
              className={cn(
                "rounded-2xl border p-5 transition-all",
                isActive
                  ? "border-primary/30 bg-primary/[0.06] shadow-[0_0_20px_rgba(56,189,248,0.08)]"
                  : "border-border bg-background hover:border-border hover:bg-muted/30"
              )}
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "flex size-10 items-center justify-center rounded-xl border",
                    isActive
                      ? "border-primary/20 bg-primary/10 text-primary"
                      : "border-border bg-muted/50 text-muted-foreground"
                  )}
                >
                  <Icon className="size-5" />
                </div>
                <div>
                  <p className={cn("text-base font-bold", isActive ? "text-white" : "text-foreground")}>
                    {section.title}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">{section.description}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {activeSection === "time-off" && (
        <div className="rounded-2xl border border-border bg-background p-6 backdrop-blur-sm shadow-2xl">
          <div className="flex flex-col gap-4 border-b border-border pb-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-xl font-bold text-foreground tracking-tight">Time Off</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Review teammate away windows and keep inbox coverage visible to the team.
              </p>
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="space-y-2">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Teammates
                </label>
                <Select value={selectedTimeOffTeammateId} onValueChange={setSelectedTimeOffTeammateId}>
                  <SelectTrigger className="h-11 w-full min-w-56 bg-muted/50 border-border text-foreground focus:ring-primary/20">
                    <SelectValue placeholder={isLoadingTeammates ? "Loading teammates..." : "Select teammate"} />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border text-white">
                    <SelectItem value="all">All teammates</SelectItem>
                    {teammates.map((teammate) => (
                      <SelectItem key={teammate.id} value={teammate.id}>
                        {teammate.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Exclude past time off
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Hide windows that have already ended.</p>
                </div>
                <Switch
                  checked={excludePastTimeOff}
                  onCheckedChange={setExcludePastTimeOff}
                  className="data-checked:bg-primary"
                />
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 gap-2 bg-muted/50 border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  onClick={() => void refreshEntries()}
                  disabled={isRefreshingEntries}
                >
                  <RefreshCw className={cn("size-4", isRefreshingEntries && "animate-spin")} />
                  Refresh
                </Button>
                <Button asChild className="h-11 gap-2 bg-primary text-primary-foreground shadow-lg shadow-primary/20">
                  <Link href="/settings/time-off/create">
                    <Plus className="size-4" />
                    Create Time Off
                  </Link>
                </Button>
              </div>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {loadError && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
                {loadError}
              </div>
            )}

            {!loadError && filteredEntries.length === 0 && (
              <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/20 text-center">
                <Briefcase className="mb-4 size-10 text-muted-foreground" />
                <h3 className="text-lg font-bold text-foreground">No time-off entries yet</h3>
                <p className="mt-2 max-w-md text-sm text-muted-foreground">
                  Create a time-off record to make teammate availability visible in the schedule module.
                </p>
              </div>
            )}

            {filteredEntries.map((entry) => (
              <article
                key={entry.id}
                className="rounded-xl border border-border bg-muted/30 p-5 hover:border-primary/20 hover:bg-primary/[0.03] transition-all"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <p className="text-base font-bold text-foreground">{entry.name}</p>
                      <span className="rounded-full border border-border bg-muted/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {entry.timeZone}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{entry.teammateName}</p>
                  </div>

                  <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-2 lg:min-w-[360px]">
                    <div className="rounded-lg border border-border bg-zinc-950/30 p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Start</p>
                      <p className="mt-1 font-medium text-foreground">
                        {format(new Date(entry.startAt), "dd MMM yyyy, hh:mm a")}
                      </p>
                    </div>
                    <div className="rounded-lg border border-border bg-zinc-950/30 p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">End</p>
                      <p className="mt-1 font-medium text-foreground">
                        {format(new Date(entry.endAt), "dd MMM yyyy, hh:mm a")}
                      </p>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      {activeSection === "shifts" && (
        <div className="rounded-2xl border border-border bg-background p-6 backdrop-blur-sm shadow-2xl">
          <div className="flex flex-col gap-4 border-b border-border pb-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-xl font-bold text-foreground tracking-tight">Shifts</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Group teammate availability into recognizable shift patterns for coverage planning.
              </p>
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="space-y-2">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Teammates
                </label>
                <Select value={selectedShiftTeammateId} onValueChange={setSelectedShiftTeammateId}>
                  <SelectTrigger className="h-11 w-full min-w-56 bg-muted/50 border-border text-foreground focus:ring-primary/20">
                    <SelectValue placeholder={isLoadingTeammates ? "Loading teammates..." : "Select teammate"} />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border text-white">
                    <SelectItem value="all">All teammates</SelectItem>
                    {teammates.map((teammate) => (
                      <SelectItem key={teammate.id} value={teammate.id}>
                        {teammate.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Exclude disabled shifts
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Hide shifts that are currently marked inactive.</p>
                </div>
                <Switch
                  checked={excludeDisabledShifts}
                  onCheckedChange={setExcludeDisabledShifts}
                  className="data-checked:bg-primary"
                />
              </div>

              <Button asChild className="h-11 gap-2 bg-primary text-primary-foreground shadow-lg shadow-primary/20">
                <Link href="/settings/shifts/create">
                  <Plus className="size-4" />
                  Create Shift
                </Link>
              </Button>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {filteredShiftEntries.length === 0 && (
              <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/20 text-center">
                <Clock3 className="mb-4 size-10 text-muted-foreground" />
                <h3 className="text-lg font-bold text-foreground">No shifts created yet</h3>
                <p className="mt-2 max-w-md text-sm text-muted-foreground">
                  Create a shift to assign a teammate, choose days, and visually distinguish coverage blocks.
                </p>
              </div>
            )}

            {filteredShiftEntries.map((entry) => (
              <article
                key={entry.id}
                className="rounded-xl border border-border bg-muted/30 p-5 hover:border-primary/20 hover:bg-primary/[0.03] transition-all"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <span
                        className="size-3 rounded-full shadow-[0_0_12px_rgba(255,255,255,0.12)]"
                        style={{ backgroundColor: entry.color }}
                      />
                      <p className="text-base font-bold text-foreground">{entry.name}</p>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                          entry.enabled
                            ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                            : "border border-border bg-muted/60 text-muted-foreground"
                        )}
                      >
                        {entry.enabled ? "Enabled" : "Disabled"}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{entry.teammateName}</p>
                  </div>

                  <div className="flex flex-col gap-4 lg:items-end">
                    <div className="flex flex-wrap items-center gap-2">
                      {SHIFT_DAY_OPTIONS.map((day, index) => {
                        const isActive = entry.days.includes(day.id);
                        const uniqueLabel = `${entry.id}-${index}`;

                        return (
                          <div
                            key={uniqueLabel}
                            className={cn(
                              "flex size-10 items-center justify-center rounded-full border text-xs font-bold uppercase",
                              isActive
                                ? "border-transparent text-zinc-950"
                                : "border-border bg-zinc-950/30 text-muted-foreground"
                            )}
                            style={isActive ? { backgroundColor: entry.color } : undefined}
                          >
                            {day.label}
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex items-center gap-3 rounded-xl border border-border bg-zinc-950/30 px-3 py-2">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Active
                      </span>
                      <Switch
                        checked={entry.enabled}
                        onCheckedChange={(checked) => void toggleShiftEnabled(entry.id, checked)}
                        className="data-checked:bg-primary"
                      />
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      {activeSection === "business-hours" && (
        <div className="rounded-2xl border border-border bg-background p-6 backdrop-blur-sm shadow-2xl">
          <div className="border-b border-border pb-6">
            <h2 className="text-xl font-bold text-foreground tracking-tight">Workspace Business Hours</h2>
            <p className="text-sm text-muted-foreground mt-3">
              Define business hours for this workspace to better inform time-sensitive analytics and rules.
            </p>
          </div>

          <div className="mt-8 space-y-8">
            <div className="space-y-3">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Days</label>
              <div className="flex flex-wrap gap-3">
                {SHIFT_DAY_OPTIONS.map((day, index) => {
                  const isSelected = selectedBusinessDay === day.id;
                  const uniqueLabel = `business-${index}`;

                  return (
                    <button
                      key={uniqueLabel}
                      type="button"
                      onClick={() => setSelectedBusinessDay(day.id)}
                      className={cn(
                        "flex size-12 items-center justify-center rounded-full border text-sm font-bold uppercase transition-all",
                        isSelected
                          ? "border-primary/30 bg-primary text-primary-foreground shadow-[0_0_18px_rgba(99,102,241,0.25)]"
                          : "border-border bg-muted/50 text-muted-foreground hover:border-border"
                      )}
                    >
                      {day.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <p className="text-2xl font-semibold text-foreground">{DAY_NAMES[selectedBusinessDay]}</p>
                <Switch
                  checked={selectedDayConfig.enabled}
                  onCheckedChange={(checked) => updateSelectedBusinessDay("enabled", checked)}
                  className="data-checked:bg-primary"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Input
                  type="time"
                  value={selectedDayConfig.startTime}
                  onChange={(event) => updateSelectedBusinessDay("startTime", event.target.value)}
                  disabled={!selectedDayConfig.enabled}
                  className="h-11 w-44 bg-muted/50 border-border text-foreground focus-visible:ring-primary/20 [color-scheme:dark]"
                />
                <Input
                  type="time"
                  value={selectedDayConfig.endTime}
                  onChange={(event) => updateSelectedBusinessDay("endTime", event.target.value)}
                  disabled={!selectedDayConfig.enabled}
                  className="h-11 w-44 bg-muted/50 border-border text-foreground focus-visible:ring-primary/20 [color-scheme:dark]"
                />
              </div>
            </div>

            <div className="space-y-2 max-w-sm">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Time zone</label>
              <Select
                value={workspaceHours.timeZone}
                onValueChange={(value) => {
                  setWorkspaceHours((current) => ({ ...current, timeZone: value }));
                  setWorkspaceHoursMessage(null);
                }}
              >
                <SelectTrigger className="h-11 w-full bg-muted/50 border-border text-foreground focus:ring-primary/20">
                  <SelectValue placeholder="Select time zone" />
                </SelectTrigger>
                <SelectContent className="max-h-80 bg-card border-border text-white">
                  {timeZoneOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-16 border-t border-border pt-5">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm text-emerald-400">{workspaceHoursMessage || ""}</div>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 px-6 bg-muted/50 border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  onClick={cancelWorkspaceHoursChanges}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  className="h-11 px-8 bg-primary text-primary-foreground font-semibold shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
                  onClick={() => void saveWorkspaceHours()}
                >
                  Save
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
