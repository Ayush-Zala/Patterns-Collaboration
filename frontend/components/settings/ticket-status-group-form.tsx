"use client";

import * as React from "react";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  CircleDashed, 
  Clock, 
  CheckCircle2, 
  Search,
  X,
  ChevronDown,
  Mail
} from "lucide-react";
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

interface TicketStatusGroupFormProps {
  initialData?: any;
  isEdit?: boolean;
}

export function TicketStatusGroupForm({ initialData, isEdit }: TicketStatusGroupFormProps) {
  const router = useRouter();
  const { data: orgData } = authClient.useActiveOrganization();

  const [name, setName] = useState(initialData?.name || "");
  const [selectedStatusIds, setSelectedStatusIds] = useState<string[]>(
    initialData?.statuses?.map((s: any) => s.statusId) || []
  );
  const [selectedInboxIds, setSelectedInboxIds] = useState<string[]>(
    initialData?.inboxes?.map((i: any) => i.inboxId) || []
  );
  
  const [availableStatuses, setAvailableStatuses] = useState<any[]>([]);
  const [availableInboxes, setAvailableInboxes] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [statusSearch, setStatusSearch] = useState("");
  const [inboxSearch, setInboxSearch] = useState("");

  useEffect(() => {
    async function fetchData() {
      if (!orgData?.id) return;
      
      try {
        const [statusesRes, inboxesRes] = await Promise.all([
          fetch("/api/settings/ticketing/statuses", { headers: { "x-org-id": orgData.id } }),
          fetch("/api/settings/inboxes")
        ]);

        if (statusesRes.ok) {
          const data = await statusesRes.json();
          setAvailableStatuses(data);
        }
        if (inboxesRes.ok) {
          const data = await inboxesRes.json();
          setAvailableInboxes(data.inboxes || []);
        }
      } catch (err) {
        console.error(err);
      }
    }
    fetchData();
  }, [orgData?.id]);

  const groupedStatuses = useMemo(() => {
    const filtered = availableStatuses.filter(s => 
      s.name.toLowerCase().includes(statusSearch.toLowerCase())
    );
    return {
      open: filtered.filter(s => s.category === "open"),
      waiting: filtered.filter(s => s.category === "waiting"),
      resolved: filtered.filter(s => s.category === "resolved")
    };
  }, [availableStatuses, statusSearch]);

  const filteredInboxes = useMemo(() => {
    return availableInboxes.filter(i => 
      i.name.toLowerCase().includes(inboxSearch.toLowerCase())
    );
  }, [availableInboxes, inboxSearch]);

  const canSave = name && selectedStatusIds.length > 0 && name.length <= 30;

  const handleSave = async () => {
    if (!canSave || !orgData?.id) return;
    setIsSaving(true);

    try {
      const url = isEdit ? `/api/settings/ticketing/groups/${initialData.id}` : "/api/settings/ticketing/groups";
      const method = isEdit ? "PUT" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: { 
          "Content-Type": "application/json",
          "x-org-id": orgData.id
        },
        body: JSON.stringify({
          name: name.trim(),
          statusIds: selectedStatusIds,
          inboxIds: selectedInboxIds
        }),
      });

      if (res.ok) {
        router.push("/settings/ticketing");
        router.refresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleStatus = (id: string) => {
    setSelectedStatusIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleInbox = (id: string) => {
    setSelectedInboxIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const getSelectedStatusLabels = () => {
    const selected = availableStatuses.filter(s => selectedStatusIds.includes(s.id));
    if (selected.length === 0) return <span className="text-muted-foreground">Select statuses</span>;
    
    return (
      <div className="flex items-center gap-2 overflow-hidden">
        {selected.slice(0, 2).map((s, idx) => (
          <div key={s.id} className="flex items-center gap-1.5 shrink-0">
            {s.category === "open" && <CircleDashed className="size-3.5 text-indigo-400" />}
            {s.category === "waiting" && <Clock className="size-3.5 text-amber-400" />}
            {s.category === "resolved" && <CheckCircle2 className="size-3.5 text-emerald-400" />}
            <span className="text-foreground">{s.name}</span>
            {idx < Math.min(selected.length, 2) - 1 && <span className="text-muted-foreground">,</span>}
          </div>
        ))}
        {selected.length > 2 && (
          <span className="text-muted-foreground shrink-0">, +{selected.length - 2}</span>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-2xl space-y-10">
      <div className="space-y-2">
        <Label className="text-sm font-semibold text-foreground">
          Name <span className="text-red-500">*</span>
        </Label>
        <Input 
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Add name"
          maxLength={30}
          className="bg-muted/50 border-border text-foreground h-11 focus:ring-1 focus:ring-indigo-500/50"
        />
        <div className="text-[11px] text-muted-foreground">Must be under 30 characters</div>
      </div>

      <div className="space-y-4">
        <div className="space-y-1">
          <Label className="text-sm font-semibold text-foreground">
            Ticket statuses <span className="text-red-500">*</span>
          </Label>
          <p className="text-xs text-muted-foreground">Select up to 10 statuses to include in this ticket status group.</p>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
          <div className="p-4 border-b border-border flex items-center justify-between bg-card/40">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input 
                value={statusSearch}
                onChange={e => setStatusSearch(e.target.value)}
                placeholder="Search statuses"
                className="pl-9 bg-muted/50 border-border h-9 text-sm focus:ring-1 focus:ring-indigo-500/50"
              />
            </div>
            <button 
              onClick={() => setSelectedStatusIds([])}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold px-2"
            >
              Clear all
            </button>
          </div>
          
          <ScrollArea className="h-[400px]">
            <table className="w-full text-left border-collapse">
              <thead className="bg-card/40 border-b border-border">
                <tr>
                  <th className="px-6 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest w-[40%]">Status Name</th>
                  <th className="px-6 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Category</th>
                  <th className="px-6 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-right">Include</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/30">
                {availableStatuses.length === 0 ? (
                  <tr><td colSpan={3} className="px-6 py-12 text-center text-muted-foreground italic text-sm">No statuses found. Create some first!</td></tr>
                ) : Object.entries(groupedStatuses).map(([cat, items]) => items.length > 0 && (
                  <React.Fragment key={cat}>
                    <tr className="bg-card/20">
                      <td colSpan={3} className="px-6 py-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{cat}</td>
                    </tr>
                    {items.map(s => (
                      <tr 
                        key={s.id} 
                        className={cn(
                          "hover:bg-muted/10 transition-colors group cursor-pointer",
                          selectedStatusIds.includes(s.id) && "bg-indigo-500/5"
                        )}
                        onClick={(e) => {
                          if ((e.target as HTMLElement).closest('button[role="checkbox"]')) return;
                          toggleStatus(s.id);
                        }}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            <div className="size-9 rounded-full bg-card/40 flex items-center justify-center border border-border shrink-0 shadow-[inset_0_1px_2px_rgba(255,255,255,0.05)]">
                              {cat === "open" && <CircleDashed className="size-4 text-indigo-400 animate-[spin_8s_linear_infinite]" />}
                              {cat === "waiting" && <Clock className="size-4 text-amber-400" />}
                              {cat === "resolved" && <CheckCircle2 className="size-4 text-emerald-500" />}
                            </div>
                            <div className="flex items-center gap-2.5">
                              <span className={cn("text-sm font-bold tracking-tight", selectedStatusIds.includes(s.id) ? "text-foreground" : "text-muted-foreground")}>{s.name}</span>
                              <div className="flex gap-1.5 items-center">
                                {s.isDefault && (
                                  <span className="text-[9px] bg-muted/80 text-muted-foreground px-1.5 py-0.5 rounded font-black tracking-widest border border-border">Default</span>
                                )}
                                {s.isReopen && (
                                  <span className="text-[9px] bg-indigo-900/40 text-indigo-300 px-1.5 py-0.5 rounded font-black tracking-widest border border-indigo-500/20">Reopen</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs text-muted-foreground capitalize font-medium">{cat}</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Checkbox 
                            checked={selectedStatusIds.includes(s.id)}
                            onCheckedChange={() => toggleStatus(s.id)}
                            className="border-border data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600 size-5 rounded-md shadow-sm translate-x-[-8px]"
                          />
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </ScrollArea>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-1">
          <Label className="text-sm font-semibold text-foreground">
            Show in
          </Label>
          <p className="text-xs text-muted-foreground">This ticket status group will only show in the selected inboxes. This setting is also available in inbox settings.</p>
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-between bg-muted/50 border-border text-muted-foreground hover:bg-muted/50">
              <div className="flex items-center gap-2 truncate">
                {selectedInboxIds.length === 0 ? "Select inboxes" : `${selectedInboxIds.length} inboxes selected`}
              </div>
              <ChevronDown className="size-4 text-muted-foreground" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[400px] p-0 bg-popover border-border shadow-2xl" align="start">
            <div className="p-3 border-b border-border flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">Inboxes</span>
              <button 
                onClick={() => setSelectedInboxIds([])}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
              >
                Clear all
              </button>
            </div>
            <div className="p-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input 
                  value={inboxSearch}
                  onChange={e => setInboxSearch(e.target.value)}
                  placeholder="Search"
                  className="pl-9 bg-muted/50 border-border h-9 text-sm"
                />
              </div>
            </div>
            <ScrollArea className="h-[250px]">
              <div className="p-2 space-y-1">
                {filteredInboxes.map(i => (
                  <div 
                    key={i.id}
                    onClick={(e) => {
                      if ((e.target as HTMLElement).closest('button[role="checkbox"]')) return;
                      toggleInbox(i.id);
                    }}
                    className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="size-6 rounded bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                        {i.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm text-foreground">{i.name}</span>
                    </div>
                    <Checkbox 
                      checked={selectedInboxIds.includes(i.id)}
                      onCheckedChange={() => toggleInbox(i.id)}
                      className="border-border data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                    />
                  </div>
                ))}
              </div>
            </ScrollArea>
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex items-center gap-3 pt-4 border-t border-border">
        <Button 
          variant="outline" 
          onClick={() => router.back()}
          className="bg-transparent border-border text-muted-foreground hover:text-foreground"
        >
          Cancel
        </Button>
        <Button 
          onClick={handleSave}
          disabled={!canSave || isSaving}
          className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 px-8"
        >
          {isSaving ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
  );
}
