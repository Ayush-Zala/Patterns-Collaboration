"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Workflow, Trash2 } from "lucide-react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { useWorkspaceStore } from "@/context/workspace-store";

type Rule = {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
};

export function SettingsRules() {
  const { scopeType, scopeId } = useWorkspaceStore();
  const [rules, setRules] = useState<Rule[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadRules = async () => {
    try {
      const res = await fetch("/api/rules", {
        headers: {
          "x-scope-type": scopeType,
          "x-scope-id": scopeId || "",
        }
      });
      if (res.ok) {
        const data = await res.json();
        setRules(data.rules || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRules();
  }, [scopeType, scopeId]);

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/rules/${id}`, { method: "DELETE" });
      setRules((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const getScopeColor = () => {
    switch (scopeType) {
      case "company": return "bg-indigo-500 shadow-indigo-500/30";
      case "organization": return "bg-emerald-500 shadow-emerald-500/30";
      case "individual": return "bg-blue-500 shadow-blue-500/30";
      default: return "bg-emerald-500 shadow-emerald-500/30";
    }
  };

  const getScopeLabel = () => {
    switch (scopeType) {
      case "company": return "Company Automation";
      case "organization": return "Org Automation";
      case "individual": return "Personal Automation";
      default: return "Automation";
    }
  };

  return (
    <div className="flex flex-col gap-6 p-10 w-full animate-in fade-in duration-500 min-h-full">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className={cn("size-4 rounded-sm shadow-sm", getScopeColor())} />
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{getScopeLabel()}</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Rules</h1>
        </div>
        <div className="flex items-center gap-3">
          <Button asChild className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all active:scale-[0.98]">
            <Link href="/settings/rules/new">
              <Plus className="size-4" />
              Create Rule
            </Link>
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-background p-6 backdrop-blur-sm shadow-2xl flex flex-col min-h-0 mt-4">
        <div className="mb-6 pb-6 border-b border-border">
          <h2 className="text-xl font-bold text-foreground tracking-tight">Workflow Rules</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Automate your workflows by automatically routing, tagging, or responding to messages.
          </p>
        </div>

        <div className="overflow-y-auto pr-2 pb-4">
          {isLoading ? (
            <div className="p-12 text-center text-sm text-muted-foreground font-medium">Loading rules...</div>
          ) : rules.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-background text-center p-6">
              <Workflow className="size-10 text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground font-medium">No rules configured yet</p>
              <p className="text-xs text-muted-foreground mt-1 mb-4">Create a rule to automate your inbox.</p>
              <Button asChild variant="outline" className="bg-muted/50 border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                <Link href="/settings/rules/new">Create Rule</Link>
              </Button>
            </div>
          ) : (
            <div className="flex flex-col border border-border rounded-xl overflow-hidden bg-muted/30">
              <div className="grid grid-cols-[1fr_120px_160px_60px] gap-4 bg-muted/50 px-6 py-3 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <p>Rule Name</p>
                <p>Status</p>
                <p>Created</p>
                <p className="text-right">Actions</p>
              </div>
              <ul className="divide-y divide-zinc-800/50">
                {rules.map((rule) => (
                  <li key={rule.id} className="grid grid-cols-[1fr_120px_160px_60px] items-center gap-4 px-6 py-4 hover:bg-primary/[0.03] transition-colors group">
                    <div>
                      <p className="font-bold text-foreground group-hover:text-foreground transition-colors">{rule.name}</p>
                    </div>
                    <div>
                      <span className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-bold uppercase tracking-wider",
                        rule.isActive ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
                      )}>
                        <span className={cn("size-1.5 rounded-full", rule.isActive ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" : "bg-amber-500")} />
                        {rule.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="text-muted-foreground text-xs font-medium">
                      {format(new Date(rule.createdAt), "MMM d, yyyy")}
                    </div>
                    <div className="text-right flex items-center justify-end">
                      <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:bg-red-500/10 hover:text-red-400 transition-colors" onClick={() => handleDelete(rule.id)}>
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
