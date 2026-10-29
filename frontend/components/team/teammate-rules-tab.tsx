"use client";

import { Input } from "@/components/ui/input";
import { Search, Settings as Gear, Inbox, GitBranch, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function TeammateRulesTab({ rules }: { rules: any[] }) {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    setIsCreating(true);
    await new Promise(r => setTimeout(r, 800));
    setIsCreating(false);
    alert("This would open the 'Create Rule' modal.");
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500">
      <div className="flex items-center gap-3 mb-6 bg-background p-1">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input 
            placeholder="Search" 
            className="pl-9 bg-muted/50 border-border text-foreground focus-visible:ring-1 focus-visible:ring-zinc-700 h-9 rounded-md"
          />
        </div>

        <Select defaultValue="all">
          <SelectTrigger className="w-[140px] bg-muted/50 border-border text-foreground h-9">
            <div className="flex items-center gap-2">
              <Inbox className="size-4 text-muted-foreground" />
              <SelectValue placeholder="All inboxes" />
            </div>
          </SelectTrigger>
          <SelectContent className="bg-card border-border">
            <SelectItem value="all">All inboxes</SelectItem>
            <SelectItem value="shared">Shared inboxes</SelectItem>
            <SelectItem value="individual">Individual inboxes</SelectItem>
          </SelectContent>
        </Select>

        <Select defaultValue="contains">
          <SelectTrigger className="w-[150px] bg-muted/50 border-border text-foreground h-9">
            <div className="flex items-center gap-2">
              <Gear className="size-4 text-muted-foreground" />
              <SelectValue placeholder="Rule contains" />
            </div>
          </SelectTrigger>
          <SelectContent className="bg-card border-border text-muted-foreground">
            <SelectItem value="contains">Rule contains</SelectItem>
            <SelectItem value="archive">Archive, reopen, or delete</SelectItem>
            <SelectItem value="assign">Assign or unassign</SelectItem>
            <SelectItem value="comment">Comment</SelectItem>
            <SelectItem value="stages">Conversation Stages</SelectItem>
            <SelectItem value="csat">CSAT</SelectItem>
            <SelectItem value="draft">Message draft</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" className="h-9 border-border bg-muted/50 text-[#6b5eed] hover:bg-[#6b5eed]/10 hover:text-[#5b4fcc] gap-2 rounded-md transition-colors">
          <GitBranch className="size-4" />
          Branching rules
        </Button>

        <button className="text-sm font-medium text-[#6b5eed] hover:text-[#5b4fcc] transition-colors ml-2">
          Clear all
        </button>

        <div className="flex-1" />

        <Button 
          onClick={handleCreate}
          disabled={isCreating}
          className="bg-[#6b5eed] hover:bg-[#5b4fcc] text-white h-9 rounded-md gap-2"
        >
          Create rule
          <ChevronDown className="size-4" />
        </Button>
      </div>

      <div className="flex-1 rounded-xl border border-border bg-background flex flex-col items-center justify-center min-h-[400px]">
        <div className="size-16 rounded-2xl bg-muted/80 flex items-center justify-center mb-6 shadow-inner">
          <Gear className="size-8 text-muted-foreground" />
        </div>
        <h3 className="text-sm font-medium text-foreground">No rules match your criteria</h3>
      </div>
    </div>
  );
}
