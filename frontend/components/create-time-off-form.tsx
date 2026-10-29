"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Briefcase, LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createTimeOffEntry, getTimeZoneOptions, type TimeOffEntry } from "@/lib/time-off";

async function fetchScheduleEntries() {
  const response = await fetch("/api/settings/schedule", {
    method: "GET",
    cache: "no-store",
  });
  const payload = (await response.json()) as {
    schedule?: {
      timeOffEntries?: TimeOffEntry[];
    };
    error?: string;
  };

  if (!response.ok || !payload.schedule) {
    throw new Error(payload.error || "Unable to load current schedule settings.");
  }

  return payload.schedule.timeOffEntries || [];
}

async function saveTimeOffEntries(entries: TimeOffEntry[]) {
  const response = await fetch("/api/settings/schedule", {
    method: "PUT",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      timeOffEntries: entries,
    }),
  });
  const payload = (await response.json()) as { error?: string };

  if (!response.ok) {
    throw new Error(payload.error || "Unable to save time off.");
  }
}

export function CreateTimeOffForm() {
  const router = useRouter();
  const timeZoneOptions = useMemo(() => getTimeZoneOptions(), []);
  const guessedTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const [teammates, setTeammates] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [teammateId, setTeammateId] = useState("");
  const [name, setName] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [timeZone, setTimeZone] = useState(
    timeZoneOptions.includes(guessedTimeZone) ? guessedTimeZone : "UTC"
  );
  const [isLoadingTeammates, setIsLoadingTeammates] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadTeammates() {
      setIsLoadingTeammates(true);
      setError(null);

      try {
        const response = await fetch("/api/settings/users?scope=assignable", {
          method: "GET",
          cache: "no-store",
        });
        const payload = (await response.json()) as {
          users?: Array<{ id: string; name: string; email: string }>;
          error?: string;
        };

        if (!response.ok) {
          throw new Error(payload.error || "Unable to load teammates.");
        }

        if (!isMounted) return;
        const nextTeammates = payload.users || [];
        setTeammates(nextTeammates);
        setTeammateId((current) => current || nextTeammates[0]?.id || "");
      } catch (loadError) {
        if (!isMounted) return;
        setError(loadError instanceof Error ? loadError.message : "Unable to load teammates.");
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

  async function onCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const selectedTeammate = teammates.find((option) => option.id === teammateId);
    if (!selectedTeammate) {
      setError("Select a teammate before creating time off.");
      return;
    }
    if (!startAt || !endAt) {
      setError("Start time and end time are required.");
      return;
    }
    if (new Date(endAt).getTime() <= new Date(startAt).getTime()) {
      setError("End time must be after start time.");
      return;
    }
    if (!timeZone) {
      setError("Choose a time zone.");
      return;
    }

    setIsSaving(true);

    const nextEntry = createTimeOffEntry({
      teammateId: selectedTeammate.id,
      teammateName: selectedTeammate.name || selectedTeammate.email,
      name: name.trim(),
      startAt: new Date(startAt).toISOString(),
      endAt: new Date(endAt).toISOString(),
      timeZone,
    });

    try {
      const entries = await fetchScheduleEntries();
      await saveTimeOffEntries([...entries, nextEntry]);
      router.push("/settings/schedule?section=time-off");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to create time off.");
      setIsSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 p-10 w-full animate-in fade-in duration-500 min-h-full items-center justify-start">
      <div className="w-full max-w-2xl rounded-2xl border border-border bg-background p-8 backdrop-blur-sm shadow-2xl flex flex-col mt-4">
        <div className="mb-8 pb-6 border-b border-border">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Briefcase className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Create Time Off</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Add an away window for a teammate and surface it in the shared schedule module.
              </p>
            </div>
          </div>
        </div>

        <form className="space-y-6" onSubmit={onCreate}>
          <div className="space-y-2">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Teammate</label>
            <Select value={teammateId} onValueChange={setTeammateId} disabled={isLoadingTeammates || teammates.length === 0}>
              <SelectTrigger className="h-12 w-full bg-muted/50 border-border text-foreground focus:ring-primary/20 text-base">
                <SelectValue placeholder={isLoadingTeammates ? "Loading teammates..." : "Select teammate"} />
              </SelectTrigger>
              <SelectContent className="bg-card border-border text-white">
                {teammates.map((teammate) => (
                  <SelectItem key={teammate.id} value={teammate.id}>
                    {teammate.name || teammate.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Name</label>
            <Input
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Annual Leave"
              className="h-12 bg-muted/50 border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-primary/20 text-base"
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Start time</label>
              <Input 
                required 
                type="datetime-local" 
                value={startAt} 
                onChange={(event) => setStartAt(event.target.value)} 
                className="h-12 bg-muted/50 border-border text-foreground focus-visible:ring-primary/20 text-base [color-scheme:dark]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">End time</label>
              <Input 
                required 
                type="datetime-local" 
                value={endAt} 
                onChange={(event) => setEndAt(event.target.value)} 
                className="h-12 bg-muted/50 border-border text-foreground focus-visible:ring-primary/20 text-base [color-scheme:dark]"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Time zone</label>
            <Select value={timeZone} onValueChange={setTimeZone}>
              <SelectTrigger className="h-12 w-full bg-muted/50 border-border text-foreground focus:ring-primary/20 text-base">
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

          {error && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm font-medium text-red-400">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <Button asChild variant="outline" className="h-11 px-6 bg-muted/50 border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
              <Link href="/settings/schedule?section=time-off">Cancel</Link>
            </Button>
            <Button
              type="submit"
              disabled={isSaving || isLoadingTeammates || teammates.length === 0}
              className="h-11 px-8 bg-primary text-primary-foreground font-semibold shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
            >
              {isSaving && <LoaderCircle className="size-4 animate-spin mr-2" />}
              Create Time Off
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
