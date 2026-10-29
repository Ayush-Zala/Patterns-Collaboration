"use client";

import Link from "next/link";
import { useCallback, useMemo, useRef, useState } from "react";
import { 
  Download, 
  Plus, 
  Upload, 
  UserPlus, 
  Settings2, 
  ExternalLink,
  Users,
  ShieldCheck,
  Search,
  Calendar,
  MoreVertical
} from "lucide-react";
import { format } from "date-fns";
import Papa from "papaparse";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { authClient } from "@/lib/auth-client";
import { InviteTeammateSheet } from "@/components/team/invite-teammate-sheet";
import { cn } from "@/lib/utils";
import { formatBytes, parseTabularFile, ParsedTable } from "@/lib/document-parsers";
import { useWorkspaceStore } from "@/context/workspace-store";
import { useEffect } from "react";

export default function TeammatesPage() {
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activityInputRef = useRef<HTMLInputElement>(null);
  const bulkInputRef = useRef<HTMLInputElement>(null);
  
  // Real backend data integration
  const { scopeType } = useWorkspaceStore();
  const { data: orgData } = authClient.useActiveOrganization();
  
  const [members, setMembers] = useState<any[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [globalUsers, setGlobalUsers] = useState<any[]>([]);
  const [isLoadingGlobal, setIsLoadingGlobal] = useState(false);

  useEffect(() => {
    if (scopeType === "company") {
      void fetchGlobalUsers();
    } else if (scopeType === "organization" && orgData?.id) {
      void fetchOrgMembers(orgData.id);
    }
  }, [scopeType, orgData?.id]);

  const fetchGlobalUsers = async () => {
    setIsLoadingGlobal(true);
    try {
      const response = await fetch("/api/admin/users");
      if (response.ok) {
        const data = await response.json();
        setGlobalUsers(data);
      }
    } catch (error) {
      console.error("Failed to fetch global users:", error);
    } finally {
      setIsLoadingGlobal(false);
    }
  };

  const fetchOrgMembers = async (orgId: string) => {
    setIsLoadingMembers(true);
    try {
      const { data, error } = await authClient.organization.listMembers({
        query: { organizationId: orgId }
      });
      if (!error && data) {
        setMembers(Array.isArray(data) ? data : (data as any).members || []);
      }
    } catch (error) {
      console.error("Failed to fetch org members:", error);
    } finally {
      setIsLoadingMembers(false);
    }
  };

  const realTeammates = useMemo(() => {
    if (scopeType === "company") {
      const usersList = Array.isArray(globalUsers) ? globalUsers : [];
      return usersList.map((u: any) => ({
        id: u.id,
        name: u.name || "Unknown",
        email: u.email || "No email",
        role: u.role === "admin" ? "Company admin" : (u.role === "sales_agent" ? "Sales Agent" : (u.role || "Member")),
        status: "Active",
        dateInvited: u.createdAt ? format(new Date(u.createdAt), "MMM d, yyyy") : "N/A",
        initials: (u.name || "U").split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2),
      }));
    }

    const memberList = Array.isArray(members) ? members : [];
    return memberList.map((m: any) => ({
      id: m.id,
      name: m.user?.name || "Unknown",
      email: m.user?.email || "No email",
      role: m.role === "admin" ? "Company admin" : (m.role === "sales_agent" ? "Sales Agent" : (m.role || "Member")),
      status: "Active",
      dateInvited: m.createdAt ? format(new Date(m.createdAt), "MMM d, yyyy") : "N/A",
      initials: (m.user?.name || "U").split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2),
    }));
  }, [members, globalUsers, scopeType]);

  const isActuallyLoading = scopeType === "company" ? isLoadingGlobal : isLoadingMembers;

  const [activitySourceFile, setActivitySourceFile] = useState<File | null>(null);
  const [activityExportError, setActivityExportError] = useState<string | null>(null);
  const [activityExportNote, setActivityExportNote] = useState<string | null>(null);
  const [activityIsExporting, setActivityIsExporting] = useState(false);
  const [activityDate, setActivityDate] = useState("");

  const [bulkParsed, setBulkParsed] = useState<ParsedTable | null>(null);
  const [bulkFileName, setBulkFileName] = useState<string | null>(null);
  const [bulkFileSize, setBulkFileSize] = useState<number | null>(null);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkWarnings, setBulkWarnings] = useState<string[]>([]);
  const [bulkIsParsing, setBulkIsParsing] = useState(false);
  const [bulkDragActive, setBulkDragActive] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");

  const filteredTeammates = useMemo(() => {
    return realTeammates.filter(
      (t) =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [realTeammates, searchQuery]);

  const handleImportCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    void parseTabularFile(file);
  };

  const exportActivityCsv = useCallback(async (date?: string) => {
    if (!activitySourceFile) {
      setActivityExportError("Upload a source file first.");
      return;
    }

    setActivityExportError(null);
    setActivityExportNote(null);
    setActivityIsExporting(true);

    try {
      const formData = new FormData();
      formData.append("file", activitySourceFile);
      if (date) {
        formData.append("date", date);
      }

      const response = await fetch("/api/settings/activity/export", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error || "Unable to generate export right now.");
      }

      const blob = await response.blob();
      const disposition = response.headers.get("content-disposition") || "";
      const match = disposition.match(/filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i);
      const filename = decodeURIComponent((match?.[1] || match?.[2] || "Activity Export.csv").trim());

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);

      setActivityExportNote(date ? `Export generated for ${date}.` : "Export generated.");
    } catch (error) {
      setActivityExportError(error instanceof Error ? error.message : "Unable to generate export right now.");
    } finally {
      setActivityIsExporting(false);
    }
  }, [activitySourceFile]);

  const parseBulkFile = useCallback(async (file: File) => {
    setBulkError(null);
    setBulkWarnings([]);
    setBulkIsParsing(true);
    setBulkFileName(file.name);
    setBulkFileSize(file.size);

    const result = await parseTabularFile(file);
    if ("error" in result) {
      setBulkParsed(null);
      setBulkError(result.error);
    } else {
      setBulkParsed(result.data);
      setBulkWarnings(result.warnings);
    }
    setBulkIsParsing(false);
  }, []);

  const exportTeammatesCsv = useCallback(() => {
    const csv = Papa.unparse(realTeammates);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `Teammate_Custom_Fields_${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }, [realTeammates]);

  const renderPreviewTable = (parsed: ParsedTable) => (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader className="bg-card/60">
          <TableRow className="border-border hover:bg-transparent">
            {parsed.columns.map((column) => (
              <TableHead key={column} className="text-muted-foreground text-xs font-semibold">
                {column}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {parsed.rows.slice(0, 6).map((row, index) => (
            <TableRow key={`${index}-${parsed.totalRows}`} className="border-border">
              {parsed.columns.map((column) => (
                <TableCell key={`${index}-${column}`} className="text-xs text-muted-foreground">
                  {row[column]}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="flex flex-col gap-6 p-10 w-full animate-in fade-in duration-500 min-h-full">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className={cn(
              "size-4 rounded-sm shadow-sm",
              scopeType === "company" ? "bg-indigo-500 shadow-indigo-500/30" : "bg-emerald-500 shadow-emerald-500/30"
            )} />
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              {scopeType === "company" ? "Company" : (orgData?.name || "patterns247")}
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Teammates</h1>
        </div>

      </div>

      <InviteTeammateSheet open={isInviteOpen} onOpenChange={setIsInviteOpen} />

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="w-full justify-start border-b border-border bg-transparent p-0 h-auto gap-10">
          {[
            { id: "all", label: "All teammates" },
            { id: "templates", label: "Teammate templates" },
            { id: "provisioning", label: "User provisioning" },
            { id: "activity", label: "Activity export" },
            { id: "bulk-edit", label: "Bulk edit custom fields" }
          ].map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="rounded-none border-b-2 border-transparent px-0 py-4 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-foreground text-muted-foreground font-semibold transition-all hover:text-muted-foreground"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ALL TEAMMATES CONTENT */}
        <TabsContent value="all" className="mt-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="flex flex-wrap items-center gap-4 mb-8">
            <div className="relative flex-1 max-w-md group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input 
                placeholder="Search teammates by name or email..." 
                className="pl-10 h-11 bg-muted/30 border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-primary/20 focus-visible:border-primary/50 transition-all" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-3">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImportCSV}
                accept=".csv"
                className="hidden"
              />
              <Button
                variant="outline"
                className="gap-2 bg-transparent border-border text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-all"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="size-4" />
                Import CSV
              </Button>
              <Button
                className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
                onClick={() => setIsInviteOpen(true)}
              >
                <UserPlus className="size-4" />
                Invite teammates
              </Button>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-background overflow-hidden backdrop-blur-sm shadow-2xl">
            <Table>
              <TableHeader className="bg-transparent border-b border-border">
                <TableRow className="hover:bg-transparent border-border">
                  <TableHead className="w-[450px] text-muted-foreground font-semibold py-4 px-4">Name ↑</TableHead>
                  <TableHead className="text-muted-foreground font-semibold py-4 text-right pr-20">Status</TableHead>
                  <TableHead className="text-muted-foreground font-semibold py-4 text-right pr-10">Date invited</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isActuallyLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-20 text-muted-foreground">Loading teammates...</TableCell>
                  </TableRow>
                ) : filteredTeammates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-20 text-muted-foreground">No teammates found.</TableCell>
                  </TableRow>
                ) : filteredTeammates.map((teammate) => (
                  <TableRow key={teammate.id} className="group hover:bg-white/[0.02] border-border transition-colors">
                    <TableCell className="py-5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="flex size-10 items-center justify-center rounded-lg bg-red-500 text-sm font-bold text-white shadow-lg shadow-red-500/20">
                          {teammate.initials}
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-foreground group-hover:text-foreground transition-colors">{teammate.name}</span>
                            <Badge variant="secondary" className="bg-muted/50 text-muted-foreground text-[10px] py-0 px-1.5 h-4 border-none font-medium whitespace-nowrap">
                              {teammate.role}
                            </Badge>
                          </div>
                          <span className="text-xs text-muted-foreground font-medium">{teammate.email}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-5 text-right pr-20">
                      <span className="text-sm font-medium text-muted-foreground capitalize">{teammate.status}</span>
                    </TableCell>
                    <TableCell className="py-5 text-right pr-10">
                      <span className="text-sm font-medium text-muted-foreground">{teammate.dateInvited}</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* TEAMMATE TEMPLATES CONTENT */}
        <TabsContent value="templates" className="mt-10">
          {!isCreatingTemplate ? (
            <div className="flex h-[450px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-background text-center p-12 backdrop-blur-sm">
              <div className="size-16 rounded-2xl bg-card border border-border flex items-center justify-center mb-8 shadow-inner">
                <Settings2 className="size-8 text-muted-foreground" />
              </div>
              <h3 className="text-2xl font-bold text-foreground tracking-tight">Teammate templates</h3>
              <p className="text-base text-muted-foreground max-w-lg mt-3 mb-10 leading-relaxed">
                Create reusable configurations for roles, permissions, and initial sidebar layouts to speed up your onboarding process.
              </p>
              <Button onClick={() => setIsCreatingTemplate(true)} className="gap-2 bg-primary text-primary-foreground h-12 px-8 text-base font-semibold shadow-xl shadow-primary/20 active:scale-[0.98] transition-all">
                <Plus className="size-5" />
                Create Template
              </Button>
            </div>
          ) : (
            <div className="max-w-2xl rounded-2xl border border-border bg-background p-10 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-400">
              <h3 className="text-2xl font-bold mb-8 text-foreground tracking-tight">Create Teammate Template</h3>
              <div className="space-y-8">
                <div className="space-y-3">
                  <Label htmlFor="template-name" className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Template Name</Label>
                  <Input id="template-name" placeholder="e.g. Senior Support Agent" className="h-12 bg-muted/50 border-border text-foreground focus-visible:ring-primary/20" />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="clone-source" className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Clone from existing teammate</Label>
                  <Select>
                    <SelectTrigger id="clone-source" className="h-12 bg-muted/50 border-border text-foreground focus-visible:ring-primary/20">
                      <SelectValue placeholder="Select a teammate to clone" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border text-white backdrop-blur-xl">
                      {realTeammates.map(t => (
                        <SelectItem key={t.id} value={t.id} className="hover:bg-primary/10 focus:bg-primary/10 cursor-pointer">{t.name} ({t.role})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground mt-2 font-medium">
                    All permissions and layout configurations will be inherited from the selected teammate.
                  </p>
                </div>
                <div className="flex gap-4 pt-8">
                  <Button variant="ghost" className="h-12 px-8 text-muted-foreground hover:text-foreground hover:bg-white/5 font-semibold" onClick={() => setIsCreatingTemplate(false)}>Cancel</Button>
                  <Button className="h-12 px-10 bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/20" onClick={() => setIsCreatingTemplate(false)}>Save Template</Button>
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        {/* USER PROVISIONING CONTENT */}
        <TabsContent value="provisioning" className="mt-10 space-y-8">
          <div className="grid gap-6">
            <div className="flex items-center justify-between gap-8 p-8 rounded-2xl border border-border bg-background hover:bg-background transition-all duration-300 backdrop-blur-sm group">
              <div className="space-y-1.5">
                <Label className="text-lg font-bold text-foreground group-hover:text-primary transition-colors duration-300">Prevent manual info edits</Label>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">Teammates will not be able to overwrite values (like name or email) provided by your identity provider.</p>
              </div>
              <Switch className="data-[state=checked]:bg-primary" />
            </div>

            <div className="flex items-center justify-between gap-8 p-8 rounded-2xl border border-border bg-background hover:bg-background transition-all duration-300 backdrop-blur-sm group">
              <div className="space-y-1.5">
                <Label className="text-lg font-bold text-foreground group-hover:text-primary transition-colors duration-300">Enable Group Sync</Label>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">Teammate Groups will be automatically associated by your Identity Provider Groups.</p>
              </div>
              <Switch className="data-[state=checked]:bg-primary" />
            </div>
          </div>

          <div className="space-y-8 pt-12 border-t border-border">
            <div className="flex items-center gap-3">
              <ShieldCheck className="size-8 text-primary" />
              <h3 className="text-2xl font-bold text-foreground tracking-tight">Provisioning Tokens</h3>
            </div>
            <div className="flex items-center gap-3 text-base p-6 rounded-xl bg-primary/5 border border-primary/10 inline-flex">
              <span className="text-muted-foreground">Create an authentication token with an <strong className="text-foreground">Auto Provisioning</strong> scope:</span>
              <Button variant="link" className="h-auto p-0 text-primary font-bold text-base gap-2 hover:no-underline hover:text-foreground transition-all group">
                Go to the API Tokens page
                <ExternalLink className="size-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="activity" className="mt-10">
          <input
            ref={activityInputRef}
            type="file"
            accept=".csv,.tsv,.json,application/json,text/csv"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              setActivitySourceFile(file);
              setActivityExportError(null);
              setActivityExportNote(null);
              event.target.value = "";
            }}
          />

          <div className="rounded-2xl border border-border bg-background p-8 backdrop-blur-sm space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-lg font-semibold text-foreground">Activity exports</p>
                <p className="text-sm text-muted-foreground">Upload a source file and generate a CSV export.</p>
              </div>
              <Button
                variant="outline"
                className="border-border bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
                onClick={() => activityInputRef.current?.click()}
                disabled={activityIsExporting}
              >
                {activitySourceFile ? "Replace source file" : "Upload source file"}
              </Button>
            </div>

            {activitySourceFile ? (
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-muted/30 p-4">
                <div>
                  <p className="text-sm font-semibold text-foreground">{activitySourceFile.name}</p>
                  <p className="text-xs text-muted-foreground">{formatBytes(activitySourceFile.size)}</p>
                </div>
                <Button
                  variant="ghost"
                  className="text-muted-foreground hover:text-foreground hover:bg-white/5"
                  onClick={() => setActivitySourceFile(null)}
                >
                  Clear file
                </Button>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border bg-card/20 p-8 text-center text-muted-foreground">
                <Download className="mx-auto mb-3 size-6 text-muted-foreground" />
                <p className="text-sm">No source file uploaded yet.</p>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-4">
              <Button
                className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={() => void exportActivityCsv()}
                disabled={activityIsExporting}
              >
                <Download className="size-4" />
                {activityIsExporting ? "Generating..." : "Generate Export"}
              </Button>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 rounded-lg border border-border bg-card/40 px-3 py-2">
                  <Calendar className="size-4 text-muted-foreground" />
                  <input
                    type="date"
                    value={activityDate}
                    onChange={(event) => setActivityDate(event.target.value)}
                    className="bg-transparent text-sm text-foreground outline-none"
                  />
                </div>
                <Button
                  variant="outline"
                  className="border-border bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
                  onClick={() => void exportActivityCsv(activityDate || undefined)}
                  disabled={activityIsExporting || !activityDate}
                >
                  Export for date
                </Button>
              </div>
            </div>

            {activityExportError && <p className="text-xs text-red-400 font-medium">{activityExportError}</p>}
            {activityExportNote && <p className="text-xs text-emerald-500 font-medium">{activityExportNote}</p>}
          </div>
        </TabsContent>

        <TabsContent value="bulk-edit" className="mt-10">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <input
              ref={bulkInputRef}
              type="file"
              accept=".csv,.tsv,.json,application/json,text/csv"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                void parseBulkFile(file);
                event.target.value = "";
              }}
            />
            <div
              className={cn(
                "lg:col-span-2 flex h-[500px] flex-col items-center justify-center rounded-2xl border-2 border-dashed text-center p-12 backdrop-blur-sm group transition-colors cursor-pointer",
                "border-border bg-background",
                bulkDragActive && "border-primary/50 bg-primary/[0.08]",
                bulkIsParsing && "opacity-80"
              )}
              onClick={() => bulkInputRef.current?.click()}
              onDragEnter={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setBulkDragActive(true);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                event.stopPropagation();
                if (event.dataTransfer) {
                  event.dataTransfer.dropEffect = "copy";
                }
                setBulkDragActive(true);
              }}
              onDragLeave={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setBulkDragActive(false);
              }}
              onDrop={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setBulkDragActive(false);
                const file = event.dataTransfer.files?.[0];
                if (!file) return;
                void parseBulkFile(file);
              }}
            >
              <div className="size-20 rounded-3xl bg-card border border-border flex items-center justify-center mb-8 shadow-2xl group-hover:scale-110 transition-transform duration-500">
                <Upload className="size-10 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <p className="text-xl font-bold text-muted-foreground">Drag and drop your file or</p>
              <Button
                variant="link"
                className="text-primary font-black text-2xl h-auto p-0 mt-3 hover:no-underline hover:text-foreground transition-all"
                onClick={(e) => {
                  e.stopPropagation();
                  bulkInputRef.current?.click();
                }}
                disabled={bulkIsParsing}
              >
                {bulkIsParsing ? "Parsing file..." : "Choose files"}
              </Button>
              <p className="text-muted-foreground mt-4 text-sm font-medium">Supported formats: .CSV, .JSON (Max 10MB)</p>
              {bulkError && <p className="mt-3 text-xs text-red-400 font-medium">{bulkError}</p>}
            </div>
            
            <div className="space-y-8 p-10 rounded-2xl border border-border bg-background shadow-2xl">
              <div className="space-y-4">
                <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center mb-6" />
                <h4 className="text-xl font-bold text-foreground tracking-tight">Updating custom field data</h4>
                <p className="text-base text-muted-foreground leading-relaxed">
                  Bulk updates allow you to modify teammate custom fields at scale.
                </p>
                <div className="space-y-4 mt-8">
                  <div className="flex gap-4">
                    <div className="size-6 rounded-full bg-muted text-xs font-bold text-muted-foreground flex items-center justify-center shrink-0">1</div>
                    <p className="text-sm text-muted-foreground font-medium">Export your current teammate custom field data as CSV.</p>
                  </div>
                  <div className="flex gap-4">
                    <div className="size-6 rounded-full bg-muted text-xs font-bold text-muted-foreground flex items-center justify-center shrink-0">2</div>
                    <p className="text-sm text-muted-foreground font-medium">Open the file in Excel or Sheets and make your changes.</p>
                  </div>
                  <div className="flex gap-4">
                    <div className="size-6 rounded-full bg-muted text-xs font-bold text-muted-foreground flex items-center justify-center shrink-0">3</div>
                    <p className="text-sm text-muted-foreground font-medium">Upload the modified file to sync data back to Patterns.</p>
                  </div>
                </div>
              </div>
              <Button
                variant="outline"
                className="w-full h-12 gap-3 border-border bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground font-bold transition-all mt-6"
                onClick={exportTeammatesCsv}
              >
                <Download className="size-4" />
                Export custom field data
              </Button>
              {bulkParsed && (
                <div className="mt-8 rounded-xl border border-border bg-muted/30 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{bulkFileName}</p>
                      <p className="text-xs text-muted-foreground">
                        {bulkParsed.totalRows} rows • {formatBytes(bulkFileSize ?? 0)}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-border bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
                      onClick={() => bulkInputRef.current?.click()}
                    >
                      Replace file
                    </Button>
                  </div>
                  {bulkWarnings.length > 0 && (
                    <p className="mt-3 text-xs text-amber-400 font-medium">{bulkWarnings.join(" ")}</p>
                  )}
                  <div className="mt-4 rounded-lg border border-border bg-card/40">
                    {renderPreviewTable(bulkParsed)}
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">Showing the first 6 rows.</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
