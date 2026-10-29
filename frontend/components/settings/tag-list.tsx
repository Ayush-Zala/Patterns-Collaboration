"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Tag as TagIcon, 
  Search, 
  Plus, 
  MoreVertical, 
  Archive, 
  Trash2, 
  FolderInput,
  ChevronDown,
  Inbox
} from "lucide-react";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { format } from "date-fns";
import { useWorkspaceStore } from "@/context/workspace-store";

export function TagList() {
  const router = useRouter();
  const { scopeType: currentScopeType, scopeId: currentScopeId } = useWorkspaceStore();
  const { data: orgData } = authClient.useActiveOrganization();
  const { data: session } = authClient.useSession();
  
  // Allow overriding scope via query params
  const [scopeOverride, setScopeOverride] = useState<{type: string, id: string} | null>(null);
  
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const scopeParam = params.get("scope");
    if (scopeParam === "individual" && session?.user?.id) {
      setScopeOverride({ type: "individual", id: session.user.id });
    } else if (scopeParam === "company") {
      setScopeOverride({ type: "company", id: "global" });
    }
  }, [session?.user?.id, window.location.search]);

  const scopeType = scopeOverride?.type || currentScopeType;
  const scopeId = scopeOverride?.id || currentScopeId;
  
  const [tags, setTags] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"all" | "archived">("all");
  const [isLoading, setIsLoading] = useState(true);

  const fetchTags = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/settings/tags", {
        headers: { 
          "x-scope-type": scopeType,
          "x-scope-id": scopeId,
          ...(orgData?.id ? { "x-org-id": orgData.id } : {})
        }
      });
      if (res.ok) {
        const data = await res.json();
        setTags(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTags();
  }, [orgData?.id, scopeType, scopeId]);

  const filteredTags = useMemo(() => {
    return tags.filter(t => {
      const matchesSearch = t.name.toLowerCase().includes(search.toLowerCase());
      const matchesTab = activeTab === "all" ? !t.isArchived : t.isArchived;
      return matchesSearch && matchesTab;
    });
  }, [tags, search, activeTab]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredTags.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredTags.map(t => t.id));
    }
  };

  const handleBulkAction = async (action: "archive" | "unarchive" | "delete" | "nest") => {
    if (selectedIds.length === 0) return;
    
    try {
      if (action === "delete") {
        await Promise.all(selectedIds.map(id => 
          fetch(`/api/settings/tags/${id}`, { 
            method: "DELETE",
            headers: { 
              "x-scope-type": scopeType,
              "x-scope-id": scopeId,
              ...(orgData?.id ? { "x-org-id": orgData.id } : {})
            }
          })
        ));
      } else {
        const patch = action === "archive" ? { isArchived: true } : { isArchived: false };
        await fetch("/api/settings/tags/bulk", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "x-scope-type": scopeType,
            "x-scope-id": scopeId,
            ...(orgData?.id ? { "x-org-id": orgData.id } : {})
          },
          body: JSON.stringify({ ids: selectedIds, patch })
        });
      }
      setSelectedIds([]);
      fetchTags();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/settings/tags/${id}`, { 
        method: "DELETE",
        headers: { 
          "x-scope-type": scopeType,
          "x-scope-id": scopeId,
          ...(orgData?.id ? { "x-org-id": orgData.id } : {})
        }
      });
      if (res.ok) fetchTags();
    } catch (err) {
      console.error(err);
    }
  };

  const handleArchive = async (id: string, isArchived: boolean) => {
    try {
      const res = await fetch(`/api/settings/tags/${id}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "x-scope-type": scopeType,
          "x-scope-id": scopeId,
          ...(orgData?.id ? { "x-org-id": orgData.id } : {})
        },
        body: JSON.stringify({ isArchived })
      });
      if (res.ok) fetchTags();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6 border-b border-border w-full">
          <button
            onClick={() => setActiveTab("all")}
            className={cn(
              "pb-4 text-sm font-semibold transition-colors relative",
              activeTab === "all" ? "text-foreground" : "text-muted-foreground hover:text-muted-foreground"
            )}
          >
            All tags
            {activeTab === "all" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full" />}
          </button>
          <button
            onClick={() => setActiveTab("archived")}
            className={cn(
              "pb-4 text-sm font-semibold transition-colors relative",
              activeTab === "archived" ? "text-foreground" : "text-muted-foreground hover:text-muted-foreground"
            )}
          >
            Archived
            {activeTab === "archived" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full" />}
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input 
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search"
            className="pl-9 bg-muted/50 border-border h-10 text-sm focus:ring-1 focus:ring-indigo-500/50"
          />
        </div>
        <Link href="/settings/tags/create">
          <Button className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20">
            Create tag
          </Button>
        </Link>
      </div>

      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between p-2 px-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-3">
            <Checkbox 
              checked={selectedIds.length === filteredTags.length}
              onCheckedChange={toggleSelectAll}
              className="border-indigo-400 data-[state=checked]:bg-indigo-500"
            />
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => handleBulkAction("nest")}
                className="text-foreground hover:bg-muted/50 h-8 gap-2 border border-border"
              >
                <FolderInput className="size-3.5" /> Nest
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => handleBulkAction(activeTab === "all" ? "archive" : "unarchive")}
                className="text-foreground hover:bg-muted/50 h-8 gap-2 border border-border"
              >
                <Archive className="size-3.5" /> {activeTab === "all" ? "Archive" : "Unarchive"}
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => handleBulkAction("delete")}
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-8 gap-2 border border-red-500/20"
              >
                <Trash2 className="size-3.5" /> Delete
              </Button>
            </div>
          </div>
          <span className="text-xs font-bold text-indigo-400">{selectedIds.length} tag{selectedIds.length > 1 ? "s" : ""} selected</span>
        </div>
      )}

      <div className="rounded-xl border border-border bg-card/20 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border bg-card/40">
              <th className="p-4 w-10">
                <Checkbox 
                  checked={selectedIds.length === filteredTags.length && filteredTags.length > 0}
                  onCheckedChange={toggleSelectAll}
                  className="border-border"
                />
              </th>
              <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">
                <div className="flex items-center gap-1 cursor-pointer hover:text-muted-foreground transition-colors">
                  Name <ChevronDown className="size-3" />
                </div>
              </th>
              <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-widest text-right pr-12">Available in</th>
              <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-widest text-right">
                <div className="flex items-center justify-end gap-1">
                  Last used
                </div>
              </th>
              <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-widest text-right">Date created</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} className="p-12 text-center text-muted-foreground">Loading tags...</td>
              </tr>
            ) : filteredTags.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-12 text-center text-muted-foreground">No tags found.</td>
              </tr>
            ) : filteredTags.map(tag => (
                <tr 
                key={tag.id}
                className={cn(
                  "border-b border-border hover:bg-muted/20 transition-all group",
                  selectedIds.includes(tag.id) ? "bg-indigo-600/90 text-white" : "bg-transparent"
                )}
              >
                <td className="p-4">
                  <Checkbox 
                    checked={selectedIds.includes(tag.id)}
                    onCheckedChange={() => toggleSelect(tag.id)}
                    className="border-border data-[state=checked]:bg-indigo-600"
                  />
                </td>
                <td className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div 
                        className="size-8 rounded bg-muted/50 border border-border flex items-center justify-center"
                        style={{ color: tag.color && tag.color !== "transparent" ? tag.color : undefined }}
                      >
                        {tag.emoji ? (
                          <span className="text-sm">{tag.emoji}</span>
                        ) : (
                          <TagIcon 
                            className="size-3.5" 
                            style={{ fill: tag.color && tag.color !== "transparent" ? tag.color : "none" }} 
                          />
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className={cn("text-sm font-bold", selectedIds.includes(tag.id) ? "text-white" : "text-foreground")}>{tag.name}</span>
                        {tag.parent && (
                          <span className={cn("text-[10px]", selectedIds.includes(tag.id) ? "text-indigo-100/70" : "text-muted-foreground")}>under {tag.parent.name}</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className={cn("size-8 hover:text-foreground", selectedIds.includes(tag.id) ? "text-white" : "text-muted-foreground")}>
                            <MoreVertical className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-48 bg-popover border-border" align="end">
                          <DropdownMenuItem onClick={() => router.push(`/settings/tags/${tag.id}`)}>
                            Edit tag
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            Nest under
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            Create subtag
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-muted" />
                          <DropdownMenuItem onClick={() => handleArchive(tag.id, !tag.isArchived)}>
                            {tag.isArchived ? "Unarchive" : "Archive"}
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-red-400 focus:text-red-400"
                            onClick={() => handleDelete(tag.id)}
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </td>
                <td className="p-4 text-right pr-12">
                  <div className={cn("flex items-center justify-end gap-1.5 text-xs", selectedIds.includes(tag.id) ? "text-indigo-50" : "text-muted-foreground")}>
                    <Inbox className={cn("size-3", selectedIds.includes(tag.id) ? "text-indigo-100" : "text-muted-foreground")} />
                    {tag.inboxes?.length > 0 ? `${tag.inboxes.length} inboxes` : "Any inbox"}
                  </div>
                </td>
                <td className={cn("p-4 text-right text-sm", selectedIds.includes(tag.id) ? "text-indigo-100" : "text-muted-foreground")}>--</td>
                <td className={cn("p-4 text-right text-sm", selectedIds.includes(tag.id) ? "text-white" : "text-muted-foreground")}>
                  {format(new Date(tag.createdAt), "MMM d, yyyy")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
