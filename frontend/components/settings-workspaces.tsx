"use client";

import { useCallback, useEffect, useState } from "react";
import { Search, MoreHorizontal, Layout, Edit2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";

type Workspace = {
  id: string;
  name: string;
  color: string;
  inboxes: { id: string; name: string }[];
  createdAt: string;
};

export function SettingsWorkspaces() {
  const router = useRouter();
  const { data: orgData } = authClient.useActiveOrganization();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const loadWorkspaces = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/settings/workspaces");
      const data = await response.json();
      setWorkspaces(data.workspaces || []);
    } catch (error) {
      console.error("Failed to load workspaces", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadWorkspaces();
  }, [loadWorkspaces]);

  const handleDeleteWorkspace = async (id: string) => {
    if (!confirm("Are you sure you want to delete this workspace?")) return;
    try {
      const res = await fetch(`/api/settings/workspaces/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        setWorkspaces(prev => prev.filter(w => w.id !== id));
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete workspace");
      }
    } catch (e) {
      console.error(e);
      alert("Error deleting workspace");
    }
  };

  const filteredWorkspaces = workspaces.filter(w => 
    w.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="size-4 bg-indigo-500 rounded-sm shadow-[0_0_10px_rgba(99,102,241,0.3)]" />
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{orgData?.name || "patterns247"}</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Workspaces</h1>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            className="bg-primary text-primary-foreground h-10 px-6 font-bold shadow-lg shadow-primary/10 transition-all active:scale-[0.98]"
            onClick={() => router.push("/settings/workspaces/create")}
          >
            Create workspace
          </Button>
        </div>
      </div>

      <div className="relative max-w-md group">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
        <Input
          placeholder="Search"
          className="pl-9 bg-muted/30 border-border h-10 text-sm focus-visible:ring-primary"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="mt-8">
        <div className="border border-border rounded-xl overflow-hidden bg-card shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-muted-foreground font-semibold border-b border-border">
              <tr>
                <th className="px-6 py-4 uppercase tracking-wider text-[11px]">Name</th>
                <th className="px-6 py-4 uppercase tracking-wider text-[11px]">Inboxes</th>
                <th className="px-6 py-4 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                [...Array(3)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-5"><div className="h-5 w-32 bg-muted rounded" /></td>
                    <td className="px-6 py-5"><div className="h-5 w-48 bg-muted rounded" /></td>
                    <td className="px-6 py-5"><div className="h-5 w-10 bg-muted rounded" /></td>
                  </tr>
                ))
              ) : filteredWorkspaces.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-24 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Layout className="size-10 text-muted-foreground/30" />
                      <p className="text-muted-foreground font-medium">No workspaces found</p>
                      <Button 
                        variant="link" 
                        className="text-primary font-bold"
                        onClick={() => router.push("/settings/workspaces/create")}
                      >
                        Create your first workspace
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredWorkspaces.map((workspace) => (
                  <tr key={workspace.id} className="hover:bg-muted/20 transition-colors group">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-4">
                        <div 
                          className="size-8 rounded flex items-center justify-center text-xs font-black text-white shadow-sm"
                          style={{ backgroundColor: workspace.color || "#6366f1" }}
                        >
                          {workspace.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-bold text-foreground text-base leading-none">{workspace.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-wrap items-center gap-6">
                        {workspace.inboxes?.length > 0 ? (
                          workspace.inboxes.map(inbox => (
                            <div key={inbox.id} className="flex items-center gap-2 group/inbox">
                              <div className="size-2 rounded-full bg-pink-500 shadow-[0_0_8px_rgba(236,72,153,0.4)]" />
                              <span className="text-foreground font-medium text-sm hover:text-primary cursor-pointer transition-colors">
                                {inbox.name}
                              </span>
                            </div>
                          ))
                        ) : (
                          <span className="text-muted-foreground/50 italic text-[13px]">No connected inboxes</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-8 opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreHorizontal className="size-4 text-muted-foreground" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 bg-popover border-border/50">
                          <DropdownMenuItem 
                            onClick={() => router.push(`/settings/workspaces/${workspace.id}/edit`)}
                            className="cursor-pointer text-[13px] font-medium"
                          >
                            <Edit2 className="mr-2 size-3.5" /> Edit workspace
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDeleteWorkspace(workspace.id)}
                            className="cursor-pointer text-[13px] font-medium text-red-500 focus:text-red-600 focus:bg-red-500/10"
                          >
                            <Trash2 className="mr-2 size-3.5" /> Delete workspace
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
