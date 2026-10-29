"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Workflow, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

type Trigger = { id: string; type: string };
type Condition = { id: string; field: string; operator?: string; value?: string };
type ActionObj = { id: string; action: string; value?: string };

type Teammate = {
  id: string;
  name: string;
  email: string;
};

import { useRouter } from "next/navigation";
import { useWorkspaceStore } from "@/context/workspace-store";

export function RuleBuilder() {
  const router = useRouter();
  const { scopeType, scopeId } = useWorkspaceStore();
  const [ruleName, setRuleName] = useState("");
  const [triggers, setTriggers] = useState<Trigger[]>([]);
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [actions, setActions] = useState<ActionObj[]>([]);
  const [stopProcessing, setStopProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [teammates, setTeammates] = useState<Teammate[]>([]);
  const [isLoadingTeammates, setIsLoadingTeammates] = useState(true);

  const [tags, setTags] = useState<{ id: string; name: string }[]>([]);
  const [isLoadingTags, setIsLoadingTags] = useState(true);

  useEffect(() => {
    const loadTeammates = async () => {
      try {
        const res = await fetch("/api/admin/users");
        if (res.ok) {
          const data = await res.json();
          // Map to standard format
          const list = (data.users || []).map((u: any) => ({
            id: u.id,
            name: u.name || u.email,
            email: u.email
          }));
          setTeammates(list);
        }
      } catch (err) {
        console.error("Failed to load teammates for rules:", err);
      } finally {
        setIsLoadingTeammates(false);
      }
    };

    const loadTags = async () => {
      try {
        const res = await fetch("/api/tags", {
          headers: {
            "x-scope-type": scopeType,
            "x-scope-id": scopeId || "",
          }
        });
        if (res.ok) {
          const data = await res.json();
          setTags(data);
        }
      } catch (err) {
        console.error("Failed to load tags for rules:", err);
      } finally {
        setIsLoadingTags(false);
      }
    };

    loadTeammates();
    loadTags();
  }, [scopeType, scopeId]);

  const addTrigger = () => {
    setTriggers([...triggers, { id: Date.now().toString(), type: "" }]);
  };

  const addCondition = () => {
    setConditions([...conditions, { id: Date.now().toString(), field: "" }]);
  };

  const addAction = () => {
    setActions([...actions, { id: Date.now().toString(), action: "" }]);
  };

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      const response = await fetch("/api/rules", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-scope-type": scopeType,
          "x-scope-id": scopeId || "",
        },
        body: JSON.stringify({
          name: ruleName,
          triggers,
          conditions,
          actions,
          stopProcessing
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to save rule");
      }

      router.push("/settings/rules");
      router.refresh();
    } catch (error: any) {
      console.error("Save error:", error);
      alert(`Error saving rule: ${error.message}`);
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-10 w-full animate-in fade-in duration-500 min-h-full items-center justify-start">
      <div className="w-full max-w-4xl rounded-2xl border border-border bg-background p-8 backdrop-blur-sm shadow-2xl flex flex-col mt-4">
        
        {/* Header */}
        <div className="mb-8 pb-6 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-full shrink-0">
              <Link href="/settings/rules">
                <ArrowLeft className="size-5" />
              </Link>
            </Button>
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                <Workflow className="size-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">Create Rule</h1>
                <p className="text-sm text-muted-foreground mt-0.5">Automate actions based on specific conditions.</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 sm:ml-auto">
            <Button asChild variant="outline" className="h-10 px-5 bg-muted/50 border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
              <Link href="/settings/rules">Cancel</Link>
            </Button>
            <Button onClick={onSave} disabled={isSaving || !ruleName.trim()} className="h-10 px-6 bg-primary text-primary-foreground font-semibold shadow-lg shadow-primary/20 transition-all active:scale-[0.98]">
              {isSaving ? "Saving..." : "Save Rule"}
            </Button>
          </div>
        </div>

        <div className="w-full space-y-10">
          {/* Rule Name */}
          <div className="space-y-2">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Name of rule</label>
            <Input 
              value={ruleName} 
              onChange={(e) => setRuleName(e.target.value)} 
              placeholder="e.g. Route high priority emails to Support" 
              className="h-12 w-full sm:max-w-md bg-muted/50 border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-primary/20 text-base"
            />
          </div>

          {/* When Section */}
          <div className="space-y-3">
            <h2 className="text-lg font-bold tracking-tight text-foreground">When</h2>
            {triggers.map((trigger, i) => (
              <div key={trigger.id} className="rounded-xl border border-border bg-muted/30 p-4 flex flex-wrap sm:flex-nowrap items-center gap-3 transition-all hover:border-border">
                <Select 
                  value={trigger.type} 
                  onValueChange={(val) => {
                    const newTriggers = [...triggers];
                    newTriggers[i].type = val;
                    setTriggers(newTriggers);
                  }}
                >
                  <SelectTrigger className="w-full sm:w-[350px] h-11 bg-card border-border text-foreground focus:ring-primary/20">
                    <SelectValue placeholder="Select trigger" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border text-foreground">
                    <SelectGroup>
                      <SelectLabel className="text-muted-foreground">Message</SelectLabel>
                      <SelectItem value="inbound_received" className="focus:bg-muted">Inbound message is received</SelectItem>
                      <SelectItem value="outbound_sent" className="focus:bg-muted">Outbound message is sent</SelectItem>
                      <SelectItem value="delivery_failed" className="focus:bg-muted">Message delivery fails</SelectItem>
                    </SelectGroup>
                    <SelectGroup>
                      <SelectLabel className="text-muted-foreground">Conversation</SelectLabel>
                      <SelectItem value="conversation_moved" className="focus:bg-muted">Conversation is moved</SelectItem>
                      <SelectItem value="internal_discussion" className="focus:bg-muted">New internal discussion is created</SelectItem>
                    </SelectGroup>
                    <SelectGroup>
                      <SelectLabel className="text-primary font-semibold">Manual</SelectLabel>
                      <SelectItem value="manual_macro" className="focus:bg-muted text-primary font-medium">Triggered manually (Macro)</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            ))}
            
            <Button variant="ghost" onClick={addTrigger} className="h-10 text-primary hover:text-primary hover:bg-primary/10 -ml-2 font-medium px-4">
              <Plus className="size-4 mr-2" />
              Add trigger
            </Button>
          </div>

          {/* If Section */}
          <div className="space-y-3">
            <h2 className="text-lg font-bold tracking-tight text-foreground">If</h2>
            {conditions.map((condition, i) => (
              <div key={condition.id} className="rounded-xl border border-border bg-muted/30 p-4 flex flex-wrap sm:flex-nowrap items-center gap-3 transition-all hover:border-border">
                <Select 
                  value={condition.field} 
                  onValueChange={(val) => {
                    const newConditions = [...conditions];
                    newConditions[i].field = val;
                    setConditions(newConditions);
                  }}
                >
                  <SelectTrigger className="w-full sm:w-[300px] shrink-0 h-11 bg-card border-border text-foreground focus:ring-primary/20">
                    <SelectValue placeholder="Select condition" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border text-foreground">
                    <SelectGroup>
                      <SelectLabel className="text-muted-foreground">Status</SelectLabel>
                      <SelectItem value="status_open" className="focus:bg-muted">Conversation is currently open</SelectItem>
                      <SelectItem value="status_archived" className="focus:bg-muted">Conversation is currently archived</SelectItem>
                      <SelectItem value="status_snoozed" className="focus:bg-muted">Conversation is currently snoozed</SelectItem>
                    </SelectGroup>
                    <SelectGroup>
                      <SelectLabel className="text-muted-foreground">Inbox</SelectLabel>
                      <SelectItem value="in_inbox" className="focus:bg-muted">Conversation is in inboxes</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>

                {condition.field === "in_inbox" && (
                  <Select defaultValue="any">
                    <SelectTrigger className="w-full sm:min-w-[200px] h-11 bg-card border-border text-foreground focus:ring-primary/20">
                      <SelectValue placeholder="Select inbox" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border text-foreground">
                      <SelectItem value="any" className="focus:bg-muted">Any Inbox</SelectItem>
                      <SelectItem value="support" className="focus:bg-muted">Support</SelectItem>
                      <SelectItem value="sales" className="focus:bg-muted">Sales</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            ))}

            <Button variant="ghost" onClick={addCondition} className="h-10 text-primary hover:text-primary hover:bg-primary/10 -ml-2 font-medium px-4">
              <Plus className="size-4 mr-2" />
              Add condition
            </Button>
          </div>

          {/* Then Section */}
          <div className="space-y-3">
            <h2 className="text-lg font-bold tracking-tight text-foreground">Then</h2>
            {actions.map((action, i) => (
              <div key={action.id} className="rounded-xl border border-border bg-muted/30 p-4 flex flex-wrap sm:flex-nowrap items-center gap-3 transition-all hover:border-border">
                <Select 
                  value={action.action} 
                  onValueChange={(val) => {
                    const newActions = [...actions];
                    newActions[i].action = val;
                    setActions(newActions);
                  }}
                >
                  <SelectTrigger className="w-full sm:w-[300px] shrink-0 h-11 bg-card border-border text-foreground focus:ring-primary/20">
                    <SelectValue placeholder="Select action" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border text-foreground">
                    <SelectItem value="assign" className="focus:bg-muted">Assign to teammate</SelectItem>
                    <SelectItem value="add_tag" className="focus:bg-muted">Add tag</SelectItem>
                    <SelectItem value="archive" className="focus:bg-muted">Archive conversation</SelectItem>
                    <SelectItem value="snooze" className="focus:bg-muted">Snooze</SelectItem>
                  </SelectContent>
                </Select>

                {action.action === "assign" && (
                  <Select 
                    value={action.value} 
                    onValueChange={(val) => {
                      const newActions = [...actions];
                      newActions[i].value = val;
                      setActions(newActions);
                    }}
                  >
                    <SelectTrigger className="w-full sm:min-w-[200px] h-11 bg-card border-border text-foreground focus:ring-primary/20">
                      <SelectValue placeholder={isLoadingTeammates ? "Loading team..." : "Select teammate"} />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border text-foreground">
                      <SelectItem value="round_robin" className="focus:bg-muted font-semibold text-primary">Round Robin</SelectItem>
                      {teammates.map((t) => (
                        <SelectItem key={t.id} value={t.id} className="focus:bg-muted">
                          {t.name}
                        </SelectItem>
                      ))}
                      {teammates.length === 0 && !isLoadingTeammates && (
                        <div className="p-2 text-xs text-muted-foreground text-center">No teammates found</div>
                      )}
                    </SelectContent>
                  </Select>
                )}

                {action.action === "add_tag" && (
                  <Select 
                    value={action.value} 
                    onValueChange={(val) => {
                      const newActions = [...actions];
                      newActions[i].value = val;
                      setActions(newActions);
                    }}
                  >
                    <SelectTrigger className="w-full sm:min-w-[200px] h-11 bg-card border-border text-foreground focus:ring-primary/20">
                      <SelectValue placeholder={isLoadingTags ? "Loading tags..." : "Select tag"} />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border text-foreground">
                      {tags.map((t) => (
                        <SelectItem key={t.id} value={t.id} className="focus:bg-muted">
                          {t.name}
                        </SelectItem>
                      ))}
                      {tags.length === 0 && !isLoadingTags && (
                        <div className="p-2 text-xs text-muted-foreground text-center">No tags found</div>
                      )}
                    </SelectContent>
                  </Select>
                )}
              </div>
            ))}

            <Button variant="ghost" onClick={addAction} className="h-10 text-primary hover:text-primary hover:bg-primary/10 -ml-2 font-medium px-4">
              <Plus className="size-4 mr-2" />
              Add action
            </Button>
          </div>

          {/* Footer Options */}
          <div className="pt-8 border-t border-border mt-10">
             <label className="inline-flex items-center gap-3 text-sm font-medium cursor-pointer text-muted-foreground hover:text-foreground transition-colors group">
                <Checkbox 
                  checked={stopProcessing} 
                  onCheckedChange={(c) => setStopProcessing(c === true)} 
                  className="border-border data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                />
                Stop processing other rules
             </label>
          </div>
        </div>
      </div>
    </div>
  );
}
