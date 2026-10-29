"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, FileText, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type TemplateFolder = {
  id: string;
  name: string;
  created_at: string;
};

type MessageTemplatesResponse = {
  folders?: TemplateFolder[];
  error?: string;
};

export function CreateMessageTemplateForm() {
  const router = useRouter();

  const [folders, setFolders] = useState<TemplateFolder[]>([]);
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [folderId, setFolderId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadFolders = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/settings/message-templates", {
        method: "GET",
        cache: "no-store",
      });
      const payload = (await response.json()) as MessageTemplatesResponse;
      if (!response.ok) {
        throw new Error(payload.error || "Failed to load folders.");
      }
      const nextFolders = payload.folders || [];
      setFolders(nextFolders);
      if (nextFolders.length > 0) {
        setFolderId(nextFolders[0].id);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load folders.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadFolders();
  }, [loadFolders]);

  async function onCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setIsCreating(true);

    try {
      const response = await fetch("/api/settings/message-templates", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          name,
          subject,
          folder_id: folderId,
        }),
      });
      const payload = (await response.json()) as { error?: string; template?: { name?: string } };
      if (!response.ok) {
        throw new Error(payload.error || "Failed to create template.");
      }

      setSuccess(`Template "${payload.template?.name || name}" created.`);
      setTimeout(() => {
        router.push("/settings/message-templates");
      }, 700);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Unable to create template.");
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
              <FileText className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Create Template</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Configure a reusable template with Name, Subject, and where to file it.
              </p>
            </div>
          </div>
        </div>

        {isLoading && <p className="text-sm text-muted-foreground font-medium">Loading folder options...</p>}
        {!isLoading && folders.length === 0 && (
          <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 text-sm font-medium">
            No template folders available. Seed folder data first.
          </div>
        )}
        
        {!isLoading && folders.length > 0 && (
          <form className="space-y-6" onSubmit={onCreate}>
            <div className="space-y-2">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Name</label>
              <Input 
                required 
                value={name} 
                onChange={(event) => setName(event.target.value)} 
                placeholder="e.g. Welcome response" 
                className="h-12 bg-muted/50 border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-primary/20 text-base"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Subject</label>
              <Input
                required
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                placeholder="e.g. Thanks for contacting us"
                className="h-12 bg-muted/50 border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-primary/20 text-base"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">File template under</label>
              <Select value={folderId} onValueChange={setFolderId}>
                <SelectTrigger className="w-full h-12 bg-muted/50 border-border text-foreground focus:ring-primary/20 text-base">
                  <SelectValue placeholder="Select folder" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border text-white">
                  {folders.map((folder) => (
                    <SelectItem key={folder.id} value={folder.id} className="focus:bg-muted focus:text-foreground cursor-pointer">
                      {folder.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                <Link href="/settings/message-templates">Cancel</Link>
              </Button>
              <Button type="submit" disabled={isCreating || !folderId} className="h-11 px-8 bg-primary text-primary-foreground font-semibold shadow-lg shadow-primary/20 transition-all active:scale-[0.98]">
                {isCreating && <LoaderCircle className="size-4 animate-spin mr-2" />}
                {isCreating ? "Creating..." : "Create Template"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
