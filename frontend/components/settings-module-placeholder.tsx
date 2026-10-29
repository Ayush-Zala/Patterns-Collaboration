"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function SettingsModulePlaceholder({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col gap-6 p-10 w-full animate-in fade-in duration-500 min-h-full">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="size-4 bg-emerald-500 rounded-sm shadow-[0_0_10px_rgba(16,185,129,0.3)]" />
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Module</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{title}</h1>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-background p-6 backdrop-blur-sm shadow-2xl flex flex-col min-h-0 mt-4 max-w-2xl">
        <div className="mb-6 pb-6 border-b border-border">
          <h2 className="text-xl font-bold text-foreground tracking-tight">{title}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {description}
          </p>
        </div>

        <div className="flex flex-col items-center justify-center p-10 text-center rounded-xl border border-dashed border-border bg-muted/30">
          <p className="text-sm text-muted-foreground mb-6">
            This module shell is ready. We can wire full create/list/edit flows next.
          </p>
          <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all active:scale-[0.98]">
            <Link href="/settings/inboxes">Go to Manage Inboxes</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
