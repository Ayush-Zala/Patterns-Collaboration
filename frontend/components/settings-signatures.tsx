"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { PenLine, Plus, RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Channel = {
  id: string;
  name: string;
  email_address: string;
  provider: "gmail" | "outlook";
};

type Signature = {
  id: string;
  name: string;
  display_name: string;
  sender_from_lines: string[];
  channel_ids: string[];
  channels?: Channel[];
  created_by: string | null;
  created_at: string;
};

type SignaturesResponse = {
  signatures?: Signature[];
  error?: string;
};

export function SettingsSignatures() {
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSignatures = useCallback(async (silent = false) => {
    if (silent) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const response = await fetch("/api/settings/signatures", {
        method: "GET",
        cache: "no-store",
      });
      const payload = (await response.json()) as SignaturesResponse;
      if (!response.ok) {
        throw new Error(payload.error || "Failed to load signatures.");
      }
      setSignatures(payload.signatures || []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load signatures.");
    } finally {
      if (silent) {
        setIsRefreshing(false);
      } else {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadSignatures();
  }, [loadSignatures]);

  return (
    <div className="flex flex-col gap-6 p-10 w-full animate-in fade-in duration-500 min-h-full">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="size-4 bg-emerald-500 rounded-sm shadow-[0_0_10px_rgba(16,185,129,0.3)]" />
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Resources</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Signatures</h1>
        </div>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            className="gap-2 bg-transparent border-border text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-all"
            onClick={() => void loadSignatures(true)}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn("size-4", isRefreshing && "animate-spin")} />
            Refresh
          </Button>
          <Button asChild className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all active:scale-[0.98]">
            <Link href="/settings/signatures/create">
              <Plus className="size-4" />
              Create Signature
            </Link>
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-background p-6 backdrop-blur-sm shadow-2xl flex flex-col min-h-0 mt-4">
        <div className="mb-6 pb-6 border-b border-border">
          <h2 className="text-xl font-bold text-foreground tracking-tight">Email Signatures</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Create signatures and control their visibility across different communication channels.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 overflow-y-auto pr-2 pb-4">
          {isLoading && <p className="text-sm text-muted-foreground font-medium col-span-full">Loading signatures...</p>}
          {!isLoading && error && <p className="text-sm text-red-400 font-medium col-span-full">{error}</p>}
          
          {!isLoading && !error && signatures.length === 0 && (
            <div className="col-span-full flex h-40 flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-background text-center p-6 mt-4">
               <PenLine className="size-8 text-muted-foreground mb-3" />
               <p className="text-sm text-muted-foreground font-medium">No signatures created yet.</p>
               <Button asChild variant="link" className="mt-1 text-primary hover:text-foreground">
                 <Link href="/settings/signatures/create">Create your first signature</Link>
               </Button>
            </div>
          )}

          {!isLoading &&
            !error &&
            signatures.map((signature) => (
              <article key={signature.id} className="group flex flex-col justify-between rounded-xl border border-border bg-muted/30 p-5 hover:bg-primary/[0.03] hover:border-primary/30 transition-all">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <div className="inline-flex items-center gap-3">
                      <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary border border-primary/20 group-hover:bg-primary group-hover:text-foreground transition-colors">
                        <PenLine className="size-4" />
                      </div>
                      <p className="font-bold text-foreground group-hover:text-foreground transition-colors">{signature.name}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Sender Identity</p>
                      <div className="space-y-0.5">
                        {signature.sender_from_lines.map((line, idx) => (
                          <p key={`${signature.id}-line-${idx}`} className="text-sm text-muted-foreground font-medium truncate">
                            {line}
                          </p>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Channel Access ({signature.channels?.length || 0})</p>
                      <div className="flex flex-wrap gap-1.5">
                        {signature.channels?.length ? (
                          signature.channels.map((channel) => (
                            <Badge key={channel.id} variant="outline" className="bg-muted/30 border-border text-muted-foreground text-[10px] uppercase">
                              {channel.name}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground italic">No channels assigned</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-5 pt-4 border-t border-border flex items-center justify-between">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Added {format(new Date(signature.created_at), "MMM d, yyyy")}
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
