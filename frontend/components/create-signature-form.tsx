"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ChevronDown, LoaderCircle, PenLine } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Channel = {
  id: string;
  name: string;
  email_address: string;
  provider: "gmail" | "outlook";
  oauth_account_id: string | null;
  is_active: boolean;
  created_at: string;
};

type ChannelsResponse = {
  channels?: Channel[];
  error?: string;
};
const CURRENT_SENDER_NAME = "Admin";

export function CreateSignatureForm() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannelIds, setSelectedChannelIds] = useState<string[]>([]);
  const [isLoadingChannels, setIsLoadingChannels] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const selectedChannels = useMemo(
    () => channels.filter((channel) => selectedChannelIds.includes(channel.id)),
    [channels, selectedChannelIds]
  );

  const senderFromPreview = useMemo(
    () => selectedChannels.map((channel) => `${CURRENT_SENDER_NAME} <${channel.email_address}>`),
    [selectedChannels]
  );

  const loadChannels = useCallback(async () => {
    setIsLoadingChannels(true);
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
      setChannels(payload.channels || []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load channels.");
    } finally {
      setIsLoadingChannels(false);
    }
  }, []);

  useEffect(() => {
    void loadChannels();
  }, [loadChannels]);

  function toggleChannel(channelId: string) {
    setSelectedChannelIds((current) =>
      current.includes(channelId) ? current.filter((id) => id !== channelId) : [...current, channelId]
    );
  }

  async function onCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!name.trim()) {
      setError("Signature name is required.");
      return;
    }
    if (selectedChannelIds.length === 0) {
      setError("Select at least one channel in channel access.");
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch("/api/settings/signatures", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          name,
          channel_ids: selectedChannelIds,
        }),
      });
      const payload = (await response.json()) as { error?: string; signature?: { name?: string } };
      if (!response.ok) {
        throw new Error(payload.error || "Failed to create signature.");
      }

      setSuccess(`Signature "${payload.signature?.name || name}" created.`);
      setTimeout(() => {
        router.push("/settings/signatures");
      }, 700);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Unable to create signature.");
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 p-10 w-full animate-in fade-in duration-500 min-h-full items-center justify-start">
      <div className="w-full max-w-3xl rounded-2xl border border-border bg-background p-8 backdrop-blur-sm shadow-2xl flex flex-col mt-4">
        <div className="mb-8 pb-6 border-b border-border">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
              <PenLine className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Create Signature</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Give your signature a name, preview sender info from line, and assign channel access.
              </p>
            </div>
          </div>
        </div>

        <form className="space-y-8" onSubmit={onCreate}>
          <div className="space-y-2">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Signature name</label>
            <Input
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Sales Closing Signature"
              className="h-12 bg-muted/50 border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-primary/20 text-base"
            />
            <p className="text-xs text-muted-foreground italic mt-1.5 ml-1">
              Use a recognizable name so you can find this signature later.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Channel access</label>
            <details className="rounded-xl border border-border bg-muted/50 overflow-hidden group">
              <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <span className="font-medium">
                  {selectedChannelIds.length === 0
                    ? "Select channels"
                    : `${selectedChannelIds.length} channel${selectedChannelIds.length === 1 ? "" : "s"} selected`}
                </span>
                <ChevronDown className="size-4 text-muted-foreground group-open:rotate-180 transition-transform" />
              </summary>
              <div className="border-t border-border px-4 py-3 bg-muted/30">
                {isLoadingChannels && <p className="text-sm text-muted-foreground font-medium">Loading channels...</p>}
                {!isLoadingChannels && channels.length === 0 && (
                  <p className="text-sm text-red-400 font-medium">No channels found. Create/connect channels first.</p>
                )}
                {!isLoadingChannels && (
                  <div className="space-y-3">
                    {channels.map((channel) => (
                      <label key={channel.id} className="flex items-start gap-3 text-sm cursor-pointer group/label">
                        <input
                          type="checkbox"
                          checked={selectedChannelIds.includes(channel.id)}
                          onChange={() => toggleChannel(channel.id)}
                          className="mt-1 size-4 accent-primary bg-muted border-border cursor-pointer rounded"
                        />
                        <span className="flex flex-col">
                          <span className="font-bold text-muted-foreground group-hover/label:text-foreground transition-colors">{channel.name}</span>
                          <span className="text-xs text-muted-foreground font-mono mt-0.5">{channel.email_address}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </details>
          </div>

          <div className="rounded-xl border border-border bg-muted/30 p-5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Sender info from line preview</p>
            <p className="text-xs text-muted-foreground mb-4">
              This is generated from the sender profile and selected sending channel email.
            </p>
            {senderFromPreview.length === 0 ? (
              <div className="p-4 rounded-lg border border-dashed border-border bg-muted/20 text-center">
                <p className="text-sm text-muted-foreground italic">Select channels above to preview sender from lines.</p>
              </div>
            ) : (
              <div className="space-y-2 bg-black/20 p-4 rounded-lg border border-border">
                {senderFromPreview.map((line) => (
                  <p key={line} className="text-sm font-medium text-muted-foreground font-mono truncate">
                    {line}
                  </p>
                ))}
              </div>
            )}
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm font-medium text-red-400">
              {error}
            </div>
          )}
          
          {success && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2 text-sm font-medium text-emerald-500">
              <CheckCircle2 className="size-5" />
              {success}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <Button asChild variant="outline" className="h-11 px-6 bg-muted/50 border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
              <Link href="/settings/signatures">Cancel</Link>
            </Button>
            <Button type="submit" disabled={isCreating} className="h-11 px-8 bg-primary text-primary-foreground font-semibold shadow-lg shadow-primary/20 transition-all active:scale-[0.98]">
              {isCreating && <LoaderCircle className="size-4 animate-spin mr-2" />}
              {isCreating ? "Creating..." : "Create Signature"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
