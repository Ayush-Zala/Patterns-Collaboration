"use client";

import { Calendar } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function TeammateShiftsTab({ shifts }: { shifts: any[] }) {
  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-6 bg-background p-1 border-b border-border pb-6">
        <div>
          <h3 className="text-base font-medium text-foreground mb-1">Time Zone</h3>
          <p className="text-sm text-muted-foreground">Select the local time zone for this teammate</p>
        </div>
        <Select defaultValue="utc">
          <SelectTrigger className="w-[240px] bg-card border-border text-white">
            <SelectValue placeholder="Select timezone" />
          </SelectTrigger>
          <SelectContent className="bg-card border-border text-white">
            <SelectItem value="utc">Coordinated Universal Time (UTC)</SelectItem>
            <SelectItem value="est">Eastern Standard Time (EST)</SelectItem>
            <SelectItem value="pst">Pacific Standard Time (PST)</SelectItem>
            <SelectItem value="ist">Indian Standard Time (IST)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="mb-4">
        <h3 className="text-base font-medium text-foreground">Shifts</h3>
      </div>

      <div className="flex-1 rounded-xl bg-background border border-border flex flex-col items-center justify-center min-h-[300px] p-8 text-center">
        <div className="size-16 rounded-2xl bg-muted/80 flex items-center justify-center mb-6 shadow-inner">
          <Calendar className="size-8 text-muted-foreground" />
        </div>
        <h3 className="text-sm font-medium text-foreground">No shifts added by admin</h3>
      </div>
    </div>
  );
}
