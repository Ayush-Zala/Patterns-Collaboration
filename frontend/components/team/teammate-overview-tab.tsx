"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

export function TeammateOverviewTab({ user }: { user: any }) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    firstName: user.firstName || "",
    lastName: user.lastName || "",
    username: user.username || "",
  });
  const [status, setStatus] = useState(user.status || "available");
  
  const [isSaving, setIsSaving] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  const handleUpdate = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/settings/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, status }),
      });
      if (res.ok) {
        // optionally show a toast
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to update user");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    setStatus(newStatus);
    try {
      const res = await fetch(`/api/settings/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        router.refresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemove = async () => {
    if (!confirm("Are you sure you want to remove this user from the workspace?")) return;
    setIsRemoving(true);
    try {
      const res = await fetch(`/api/settings/users/${user.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        router.push("/settings/teammates");
      } else {
        const data = await res.json();
        alert(data.error || "Failed to remove user");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-8 border-b border-border">
        <div className="space-y-2">
          <Label className="text-muted-foreground text-xs">First name <span className="text-red-500">*</span></Label>
          <Input 
            value={formData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            className="bg-muted/50 border-border text-foreground focus-visible:ring-1 focus-visible:ring-zinc-700 h-10"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-muted-foreground text-xs">Last name <span className="text-red-500">*</span></Label>
          <Input 
            value={formData.lastName}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            className="bg-muted/50 border-border text-foreground focus-visible:ring-1 focus-visible:ring-zinc-700 h-10"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-muted-foreground text-xs">Username <span className="text-red-500">*</span></Label>
          <Input 
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            className="bg-muted/50 border-border text-foreground focus-visible:ring-1 focus-visible:ring-zinc-700 h-10"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-muted-foreground text-xs">Email address</Label>
          <Input 
            defaultValue={user.email} 
            disabled
            className="bg-muted/50 border-border text-muted-foreground cursor-not-allowed h-10"
          />
        </div>
      </div>
      
      <div className="flex justify-end pb-8 border-b border-border">
        <Button 
          onClick={handleUpdate} 
          disabled={isSaving}
          className="bg-white text-black hover:bg-zinc-200"
        >
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Save profile changes
        </Button>
      </div>

      <div className="flex items-center justify-between pb-8 border-b border-border">
        <div>
          <h3 className="text-base font-medium text-foreground mb-1">Availability</h3>
          <p className="text-sm text-muted-foreground">Select the teammate's availability status</p>
        </div>
        <Select value={status} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-[180px] bg-card border-border text-white">
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent className="bg-card border-border">
            <SelectItem value="available">
              <div className="flex items-center gap-2">
                <div className="size-2 rounded-full bg-emerald-500" />
                <span className="text-foreground">Available</span>
              </div>
            </SelectItem>
            <SelectItem value="busy">
              <div className="flex items-center gap-2">
                <div className="size-2 rounded-full bg-red-500" />
                <span className="text-foreground">Busy</span>
              </div>
            </SelectItem>
            <SelectItem value="offline">
              <div className="flex items-center gap-2">
                <div className="size-2 rounded-full bg-zinc-500" />
                <span className="text-foreground">Offline</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between pt-2">
        <div>
          <h3 className="text-base font-medium text-foreground mb-1">Remove access to this workspace</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            This teammate will lose all access to anything in this workspace including inboxes, tags and rules.
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={handleRemove}
          disabled={isRemoving}
          className="border-red-900/30 bg-red-950/20 text-red-400 hover:bg-red-900/40 hover:text-red-300 transition-colors"
        >
          {isRemoving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Remove from workspace
        </Button>
      </div>
    </div>
  );
}
