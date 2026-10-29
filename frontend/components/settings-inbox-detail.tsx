"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Inbox, Link2, RefreshCw, ArrowRight, Mail, ChevronRight, Lock, Globe2, Plus, Search, HelpCircle, UserRound, Clock, MessageSquare, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

type InboxItem = {
  id: string;
  name: string;
  description: string;
  created_by: string | null;
  created_at: string;
};

type Channel = {
  id: string;
  name: string;
  email_address: string;
  provider: "gmail" | "outlook";
  oauth_account_id: string | null;
  is_active: boolean;
  created_at: string;
};

type InboxDetailResponse = {
  inbox?: InboxItem;
  connected_channels?: Channel[];
  error?: string;
};

type ChannelsResponse = {
  channels?: Channel[];
  error?: string;
};

export function SettingsInboxDetail({ inboxId }: { inboxId: string }) {
  const router = useRouter();
  const { data: orgData } = authClient.useActiveOrganization();
  const orgName = orgData?.name || "patterns247";
  const { data: session } = authClient.useSession();
  const userName = session?.user?.name || "Unknown User";
  const userInitials = userName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  const [inbox, setInbox] = useState<InboxItem | null>(null);
  const [connectedChannels, setConnectedChannels] = useState<Channel[]>([]);
  const [allChannels, setAllChannels] = useState<Channel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isConnectingChannelId, setIsConnectingChannelId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  const [accessType, setAccessType] = useState<"all" | "restricted">("restricted");
  const [inboxMembers, setInboxMembers] = useState<any[]>([]);
  const [assignableUsers, setAssignableUsers] = useState<any[]>([]);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  
  // Settings Tab State
  const [enableTicketStatuses, setEnableTicketStatuses] = useState(false);
  const [enableTicketIds, setEnableTicketIds] = useState(false);
  const [unassignInactiveTime, setUnassignInactiveTime] = useState("Never");
  const [closeSegmentInactiveTime, setCloseSegmentInactiveTime] = useState("7 days");
  const [separateActions, setSeparateActions] = useState(false);
  const [companyRulesAffect, setCompanyRulesAffect] = useState(true);
  const [keepAssignmentsOOO, setKeepAssignmentsOOO] = useState(false);
  
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);

  const loadInboxData = useCallback(async (silent = false) => {
    if (silent) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const [inboxResponse, channelsResponse, membersResponse, assignableResponse] = await Promise.all([
        fetch(`/api/settings/inboxes/${inboxId}`, { cache: "no-store" }),
        fetch("/api/settings/channels", { cache: "no-store" }),
        fetch(`/api/settings/inboxes/${inboxId}/members`, { cache: "no-store" }),
        fetch("/api/settings/users?scope=assignable", { cache: "no-store" }),
      ]);
      
      const inboxPayload = await inboxResponse.json();
      const channelsPayload = await channelsResponse.json();
      const membersPayload = await membersResponse.json();
      const assignablePayload = await assignableResponse.json();

      if (!inboxResponse.ok) throw new Error(inboxPayload.error || "Failed to load inbox details.");
      
      let fetchedInbox: InboxItem | null = null;
      if (inboxPayload.inbox) {
        fetchedInbox = inboxPayload.inbox;
      } else if (inboxPayload.id) {
        fetchedInbox = inboxPayload;
      }
      
      setInbox(fetchedInbox);
      if (fetchedInbox) {
        setEditName(fetchedInbox.name);
        setEditDescription(fetchedInbox.description || "");
        // Map ticket fields from flat backend response
        const fi = fetchedInbox as any;
        setEnableTicketStatuses(fi.ticket_statuses_enabled ?? fi.settings?.enable_ticket_statuses ?? false);
        setEnableTicketIds(fi.ticket_id_enabled ?? fi.settings?.enable_ticket_ids ?? false);
        if (fi.settings) {
          setUnassignInactiveTime(fi.settings.unassign_inactive_time ?? "Never");
          setCloseSegmentInactiveTime(fi.settings.close_segment_inactive_time ?? "7 days");
          setSeparateActions(fi.settings.separate_actions ?? false);
        }
      }
      
      setConnectedChannels(inboxPayload.connected_channels || []);
      
      // Defensive array setting for members
      const members = membersPayload.members || (Array.isArray(membersPayload) ? membersPayload : []);
      setInboxMembers(members);
      
      // Defensive array setting for assignable users
      const assignable = assignablePayload.users || (Array.isArray(assignablePayload) ? assignablePayload : []);
      setAssignableUsers(assignable);
      
      let fetchedChannels: Channel[] = [];
      if (channelsPayload.channels) {
        fetchedChannels = channelsPayload.channels;
      } else if (Array.isArray(channelsPayload)) {
        fetchedChannels = channelsPayload;
      }
      setAllChannels(fetchedChannels);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load inbox details.");
    } finally {
      if (silent) setIsRefreshing(false);
      else setIsLoading(false);
    }
  }, [inboxId]);

  useEffect(() => {
    void loadInboxData();
  }, [loadInboxData]);

  const connectedChannelIds = useMemo(() => new Set(connectedChannels.map((channel) => channel.id)), [connectedChannels]);
  const availableChannels = useMemo(() => allChannels.filter((channel) => !connectedChannelIds.has(channel.id)), [allChannels, connectedChannelIds]);

  const connectExistingChannel = useCallback(async (channelId: string) => {
    setActionError(null);
    setActionSuccess(null);
    setIsConnectingChannelId(channelId);

    try {
      const response = await fetch(`/api/settings/inboxes/${inboxId}/connect-channel`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ channel_id: channelId }),
      });
      const payload = (await response.json()) as { error?: string; channel?: { name?: string } };
      if (!response.ok) throw new Error(payload.error || "Failed to connect channel.");

      setActionSuccess(`Connected "${payload.channel?.name || "channel"}" to this inbox.`);
      await loadInboxData(true);
    } catch (connectError) {
      setActionError(connectError instanceof Error ? connectError.message : "Unable to connect channel.");
    } finally {
      setIsConnectingChannelId(null);
    }
  }, [inboxId, loadInboxData]);

  const saveInboxSettings = async () => {
    setActionError(null);
    setActionSuccess(null);
    setIsSavingSettings(true);

    try {
      const response = await fetch(`/api/settings/inboxes/${inboxId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ 
          name: editName, 
          description: editDescription,
          settings: {
            enable_ticket_statuses: enableTicketStatuses,
            enable_ticket_ids: enableTicketIds,
            unassign_inactive_time: unassignInactiveTime,
            close_segment_inactive_time: closeSegmentInactiveTime,
            separate_actions: separateActions,
            company_rules_affect: companyRulesAffect,
            keep_assignments_ooo: keepAssignmentsOOO
          }
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Failed to update inbox settings.");

      setActionSuccess("Inbox settings updated successfully.");
      await loadInboxData(true);
    } catch (saveError) {
      setActionError(saveError instanceof Error ? saveError.message : "Unable to update inbox settings.");
    } finally {
      setIsSavingSettings(false);
    }
  };

  const addMemberToInbox = async (userId: string) => {
    setIsAddingMember(true);
    try {
      const response = await fetch(`/api/settings/inboxes/${inboxId}/members`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (!response.ok) throw new Error("Failed to add member");
      await loadInboxData(true);
      setIsAddMemberModalOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsAddingMember(false);
    }
  };

  const removeMemberFromInbox = async (userId: string) => {
    try {
      const response = await fetch(`/api/settings/inboxes/${inboxId}/members?userId=${userId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to remove member");
      await loadInboxData(true);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex flex-col w-full h-full bg-card text-foreground">
      <div className="p-8 pb-0 shrink-0">
        {/* BREADCRUMB */}
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-6">
          <div className="flex items-center justify-center size-4 rounded bg-emerald-500/20 text-emerald-500 text-[10px]">
            P
          </div>
          <span className="text-emerald-500 cursor-pointer hover:underline" onClick={() => router.push('/settings/home')}>{orgName}</span>
          <ChevronRight className="size-3" />
          <span className="cursor-pointer hover:text-muted-foreground" onClick={() => router.push('/settings/inboxes')}>Inboxes</span>
        </div>
        
        {/* HEADER */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex size-8 items-center justify-center rounded-md bg-[#a21caf] text-white shadow-inner">
            <Inbox className="size-4" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{inbox?.name || "Loading..."}</h1>
        </div>
      </div>

      <Tabs defaultValue="rules" className="w-full flex-1 flex flex-col min-h-0">
        <div className="px-8 border-b border-border shrink-0">
          <TabsList className="bg-transparent h-auto p-0 flex gap-6 justify-start w-full">
            {["Rules", "Access", "Ticketing", "Settings", "Custom fields", "Business hours"].map((tab) => (
              <TabsTrigger 
                key={tab} 
                value={tab.toLowerCase()}
                className="rounded-none bg-transparent px-1 py-3 text-sm font-semibold text-muted-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-white"
              >
                {tab}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <div className="flex-1 overflow-y-auto p-8 bg-card">
          
          {/* RULES TAB */}
          <TabsContent value="rules" className="m-0 space-y-4 max-w-4xl">
            {/* Route to Inbox Card */}
            <div className="rounded-2xl border border-border bg-muted p-6 shadow-xl">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-indigo-600/20 text-indigo-400">
                    <ArrowRight className="size-5" />
                  </div>
                  <h2 className="text-xl font-bold text-foreground tracking-tight">Route to inbox</h2>
                </div>
                <div className="flex items-center gap-3">
                  <Button asChild className="h-9 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg px-4 border-0">
                    <Link href={`/settings/connect-channel?from=inboxes&inboxId=${inboxId}`}>
                      Connect channels
                    </Link>
                  </Button>
                  <Button asChild className="h-9 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg px-4 border-0">
                    <Link href={`/settings/rules`}>
                      Create routing rules
                    </Link>
                  </Button>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                Ensure the right teams are handling customer conversations by routing a conversation from a channel into the right Patterns inbox based on the conditions you've set for a channel.
              </p>
              
              <div className="rounded-lg bg-background border border-border p-3 mb-4 text-sm text-muted-foreground font-medium">
                No rules
              </div>

              {connectedChannels.length > 0 && (
                <div className="rounded-lg border border-border bg-card flex items-center justify-between p-4 cursor-pointer hover:bg-muted/20 transition-colors">
                  <div className="flex items-center gap-2 text-foreground text-sm font-medium">
                    <Mail className="size-4 text-muted-foreground" />
                    {connectedChannels.length} channel{connectedChannels.length > 1 ? 's' : ''}
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </div>
              )}

              {connectedChannels.length > 0 && (
                <div className="flex items-center gap-4 mt-4">
                  <div className="flex-1 rounded-lg border border-border bg-card p-4">
                    <p className="text-xs text-muted-foreground font-medium mb-3">{connectedChannels.length} channel</p>
                    {connectedChannels.slice(0, 1).map(channel => (
                      <div key={channel.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="size-4 text-muted-foreground" />
                        <span className="truncate">{channel.email_address}</span>
                      </div>
                    ))}
                  </div>
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">route to</div>
                  <div className="rounded-lg border border-border bg-card p-4 flex flex-col items-center justify-center min-w-[140px] gap-2">
                    <div className="flex size-8 items-center justify-center rounded-md bg-[#a21caf] text-white shadow-inner">
                      <Inbox className="size-4" />
                    </div>
                    <span className="text-sm font-bold text-foreground">{inbox?.name}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Assign to Owner Card */}
            <div className="rounded-2xl border border-border bg-muted p-6 shadow-xl">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-indigo-600/20 text-indigo-400">
                    <UserRound className="size-5" />
                  </div>
                  <h2 className="text-xl font-bold text-foreground tracking-tight">Assign to owner</h2>
                </div>
                <Button asChild className="h-9 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg px-4 border-0">
                  <Link href={`/settings/rules/new?type=assigning&inboxId=${inboxId}`}>
                    Create assigning rules
                  </Link>
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                Automatically assign a clear owner to every conversation and manage your team's workload to ensure no conversation falls through the cracks.
              </p>
              <div className="rounded-lg bg-background border border-border p-3 text-sm text-muted-foreground font-medium">
                No rules
              </div>
            </div>

            {/* Time Goals Card */}
            <div className="rounded-2xl border border-border bg-muted p-6 shadow-xl opacity-90">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-amber-600/20 text-amber-500">
                    <Clock className="size-5" />
                  </div>
                  <h2 className="text-xl font-bold text-foreground tracking-tight">Time goals</h2>
                </div>
                <Button asChild className="h-9 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg px-4 border-0">
                  <Link href={`/settings/rules/new?type=time_goal&inboxId=${inboxId}`}>
                    Create time goal rules
                  </Link>
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* ACCESS TAB */}
          <TabsContent value="access" className="m-0 space-y-8 max-w-4xl">
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-4">Access <span className="text-red-500">*</span></h3>
              <div className="space-y-4">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className={cn("size-4 rounded-full border flex items-center justify-center transition-colors", accessType === 'all' ? 'border-indigo-500' : 'border-zinc-500 group-hover:border-zinc-400')}>
                    {accessType === 'all' && <div className="size-2 rounded-full bg-indigo-500" />}
                  </div>
                  <input type="radio" className="hidden" checked={accessType === 'all'} onChange={() => setAccessType('all')} />
                  <span className="text-sm text-foreground"><strong className="text-foreground">{orgName}</strong> - Anyone in the company</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className={cn("size-4 rounded-full border flex items-center justify-center transition-colors", accessType === 'restricted' ? 'border-indigo-500' : 'border-zinc-500 group-hover:border-zinc-400')}>
                    {accessType === 'restricted' && <div className="size-2 rounded-full bg-indigo-500" />}
                  </div>
                  <input type="radio" className="hidden" checked={accessType === 'restricted'} onChange={() => setAccessType('restricted')} />
                  <span className="text-sm text-foreground"><strong className="text-foreground">Restricted</strong> - Only specific teammates and groups</span>
                </label>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-muted-foreground">Inbox members <span className="text-red-500">*</span> <span className="text-muted-foreground font-normal ml-2">{inboxMembers.length} member{inboxMembers.length !== 1 ? 's' : ''}</span></h3>
              </div>
              <div className="flex items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-4">
                  <Dialog open={isAddMemberModalOpen} onOpenChange={setIsAddMemberModalOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="h-9 bg-transparent border-border text-muted-foreground hover:bg-muted hover:text-foreground rounded-lg px-4 gap-2">
                        <Plus className="size-4" /> Add members
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-card border-border text-foreground sm:max-w-[425px]">
                      <DialogHeader>
                        <DialogTitle>Add teammates to inbox</DialogTitle>
                        <DialogDescription className="text-muted-foreground">
                          Select teammates to grant them access to this inbox.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-2 py-4 max-h-[300px] overflow-y-auto pr-2">
                         {(assignableUsers || []).map(user => {
                           const isAlreadyMember = (inboxMembers || []).some(m => m.userId === user.id || m.id === user.id);
                           return (
                             <div key={user.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 group">
                               <div className="flex items-center gap-3">
                                 <div className="size-8 rounded-md bg-muted border border-border flex items-center justify-center text-[10px] font-bold">
                                   {user.name.substring(0, 2).toUpperCase()}
                                 </div>
                                 <div className="min-w-0">
                                   <p className="text-sm font-semibold truncate">{user.name}</p>
                                   <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                                 </div>
                               </div>
                               <Button 
                                size="sm" 
                                variant={isAlreadyMember ? "ghost" : "outline"}
                                disabled={isAlreadyMember || isAddingMember}
                                onClick={() => addMemberToInbox(user.id)}
                                className={cn("h-8 text-xs", isAlreadyMember ? "text-emerald-500" : "text-indigo-400 border-indigo-500/30 hover:bg-indigo-500/10")}
                               >
                                 {isAlreadyMember ? "Joined" : "Add"}
                               </Button>
                             </div>
                           );
                         })}
                      </div>
                    </DialogContent>
                  </Dialog>
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground">
                    <div className="size-4 rounded-[4px] border border-zinc-600" />
                    Hide pending/blocked teammates
                  </label>
                </div>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input placeholder="Search" className="h-9 pl-9 bg-muted/50 border-border rounded-lg text-sm text-foreground" />
                </div>
              </div>

              <div className="border-t border-border mt-4">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-border hover:bg-transparent">
                      <TableHead className="text-xs font-semibold text-muted-foreground h-10 px-0">Name</TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground h-10 text-right pr-4">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(inboxMembers || []).map((member) => (
                      <TableRow key={member.id} className="border-b border-border hover:bg-transparent">
                        <TableCell className="py-4 px-0">
                          <div className="flex items-center gap-3">
                            <div className="flex size-7 items-center justify-center rounded-md bg-indigo-500/20 text-indigo-500 font-bold text-[10px]">
                              {(member.user?.name || member.name || "??").substring(0, 2).toUpperCase()}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-bold text-sm text-foreground">{member.user?.name || member.name}</span>
                              <span className="text-[10px] text-muted-foreground">{member.user?.email || member.email}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right py-4 pr-4">
                           <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-muted-foreground hover:text-red-400 hover:bg-red-500/10 h-8"
                            onClick={() => removeMemberFromInbox(member.userId || member.id)}
                           >
                             Remove
                           </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>

          {/* TICKETING TAB */}
          <TabsContent value="ticketing" className="m-0 w-full space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-6">
              <div>
                <p className="text-sm font-semibold text-foreground mb-1">Enable ticket statuses (e.g. open, waiting, and resolved)</p>
                <p className="text-sm text-muted-foreground">Use granular ticket statuses so your team can manage complex requests efficiently.</p>
              </div>
              <Switch checked={enableTicketStatuses} onCheckedChange={setEnableTicketStatuses} className="data-[state=checked]:bg-indigo-500" />
            </div>
            <div className="flex items-center justify-between border-b border-border pb-6">
              <div>
                <p className="text-sm font-semibold text-foreground mb-1">Enable ticket IDs</p>
                <p className="text-sm text-muted-foreground">Help your team to easily identify conversations and reference them with customers.</p>
              </div>
              <Switch checked={enableTicketIds} onCheckedChange={setEnableTicketIds} className="data-[state=checked]:bg-indigo-500" />
            </div>
          </TabsContent>

          {/* SETTINGS TAB */}
          <TabsContent value="settings" className="m-0 max-w-4xl">
             <div className="max-w-3xl">
               {inbox && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-muted-foreground">Inbox name <span className="text-red-500">*</span></label>
                    <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-10 bg-muted/50 border-transparent text-foreground" />
                    <p className="text-xs text-muted-foreground">e.g. Support Tier 1, Customer Success, Urgent...</p>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-muted-foreground">Description</label>
                    <textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} placeholder="What will your team use this inbox for?" className="min-h-24 w-full rounded-md border border-transparent bg-muted/50 px-3 py-2 text-sm text-foreground focus-visible:ring-1 focus-visible:ring-indigo-500 outline-none" />
                  </div>
                  
                  <div className="space-y-3 pb-6 border-b border-border">
                    <label className="text-sm font-semibold text-muted-foreground">Color</label>
                    <div className="flex items-center gap-2">
                      <div className="size-6 rounded-full bg-zinc-500 cursor-pointer" />
                      <div className="flex size-6 items-center justify-center rounded-full bg-pink-500 cursor-pointer text-foreground">
                         <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                      </div>
                      <div className="size-6 rounded-full bg-red-500 cursor-pointer" />
                      <div className="size-6 rounded-full bg-orange-500 cursor-pointer" />
                      <div className="size-6 rounded-full bg-yellow-600 cursor-pointer" />
                      <div className="size-6 rounded-full bg-emerald-600 cursor-pointer" />
                      <div className="size-6 rounded-full bg-cyan-600 cursor-pointer" />
                      <div className="size-6 rounded-full bg-indigo-500 cursor-pointer" />
                      <div className="size-6 rounded-full bg-purple-600 cursor-pointer" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-b border-border pb-6">
                    <div>
                      <p className="text-base font-semibold text-foreground mb-1">Company rules affect this inbox</p>
                      <p className="text-sm text-muted-foreground">Rules set by administrators can be applied before other rules on this inbox.</p>
                    </div>
                    <Switch checked={companyRulesAffect} onCheckedChange={setCompanyRulesAffect} className="data-[state=checked]:bg-indigo-500" />
                  </div>

                  <div className="flex items-center justify-between border-b border-border pb-6">
                    <div>
                      <p className="text-base font-semibold text-foreground mb-1">Keep assignments when teammate is out of office or busy</p>
                      <p className="text-sm text-muted-foreground">New conversations can be assigned, and existing ones remain assigned, to teammates marked as out of office or busy.</p>
                    </div>
                    <Switch checked={keepAssignmentsOOO} onCheckedChange={setKeepAssignmentsOOO} className="data-[state=checked]:bg-indigo-500" />
                  </div>

                  <div className="flex items-center justify-between border-b border-border pb-6 gap-4">
                    <div className="flex-1">
                      <p className="text-base font-semibold text-foreground mb-1">Unassign conversation if inactive for...</p>
                      <p className="text-sm text-muted-foreground leading-relaxed max-w-xl">Conversations will only be unassigned if a new message is received after the conversation has been inactive for this time period.</p>
                    </div>
                    <select 
                      value={unassignInactiveTime}
                      onChange={(e) => setUnassignInactiveTime(e.target.value)}
                      className="h-9 rounded-md bg-muted/80 border border-border text-sm text-muted-foreground px-3 outline-none cursor-pointer hover:bg-muted transition-colors"
                    >
                      <option>Never</option>
                      <option>1 hour</option>
                      <option>24 hours</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between border-b border-border pb-6 gap-4">
                    <div className="flex-1">
                      <p className="text-base font-semibold text-foreground mb-1 flex items-center gap-2">Close conversation segment if inactive for...</p>
                      <p className="text-sm text-muted-foreground leading-relaxed max-w-xl">Conversation segments are important to divide long threads into multiple segments. A segment will be closed if there is no activity (e.g. tagging, commenting, assigning) for this time period, which will freeze analytics metrics for this segment.</p>
                    </div>
                    <select 
                      value={closeSegmentInactiveTime}
                      onChange={(e) => setCloseSegmentInactiveTime(e.target.value)}
                      className="h-9 rounded-md bg-muted/80 border border-border text-sm text-muted-foreground px-3 outline-none cursor-pointer hover:bg-muted transition-colors"
                    >
                      <option>5 days</option>
                      <option>7 days</option>
                      <option>14 days</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between border-b border-border pb-6">
                    <div>
                      <p className="text-base font-semibold text-foreground mb-1">Keep actions in this inbox separate from other inboxes</p>
                      <p className="text-sm text-muted-foreground">Assign, archive, or take other actions in this inbox without affecting conversations in other inboxes. Only applies to new conversations.</p>
                    </div>
                    <Switch checked={separateActions} onCheckedChange={setSeparateActions} className="data-[state=checked]:bg-indigo-500" />
                  </div>

                  <div className="flex items-center justify-between border-b border-border pb-6">
                    <div>
                      <p className="text-base font-semibold text-foreground mb-1">Show inbox in teammate sidebars</p>
                      <p className="text-sm text-muted-foreground">This inbox will appear in the sidebar for all teammates with access. Teammates can remove it from their sidebar anytime.</p>
                    </div>
                    <Button variant="outline" className="h-9 bg-transparent border-border text-muted-foreground hover:bg-muted hover:text-foreground">Show inbox</Button>
                  </div>

                  <div className="flex items-center justify-between border-b border-border pb-6">
                    <div>
                      <p className="text-base font-semibold text-foreground mb-1">Transfer inbox to teammate</p>
                      <p className="text-sm text-muted-foreground">All existing and new conversations will only be shared with the teammate you give access to.</p>
                    </div>
                    <Button variant="outline" className="h-9 bg-transparent border-border text-muted-foreground hover:bg-muted hover:text-foreground">Transfer to teammate</Button>
                  </div>

                  <div className="flex items-center justify-between border-b border-border pb-6">
                    <div>
                      <p className="text-base font-semibold text-foreground mb-1">Archive all conversations</p>
                      <p className="text-sm text-muted-foreground">All conversations before a certain date will be archived.</p>
                    </div>
                    <Button variant="outline" className="h-9 bg-transparent border-border text-muted-foreground hover:bg-muted hover:text-foreground">Archive from...</Button>
                  </div>

                  <div className="flex items-center justify-between pb-6">
                    <div>
                      <p className="text-base font-semibold text-foreground mb-1">Enable Patterns AI</p>
                      <p className="text-sm text-muted-foreground">Enable Summaries, Topics, Copilot and Autopilot for this inbox.</p>
                    </div>
                    <Switch className="data-[state=checked]:bg-indigo-500" />
                  </div>
                  
                  <div className="pt-4 flex justify-start items-center gap-4">
                    <Button 
                      className="h-9 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg px-6"
                      onClick={saveInboxSettings}
                      disabled={isSavingSettings}
                    >
                      {isSavingSettings ? "Saving..." : "Save Changes"}
                    </Button>
                    {actionSuccess && <span className="text-sm font-medium text-emerald-500">{actionSuccess}</span>}
                    {actionError && <span className="text-sm font-medium text-red-500">{actionError}</span>}
                  </div>
                </div>
               )}
             </div>
          </TabsContent>

          {/* CUSTOM FIELDS TAB */}
          <TabsContent value="custom fields" className="m-0 max-w-4xl">
            <div className="flex h-64 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-muted text-center p-6">
                <AlertCircle className="size-10 text-muted-foreground mb-4 opacity-50" />
                <p className="text-lg font-semibold text-muted-foreground mb-1">No custom fields</p>
                <p className="text-sm text-muted-foreground font-medium">Add custom fields to structure your data.</p>
                <Button className="mt-6 h-9 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg px-4 gap-2 border-0">
                    <Plus className="size-4" /> Add custom field
                </Button>
            </div>
          </TabsContent>

          {/* BUSINESS HOURS TAB */}
          <TabsContent value="business hours" className="m-0 max-w-4xl">
            <div className="mb-10">
              <p className="text-sm font-semibold text-muted-foreground mb-3">Days</p>
              <div className="flex gap-2">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => {
                  const isSelected = i === selectedDayIndex;
                  return (
                    <div 
                      key={i} 
                      onClick={() => setSelectedDayIndex(isSelected ? null : i)}
                      className={cn("flex size-9 items-center justify-center rounded-full text-xs font-bold cursor-pointer transition-colors", isSelected ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20" : "bg-card text-muted-foreground hover:bg-zinc-700")}
                    >
                      {day}
                    </div>
                  );
                })}
              </div>
            </div>

            {selectedDayIndex !== null ? (
              <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                <div className="space-y-6 mb-10">
                  <div className="flex items-center gap-4">
                     <p className="text-sm font-medium text-foreground w-24">
                       {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][selectedDayIndex]}
                     </p>
                     <div className="flex items-center gap-3">
                       <select className="h-9 rounded-md bg-card border-transparent text-sm text-muted-foreground px-3 outline-none cursor-pointer">
                         <option>9:00 AM</option>
                       </select>
                       <select className="h-9 rounded-md bg-card border-transparent text-sm text-muted-foreground px-3 outline-none cursor-pointer">
                         <option>5:00 PM</option>
                       </select>
                     </div>
                  </div>

                  <div className="space-y-2">
                     <p className="text-sm font-semibold text-muted-foreground">Time zone</p>
                     <select className="h-9 rounded-md bg-card border-transparent text-sm text-muted-foreground px-3 outline-none cursor-pointer w-64">
                       <option>Asia/Calcutta</option>
                     </select>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-6 border-t border-border">
                  <Button className="h-9 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg px-4 border-0">
                    Save
                  </Button>
                  <Button variant="ghost" className="h-9 text-muted-foreground hover:text-foreground" onClick={() => setSelectedDayIndex(null)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center pt-10 text-center animate-in fade-in duration-300">
                <div className="flex size-14 items-center justify-center rounded-full bg-card mb-4">
                  <Clock className="size-6 text-muted-foreground" />
                </div>
                <p className="text-base font-bold text-foreground mb-1">No business hours selected</p>
                <p className="text-sm text-muted-foreground">Select a day above to set its business hours</p>
              </div>
            )}
          </TabsContent>

        </div>
      </Tabs>
    </div>
  );
}
