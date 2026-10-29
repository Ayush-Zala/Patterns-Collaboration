"use client";
import { ScopeBreadcrumb } from "@/components/settings/scope-breadcrumb";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Search, 
  Plus, 
  CircleDashed, 
  Clock, 
  CheckCircle2,
  MoreVertical,
  Trash2,
  Settings2,
  ChevronRight,
  Inbox
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";
import { useWorkspaceStore } from "@/context/workspace-store";
import { cn } from "@/lib/utils";

export default function TicketingPage() {
  const router = useRouter();
  const { scopeType } = useWorkspaceStore();
  const { data: orgData } = authClient.useActiveOrganization();

  const [activeTab, setActiveTab] = useState("statuses");
  const [search, setSearch] = useState("");
  const [statuses, setStatuses] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (scopeType !== "organization" && scopeType !== "company") {
      router.push("/settings/home");
    }
  }, [scopeType, router]);

  useEffect(() => {
    async function fetchData() {
      if (!orgData?.id) return;
      setIsLoading(true);
      try {
        const [statRes, groupRes] = await Promise.all([
          fetch("/api/settings/ticketing/statuses", { headers: { "x-org-id": orgData.id } }),
          fetch("/api/settings/ticketing/groups", { headers: { "x-org-id": orgData.id } })
        ]);

        if (statRes.ok) setStatuses(await statRes.json());
        if (groupRes.ok) setGroups(await groupRes.json());
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [orgData?.id]);

  const filteredStatuses = useMemo(() => {
    const s = statuses.filter(x => x.name.toLowerCase().includes(search.toLowerCase()));
    return {
      open: s.filter(x => x.category === "open"),
      waiting: s.filter(x => x.category === "waiting"),
      resolved: s.filter(x => x.category === "resolved")
    };
  }, [statuses, search]);

  const filteredGroups = useMemo(() => {
    return groups.filter(g => g.name.toLowerCase().includes(search.toLowerCase()));
  }, [groups, search]);

  const handleDeleteStatus = async (id: string) => {
    if (!confirm("Are you sure you want to delete this status?")) return;
    try {
      const res = await fetch(`/api/settings/ticketing/statuses/${id}`, { 
        method: "DELETE",
        headers: { "x-org-id": orgData!.id }
      });
      if (res.ok) {
        setStatuses(prev => prev.filter(x => x.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteGroup = async (id: string) => {
    if (!confirm("Are you sure you want to delete this status group?")) return;
    try {
      const res = await fetch(`/api/settings/ticketing/groups/${id}`, { 
        method: "DELETE",
        headers: { "x-org-id": orgData!.id }
      });
      if (res.ok) {
        setGroups(prev => prev.filter(x => x.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (scopeType !== "organization" && scopeType !== "company") return null;

  return (
    <div className="flex h-full flex-col bg-background">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
        <div className="border-b border-border p-6 pb-0">
          <div className="text-xs text-muted-foreground flex items-center gap-2 mb-1">
            <ScopeBreadcrumb /> <span>›</span>
          </div>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground">Ticketing</h1>
            </div>
            <Button asChild className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20">
              <Link href={activeTab === "statuses" ? "/settings/ticketing/create-status" : "/settings/ticketing/create-group"}>
                {activeTab === "statuses" ? "Create status" : "Create status group"}
              </Link>
            </Button>
          </div>

          <TabsList variant="line" className="w-full justify-start h-auto p-0 rounded-none shrink-0">
            <TabsTrigger 
              value="statuses" 
              className="px-4 py-2.5 text-muted-foreground font-medium transition-all"
            >
              Ticket statuses
            </TabsTrigger>
            <TabsTrigger 
              value="groups" 
              className="px-4 py-2.5 text-muted-foreground font-medium transition-all"
            >
              Ticket status groups
            </TabsTrigger>
          </TabsList>
        </div>

          <div className="flex-1 overflow-hidden p-6 flex flex-col">
            <div className="relative w-64 mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input 
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search" 
                className="pl-9 bg-muted/50 border-border focus:border-indigo-500/50"
              />
            </div>

            <ScrollArea className="flex-1">
              <TabsContent value="statuses" className="m-0 space-y-12 pb-8">
            <StatusSection 
              title="Open" 
              items={filteredStatuses.open} 
              icon={<CircleDashed className="size-4 text-indigo-400 animate-[spin_8s_linear_infinite]" />} 
              onDelete={handleDeleteStatus}
              isLoading={isLoading}
            />
            <StatusSection 
              title="Waiting" 
              items={filteredStatuses.waiting} 
              icon={<Clock className="size-4 text-amber-400" />} 
              onDelete={handleDeleteStatus}
              isLoading={isLoading}
            />
            <StatusSection 
              title="Resolved" 
              items={filteredStatuses.resolved} 
              icon={<CheckCircle2 className="size-4 text-emerald-400" />} 
              onDelete={handleDeleteStatus}
              isLoading={isLoading}
            />
          </TabsContent>

          <TabsContent value="groups" className="m-0">
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Name</th>
                    <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Statuses</th>
                    <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Inboxes</th>
                    <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {isLoading ? (
                    <tr><td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">Loading...</td></tr>
                  ) : filteredGroups.length > 0 ? (
                    filteredGroups.map(group => (
                      <tr key={group.id} className="hover:bg-muted/20 transition-colors group cursor-pointer" onClick={() => router.push(`/settings/ticketing/groups/${group.id}`)}>
                        <td className="px-6 py-4">
                          <span className="text-sm font-semibold text-foreground">{group.name}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-muted-foreground">{group.statuses?.length || 0} statuses</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-muted-foreground">{group.inboxes?.length || 0} inboxes</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-foreground">
                                <MoreVertical className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-card border-border">
                              <DropdownMenuItem 
                                className="text-red-400 focus:text-red-400 focus:bg-red-400/10"
                                onClick={(e) => { e.stopPropagation(); handleDeleteGroup(group.id); }}
                              >
                                <Trash2 className="size-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">No status groups found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </ScrollArea>
      </div>
    </Tabs>
  </div>
);
}

function StatusSection({ title, items, icon, onDelete, isLoading }: any) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold text-foreground flex items-center gap-2 uppercase tracking-widest px-2 opacity-80">
        {title}
      </h3>
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead className="bg-card/40 border-b border-border">
            <tr>
              <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest w-[30%]">Name</th>
              <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Description</th>
              <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                <span className="flex items-center gap-1">Customer label</span>
              </th>
              <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/30">
            {isLoading ? (
              <tr><td colSpan={4} className="px-6 py-12 text-center text-muted-foreground italic text-sm">Loading statuses...</td></tr>
            ) : items.length > 0 ? (
              items.map((item: any) => (
                <tr key={item.id} className="hover:bg-muted/10 transition-colors group">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-4">
                      <div className="size-9 rounded-full bg-card/40 flex items-center justify-center border border-border shrink-0 shadow-[inset_0_1px_2px_rgba(255,255,255,0.05)]">
                        {icon}
                      </div>
                      <div className="flex items-center gap-2.5">
                        <span className="text-sm font-bold text-foreground tracking-tight">{item.name}</span>
                        <div className="flex gap-1.5 items-center">
                          {item.isDefault && (
                            <span className="text-[9px] bg-muted/60 text-muted-foreground px-1.5 py-0.5 rounded uppercase font-black tracking-widest border border-border">Default</span>
                          )}
                          {item.isReopen && (
                            <span className="text-[9px] bg-indigo-500/10 text-indigo-400/90 px-1.5 py-0.5 rounded uppercase font-black tracking-widest border border-indigo-500/20">Reopen</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-sm text-muted-foreground leading-relaxed max-w-md truncate">
                    {item.description || <span className="text-muted-foreground italic">No description provided</span>}
                  </td>
                  <td className="px-6 py-5 text-sm font-medium text-muted-foreground">
                    {item.customerLabel || title}
                  </td>
                  <td className="px-6 py-5 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-full">
                          <MoreVertical className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-card border-border shadow-2xl rounded-xl min-w-[140px]">
                        <DropdownMenuItem className="text-muted-foreground focus:bg-muted focus:text-foreground py-2 cursor-pointer">
                          <Settings2 className="size-4 mr-2.5 opacity-70" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-red-400 focus:text-red-400 focus:bg-red-400/10 py-2 cursor-pointer"
                          onClick={() => onDelete(item.id)}
                        >
                          <Trash2 className="size-4 mr-2.5 opacity-70" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={4} className="px-6 py-16 text-center text-muted-foreground text-sm italic bg-card/5">No statuses in this category yet</td></tr>
            )}
          </tbody>
        </table>
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
