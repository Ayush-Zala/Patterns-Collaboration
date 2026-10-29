"use client";

import { Input } from "@/components/ui/input";
import { Search, Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const DEFAULT_SNOOZES = [
  { id: "s1", name: "Later today", time: "In 3 hours" },
  { id: "s2", name: "This evening", time: "In 1 day at 6:00 PM" },
  { id: "s3", name: "This week", time: "In 2 days at 9:00 AM" },
  { id: "s4", name: "Next week", time: "Monday at 9:00 AM" },
  { id: "s5", name: "Tomorrow", time: "In 1 day at 9:00 AM" }
];

export function TeammateSnoozesTab() {
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    setIsCreating(true);
    await new Promise(r => setTimeout(r, 800));
    setIsCreating(false);
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-6 bg-background p-1">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input 
            placeholder="Search" 
            className="pl-9 bg-muted/50 border-border text-foreground focus-visible:ring-1 focus-visible:ring-zinc-700 h-9 rounded-md"
          />
        </div>

        <Button 
          onClick={handleCreate}
          disabled={isCreating}
          className="bg-[#6b5eed] hover:bg-[#5b4fcc] text-white h-9 rounded-md px-6"
        >
          {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Create snooze
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-background overflow-hidden min-h-[400px]">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border bg-card/20">
              <th className="py-4 px-6 text-xs font-semibold text-muted-foreground">Name</th>
            </tr>
          </thead>
          <tbody>
            {DEFAULT_SNOOZES.map((snooze) => (
              <tr key={snooze.id} className="border-b border-border hover:bg-white/5 transition-colors group">
                <td className="py-4 px-6">
                  <div className="flex items-center gap-4">
                    <div className="size-8 rounded-lg bg-muted/80 flex items-center justify-center shrink-0 border border-border shadow-inner">
                      <Clock className="size-4 text-muted-foreground" />
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-bold text-foreground tracking-tight">{snooze.name}</span>
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{snooze.time}</span>
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
