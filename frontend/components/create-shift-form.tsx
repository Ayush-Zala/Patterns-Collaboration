"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock3, LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { createShiftEntry, SHIFT_COLOR_OPTIONS, SHIFT_DAY_OPTIONS, type ShiftDay, type ShiftEntry } from "@/lib/shifts";

async function fetchShiftEntries() {
  const response = await fetch("/api/settings/schedule", {
    method: "GET",
    cache: "no-store",
  });
  const payload = (await response.json()) as {
    schedule?: {
      shiftEntries?: ShiftEntry[];
    };
    error?: string;
  };

  if (!response.ok || !payload.schedule) {
    throw new Error(payload.error || "Unable to load current schedule settings.");
  }

  return payload.schedule.shiftEntries || [];
}

async function saveShiftEntries(entries: ShiftEntry[]) {
  const response = await fetch("/api/settings/schedule", {
    method: "PUT",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      shiftEntries: entries,
    }),
  });
  const payload = (await response.json()) as { error?: string };

  if (!response.ok) {
    throw new Error(payload.error || "Unable to save shifts.");
  }
}

export function CreateShiftForm() {
  const router = useRouter();
  const [teammates, setTeammates] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [teammateId, setTeammateId] = useState("");
  const [name, setName] = useState("");
  const [days, setDays] = useState<ShiftDay[]>([]);
  const [color, setColor] = useState(SHIFT_COLOR_OPTIONS[0]);
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

  function toggleDay(day: ShiftDay) {
    setDays((current) =>
      current.includes(day) ? current.filter((value) => value !== day) : [...current, day]
    );
  }

  async function onCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const selectedTeammate = teammates.find((option) => option.id === teammateId);
    if (!selectedTeammate) {
      setError("Select a teammate before creating a shift.");
      return;
    }
    if (!name.trim()) {
      setError("Shift name is required.");
      return;
    }
    if (days.length === 0) {
      setError("Select at least one day for the shift.");
      return;
    }

    setIsSaving(true);

    const nextEntry = createShiftEntry({
      teammateId: selectedTeammate.id,
      teammateName: selectedTeammate.name || selectedTeammate.email,
      name: name.trim(),
      days,
      color,
      enabled: true,
    });

    try {
      const entries = await fetchShiftEntries();
      await saveShiftEntries([...entries, nextEntry]);
      router.push("/settings/schedule?section=shifts");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to create shift.");
      setIsSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 p-10 w-full animate-in fade-in duration-500 min-h-full items-center justify-start">
      <div className="w-full max-w-2xl rounded-2xl border border-border bg-background p-8 backdrop-blur-sm shadow-2xl flex flex-col mt-4">
        <div className="mb-8 pb-6 border-b border-border">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Clock3 className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Create Shift</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Define a teammate shift pattern and assign a color for quick schedule recognition.
              </p>
            </div>
          </div>
        </div>

        <form className="space-y-6" onSubmit={onCreate}>
          <div className="space-y-2">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Name</label>
            <Input
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Morning Coverage"
              className="h-12 bg-muted/50 border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-primary/20 text-base"
            />
          </div>

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

          <div className="space-y-3">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Days</label>
            <div className="flex flex-wrap gap-3">
              {SHIFT_DAY_OPTIONS.map((day, index) => {
                const isActive = days.includes(day.id);
                const uniqueLabel = `${day.label}${index}`;

                return (
                  <button
                    key={uniqueLabel}
                    type="button"
                    onClick={() => toggleDay(day.id)}
                    className={cn(
                      "flex size-12 items-center justify-center rounded-full border text-sm font-bold uppercase transition-all",
                      isActive
                        ? "border-primary/30 bg-primary/15 text-primary shadow-[0_0_18px_rgba(56,189,248,0.12)]"
                        : "border-border bg-muted/50 text-muted-foreground hover:border-border hover:text-foreground"
                    )}
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Color</label>
            <div className="flex flex-wrap gap-3">
              {SHIFT_COLOR_OPTIONS.map((option) => {
                const isSelected = color === option;

                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setColor(option)}
                    className={cn(
                      "relative size-10 rounded-full border transition-all",
                      isSelected ? "border-white/70 ring-2 ring-white/20" : "border-border hover:border-zinc-600"
                    )}
                    style={{ backgroundColor: option }}
                    aria-label={`Select shift color ${option}`}
                  >
                    {isSelected && (
                      <span className="absolute inset-0 rounded-full border border-white/40" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm font-medium text-red-400">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <Button asChild variant="outline" className="h-11 px-6 bg-muted/50 border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
              <Link href="/settings/schedule?section=shifts">Cancel</Link>
            </Button>
            <Button
              type="submit"
              disabled={isSaving || isLoadingTeammates || teammates.length === 0}
              className="h-11 px-8 bg-primary text-primary-foreground font-semibold shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
            >
              {isSaving && <LoaderCircle className="mr-2 size-4 animate-spin" />}
              Create Shift
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
