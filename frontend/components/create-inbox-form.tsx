"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircle2, LoaderCircle, Mailbox } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function CreateInboxForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function onCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setIsCreating(true);

    try {
      const response = await fetch("/api/settings/inboxes", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          name,
          description,
        }),
      });
      const payload = (await response.json()) as { error?: string; inbox?: { name?: string } };
      if (!response.ok) {
        throw new Error(payload.error || "Failed to create inbox.");
      }

      setSuccess(`Inbox "${payload.inbox?.name || name}" created.`);
      setTimeout(() => {
        router.push("/settings/inboxes");
      }, 700);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Unable to create inbox.");
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 p-10 w-full animate-in fade-in duration-500 min-h-full items-center justify-start">
      <div className="w-full max-w-2xl rounded-2xl border border-border bg-background p-8 backdrop-blur-sm shadow-2xl flex flex-col mt-4">
        <div className="mb-8 pb-6 border-b border-border">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Mailbox className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Create Inbox</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Add inbox name and description to create a new shared inbox.
              </p>
            </div>
          </div>
        </div>

        <form className="space-y-6" onSubmit={onCreate}>
          <div className="space-y-2">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Inbox Name</label>
            <Input 
              required 
              value={name} 
              onChange={(event) => setName(event.target.value)} 
              placeholder="e.g. Sales Inbox" 
              className="h-12 bg-muted/50 border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-primary/20 text-base"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Description</label>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What this inbox is used for..."
              className="min-h-32 w-full resize-y rounded-xl border border-border bg-muted/50 px-4 py-3 text-base text-foreground placeholder:text-muted-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-primary/20 transition-all"
            />
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
              <Link href="/settings/inboxes">Cancel</Link>
            </Button>
            <Button type="submit" disabled={isCreating} className="h-11 px-8 bg-primary text-primary-foreground font-semibold shadow-lg shadow-primary/20 transition-all active:scale-[0.98]">
              {isCreating && <LoaderCircle className="size-4 animate-spin mr-2" />}
              {isCreating ? "Creating..." : "Create Inbox"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
