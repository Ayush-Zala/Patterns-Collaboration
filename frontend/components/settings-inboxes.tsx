"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Inbox, MoreHorizontal, RefreshCw, Users, Search, Mail, Building2, ChevronDown, Share2, Ticket } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";

type Channel = {
  id: string;
  email_address: string;
};

type InboxItem = {
  id: string;
  name: string;
  description: string;
  created_by: string | null;
  created_at: string;
  channels?: Channel[];
  ticket_statuses_enabled?: boolean;
  ticket_id_enabled?: boolean;
  ticket_id_counter?: number;
};

type InboxesResponse = {
  inboxes?: InboxItem[];
  error?: string;
};

export function SettingsInboxes() {
  const router = useRouter();
  const { data: orgData } = authClient.useActiveOrganization();
  const orgName = orgData?.name || "patterns247";

  const [inboxes, setInboxes] = useState<InboxItem[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Ticket settings state
  const [ticketStatusesEnabled, setTicketStatusesEnabled] = useState(false);
  const [ticketIdEnabled, setTicketIdEnabled] = useState(false);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDeletingInboxId, setIsDeletingInboxId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);

  const loadInboxes = useCallback(async (silent = false) => {
    if (silent) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const response = await fetch("/api/settings/inboxes", { cache: "no-store" });
      const payload = (await response.json()) as InboxesResponse;
      if (!response.ok) {
        throw new Error(payload.error || "Failed to fetch inboxes.");
      }
      setInboxes(payload.inboxes || []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load inboxes.");
    } finally {
      if (silent) {
        setIsRefreshing(false);
      } else {
        setIsLoading(false);
      }
    }
  }, []);

  const filteredInboxes = useMemo(() => {
    return inboxes.filter((inbox) => {
      const matchesSearch =
        inbox.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inbox.description.toLowerCase().includes(searchQuery.toLowerCase());
      
      // If no ticket filters are active, show all
      if (!ticketStatusesEnabled && !ticketIdEnabled) return matchesSearch;

      // If a ticket filter is active, only show inboxes that match
      const matchesTicketFilter =
        (ticketStatusesEnabled && inbox.ticket_statuses_enabled) ||
        (ticketIdEnabled && inbox.ticket_id_enabled);
      
      return matchesSearch && matchesTicketFilter;
    });
  }, [inboxes, searchQuery, ticketStatusesEnabled, ticketIdEnabled]);

  useEffect(() => {
    void loadInboxes();
  }, [loadInboxes]);


  const createInbox = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setCreateError(null);
      setCreateSuccess(null);
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
        const payload = (await response.json()) as { inbox?: InboxItem; error?: string };
        if (!response.ok) {
          throw new Error(payload.error || "Failed to create inbox.");
        }

        setName("");
        setDescription("");
        setIsCreateModalOpen(false);
        await loadInboxes(true);
      } catch (submitError) {
        setCreateError(submitError instanceof Error ? submitError.message : "Unable to create inbox.");
      } finally {
        setIsCreating(false);
      }
    },
    [description, loadInboxes, name]
  );

  const deleteInbox = useCallback(
    async (inbox: InboxItem) => {
      const confirmed = window.confirm(`Delete inbox "${inbox.name}"? This action cannot be undone.`);
      if (!confirmed) return;

      setIsDeletingInboxId(inbox.id);

      try {
        const response = await fetch(`/api/settings/inboxes/${inbox.id}`, {
          method: "DELETE",
        });
        const payload = (await response.json()) as { inbox?: InboxItem; error?: string };
        if (!response.ok) {
          throw new Error(payload.error || "Failed to delete inbox.");
        }
        await loadInboxes(true);
      } catch (deleteError) {
        // silent fail for UI simplicity in this layout, or add toast
        console.error(deleteError);
      } finally {
        setIsDeletingInboxId(null);
      }
    },
    [loadInboxes]
  );

  return (
    <div className="flex flex-col w-full h-full bg-card animate-in fade-in duration-500">
      <div className="p-8 pb-4">
        {/* TOP HEADER */}
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-4">
          <div className="flex items-center justify-center size-5 rounded bg-emerald-500/20 text-emerald-500">
            <Building2 className="size-3" />
          </div>
          {orgName}
        </div>
        
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Inboxes</h1>
        </div>

        {/* TOOLBAR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-[280px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search"
                className="h-9 pl-9 bg-muted/50 border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-indigo-500/30"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  className={cn(
                    "h-9 px-3 gap-2 rounded-lg transition-colors border-border",
                    (ticketStatusesEnabled || ticketIdEnabled) 
                      ? "bg-indigo-600 hover:bg-indigo-700 text-white border-transparent" 
                      : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {ticketStatusesEnabled ? (
                    <>
                      <Share2 className={cn("size-3.5", (ticketStatusesEnabled || ticketIdEnabled) ? "text-white" : "text-muted-foreground")} />
                      Ticket statuses
                    </>
                  ) : ticketIdEnabled ? (
                    <>
                      <Ticket className={cn("size-3.5", (ticketStatusesEnabled || ticketIdEnabled) ? "text-white" : "text-muted-foreground")} />
                      Ticket ID
                    </>
                  ) : (
                    "Ticket settings"
                  )}
                  <ChevronDown className={cn("size-3.5", (ticketStatusesEnabled || ticketIdEnabled) ? "text-white" : "text-muted-foreground")} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-[240px] p-2 bg-popover border-border rounded-xl shadow-xl">
                <div className="flex items-center justify-between px-2 pt-1 pb-3 border-b border-border/50 mb-2">
                  <span className="text-sm font-semibold text-foreground">Ticket settings</span>
                  <Button 
                    variant="link" 
                    className="h-auto p-0 text-indigo-400 hover:text-indigo-300 font-medium text-xs"
                    onClick={(e) => {
                      e.preventDefault();
                      setTicketStatusesEnabled(false);
                      setTicketIdEnabled(false);
                    }}
                  >
                    Clear
                  </Button>
                </div>
                
                <div 
                  className="flex items-center justify-between px-2 py-2.5 hover:bg-muted/50 rounded-lg cursor-pointer transition-colors group"
                  onClick={() => setTicketStatusesEnabled(!ticketStatusesEnabled)}
                >
                  <div className="flex items-center gap-3">
                    <Share2 className="size-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                    <span className="text-sm text-foreground font-medium">Ticket statuses</span>
                  </div>
                  <Checkbox 
                    checked={ticketStatusesEnabled} 
                    onCheckedChange={(c) => setTicketStatusesEnabled(!!c)} 
                    className="data-[state=checked]:bg-indigo-500 data-[state=checked]:border-indigo-500"
                  />
                </div>
                
                <div 
                  className="flex items-center justify-between px-2 py-2.5 hover:bg-muted/50 rounded-lg cursor-pointer transition-colors group"
                  onClick={() => setTicketIdEnabled(!ticketIdEnabled)}
                >
                  <div className="flex items-center gap-3">
                    <Ticket className="size-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                    <span className="text-sm text-foreground font-medium">Ticket ID</span>
                  </div>
                  <Checkbox 
                    checked={ticketIdEnabled} 
                    onCheckedChange={(c) => setTicketIdEnabled(!!c)} 
                    className="data-[state=checked]:bg-indigo-500 data-[state=checked]:border-indigo-500"
                  />
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex items-center gap-3">
            <Button asChild variant="outline" className="h-9 bg-transparent border-border text-muted-foreground hover:bg-muted hover:text-foreground rounded-lg px-4 font-medium transition-all">
              <Link href="/settings/inboxes/bulk-edit-custom-fields">Bulk edit custom fields</Link>
            </Button>
            
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
              <DialogTrigger asChild>
                <Button className="h-9 bg-indigo-600 hover:bg-indigo-500 text-white px-4 rounded-lg font-medium shadow-md transition-all">
                  Create shared inbox
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border text-foreground sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Create shared inbox</DialogTitle>
                  <DialogDescription className="text-muted-foreground">
                    Add a new inbox to collaborate with your team on connected channels.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={createInbox} className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Name</label>
                    <Input 
                      required 
                      value={name} 
                      onChange={(event) => setName(event.target.value)} 
                      placeholder="e.g. Demo Inbox" 
                      className="bg-card border-border text-white placeholder:text-muted-foreground focus-visible:ring-indigo-500/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Description</label>
                    <textarea
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                      placeholder="What this inbox is used for..."
                      className="min-h-24 w-full resize-y rounded-md border border-border bg-card px-3 py-2 text-sm text-white placeholder:text-muted-foreground outline-none focus-visible:ring-1 focus-visible:ring-indigo-500/50 transition-all"
                    />
                  </div>
                  {createError && <p className="text-xs text-red-400 font-medium">{createError}</p>}
                  <div className="flex justify-end gap-3 pt-4">
                    <Button type="button" variant="ghost" onClick={() => setIsCreateModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isCreating} className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium">
                      {isCreating ? "Creating..." : "Create inbox"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="flex-1 px-8 pb-8">
        <div className="rounded-xl border border-border bg-muted overflow-hidden shadow-xl">
          <Table>
            <TableHeader className="bg-transparent">
              <TableRow className="border-b border-border hover:bg-transparent">
                <TableHead className="text-xs font-semibold text-muted-foreground h-11 w-[35%] pl-4">Name</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground h-11 w-[40%]">Channels</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground h-11">Access</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow className="border-b border-border hover:bg-transparent">
                  <TableCell colSpan={4} className="h-24 text-center text-muted-foreground text-sm">Loading inboxes...</TableCell>
                </TableRow>
              )}
              {!isLoading && error && (
                <TableRow className="border-b border-border hover:bg-transparent">
                  <TableCell colSpan={4} className="h-24 text-center text-red-400 text-sm">{error}</TableCell>
                </TableRow>
              )}
              {!isLoading && !error && filteredInboxes.length === 0 && (
                <TableRow className="border-b border-border hover:bg-transparent">
                  <TableCell colSpan={4} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <Inbox className="size-8 mb-2 opacity-50" />
                      <p className="text-sm font-medium">No inboxes found.</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && !error && filteredInboxes.map((inbox) => (
                <TableRow 
                  key={inbox.id} 
                  className="border-b border-border hover:bg-muted/50 cursor-pointer group transition-colors"
                  onClick={() => router.push(`/settings/inboxes/${inbox.id}`)}
                >
                  <TableCell className="pl-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex size-8 items-center justify-center rounded-md bg-[#a21caf] text-white shadow-inner">
                        <Inbox className="size-4" />
                      </div>
                      <span className="font-bold text-sm text-foreground group-hover:text-foreground transition-colors">{inbox.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <Mail className="size-3.5 text-muted-foreground" />
                      {inbox.channels && inbox.channels.length > 0 ? (
                        <span className="truncate max-w-[250px]">{inbox.channels[0].email_address}</span>
                      ) : (
                        <span className="truncate max-w-[250px] italic">No channels connected</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <Users className="size-3.5 text-muted-foreground" />
                      <span>1 teammate</span>
                    </div>
                  </TableCell>
                  <TableCell className="pr-4 py-4" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-popover border-border text-foreground min-w-[160px]">
                        <DropdownMenuItem className="focus:bg-muted focus:text-foreground cursor-pointer" onSelect={() => router.push(`/settings/inboxes/${inbox.id}`)}>
                          Edit inbox
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-red-400 focus:bg-red-500/10 focus:text-red-300 cursor-pointer mt-1"
                          onSelect={() => deleteInbox(inbox)}
                        >
                          Delete inbox
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
