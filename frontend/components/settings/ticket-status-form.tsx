"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Circle, 
  Clock, 
  CheckCircle2, 
  ChevronDown
} from "lucide-react";
import { authClient } from "@/lib/auth-client";

interface TicketStatusFormProps {
  initialData?: any;
  isEdit?: boolean;
}

export function TicketStatusForm({ initialData, isEdit }: TicketStatusFormProps) {
  const router = useRouter();
  const { data: orgData } = authClient.useActiveOrganization();

  const [category, setCategory] = useState(initialData?.category || "");
  const [name, setName] = useState(initialData?.name || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [customerLabel, setCustomerLabel] = useState(initialData?.customerLabel || "");
  const [isSaving, setIsSaving] = useState(false);

  const canSave = category && name && name.length <= 30 && customerLabel.length <= 30;

  const handleSave = async () => {
    if (!canSave || !orgData?.id) return;
    setIsSaving(true);

    try {
      const url = isEdit ? `/api/settings/ticketing/statuses/${initialData.id}` : "/api/settings/ticketing/statuses";
      const method = isEdit ? "PUT" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: { 
          "Content-Type": "application/json",
          "x-org-id": orgData.id
        },
        body: JSON.stringify({
          category,
          name: name.trim(),
          description: description.trim(),
          customerLabel: customerLabel.trim(),
        }),
      });

      if (res.ok) {
        router.push("/settings/ticketing");
        router.refresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-8">
      <div className="space-y-2">
        <Label className="text-sm font-semibold text-foreground">
          Category <span className="text-red-500">*</span>
        </Label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-full bg-muted/50 border-border text-foreground">
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent className="bg-card border-border">
            <SelectItem value="open" className="text-foreground focus:bg-muted">
              <div className="flex items-center gap-2">
                <Circle className="size-4 text-indigo-400" />
                <span>Open</span>
              </div>
            </SelectItem>
            <SelectItem value="waiting" className="text-foreground focus:bg-muted">
              <div className="flex items-center gap-2">
                <Clock className="size-4 text-amber-400" />
                <span>Waiting</span>
              </div>
            </SelectItem>
            <SelectItem value="resolved" className="text-foreground focus:bg-muted">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-emerald-400" />
                <span>Resolved</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-semibold text-foreground">
          Name <span className="text-red-500">*</span>
        </Label>
        <Input 
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Add name"
          maxLength={30}
          className="bg-muted/50 border-border text-foreground"
        />
        <div className="text-[10px] text-muted-foreground">{name.length}/30</div>
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-semibold text-foreground">Description</Label>
        <Textarea 
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="What will your team use this status for?"
          className="bg-muted/50 border-border text-foreground min-h-[100px] resize-none"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
          Customer label
        </Label>
        <Input 
          value={customerLabel}
          onChange={e => setCustomerLabel(e.target.value)}
          placeholder="Add label"
          maxLength={30}
          className="bg-muted/50 border-border text-foreground"
        />
        <div className="text-[10px] text-muted-foreground">{customerLabel.length}/30</div>
      </div>

      <div className="flex items-center gap-3 pt-4 border-t border-border">
        <Button 
          variant="outline" 
          onClick={() => router.back()}
          className="bg-transparent border-border text-muted-foreground hover:text-foreground"
        >
          Cancel
        </Button>
        <Button 
          onClick={handleSave}
          disabled={!canSave || isSaving}
          className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 px-8"
        >
          {isSaving ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
  );
}
