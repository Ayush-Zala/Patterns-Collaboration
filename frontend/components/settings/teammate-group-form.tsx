"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, Users, Download, Upload, Search, Plus, 
  ChevronDown, Check, Trash2, UserCircle, Globe
} from "lucide-react";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuTrigger, DropdownMenuSeparator 
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";
import { useOrganizationManagement } from "@/hooks/use-organization-management";
import { cn } from "@/lib/utils";

interface TeammateGroupFormProps {
  initialData?: any;
  groupId?: string;
  isEdit?: boolean;
}

export function TeammateGroupForm({ initialData, groupId, isEdit }: TeammateGroupFormProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("members");
  
  // Form State
  const [name, setName] = useState(initialData?.name || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>(
    initialData?.members?.map((m: any) => m.userId) || []
  );
  
  const [workspaceAccess, setWorkspaceAccess] = useState<string[]>(
    JSON.parse(initialData?.workspaceAccess || "[]")
  );
  const [contactsAccessEnabled, setContactsAccessEnabled] = useState(
    initialData?.contactsAccessEnabled || false
  );
  const [canEditGroup, setCanEditGroup] = useState<string[]>(
    JSON.parse(initialData?.canEditGroup || "[]")
  );
  const [canDeleteGroup, setCanDeleteGroup] = useState<string[]>(
    JSON.parse(initialData?.canDeleteGroup || "[]")
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMemberDialogOpen, setIsMemberDialogOpen] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const [tableSearch, setTableSearch] = useState("");

  // Data Fetching
  const { members: hookMembers, isLoadingMembers, fetchMembersDirect } = useOrganizationManagement();
  const [allMembers, setAllMembers] = useState<any[]>([]);
  const { data: orgData } = authClient.useActiveOrganization();

  useEffect(() => {
    if (hookMembers && hookMembers.length > 0) {
      setAllMembers(hookMembers);
    }
  }, [hookMembers]);

  // Fallback if hook is empty but loading is finished
  useEffect(() => {
    if (!isLoadingMembers && allMembers.length === 0) {
      const loadFallback = async () => {
        const direct = await fetchMembersDirect();
        if (direct && direct.length > 0) {
          setAllMembers(direct);
        }
      };
      loadFallback();
    }
  }, [isLoadingMembers, allMembers.length, fetchMembersDirect]);

  const [allGroups, setAllGroups] = useState<any[]>([]);
  useEffect(() => {
    async function fetchGroups() {
      const headers: any = {};
      if (orgData?.id) headers["x-org-id"] = orgData.id;
      const res = await fetch("/api/settings/teammate-groups", { headers });
      if (res.ok) {
        const data = await res.json();
        setAllGroups(data.filter((g: any) => g.id !== groupId));
      }
    }
    if (orgData?.id) fetchGroups();
  }, [groupId, orgData?.id]);

  // Derived Data
  const members = useMemo(() => {
    return selectedMemberIds.map(id => {
      const m = allMembers.find((member: any) => (member.userId || member.id) === id);
      return m ? {
        id,
        name: m.user?.name || m.name,
        email: m.user?.email || m.email,
        joined: m.createdAt
      } : null;
    }).filter(Boolean);
  }, [selectedMemberIds, allMembers]);

  const filteredMembers = members.filter((m: any) => 
    m.name.toLowerCase().includes(tableSearch.toLowerCase()) || 
    m.email.toLowerCase().includes(tableSearch.toLowerCase())
  );

  // CSV Logic
  const downloadTemplate = () => {
    const csvContent = "data:text/csv;charset=utf-8,Name,Email\nJohn Doe,john@example.com";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "teammate_group_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const importCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split("\n").slice(1); // skip header
      const emails = lines.map(line => line.split(",")[1]?.trim()).filter(Boolean);
      
      const newIds = allMembers
        .filter((m: any) => emails.includes(m.user?.email || m.email))
        .map((m: any) => m.userId || m.id);
      
      setSelectedMemberIds(prev => Array.from(new Set([...prev, ...newIds])));
    };
    reader.readAsText(file);
  };

  // Actions
  const handleSave = async () => {
    if (!name.trim()) return;
    setIsSubmitting(true);
    try {
      const url = isEdit ? `/api/settings/teammate-groups/${groupId}` : "/api/settings/teammate-groups";
      const method = isEdit ? "PUT" : "POST";
      
      const headers: any = { "Content-Type": "application/json" };
      if (orgData?.id) headers["x-org-id"] = orgData.id;

      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          members: selectedMemberIds,
          workspaceAccess: JSON.stringify(workspaceAccess),
          contactsAccessEnabled,
          canEditGroup: JSON.stringify(canEditGroup),
          canDeleteGroup: JSON.stringify(canDeleteGroup),
        }),
      });

      if (res.ok) {
        router.push("/settings/teammate-groups");
        router.refresh();
      } else {
        alert("Failed to save group");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this group?")) return;
    try {
      const headers: any = {};
      if (orgData?.id) headers["x-org-id"] = orgData.id;
      const res = await fetch(`/api/settings/teammate-groups/${groupId}`, { 
        method: "DELETE",
        headers
      });
      if (res.ok) {
        router.push("/settings/teammate-groups");
        router.refresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="flex h-full flex-col bg-background text-foreground">
      <div className="border-b border-border p-6 pb-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild className="text-muted-foreground hover:text-foreground">
              <Link href="/settings/teammate-groups">
                <ArrowLeft className="size-4" />
              </Link>
            </Button>
            <div>
              <div className="text-[10px] text-muted-foreground flex items-center gap-2 mb-1 uppercase font-bold tracking-widest">
                <Globe className="size-3" /> Company <span>›</span> Teammate groups
              </div>
              <h1 className="text-xl font-bold">
                {isEdit ? `Edit ${name}` : "Create teammate group"}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isEdit && (
              <Button 
                variant="outline" 
                onClick={handleDelete}
                className="border-red-500/50 text-red-400 hover:bg-red-500/10 hover:text-red-400 h-9"
              >
                Delete teammate group
              </Button>
            )}
            <Button 
              onClick={handleSave} 
              disabled={isSubmitting || !name.trim()}
              className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 h-9"
            >
              {isSubmitting ? "Saving..." : isEdit ? "Save changes" : "Create teammate group"}
            </Button>
          </div>
        </div>

        <TabsList className="bg-transparent border-b border-border w-full justify-start h-auto p-0 rounded-none">
          {["members", "access", "contacts", "management"].map((tab) => (
            <TabsTrigger 
              key={tab}
              value={tab} 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-zinc-100 data-[state=active]:text-foreground data-[state=active]:bg-transparent px-4 py-2.5 text-muted-foreground font-medium capitalize"
            >
              {tab === "access" ? "Access and permissions" : 
                tab === "contacts" ? "Contacts access" : tab}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-8 max-w-4xl">
          
          <TabsContent value="members" className="mt-0 space-y-8 animate-in fade-in">
            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="text-muted-foreground text-sm font-semibold">Name <span className="text-red-500">*</span></Label>
                <Input 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder='For example: "Support" or "Managers"' 
                  className="bg-popover border-border focus:border-indigo-500/50 h-10 text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground text-sm font-semibold">Description</Label>
                <textarea 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Purpose of this group" 
                  className="w-full h-20 bg-popover border border-border rounded-md p-3 text-sm focus:outline-none focus:border-indigo-500/50 resize-none transition-all"
                />
              </div>
            </div>

            <div className="space-y-4 pt-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">
                  Teammate group members <span className="text-red-500">*</span>
                  <span className="text-xs text-muted-foreground font-normal ml-2">{selectedMemberIds.length} member{selectedMemberIds.length !== 1 ? 's' : ''}</span>
                </h3>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <MemberSelectionDialog 
                  availableMembers={allMembers}
                  selectedIds={selectedMemberIds}
                  onSelect={setSelectedMemberIds}
                />
                
                <Button variant="ghost" onClick={downloadTemplate} className="text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 text-xs">
                  <Upload className="size-3.5 mr-2 rotate-180" /> Download CSV template
                </Button>
                
                <label className="cursor-pointer">
                  <Button variant="ghost" asChild className="text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 text-xs pointer-events-none">
                    <span><Download className="size-3.5 mr-2 rotate-180" /> Import CSV</span>
                  </Button>
                  <input type="file" accept=".csv" onChange={importCSV} className="hidden" />
                </label>

                <div className="relative ml-auto">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                  <Input 
                    value={tableSearch}
                    onChange={(e) => setTableSearch(e.target.value)}
                    placeholder="Search" 
                    className="pl-9 bg-popover border-border h-8 text-xs w-48" 
                  />
                </div>
              </div>

              <div className="border border-border rounded-lg overflow-hidden bg-card">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-popover border-b border-border">
                    <tr>
                      <th className="px-4 py-3 font-semibold text-muted-foreground">Name ↑</th>
                      <th className="px-4 py-3 font-semibold text-muted-foreground">Email</th>
                      <th className="px-4 py-3 font-semibold text-muted-foreground">Joined</th>
                      <th className="px-4 py-3 font-semibold text-muted-foreground w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {filteredMembers.length > 0 ? (
                      filteredMembers.map((m: any) => (
                        <tr key={m.id} className="hover:bg-muted/20 group">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="size-6 rounded-md bg-muted flex items-center justify-center shrink-0">
                                <span className="text-[10px] font-bold text-muted-foreground">{m.name[0]}</span>
                              </div>
                              <span className="font-medium">{m.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{m.email}</td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {m.joined ? format(new Date(m.joined), "MMM dd, yyyy") : "—"}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button 
                              onClick={() => setSelectedMemberIds(prev => prev.filter(id => id !== m.id))}
                              className="text-muted-foreground hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-4 py-12 text-center text-muted-foreground italic">
                          No members found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="access" className="mt-0 space-y-6 animate-in fade-in">
            <div className="flex items-center justify-between">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input placeholder="Search" className="pl-9 bg-popover border-border h-9" />
              </div>
              <WorkspaceAccessDropdown 
                orgName={orgData?.name || "Company"}
                selected={workspaceAccess}
                onSelect={setWorkspaceAccess}
              />
            </div>

            <div className="border border-border rounded-lg overflow-hidden bg-card">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-popover border-b border-border">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-muted-foreground">Workspace</th>
                    <th className="px-4 py-3 font-semibold text-muted-foreground">Inboxes</th>
                    <th className="px-4 py-3 font-semibold text-muted-foreground text-right">Permissions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  <tr className="hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="size-6 rounded bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold">P</div>
                        <span>{orgData?.name || "patterns247"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">—</td>
                    <td className="px-4 py-3 text-right text-foreground">All permissions</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="contacts" className="mt-0 space-y-6 animate-in fade-in">
            <div className="p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-lg">
              <p className="text-sm text-muted-foreground">
                Shared contacts permissions are currently disabled: all teammates have unrestricted access to shared contacts.
              </p>
            </div>
            <Button 
              variant="outline" 
              className="bg-indigo-600 border-indigo-600 text-white hover:bg-indigo-500 hover:text-foreground border-0 h-10"
              onClick={() => setContactsAccessEnabled(!contactsAccessEnabled)}
            >
              {contactsAccessEnabled ? "Disable contacts permissions" : "Enable contacts permissions"}
            </Button>
          </TabsContent>

          <TabsContent value="management" className="mt-0 space-y-12 animate-in fade-in">
            <ManagementSection 
              title="Edit teammate group"
              description="Selected teammates and teammate groups can edit this teammate group and manage its access."
              items={allGroups}
              members={allMembers}
              selected={canEditGroup}
              onSelect={setCanEditGroup}
            />

            <ManagementSection 
              title="Delete teammate group"
              description="Selected teammates and teammate groups can delete this teammate group."
              items={allGroups}
              members={allMembers}
              selected={canDeleteGroup}
              onSelect={setCanDeleteGroup}
            />
          </TabsContent>

        </div>
      </div>
    </Tabs>
  );
}

// Sub-components

function MemberSelectionDialog({ availableMembers, selectedIds, onSelect }: any) {
  const [search, setSearch] = useState("");
  const filtered = availableMembers.filter((m: any) => {
    const name = (m.user?.name || m.name || "").toLowerCase();
    const email = (m.user?.email || m.email || "").toLowerCase();
    const searchLower = search.toLowerCase();
    return name.includes(searchLower) || email.includes(searchLower);
  });

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="bg-popover border-border text-foreground hover:bg-muted h-9">
          <Plus className="size-4 mr-2" /> Add members
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border text-foreground sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Add members to group</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Search and select teammates to add to this group.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search teammates..." 
              className="pl-9 bg-popover border-border h-9 text-sm"
            />
          </div>
          <ScrollArea className="h-[300px] pr-2">
            <div className="space-y-1">
              {filtered.length > 0 ? (
                filtered.map((m: any) => {
                  const id = m.userId || m.id;
                  const isSelected = selectedIds.includes(id);
                  return (
                    <div 
                      key={id} 
                      className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-lg cursor-pointer transition-colors"
                      onClick={() => {
                        onSelect((prev: string[]) => 
                          isSelected ? prev.filter(x => x !== id) : [...prev, id]
                        );
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="size-8 rounded-full bg-muted flex items-center justify-center font-bold text-xs">
                          {(m.user?.name || m.name || "?")[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{m.user?.name || m.name || m.user?.email || m.email || "Unknown Member"}</p>
                          <p className="text-xs text-muted-foreground">{m.user?.email || m.email || "No email"}</p>
                        </div>
                      </div>
                      {isSelected && <Check className="size-4 text-indigo-400" />}
                    </div>
                  );
                })
              ) : (
                <div className="py-20 text-center text-sm text-muted-foreground">
                  {search ? "No teammates found matching your search" : "No teammates found in this organization"}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
        <DialogFooter>
          <Button asChild className="w-full bg-indigo-600 hover:bg-indigo-500">
            <DialogTrigger>Done</DialogTrigger>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function WorkspaceAccessDropdown({ orgName, selected, onSelect }: any) {
  const isSelected = selected.includes("global");
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="bg-popover border-border text-muted-foreground h-9 px-3">
          Workspace access <ChevronDown className="size-4 ml-2 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="bg-card border-border w-64 p-0">
        <div className="p-3 border-b border-border">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest text-center">Workspaces</p>
        </div>
        <div className="p-3 relative">
           <Search className="absolute left-5 top-5 size-3.5 text-muted-foreground" />
           <Input placeholder="Search" className="pl-9 bg-transparent border-border h-8 text-xs" />
        </div>
        <div className="p-2 space-y-1">
          <div className="p-2 bg-indigo-500/5 border border-indigo-500/10 rounded text-[10px] text-muted-foreground leading-relaxed flex gap-2">
            <span>Members of this teammate group will access conversations from shared inboxes in the selected workspaces.</span>
          </div>
          <div 
            className="flex items-center justify-between p-2 hover:bg-muted/50 rounded cursor-pointer group"
            onClick={() => onSelect(isSelected ? [] : ["global"])}
          >
            <div className="flex items-center gap-3">
              <div className="size-5 rounded bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold text-[10px]">P</div>
              <span className="text-xs">{orgName}</span>
            </div>
            <Checkbox checked={isSelected} className="border-border" />
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ManagementSection({ title, description, items, members, selected, onSelect }: any) {
  const [search, setSearch] = useState("");
  
  const selectedLabel = useMemo(() => {
    if (selected.includes("everyone")) return "Everyone in this company";
    if (selected.length === 0) return "Select teammates";
    if (selected.length === 1) {
      const item = items.find((i: any) => i.id === selected[0]) || members.find((m: any) => (m.userId || m.id) === selected[0]);
      return item?.name || item?.user?.name || "1 item selected";
    }
    return `${selected.length} items selected`;
  }, [selected, items, members]);

  return (
    <div className="flex items-start justify-between">
      <div className="max-w-md space-y-1">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">{title}</h3>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="w-64 justify-between bg-popover border-border text-muted-foreground h-9 font-normal">
            <div className="flex items-center gap-2 overflow-hidden">
               {selected.includes("everyone") ? <Globe className="size-3.5" /> : <UserCircle className="size-3.5" />}
               <span className="truncate">{selectedLabel}</span>
            </div>
            <ChevronDown className="size-4 opacity-50 shrink-0" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="bg-card border-border w-72 p-0 shadow-2xl">
          <div className="p-3 border-b border-border flex items-center justify-between">
            <span className="text-xs font-bold text-foreground">Teammates</span>
            <button className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium" onClick={() => onSelect([])}>Clear all</button>
          </div>
          <div className="p-3 relative">
            <Search className="absolute left-5 top-5 size-4 text-muted-foreground" />
            <Input 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search" 
              className="pl-9 bg-transparent border-border h-9 text-xs" 
            />
          </div>
          <ScrollArea className="h-64">
            <div className="p-2 space-y-1">
              <div 
                className="flex items-center justify-between p-2.5 hover:bg-muted/50 rounded cursor-pointer transition-colors"
                onClick={() => onSelect(selected.includes("everyone") ? [] : ["everyone"])}
              >
                <div className="flex items-center gap-3">
                  <Globe className="size-4 text-muted-foreground" />
                  <span className="text-xs">Everyone in this company</span>
                </div>
                <Checkbox checked={selected.includes("everyone")} className="border-border" />
              </div>

              <div className="px-2.5 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Teammate groups</div>
              
              {items.filter((i: any) => i.name.toLowerCase().includes(search.toLowerCase())).map((group: any) => {
                const isSelected = selected.includes(group.id);
                return (
                  <div 
                    key={group.id} 
                    className="flex items-center justify-between p-2.5 hover:bg-muted/50 rounded cursor-pointer group transition-colors"
                    onClick={() => onSelect((prev: string[]) => isSelected ? prev.filter(id => id !== group.id) : [...prev, group.id])}
                  >
                    <div className="flex items-center gap-3">
                      <Users className="size-4 text-muted-foreground" />
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs">{group.name}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground group-hover:bg-zinc-700">{group.members?.length || 0}</span>
                      </div>
                    </div>
                    <Checkbox checked={isSelected} className="border-border" />
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
