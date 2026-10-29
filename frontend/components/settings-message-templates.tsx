"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { FileText, Plus, RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";


type TemplateFolder = {
  id: string;
  name: string;
  created_at: string;
};

type MessageTemplate = {
  id: string;
  name: string;
  subject: string;
  folder_id: string;
  folder?: TemplateFolder | null;
  created_by: string | null;
  created_at: string;
};

type MessageTemplatesResponse = {
  templates?: MessageTemplate[];
  folders?: TemplateFolder[];
  error?: string;
};

export function SettingsMessageTemplates() {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");


  const loadTemplates = useCallback(async (silent = false) => {
    if (silent) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const response = await fetch("/api/settings/message-templates", {
        method: "GET",
        cache: "no-store",
      });
      const payload = (await response.json()) as MessageTemplatesResponse;
      if (!response.ok) {
        throw new Error(payload.error || "Failed to load templates.");
      }
      setTemplates(payload.templates || []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load templates.");
    } finally {
      if (silent) {
        setIsRefreshing(false);
      } else {
        setIsLoading(false);
      }
    }
  }, []);

  const filteredTemplates = useMemo(() => {
    return templates.filter(
      (template) =>
        template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.subject.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [templates, searchQuery]);

  useEffect(() => {
    void loadTemplates();
  }, [loadTemplates]);


  return (
    <div className="flex flex-col gap-6 p-10 w-full animate-in fade-in duration-500 min-h-full">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="size-4 bg-emerald-500 rounded-sm shadow-[0_0_10px_rgba(16,185,129,0.3)]" />
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Resources</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Message Templates</h1>
        </div>
        <div className="flex items-center gap-3">
          <Button type="button" variant="outline" className="gap-2 bg-transparent border-border text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-all" onClick={() => void loadTemplates(true)} disabled={isRefreshing}>
            <RefreshCw className={cn("size-4", isRefreshing && "animate-spin")} />
            Refresh
          </Button>
          <Button asChild className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all active:scale-[0.98]">
            <Link href="/settings/message-templates/create">
              <Plus className="size-4" />
              Create Template
            </Link>
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-background p-6 backdrop-blur-sm shadow-2xl flex flex-col min-h-0 mt-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 pb-6 border-b border-border gap-4">
          <div>
            <h2 className="text-xl font-bold text-foreground tracking-tight">Reusable Responses</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Create standardized response templates for faster, more consistent replies across the team.
            </p>
          </div>
          <div className="relative w-full md:w-64">
            <Input
              placeholder="Search templates..."
              className="h-10 bg-muted/50 border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-primary/20"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 overflow-y-auto pr-2 pb-4">
          {isLoading && <p className="text-sm text-muted-foreground font-medium col-span-full">Loading templates...</p>}
          {!isLoading && error && <p className="text-sm text-red-400 font-medium col-span-full">{error}</p>}
          
          {!isLoading && !error && templates.length === 0 && (
            <div className="col-span-full flex h-40 flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-background text-center p-6 mt-4">
               <FileText className="size-8 text-muted-foreground mb-3" />
               <p className="text-sm text-muted-foreground font-medium">No templates created yet.</p>
               <Button asChild variant="link" className="mt-1 text-primary hover:text-foreground">
                 <Link href="/settings/message-templates/create">Create your first template</Link>
               </Button>
            </div>
          )}
          
          {!isLoading &&
            !error &&
            filteredTemplates.map((template) => (
              <article key={template.id} className="group flex flex-col justify-between rounded-xl border border-border bg-muted/30 p-5 hover:bg-primary/[0.03] hover:border-primary/30 transition-all h-[200px]">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <p className="text-base font-bold text-foreground group-hover:text-foreground transition-colors line-clamp-1">{template.name}</p>
                    <Badge variant="outline" className="bg-muted/50 border-border text-muted-foreground shrink-0">
                      {template.folder?.name || "Uncategorized"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-3">{template.subject}</p>
                </div>
                
                <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Added {format(new Date(template.created_at), "MMM d, yyyy")}
                  </p>
                  <Button variant="ghost" size="sm" className="h-8 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                    Edit
                  </Button>
                </div>
              </article>
            ))}
        </div>
      </div>
    </div>
  );
}
