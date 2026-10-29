"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  FileText,
  Inbox,
  Mail,
  PenLine,
  Search,
  Settings,
  Shield,
  ShieldCheck,
  UserCog,
  Users,
  CalendarDays,
} from "lucide-react";

import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import {
  PERMISSION_MODULES,
  type PermissionAssignments,
} from "@/lib/permissions";
import { Input } from "@/components/ui/input";

type WorkspaceUser = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "team_lead" | "sales_agent";
};

type TeammateGroupOption = {
  id: string;
  label: string;
  icon: "workspace" | "group";
  count: number;
};

function resolveModuleIcon(icon: string) {
  switch (icon) {
    case "shield":
      return ShieldCheck;
    case "mail":
      return Mail;
    case "users":
      return Users;
    case "user_lock":
      return UserCog;
    case "calendar":
      return CalendarDays;
    case "inbox":
      return Inbox;
    case "file":
      return FileText;
    case "pen":
      return PenLine;
    case "gear":
      return Settings;
    default:
      return Shield;
  }
}

async function fetchPermissionAssignments() {
  const response = await fetch("/api/settings/permissions", {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    const errorPayload = await response.json().catch(() => ({}));
    throw new Error(errorPayload.error || "Unable to load permission assignments.");
  }

  const payload = (await response.json()) as {
    assignments?: PermissionAssignments;
  };

  return payload.assignments;
}

async function savePermissionAssignments(assignments: PermissionAssignments) {
  const response = await fetch("/api/settings/permissions", {
    method: "PUT",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({ assignments }),
  });
  const payload = (await response.json()) as { error?: string };

  if (!response.ok) {
    throw new Error(payload.error || "Unable to save permission assignments.");
  }
}

function GroupSelector({
  triggerLabel,
  selectedIds,
  options,
  onChange,
}: {
  triggerLabel: string;
  selectedIds: string[];
  options: TeammateGroupOption[];
  onChange: (nextIds: string[]) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current) return;
      if (containerRef.current.contains(event.target as Node)) return;
      setIsOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  const filteredOptions = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) return options;
    return options.filter((option) => option.label.toLowerCase().includes(normalizedSearch));
  }, [options, search]);

  function toggleOption(optionId: string) {
    if (selectedIds.includes(optionId)) {
      const next = selectedIds.filter((id) => id !== optionId);
      onChange(next.length ? next : [optionId]);
      return;
    }

    onChange([...selectedIds, optionId]);
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="flex h-10 w-full min-w-0 items-center justify-between gap-3 rounded-xl border border-border bg-muted/55 px-3.5 text-left text-foreground transition-colors hover:border-border hover:bg-muted"
      >
        <div className="flex min-w-0 items-center gap-3">
          <Users className="size-4 shrink-0 text-muted-foreground" />
          <span className="truncate text-sm font-medium">{triggerLabel}</span>
        </div>
        <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div className="absolute right-0 z-30 mt-2 w-[320px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-border bg-popover shadow-2xl backdrop-blur-xl">
          <div className="border-b border-border px-4 py-3.5 text-center">
            <p className="text-lg font-semibold text-foreground">Teammate groups</p>
          </div>

          <div className="border-b border-border px-3 py-2.5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search"
                className="h-11 border-none bg-transparent pl-10 text-foreground placeholder:text-muted-foreground focus-visible:ring-0"
              />
            </div>
          </div>

          <div className="max-h-72 overflow-y-auto">
            {filteredOptions.map((option) => {
              const isSelected = selectedIds.includes(option.id);

              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => toggleOption(option.id)}
                  className="flex w-full items-center justify-between gap-3 border-b border-border px-4 py-3.5 text-left transition-colors hover:bg-white/[0.03]"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className={cn(
                        "flex size-6 items-center justify-center rounded-md",
                        option.icon === "workspace" ? "bg-cyan-500/15 text-cyan-400" : "bg-muted text-muted-foreground"
                      )}
                    >
                      {option.icon === "workspace" ? "P" : <Users className="size-3.5" />}
                    </div>
                    <span className="truncate text-sm text-foreground">{option.label}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="flex size-6 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                      {option.count}
                    </span>
                    <span
                      className={cn(
                        "flex size-6 items-center justify-center rounded-md border",
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-transparent text-transparent"
                      )}
                    >
                      <Check className="size-3.5" />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function SettingsPermissions() {
  const { data: organization } = authClient.useActiveOrganization();
  const [users, setUsers] = useState<WorkspaceUser[]>([]);
  const [assignments, setAssignments] = useState<PermissionAssignments>({});
  const [search, setSearch] = useState("");
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const workspaceName = organization?.name || "patterns247";

  useEffect(() => {
    let isMounted = true;

    async function loadUsers() {
      setIsLoadingUsers(true);
      setError(null);

      try {
        const response = await fetch("/api/settings/users?scope=assignable", {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          const errorPayload = await response.json().catch(() => ({}));
          throw new Error(errorPayload.error || "Unable to load workspace users.");
        }

        const payload = (await response.json()) as {
          users?: Array<{ id: string; name: string; email: string; role: WorkspaceUser["role"] }>;
        };

        if (!isMounted) return;
        setUsers(
          (payload.users || []).map((user) => ({
            id: user.id,
            name: user.name || user.email,
            email: user.email,
            role: user.role,
          }))
        );
      } catch (loadError) {
        if (!isMounted) return;
        setError(loadError instanceof Error ? loadError.message : "Unable to load workspace users.");
      } finally {
        if (!isMounted) return;
        setIsLoadingUsers(false);
      }
    }

    void loadUsers();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadAssignments() {
      setIsLoadingAssignments(true);

      try {
        const nextAssignments = await fetchPermissionAssignments();
        if (!isMounted) return;
        setAssignments(nextAssignments || {});
      } catch (loadError) {
        if (!isMounted) return;
        setError(loadError instanceof Error ? loadError.message : "Unable to load permissions.");
      } finally {
        if (!isMounted) return;
        setIsLoadingAssignments(false);
      }
    }

    void loadAssignments();

    return () => {
      isMounted = false;
    };
  }, []);

  const teammateGroups = useMemo<TeammateGroupOption[]>(() => {
    const adminCount = users.filter((user) => user.role === "admin").length;
    const teamLeadCount = users.filter((user) => user.role === "team_lead").length;
    const salesAgentCount = users.filter((user) => user.role === "sales_agent").length;

    return [
      {
        id: "everyone",
        label: `Everyone in ${workspaceName}`,
        icon: "workspace",
        count: users.length,
      },
      {
        id: "workspace_admins",
        label: `${workspaceName} - Workspace Admins`,
        icon: "group",
        count: adminCount,
      },
      {
        id: "team_leads",
        label: `${workspaceName} - Team Leads`,
        icon: "group",
        count: teamLeadCount,
      },
      {
        id: "sales_agents",
        label: `${workspaceName} - Sales Agents`,
        icon: "group",
        count: salesAgentCount,
      },
    ];
  }, [users, workspaceName]);

  const filteredModules = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) return PERMISSION_MODULES;

    return PERMISSION_MODULES.filter((module) => {
      if (module.title.toLowerCase().includes(normalizedSearch)) return true;
      return module.actions.some((action) => action.label.toLowerCase().includes(normalizedSearch));
    });
  }, [search]);

  async function updateAssignment(key: string, groupIds: string[]) {
    const nextAssignments = {
      ...assignments,
      [key]: groupIds,
    };

    setAssignments(nextAssignments);

    try {
      await savePermissionAssignments(nextAssignments);
      setError(null);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save permissions.");
    }
  }

  function getTriggerLabel(groupIds: string[]) {
    const selectedGroups = teammateGroups.filter((group) => groupIds.includes(group.id));
    if (selectedGroups.length === 0) return `${workspaceName} - Workspace Admins`;
    if (selectedGroups.length === 1) return selectedGroups[0].label;
    return `${selectedGroups[0].label} +${selectedGroups.length - 1}`;
  }

  return (
    <div className="flex min-h-full w-full justify-center px-6 py-8 animate-in fade-in duration-500">
      <div className="flex w-full max-w-6xl flex-col gap-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="flex size-5 items-center justify-center rounded bg-cyan-500/15 text-[11px] font-semibold text-cyan-400">
            P
          </div>
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{workspaceName}</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Permissions</h1>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search"
          className="h-11 rounded-xl border-border bg-muted/55 pl-10 text-foreground placeholder:text-muted-foreground focus-visible:ring-primary/20"
        />
      </div>

      <div className="rounded-2xl border border-border bg-background backdrop-blur-sm shadow-xl">
        {error && (
          <div className="border-b border-border px-6 py-4 text-sm text-red-400">{error}</div>
        )}
        {!error && (isLoadingUsers || isLoadingAssignments) && (
          <div className="border-b border-border px-6 py-4 text-sm text-muted-foreground">Loading teammate groups...</div>
        )}

        <div className="px-6 py-6 lg:px-7">
          {filteredModules.map((module, moduleIndex) => {
            const Icon = resolveModuleIcon(module.icon);
            const isAdminSet = module.id === "admin_permission_set";

            return (
              <section
                key={module.id}
                className={cn(!isAdminSet && moduleIndex > 0 && "border-t border-border pt-6 mt-6")}
              >
                {isAdminSet ? (
                  <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-center">
                    <div className="max-w-2xl">
                      <h2 className="text-[1.7rem] font-semibold text-foreground">{module.title}</h2>
                      <p className="mt-2 text-sm leading-7 text-muted-foreground">{module.description}</p>
                    </div>
                    <div className="w-full">
                      <GroupSelector
                        triggerLabel={getTriggerLabel(assignments["admin_permission_set:workspace_admin_set"] || ["workspace_admins"])}
                        selectedIds={assignments["admin_permission_set:workspace_admin_set"] || ["workspace_admins"]}
                        options={teammateGroups}
                        onChange={(groupIds) => void updateAssignment("admin_permission_set:workspace_admin_set", groupIds)}
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="mb-4 flex items-center gap-3">
                      <Icon className="size-4.5 text-muted-foreground" />
                      <h2 className="text-[1.55rem] font-semibold text-foreground">{module.title}</h2>
                    </div>

                    <div className="space-y-3.5">
                      {module.actions.map((action) => {
                        const key = `${module.id}:${action.id}`;
                        const selectedIds = assignments[key] || ["workspace_admins"];

                        return (
                          <div
                            key={key}
                            className="grid gap-3 pl-8 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-center"
                          >
                            <p className="text-base text-foreground">{action.label}</p>
                            <div className="w-full">
                              <GroupSelector
                                triggerLabel={getTriggerLabel(selectedIds)}
                                selectedIds={selectedIds}
                                options={teammateGroups}
                                onChange={(groupIds) => void updateAssignment(key, groupIds)}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </section>
            );
          })}
        </div>
      </div>
      </div>
    </div>
  );
}
