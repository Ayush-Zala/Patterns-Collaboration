"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import Link from "next/link";
import { ScopeBreadcrumb } from "@/components/settings/scope-breadcrumb";

const COLORS = [
  "#9ca3af", "#d946ef", "#ef4444", "#f97316", "#eab308", 
  "#22c55e", "#06b6d4", "#6366f1", "#8b5cf6"
];

export default function EditWorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = require("react").use(params) as { id: string };
  const id = resolvedParams.id;
  const [name, setName] = useState("");
  const [color, setColor] = useState("#6366f1");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchWorkspace = async () => {
      try {
        const res = await fetch(`/api/settings/workspaces/${id}`);
        if (res.ok) {
          const data = await res.json();
          setName(data.workspace?.name || "");
          setColor(data.workspace?.color || "#6366f1");
        } else {
          router.push("/settings/workspaces");
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchWorkspace();
  }, [id, router]);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/settings/workspaces/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, color }),
      });
      if (res.ok) {
        router.push("/settings/workspaces");
        router.refresh(); 
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;

  return (
    <div className="flex flex-col h-full w-full bg-background animate-in fade-in duration-500 p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-2 text-[13px] mb-4 font-semibold">
        <ScopeBreadcrumb />
        <span className="text-muted-foreground">&gt;</span>
        <Link href="/settings/workspaces" className="text-muted-foreground hover:text-foreground transition-colors">Workspaces</Link>
      </div>

      <h1 className="text-[28px] font-bold tracking-tight mb-10 text-foreground">Edit workspace {name}</h1>

      <div className="space-y-10 max-w-[480px]">
        <div>
          <label className="text-[14.5px] font-bold flex items-center mb-2">
            Name <span className="text-red-500 ml-1">*</span>
          </label>
          <Input 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            className="h-10 bg-card/10 border-indigo-500/50 text-[14.5px] font-medium rounded-md focus-visible:ring-indigo-500 focus-visible:ring-1 shadow-sm"
          />
        </div>

        <div className="border-t border-border/30 pt-8 flex items-start justify-between">
          <div>
            <h2 className="text-[14.5px] font-bold mb-1.5 text-foreground/90">Color</h2>
            <p className="text-[13.5px] text-muted-foreground max-w-[200px] leading-relaxed">
              Will be displayed in the sidebar and in the conversation lists.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className="relative size-[22px] rounded-full transition-all hover:scale-110 flex items-center justify-center ring-offset-background focus-visible:ring-2 focus-visible:ring-indigo-500"
                style={{ backgroundColor: c }}
              >
                {color === c && <Check className="text-white/90 size-3 font-black drop-shadow-sm" strokeWidth={4} />}
              </button>
            ))}
          </div>
        </div>

        <div className="pt-6">
          <Button 
            onClick={handleSave} 
            disabled={saving || !name.trim()}
            className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold h-9 px-8 rounded-md transition-colors"
          >
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}
