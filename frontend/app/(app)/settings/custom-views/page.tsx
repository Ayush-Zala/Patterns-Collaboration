"use client";

import { useState } from "react";
import { 
  Plus, 
  Search, 
  LayoutGrid, 
  MoreHorizontal, 
  Edit2, 
  Trash2, 
  Filter,
  Users,
  Lock,
  Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function CustomViewsPage() {
  const [searchQuery, setSearchQuery] = useState("");

  const mockCustomViews = [
    { id: "1", name: "SLA Monitoring", description: "Tracks threads approaching SLA limits", type: "system", owner: "System" },
    { id: "2", name: "Outbound Performance", description: "Analysis of reply rates and times", type: "shared", owner: "Ops Team" },
    { id: "3", name: "Team Workload", description: "Visual breakdown of assigned threads per user", type: "shared", owner: "Manager" },
  ];

  const filteredViews = mockCustomViews.filter(v => 
    v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 space-y-8 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Custom Views</h2>
          <p className="text-sm text-muted-foreground">
            Build specialized dashboards and advanced filter layouts.
          </p>
        </div>
        <div className="flex items-center gap-3">
            <Button variant="outline" className="border-border gap-2 text-indigo-400 border-indigo-500/30 bg-indigo-500/5">
                <Zap className="size-4" />
                Quick Presets
            </Button>
            <Button className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 gap-2">
                <Plus className="size-4" />
                New Custom View
            </Button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search custom views..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-muted/50 border-border"
          />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow className="hover:bg-transparent border-border">
              <TableHead className="w-[300px] text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Name</TableHead>
              <TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Type</TableHead>
              <TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Created By</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredViews.map((view) => (
              <TableRow key={view.id} className="hover:bg-muted/30 border-border group">
                <TableCell className="py-4">
                  <div className="flex flex-col gap-1">
                    <span className="font-semibold text-foreground flex items-center gap-2">
                      <LayoutGrid className="size-3.5 text-indigo-400" />
                      {view.name}
                    </span>
                    <span className="text-xs text-muted-foreground line-clamp-1 italic">
                      {view.description}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={cn(
                    "rounded-md px-2 py-0.5 text-[10px] font-bold uppercase",
                    view.type === "system" ? "bg-zinc-500/10 text-zinc-400 border-zinc-500/20" : "bg-teal-500/10 text-teal-400 border-teal-500/20"
                  )}>
                    {view.type === "system" ? <Lock className="size-3 mr-1" /> : <Users className="size-3 mr-1" />}
                    {view.type}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-foreground/80 font-medium">{view.owner}</span>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="size-8 p-0 hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40 bg-popover border-border">
                      <DropdownMenuItem className="gap-2 cursor-pointer">
                        <Edit2 className="size-3.5" />
                        Edit Layout
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-muted" />
                      <DropdownMenuItem className="gap-2 cursor-pointer text-red-400 focus:text-red-400 focus:bg-red-400/10">
                        <Trash2 className="size-3.5" />
                        Delete View
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ");
}
