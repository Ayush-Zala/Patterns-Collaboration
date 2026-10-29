"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Search, Tag as TagIcon, Lock, X } from "lucide-react";
import { 
  SidebarGroup, 
  SidebarGroupContent, 
  SidebarGroupLabel, 
  SidebarMenu, 
  SidebarMenuButton, 
  SidebarMenuItem 
} from "@/components/ui/sidebar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { authClient } from "@/lib/auth-client";
import { useWorkspaceStore } from "@/context/workspace-store";
import { cn } from "@/lib/utils";

export function TagsSidebarSection() {
  const { data: orgData } = authClient.useActiveOrganization();
  const { data: session } = authClient.useSession();
  const { scopeType, scopeId } = useWorkspaceStore();
  const userId = session?.user?.id;

  const [privateTags, setPrivateTags] = useState<any[]>([]);
  const [sharedTags, setSharedTags] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTags = async () => {
    setIsLoading(true);
    try {
      // Fetch Shared Tags (Organization scope)
      if (orgData?.id) {
        const sharedRes = await fetch("/api/settings/tags", {
          headers: { 
            "x-scope-type": "organization",
            "x-scope-id": orgData.id,
            "x-org-id": orgData.id
          }
        });
        if (sharedRes.ok) {
          setSharedTags(await sharedRes.json());
        }
      }

      // Fetch Private Tags (Individual scope)
      if (userId) {
        const privateRes = await fetch("/api/settings/tags", {
          headers: { 
            "x-scope-type": "individual",
            "x-scope-id": userId,
          }
        });
        if (privateRes.ok) {
          setPrivateTags(await privateRes.json());
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteTag = async (tagId: string) => {
    try {
      const res = await fetch(`/api/settings/tags/${tagId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchTags();
      }
    } catch (err) {
      console.error("Failed to delete tag:", err);
    }
  };

  const togglePin = async (tag: any) => {
    try {
      const res = await fetch(`/api/settings/tags/${tag.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ showInList: !tag.showInList }),
      });
      if (res.ok) {
        fetchTags();
      }
    } catch (err) {
      console.error("Failed to toggle pin:", err);
    }
  };

  useEffect(() => {
    fetchTags();
  }, [orgData?.id, userId]);

  const pinnedPrivate = privateTags.filter(t => t.showInList && !t.isArchived);
  const pinnedShared = sharedTags.filter(t => t.showInList && !t.isArchived);

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 px-2">
        Pinned
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {pinnedPrivate.map(tag => (
            <SidebarMenuItem key={tag.id}>
              <SidebarMenuButton asChild>
                <Link href={`/inbox?tag=${encodeURIComponent(tag.name)}`}>
                  {tag.emoji ? <span>{tag.emoji}</span> : <TagIcon className="size-4 text-muted-foreground" />}
                  <span className="flex-1 truncate">{tag.name}</span>
                  <div className="flex items-center gap-1 ml-auto">
                    <Lock className="size-3 text-muted-foreground opacity-50" />
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        deleteTag(tag.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-muted rounded-sm transition-all"
                    >
                      <X className="size-3 text-muted-foreground" />
                    </button>
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
          {pinnedShared.map(tag => (
            <SidebarMenuItem key={tag.id}>
              <SidebarMenuButton asChild>
                <Link href={`/inbox?tag=${encodeURIComponent(tag.name)}`}>
                  {tag.emoji ? <span>{tag.emoji}</span> : <TagIcon className="size-4 text-muted-foreground" />}
                  <span className="flex-1 truncate">{tag.name}</span>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      deleteTag(tag.id);
                    }}
                    className="opacity-0 group-hover/btn:opacity-100 p-0.5 hover:bg-muted rounded-sm transition-all ml-auto"
                  >
                    <X className="size-3 text-muted-foreground" />
                  </button>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}

          {/* Add Private Tags Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <SidebarMenuButton className="text-primary hover:text-primary/90 mt-1 cursor-pointer font-medium">
                <Plus className="size-4" />
                <span>Add private tags</span>
              </SidebarMenuButton>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0 ml-4" side="right" align="start">
              <Command>
                <div className="flex items-center border-b px-3">
                  <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                  <CommandInput placeholder="Search private tags..." className="border-none focus:ring-0 h-9" />
                </div>
                <CommandList>
                  <CommandEmpty>No tags found.</CommandEmpty>
                  <CommandGroup>
                    {privateTags.filter(t => !t.isArchived).map((tag) => (
                      <CommandItem key={`individual-${tag.id}`} onSelect={() => togglePin(tag)}>
                        <div className="flex items-center gap-2 w-full">
                          {tag.emoji ? <span>{tag.emoji}</span> : <TagIcon className="size-4" />}
                          <span className="flex-1 truncate font-medium">{tag.name}</span>
                          {tag.showInList && <div className="size-1.5 rounded-full bg-primary" />}
                          <Lock className="size-3 text-muted-foreground opacity-50 ml-1" />
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
                <div className="border-t p-1">
                  <Link href="/settings/tags?scope=individual" className="flex items-center w-full px-2 py-1.5 text-sm font-medium hover:bg-muted rounded-sm transition-colors text-primary">
                    <Plus className="mr-2 h-4 w-4" />
                    Create new private tag
                  </Link>
                </div>
              </Command>
            </PopoverContent>
          </Popover>

          {/* Add Shared Tags Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <SidebarMenuButton className="text-primary hover:text-primary/90 cursor-pointer font-medium">
                <Plus className="size-4" />
                <span>Add shared tags</span>
              </SidebarMenuButton>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0 ml-4" side="right" align="start">
              <Command>
                <div className="flex items-center border-b px-3 bg-muted/30">
                  <div className="size-5 rounded bg-teal-600 flex items-center justify-center text-white text-[10px] font-bold mr-2">
                    {orgData?.name?.charAt(0).toUpperCase() || "W"}
                  </div>
                  <span className="text-sm font-semibold truncate">{orgData?.name || "Workspace"} tags</span>
                </div>
                <div className="flex items-center border-b px-3">
                  <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                  <CommandInput placeholder="Search..." className="border-none focus:ring-0 h-9" />
                </div>
                <CommandList>
                  <CommandEmpty>No tags found.</CommandEmpty>
                  <CommandGroup>
                    {sharedTags.filter(t => !t.isArchived).map((tag) => (
                      <CommandItem key={`organization-${tag.id}`} onSelect={() => togglePin(tag)}>
                        <div className="flex items-center gap-2 w-full">
                          {tag.emoji ? <span>{tag.emoji}</span> : <TagIcon className="size-4" />}
                          <span className="flex-1 truncate font-medium">{tag.name}</span>
                          {tag.showInList && <div className="size-1.5 rounded-full bg-primary" />}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
                <div className="border-t p-1">
                  <Link href="/settings/tags?scope=company" className="flex items-center w-full px-2 py-1.5 text-sm font-medium hover:bg-muted rounded-sm transition-colors text-primary">
                    <Plus className="mr-2 h-4 w-4" />
                    Create new shared tag
                  </Link>
                </div>
              </Command>
            </PopoverContent>
          </Popover>
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
