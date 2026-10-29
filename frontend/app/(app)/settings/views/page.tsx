"use client";
import { ScopeBreadcrumb } from "@/components/settings/scope-breadcrumb";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus, Search, Eye, MoreHorizontal, Edit2, Trash2,
  Users, Lock, Mail, Tag, Inbox
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

type View = {
  id: string;
  name: string;
  color: string | null;
  emoji: string | null;
  inboxIds: string[];
  includeTags: string[];
  excludeTags: string[];
  assigneeIds: string[];
  teammateIds: string[];
  createdAt: string;
};

export default function ViewsPage() {
  const router = useRouter();
  const { data: orgData } = authClient.useActiveOrganization();
  const [views, setViews] = useState<View[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<View | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchViews = useCallback(async () => {
    if (!orgData?.id) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/settings/views", {
        headers: { "x-org-id": orgData.id },
      });
      if (res.ok) setViews(await res.json());
    } catch (err) {
      console.error("Failed to fetch views:", err);
    } finally {
      setIsLoading(false);
    }
  }, [orgData?.id]);

  useEffect(() => { fetchViews(); }, [fetchViews]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await fetch(`/api/settings/views/${deleteTarget.id}`, { method: "DELETE" });
      setViews((prev) => prev.filter((v) => v.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      console.error("Failed to delete view:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  const filtered = views.filter((v) =>
    v.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="p-8 pb-4">
        {/* Breadcrumb */}
        <div className="text-xs text-muted-foreground flex items-center gap-2 mb-4">
          <ScopeBreadcrumb />
          <span>›</span>
          <span>Resources</span>
          <span>›</span>
          <span>Views</span>
        </div>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Views</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Shared work queues that appear in your team's inbox sidebar.
            </p>
          </div>
          <Link href="/settings/views/new">
            <Button className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 gap-2">
              <Plus className="size-4" />
              Create view
            </Button>
          </Link>
        </div>

        <div className="relative max-w-sm mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search views..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-muted/50 border-border h-9"
          />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
            Loading views...
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center rounded-xl border border-dashed border-border bg-muted/20">
            <div className="size-12 rounded-xl bg-indigo-500/10 flex items-center justify-center mb-4">
              <Eye className="size-6 text-indigo-400" />
            </div>
            <h3 className="text-base font-semibold text-foreground mb-1">
              {searchQuery ? "No views match your search" : "No views yet"}
            </h3>
            <p className="text-sm text-muted-foreground mb-5 max-w-xs">
              {searchQuery
                ? "Try a different search term."
                : "Create shared views to help your team track conversations by inbox, tag, or assignee."}
            </p>
            {!searchQuery && (
              <Link href="/settings/views/new">
                <Button className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2">
                  <Plus className="size-4" />
                  Create first view
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow className="hover:bg-transparent border-border">
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground w-[280px]">Name</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Inboxes</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Filters</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Assignees</TableHead>
                  <TableHead className="w-[60px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((view) => (
                  <TableRow key={view.id} className="hover:bg-muted/30 border-border group">
                    <TableCell className="py-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="size-7 rounded-lg flex items-center justify-center shrink-0 text-sm"
                          style={{
                            backgroundColor: view.color ? `${view.color}22` : "rgba(99,102,241,0.12)",
                            border: `1px solid ${view.color ? `${view.color}44` : "rgba(99,102,241,0.25)"}`,
                          }}
                        >
                          {view.emoji ? (
                            <span>{view.emoji}</span>
                          ) : (
                            <Eye className="size-3.5" style={{ color: view.color || "#818cf8" }} />
                          )}
                        </div>
                        <span className="font-semibold text-foreground text-sm">{view.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Inbox className="size-3.5 shrink-0" />
                        <span>{view.inboxIds.length} inbox{view.inboxIds.length !== 1 ? "es" : ""}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {view.includeTags.length > 0 && (
                          <Badge variant="outline" className="rounded-md text-[10px] px-1.5 py-0 border-teal-500/30 text-teal-400 bg-teal-500/10 gap-1">
                            <Tag className="size-2.5" />+{view.includeTags.length}
                          </Badge>
                        )}
                        {view.excludeTags.length > 0 && (
                          <Badge variant="outline" className="rounded-md text-[10px] px-1.5 py-0 border-red-500/30 text-red-400 bg-red-500/10 gap-1">
                            <Tag className="size-2.5" />−{view.excludeTags.length}
                          </Badge>
                        )}
                        {view.includeTags.length === 0 && view.excludeTags.length === 0 && (
                          <span className="text-xs text-muted-foreground/60 italic">None</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {view.assigneeIds.length > 0 ? (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Users className="size-3.5 shrink-0" />
                          <span>{view.assigneeIds.length}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground/60 italic">All</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="size-7 p-0 hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40 bg-popover border-border">
                          <DropdownMenuItem
                            className="gap-2 cursor-pointer"
                            onClick={() => router.push(`/settings/views/${view.id}/edit`)}
                          >
                            <Edit2 className="size-3.5" />
                            Edit view
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-muted" />
                          <DropdownMenuItem
                            className="gap-2 cursor-pointer text-red-400 focus:text-red-400 focus:bg-red-400/10"
                            onClick={() => setDeleteTarget(view)}
                          >
                            <Trash2 className="size-3.5" />
                            Delete view
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="bg-card border-border sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Delete view</DialogTitle>
            <DialogDescription className="pt-2 text-muted-foreground">
              Are you sure you want to permanently delete <strong>&quot;{deleteTarget?.name}&quot;</strong>?
              This will remove it from all teammate sidebars. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6 flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setDeleteTarget(null)}
              className="border-border hover:bg-muted"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-500 text-white border-none shadow-lg shadow-red-500/20"
            >
              {isDeleting ? "Deleting..." : "Delete permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
