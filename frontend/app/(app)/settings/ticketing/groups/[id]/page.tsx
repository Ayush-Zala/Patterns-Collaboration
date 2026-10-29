"use client";
import { ScopeBreadcrumb } from "@/components/settings/scope-breadcrumb";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Plus, 
  Trash2, 
  CircleDashed, 
  Clock, 
  CheckCircle2, 
  ChevronRight,
  Search,
  Circle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { authClient } from "@/lib/auth-client";
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function GroupDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: orgData } = authClient.useActiveOrganization();
  
  const [group, setGroup] = useState<any>(null);
  const [availableStatuses, setAvailableStatuses] = useState<any[]>([]);
  const [availableInboxes, setAvailableInboxes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [name, setName] = useState("");
  const [selectedStatusIds, setSelectedStatusIds] = useState<string[]>([]);
  const [selectedInboxIds, setSelectedInboxIds] = useState<string[]>([]);

  const [statusSearch, setStatusSearch] = useState("");
  const [inboxSearch, setInboxSearch] = useState("");

  useEffect(() => {
    async function fetchData() {
      if (!orgData?.id || !params.id) return;
      setIsLoading(true);
      try {
        const [groupRes, statusRes, inboxRes] = await Promise.all([
          fetch(`/api/settings/ticketing/groups/${params.id}`, { headers: { "x-org-id": orgData.id } }),
          fetch("/api/settings/ticketing/statuses", { headers: { "x-org-id": orgData.id } }),
          fetch("/api/settings/inboxes")
        ]);

        if (groupRes.ok) {
          const g = await groupRes.json();
          setGroup(g);
          setName(g.name);
          setSelectedStatusIds(g.statuses?.map((s: any) => s.statusId) || []);
          setSelectedInboxIds(g.inboxes?.map((i: any) => i.inboxId) || []);
        }
        if (statusRes.ok) setAvailableStatuses(await statusRes.json());
        if (inboxRes.ok) {
          const data = await inboxRes.json();
          setAvailableInboxes(data.inboxes || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [orgData?.id, params.id]);

  const handleUpdate = async () => {
    if (!orgData?.id || !params.id || !name) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/settings/ticketing/groups/${params.id}`, {
        method: "PUT",
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
        router.refresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this group?")) return;
    try {
      const res = await fetch(`/api/settings/ticketing/groups/${params.id}`, {
        method: "DELETE",
        headers: { "x-org-id": orgData!.id }
      });
      if (res.ok) {
        router.push("/settings/ticketing");
      }
    } catch (err) {
      console.error(err);
    }
  };

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

  const selectedStatuses = useMemo(() => {
    return availableStatuses.filter(s => selectedStatusIds.includes(s.id));
  }, [availableStatuses, selectedStatusIds]);

  const filteredInboxes = useMemo(() => {
    return availableInboxes.filter(i => 
      i.name.toLowerCase().includes(inboxSearch.toLowerCase())
    );
  }, [availableInboxes, inboxSearch]);

  if (isLoading) return <div className="p-8 text-muted-foreground">Loading group details...</div>;
  if (!group) return <div className="p-8 text-muted-foreground">Group not found.</div>;

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="border-b border-border p-6 pb-0">
        <div className="text-xs text-muted-foreground flex items-center gap-2 mb-1">
          <ScopeBreadcrumb /> <span>›</span> 
          <Link href="/settings/ticketing" className="hover:text-muted-foreground">Ticket statuses</Link> <span>›</span>
        </div>
        
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-foreground">{group.name}</h1>
          <Button 
            variant="ghost" 
            className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
            onClick={handleDelete}
          >
            Delete ticket status group
          </Button>
        </div>

        <Tabs defaultValue="statuses">
          <TabsList className="bg-transparent border-b border-border w-full justify-start h-auto p-0 rounded-none">
            <TabsTrigger 
              value="statuses" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-zinc-100 data-[state=active]:text-foreground data-[state=active]:bg-transparent px-4 py-2.5 text-muted-foreground font-medium transition-all"
            >
              Ticket statuses
            </TabsTrigger>
            <TabsTrigger 
              value="inboxes" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-zinc-100 data-[state=active]:text-foreground data-[state=active]:bg-transparent px-4 py-2.5 text-muted-foreground font-medium transition-all"
            >
              Inboxes
            </TabsTrigger>
          </TabsList>

          <div className="p-6">
            <div className="max-w-2xl space-y-12 pb-12">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-foreground">
                  Name <span className="text-red-500">*</span>
                </Label>
                <div className="relative group/input">
                  <Input 
                    value={name}
                    onChange={e => setName(e.target.value)}
                    onBlur={handleUpdate}
                    placeholder="Add name"
                    maxLength={30}
                    className="bg-muted/50 border-border text-foreground focus:ring-1 focus:ring-indigo-500/50"
                  />
                </div>
                <div className="text-[11px] text-muted-foreground">Must be under 30 characters</div>
              </div>

              <TabsContent value="statuses" className="m-0 space-y-8">
                <div className="flex items-center justify-between pt-4">
                  <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Ticket statuses available to agents</h3>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="bg-transparent border-border text-muted-foreground hover:bg-muted/50 gap-2 h-9 px-4 rounded-md">
                        <Plus className="size-4" />
                        Select statuses
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[380px] p-0 bg-popover border-border shadow-2xl rounded-xl overflow-hidden" align="end" sideOffset={8}>
                       <div className="p-4 border-b border-border flex items-center justify-between bg-card/20">
                        <span className="text-sm font-bold text-foreground">Statuses</span>
                        <button onClick={() => { setSelectedStatusIds([]); handleUpdate(); }} className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold">Clear all</button>
                      </div>
                      <div className="p-3">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                          <Input 
                            value={statusSearch} 
                            onChange={e => setStatusSearch(e.target.value)} 
                            placeholder="Search" 
                            className="pl-9 bg-muted/50 border-border h-10 text-sm focus:ring-1 focus:ring-indigo-500/50" 
                          />
                        </div>
                      </div>
                      <ScrollArea className="h-[300px]">
                        <div className="px-1 pb-4">
                          {Object.entries(groupedStatuses).map(([cat, items]) => items.length > 0 && (
                            <div key={cat} className="mt-2 first:mt-0">
                              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-4 py-2">{cat}</div>
                              <div className="space-y-0.5">
                                {items.map(s => (
                                  <div key={s.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/50 cursor-pointer group transition-colors" onClick={() => {
                                    const next = selectedStatusIds.includes(s.id) ? selectedStatusIds.filter(x => x !== s.id) : [...selectedStatusIds, s.id];
                                    setSelectedStatusIds(next);
                                  }}>
                                    <div className="flex items-center gap-3">
                                      {cat === "open" && <Circle className="size-4 text-indigo-400" />}
                                      {cat === "waiting" && <Clock className="size-4 text-amber-400" />}
                                      {cat === "resolved" && <CheckCircle2 className="size-4 text-emerald-400" />}
                                      <span className="text-sm font-medium text-foreground">{s.name}</span>
                                      <div className="flex gap-1.5 ml-1">
                                        {s.isDefault && <span className="text-[9px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded uppercase font-black tracking-tight">Default</span>}
                                        {s.isReopen && <span className="text-[9px] bg-indigo-900/30 text-indigo-400 px-1.5 py-0.5 rounded uppercase font-black tracking-tight">Reopen</span>}
                                      </div>
                                    </div>
                                    <Checkbox checked={selectedStatusIds.includes(s.id)} onCheckedChange={() => {}} className="size-4 rounded border-border" />
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                      <div className="p-3 border-t border-border bg-card/20 text-right">
                         <Button size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20" onClick={handleUpdate}>Apply Changes</Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="overflow-hidden">
                   <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="px-0 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest w-[40%]">Name</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/20">
                      {selectedStatuses.length > 0 ? selectedStatuses.map(s => (
                        <tr key={s.id} className="group">
                          <td className="px-0 py-5">
                            <div className="flex items-center gap-4">
                              <div className="size-10 rounded-full bg-card/40 flex items-center justify-center border border-border shrink-0 shadow-[inset_0_1px_2px_rgba(255,255,255,0.05)]">
                                {s.category === "open" && <CircleDashed className="size-5 text-indigo-400 animate-[spin_8s_linear_infinite]" />}
                                {s.category === "waiting" && <Clock className="size-5 text-amber-400/90" />}
                                {s.category === "resolved" && <CheckCircle2 className="size-5 text-emerald-400/90" />}
                              </div>
                              <div className="flex items-center gap-2.5">
                                <span className="text-sm font-bold text-foreground tracking-tight">{s.name}</span>
                                <div className="flex gap-1.5 items-center">
                                  {s.isDefault && (
                                    <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded font-bold tracking-tight">Default</span>
                                  )}
                                  {s.isReopen && (
                                    <span className="text-[10px] bg-indigo-900/50 text-indigo-300 px-1.5 py-0.5 rounded font-bold tracking-tight">Reopen</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-5 text-sm text-muted-foreground leading-relaxed">
                            {s.description || "No description provided"}
                          </td>
                        </tr>
                      )) : (
                        <tr><td colSpan={2} className="py-20 text-center text-muted-foreground italic text-sm bg-card/5 rounded-xl border border-dashed border-border">No statuses selected for this group</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </TabsContent>

              <TabsContent value="inboxes" className="m-0 space-y-8">
                 <div className="flex items-center justify-between pt-4">
                  <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Inboxes that use this ticket status group</h3>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="bg-transparent border-border text-muted-foreground hover:bg-muted/50 gap-2 h-9 px-4 rounded-md">
                        <Plus className="size-4" />
                        Select inboxes
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[380px] p-0 bg-popover border-border shadow-2xl rounded-xl overflow-hidden" align="end" sideOffset={8}>
                       <div className="p-4 border-b border-border flex items-center justify-between bg-card/20">
                        <span className="text-sm font-bold text-foreground">Inboxes</span>
                        <button onClick={() => { setSelectedInboxIds([]); handleUpdate(); }} className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold">Clear all</button>
                      </div>
                      <div className="p-3">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                          <Input 
                            value={inboxSearch} 
                            onChange={e => setInboxSearch(e.target.value)} 
                            placeholder="Search" 
                            className="pl-9 bg-muted/50 border-border h-10 text-sm focus:ring-1 focus:ring-indigo-500/50" 
                          />
                        </div>
                      </div>
                      <ScrollArea className="h-[280px]">
                        <div className="px-1 pb-4">
                          {filteredInboxes.map(i => (
                            <div key={i.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/50 cursor-pointer group transition-colors" onClick={() => {
                              const next = selectedInboxIds.includes(i.id) ? selectedInboxIds.filter(x => x !== i.id) : [...selectedInboxIds, i.id];
                              setSelectedInboxIds(next);
                            }}>
                              <div className="flex items-center gap-3 text-sm text-foreground">
                                <div className="size-8 rounded bg-muted/50 border border-border flex items-center justify-center text-[11px] font-bold text-muted-foreground">{i.name.charAt(0).toUpperCase()}</div>
                                <span className="font-medium">{i.name}</span>
                              </div>
                              <Checkbox checked={selectedInboxIds.includes(i.id)} onCheckedChange={() => {}} className="size-4 rounded border-border" />
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                      <div className="p-3 border-t border-border bg-card/20 text-right">
                         <Button size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20" onClick={handleUpdate}>Apply Changes</Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="min-h-[200px] flex items-center justify-center rounded-xl border border-dashed border-border bg-card/5">
                  {selectedInboxIds.length > 0 ? (
                    <div className="w-full divide-y divide-zinc-800/30">
                      {availableInboxes.filter(i => selectedInboxIds.includes(i.id)).map(i => (
                        <div key={i.id} className="flex items-center gap-4 p-5 hover:bg-muted/10 transition-colors">
                           <div className="size-10 rounded bg-muted/80 border border-border flex items-center justify-center text-sm font-bold text-muted-foreground">{i.name.charAt(0).toUpperCase()}</div>
                           <div className="flex-1">
                             <div className="text-sm font-bold text-foreground">{i.name}</div>
                             <div className="text-xs text-muted-foreground mt-0.5">{i.emailAddress || "Shared channel"}</div>
                           </div>
                           <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-red-400" onClick={() => {
                             setSelectedInboxIds(prev => prev.filter(x => x !== i.id));
                             handleUpdate();
                           }}>
                             <Trash2 className="size-4" />
                           </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center space-y-2">
                      <div className="text-sm text-muted-foreground font-medium italic">Select inboxes to include in this ticket status group</div>
                      <p className="text-[11px] text-muted-foreground max-w-[240px]">This group will only be visible within the selected inboxes.</p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </div>
          </div>
        </Tabs>
      </div>
    </div>
  );
}

function CompanyIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 21h18" />
      <path d="M5 21V7l8-4v18" />
      <path d="M19 21V11l-6-3" />
      <path d="M9 9v.01" />
      <path d="M9 13v.01" />
      <path d="M9 17v.01" />
      <path d="M15 13v.01" />
      <path d="M15 17v.01" />
    </svg>
  );
}
