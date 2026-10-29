"use client"

import { useEffect, useState } from "react";
import { format, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Download, ChevronDown, Calendar, User, Tag, Layers, RefreshCcw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuCheckboxItem } from "@/components/ui/dropdown-menu";
import { Calendar as CalendarUI } from "@/components/ui/calendar";
import { DateRange } from "react-day-picker";
import { Input } from "@/components/ui/input";

export default function AuditLogPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [date, setDate] = useState<DateRange | undefined>()
  const [updatedBy, setUpdatedBy] = useState<string>("all")
  const [updatedResource, setUpdatedResource] = useState<string>("all")
  const [eventFilter, setEventFilter] = useState<string>("all")
  const [belongsToSearch, setBelongsToSearch] = useState<string>("")

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/audit-log");
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter(log => {
    // 1. Date filter
    if (date?.from) {
      const logDate = new Date(log.created_at || log.createdAt);
      const start = startOfDay(date.from);
      const end = date.to ? endOfDay(date.to) : endOfDay(date.from);
      if (!isWithinInterval(logDate, { start, end })) return false;
    }

    // 2. Updated by filter
    if (updatedBy !== "all") {
      const isSystem = log.actorName === "System" || log.actorName === "API";
      if (updatedBy === "api" && !isSystem) return false;
      if (updatedBy === "teammates" && isSystem) return false;
      if (updatedBy === "identity_providers" && log.actorName !== "Identity Provider") return false;
    }

    // 3. Updated resource filter
    if (updatedResource !== "all") {
      const type = log.entityType?.toLowerCase() || "";
      if (updatedResource === "company" && type !== "company") return false;
      if (updatedResource === "conversations" && type !== "thread" && type !== "conversation") return false;
      if (updatedResource === "inboxes" && type !== "inbox") return false;
      if (updatedResource === "rules" && type !== "rule") return false;
      if (updatedResource === "tags" && type !== "tag") return false;
      if (updatedResource === "teammates" && type !== "user" && type !== "teammate") return false;
      if (updatedResource === "teammate_groups" && type !== "teammate_group") return false;
    }

    // 4. Event filter
    if (eventFilter !== "all") {
      const typeStr = log.type.toLowerCase();
      if (eventFilter === "added" && !typeStr.includes("add") && !typeStr.includes("create")) return false;
      if (eventFilter === "edited" && !typeStr.includes("edit") && !typeStr.includes("update")) return false;
      if (eventFilter === "deleted" && !typeStr.includes("delete") && !typeStr.includes("remove")) return false;
    }

    // 5. Belongs to search
    if (belongsToSearch) {
      const searchStr = belongsToSearch.toLowerCase();
      if (!log.metadataObj?.name?.toLowerCase().includes(searchStr) && 
          !log.entityId?.toLowerCase().includes(searchStr) &&
          !log.actorName?.toLowerCase().includes(searchStr)) {
        return false;
      }
    }

    return true;
  });

  const exportToCSV = () => {
    if (filteredLogs.length === 0) return;
    
    const headers = ["Date and time", "Updated by", "Updated resource", "Event", "Resource Details"];
    const csvContent = [
      headers.join(","),
      ...filteredLogs.map(log => {
        const date = format(new Date(log.created_at || log.createdAt), "MMM dd, yyyy, hh:mm:ss a");
        const actor = `"${log.actorName || ''}"`;
        const resourceType = `"${log.entityType || ''}"`;
        const event = `"${log.type || ''}"`;
        const details = `"${log.metadataObj?.name || log.entityId || ''}"`;
        return [date, actor, resourceType, event, details].join(",");
      })
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `audit-logs-${format(new Date(), "yyyy-MM-dd")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col h-full w-full bg-background animate-in fade-in duration-500 p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1 font-medium">
              <Layers className="h-3.5 w-3.5" />
              <span>Company</span>
            </div>
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold tracking-tight">Audit log</h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1 font-medium">
                <span>Last updated {loading ? "updating..." : "just now"}</span>
                <button onClick={fetchLogs} className="flex items-center gap-1 hover:text-indigo-400 transition-colors ml-2 text-indigo-500 font-bold">
                  <RefreshCcw className="h-3.5 w-3.5" /> Refresh
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={exportToCSV} variant="outline" className="h-9 gap-2 font-bold border-border bg-card hover:bg-accent hover:text-accent-foreground">
            <Download className="h-4 w-4" /> Export
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className={`h-8 text-xs gap-1.5 rounded-md border-border bg-card/50 font-semibold hover:text-foreground ${date ? "text-indigo-400 border-indigo-500/50" : "text-muted-foreground"}`}>
              <Calendar className="h-3.5 w-3.5" /> 
              {date?.from ? (
                date.to ? (
                  <>
                    {format(date.from, "LLL dd, y")} - {format(date.to, "LLL dd, y")}
                  </>
                ) : (
                  format(date.from, "LLL dd, y")
                )
              ) : (
                "Date range"
              )}
              <ChevronDown className="h-3 w-3" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 border-border/50 bg-popover" align="start">
            <div className="p-3 border-b border-border/50 font-semibold text-sm">Custom date range</div>
            <CalendarUI
              initialFocus
              mode="range"
              defaultMonth={date?.from}
              selected={date}
              onSelect={setDate}
              numberOfMonths={2}
            />
            <div className="p-3 border-t border-border/50 flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setDate(undefined)}>Clear</Button>
            </div>
          </PopoverContent>
        </Popover>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className={`h-8 text-xs gap-1.5 rounded-md border-border bg-card/50 font-semibold hover:text-foreground ${updatedBy !== "all" ? "text-indigo-400 border-indigo-500/50" : "text-muted-foreground"}`}>
              {updatedBy === "all" ? "Updated by" : updatedBy.charAt(0).toUpperCase() + updatedBy.slice(1).replace("_", " ")} <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56 bg-popover border-border/50 p-1">
            <div className="px-2 py-2 text-sm font-bold border-b border-border/50 mb-1">Updated by</div>
            <DropdownMenuCheckboxItem checked={updatedBy === "all"} onCheckedChange={() => setUpdatedBy("all")}>All</DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={updatedBy === "api"} onCheckedChange={() => setUpdatedBy("api")}>API</DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={updatedBy === "applications"} onCheckedChange={() => setUpdatedBy("applications")}>Applications</DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={updatedBy === "identity_providers"} onCheckedChange={() => setUpdatedBy("identity_providers")}>Identity providers</DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={updatedBy === "teammates"} onCheckedChange={() => setUpdatedBy("teammates")}>Teammates</DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className={`h-8 text-xs gap-1.5 rounded-md border-border bg-card/50 font-semibold hover:text-foreground ${updatedResource !== "all" ? "text-indigo-400 border-indigo-500/50" : "text-muted-foreground"}`}>
              {updatedResource === "all" ? "Updated resources" : updatedResource.charAt(0).toUpperCase() + updatedResource.slice(1).replace("_", " ")} <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56 bg-popover border-border/50 p-1">
            <div className="px-2 py-2 text-sm font-bold border-b border-border/50 mb-1">Updated resources</div>
            <DropdownMenuCheckboxItem checked={updatedResource === "all"} onCheckedChange={() => setUpdatedResource("all")}>All resources</DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={updatedResource === "company"} onCheckedChange={() => setUpdatedResource("company")}>Company</DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={updatedResource === "conversations"} onCheckedChange={() => setUpdatedResource("conversations")}>Conversations</DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={updatedResource === "inboxes"} onCheckedChange={() => setUpdatedResource("inboxes")}>Inboxes</DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={updatedResource === "rules"} onCheckedChange={() => setUpdatedResource("rules")}>Rules</DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={updatedResource === "tags"} onCheckedChange={() => setUpdatedResource("tags")}>Tags</DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={updatedResource === "teammates"} onCheckedChange={() => setUpdatedResource("teammates")}>Teammates</DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={updatedResource === "teammate_groups"} onCheckedChange={() => setUpdatedResource("teammate_groups")}>Teammate groups</DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className={`h-8 text-xs gap-1.5 rounded-md border-border bg-card/50 font-semibold hover:text-foreground ${eventFilter !== "all" ? "text-indigo-400 border-indigo-500/50" : "text-muted-foreground"}`}>
              {eventFilter === "all" ? "Event" : eventFilter.charAt(0).toUpperCase() + eventFilter.slice(1)} <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56 bg-popover border-border/50 p-1">
            <div className="px-2 py-2 text-sm font-bold border-b border-border/50 mb-1">Event</div>
            <DropdownMenuCheckboxItem checked={eventFilter === "all"} onCheckedChange={() => setEventFilter("all")}>All events</DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={eventFilter === "added"} onCheckedChange={() => setEventFilter("added")}>Added</DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={eventFilter === "edited"} onCheckedChange={() => setEventFilter("edited")}>Edited</DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={eventFilter === "deleted"} onCheckedChange={() => setEventFilter("deleted")}>Deleted</DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className={`h-8 text-xs gap-1.5 rounded-md border-border bg-card/50 font-semibold hover:text-foreground ${belongsToSearch ? "text-indigo-400 border-indigo-500/50" : "text-muted-foreground"}`}>
              Belongs to {belongsToSearch && `: ${belongsToSearch}`} <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64 bg-popover border-border/50 p-1">
            <div className="px-2 py-2 text-sm font-bold border-b border-border/50 mb-2 flex items-center gap-2">Belongs to</div>
            <div className="px-2 pb-2">
              <div className="relative">
                <Search className="absolute left-2 top-2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search..." 
                  className="h-8 pl-8 text-xs bg-muted/30"
                  value={belongsToSearch}
                  onChange={(e) => setBelongsToSearch(e.target.value)}
                />
              </div>
            </div>
            <DropdownMenuSeparator className="bg-border/50" />
            <DropdownMenuItem onClick={() => setBelongsToSearch("Company")}>
              <Layers className="mr-2 h-4 w-4" /> Company
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setBelongsToSearch("patterns")}>
              <div className="mr-2 h-4 w-4 rounded bg-emerald-500 text-[9px] text-white flex items-center justify-center font-bold">P</div> patterns247
            </DropdownMenuItem>
            {belongsToSearch && (
              <>
                <DropdownMenuSeparator className="bg-border/50" />
                <DropdownMenuItem onClick={() => setBelongsToSearch("")} className="text-muted-foreground justify-center text-xs">
                  Clear search
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="border border-border rounded-xl bg-card/30 overflow-hidden flex-1 shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent bg-muted/20">
              <TableHead className="w-[250px] font-semibold text-muted-foreground text-xs h-11 pl-4">Date and time</TableHead>
              <TableHead className="w-[300px] font-semibold text-muted-foreground text-xs h-11">Updated by</TableHead>
              <TableHead className="w-[300px] font-semibold text-muted-foreground text-xs h-11">Updated resource</TableHead>
              <TableHead className="font-semibold text-muted-foreground text-xs h-11">Event</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-10 text-muted-foreground font-medium">Loading audit logs...</TableCell>
              </TableRow>
            ) : filteredLogs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-10 text-muted-foreground font-medium">No matching audit logs found.</TableCell>
              </TableRow>
            ) : filteredLogs.map((log) => (
              <TableRow key={log.id} className="border-border hover:bg-muted/40 transition-colors">
                <TableCell className="font-medium text-[13px] py-3.5 pl-4 whitespace-nowrap text-foreground/90">
                  {format(new Date(log.created_at || log.createdAt), "MMM dd, yyyy, hh:mm:ss a")}
                </TableCell>
                <TableCell className="py-3.5">
                  <div className="flex items-center gap-2.5">
                    <Avatar className="h-[22px] w-[22px] rounded bg-red-500">
                      <AvatarFallback className="text-[10px] text-white font-bold bg-red-500 rounded">
                        {log.actorName ? log.actorName[0] : "S"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-[13px] font-medium text-foreground/90">{log.actorName}</span>
                  </div>
                </TableCell>
                <TableCell className="py-3.5">
                  <div className="flex items-center gap-2.5 text-[13px] text-foreground/90">
                    {log.entityType === "tag" ? (
                      <Tag className="h-[14px] w-[14px] text-yellow-500" />
                    ) : (log.entityType === "teammate" || log.entityType === "user") ? (
                      <Avatar className="h-[22px] w-[22px] rounded bg-red-500">
                        <AvatarFallback className="text-[10px] text-white font-bold bg-red-500 rounded">
                          {(log.metadataObj?.name || log.entityId || "R")[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    ) : (log.entityType === "teammate_group") ? (
                      <User className="h-[14px] w-[14px] text-muted-foreground" />
                    ) : (
                      <Layers className="h-[14px] w-[14px] text-muted-foreground" />
                    )}
                    <span className="font-medium truncate max-w-[200px]">
                      {log.metadataObj?.name || log.entityId || log.entityType || "Unknown Resource"}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-[13px] py-3.5 text-foreground/80 font-medium">
                  {log.type.split(".").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).replace(/_/g, " ")).join(" ")}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
