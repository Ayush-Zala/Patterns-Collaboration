"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Link2, RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";


type Provider = "gmail" | "outlook";

type Channel = {
  id: string;
  name: string;
  email_address: string;
  provider: Provider;
  oauth_account_id: string | null;
  oauth_status?: "connected" | "disconnected" | "expired" | "reauth_required";
  is_active: boolean;
  created_at: string;
  sync_state?: {
    status?: string;
    sync_enabled?: boolean;
    last_synced_at?: string | null;
    watch_expiration_at?: string | null;
    last_error?: string | null;
    cursor?: string | null;
  } | null;
};

type ChannelsResponse = {
  channels?: Channel[];
  error?: string;
};

function getIntegrationStatus(channel: Channel) {
  const status = channel.oauth_status || (channel.oauth_account_id ? "connected" : "disconnected");

  switch (status) {
    case "connected":
      return { label: "Connected", className: "text-emerald-400" };
    case "reauth_required":
      return { label: "Reconnect required", className: "text-amber-300" };
    case "expired":
      return { label: "Expired", className: "text-amber-300" };
    default:
      return { label: "Not connected", className: "text-muted-foreground" };
  }
}

export function SettingsChannels() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSyncingByChannelId, setIsSyncingByChannelId] = useState<Record<string, boolean>>({});
  const [isPullingByChannelId, setIsPullingByChannelId] = useState<Record<string, boolean>>({});
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");


  const loadChannels = useCallback(async (silent = false) => {
    if (silent) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const response = await fetch("/api/settings/channels", {
        method: "GET",
        cache: "no-store",
      });
      const payload = (await response.json()) as ChannelsResponse;
      if (!response.ok) {
        throw new Error(payload.error || "Failed to load channels.");
      }
      setChannels((payload.channels || []).sort((a, b) => a.email_address.localeCompare(b.email_address)));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load channels.");
    } finally {
      if (silent) {
        setIsRefreshing(false);
      } else {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadChannels();
  }, [loadChannels]);

  const filteredChannels = useMemo(() => {
    return channels.filter(
      (channel) =>
        channel.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        channel.email_address.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [channels, searchQuery]);

  const connectedCount = useMemo(() => channels.filter((channel) => channel.oauth_status === "connected").length, [channels]);


  const startSync = useCallback(async (channelId: string) => {
    setError(null);
    setActionMessage(null);
    setIsSyncingByChannelId((prev) => ({ ...prev, [channelId]: true }));

    try {
      const response = await fetch(`/api/settings/channels/${channelId}/sync/start`, {
        method: "POST",
      });
      const payload = (await response.json()) as { error?: string; sync_state?: { status?: string } };
      if (!response.ok) {
        throw new Error(payload.error || "Failed to start sync.");
      }
      setActionMessage(`Sync started for channel. Status: ${payload.sync_state?.status || "watching"}.`);
      await loadChannels(true);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Unable to start sync.");
      await loadChannels(true);
    } finally {
      setIsSyncingByChannelId((prev) => ({ ...prev, [channelId]: false }));
    }
  }, [loadChannels]);

  const pullNow = useCallback(async (channelId: string) => {
    setError(null);
    setActionMessage(null);
    setIsPullingByChannelId((prev) => ({ ...prev, [channelId]: true }));

    try {
      const response = await fetch(`/api/settings/channels/${channelId}/sync/pull`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({}),
      });
      const payload = (await response.json()) as {
        error?: string;
        synced_count?: number;
        inbound_count?: number;
        outbound_count?: number;
      };
      if (!response.ok) {
        throw new Error(payload.error || "Failed to pull sync.");
      }
      setActionMessage(
        `Pull complete. Synced ${payload.synced_count || 0} messages (${payload.inbound_count || 0} inbound, ${payload.outbound_count || 0} outbound).`
      );
      await loadChannels(true);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Unable to pull sync.");
      await loadChannels(true);
    } finally {
      setIsPullingByChannelId((prev) => ({ ...prev, [channelId]: false }));
    }
  }, [loadChannels]);

  return (
    <div className="flex flex-col gap-6 p-10 w-full animate-in fade-in duration-500 min-h-full">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="size-4 bg-emerald-500 rounded-sm shadow-[0_0_10px_rgba(16,185,129,0.3)]" />
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Resources</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Channels</h1>
        </div>
        <div className="flex items-center gap-3">
          <Button type="button" variant="outline" className="gap-2 bg-transparent border-border text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-all" onClick={() => void loadChannels(true)} disabled={isRefreshing}>
            <RefreshCw className={cn("size-4", isRefreshing && "animate-spin")} />
            Refresh
          </Button>
          <Button asChild className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all active:scale-[0.98]">
            <Link href="/settings/connect-channel?from=channels">
              <Link2 className="size-4" />
              Connect Channel
            </Link>
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-background p-6 backdrop-blur-sm shadow-2xl flex flex-col min-h-0 mt-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 pb-6 border-b border-border gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-foreground tracking-tight">Connected Channels</h2>
            <p className="text-sm text-muted-foreground mt-1 truncate">
              Connect external communication channels and route conversations to inboxes.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="relative w-full sm:w-64">
              <Input
                placeholder="Search channels..."
                className="h-10 bg-muted/50 border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-primary/20"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <Badge variant="secondary" className="bg-muted/80 text-muted-foreground border border-border">{channels.length} total</Badge>
              <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">{connectedCount} connected</Badge>
            </div>
          </div>
        </div>

        <div className="space-y-4 overflow-y-auto pr-2">
          {isLoading && <p className="text-sm text-muted-foreground font-medium">Loading channels...</p>}
          {!isLoading && error && <p className="text-sm text-red-400 font-medium">{error}</p>}
          {!isLoading && !error && actionMessage && <p className="text-sm text-emerald-500 font-medium">{actionMessage}</p>}
          
          {!isLoading && !error && channels.length === 0 && (
            <div className="flex h-40 flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-background text-center p-6 mt-4">
               <Link2 className="size-8 text-muted-foreground mb-3" />
               <p className="text-sm text-muted-foreground font-medium">No channels connected yet.</p>
               <Button asChild variant="link" className="mt-1 text-primary hover:text-foreground">
                 <Link href="/settings/connect-channel?from=channels">Connect your first channel</Link>
               </Button>
            </div>
          )}

          {!isLoading &&
            !error &&
            filteredChannels.map((channel) => {
              const integrationStatus = getIntegrationStatus(channel);
              const canRunGoogleSync = channel.provider === "gmail" && channel.oauth_status === "connected";

              return (
                <article key={channel.id} className="group rounded-xl border border-border bg-muted/30 p-5 hover:bg-primary/[0.03] hover:border-primary/30 transition-all">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <p className="text-base font-bold text-foreground group-hover:text-foreground transition-colors">{channel.name}</p>
                        <Badge variant="outline" className="uppercase text-[10px] tracking-widest border-border text-muted-foreground bg-muted/30">
                          {channel.provider}
                        </Badge>
                        <div className="flex items-center gap-1.5 ml-2">
                          <div className={cn("size-2 rounded-full", channel.is_active ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" : "bg-amber-500")} />
                          <span className={cn("text-xs font-bold uppercase tracking-wider", channel.is_active ? "text-emerald-500" : "text-muted-foreground")}>
                            {channel.is_active ? "Active" : "Inactive"}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">{channel.email_address}</p>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        className="h-9 bg-muted/50 border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors text-xs font-semibold"
                        onClick={() => void startSync(channel.id)}
                        disabled={!canRunGoogleSync || isSyncingByChannelId[channel.id]}
                      >
                        {isSyncingByChannelId[channel.id] ? "Starting..." : "Start Sync"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-9 bg-muted/50 border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors text-xs font-semibold"
                        onClick={() => void pullNow(channel.id)}
                        disabled={!canRunGoogleSync || isPullingByChannelId[channel.id]}
                      >
                        {isPullingByChannelId[channel.id] ? "Pulling..." : "Pull Now"}
                      </Button>
                      <Button asChild className="h-9 bg-muted text-foreground hover:bg-zinc-700 text-xs font-semibold">
                        <Link
                          href={`/settings/connect-channel?from=channels&channelId=${encodeURIComponent(channel.id)}&provider=${encodeURIComponent(channel.provider)}&accountEmail=${encodeURIComponent(channel.email_address)}`}
                        >
                          Reconnect OAuth
                        </Link>
                      </Button>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-border pt-4">
                    <div className="space-y-1">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Integration Status</p>
                      <p className={cn("text-sm font-medium", integrationStatus.className)}>
                        {integrationStatus.label}
                      </p>
                    </div>
                    {channel.sync_state?.status && (
                      <div className="space-y-1">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Sync State</p>
                        <p className="text-sm text-muted-foreground font-medium">
                          {channel.sync_state.status}
                          {channel.sync_state.last_synced_at && (
                            <span className="text-muted-foreground ml-2">
                              (last: {format(new Date(channel.sync_state.last_synced_at), "dd MMM, HH:mm")})
                            </span>
                          )}
                        </p>
                      </div>
                    )}
                  </div>
                  {channel.sync_state?.last_error && (
                    <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                      <p className="text-xs text-red-400 font-medium">{channel.sync_state.last_error}</p>
                    </div>
                  )}
                  <div className="mt-4 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Added on {format(new Date(channel.created_at), "dd MMM yyyy")}
                  </div>
                </article>
              );
            })}
        </div>
      </div>
    </div>
  );
}
