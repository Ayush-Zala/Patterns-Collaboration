"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { 
  Tag, 
  ChevronDown, 
  Check, 
  Search,
  Smile,
  X,
  Inbox
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/context/workspace-store";

const COLORS = [
  "transparent",
  "#be185d", // pink-700
  "#b91c1c", // red-700
  "#c2410c", // orange-700
  "#a16207", // yellow-700
  "#15803d", // green-700
  "#0f766e", // teal-700
  "#0369a1", // sky-700
  "#1d4ed8", // blue-700
  "#4338ca", // indigo-700
  "#6d28d9", // violet-700
];

interface TagFormProps {
  initialData?: any;
  isEdit?: boolean;
}

export function TagForm({ initialData, isEdit }: TagFormProps) {
  const router = useRouter();
  const { scopeType, scopeId } = useWorkspaceStore();
  const { data: orgData } = authClient.useActiveOrganization();

  const [name, setName] = useState(initialData?.name || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [selectedColor, setSelectedColor] = useState(initialData?.color || "transparent");
  const [selectedEmoji, setSelectedEmoji] = useState(initialData?.emoji || "");
  const [parentId, setParentId] = useState<string | null>(initialData?.parentId || null);
  const [showInList, setShowInList] = useState(initialData?.showInList ?? true);
  
  const [availableTags, setAvailableTags] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isTagSelectOpen, setIsTagSelectOpen] = useState(false);

  useEffect(() => {
    async function fetchTags() {
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
          // Filter out current tag to prevent self-nesting
          setAvailableTags(data.filter((t: any) => t.id !== initialData?.id));
        }
      } catch (err) {
        console.error(err);
      }
    }
    fetchTags();
  }, [orgData?.id, initialData?.id, scopeType, scopeId]);

  const [selectedInboxIds, setSelectedInboxIds] = useState<string[]>(
    initialData?.inboxes?.map((i: any) => i.inboxId) || []
  );
  const [availableInboxes, setAvailableInboxes] = useState<any[]>([]);
  const [inboxSearch, setInboxSearch] = useState("");

  useEffect(() => {
    async function fetchInboxes() {
      try {
        const res = await fetch("/api/settings/inboxes");
        if (res.ok) {
          const data = await res.json();
          setAvailableInboxes(data.inboxes || []);
        }
      } catch (err) {
        console.error(err);
      }
    }
    fetchInboxes();
  }, []);

  const handleSave = async () => {
    if (!name) return;
    setIsSaving(true);

    try {
      const url = isEdit ? `/api/settings/tags/${initialData.id}` : "/api/settings/tags";
      const method = isEdit ? "PUT" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: { 
          "Content-Type": "application/json",
          "x-scope-type": scopeType,
          "x-scope-id": scopeId,
          ...(orgData?.id ? { "x-org-id": orgData.id } : {})
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          color: selectedColor,
          emoji: selectedEmoji,
          parentId,
          showInList,
          inboxIds: selectedInboxIds
        }),
      });

      if (res.ok) {
        router.push("/settings/tags");
        router.refresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleInbox = (id: string) => {
    setSelectedInboxIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const selectedParent = availableTags.find(t => t.id === parentId);

  return (
    <div className="max-w-2xl space-y-10">
      <div className="space-y-8">
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-foreground">
            Name <span className="text-red-500">*</span>
          </Label>
          <Input 
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Urgent, Feedback, Billing"
            className="bg-muted/50 border-border text-foreground h-11 focus:ring-1 focus:ring-indigo-500/50"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-semibold text-foreground">Description</Label>
          <Textarea 
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Add a description for this tag..."
            className="bg-muted/50 border-border text-foreground min-h-[100px] resize-none focus:ring-1 focus:ring-indigo-500/50"
          />
        </div>
      </div>

      <div className="space-y-6">
        <h3 className="text-lg font-bold text-foreground">Style</h3>
        
        <div className="space-y-3">
          <Label className="text-sm font-semibold text-foreground">Color or emoji</Label>
          <p className="text-xs text-muted-foreground">Highlight your tag with helpful visuals</p>
          
          <div className="flex items-center gap-2 mt-2">
            {COLORS.map(color => (
              <button
                key={color}
                onClick={() => {
                  setSelectedColor(color);
                  setSelectedEmoji("");
                }}
                className={cn(
                  "size-6 rounded-full border-2 transition-all flex items-center justify-center",
                  selectedColor === color ? "border-zinc-100 scale-110" : "border-transparent hover:scale-105"
                )}
                style={{ backgroundColor: color === "transparent" ? "rgba(255,255,255,0.1)" : color }}
              >
                {color === "transparent" && selectedColor === color && (
                  <Check className="size-3 text-muted-foreground" />
                )}
              </button>
            ))}
            <div className="w-px h-6 bg-muted mx-2" />
            <button
              onClick={() => {
                // In a real app, this would open an emoji picker
                // For now, let's just toggle a demo emoji
                setSelectedEmoji(selectedEmoji ? "" : "🔥");
                setSelectedColor("transparent");
              }}
              className={cn(
                "size-8 rounded-full bg-muted/50 border border-border flex items-center justify-center transition-all",
                selectedEmoji ? "border-indigo-500 ring-1 ring-indigo-500" : "hover:border-border"
              )}
            >
              <Smile className={cn("size-4", selectedEmoji ? "text-indigo-400" : "text-muted-foreground")} />
            </button>
            {selectedEmoji && (
              <span className="text-xl ml-1">{selectedEmoji}</span>
            )}
          </div>
        </div>

        <div className="space-y-3 pt-4">
          <Label className="text-sm font-semibold text-foreground">Nest tag under</Label>
          <p className="text-xs text-muted-foreground">Organize this tag and its subtags under a parent tag</p>
          
          <Popover open={isTagSelectOpen} onOpenChange={setIsTagSelectOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-between bg-muted/50 border-border text-muted-foreground h-11 hover:bg-muted/50"
              >
                <div className="flex items-center gap-2">
                  <Tag className="size-4 text-muted-foreground" />
                  {selectedParent ? selectedParent.name : "Select tag"}
                </div>
                <ChevronDown className="size-4 text-muted-foreground" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0 bg-popover border-border shadow-2xl" align="start">
              <Command className="bg-transparent">
                <div className="flex items-center border-b border-border px-3">
                  <Search className="mr-2 h-4 w-4 shrink-0 opacity-50 text-muted-foreground" />
                  <CommandInput placeholder="Search tags..." className="h-11 bg-transparent border-none focus:ring-0" />
                </div>
                <CommandList className="max-h-[300px]">
                  <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">No tags found.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      onSelect={() => {
                        setParentId(null);
                        setIsTagSelectOpen(false);
                      }}
                      className="py-3 px-4 hover:bg-muted/50 cursor-pointer text-muted-foreground"
                    >
                      <div className="flex items-center gap-2">
                        <X className="size-4 text-muted-foreground" />
                        <span>None (Top level)</span>
                      </div>
                    </CommandItem>
                    {availableTags.map((tag) => (
                      <CommandItem
                        key={tag.id}
                        onSelect={() => {
                          setParentId(tag.id);
                          setIsTagSelectOpen(false);
                        }}
                        className="py-3 px-4 hover:bg-muted/50 cursor-pointer text-muted-foreground"
                      >
                        <div className="flex items-center gap-3">
                          <div 
                            className="size-3 rounded-full" 
                            style={{ backgroundColor: tag.color || "rgba(255,255,255,0.1)" }}
                          />
                          <span>{tag.name}</span>
                          {tag.id === parentId && <Check className="ml-auto size-4 text-indigo-400" />}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="space-y-6">
        <h3 className="text-lg font-bold text-foreground">Access</h3>
        
        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-sm font-semibold text-foreground">Available in</Label>
            <p className="text-xs text-muted-foreground">This tag will only be available in the selected inboxes. Leave empty for all inboxes.</p>
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-between bg-muted/50 border-border text-muted-foreground h-11 hover:bg-muted/50"
              >
                <div className="flex items-center gap-2">
                  <Inbox className="size-4 text-muted-foreground" />
                  {selectedInboxIds.length === 0 ? "Any inbox" : `${selectedInboxIds.length} inboxes selected`}
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
              <ScrollArea className="h-[200px]">
                <div className="p-2 space-y-1">
                  {availableInboxes.filter(i => i.name.toLowerCase().includes(inboxSearch.toLowerCase())).map(i => (
                    <div 
                      key={i.id}
                      onClick={() => toggleInbox(i.id)}
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

        <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border">
          <div className="space-y-1">
            <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
              Show in conversation list
            </Label>
            <p className="text-xs text-muted-foreground">Anyone with access to the tag will see it in their conversation list</p>
          </div>
          <Switch 
            checked={showInList}
            onCheckedChange={setShowInList}
            className="data-[state=checked]:bg-indigo-600"
          />
        </div>
      </div>

      <div className="flex items-center gap-3 pt-6 border-t border-border">
        <Button 
          variant="outline" 
          onClick={() => router.back()}
          className="bg-transparent border-border text-muted-foreground hover:text-foreground h-11 px-6"
        >
          Cancel
        </Button>
        <Button 
          onClick={handleSave}
          disabled={!name || isSaving}
          className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 h-11 px-10"
        >
          {isSaving ? "Saving..." : isEdit ? "Update tag" : "Create tag"}
        </Button>
      </div>
    </div>
  );
}
