"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const COLORS = [
  "#64748b", // Slate
  "#a21caf", // Fuchsia
  "#dc2626", // Red
  "#c2410c", // Orange
  "#854d0e", // Yellow-ish
  "#15803d", // Green
  "#0e7490", // Cyan
  "#4338ca", // Indigo
  "#6d28d9", // Violet
];

export function CreateWorkspaceForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [selectedColor, setSelectedColor] = useState(COLORS[7]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/settings/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, color: selectedColor }),
      });

      if (response.ok) {
        router.push("/settings/workspaces");
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to create workspace", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground mb-2 font-semibold uppercase tracking-wider">
          <span className="hover:text-foreground cursor-pointer transition-colors" onClick={() => router.push("/settings/home")}>Company</span>
          <span className="text-muted-foreground/50 font-normal">&gt;</span>
          <span className="hover:text-foreground cursor-pointer transition-colors" onClick={() => router.push("/settings/workspaces")}>Workspaces</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Create workspace</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="space-y-3">
          <label className="text-sm font-semibold text-foreground flex items-center gap-1">
            Name <span className="text-red-500">*</span>
          </label>
          <Input
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="bg-card border-border h-10 focus-visible:ring-primary text-sm font-medium px-3 shadow-sm"
            required
            autoFocus
          />
        </div>

        <div className="border-t border-border/60 pt-8">
          <h3 className="text-lg font-bold text-foreground mb-1">Color</h3>
          <p className="text-sm text-muted-foreground mb-6">
            Will be displayed in the sidebar and in the conversation lists to help identify the workspace.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            {COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setSelectedColor(color)}
                className={cn(
                  "size-8 rounded-full flex items-center justify-center transition-all duration-200 border-2",
                  selectedColor === color ? "border-primary scale-110 shadow-md" : "border-transparent hover:scale-110 hover:border-border"
                )}
              >
                <div 
                  className="size-6 rounded-full flex items-center justify-center shadow-inner"
                  style={{ backgroundColor: color }}
                >
                  {selectedColor === color && <Check className="size-3 text-white drop-shadow-md" />}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="pt-4 flex items-center gap-3">
          <Button
            type="submit"
            disabled={isSubmitting || !name}
            className="bg-primary text-primary-foreground px-8 h-10 font-semibold shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
          >
            {isSubmitting ? "Creating..." : "Create"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.back()}
            className="text-muted-foreground hover:text-foreground h-10 px-6 font-medium"
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
