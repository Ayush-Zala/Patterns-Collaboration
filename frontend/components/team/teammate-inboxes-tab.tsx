"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Inbox as InboxIcon, Lock, Loader2 } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface InboxData {
  id: string;
  name: string;
  description: string;
  access: string;
}

export function TeammateInboxesTab({ inboxes }: { inboxes: InboxData[] }) {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    setIsCreating(true);
    // Simulate a network request
    await new Promise(r => setTimeout(r, 1000));
    setIsCreating(false);
    // Open a modal or push to creation route
    alert("This would open the 'Create Individual Inbox' modal.");
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input 
            placeholder="Search" 
            className="pl-9 bg-muted/50 border-border text-foreground focus-visible:ring-1 focus-visible:ring-zinc-700 h-9 rounded-md"
          />
        </div>
        <Button 
          onClick={handleCreate}
          disabled={isCreating}
          className="bg-[#6b5eed] hover:bg-[#5b4fcc] text-white h-9 rounded-md transition-all"
        >
          {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Create individual inbox
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-background overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border">
              <th className="py-4 px-6 text-xs font-semibold text-muted-foreground">Name</th>
              <th className="py-4 px-6 text-xs font-semibold text-muted-foreground">Access</th>
            </tr>
          </thead>
          <tbody>
            {inboxes && inboxes.length > 0 ? (
              inboxes.map((inbox) => (
                <tr key={inbox.id} className="border-b border-border hover:bg-white/5 transition-colors group">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="size-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <InboxIcon className="size-4 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-foreground">{inbox.name}</div>
                        <div className="text-xs text-muted-foreground">{inbox.description}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Lock className="size-3.5" />
                      {inbox.access}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={2} className="py-12 text-center text-muted-foreground text-sm">
                  No individual inboxes found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
