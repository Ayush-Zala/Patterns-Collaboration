"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, LoaderCircle, Plus, Users, X } from "lucide-react";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type InboxItem = {
  id: string;
  name: string;
  description: string;
  created_by: string | null;
  created_at: string;
};

type InboxesResponse = {
  inboxes?: InboxItem[];
  error?: string;
};

type PermissionScope = "share_all_sections" | "share_specific_inboxes";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function CreateDelegationForm() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [permissionScope, setPermissionScope] = useState<PermissionScope>("share_all_sections");
  const [inboxes, setInboxes] = useState<InboxItem[]>([]);
  const [selectedInboxIds, setSelectedInboxIds] = useState<string[]>([]);
  const [delegateInput, setDelegateInput] = useState("");
  const [delegateEmails, setDelegateEmails] = useState<string[]>([]);
  const [isLoadingInboxes, setIsLoadingInboxes] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const selectedInboxCount = useMemo(() => selectedInboxIds.length, [selectedInboxIds]);

  const loadInboxes = useCallback(async () => {
    setIsLoadingInboxes(true);
    setError(null);

    try {
      const response = await fetch("/api/settings/inboxes", {
        method: "GET",
        cache: "no-store",
      });
      const payload = (await response.json()) as InboxesResponse;
      if (!response.ok) {
        throw new Error(payload.error || "Failed to load inboxes.");
      }
      setInboxes(payload.inboxes || []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load inboxes.");
    } finally {
      setIsLoadingInboxes(false);
    }
  }, []);

  useEffect(() => {
    void loadInboxes();
  }, [loadInboxes]);

  function addDelegate() {
    const email = delegateInput.trim().toLowerCase();
    if (!email) return;
    if (!isValidEmail(email)) {
      setError("Please enter a valid delegate email.");
      return;
    }
    if (delegateEmails.includes(email)) {
      setDelegateInput("");
      return;
    }

    setError(null);
    setDelegateEmails((current) => [...current, email]);
    setDelegateInput("");
  }

  function removeDelegate(email: string) {
    setDelegateEmails((current) => current.filter((entry) => entry !== email));
  }

  function toggleInbox(inboxId: string) {
    setSelectedInboxIds((current) =>
      current.includes(inboxId) ? current.filter((id) => id !== inboxId) : [...current, inboxId]
    );
  }

  async function onCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (delegateEmails.length === 0) {
      setError("Add at least one delegate email.");
      return;
    }
    if (permissionScope === "share_specific_inboxes" && selectedInboxIds.length === 0) {
      setError("Select at least one inbox when sharing specific inboxes.");
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch("/api/settings/delegations", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          name,
          permission_scope: permissionScope,
          inbox_ids: selectedInboxIds,
          delegate_emails: delegateEmails,
        }),
      });
      const payload = (await response.json()) as { error?: string; delegation?: { name?: string } };
      if (!response.ok) {
        throw new Error(payload.error || "Failed to create delegation.");
      }

      setSuccess(`Delegation "${payload.delegation?.name || "created"}" is ready.`);
      setTimeout(() => {
        router.push("/settings/delegations");
      }, 700);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Unable to create delegation.");
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
              <Users className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Create Delegation</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Set permission scope and add delegates for inbox access.
              </p>
            </div>
          </div>
        </div>

        <form className="space-y-8" onSubmit={onCreate}>
          <div className="space-y-2">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Delegation name (optional)</label>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Sales backup delegation"
              className="h-12 bg-muted/50 border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-primary/20 text-base"
            />
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Permissions</label>
            <div className="grid sm:grid-cols-2 gap-4">
              <label className={cn(
                "flex items-start gap-4 rounded-xl border p-4 cursor-pointer transition-all",
                permissionScope === "share_all_sections" 
                  ? "bg-primary/5 border-primary/30 ring-1 ring-primary/20" 
                  : "bg-muted/30 border-border hover:border-border"
              )}>
                <input
                  type="radio"
                  name="permission_scope"
                  value="share_all_sections"
                  checked={permissionScope === "share_all_sections"}
                  onChange={() => setPermissionScope("share_all_sections")}
                  className="mt-1 size-4 accent-primary bg-muted border-border cursor-pointer"
                />
                <div>
                  <p className={cn("text-sm font-bold", permissionScope === "share_all_sections" ? "text-primary" : "text-foreground")}>Share all sections</p>
                  <p className="text-xs text-muted-foreground mt-1">Delegates can access all shared inbox sections.</p>
                </div>
              </label>
              <label className={cn(
                "flex items-start gap-4 rounded-xl border p-4 cursor-pointer transition-all",
                permissionScope === "share_specific_inboxes" 
                  ? "bg-primary/5 border-primary/30 ring-1 ring-primary/20" 
                  : "bg-muted/30 border-border hover:border-border"
              )}>
                <input
                  type="radio"
                  name="permission_scope"
                  value="share_specific_inboxes"
                  checked={permissionScope === "share_specific_inboxes"}
                  onChange={() => setPermissionScope("share_specific_inboxes")}
                  className="mt-1 size-4 accent-primary bg-muted border-border cursor-pointer"
                />
                <div>
                  <p className={cn("text-sm font-bold", permissionScope === "share_specific_inboxes" ? "text-primary" : "text-foreground")}>Share specific inboxes</p>
                  <p className="text-xs text-muted-foreground mt-1">Delegates can access only selected inboxes.</p>
                </div>
              </label>
            </div>
          </div>

          {permissionScope === "share_specific_inboxes" && (
            <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-5 animate-in slide-in-from-top-2 duration-300">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Select inboxes ({selectedInboxCount} selected)
              </p>
              {isLoadingInboxes && <p className="text-sm text-muted-foreground font-medium">Loading inboxes...</p>}
              {!isLoadingInboxes && inboxes.length === 0 && (
                <p className="text-sm text-red-400 font-medium">No inboxes found. Create inboxes first.</p>
              )}
              {!isLoadingInboxes && (
                <div className="grid sm:grid-cols-2 gap-3 mt-2">
                  {inboxes.map((inbox) => (
                    <label key={inbox.id} className="flex items-center gap-3 text-sm cursor-pointer group/label">
                      <input
                        type="checkbox"
                        checked={selectedInboxIds.includes(inbox.id)}
                        onChange={() => toggleInbox(inbox.id)}
                        className="size-4 accent-primary bg-muted border-border cursor-pointer rounded"
                      />
                      <span className="font-bold text-muted-foreground group-hover/label:text-foreground transition-colors">{inbox.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="space-y-4 rounded-xl border border-border bg-muted/30 p-5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Add delegates</p>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <Input
                type="email"
                value={delegateInput}
                onChange={(event) => setDelegateInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addDelegate();
                  }
                }}
                placeholder="delegate@company.com"
                className="h-11 bg-muted/50 border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-primary/20 text-base flex-1"
              />
              <Button type="button" variant="secondary" onClick={addDelegate} className="h-11 px-6 bg-muted text-muted-foreground hover:bg-zinc-700 hover:text-foreground transition-colors border border-border">
                <Plus className="size-4 mr-2" />
                Add Delegate
              </Button>
            </div>

            {delegateEmails.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-border">
                {delegateEmails.map((email) => (
                  <span
                    key={email}
                    className="inline-flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/10 pl-3 pr-1 py-1.5 text-sm font-medium text-primary shadow-[0_0_10px_rgba(var(--primary),0.05)]"
                  >
                    {email}
                    <button
                      type="button"
                      onClick={() => removeDelegate(email)}
                      className="rounded-md p-1 text-primary/70 hover:bg-primary/20 hover:text-primary transition-colors"
                      aria-label={`Remove ${email}`}
                    >
                      <X className="size-3.5" />
                    </button>
                  </span>
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
              <Link href="/settings/delegations">Cancel</Link>
            </Button>
            <Button type="submit" disabled={isCreating} className="h-11 px-8 bg-primary text-primary-foreground font-semibold shadow-lg shadow-primary/20 transition-all active:scale-[0.98]">
              {isCreating && <LoaderCircle className="size-4 animate-spin mr-2" />}
              {isCreating ? "Creating..." : "Create Delegation"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
