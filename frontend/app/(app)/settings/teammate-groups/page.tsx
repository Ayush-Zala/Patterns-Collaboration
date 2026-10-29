"use client";
import { ScopeBreadcrumb } from "@/components/settings/scope-breadcrumb";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Plus, Users, UserCircle } from "lucide-react";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { useOrganizationManagement } from "@/hooks/use-organization-management";
import { useWorkspaceStore } from "@/context/workspace-store";

export default function TeammateGroupsPage() {
  const router = useRouter();
  const { scopeType } = useWorkspaceStore();

  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [groups, setGroups] = useState<any[]>([]);
  const [isLoadingGroups, setIsLoadingGroups] = useState(true);

  const [settings, setSettings] = useState<any>({ canCreate: "[]", canEdit: "[]", canDelete: "[]" });
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isSettingsLoaded, setIsSettingsLoaded] = useState(false);

  const { members, isLoadingMembers: isLoadingOrgMembers } = useOrganizationManagement();
  const { data: orgData } = authClient.useActiveOrganization();

  useEffect(() => {
    if (scopeType !== "organization" && scopeType !== "company") {
      router.push("/settings/home");
    }
  }, [scopeType, router]);

  if (scopeType !== "organization" && scopeType !== "company") return null;

  useEffect(() => {
    async function loadGroups() {
      try {
        const headers: any = {};
        if (orgData?.id) headers["x-org-id"] = orgData.id;
        const res = await fetch("/api/settings/teammate-groups", { headers });
        if (res.ok) {
          const data = await res.json();
          setGroups(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoadingGroups(false);
      }
    }
    if (orgData?.id) loadGroups();
  }, [orgData?.id]);

  useEffect(() => {
    if (activeTab === "management" && !isSettingsLoaded && orgData?.id) {
      async function loadSettings() {
        try {
          const headers: any = {};
          headers["x-org-id"] = orgData!.id;
          const res = await fetch("/api/settings/teammate-groups/settings", { headers });
          if (res.ok) {
            const data = await res.json();
            setSettings(data);
          }
        } catch (err) {
          console.error(err);
        } finally {
          setIsSettingsLoaded(true);
        }
      }
      loadSettings();
    }
  }, [activeTab, isSettingsLoaded, orgData?.id]);

  const saveSettings = async (newSettings: any) => {
    setIsSavingSettings(true);
    try {
      const headers: any = { "Content-Type": "application/json" };
      if (orgData?.id) headers["x-org-id"] = orgData.id;
      const res = await fetch("/api/settings/teammate-groups/settings", {
        method: "PUT",
        headers,
        body: JSON.stringify(newSettings),
      });
      if (res.ok) {
        setSettings(newSettings);
      } else {
        alert("Failed to update settings");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleSettingsChange = (field: string, value: string) => {
    // Basic array wrapper stringification since MVP uses JSON array string
    let currentArray = [];
    try {
      currentArray = JSON.parse(settings[field] || "[]");
    } catch (e) {}

    const newArray = [value]; // For MVP, just storing single value or overwriting
    const newSettings = { ...settings, [field]: JSON.stringify(newArray) };
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  const filteredGroups = groups.filter(g => 
    g.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="border-b border-border p-6 pb-0">
        <div className="text-xs text-muted-foreground flex items-center gap-2 mb-1">
          <ScopeBreadcrumb /> <span>›</span>
        </div>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">Teammate groups</h1>
          </div>
          <Button asChild className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20">
            <Link href="/settings/teammate-groups/create">
              Create teammate group
            </Link>
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-transparent border-b border-border w-full justify-start h-auto p-0 rounded-none">
            <TabsTrigger 
              value="all" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-zinc-100 data-[state=active]:text-foreground data-[state=active]:bg-transparent px-4 py-2.5 text-muted-foreground font-medium"
            >
              All teammate groups
            </TabsTrigger>
            <TabsTrigger 
              value="management" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-zinc-100 data-[state=active]:text-foreground data-[state=active]:bg-transparent px-4 py-2.5 text-muted-foreground font-medium"
            >
              Management
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="flex-1 overflow-hidden relative">
        {activeTab === "all" ? (
          <div className="h-full flex flex-col p-6">
            <div className="relative w-64 mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input 
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search" 
                className="pl-9 bg-muted/50 border-border"
              />
            </div>

            <ScrollArea className="flex-1 rounded-xl border border-border bg-card">
              <table className="w-full text-left border-collapse">
                <thead className="bg-muted/50 border-b border-border sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[40%]">Name</th>
                    <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Members</th>
                    <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      <span className="flex items-center gap-1">Access</span>
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Date created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {isLoadingGroups ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-sm text-muted-foreground">Loading...</td>
                    </tr>
                  ) : filteredGroups.length > 0 ? (
                    filteredGroups.map(group => (
                      <tr key={group.id} className="hover:bg-muted/20 transition-colors group cursor-pointer" onClick={() => router.push(`/settings/teammate-groups/${group.id}`)}>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="size-8 rounded-md bg-muted flex items-center justify-center shrink-0">
                              <Users className="size-4 text-muted-foreground" />
                            </div>
                            <span className="text-sm font-semibold text-foreground">{group.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">
                          {group.members?.length || 0} member{(group.members?.length !== 1) ? 's' : ''}
                        </td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">
                          1 workspace {/* Placeholder as per screenshot */}
                        </td>
                        <td className="px-6 py-4 text-sm text-muted-foreground text-right">
                          {format(new Date(group.createdAt), "MMM dd, yyyy")}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center">
                        <Users className="size-8 text-muted-foreground mx-auto mb-3" />
                        <p className="text-sm font-medium text-muted-foreground">No teammate groups found</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </ScrollArea>
          </div>
        ) : (
          <ScrollArea className="h-full p-8">
            <div className="max-w-3xl space-y-8">
              
              <ManagementRow 
                title="Create teammate groups"
                description="Selected teammates and teammate groups can create new teammate groups."
                field="canCreate"
                currentValue={settings.canCreate}
                members={members}
                onChange={(val: string) => handleSettingsChange("canCreate", val)}
                isSaving={isSavingSettings}
              />

              <ManagementRow 
                title="Edit teammate groups"
                description="Selected teammates and teammate groups can edit any teammate group and manage its access."
                field="canEdit"
                currentValue={settings.canEdit}
                members={members}
                onChange={(val: string) => handleSettingsChange("canEdit", val)}
                isSaving={isSavingSettings}
              />

              <ManagementRow 
                title="Delete teammate groups"
                description="Selected teammates and teammate groups can delete any teammate group."
                field="canDelete"
                currentValue={settings.canDelete}
                members={members}
                onChange={(val: string) => handleSettingsChange("canDelete", val)}
                isSaving={isSavingSettings}
              />

            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}

function ManagementRow({ title, description, currentValue, members, onChange, isSaving }: any) {
  let selected = "";
  try {
    const parsed = JSON.parse(currentValue);
    if (parsed && parsed.length > 0) selected = parsed[0];
  } catch(e) {}

  return (
    <div className="flex items-start justify-between py-6 border-b border-border last:border-0">
      <div className="max-w-lg">
        <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
          {title}
        </h3>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>
      <div>
        <Select value={selected} onValueChange={onChange} disabled={isSaving}>
          <SelectTrigger className="w-[220px] bg-muted/50 border-border">
            <div className="flex items-center gap-2 text-muted-foreground">
              <UserCircle className="size-4 text-muted-foreground" />
              <SelectValue placeholder="Select teammates" />
            </div>
          </SelectTrigger>
          <SelectContent>
            {members.map((m: any) => (
              <SelectItem key={m.id} value={m.userId || m.id}>
                {m.user?.name || m.name || m.user?.email || m.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
