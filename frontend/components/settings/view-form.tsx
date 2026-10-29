"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, Smile, X, Search, Users, Inbox, Tag as TagIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

const COLORS = [
  { value: "transparent", label: "None" },
  { value: "#be185d", label: "Pink" },
  { value: "#b91c1c", label: "Red" },
  { value: "#c2410c", label: "Orange" },
  { value: "#a16207", label: "Yellow" },
  { value: "#15803d", label: "Green" },
  { value: "#0f766e", label: "Teal" },
  { value: "#0369a1", label: "Sky" },
  { value: "#1d4ed8", label: "Blue" },
  { value: "#4338ca", label: "Indigo" },
  { value: "#6d28d9", label: "Violet" },
];

type ViewFormData = {
  name: string;
  color: string;
  emoji: string;
  inboxIds: string[];
  includeTags: string[];
  excludeTags: string[];
  assigneeIds: string[];
  teammateIds: string[];
};

type ViewFormProps = {
  initialData?: ViewFormData & { id?: string };
  onSubmit: (data: ViewFormData) => Promise<void>;
  isEdit?: boolean;
  onDelete?: () => Promise<void>;
};

export function ViewForm({ initialData, onSubmit, isEdit, onDelete }: ViewFormProps) {
  const router = useRouter();
  const { data: orgData } = authClient.useActiveOrganization();

  const [name, setName] = useState(initialData?.name || "");
  const [color, setColor] = useState(initialData?.color || "transparent");
  const [emoji, setEmoji] = useState(initialData?.emoji || "");
  const [inboxIds, setInboxIds] = useState<string[]>(initialData?.inboxIds || []);
  const [includeTags, setIncludeTags] = useState<string[]>(initialData?.includeTags || []);
  const [excludeTags, setExcludeTags] = useState<string[]>(initialData?.excludeTags || []);
  const [assigneeIds, setAssigneeIds] = useState<string[]>(initialData?.assigneeIds || []);
  const [teammateIds, setTeammateIds] = useState<string[]>(initialData?.teammateIds || []);

  const [availableInboxes, setAvailableInboxes] = useState<any[]>([]);
  const [availableTags, setAvailableTags] = useState<any[]>([]);
  const [availableMembers, setAvailableMembers] = useState<any[]>([]);

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Open states for dropdowns
  const [inboxOpen, setInboxOpen] = useState(false);
  const [includeTagOpen, setIncludeTagOpen] = useState(false);
  const [excludeTagOpen, setExcludeTagOpen] = useState(false);
  const [assigneeOpen, setAssigneeOpen] = useState(false);
  const [teammateOpen, setTeammateOpen] = useState(false);

  useEffect(() => {
    async function loadData() {
      if (!orgData?.id) return;
      try {
        const [inboxRes, tagRes, memberRes] = await Promise.all([
          fetch("/api/settings/inboxes"),
          fetch("/api/settings/tags", { headers: { "x-org-id": orgData.id } }),
          fetch(`/api/settings/users`, { headers: { "x-org-id": orgData.id } }),
        ]);
        if (inboxRes.ok) {
          const d = await inboxRes.json();
          setAvailableInboxes(d.inboxes || []);
        }
        if (tagRes.ok) setAvailableTags(await tagRes.json());
        if (memberRes.ok) {
          const d = await memberRes.json();
          // The API returns either { users: [...] } or { members: [...] }
          setAvailableMembers(d.users || d.members || (Array.isArray(d) ? d : []));
        }
      } catch (err) {
        console.error("Failed to load form data:", err);
      }
    }
    loadData();
  }, [orgData?.id]);

  const toggleItem = (list: string[], setList: (v: string[]) => void, id: string) => {
    setList(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  };

  const handleSave = async () => {
    if (!name.trim()) { setError("Name is required."); return; }
    if (inboxIds.length === 0) { setError("Please select at least one inbox."); return; }
    setError(null);
    setIsSaving(true);
    try {
      await onSubmit({ name: name.trim(), color, emoji, inboxIds, includeTags, excludeTags, assigneeIds, teammateIds });
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    setIsDeleting(true);
    try { await onDelete(); } finally { setIsDeleting(false); }
  };

  // Helpers for display
  const selectedInboxNames = availableInboxes.filter((i) => inboxIds.includes(i.id)).map((i) => i.name);
  const memberById = Object.fromEntries(
    Array.isArray(availableMembers) 
      ? availableMembers.map((m) => [m.id || m.userId, m]) 
      : []
  );

  return (
    <div className="max-w-2xl space-y-0">
      {/* Name */}
      <section className="space-y-4 pb-8">
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-foreground">
            Name <span className="text-red-500">*</span>
          </Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter name"
            className="bg-muted/50 border-border text-foreground h-11 focus:ring-1 focus:ring-indigo-500/50"
          />
        </div>

        {/* Color or emoji */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-foreground">Color or emoji</Label>
          <p className="text-xs text-muted-foreground">Highlight your view with helpful visuals</p>
          <div className="flex items-center gap-2 mt-2">
            {COLORS.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => { setColor(c.value); setEmoji(""); }}
                className={cn(
                  "size-7 rounded-full border-2 flex items-center justify-center transition-all",
                  color === c.value && !emoji ? "border-white scale-110 ring-2 ring-white/20" : "border-transparent hover:scale-105"
                )}
                style={{ backgroundColor: c.value === "transparent" ? "rgba(255,255,255,0.08)" : c.value }}
                title={c.label}
              >
                {c.value === "transparent" && color === "transparent" && !emoji && (
                  <Check className="size-3 text-muted-foreground" />
                )}
              </button>
            ))}
            <div className="w-px h-6 bg-border mx-1" />
            <button
              type="button"
              onClick={() => { setEmoji(emoji ? "" : "✨"); setColor("transparent"); }}
              className={cn(
                "size-8 rounded-full border flex items-center justify-center text-sm transition-all",
                emoji ? "border-indigo-500 ring-2 ring-indigo-500/30 bg-indigo-500/10" : "border-border bg-muted/30 hover:border-border/80"
              )}
            >
              {emoji || <Smile className="size-4 text-muted-foreground" />}
            </button>
          </div>
        </div>
      </section>

      <Separator className="bg-border" />

      {/* Inboxes and filters */}
      <section className="space-y-6 py-8">
        <h2 className="text-lg font-bold text-foreground">Inboxes and filters</h2>

        {/* Inbox multi-select */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-foreground">
            Show conversations in any of these inboxes <span className="text-red-500">*</span>
          </Label>
          <Popover open={inboxOpen} onOpenChange={setInboxOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full max-w-sm justify-between bg-muted/50 border-border text-foreground h-10 hover:bg-muted/60">
                <div className="flex items-center gap-2 overflow-hidden">
                  {inboxIds.length === 0 ? (
                    <span className="text-muted-foreground text-sm">Select inboxes</span>
                  ) : (
                    <div className="flex items-center gap-1.5 flex-wrap max-w-[240px]">
                      {selectedInboxNames.slice(0, 2).map((n) => (
                        <Badge key={n} variant="secondary" className="text-[11px] px-1.5 py-0 rounded-md">{n}</Badge>
                      ))}
                      {inboxIds.length > 2 && (
                        <Badge variant="secondary" className="text-[11px] px-1.5 py-0 rounded-md">+{inboxIds.length - 2}</Badge>
                      )}
                    </div>
                  )}
                </div>
                <ChevronDown className="size-4 text-muted-foreground shrink-0" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0 bg-popover border-border" align="start">
              <Command className="bg-transparent">
                <CommandInput placeholder="Search inboxes..." className="h-9 border-none" />
                <CommandList>
                  <CommandEmpty>No inboxes found.</CommandEmpty>
                  <CommandGroup>
                    {availableInboxes.map((inbox) => (
                      <CommandItem key={inbox.id} onSelect={() => toggleItem(inboxIds, setInboxIds, inbox.id)} className="flex items-center gap-2 cursor-pointer">
                        <div className={cn("size-4 rounded border flex items-center justify-center transition-colors", inboxIds.includes(inbox.id) ? "bg-indigo-600 border-indigo-600" : "border-border")}>
                          {inboxIds.includes(inbox.id) && <Check className="size-3 text-white" />}
                        </div>
                        <Inbox className="size-3.5 text-muted-foreground" />
                        <span className="text-sm">{inbox.name}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* Include tags */}
        <TagMultiSelect
          label="Filtered by any of these tags"
          placeholder="Select shared tags"
          tags={availableTags}
          selected={includeTags}
          onChange={setIncludeTags}
          open={includeTagOpen}
          setOpen={setIncludeTagOpen}
          accent="teal"
        />

        {/* Exclude tags */}
        <TagMultiSelect
          label="Excluding all of these tags"
          placeholder="Select shared tags"
          tags={availableTags}
          selected={excludeTags}
          onChange={setExcludeTags}
          open={excludeTagOpen}
          setOpen={setExcludeTagOpen}
          accent="red"
        />

        {/* Assignees */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-foreground">Filtering by any of these assignees</Label>
          <Popover open={assigneeOpen} onOpenChange={setAssigneeOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full max-w-sm justify-between bg-muted/50 border-border text-foreground h-10 hover:bg-muted/60">
                <div className="flex items-center gap-2 overflow-hidden">
                  {assigneeIds.length === 0 ? (
                    <span className="text-muted-foreground text-sm">Select teammates</span>
                  ) : (
                    <span className="text-sm">{assigneeIds.length} teammate{assigneeIds.length !== 1 ? "s" : ""} selected</span>
                  )}
                </div>
                <ChevronDown className="size-4 text-muted-foreground shrink-0" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0 bg-popover border-border" align="start">
              <Command className="bg-transparent">
                <CommandInput placeholder="Search teammates..." className="h-9 border-none" />
                <CommandList>
                  <CommandEmpty>No teammates found.</CommandEmpty>
                  <CommandGroup>
                    {Array.isArray(availableMembers) && availableMembers.map((member) => {
                      const mId = member.id || member.userId;
                      const mName = member.name || member.user?.name || member.email || member.user?.email || "Unknown";
                      return (
                        <CommandItem key={mId} onSelect={() => toggleItem(assigneeIds, setAssigneeIds, mId)} className="flex items-center gap-2 cursor-pointer">
                          <div className={cn("size-4 rounded border flex items-center justify-center transition-colors", assigneeIds.includes(mId) ? "bg-indigo-600 border-indigo-600" : "border-border")}>
                            {assigneeIds.includes(mId) && <Check className="size-3 text-white" />}
                          </div>
                          <div className="size-5 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-[9px] text-white font-bold shrink-0">
                            {mName.charAt(0).toUpperCase()}
                          </div>
                          <div className="overflow-hidden">
                            <div className="text-sm truncate">{mName}</div>
                          </div>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      </section>

      <Separator className="bg-border" />

      {/* Teammates section */}
      <section className="space-y-4 py-8">
        <h2 className="text-lg font-bold text-foreground">Teammates</h2>
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-foreground">
            Show this view in teammate sidebars <span className="text-red-500">*</span>
          </Label>
          <Popover open={teammateOpen} onOpenChange={setTeammateOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full max-w-sm justify-between bg-muted/50 border-border text-foreground h-10 hover:bg-muted/60">
                <div className="flex items-center gap-2 overflow-hidden">
                  {teammateIds.length === 0 ? (
                    <span className="text-muted-foreground text-sm">Select teammates</span>
                  ) : (
                    <span className="text-sm">{teammateIds.length} teammate{teammateIds.length !== 1 ? "s" : ""} selected</span>
                  )}
                </div>
                <ChevronDown className="size-4 text-muted-foreground shrink-0" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0 bg-popover border-border" align="start">
              <Command className="bg-transparent">
                <CommandInput placeholder="Search teammates..." className="h-9 border-none" />
                <CommandList>
                  <CommandEmpty>No teammates found.</CommandEmpty>
                  <CommandGroup>
                    {Array.isArray(availableMembers) && availableMembers.map((member) => {
                      const mId = member.id || member.userId;
                      const mName = member.name || member.user?.name || member.email || member.user?.email || "Unknown";
                      return (
                        <CommandItem key={mId} onSelect={() => toggleItem(teammateIds, setTeammateIds, mId)} className="flex items-center gap-2 cursor-pointer">
                          <div className={cn("size-4 rounded border flex items-center justify-center transition-colors", teammateIds.includes(mId) ? "bg-indigo-600 border-indigo-600" : "border-border")}>
                            {teammateIds.includes(mId) && <Check className="size-3 text-white" />}
                          </div>
                          <div className="size-5 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-[9px] text-white font-bold shrink-0">
                            {mName.charAt(0).toUpperCase()}
                          </div>
                          <div className="text-sm truncate">{mName}</div>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          <p className="text-xs text-muted-foreground">
            Can&apos;t find a teammate? Make sure they have access to all the inboxes used in this view.
          </p>
        </div>
      </section>

      <Separator className="bg-border" />

      {/* Actions */}
      <div className="flex items-center justify-between pt-6">
        <div className="flex items-center gap-3">
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 h-10 px-8"
          >
            {isSaving && <Loader2 className="size-4 mr-2 animate-spin" />}
            {isSaving ? "Saving..." : isEdit ? "Save changes" : "Create"}
          </Button>
          <Button variant="outline" onClick={() => router.back()} className="border-border h-10 px-6">
            Cancel
          </Button>
          {error && <span className="text-sm text-red-400">{error}</span>}
        </div>
        {isEdit && onDelete && (
          <Button
            variant="ghost"
            onClick={handleDelete}
            disabled={isDeleting}
            className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
          >
            {isDeleting ? "Deleting..." : "Delete view"}
          </Button>
        )}
      </div>
    </div>
  );
}

// Reusable tag multi-select component
function TagMultiSelect({
  label, placeholder, tags, selected, onChange, open, setOpen, accent,
}: {
  label: string;
  placeholder: string;
  tags: any[];
  selected: string[];
  onChange: (v: string[]) => void;
  open: boolean;
  setOpen: (v: boolean) => void;
  accent: "teal" | "red";
}) {
  const toggle = (name: string) => {
    onChange(selected.includes(name) ? selected.filter((x) => x !== name) : [...selected, name]);
  };
  const accentClass = accent === "teal"
    ? "border-teal-500/30 text-teal-400 bg-teal-500/10"
    : "border-red-500/30 text-red-400 bg-red-500/10";

  return (
    <div className="space-y-2">
      <Label className="text-sm font-semibold text-foreground">{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-full max-w-sm justify-between bg-muted/50 border-border text-foreground h-10 hover:bg-muted/60">
            <div className="flex items-center gap-1.5 overflow-hidden flex-1">
              {selected.length === 0 ? (
                <span className="text-muted-foreground text-sm">{placeholder}</span>
              ) : (
                <div className="flex items-center gap-1 flex-wrap">
                  {selected.slice(0, 3).map((t) => (
                    <Badge key={t} variant="outline" className={cn("text-[10px] px-1.5 py-0 rounded-md", accentClass)}>{t}</Badge>
                  ))}
                  {selected.length > 3 && (
                    <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 rounded-md", accentClass)}>+{selected.length - 3}</Badge>
                  )}
                </div>
              )}
            </div>
            <ChevronDown className="size-4 text-muted-foreground shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0 bg-popover border-border" align="start">
          <Command className="bg-transparent">
            <CommandInput placeholder="Search tags..." className="h-9 border-none" />
            <CommandList>
              <CommandEmpty>No tags found.</CommandEmpty>
              <CommandGroup>
                {tags.map((tag) => (
                  <CommandItem key={tag.id} onSelect={() => toggle(tag.name)} className="flex items-center gap-2 cursor-pointer">
                    <div className={cn("size-4 rounded border flex items-center justify-center transition-colors", selected.includes(tag.name) ? "bg-indigo-600 border-indigo-600" : "border-border")}>
                      {selected.includes(tag.name) && <Check className="size-3 text-white" />}
                    </div>
                    {tag.emoji ? <span className="text-sm">{tag.emoji}</span> : <TagIcon className="size-3.5 text-muted-foreground" />}
                    <span className="text-sm">{tag.name}</span>
                    {tag.color && (
                      <div className="ml-auto size-2.5 rounded-full shrink-0" style={{ backgroundColor: tag.color }} />
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
