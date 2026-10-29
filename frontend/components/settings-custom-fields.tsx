"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, Database, MoreHorizontal, Copy, Hash, Type, List, Calendar, CheckSquare, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type CustomField = {
  id: string;
  name: string;
  description: string;
  type: string;
  model: string;
  createdAt: string;
};

const MODELS = [
  { id: "contacts", label: "Contacts" },
  { id: "accounts", label: "Accounts" },
  { id: "teammates", label: "Teammates" },
  { id: "inboxes", label: "Inboxes" },
  { id: "conversations", label: "Conversations" },
  { id: "application_objects", label: "Application objects" },
];

export function SettingsCustomFields() {
  const router = useRouter();
  const { data: orgData } = authClient.useActiveOrganization();
  const [fields, setFields] = useState<CustomField[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("contacts");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadFields = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/settings/custom-fields");
      const data = await response.json();
      setFields(data.custom_fields || []);
    } catch (error) {
      console.error("Failed to load custom fields", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadFields();
  }, [loadFields]);

  const filteredFields = useMemo(() => {
    return fields.filter(f => 
      f.model === activeTab && 
      (f.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
       (f.description && f.description.toLowerCase().includes(searchQuery.toLowerCase())))
    );
  }, [fields, activeTab, searchQuery]);

  const activeModelLabel = MODELS.find(m => m.id === activeTab)?.label.toLowerCase().slice(0, -1) || "field";
  const createButtonText = `Create ${activeModelLabel} custom field`;

  const handleDelete = async (id: string) => {
    if (!id || id === "undefined") {
      console.error("Attempted to delete undefined ID");
      return;
    }
    
    try {
      const response = await fetch(`/api/settings/custom-fields/${id}`, { method: "DELETE" });
      if (response.ok) {
        toast.success("Field deleted");
        loadFields();
      } else {
        toast.error("Failed to delete field");
      }
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("An error occurred while deleting");
    }
  };

  const handleDeleteSelected = async () => {
    const idsToDelete = selectedIds.filter(id => id && id !== "undefined");
    if (idsToDelete.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${idsToDelete.length} custom field(s)?`)) return;

    setIsDeleting(true);
    try {
      await Promise.all(idsToDelete.map(id => 
        fetch(`/api/settings/custom-fields/${id}`, { method: "DELETE" })
      ));
      toast.success("Custom fields deleted successfully");
      setSelectedIds([]);
      loadFields();
    } catch (error) {
      toast.error("Failed to delete some fields");
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredFields.length && filteredFields.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredFields.map(f => f.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="size-4 bg-indigo-500 rounded-sm shadow-[0_0_10px_rgba(99,102,241,0.3)]" />
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{orgData?.name || "patterns247"}</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Custom fields</h1>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setSelectedIds([]); }} className="w-full">
        <TabsList className="bg-transparent border-b border-border w-full justify-start rounded-none h-auto p-0 gap-10">
          {MODELS.map((model) => (
            <TabsTrigger
              key={model.id}
              value={model.id}
              className="bg-transparent border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none px-0 py-4 text-sm font-semibold text-muted-foreground data-[state=active]:text-foreground transition-all"
            >
              {model.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative flex-1 max-w-md group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="Search"
              className="pl-9 bg-muted/30 border-border h-10 text-sm focus-visible:ring-primary"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {selectedIds.length > 0 && (
            <Button 
              variant="destructive" 
              size="sm" 
              className="gap-2 animate-in fade-in slide-in-from-left-2"
              onClick={handleDeleteSelected}
              disabled={isDeleting}
            >
              <Trash2 className="size-4" />
              Delete {selectedIds.length}
            </Button>
          )}
        </div>
        <Button 
          className="bg-primary text-primary-foreground h-10 px-6 font-semibold shadow-lg shadow-primary/10 transition-all active:scale-[0.98]"
          onClick={() => router.push(`/settings/custom-fields/create?model=${activeTab}`)}
        >
          {createButtonText}
        </Button>
      </div>

      <div className="mt-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="mt-4">Loading custom fields...</p>
          </div>
        ) : filteredFields.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 border border-dashed border-border rounded-xl bg-card/30">
            <div className="size-16 bg-muted/50 rounded-2xl flex items-center justify-center mb-6">
              <Database className="size-8 text-muted-foreground/50" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">No custom fields</h3>
            <p className="text-muted-foreground mb-8">Create a custom field to get started</p>
            <Button 
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
              onClick={() => router.push(`/settings/custom-fields/create?model=${activeTab}`)}
            >
              {createButtonText}
            </Button>
          </div>
        ) : (
          <div className="border border-border rounded-xl overflow-hidden bg-card shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 text-muted-foreground font-medium border-b border-border uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-4 py-4 w-10 text-center">
                    <Checkbox 
                      checked={selectedIds.length === filteredFields.length && filteredFields.length > 0}
                      onCheckedChange={toggleSelectAll}
                      className="border-muted-foreground/50"
                    />
                  </th>
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4 text-right">Date Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredFields.map((field) => (
                  <tr key={field.id} className={cn(
                    "hover:bg-muted/20 transition-colors group",
                    selectedIds.includes(field.id) && "bg-primary/5 hover:bg-primary/10"
                  )}>
                    <td className="px-4 py-5 text-center">
                      <Checkbox 
                        checked={selectedIds.includes(field.id)}
                        onCheckedChange={() => toggleSelect(field.id)}
                        className="border-muted-foreground/50"
                      />
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-4">
                        <div className="size-10 rounded-lg bg-muted/50 flex items-center justify-center text-muted-foreground/60 border border-border/50">
                          {field.type === "number" ? <Hash className="size-5" /> : 
                           field.type === "dropdown" ? <List className="size-5" /> :
                           field.type === "date" ? <Calendar className="size-5" /> :
                           field.type === "boolean" ? <CheckSquare className="size-5" /> :
                           <Type className="size-5" />}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-foreground text-base leading-none mb-1">{field.name}</span>
                          <span className="text-[13px] text-muted-foreground">{field.description || field.name}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground font-medium capitalize">{field.type}</span>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8 opacity-0 group-hover:opacity-100 transition-opacity">
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56 bg-card border-border shadow-xl">
                            <DropdownMenuItem 
                              className="gap-2 cursor-pointer focus:bg-muted text-destructive focus:text-destructive"
                              onClick={() => {
                                if (confirm("Are you sure you want to delete this field?")) {
                                  handleDelete(field.id);
                                }
                              }}
                            >
                              <Trash2 className="size-4" />
                              <span>Delete field</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="gap-2 cursor-pointer focus:bg-muted"
                              onClick={() => {
                                navigator.clipboard.writeText(field.id);
                                toast.success("Custom field ID copied to clipboard");
                              }}
                            >
                              <Copy className="size-4" />
                              <span>Copy custom field ID</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right text-muted-foreground">
                      {new Date(field.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric"
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
