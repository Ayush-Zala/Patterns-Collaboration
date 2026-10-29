"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Search, Plus, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function SnoozesPage() {
  const [snoozes, setSnoozes] = useState([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadSnoozes() {
      try {
        const res = await fetch("/api/settings/user-settings/snoozes");
        if (res.ok) {
          const data = await res.json();
          setSnoozes(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    loadSnoozes();
  }, []);

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this snooze?")) return;
    try {
      const res = await fetch(`/api/settings/user-settings/snoozes/${id}`, { method: "DELETE" });
      if (res.ok) {
        setSnoozes(prev => prev.filter((s: any) => s.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  }

  const filteredSnoozes = snoozes.filter((s: any) => 
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border bg-background p-6 backdrop-blur-xl">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Snoozes</h1>
        <p className="mt-1.5 text-sm text-muted-foreground max-w-2xl">
          Create and manage your custom snooze presets for conversations.
        </p>
      </div>

      <div className="flex-1 p-6 flex flex-col min-h-0 bg-background">
        <div className="flex items-center justify-between mb-6">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input 
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search snoozes..." 
              className="pl-9 h-9 bg-muted/50 border-border focus-visible:ring-indigo-500/20"
            />
          </div>
          <Button asChild className="h-9 gap-2 bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 transition-all active:scale-95">
            <Link href="/settings/snoozes/create">
              <Plus className="size-4" />
              Create Snooze
            </Link>
          </Button>
        </div>

        <ScrollArea className="flex-1">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : filteredSnoozes.length > 0 ? (
            <div className="grid gap-3">
              {filteredSnoozes.map((snooze: any) => (
                <div key={snooze.id} className="flex items-center justify-between p-4 rounded-xl border border-border bg-card hover:border-border transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="size-8 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                      <Clock className="size-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">{snooze.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {snooze.type === "day_time" 
                          ? `Reopens on ${snooze.day} at ${snooze.time}`
                          : `Reopens after ${snooze.duration}`}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(snooze.id)} className="text-red-400 hover:text-red-300 hover:bg-red-400/10">
                    Delete
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="size-16 rounded-full bg-card flex items-center justify-center mb-4 border border-border">
                <Clock className="size-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-muted-foreground">No snoozes found</h3>
              <p className="text-sm text-muted-foreground max-w-sm mt-1">
                {search ? "Try adjusting your search term." : "You haven't created any custom snoozes yet."}
              </p>
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
