"use client";

import { Input } from "@/components/ui/input";
import { Search, Inbox as InboxIcon, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface SharedInboxData {
  id: string;
  name: string;
  hasAccess: boolean;
  grantedThrough: string;
}

export function TeammateSharedInboxesTab({ inboxes }: { inboxes: SharedInboxData[] }) {
  const [inboxState, setInboxState] = useState(inboxes || []);
  const [isSaving, setIsSaving] = useState(false);

  const toggleAccess = (id: string, checked: boolean) => {
    setInboxState(prev => prev.map(i => i.id === id ? { ...i, hasAccess: checked } : i));
  };

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise(r => setTimeout(r, 800));
    setIsSaving(false);
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
          onClick={handleSave}
          disabled={isSaving}
          className="bg-white text-black hover:bg-zinc-200"
        >
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Save changes
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-background overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border">
              <th className="py-4 px-6 text-xs font-semibold text-muted-foreground">Inbox</th>
              <th className="py-4 px-6 text-xs font-semibold text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  Access
                </div>
              </th>
              <th className="py-4 px-6 text-xs font-semibold text-muted-foreground">Granted through</th>
            </tr>
          </thead>
          <tbody>
            {inboxState.length > 0 ? (
              inboxState.map((inbox) => (
                <tr key={inbox.id} className="border-b border-border hover:bg-white/5 transition-colors group">
                  <td className="py-4 px-6 w-[40%]">
                    <div className="flex items-center gap-3">
                      <div className="size-8 rounded-lg bg-pink-500/10 flex items-center justify-center shrink-0">
                        <InboxIcon className="size-4 text-pink-500" />
                      </div>
                      <div className="text-sm font-medium text-foreground">{inbox.name}</div>
                    </div>
                  </td>
                  <td className="py-4 px-6 w-[20%]">
                    <Switch 
                      checked={inbox.hasAccess} 
                      onCheckedChange={(c) => toggleAccess(inbox.id, c)} 
                      className="data-[state=checked]:bg-[#6b5eed]"
                    />
                  </td>
                  <td className="py-4 px-6 w-[40%]">
                    <div className="text-sm text-muted-foreground">
                      {inbox.grantedThrough}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="py-12 text-center text-muted-foreground text-sm">
                  No shared inboxes found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
