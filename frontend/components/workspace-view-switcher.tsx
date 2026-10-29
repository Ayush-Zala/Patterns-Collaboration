"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  Settings,
  Inbox,
  ChevronDown,
  LayoutGrid,
  Calendar,
  Users,
  LineChart,
  ListOrdered
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/context/workspace-store";
import type { ActiveView } from "@/context/workspace-store";

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";

const VIEW_OPTIONS: {
  value: ActiveView;
  label: string;
  description: string;
  icon: typeof Settings;
  href: string;
}[] = [
  {
    value: "settings",
    label: "Settings",
    description: "Manage team, resources & automations",
    icon: Settings,
    href: "/settings/home",
  },
  {
    value: "inbox",
    label: "Inbox",
    description: "View conversations & messages",
    icon: Inbox,
    href: "/inbox",
  },
  {
    value: "calendar",
    label: "Calendar",
    description: "Manage your meetings and schedule",
    icon: Calendar,
    href: "/calendar",
  },
  {
    value: "contacts",
    label: "Contacts",
    description: "View and manage your contacts",
    icon: Users,
    href: "/contacts",
  },
  {
    value: "analytics",
    label: "Analytics",
    description: "Track performance and metrics",
    icon: LineChart,
    href: "/analytics",
  },
  {
    value: "sequences",
    label: "Sequences",
    description: "Automate your outreach campaigns",
    icon: ListOrdered,
    href: "/sequences",
  },
];

export function WorkspaceViewSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const { activeView, setActiveView } = useWorkspaceStore();
  const [isOpen, setIsOpen] = useState(false);

  // Sync store with URL on mount / navigation
  useEffect(() => {
    if (pathname.startsWith("/inbox")) {
      setActiveView("inbox");
    } else if (pathname.startsWith("/settings")) {
      setActiveView("settings");
    } else if (pathname.startsWith("/calendar")) {
      setActiveView("calendar");
    } else if (pathname.startsWith("/contacts")) {
      setActiveView("contacts");
    } else if (pathname.startsWith("/analytics")) {
      setActiveView("analytics");
    } else if (pathname.startsWith("/sequences")) {
      setActiveView("sequences");
    }
  }, [pathname, setActiveView]);


  const currentOption =
    VIEW_OPTIONS.find((opt) => opt.value === activeView) || VIEW_OPTIONS[0];

  function handleSelect(option: (typeof VIEW_OPTIONS)[number]) {
    setActiveView(option.value);
    setIsOpen(false);
    router.push(option.href);
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className={cn(
                "data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground",
                isOpen && "bg-primary/5 border border-primary/30",
                "group-data-[collapsible=icon]:size-10! group-data-[collapsible=icon]:p-1!"
              )}
            >
              <div
                className={cn(
                  "flex aspect-square size-8 items-center justify-center rounded-lg transition-all",
                  "bg-gradient-to-br from-primary/80 to-primary text-primary-foreground",
                  "shadow-md shadow-primary/20 group-hover:shadow-primary/30"
                )}
              >
                <LayoutGrid className="size-4" />
              </div>

              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-bold flex items-center gap-1.5">
                  {currentOption.label}
                  <ChevronDown
                    className={cn(
                      "size-3.5 text-muted-foreground transition-transform duration-200",
                      isOpen && "rotate-180 text-primary"
                    )}
                  />
                </span>
                <span className="truncate text-[10px] font-medium text-muted-foreground">
                  Collaboration Workspace
                </span>
              </div>
            </SidebarMenuButton>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="start"
            sideOffset={6}
            className="w-[280px] rounded-2xl border border-border bg-popover p-3 shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
          >
            <p className="mb-2.5 px-2 text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
              Switch View
            </p>
            <div className="space-y-1">
              {VIEW_OPTIONS.map((option) => {
                const isActive = option.value === activeView;
                const Icon = option.icon;

                return (
                  <DropdownMenuItem
                    key={option.value}
                    onSelect={() => handleSelect(option)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-all cursor-pointer",
                      isActive
                        ? "bg-primary/10 border border-primary/20 shadow-[0_0_12px_rgba(var(--primary),0.06)]"
                        : "border border-transparent hover:bg-muted/50 hover:border-border focus:bg-muted/50 focus:border-border"
                    )}
                  >
                    <div
                      className={cn(
                        "grid size-9 place-items-center rounded-lg border transition-colors",
                        isActive
                          ? "bg-primary/15 border-primary/25 text-primary"
                          : "bg-muted/60 border-border text-muted-foreground group-hover:text-muted-foreground"
                      )}
                    >
                      <Icon className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "text-sm font-semibold transition-colors",
                          isActive ? "text-primary" : "text-foreground"
                        )}
                      >
                        {option.label}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-tight">
                        {option.description}
                      </p>
                    </div>
                    {isActive && (
                      <div className="size-2 rounded-full bg-primary shadow-[0_0_6px_rgba(var(--primary),0.4)]" />
                    )}
                  </DropdownMenuItem>
                );
              })}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
