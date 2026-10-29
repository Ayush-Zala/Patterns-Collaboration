"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { Plus, RefreshCw, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type InboxSummary = {
  id: string;
  name: string;
  description: string;
  created_by: string | null;
  created_at: string;
};

type Delegation = {
  id: string;
  name: string;
  permission_scope: "share_all_sections" | "share_specific_inboxes";
  inbox_ids: string[];
  delegate_emails: string[];
  inboxes?: InboxSummary[];
  created_by: string | null;
  created_at: string;
};

type DelegationsResponse = {
  delegations?: Delegation[];
  error?: string;
};

export function SettingsDelegations() {
  const [delegations, setDelegations] = useState<Delegation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const loadDelegations = useCallback(async (silent = false) => {
    if (silent) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);
    setActionMessage(null);

    try {
      const response = await fetch("/api/settings/delegations", {
        method: "GET",
        cache: "no-store",
      });
      const payload = (await response.json()) as DelegationsResponse;
      if (!response.ok) {
        throw new Error(payload.error || "Failed to load delegations.");
      }
      setDelegations(payload.delegations || []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load delegations.");
    } finally {
      if (silent) {
        setIsRefreshing(false);
      } else {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadDelegations();
  }, [loadDelegations]);

  const deleteDelegation = useCallback(async (delegation: Delegation) => {
    const confirmed = window.confirm(`Delete delegation "${delegation.name}"?`);
    if (!confirmed) return;

    setIsDeletingId(delegation.id);
    setError(null);
    setActionMessage(null);

    try {
      const response = await fetch(`/api/settings/delegations/${delegation.id}`, {
        method: "DELETE",
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "Failed to delete delegation.");
      }
      await loadDelegations(true);
      setActionMessage(`Delegation "${delegation.name}" deleted.`);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete delegation.");
    } finally {
      setIsDeletingId(null);
    }
  }, [loadDelegations]);

  return (
    <div className="flex flex-col gap-6 p-10 w-full animate-in fade-in duration-500 min-h-full">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="size-4 bg-emerald-500 rounded-sm shadow-[0_0_10px_rgba(16,185,129,0.3)]" />
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Resources</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Delegations</h1>
        </div>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            className="gap-2 bg-transparent border-border text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-all"
            onClick={() => void loadDelegations(true)}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn("size-4", isRefreshing && "animate-spin")} />
            Refresh
          </Button>
          <Button asChild className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all active:scale-[0.98]">
            <Link href="/settings/delegations/create">
              <Plus className="size-4" />
              Create Delegation
            </Link>
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-background p-6 backdrop-blur-sm shadow-2xl flex flex-col min-h-0 mt-4">
        <div className="mb-6 pb-6 border-b border-border">
          <h2 className="text-xl font-bold text-foreground tracking-tight">Active Delegations</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage delegate access across all sections or selected inboxes.
          </p>
        </div>

        <div className="space-y-4 overflow-y-auto pr-2">
          {isLoading && <p className="text-sm text-muted-foreground font-medium">Loading delegations...</p>}
          {!isLoading && error && <p className="text-sm text-red-400 font-medium">{error}</p>}
          {!isLoading && !error && actionMessage && <p className="text-sm text-emerald-500 font-medium">{actionMessage}</p>}
          
          {!isLoading && !error && delegations.length === 0 && (
            <div className="flex h-40 flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-background text-center p-6 mt-4">
               <ShieldCheck className="size-8 text-muted-foreground mb-3" />
               <p className="text-sm text-muted-foreground font-medium">No delegations created yet.</p>
               <Button asChild variant="link" className="mt-1 text-primary hover:text-foreground">
                 <Link href="/settings/delegations/create">Create your first delegation</Link>
               </Button>
            </div>
          )}

          {!isLoading &&
            !error &&
            delegations.map((delegation) => (
              <article key={delegation.id} className="group rounded-xl border border-border bg-muted/30 p-5 hover:bg-primary/[0.03] hover:border-primary/30 transition-all">
                <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <p className="text-lg font-bold text-foreground group-hover:text-foreground transition-colors">{delegation.name}</p>
                      <Badge variant="outline" className={cn("text-[10px] uppercase tracking-widest border-border", delegation.permission_scope === "share_all_sections" ? "bg-primary/10 text-primary border-primary/20" : "bg-muted/30 text-muted-foreground")}>
                        {delegation.permission_scope === "share_all_sections" ? "All Sections" : "Specific Inboxes"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground font-mono mt-2">{delegation.delegate_emails.join(", ")}</p>
                  </div>
                  
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors text-xs font-semibold opacity-0 group-hover:opacity-100"
                    disabled={isDeletingId === delegation.id}
                    onClick={() => void deleteDelegation(delegation)}
                  >
                    {isDeletingId === delegation.id ? "Deleting..." : "Delete"}
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-border pt-4 mt-2">
                  <div className="space-y-1">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Access Scope</p>
                    <p className="text-sm text-muted-foreground font-medium">
                      {delegation.permission_scope === "share_all_sections"
                        ? "Full Access (All Sections)"
                        : `${delegation.inboxes?.map((inbox) => inbox.name).join(", ") || "Specific Inboxes"}`}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Delegates</p>
                    <p className="text-sm text-muted-foreground font-medium flex items-center gap-2">
                      <ShieldCheck className="size-4 text-primary" />
                      {delegation.delegate_emails.length} Delegate{delegation.delegate_emails.length === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>
                
                <div className="mt-4 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Configured on {format(new Date(delegation.created_at), "dd MMM yyyy")}
                </div>
              </article>
            ))}
        </div>
      </div>
    </div>
  );
}
