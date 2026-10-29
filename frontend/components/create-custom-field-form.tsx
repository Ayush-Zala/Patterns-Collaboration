"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Type, List, Hash, Calendar, CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const FIELD_TYPES = [
  { id: "text", label: "Text", icon: Type },
  { id: "number", label: "Number", icon: Hash },
  { id: "dropdown", label: "Dropdown", icon: List },
  { id: "date", label: "Date", icon: Calendar },
  { id: "boolean", label: "Checkbox", icon: CheckSquare },
];

export function CreateCustomFieldForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const model = searchParams.get("model") || "contacts";
  
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("text");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const modelLabel = model.replace("_", " ").slice(0, -1);
  const title = `Create ${modelLabel} custom field`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/settings/custom-fields", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, type, model }),
      });

      if (response.ok) {
        router.push("/settings/custom-fields");
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to create custom field", error);
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
          <span className="hover:text-foreground cursor-pointer transition-colors" onClick={() => router.push("/settings/custom-fields")}>Custom fields</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">{title}</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-foreground flex items-center gap-1">
            Name <span className="text-red-500">*</span>
          </label>
          <Input
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="bg-card border-border h-10 focus-visible:ring-primary text-sm"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-foreground">Description</label>
          <Textarea
            placeholder="What will this custom field be about?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="bg-muted/20 border-border min-h-[100px] resize-none focus-visible:ring-primary text-sm p-3"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-foreground">Type</label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="w-[180px] bg-muted/20 border-border h-10 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-card border-border text-foreground">
              {FIELD_TYPES.map((t) => (
                <SelectItem key={t.id} value={t.id} className="focus:bg-muted focus:text-foreground py-2 text-sm">
                  <div className="flex items-center gap-2">
                    <t.icon className="size-4 text-muted-foreground" />
                    <span className="font-medium">{t.label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
