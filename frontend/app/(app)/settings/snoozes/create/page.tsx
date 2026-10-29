"use client";
import { ScopeBreadcrumb } from "@/components/settings/scope-breadcrumb";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export default function CreateSnoozePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [type, setType] = useState("day_time");
  const [day, setDay] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const times = ["8:00 AM", "9:00 AM", "10:00 AM", "1:00 PM", "3:00 PM", "5:00 PM"];
  const durations = ["1 hour", "2 hours", "12 hours", "24 hours", "2 days", "1 week"];

  async function handleSave() {
    if (!name.trim()) return alert("Name is required");
    if (type === "day_time" && (!day || !time)) return alert("Day and Time are required");
    if (type === "duration" && !duration) return alert("Duration is required");

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/settings/user-settings/snoozes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, type, day, time, duration }),
      });
      if (res.ok) {
        router.push("/settings/snoozes");
      } else {
        alert("Failed to save snooze");
      }
    } catch (err) {
      console.error(err);
      alert("Error saving snooze");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="border-b border-border p-6 flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild className="text-muted-foreground hover:text-foreground shrink-0">
          <Link href="/settings/snoozes">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <div className="text-xs text-muted-foreground flex items-center gap-2 mb-1">
            <ScopeBreadcrumb /> <span>›</span> Snoozes
          </div>
          <h1 className="text-xl font-bold text-foreground">Create snooze</h1>
        </div>
      </div>

      <div className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-xl space-y-8">
          
          <div className="space-y-2">
            <Label className="text-foreground font-semibold flex items-center gap-1">Name <span className="text-red-500">*</span></Label>
            <Input 
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Add name"
              className="bg-muted/50 border-indigo-500/50 focus-visible:ring-indigo-500/20 text-foreground"
            />
          </div>

          <div className="h-px bg-muted/50 w-full" />

          {/* Day and Time Option */}
          <div className="flex gap-4">
            <div className="mt-1">
              <input 
                type="radio" 
                checked={type === "day_time"} 
                onChange={() => setType("day_time")}
                className="size-4 accent-indigo-500 border-border bg-card cursor-pointer"
              />
            </div>
            <div className="flex-1 space-y-4">
              <div>
                <Label className="text-foreground font-semibold text-base block cursor-pointer" onClick={() => setType("day_time")}>Reopens on a day and time</Label>
                <p className="text-muted-foreground text-sm mt-0.5">Reopen conversations on a consistent day</p>
              </div>

              {type === "day_time" && (
                <div className="space-y-4 max-w-xs animate-in fade-in duration-200">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground font-medium">Day</Label>
                    <Select value={day} onValueChange={setDay}>
                      <SelectTrigger className="bg-muted/50 border-border">
                        <SelectValue placeholder="Day of snooze" />
                      </SelectTrigger>
                      <SelectContent>
                        {days.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground font-medium">At</Label>
                    <Select value={time} onValueChange={setTime}>
                      <SelectTrigger className="bg-muted/50 border-border">
                        <SelectValue placeholder="At time of snooze" />
                      </SelectTrigger>
                      <SelectContent>
                        {times.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Duration Option */}
          <div className="flex gap-4">
            <div className="mt-1">
              <input 
                type="radio" 
                checked={type === "duration"} 
                onChange={() => setType("duration")}
                className="size-4 accent-indigo-500 border-border bg-card cursor-pointer"
              />
            </div>
            <div className="flex-1 space-y-4">
              <div>
                <Label className="text-foreground font-semibold text-base block cursor-pointer" onClick={() => setType("duration")}>Reopens after an amount of time</Label>
                <p className="text-muted-foreground text-sm mt-0.5">Reopen conversations after a certain amount of time</p>
              </div>

              {type === "duration" && (
                <div className="space-y-2 max-w-xs animate-in fade-in duration-200">
                  <Label className="text-muted-foreground font-medium">Duration</Label>
                  <Select value={duration} onValueChange={setDuration}>
                    <SelectTrigger className="bg-muted/50 border-border">
                      <SelectValue placeholder="Amount of time" />
                    </SelectTrigger>
                    <SelectContent>
                      {durations.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>

          <div className="pt-6">
             <Button 
                onClick={handleSave} 
                disabled={isSubmitting}
                className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20"
             >
                {isSubmitting ? "Saving..." : "Save snooze"}
             </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function UserIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
